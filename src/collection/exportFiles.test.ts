import { describe, expect, it } from 'vitest';

import { localDate } from './exportFiles';

describe('localDate', () => {
  it("donne la date à l'heure locale, même juste après minuit", () => {
    expect(localDate(new Date(2026, 8, 29, 0, 30))).toBe('2026-09-29');
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
