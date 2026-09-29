import { describe, expect, it } from 'vitest';

import { sanitizeItems } from '../collection/collectionData';

import { wasNormalized } from './storage';

const item = {
  id: 'a',
  printingId: 'p1',
  condition: 'Near Mint',
  graded: false,
  createdAt: '2026-09-01T10:00:00.000Z',
};

describe('wasNormalized', () => {
  it("ne déclenche pas de copie quand rien n'a changé, quel que soit l'ordre des champs", () => {
    const reordered = [
      {
        createdAt: item.createdAt,
        graded: item.graded,
        condition: item.condition,
        printingId: item.printingId,
        id: item.id,
      },
    ];
    expect(wasNormalized(reordered, sanitizeItems(reordered))).toBe(false);
  });

  it('détecte un champ corrigé en silence', () => {
    const raw = [{ ...item, condition: 'Cassée' }];
    expect(wasNormalized(raw, sanitizeItems(raw))).toBe(true);
  });

  it('détecte une entrée rejetée ou une donnée qui n’est pas une liste', () => {
    const raw = [item, null];
    expect(wasNormalized(raw, sanitizeItems(raw))).toBe(true);
    expect(wasNormalized({ oups: 1 }, sanitizeItems({ oups: 1 }))).toBe(true);
  });

  it('ignore une clé absente', () => {
    expect(wasNormalized(undefined, [])).toBe(false);
  });
});

describe('writeJson', () => {
  it("prévient l'app quand l'écriture échoue (stockage plein)", async () => {
    const { vi } = await import('vitest');
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new DOMException('Quota dépassé', 'QuotaExceededError');
      },
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { onStorageFailure, storageWriteFailed, writeJson } = await import('./storage');
    const listener = vi.fn();
    const off = onStorageFailure(listener);
    writeJson('cybercardex.test', [1]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storageWriteFailed()).toBe(true);
    off();
    errors.mockRestore();
    vi.unstubAllGlobals();
  });
});
