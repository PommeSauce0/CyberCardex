/*
 * Construit l'index du scanner : une empreinte visuelle par printing.
 *
 *   npm run build-scan-index
 *
 * Lit src/data/printings.json + public/cards/**.webp, écrit public/scan-index.json.
 * À relancer après chaque sync qui ajoute des cartes (sync-catalog le fait tout seul).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import {
  computeDescriptor,
  encodeDescriptor,
  SAMPLE_HEIGHT,
  SAMPLE_WIDTH,
} from '../src/scan/descriptor.ts';

export async function describeImage(file) {
  const { data, info } = await sharp(file)
    .resize(SAMPLE_WIDTH, SAMPLE_HEIGHT, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return computeDescriptor({ data, width: info.width, height: info.height, channels: 3 });
}

/** Empreintes de toutes les images ; renvoie leur nombre et les images illisibles. */
export async function buildScanIndex() {
  const printings = JSON.parse(await readFile(path.resolve('src/data/printings.json'), 'utf8'));
  const entries = [];
  const failed = [];
  for (const printing of printings) {
    if (printing.status === 'stale') {
      continue;
    }
    const file = path.resolve('public', printing.imageUrl.replace(/^\//, ''));
    try {
      entries.push([printing.id, encodeDescriptor(await describeImage(file))]);
    } catch (error) {
      failed.push(`${printing.imageUrl} (${error.message})`);
    }
  }
  await writeFile(path.resolve('public/scan-index.json'), JSON.stringify({ version: 1, entries }));
  return { count: entries.length, failed };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const { count, failed } = await buildScanIndex();
  console.log(`✓ public/scan-index.json : ${count} empreintes`);
  if (failed.length) {
    console.error(`✗ ${failed.length} image(s) illisible(s), absentes du scanner :`);
    failed.forEach((line) => console.error(`  ${line}`));
    process.exit(1);
  }
}
