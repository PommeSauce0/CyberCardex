import { useSyncExternalStore } from 'react';

import { useT } from '../i18n/useT';

import { onStorageFailure, storageWriteFailed } from './storage';

/**
 * Réglages → Ma collection, juste au-dessus du bouton Sauvegarder : affiché seulement si
 * une écriture a échoué pendant la session (stockage plein ou indisponible).
 */
export default function StorageWarning() {
  const t = useT();
  const failed = useSyncExternalStore(onStorageFailure, storageWriteFailed);
  if (!failed) {
    return null;
  }
  return (
    <p className="settings-message error" role="alert">
      {t.storage.writeFailed}
    </p>
  );
}
