import { useT } from '../i18n/useT';
import {
  checkForUpdate,
  dismissUpdate,
  installUpdate,
  updatesEnabled,
  useUpdateState,
  type UpdateState,
} from './updater';

import './update.css';

const toMb = (bytes: number) => Math.max(1, Math.round(bytes / 1e6));

/** Ligne d'état + bouton d'action, commune au bandeau et aux réglages. */
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

/** Bandeau en haut de l'app quand une nouvelle version est disponible. */
export function UpdateBanner() {
  const t = useT();
  const state = useUpdateState();
  const { status, release, dismissed } = state;

  const visible =
    release &&
    ['available', 'needsPermission', 'downloading', 'installing', 'error'].includes(status) &&
    !(status === 'available' && dismissed);
  if (!updatesEnabled || !visible) {
    return null;
  }

  return (
    <aside className="update-banner" aria-label={t.update.title}>
      <div className="update-banner-text">
        <strong>{t.update.available(release.version)}</strong>
        {release.notes && <p>{release.notes.split('\n')[0]}</p>}
      </div>
      <div className="update-banner-actions">
        <UpdateProgress state={state} />
        {status === 'available' && (
          <button type="button" className="btn" onClick={dismissUpdate}>
            {t.update.later}
          </button>
        )}
      </div>
    </aside>
  );
}

/** Section « Application » des réglages : version, recherche manuelle, installation. */
export function UpdateSettings({ className }: { className: string }) {
  const t = useT();
  const state = useUpdateState();
  const { status, release, error } = state;

  if (!updatesEnabled) {
    return null;
  }

  return (
    <section className={className}>
      <div className="settings-section-heading">
        <h2>{t.update.title}</h2>
        <p>{t.update.text}</p>
      </div>

      {release ? (
        <div className="update-found">
          <strong>{t.update.available(release.version)}</strong>
          {release.notes && (
            <>
              <span className="update-notes-label">{t.update.notes}</span>
              <p className="update-notes">{release.notes}</p>
            </>
          )}
          <UpdateProgress state={state} />
        </div>
      ) : (
        <>
          {status === 'upToDate' && <p className="update-note">{t.update.upToDate}</p>}
          {status === 'error' && <p className="update-note error">{t.update.checkFailed}</p>}
          {status === 'error' && error && <p className="update-note">{error}</p>}
          <div className="settings-actions">
            <button
              type="button"
              className="btn"
              disabled={status === 'checking'}
              onClick={() => void checkForUpdate(true)}
            >
              {status === 'checking' ? t.update.checking : t.update.check}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
