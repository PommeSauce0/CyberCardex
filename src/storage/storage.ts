import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/*
 * Point d'accès unique au stockage persistant.
 *
 * Lecture et écriture synchrones dans localStorage (les contextes en ont besoin au
 * premier rendu). Dans l'app Android, chaque écriture est aussi recopiée dans le
 * stockage natif (Preferences) : Android peut vider les données d'une WebView, pas
 * celles de l'application. Au démarrage, `restoreNativeStorage` réconcilie les deux :
 * chaque écriture est datée, la copie la plus récente l'emporte.
 */

/** Seules nos clés sont recopiées (préfixe commun à toutes les données de l'app). */
const PREFIX = 'cybercardex.';
/** Date de la dernière écriture d'une clé (préfixe différent : pas recopiée comme donnée). */
const stampKey = (key: string) => `cybercardex@${key}`;
const native = Capacitor.isNativePlatform();

/**
 * Met de côté la valeur brute d'une clé avant qu'elle soit remplacée (donnée illisible ou en
 * partie invalide) : `cybercardex.backup.<clé>.<date>`, recopiée aussi dans le stockage natif.
 */
export function backupRaw(key: string, reason: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return;
    }
    const backupKey = `${PREFIX}backup.${key.replace(PREFIX, '')}.${new Date().toISOString()}`;
    localStorage.setItem(backupKey, raw);
    if (native) {
      void Preferences.set({ key: backupKey, value: raw }).catch(() => {});
    }
    console.warn(`CyberCardex : ${key} ${reason}, copie gardée dans ${backupKey}`);
  } catch {
    // Stockage plein ou indisponible : rien de plus à faire.
  }
}

/** JSON avec les clés triées : deux données égales donnent le même texte, quel que soit l'ordre. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : inner,
  );

/** Vrai si la version nettoyée diffère de la donnée relue (entrée rejetée ou champ corrigé). */
export function wasNormalized(raw: unknown, cleaned: unknown) {
  return raw !== undefined && canonical(raw) !== canonical(cleaned);
}

/** Valeur absente → undefined. Valeur illisible → copie de secours, puis undefined. */
export function readJson<T>(key: string): T | undefined {
  let stored: string | null;
  try {
    stored = localStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (!stored) {
    return undefined;
  }
  try {
    return JSON.parse(stored) as T;
  } catch {
    backupRaw(key, 'illisible');
    return undefined;
  }
}

/*
 * Écriture impossible (stockage plein, navigation privée, stockage natif en échec) : la
 * modification reste visible pendant la session mais pourrait être perdue au prochain
 * lancement. On prévient l'app (bandeau StorageWarning) au lieu de se taire.
 */
const failureListeners = new Set<() => void>();
let writeFailed = false;

/** Vrai si une écriture a échoué pendant cette session. */
export const storageWriteFailed = () => writeFailed;

export function onStorageFailure(listener: () => void) {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

function reportWriteFailure(key: string, error: unknown) {
  console.error(`CyberCardex : écriture de ${key} impossible`, error);
  writeFailed = true;
  failureListeners.forEach((listener) => listener());
}

export function writeJson(key: string, value: unknown) {
  const json = JSON.stringify(value);
  const stamp = String(Date.now());
  try {
    localStorage.setItem(key, json);
    localStorage.setItem(stampKey(key), stamp);
  } catch (error) {
    reportWriteFailure(key, error);
  }
  if (native && key.startsWith(PREFIX)) {
    void Promise.all([
      Preferences.set({ key, value: json }),
      Preferences.set({ key: stampKey(key), value: stamp }),
    ]).catch((error: unknown) => reportWriteFailure(key, error));
  }
}

/**
 * À appeler avant le premier rendu dans l'app Android. Pour chaque clé, la copie la plus
 * récente (native ou localStorage) remplace l'autre. Sans date (données plus anciennes),
 * le stockage natif fait foi.
 */
export async function restoreNativeStorage() {
  if (!native) {
    return;
  }
  try {
    const { keys } = await Preferences.keys();
    const allKeys = new Set(keys.filter((key) => key.startsWith(PREFIX)));
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) {
        allKeys.add(key);
      }
    }

    for (const key of allKeys) {
      const { value: nativeValue } = await Preferences.get({ key });
      const { value: nativeStamp } = await Preferences.get({ key: stampKey(key) });
      const localValue = localStorage.getItem(key);
      const localStamp = localStorage.getItem(stampKey(key));

      if (
        nativeValue !== null &&
        (localValue === null || Number(nativeStamp) >= Number(localStamp))
      ) {
        localStorage.setItem(key, nativeValue);
        localStorage.setItem(stampKey(key), nativeStamp ?? '0');
      } else if (localValue !== null) {
        await Preferences.set({ key, value: localValue });
        await Preferences.set({ key: stampKey(key), value: localStamp ?? '0' });
      }
    }
  } catch {
    // Stockage natif indisponible : l'app continue avec localStorage.
  }
}

/** Appelle `callback` quand un autre onglet modifie `key`. */
export function subscribeToKey(key: string, callback: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === key) {
      callback();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/** crypto.randomUUID() n'existe qu'en contexte sécurisé (HTTPS / localhost). */
export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
