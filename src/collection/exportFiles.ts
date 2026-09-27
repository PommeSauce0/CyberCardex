import { Capacitor } from '@capacitor/core';

import { getCardById, getPrintingById, getSetById } from '../data/catalog';
import { getFinishLabel } from '../data/labels';
import type { CollectionItem } from '../data/types';
import { messages } from '../i18n';

import { buildExport } from './collectionData';

/*
 * Navigateur : téléchargement classique.
 * Application Android (Capacitor) : la WebView ignore `download`, donc on écrit le fichier
 * dans le cache puis on ouvre le partage Android (Drive, mail, Fichiers…).
 */
export async function downloadFile(filename: string, content: string, type: string) {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({ title: filename, files: [uri] });
    } catch {
      // Partage annulé par l'utilisateur : rien à faire.
    }
    return;
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
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function exportJson(items: CollectionItem[], wishlist: string[]) {
  return downloadFile(
    `cybercardex-sauvegarde-${today()}.json`,
    JSON.stringify(buildExport(items, wishlist), null, 2),
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
      item.createdAt.slice(0, 10),
      item.printingId,
    ];
  });

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(text.separator)).join('\r\n');
  const bom = String.fromCharCode(0xfeff); // Pour qu'Excel lise l'UTF-8
  return downloadFile(`cybercardex-collection-${today()}.csv`, bom + csv, 'text/csv;charset=utf-8');
}
