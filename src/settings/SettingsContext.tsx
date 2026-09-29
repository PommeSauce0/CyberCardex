import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { refreshPrices } from '../data/livePrices';
import type { CardLanguage } from '../data/types';
import { DECK_SORTS, type DeckSort } from '../decks/deckRules';
import { detectLanguage, setCurrentLanguage, type Language } from '../i18n';
import { readJson, subscribeToKey, writeJson } from '../storage/storage';

const STORAGE_KEY = 'cybercardex.settings.v1';

type CardSize = 'small' | 'medium' | 'large';
// eslint-disable-next-line react-refresh/only-export-components
export const CARD_SIZES: CardSize[] = ['small', 'medium', 'large'];

/** Taille des boutons et filtres sur téléphone. */
type UiSize = 'compact' | 'normal';
// eslint-disable-next-line react-refresh/only-export-components
export const UI_SIZES: UiSize[] = ['compact', 'normal'];

/** Cardmarket (fonction expérimentale) : lien seul, lien avec prix indicatif, ou rien. */
type CardmarketMode = 'link' | 'price' | 'off';
// eslint-disable-next-line react-refresh/only-export-components
export const CARDMARKET_MODES: CardmarketMode[] = ['link', 'price', 'off'];

/** Création d'un deck : guidée (3 Légendes d'abord) ou libre (deck vide). */
type DeckCreation = 'guided' | 'free';
// eslint-disable-next-line react-refresh/only-export-components
export const DECK_CREATIONS: DeckCreation[] = ['guided', 'free'];

/** Pochettes par page du classeur : 9 (3×3) ou 12 (4×3). */
export type BinderSlots = 9 | 12;

type AppSettings = {
  preferredCardLanguage: CardLanguage;
  /** Langue de l'interface (textes de l'app, pas des cartes). */
  interfaceLanguage: Language;
  /** Taille des cartes dans les grilles. */
  cardSize: CardSize;
  /** Classeurs à 12 pochettes, par série (9 par défaut). */
  binderSlots: Record<string, BinderSlots>;
  /** Tri de la liste d'un deck. */
  deckSort: DeckSort;
  uiSize: UiSize;
  cardmarket: CardmarketMode;
  deckCreation: DeckCreation;
};

type SettingsContextValue = AppSettings & {
  setPreferredCardLanguage: (language: CardLanguage) => void;
  setInterfaceLanguage: (language: Language) => void;
  setCardSize: (size: CardSize) => void;
  getBinderSlots: (setId: string) => BinderSlots;
  setBinderSlots: (setId: string, slots: BinderSlots) => void;
  setDeckSort: (sort: DeckSort) => void;
  setUiSize: (size: UiSize) => void;
  setCardmarket: (mode: CardmarketMode) => void;
  setDeckCreation: (mode: DeckCreation) => void;
  /** Remplace tous les réglages (restauration d'une sauvegarde). */
  restoreSettings: (stored: Record<string, unknown>) => void;
  /** Les réglages seuls (sans les fonctions), pour la sauvegarde. */
  snapshot: AppSettings;
};

const DEFAULT_SETTINGS: AppSettings = {
  preferredCardLanguage: 'EN',
  interfaceLanguage: detectLanguage(),
  cardSize: 'medium',
  binderSlots: {},
  deckSort: 'type',
  uiSize: 'compact',
  cardmarket: 'link',
  deckCreation: 'guided',
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/** Réglages valides (stockage ou sauvegarde importée) : une valeur inconnue prend sa valeur par défaut. */
function sanitizeSettings(stored: Partial<AppSettings> | undefined): AppSettings {
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
    deckSort: DECK_SORTS.includes(stored?.deckSort as DeckSort)
      ? (stored?.deckSort as DeckSort)
      : DEFAULT_SETTINGS.deckSort,
    uiSize: UI_SIZES.includes(stored?.uiSize as UiSize)
      ? (stored?.uiSize as UiSize)
      : DEFAULT_SETTINGS.uiSize,
    cardmarket: CARDMARKET_MODES.includes(stored?.cardmarket as CardmarketMode)
      ? (stored?.cardmarket as CardmarketMode)
      : DEFAULT_SETTINGS.cardmarket,
    deckCreation: DECK_CREATIONS.includes(stored?.deckCreation as DeckCreation)
      ? (stored?.deckCreation as DeckCreation)
      : DEFAULT_SETTINGS.deckCreation,
  };
}

const loadSettings = () => sanitizeSettings(readJson<Partial<AppSettings>>(STORAGE_KEY));

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => writeJson(STORAGE_KEY, settings), [settings]);

  useEffect(() => subscribeToKey(STORAGE_KEY, () => setSettings(loadSettings())), []);

  // Prix Cardmarket du jour : seulement si l'utilisateur affiche les prix.
  useEffect(() => {
    if (settings.cardmarket === 'price') {
      void refreshPrices();
    }
  }, [settings.cardmarket]);

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

  const setDeckSort = useCallback((deckSort: DeckSort) => {
    setSettings((current) => ({ ...current, deckSort }));
  }, []);

  const setUiSize = useCallback((uiSize: UiSize) => {
    setSettings((current) => ({ ...current, uiSize }));
  }, []);

  const setCardmarket = useCallback((cardmarket: CardmarketMode) => {
    setSettings((current) => ({ ...current, cardmarket }));
  }, []);

  const setDeckCreation = useCallback((deckCreation: DeckCreation) => {
    setSettings((current) => ({ ...current, deckCreation }));
  }, []);

  const restoreSettings = useCallback((stored: Record<string, unknown>) => {
    setSettings(sanitizeSettings(stored as Partial<AppSettings>));
  }, []);

  // Interface compacte (fin de App.css) : classe sur <html>, posée avant l'affichage.
  document.documentElement.classList.toggle('compact-ui', settings.uiSize === 'compact');

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
      setDeckSort,
      setUiSize,
      setCardmarket,
      setDeckCreation,
      restoreSettings,
      snapshot: settings,
    }),
    [
      settings,
      setPreferredCardLanguage,
      setInterfaceLanguage,
      setCardSize,
      setBinderSlots,
      setDeckSort,
      setUiSize,
      setCardmarket,
      setDeckCreation,
      restoreSettings,
    ],
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
