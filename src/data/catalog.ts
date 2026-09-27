// Catalogue généré par `npm run sync-catalog -- --apply`.
// - cards.json / printings.json : ne pas éditer à la main, les corrections de finition et de
//   traitements vont dans data/printing-overrides.json ;
// - sets.json : métadonnées éditables (nom, édition, releaseType…), conservées par la sync.
import cardsJson from './cards.json';
import printingsJson from './printings.json';
import setsJson from './sets.json';

import type { Card, CardLanguage, CardSet, Printing } from './types';

export const cards = cardsJson as Card[];
export const sets = setsJson as CardSet[];
export const printings = printingsJson as Printing[];

const numberCollator = new Intl.Collator('en', { numeric: true });

const cardsById = new Map(cards.map((card) => [card.id, card]));
const setsById = new Map(sets.map((set) => [set.id, set]));
const printingsById = new Map(printings.map((printing) => [printing.id, printing]));

// Les printings "stale" (retirées de l'API) restent accessibles par id pour la collection,
// mais ne sont plus listées dans les sets.
const printingsBySet = new Map<string, Printing[]>();
for (const printing of printings) {
  if (printing.status === 'stale') {
    continue;
  }
  const list = printingsBySet.get(printing.setId) ?? [];
  list.push(printing);
  printingsBySet.set(printing.setId, list);
}
for (const list of printingsBySet.values()) {
  list.sort((a, b) => compareNumbers(a.number, b.number));
}

export function getCardById(cardId: string) {
  return cardsById.get(cardId);
}

/** Miniature 400 px (grilles, classeur, listes) — voir scripts/build-thumbnails.mjs. */
export function getThumbUrl(printing: Printing) {
  return printing.imageUrl.replace(/^\/cards\//, '/thumbs/');
}

export function getSetById(setId: string) {
  return setsById.get(setId);
}

export function getPrintingById(printingId: string) {
  return printingsById.get(printingId);
}

function getPrintingsBySet(setId: string) {
  return printingsBySet.get(setId) ?? [];
}

export function getPreferredPrintingsBySet(
  setId: string,
  preferredLanguage: CardLanguage,
) {
  const groups = new Map<string, Printing[]>();

  for (const printing of getPrintingsBySet(setId)) {
    const current = groups.get(printing.variantKey) ?? [];
    current.push(printing);
    groups.set(printing.variantKey, current);
  }

  const selected: Printing[] = [];

  for (const variants of groups.values()) {
    const preferred =
      variants.find((printing) => printing.language === preferredLanguage) ??
      variants.find((printing) => printing.language === 'EN') ??
      variants[0];

    if (preferred) {
      selected.push(preferred);
    }
  }

  return selected;
}

const printingsByCard = new Map<string, Printing[]>();
for (const printing of printings) {
  if (printing.status === 'stale') {
    continue;
  }
  const list = printingsByCard.get(printing.cardId) ?? [];
  list.push(printing);
  printingsByCard.set(printing.cardId, list);
}

/** Toutes les impressions actives d'une carte, dans l'ordre des sets. */
export function getPrintingsByCard(cardId: string) {
  return printingsByCard.get(cardId) ?? [];
}

/** Tri naturel des numéros : β002 < β010, 005 < 005a < 006. */
export function compareNumbers(a: string, b: string) {
  return numberCollator.compare(a, b);
}

export type CatalogEntry = {
  card: Card;
  set: CardSet;
  printing: Printing;
};

const entriesCache = new Map<CardLanguage, CatalogEntry[]>();

/**
 * Une entrée par impression visible dans le catalogue (langue préférée,
 * avec repli sur EN), tous sets confondus.
 */
export function getCatalogEntries(preferredLanguage: CardLanguage) {
  const cached = entriesCache.get(preferredLanguage);
  if (cached) {
    return cached;
  }

  const entries: CatalogEntry[] = [];
  for (const set of sets) {
    for (const printing of getPreferredPrintingsBySet(set.id, preferredLanguage)) {
      const card = getCardById(printing.cardId);
      if (card) {
        entries.push({ card, set, printing });
      }
    }
  }

  entriesCache.set(preferredLanguage, entries);
  return entries;
}

const printingsByVariant = new Map<string, Printing[]>();
for (const printing of printings) {
  const list = printingsByVariant.get(printing.variantKey) ?? [];
  list.push(printing);
  printingsByVariant.set(printing.variantKey, list);
}

/** La même impression dans la langue demandée si elle existe, sinon l'impression d'origine. */
export function getPrintingInLanguage(printing: Printing, language: CardLanguage) {
  return (
    printingsByVariant
      .get(printing.variantKey)
      ?.find((candidate) => candidate.language === language && candidate.status !== 'stale') ??
    printing
  );
}

