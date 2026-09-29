import { describe, expect, it } from 'vitest';

import embedded from './cardmarket.json';
import { isPriceData, newest, type PriceData } from './livePrices';

const data = (updatedAt: string): PriceData => ({
  updatedAt,
  products: { a: { id: 1, trend: 2.5, low: 1 } },
});

describe('isPriceData', () => {
  it('accepte le fichier livré avec l’app', () => {
    expect(isPriceData(embedded)).toBe(true);
  });

  it('refuse un contenu inattendu', () => {
    expect(isPriceData(null)).toBe(false);
    expect(isPriceData({ updatedAt: 'pas une date', products: {} })).toBe(false);
    expect(isPriceData({ updatedAt: '2026-09-28T02:48:17+0200' })).toBe(false);
    expect(
      isPriceData({ updatedAt: '2026-09-28T02:48:17+0200', products: { a: { id: '1' } } }),
    ).toBe(false);
    expect(
      isPriceData({
        updatedAt: '2026-09-28T02:48:17+0200',
        products: { a: { id: 1, trend: 'cher' } },
      }),
    ).toBe(false);
  });
});

describe('newest', () => {
  it('garde les prix les plus récents', () => {
    const old = data('2026-09-27T02:44:58+0200');
    const fresh = data('2026-09-28T02:48:17+0200');
    expect(newest(old, fresh)).toBe(fresh);
    expect(newest(fresh, old)).toBe(fresh);
  });

  it('sans autre source (ou à égalité), garde la première', () => {
    const a = data('2026-09-28T02:48:17+0200');
    expect(newest(a)).toBe(a);
    expect(newest(a, data('2026-09-28T02:48:17+0200'))).toBe(a);
  });
});
