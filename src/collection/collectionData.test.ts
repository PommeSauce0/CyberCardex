import { describe, expect, it } from 'vitest';

import { buildExport, parseImport, sanitizeItems, sanitizeWishlist } from './collectionData';
import { csvCell } from './exportFiles';

const item = {
  id: 'a',
  printingId: 'p1',
  condition: 'Mint',
  graded: true,
  gradingCompany: 'PSA',
  grade: 10,
  purchasePrice: 12.5,
  notes: '  premier booster  ',
  createdAt: '2026-09-01T10:00:00.000Z',
};

describe('sanitizeItems', () => {
  it('garde les exemplaires valides et nettoie les champs', () => {
    const [clean] = sanitizeItems([item]);
    expect(clean).toEqual({ ...item, notes: 'premier booster' });
  });

  it('rejette les entrées inutilisables et les doublons', () => {
    const result = sanitizeItems([item, item, null, 42, { condition: 'Mint' }, 'texte']);
    expect(result).toHaveLength(1);
  });

  it('remplace les valeurs invalides par des valeurs sûres', () => {
    const [clean] = sanitizeItems([
      { printingId: 'p2', condition: 'Cassée', graded: true, grade: 99, purchasePrice: -3 },
    ]);
    expect(clean.condition).toBe('Near Mint');
    expect(clean.gradingCompany).toBe('Other');
    expect(clean.grade).toBeUndefined();
    expect(clean.purchasePrice).toBeUndefined();
    expect(clean.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(clean.createdAt))).toBe(false);
  });

  it("renvoie une liste vide si ce n'est pas un tableau", () => {
    expect(sanitizeItems(undefined)).toEqual([]);
    expect(sanitizeItems({ collection: [] })).toEqual([]);
  });
});

describe('sanitizeWishlist', () => {
  it('garde des identifiants uniques et non vides', () => {
    expect(sanitizeWishlist(['a', 'a', '', 3, null, 'b'])).toEqual(['a', 'b']);
  });
});

describe('parseImport', () => {
  it('relit un export CyberCardex', () => {
    const exported = JSON.stringify(buildExport(sanitizeItems([item]), ['p9']));
    const parsed = parseImport(exported);
    expect(parsed.collection).toHaveLength(1);
    expect(parsed.wishlist).toEqual(['p9']);
    expect(parsed.rejected).toBe(0);
  });

  it('accepte un simple tableau et compte les rejets', () => {
    const parsed = parseImport(JSON.stringify([item, { nope: true }]));
    expect(parsed.collection).toHaveLength(1);
    expect(parsed.rejected).toBe(1);
  });

  it('refuse les fichiers qui ne conviennent pas', () => {
    expect(() => parseImport('{pas du json')).toThrow();
    expect(() => parseImport(JSON.stringify({ app: 'autre', collection: [] }))).toThrow();
    expect(() => parseImport(JSON.stringify({ foo: 1 }))).toThrow();
    expect(() => parseImport(JSON.stringify({ collection: 'x' }))).toThrow();
  });
});

describe('csvCell', () => {
  it('protège les séparateurs et les guillemets', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('dit "oui"')).toBe('"dit ""oui"""');
    expect(csvCell(undefined)).toBe('');
  });

  it('neutralise les formules Excel', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-5')).toBe("'-5");
    expect(csvCell('@SUM')).toBe("'@SUM");
    expect(csvCell('Near Mint')).toBe('Near Mint');
  });
});
