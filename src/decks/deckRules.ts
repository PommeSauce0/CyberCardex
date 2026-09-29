import { CARD_COLORS, CARD_TYPES } from '../data/labels';
import type { Card, CardColor } from '../data/types';

/*
 * Règles de construction d'un deck (Cyberpunk TCG) :
 *   3 Légendes de noms différents ;
 *   40 à 50 cartes en plus des Légendes ;
 *   3 exemplaires max d'une même carte (1 pour une Légende) ;
 *   la RAM d'une carte ne dépasse pas la RAM des Légendes de sa couleur.
 * L'app avertit sans bloquer, sauf le nombre d'exemplaires (bouton « + »).
 */

export const LEGEND_COUNT = 3;
export const MIN_CARDS = 40;
export const MAX_CARDS = 50;

export type DeckLine = { card: Card; quantity: number };

export type DeckIssue =
  | { kind: 'legendCount'; count: number }
  | { kind: 'legendName'; name: string }
  | { kind: 'cardCount'; count: number }
  | { kind: 'copies'; card: Card; quantity: number; max: number }
  | { kind: 'ram'; card: Card; color: CardColor; need: number; have: number };

export type DeckSort = 'type' | 'ram' | 'color' | 'cost' | 'name';
export const DECK_SORTS: DeckSort[] = ['type', 'ram', 'color', 'cost', 'name'];

const isLegend = (card: Card) => card.cardType === 'Legend';

export const maxCopies = (card: Card) => (isLegend(card) ? 1 : 3);

export function deckCounts(lines: DeckLine[]) {
  let legends = 0;
  let cards = 0;
  for (const { card, quantity } of lines) {
    if (isLegend(card)) {
      legends += quantity;
    } else {
      cards += quantity;
    }
  }
  return { legends, cards };
}

/**
 * Pourquoi une Légende ne peut pas s'ajouter aux Légendes déjà choisies (création guidée) :
 * 'full' (déjà 3), 'sameName' (une Légende du même nom, sous-titre ignoré), sinon rien.
 */
export function legendBlocked(chosen: Card[], legend: Card): 'full' | 'sameName' | undefined {
  const name = legend.name.toLowerCase();
  if (chosen.some((card) => card.id !== legend.id && card.name.toLowerCase() === name)) {
    return 'sameName';
  }
  return chosen.length >= LEGEND_COUNT ? 'full' : undefined;
}

/** RAM apportée par les Légendes, par couleur (une Légende en double ne compte qu'une fois). */
export function ramByColor(lines: DeckLine[]): Partial<Record<CardColor, number>> {
  const ram: Partial<Record<CardColor, number>> = {};
  for (const { card } of lines) {
    if (isLegend(card) && card.color) {
      ram[card.color] = (ram[card.color] ?? 0) + (card.ram ?? 0);
    }
  }
  return ram;
}

/** Problèmes du deck : Légendes d'abord, puis nombre de cartes, puis carte par carte. */
export function deckIssues(lines: DeckLine[]): DeckIssue[] {
  const issues: DeckIssue[] = [];
  const legends = lines.filter((line) => isLegend(line.card));
  const counts = deckCounts(lines);

  for (const { card, quantity } of legends) {
    if (quantity > 1) {
      issues.push({ kind: 'copies', card, quantity, max: 1 });
    }
  }
  if (counts.legends !== LEGEND_COUNT) {
    issues.push({ kind: 'legendCount', count: counts.legends });
  }
  const seen = new Set<string>();
  const reported = new Set<string>();
  for (const { card } of legends) {
    const key = card.name.toLowerCase();
    if (seen.has(key) && !reported.has(key)) {
      issues.push({ kind: 'legendName', name: card.name });
      reported.add(key);
    }
    seen.add(key);
  }

  if (counts.cards < MIN_CARDS || counts.cards > MAX_CARDS) {
    issues.push({ kind: 'cardCount', count: counts.cards });
  }

  const ram = ramByColor(lines);
  for (const { card, quantity } of lines) {
    if (isLegend(card)) {
      continue;
    }
    if (quantity > 3) {
      issues.push({ kind: 'copies', card, quantity, max: 3 });
    }
    const need = card.ram ?? 0;
    if (card.color && need > 0 && need > (ram[card.color] ?? 0)) {
      issues.push({ kind: 'ram', card, color: card.color, need, have: ram[card.color] ?? 0 });
    }
  }
  return issues;
}

/** Rang dans une liste ; une valeur inconnue (nouvelle série) passe après les autres. */
function rankIn<T>(list: readonly T[], value: T | undefined) {
  const rank = value === undefined ? -1 : list.indexOf(value);
  return rank === -1 ? list.length : rank;
}

/** Valeur numérique absente : en dernier. */
const orLast = (value?: number) => value ?? Number.MAX_SAFE_INTEGER;

const SORT_KEYS: Record<DeckSort, (card: Card) => number> = {
  type: (card) => rankIn(CARD_TYPES, card.cardType),
  ram: (card) => orLast(card.ram),
  color: (card) => rankIn(CARD_COLORS, card.color),
  cost: (card) => orLast(card.cost),
  name: () => 0,
};

/** Lignes triées : Légendes en haut, puis selon `sort`, puis par coût (ordre de jeu) et par nom. */
export function sortLines<T extends DeckLine>(lines: T[], sort: DeckSort): T[] {
  const key = SORT_KEYS[sort];
  const byCost = sort === 'cost' || sort === 'name' ? SORT_KEYS.name : SORT_KEYS.cost;
  return [...lines].sort(
    (a, b) =>
      Number(isLegend(b.card)) - Number(isLegend(a.card)) ||
      key(a.card) - key(b.card) ||
      byCost(a.card) - byCost(b.card) ||
      a.card.name.localeCompare(b.card.name) ||
      (a.card.subtitle ?? '').localeCompare(b.card.subtitle ?? ''),
  );
}

/** Valeur qui sert d'intertitre pour chaque tri (aucune pour le tri par nom). */
const GROUP_VALUES: Record<DeckSort, (card: Card) => string | number | undefined> = {
  type: (card) => card.cardType,
  ram: (card) => card.ram,
  color: (card) => card.color,
  cost: (card) => card.cost,
  name: () => undefined,
};

export type DeckGroup<T> = {
  /** Groupe des Légendes (toujours le premier). */
  legends: boolean;
  /** Type, RAM, couleur ou coût commun aux cartes du groupe. */
  value?: string | number;
  /** Nombre d'exemplaires. */
  count: number;
  lines: T[];
};

/** Lignes triées puis regroupées sous des intertitres : Légendes, puis une valeur du tri. */
export function groupLines<T extends DeckLine>(lines: T[], sort: DeckSort): DeckGroup<T>[] {
  const groups: DeckGroup<T>[] = [];
  for (const line of sortLines(lines, sort)) {
    const legends = isLegend(line.card);
    const value = legends ? undefined : GROUP_VALUES[sort](line.card);
    let group = groups[groups.length - 1];
    if (!group || group.legends !== legends || group.value !== value) {
      group = { legends, value, count: 0, lines: [] };
      groups.push(group);
    }
    group.count += line.quantity;
    group.lines.push(line);
  }
  return groups;
}

/** Nombre d'exemplaires par coût (hors Légendes) ; les cartes sans coût à la fin. */
export function costCurve(lines: DeckLine[]) {
  const counts = new Map<number | undefined, number>();
  for (const { card, quantity } of lines) {
    if (!isLegend(card)) {
      counts.set(card.cost, (counts.get(card.cost) ?? 0) + quantity);
    }
  }
  return [...counts]
    .map(([cost, count]) => ({ cost, count }))
    .sort((a, b) => orLast(a.cost) - orLast(b.cost));
}
