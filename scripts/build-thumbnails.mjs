/*
 * Génère les miniatures des cartes (grilles, classeur, listes) : 400 px de large, ~25 Ko,
 * au lieu des images 733×1024 (~120 Ko, ~3 Mo une fois décodées). Indispensable sur mobile.
 *
 *   npm run build-thumbnails
 *
 * Lit public/cards/<série>/<id>.webp, écrit public/thumbs/<série>/<id>.webp.
 * Ne refait que les miniatures absentes ou plus anciennes que l'image source.
 * sync-catalog le lance tout seul après --apply.
 */
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

export const THUMB_WIDTH = 400;

export async function buildThumbnails({ force = false } = {}) {
  const printings = JSON.parse(await readFile(path.resolve('src/data/printings.json'), 'utf8'));
  let built = 0;
  let failed = 0;

  for (const printing of printings) {
    const relative = printing.imageUrl.replace(/^\/cards\//, '');
    const source = path.resolve('public/cards', relative);
    const target = path.resolve('public/thumbs', relative);
    if (!existsSync(source)) {
      failed += 1;
      continue;
    }
    if (!force && existsSync(target) && statSync(target).mtimeMs >= statSync(source).mtimeMs) {
      continue;
    }
    try {
      await mkdir(path.dirname(target), { recursive: true });
      await sharp(source).resize({ width: THUMB_WIDTH }).webp({ quality: 72 }).toFile(target);
      built += 1;
    } catch (error) {
      failed += 1;
      console.warn(`Miniature impossible : ${printing.imageUrl} (${error.message})`);
    }
  }

  return { built, failed, total: printings.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { built, failed, total } = await buildThumbnails({
    force: process.argv.includes('--force'),
  });
  console.log(`✓ Miniatures : ${built} générée(s), ${failed} échec(s), ${total} printings.`);
  if (failed) {
    process.exitCode = 1;
  }
}
