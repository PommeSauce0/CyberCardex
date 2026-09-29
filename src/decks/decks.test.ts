import { describe, expect, it } from 'vitest';

import { cards } from '../data/catalog';

import { deckFileName, deckToText } from './exportDeck';
import { parseDeck } from './parseDeck';

const byId = (id: string) => cards.find((card) => card.id === id)!;

describe('parseDeck', () => {
  it('lit les formats courants', () => {
    const { lines, unknown } = parseDeck(
      [
        '3x Adam Smasher - Ender of Legends',
        '2 V: Streetkid',
        'Royce - Psycho on the Edge x2',
        '// commentaire',
        'Legends',
      ].join('\n'),
    );
    expect(unknown).toEqual([]);
    const quantities = Object.fromEntries(lines.map((line) => [line.card.id, line.quantity]));
    expect(quantities).toEqual({
      'adam-smasher-ender-of-legends': 3,
      'v-streetkid': 2,
      'royce-psycho-on-the-edge': 2,
    });
  });

  it('additionne les doublons et signale les lignes inconnues', () => {
    const { lines, unknown } = parseDeck('1x V - Streetkid\n2x V - Streetkid\n3x Carte inventée');
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
    expect(unknown).toEqual(['3x Carte inventée']);
  });

  it('refuse les quantités nulles ou démesurées (ligne signalée, pas importée)', () => {
    const huge = `${'9'.repeat(400)}x V - Streetkid`;
    const { lines, unknown } = parseDeck(
      ['0x V - Streetkid', huge, '100 V - Streetkid'].join('\n'),
    );
    expect(lines).toEqual([]);
    expect(unknown).toEqual(['0x V - Streetkid', huge, '100 V - Streetkid']);
    expect(parseDeck('99x V - Streetkid').lines[0]?.quantity).toBe(99);
  });

  it('reconnaît les numéros Beta', () => {
    const { lines } = parseDeck('2 β001');
    expect(lines[0]?.card.id).toBe('adam-smasher-ender-of-legends');
  });
});

describe('deckToText', () => {
  it("se relit à l'identique pour toutes les cartes du catalogue", () => {
    const deck = cards.map((card, index) => ({ card, quantity: (index % 3) + 1 }));
    const parsed = parseDeck(deckToText('Tout', deck, (type) => type ?? 'Autres'));
    expect(parsed.unknown).toEqual([]);
    expect(new Map(parsed.lines.map((line) => [line.card.id, line.quantity]))).toEqual(
      new Map(deck.map((line) => [line.card.id, line.quantity])),
    );
  });

  it('regroupe par type avec le total de chaque section', () => {
    const text = deckToText(
      'Test',
      [
        { card: byId('v-streetkid'), quantity: 2 },
        { card: byId('adam-smasher-ender-of-legends'), quantity: 1 },
      ],
      (type) => `${type}s`,
    );
    expect(text).toBe(
      '// Test\n\n// Legends (3)\n2x V - Streetkid\n1x ADAM SMASHER - Ender of Legends\n',
    );
  });
});

describe('deckFileName', () => {
  it('produit un nom de fichier sûr', () => {
    expect(deckFileName('Mon deck « Rouge » éé')).toBe('cybercardex-deck-mon-deck-rouge-ee.txt');
    expect(deckFileName('')).toBe('cybercardex-deck-sans-nom.txt');
  });
});
