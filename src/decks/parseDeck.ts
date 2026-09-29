import { cards, getCardById, printings, sets } from '../data/catalog';
import { norm } from '../data/cardSearch';
import type { Card } from '../data/types';

/*
 * Lecture d'une liste de deck collée depuis un site (deck builder officiel, ExBurst,
 * Cyberdeck Tools, simulateur…). Formats reconnus, une carte par ligne :
 *   3x Adam Smasher - Ender of Legends     3 Adam Smasher: Ender of Legends
 *   Adam Smasher - Ender of Legends x3     Corpo Security   (quantité 1)
 *   3x MS01-131A   (numéro de collection : série MS01 = Welcome to Night City)
 *   2 β131 / 2 B131 (numéro Beta)          noms français acceptés aussi
 * Les titres de sections (« Legends », « Deck (40) », « // … ») sont ignorés.
 * Un deck demande une carte, pas une impression : toutes les versions comptent.
 */

type DeckLine = { card: Card; quantity: number };
type ParsedDeck = { lines: DeckLine[]; unknown: string[] };

// Index des noms : « nom sous-titre », nom seul (s'il est unique), noms français.
const byName = new Map<string, Card>();
const nameCount = new Map<string, number>();
for (const card of cards) {
  nameCount.set(norm(card.name), (nameCount.get(norm(card.name)) ?? 0) + 1);
}
for (const card of cards) {
  byName.set(norm(card.subtitle ? `${card.name} ${card.subtitle}` : card.name), card);
  if (nameCount.get(norm(card.name)) === 1) {
    byName.set(norm(card.name), card);
  }
}
for (const printing of printings) {
  const card = getCardById(printing.cardId);
  if (printing.localizedName && card && !byName.has(norm(printing.localizedName))) {
    byName.set(norm(printing.localizedName), card);
  }
}

// Numéros de collection : MS01 = série principale (Retail), β / B = Beta.
const mainSet = sets.find((set) => set.id === 'welcome-to-night-city-retail');
const betaSet = sets.find((set) => set.id === 'welcome-to-night-city-beta');

function cardByNumber(setId: string | undefined, number: string) {
  const printing = printings.find(
    (item) => item.setId === setId && item.number.replace(/^β/, '').replace(/^0+/, '') === number,
  );
  return printing && getCardById(printing.cardId);
}

function findCard(label: string): Card | undefined {
  const text = label.trim();

  const collector = text.match(/^MS01[\s-]*0*(\d+)[a-z]?$/i);
  if (collector) {
    return cardByNumber(mainSet?.id, collector[1]);
  }
  const beta = text.match(/^[βB]\s*0*(\d+)$/);
  if (beta) {
    return cardByNumber(betaSet?.id, beta[1]);
  }
  return byName.get(norm(text));
}

/** Au-delà, la ligne est considérée comme une erreur de saisie (un deck en compte ~50). */
const MAX_QUANTITY = 99;

export function parseDeck(text: string): ParsedDeck {
  const totals = new Map<string, DeckLine>();
  const unknown: string[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) {
      continue;
    }

    // « 3x Nom », « 3 Nom », « Nom x3 », ou « Nom » seul.
    const match = line.match(/^(\d+)\s*[x×]?\s+(.+)$/i) ?? line.match(/^(.+?)\s+[x×]\s*(\d+)$/i);
    const [quantity, label] = match
      ? /^\d+$/.test(match[1])
        ? [Number(match[1]), match[2]]
        : [Number(match[2]), match[1]]
      : [1, line];

    // Quantité impossible (0, ou nombre démesuré qui deviendrait Infinity) : ligne signalée.
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      unknown.push(line);
      continue;
    }

    const card = findCard(label.replace(/\s*\(.*\)\s*$/, ''));
    if (card) {
      const existing = totals.get(card.id);
      totals.set(card.id, { card, quantity: (existing?.quantity ?? 0) + quantity });
    } else if (match || !/^[a-z\s]+(\(\d+\))?:?$/i.test(line)) {
      // Ligne avec quantité, ou qui ne ressemble pas à un titre de section.
      unknown.push(line);
    }
  }

  return { lines: [...totals.values()], unknown };
}
