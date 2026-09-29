import { App } from '@capacitor/app';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { useSyncExternalStore } from 'react';

import { messages } from '../i18n';

import { isNewer } from './versions';

/*
 * Mises à jour sans store : chaque version de l'APK est publiée comme « release » sur
 * GitHub (tag v1.2.3 + fichier .apk joint). Au lancement, l'app lit la dernière release,
 * la compare à sa propre version et propose de l'installer. Le téléchargement et
 * l'ouverture de l'installeur Android passent par le plugin natif AppUpdaterPlugin.java.
 *
 * Dépôt public GitHub qui porte les releases (« pseudo/depot ») ; vide = désactivé.
 */
const UPDATE_REPO = 'PommeSauce0/CyberCardex';

// VITE_UPDATE_FEED : autre source de test (même format que l'API GitHub).
const FEED =
  import.meta.env.VITE_UPDATE_FEED ||
  (UPDATE_REPO ? `https://api.github.com/repos/${UPDATE_REPO}/releases/latest` : '');

type AppUpdaterPlugin = {
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string }): Promise<void>;
  addListener(
    event: 'progress',
    listener: (progress: { percent: number }) => void,
  ): Promise<PluginListenerHandle>;
};

const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

type Release = { version: string; notes: string; url: string; size: number };

export type UpdateState = {
  status:
    | 'idle'
    | 'checking'
    | 'upToDate'
    | 'available'
    | 'needsPermission'
    | 'downloading'
    | 'installing'
    | 'error';
  current?: string;
  release?: Release;
  percent?: number;
  error?: string;
};

/** Les mises à jour ne concernent que l'app Android (le site se met à jour tout seul). */
export const updatesEnabled = Capacitor.getPlatform() === 'android' && FEED !== '';

// ---------- Petit store partagé (bandeau + réglages) ----------

let state: UpdateState = { status: 'idle' };
const listeners = new Set<() => void>();

function setState(next: Partial<UpdateState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useUpdateState = () => useSyncExternalStore(subscribe, () => state);

type GithubRelease = {
  tag_name: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: { name: string; browser_download_url: string; size: number }[];
};

// ---------- Actions ----------

const CHECK_TIMEOUT_MS = 15_000;

/** Cherche une nouvelle version. `manual` : demandée depuis les réglages. */
export async function checkForUpdate(manual = false) {
  if (!updatesEnabled || state.status === 'checking' || state.status === 'downloading') {
    return;
  }
  setState({ status: 'checking', error: undefined });
  try {
    const current = state.current ?? (await App.getInfo()).version;
    const response = await fetch(FEED, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' },
      // Réseau bloqué : on abandonne au lieu de laisser « Recherche… » affiché indéfiniment.
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    // 404 : aucune release publiée pour l'instant, donc rien de plus récent.
    if (response.status === 404) {
      setState({ status: 'upToDate', current, release: undefined });
      return;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as GithubRelease;
    const asset = data.assets?.find((item) => item.name.toLowerCase().endsWith('.apk'));
    const version = data.tag_name.replace(/^v/i, '');

    if (!asset || data.draft || data.prerelease || !isNewer(version, current)) {
      setState({ status: 'upToDate', current, release: undefined });
      return;
    }
    setState({
      status: 'available',
      current,
      release: {
        version,
        // Texte brut de la release : la page Réglages en extrait la langue de l'app.
        notes: data.body ?? '',
        url: asset.browser_download_url,
        size: asset.size,
      },
    });
  } catch (error) {
    // Hors connexion au lancement : on ne dérange pas, les réglages affichent l'erreur.
    setState({
      status: manual ? 'error' : 'idle',
      error:
        (error as Error).name === 'TimeoutError'
          ? messages().update.timeout
          : (error as Error).message || messages().update.checkFailed,
    });
  }
}

let resumeHandle: PluginListenerHandle | undefined;
/** Vrai dès le premier appui, pour qu'un double appui ne lance pas deux téléchargements. */
let installing = false;

/** Télécharge et installe la version trouvée (demande l'autorisation si besoin). */
export async function installUpdate() {
  const release = state.release;
  if (!release || installing) {
    return;
  }
  installing = true;
  try {
    const { allowed } = await AppUpdater.canInstall();
    if (!allowed) {
      setState({ status: 'needsPermission' });
      // Au retour des réglages Android, on reprend tout seul si c'est autorisé.
      resumeHandle ??= await App.addListener('resume', async () => {
        if (state.status === 'needsPermission' && (await AppUpdater.canInstall()).allowed) {
          void installUpdate();
        }
      });
      await AppUpdater.openInstallSettings();
      return;
    }

    setState({ status: 'downloading', percent: 0, error: undefined });
    const progress = await AppUpdater.addListener('progress', ({ percent }) =>
      setState({ percent }),
    );
    try {
      await AppUpdater.downloadAndInstall({ url: release.url });
      // L'installeur Android est ouvert ; s'il est annulé, on pourra relancer.
      setState({ status: 'installing' });
    } finally {
      await progress.remove();
    }
  } catch (error) {
    setState({ status: 'error', error: (error as Error).message });
  } finally {
    installing = false;
  }
}

/** À appeler une fois au démarrage de l'app. */
export function startUpdateChecks() {
  if (updatesEnabled) {
    void App.getInfo()
      .then(({ version }) => setState({ current: version }))
      .finally(() => void checkForUpdate());
  }
}
