import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CardLanguage } from '../data/types';
import { detectLanguage, setCurrentLanguage, type Language } from '../i18n';
import { readJson, subscribeToKey, writeJson } from '../storage/storage';

const STORAGE_KEY = 'cybercardex.settings.v1';

export type CardSize = 'small' | 'medium' | 'large';
// eslint-disable-next-line react-refresh/only-export-components
export const CARD_SIZES: CardSize[] = ['small', 'medium', 'large'];

/** Pochettes par page du classeur : 9 (3×3) ou 12 (4×3). */
export type BinderSlots = 9 | 12;

export type AppSettings = {
  preferredCardLanguage: CardLanguage;
  /** Langue de l'interface (textes de l'app, pas des cartes). */
  interfaceLanguage: Language;
  /** Taille des cartes dans les grilles. */
  cardSize: CardSize;
  /** Classeurs à 12 pochettes, par série (9 par défaut). */
  binderSlots: Record<string, BinderSlots>;
};

type SettingsContextValue = AppSettings & {
  setPreferredCardLanguage: (language: CardLanguage) => void;
  setInterfaceLanguage: (language: Language) => void;
  setCardSize: (size: CardSize) => void;
  getBinderSlots: (setId: string) => BinderSlots;
  setBinderSlots: (setId: string, slots: BinderSlots) => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  preferredCardLanguage: 'EN',
  interfaceLanguage: detectLanguage(),
  cardSize: 'medium',
  binderSlots: {},
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings>>(STORAGE_KEY);
  const cardLanguage = stored?.preferredCardLanguage;
  const interfaceLanguage = stored?.interfaceLanguage;
  const binderSlots = Object.fromEntries(
    Object.entries(stored?.binderSlots ?? {}).filter(([, slots]) => slots === 12),
  ) as Record<string, BinderSlots>;
  return {
    preferredCardLanguage:
      cardLanguage === 'FR' || cardLanguage === 'EN'
        ? cardLanguage
        : DEFAULT_SETTINGS.preferredCardLanguage,
    interfaceLanguage:
      interfaceLanguage === 'fr' || interfaceLanguage === 'en'
        ? interfaceLanguage
        : DEFAULT_SETTINGS.interfaceLanguage,
    cardSize: CARD_SIZES.includes(stored?.cardSize as CardSize)
      ? (stored?.cardSize as CardSize)
      : DEFAULT_SETTINGS.cardSize,
    binderSlots,
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => writeJson(STORAGE_KEY, settings), [settings]);

  useEffect(() => subscribeToKey(STORAGE_KEY, () => setSettings(loadSettings())), []);

  const setPreferredCardLanguage = useCallback((language: CardLanguage) => {
    setSettings((current) => ({ ...current, preferredCardLanguage: language }));
  }, []);

  const setInterfaceLanguage = useCallback((language: Language) => {
    setSettings((current) => ({ ...current, interfaceLanguage: language }));
  }, []);

  const setCardSize = useCallback((cardSize: CardSize) => {
    setSettings((current) => ({ ...current, cardSize }));
  }, []);

  const setBinderSlots = useCallback((setId: string, slots: BinderSlots) => {
    setSettings((current) => {
      const binderSlots = { ...current.binderSlots };
      if (slots === 12) {
        binderSlots[setId] = 12;
      } else {
        delete binderSlots[setId];
      }
      return { ...current, binderSlots };
    });
  }, []);

  // Pendant le rendu : les libellés hors composants (messages()) suivent la même langue.
  setCurrentLanguage(settings.interfaceLanguage);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      setPreferredCardLanguage,
      setInterfaceLanguage,
      setCardSize,
      getBinderSlots: (setId) => settings.binderSlots[setId] ?? 9,
      setBinderSlots,
    }),
    [settings, setPreferredCardLanguage, setInterfaceLanguage, setCardSize, setBinderSlots],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings doit être utilisé dans SettingsProvider');
  }
  return context;
}
