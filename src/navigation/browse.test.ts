import { describe, expect, it } from 'vitest';

import { printings } from '../data/catalog';

import { browsedPrintings, browseState } from './browse';

const [a, b, c] = printings;

describe('browsedPrintings', () => {
  it("rend la liste d'origine quand la carte en fait partie", () => {
    const state = browseState([a.id, b.id, c.id]);
    expect(browsedPrintings(state, b.id)?.map((printing) => printing.id)).toEqual([
      a.id,
      b.id,
      c.id,
    ]);
  });

  it('rien si la carte est hors de la liste ou sans liste (retour au parcours de la série)', () => {
    expect(browsedPrintings(browseState([a.id, b.id]), c.id)).toBeUndefined();
    expect(browsedPrintings(null, a.id)).toBeUndefined();
    expect(browsedPrintings({ browse: 'pas une liste' }, a.id)).toBeUndefined();
  });

  it('ignore les impressions disparues du catalogue', () => {
    const state = browseState([a.id, 'impression-inconnue', b.id]);
    expect(browsedPrintings(state, a.id)?.map((printing) => printing.id)).toEqual([a.id, b.id]);
  });
});
