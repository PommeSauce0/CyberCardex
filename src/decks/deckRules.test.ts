import { describe, expect, it } from 'vitest';

import { cards } from '../data/catalog';
import type { Card } from '../data/types';

import {
  costCurve,
  deckCounts,
  deckIssues,
  groupLines,
  legendBlocked,
  maxCopies,
  ramByColor,
  sortLines,
  type DeckLine,
} from './deckRules';

const byId = (id: string) => cards.find((card) => card.id === id)!;
const line = (id: string, quantity = 1): DeckLine => ({ card: byId(id), quantity });

/** Carte inventée pour les cas que le catalogue ne couvre pas. */
const fake = (id: string, extra: Partial<Card>): DeckLine => ({
  card: { id, name: id.toUpperCase(), cardType: 'Unit', color: 'Red', ram: 1, cost: 2, ...extra },
  quantity: 1,
});

/** 3 Légendes rouge / rouge / jaune (RAM 2 chacune). */
const LEGENDS = [
  line('v-streetkid'),
  line('royce-psycho-on-the-edge'),
  line('rogue-amendiares-preem-solo'),
];

/** `count` cartes non-Légendes jouables (RAM 1 rouge), 3 exemplaires max chacune. */
function filler(count: number): DeckLine[] {
  const lines: DeckLine[] = [];
  for (let index = 0; count > 0; index++) {
    const quantity = Math.min(3, count);
    lines.push({ ...fake(`filler-${index}`, {}), quantity });
    count -= quantity;
  }
  return lines;
}

describe('deckCounts', () => {
  it('compte les Légendes à part', () => {
    expect(deckCounts([...LEGENDS, ...filler(7)])).toEqual({ legends: 3, cards: 7 });
  });
});

describe('maxCopies', () => {
  it('3 exemplaires, 1 pour une Légende', () => {
    expect(maxCopies(byId('japantown-jonin'))).toBe(3);
    expect(maxCopies(byId('v-streetkid'))).toBe(1);
  });
});

describe('legendBlocked', () => {
  const v = byId('v-streetkid');
  it('libre tant que 3 Légendes de noms différents ne sont pas choisies', () => {
    expect(legendBlocked([], v)).toBeUndefined();
    expect(legendBlocked([byId('royce-psycho-on-the-edge')], v)).toBeUndefined();
  });

  it('bloquée si une Légende du même nom est choisie (sous-titre ignoré)', () => {
    expect(legendBlocked([byId('v-corporate-exile')], v)).toBe('sameName');
  });

  it('bloquée quand 3 Légendes sont déjà choisies', () => {
    const three = LEGENDS.map((entry) => entry.card);
    expect(legendBlocked(three, byId('goro-takemura-hands-unclean'))).toBe('full');
  });
});

describe('ramByColor', () => {
  it('additionne la RAM des Légendes par couleur', () => {
    expect(ramByColor(LEGENDS)).toEqual({ Red: 4, Yellow: 2 });
  });

  it("une Légende en double ne compte qu'une fois", () => {
    expect(ramByColor([line('v-streetkid', 2)])).toEqual({ Red: 2 });
  });
});

describe('deckIssues', () => {
  it('un deck légal ne signale rien', () => {
    expect(deckIssues([...LEGENDS, ...filler(40)])).toEqual([]);
    expect(deckIssues([...LEGENDS, ...filler(50)])).toEqual([]);
  });

  it('nombre de Légendes et de cartes', () => {
    const kinds = deckIssues([LEGENDS[0], ...filler(39)]).map((issue) => issue.kind);
    expect(kinds).toEqual(['legendCount', 'cardCount']);
    expect(deckIssues([...LEGENDS, ...filler(51)])).toEqual([{ kind: 'cardCount', count: 51 }]);
  });

  it('deux Légendes du même nom (sous-titre ignoré, casse ignorée)', () => {
    const issues = deckIssues([
      line('v-streetkid'),
      line('v-corporate-exile'),
      line('rogue-amendiares-preem-solo'),
      ...filler(40),
    ]);
    expect(issues).toEqual([{ kind: 'legendName', name: 'V' }]);
  });

  it('trop d’exemplaires', () => {
    const issues = deckIssues([
      { ...LEGENDS[0], quantity: 2 },
      ...LEGENDS.slice(1),
      ...filler(36),
      { ...fake('extra', {}), quantity: 4 },
    ]);
    expect(issues).toEqual([
      { kind: 'copies', card: LEGENDS[0].card, quantity: 2, max: 1 },
      { kind: 'legendCount', count: 4 },
      { kind: 'copies', card: expect.objectContaining({ id: 'extra' }), quantity: 4, max: 3 },
    ]);
  });

  it('RAM : une carte ne peut pas demander plus que ses Légendes', () => {
    const issues = deckIssues([
      ...LEGENDS,
      ...filler(37),
      fake('big-red', { ram: 5 }),
      fake('ok-red', { ram: 4 }),
      fake('blue', { color: 'Blue', ram: 1 }),
    ]);
    expect(issues).toEqual([
      {
        kind: 'ram',
        card: expect.objectContaining({ id: 'big-red' }),
        color: 'Red',
        need: 5,
        have: 4,
      },
      {
        kind: 'ram',
        card: expect.objectContaining({ id: 'blue' }),
        color: 'Blue',
        need: 1,
        have: 0,
      },
    ]);
  });
});

describe('sortLines', () => {
  const lines = [
    fake('b', { ram: 1, cost: 5, color: 'Yellow', cardType: 'Program' }),
    fake('a', { ram: 3, cost: 1, color: 'Blue', cardType: 'Gear' }),
    fake('c', { ram: 2, cost: 3, color: 'Red', cardType: 'Unit' }),
    line('v-streetkid'),
  ];
  const ids = (sort: Parameters<typeof sortLines>[1]) =>
    sortLines(lines, sort).map((entry) => entry.card.id);

  it('les Légendes toujours en haut', () => {
    for (const sort of ['type', 'ram', 'color', 'cost', 'name'] as const) {
      expect(ids(sort)[0]).toBe('v-streetkid');
    }
  });

  it('trie selon le critère, puis par nom', () => {
    expect(ids('type')).toEqual(['v-streetkid', 'c', 'a', 'b']);
    expect(ids('ram')).toEqual(['v-streetkid', 'b', 'c', 'a']);
    expect(ids('cost')).toEqual(['v-streetkid', 'a', 'c', 'b']);
    expect(ids('color')).toEqual(['v-streetkid', 'c', 'a', 'b']);
    expect(ids('name')).toEqual(['v-streetkid', 'a', 'b', 'c']);
  });

  it("à égalité, le coût puis l'ordre alphabétique", () => {
    const tied = [
      fake('zed', { ram: 1, cost: 2 }),
      fake('abe', { ram: 1, cost: 2 }),
      fake('cheap', { ram: 1, cost: 1 }),
    ];
    expect(sortLines(tied, 'ram').map((entry) => entry.card.id)).toEqual(['cheap', 'abe', 'zed']);
    expect(sortLines(tied, 'name').map((entry) => entry.card.id)).toEqual(['abe', 'cheap', 'zed']);
  });
});

describe('groupLines', () => {
  const lines = [
    { ...fake('x', { ram: 2, color: 'Blue' }), quantity: 3 },
    fake('y', { ram: 1 }),
    fake('z', { ram: 2 }),
    line('v-streetkid'),
  ];
  const summary = (sort: Parameters<typeof groupLines>[1]) =>
    groupLines(lines, sort).map((group) => [
      group.legends ? 'legends' : group.value,
      group.count,
      group.lines.map((entry) => entry.card.id).join(''),
    ]);

  it('Légendes à part, puis un groupe par valeur du critère', () => {
    expect(summary('ram')).toEqual([
      ['legends', 1, 'v-streetkid'],
      [1, 1, 'y'],
      [2, 4, 'xz'],
    ]);
    expect(summary('color')).toEqual([
      ['legends', 1, 'v-streetkid'],
      ['Red', 2, 'yz'],
      ['Blue', 3, 'x'],
    ]);
  });

  it('par nom : un seul groupe après les Légendes', () => {
    expect(summary('name')).toEqual([
      ['legends', 1, 'v-streetkid'],
      [undefined, 5, 'xyz'],
    ]);
  });
});

describe('costCurve', () => {
  it('compte les exemplaires par coût, hors Légendes', () => {
    const curve = costCurve([
      ...LEGENDS,
      { ...fake('x', { cost: 2 }), quantity: 3 },
      fake('y', { cost: 2 }),
      fake('z', { cost: 7 }),
      fake('none', { cost: undefined }),
    ]);
    expect(curve).toEqual([
      { cost: 2, count: 4 },
      { cost: 7, count: 1 },
      { cost: undefined, count: 1 },
    ]);
  });
});
