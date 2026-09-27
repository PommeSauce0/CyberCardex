/** Outils sans dépendance de la vérification des mises à jour (testés dans versions.test.ts). */

const parseVersion = (version: string) =>
  version
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);

/** true si `a` est plus récente que `b` (1.10.0 > 1.9.3). */
export function isNewer(a: string, b: string) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) {
      return (x[i] ?? 0) > (y[i] ?? 0);
    }
  }
  return false;
}

/**
 * Texte de la release (Markdown GitHub) → texte simple pour l'app : sans titres « ### »,
 * gras, code ni liens, lignes vides en double retirées.
 */
export function plainNotes(markdown = '') {
  return markdown
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|`)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
