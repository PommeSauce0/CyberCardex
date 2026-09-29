import { Link, useLocation } from 'react-router-dom';

import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';
import {
  checkForUpdate,
  installUpdate,
  updatesEnabled,
  useUpdateState,
  type UpdateState,
} from './updater';
import { releaseNotes } from './versions';

import './update.css';

const toMb = (bytes: number) => Math.max(1, Math.round(bytes / 1e6));

/** Ligne d'état + bouton d'action des réglages. */
function UpdateProgress({ state }: { state: UpdateState }) {
  const t = useT();
  const { status, release, percent = -1, error } = state;

  if (status === 'downloading') {
    return (
      <div className="update-progress" role="status">
        <span>{t.update.downloading(percent)}</span>
        <div className="progress">
          <div className="progress-value" style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
      </div>
    );
  }
  if (status === 'needsPermission') {
    return (
      <div className="update-row">
        <p className="update-note">{t.update.needsPermission}</p>
        <button type="button" className="btn" onClick={() => void installUpdate()}>
          {t.update.openPermission}
        </button>
      </div>
    );
  }
  if (status === 'installing') {
    return (
      <div className="update-row">
        <p className="update-note">{t.update.installing}</p>
        <button type="button" className="btn" onClick={() => void installUpdate()}>
          {t.update.retry}
        </button>
      </div>
    );
  }
  if (status === 'error' && release) {
    return (
      <div className="update-row">
        <p className="update-note error">{t.update.failed(error ?? '')}</p>
        <button type="button" className="btn" onClick={() => void installUpdate()}>
          {t.update.retry}
        </button>
      </div>
    );
  }
  if (release) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => void installUpdate()}>
        {t.update.install} ({t.update.size(toMb(release.size))})
      </button>
    );
  }
  return null;
}

/**
 * Banderole « ruban NCPD » en haut de l'app quand une nouvelle version existe. Le bouton
 * mène à la section Application des réglages, qui gère téléchargement et installation.
 */
export function UpdateBanner() {
  const t = useT();
  const { release } = useUpdateState();
  const { pathname } = useLocation();

  if (!updatesEnabled || !release || pathname === '/settings') {
    return null;
  }

  return (
    <aside className="update-banner" aria-label={t.update.title}>
      <span className="update-banner-hazard" aria-hidden="true" />
      <p className="update-banner-text">
        {t.update.kicker} <strong>v{release.version}</strong>
      </p>
      <Link to="/settings#update" className="update-banner-install">
        {t.update.install} ›
      </Link>
    </aside>
  );
}

/** Recherche manuelle de mise à jour (page Réglages), sans titre : la page le fournit. */
export function UpdateSettings() {
  const t = useT();
  const state = useUpdateState();
  const { status, release, error } = state;
  const { interfaceLanguage } = useSettings();
  const notes = release ? releaseNotes(release.notes, interfaceLanguage) : '';

  if (!updatesEnabled) {
    return null;
  }

  return (
    <>
      {release ? (
        <div className="update-found">
          <strong>{t.update.available(release.version)}</strong>
          {notes && (
            <>
              <span className="update-notes-label">{t.update.notes}</span>
              <p className="update-notes">{notes}</p>
            </>
          )}
          <UpdateProgress state={state} />
        </div>
      ) : (
        <>
          {/* Ligne d'état toujours présente et bouton au libellé fixe : rien ne bouge pendant
              la recherche (sinon la page saute quand on est en bas). */}
          <p
            className={`update-note update-status${status === 'error' ? ' error' : ''}`}
            role="status"
          >
            {status === 'checking'
              ? t.update.checking
              : status === 'upToDate'
                ? t.update.upToDate
                : status === 'error'
                  ? `${t.update.checkFailed}${error ? ` (${error})` : ''}`
                  : ''}
          </p>
          <div className="settings-actions">
            <button
              type="button"
              className="btn"
              disabled={status === 'checking'}
              onClick={() => void checkForUpdate(true)}
            >
              {t.update.check}
            </button>
          </div>
        </>
      )}
    </>
  );
}
