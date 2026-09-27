import { useSettings } from '../settings/SettingsContext';

import { getMessages } from './index';

/** Messages de la langue choisie dans les réglages (se met à jour quand elle change). */
export function useT() {
  return getMessages(useSettings().interfaceLanguage);
}
