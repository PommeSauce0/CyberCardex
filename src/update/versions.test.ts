import { describe, expect, it } from 'vitest';

import { isNewer, plainNotes } from './versions';

describe('isNewer', () => {
  it('compare les versions numériquement', () => {
    expect(isNewer('1.0.1', '1.0.0')).toBe(true);
    expect(isNewer('1.10.0', '1.9.3')).toBe(true);
    expect(isNewer('v2.0.0', '1.99.99')).toBe(true);
  });

  it('ne propose ni la même version ni une plus ancienne', () => {
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('v1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('1.0', '1.0.0')).toBe(false);
    expect(isNewer('0.9.9', '1.0.0')).toBe(false);
  });
});

describe('plainNotes', () => {
  it('retire la mise en forme Markdown', () => {
    expect(
      plainNotes(
        '**Unofficial fan project** — ok.\r\n\r\n\r\n### Installation\n1. Télécharge `app.apk` [ici](https://x.y)\n',
      ),
    ).toBe('Unofficial fan project — ok.\n\nInstallation\n1. Télécharge app.apk ici');
  });

  it('accepte une note absente', () => {
    expect(plainNotes()).toBe('');
  });
});
