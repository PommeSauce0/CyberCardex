import type { Card } from '../data/types';

/*
 * Liste de deck en texte, relisible par `parseDeck` (et par la plupart des deck builders) :
 *   // Nom du deck
 *   // Légendes (3)
 *   1x Adam Smasher - Ender of Legends
 * Les lignes « // » (nom, sections) sont ignorées à l'import. Les noms anglais servent de
 * référence : ce sont ceux des autres sites.
 */

type ExportLine = { card: Card; quantity: number };

export function deckToText(
  name: string,
  lines: ExportLine[],
  typeLabel: (type: Card['cardType']) => string,
) {
  const out = [`// ${name}`];
  let section: string | undefined;
  for (const line of lines) {
    const type = line.card.cardType;
    if (type !== section) {
      section = type;
      const count = lines
        .filter((item) => item.card.cardType === type)
        .reduce((sum, item) => sum + item.quantity, 0);
      out.push('', `// ${typeLabel(type)} (${count})`);
    }
    const label = line.card.subtitle ? `${line.card.name} - ${line.card.subtitle}` : line.card.name;
    out.push(`${line.quantity}x ${label}`);
  }
  return `${out.join('\n')}\n`;
}

/** Nom de fichier sans accents ni caractères spéciaux : « Mon deck Rouge » → mon-deck-rouge. */
export function deckFileName(name: string) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `cybercardex-deck-${slug || 'sans-nom'}.txt`;
}
