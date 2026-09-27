/*
 * Allège les images embarquées dans l'APK (dist/cards et dist/thumbs), sans toucher
 * aux originaux de public/ : le site web garde la qualité maximale.
 *
 * Appelé par `npm run apk` entre le build Vite et `cap sync`. Les images recompressées
 * sont gardées en cache dans tmp/apk-images/ : seules les nouvelles sont retraitées.
 */
import { cpus } from 'node:os';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

// Sous Windows, sharp garde les fichiers ouverts en cache : on ne pourrait plus les écraser.
sharp.cache(false);

/** Qualité WebP : 75 reste net en pleine page et en zoom, pour ~45 % de poids en moins. */
const TARGETS = [
  { dir: 'cards', quality: 75 },
  { dir: 'thumbs', quality: 70 },
];
const CACHE = path.resolve('tmp/apk-images');

function listWebp(dir) {
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name.endsWith('.webp')) {
        files.push(full);
      }
    }
  };
  if (existsSync(dir)) {
    walk(dir);
  }
  return files;
}

async function pool(items, worker, size = Math.max(2, cpus().length)) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        await worker(items[next++]);
      }
    }),
  );
}

let before = 0;
let after = 0;
let fresh = 0;

for (const { dir, quality } of TARGETS) {
  const root = path.resolve('dist', dir);
  const files = listWebp(root);

  await pool(files, async (file) => {
    const relative = path.relative(root, file);
    const cached = path.join(CACHE, `${dir}-q${quality}`, relative);
    const source = statSync(file);
    before += source.size;
    // La copie de dist/ est neuve à chaque build : on compare à l'original de public/.
    const original = path.resolve('public', dir, relative);
    const originalTime = existsSync(original) ? statSync(original).mtimeMs : source.mtimeMs;

    // Cache valable tant que l'original n'a pas été modifié depuis.
    if (!existsSync(cached) || statSync(cached).mtimeMs < originalTime) {
      mkdirSync(path.dirname(cached), { recursive: true });
      const output = await sharp(readFileSync(file)).webp({ quality, effort: 5 }).toBuffer();
      // Ne jamais grossir une image déjà très compressée.
      if (output.length < source.size) {
        writeFileSync(cached, output);
      } else {
        copyFileSync(file, cached);
      }
      fresh++;
    }

    copyFileSync(cached, file);
    after += statSync(file).size;
  });
}

const mb = (bytes) => `${Math.round(bytes / 1048576)} Mo`;
console.log(
  `✓ Images de l'APK : ${mb(before)} → ${mb(after)} (${fresh} recompressées, le reste depuis le cache)`,
);
