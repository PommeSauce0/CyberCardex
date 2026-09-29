import { describe, expect, it } from 'vitest';

import { cards, getPrintingsByCard } from '../data/catalog';

import { cardVersions, cleanDeckCard, linePrinting, sanitizeDecks } from './deckStorage';

const v = cards.find((card) => card.id === 'v-streetkid')!;
const [vPrinting] = getPrintingsByCard(v.id);
const royce = getPrintingsByCard('royce-psycho-on-the-edge')[0];

describe('cleanDeckCard', () => {
  it('garde la version choisie si elle est bien de cette carte', () => {
    expect(cleanDeckCard({ cardId: v.id, quantity: 1, printingId: vPrinting.id })).toEqual({
      cardId: v.id,
      quantity: 1,
      printingId: vPrinting.id,
    });
  });

  it("oublie une version inconnue ou d'une autre carte, sans perdre la ligne", () => {
    expect(cleanDeckCard({ cardId: v.id, quantity: 2, printingId: 'inconnue' })).toEqual({
      cardId: v.id,
      quantity: 2,
    });
    expect(cleanDeckCard({ cardId: v.id, quantity: 2, printingId: royce.id })).toEqual({
      cardId: v.id,
      quantity: 2,
    });
  });

  it('rejette les lignes invalides', () => {
    expect(cleanDeckCard({ cardId: 'inconnue', quantity: 1 })).toBeUndefined();
    expect(cleanDeckCard({ cardId: v.id, quantity: 0 })).toBeUndefined();
    expect(cleanDeckCard(null)).toBeUndefined();
  });
});

describe('cardVersions', () => {
  it('une version par illustration, dans la langue préférée si elle existe', () => {
    const versions = cardVersions(v, 'FR');
    const variantKeys = new Set(getPrintingsByCard(v.id).map((printing) => printing.variantKey));
    expect(versions).toHaveLength(variantKeys.size);
    expect(new Set(versions.map((printing) => printing.variantKey)).size).toBe(variantKeys.size);
    // Les impressions Retail existent en FR : c'est cette langue qui est proposée.
    expect(
      versions.filter((p) => p.setId === 'welcome-to-night-city-retail').map((p) => p.language),
    ).toEqual(expect.arrayContaining(['FR']));
    expect(versions[0].setId).toBe('welcome-to-night-city-retail');
  });
});

describe('linePrinting', () => {
  it('la version choisie, sinon celle par défaut', () => {
    const beta = cardVersions(v, 'EN').find((p) => p.setId === 'welcome-to-night-city-beta')!;
    expect(linePrinting(v, beta.id, 'EN')?.id).toBe(beta.id);
    expect(linePrinting(v, undefined, 'EN')?.setId).toBe('welcome-to-night-city-retail');
    expect(linePrinting(v, royce.id, 'EN')?.cardId).toBe(v.id);
  });
});

describe('sanitizeDecks', () => {
  it('donne un nouvel identifiant aux decks en double (sauvegarde modifiée)', () => {
    const deck = (id: string, name: string) => ({ id, name, cards: [], updatedAt: '2026-09-29' });
    const decks = sanitizeDecks([deck('a', 'Un'), deck('a', 'Deux'), deck('a-2', 'Trois')]);
    expect(decks.map((item) => [item.id, item.name])).toEqual([
      ['a', 'Un'],
      ['a-2', 'Deux'],
      ['a-2-2', 'Trois'],
    ]);
    expect(new Set(decks.map((item) => item.id)).size).toBe(3);
  });
});
