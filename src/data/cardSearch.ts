import { cards, printings } from './catalog';
import type { Card } from './types';

/** Texte comparable : minuscules, sans accents ni ponctuation. */
export const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type SearchEntry = { card: Card; name: string; full: string; extra: string };

const searchIndex: SearchEntry[] = cards.map((card) => {
  const localized = printings
    .filter((printing) => printing.cardId === card.id && printing.localizedName)
    .map((printing) => printing.localizedName);
  return {
    card,
    name: norm(card.name),
    full: norm(card.subtitle ? `${card.name} ${card.subtitle}` : card.name),
    extra: norm([...new Set(localized)].join(' ')),
  };
});

/**
 * Cartes dont le nom (ou sous-titre, ou nom français) contient tous les mots tapés.
 * Les noms qui commencent par la recherche passent devant.
 */
export function searchCards(query: string, limit = 8): Card[] {
  const words = norm(query).split(' ').filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const joined = words.join(' ');
  return searchIndex
    .filter((entry) =>
      words.every((word) => entry.full.includes(word) || entry.extra.includes(word)),
    )
    .sort(
      (a, b) =>
        Number(b.name.startsWith(joined) || b.full.startsWith(joined)) -
          Number(a.name.startsWith(joined) || a.full.startsWith(joined)) ||
        a.full.localeCompare(b.full),
    )
    .slice(0, limit)
    .map((entry) => entry.card);
}
