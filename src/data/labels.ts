import { messages } from '../i18n';

import type {
  CardColor,
  CardFinish,
  CardSet,
  CardType,
  Rarity,
  ReleaseType,
} from './types';

/** Du plus courant au plus rare : sert au tri et aux filtres. */
export const RARITIES: Rarity[] = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Nova Rare',
  'Secret',
  'Iconic Legend',
  'Iconic Other',
  'Iconic Secret',
];

export const RARITY_RANK = new Map(RARITIES.map((rarity, index) => [rarity, index]));

export const CARD_COLORS: CardColor[] = ['Red', 'Blue', 'Green', 'Yellow'];

export const CARD_TYPES: CardType[] = ['Legend', 'Unit', 'Gear', 'Program'];

export const COLOR_HEX: Record<CardColor, string> = {
  Red: '#ff4d5e',
  Blue: '#3d8bff',
  Green: '#3ddc84',
  Yellow: '#fcee0a',
};

export function getFinishLabel(finish: CardFinish) {
  switch (finish) {
    case 'Standard':
      return 'Standard';
    case 'Foil':
      return 'Foil';
    case 'Unknown':
    default:
      return messages().common.finishUnknown;
  }
}

// ---------- Onglets de l'accueil ----------

export type CatalogTab = 'core' | 'promo' | 'decks';

export const CATALOG_TABS: CatalogTab[] = ['core', 'promo', 'decks'];

const TAB_BY_RELEASE_TYPE: Record<ReleaseType, CatalogTab> = {
  set: 'core',
  promo: 'promo',
  event: 'promo',
  prerelease: 'promo',
  'box-topper': 'promo',
  starter: 'decks',
  demo: 'decks',
};

export function getCatalogTab(set: CardSet): CatalogTab {
  return TAB_BY_RELEASE_TYPE[set.releaseType];
}

export function getReleaseDisplayInfo(set: CardSet): { typeLabel: string; variantLabel?: string } {
  switch (set.releaseType) {
    case 'event':
      return { typeLabel: 'EVENT' };
    case 'promo':
      return { typeLabel: 'PROMO' };
    case 'prerelease':
      return {
        typeLabel: 'PRE-RELEASE',
        variantLabel: set.edition !== 'Pre-Release' ? set.edition : undefined,
      };
    case 'box-topper':
      // Garde l'édition visible pour distinguer Box Toppers Beta / Retail.
      return { typeLabel: 'BOX TOPPER', variantLabel: set.edition };
    case 'starter':
      return { typeLabel: 'STARTER', variantLabel: set.edition };
    case 'demo':
      return { typeLabel: 'DEMO', variantLabel: set.edition };
    case 'set':
    default:
      return { typeLabel: set.edition };
  }
}

export function formatPrice(value: number) {
  return value.toLocaleString(messages().locale, { style: 'currency', currency: 'EUR' });
}

export function percent(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

/** "42 %", ou "< 1 %" dès qu'on possède au moins une carte. */
export function formatPercent(part: number, total: number) {
  const value = percent(part, total);
  return value === 0 && part > 0 ? '< 1 %' : `${value} %`;
}

/** « 2 cartes » : en français le pluriel commence à 2, en anglais dès 0 (« 0 cards »). */
export function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${messages().isPlural(count) ? pluralForm : singular}`;
}
