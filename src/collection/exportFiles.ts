import { Capacitor, registerPlugin } from '@capacitor/core';

import { getCardById, getPrintingById, getSetById } from '../data/catalog';
import { getFinishLabel } from '../data/labels';
import type { CollectionItem } from '../data/types';
import type { SavedDeck } from '../decks/deckStorage';
import { messages } from '../i18n';

import { buildExport } from './collectionData';

/** « Enregistrer sous » d'Android (plugin maison FileSaverPlugin.java). */
const FileSaver = registerPlugin<{
  save(options: {
    filename: string;
    mimeType: string;
    data: string;
  }): Promise<{ saved: boolean; name?: string }>;
}>('FileSaver');

/** Résultat d'un export : nom du fichier enregistré, ou undefined si annulé. */
export type SavedFile = { name: string } | undefined;

/*
 * Navigateur : téléchargement classique.
 * Application Android : écran « Enregistrer sous » du système (dossier et nom au choix).
 */
export async function downloadFile(
  filename: string,
  content: string,
  type: string,
): Promise<SavedFile> {
  if (Capacitor.isNativePlatform()) {
    const { saved, name } = await FileSaver.save({
      filename,
      data: content,
      mimeType: type.split(';')[0],
    });
    return saved ? { name: name ?? filename } : undefined;
  }

  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { name: filename };
}

/** AAAA-MM-JJ à l'heure du téléphone (toISOString donnerait la veille après minuit en France). */
export function localDate(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Sauvegarde complète : collection, wishlist, decks et réglages. */
export function exportJson(
  items: CollectionItem[],
  wishlist: string[],
  decks: SavedDeck[],
  settings: unknown,
) {
  return downloadFile(
    `cybercardex-sauvegarde-${localDate()}.json`,
    JSON.stringify(buildExport(items, wishlist, decks, settings), null, 2),
    'application/json',
  );
}

export function csvCell(value: unknown) {
  let text = value === undefined || value === null ? '' : String(value);
  // Excel exécuterait une note commençant par = + - @ comme une formule.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return /[;,"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV pour Excel dans la langue de l'interface (séparateur et décimale adaptés), BOM UTF-8. */
export function exportCsv(items: CollectionItem[]) {
  const { csv: text } = messages();
  const header = text.header;

  const rows = items.map((item) => {
    const printing = getPrintingById(item.printingId);
    const card = printing && getCardById(printing.cardId);
    const set = printing && getSetById(printing.setId);
    return [
      card?.name ?? text.unknownCard,
      card?.subtitle,
      set?.name,
      set?.edition,
      printing?.number,
      printing?.language,
      printing?.rarity,
      printing && getFinishLabel(printing.finish),
      printing?.treatments?.join(', '),
      item.condition,
      item.graded ? text.yes : text.no,
      item.gradingCompany,
      item.grade?.toString().replace('.', text.decimal),
      item.purchasePrice?.toFixed(2).replace('.', text.decimal),
      item.notes,
      localDate(new Date(item.createdAt)),
      item.printingId,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(text.separator)).join('\r\n');
  const bom = String.fromCharCode(0xfeff); // Pour qu'Excel lise l'UTF-8
  return downloadFile(
    `cybercardex-collection-${localDate()}.csv`,
    bom + csv,
    'text/csv;charset=utf-8',
  );
}
