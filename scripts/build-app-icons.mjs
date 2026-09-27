/*
 * Génère les visuels sources de l'app Android dans assets/ (icône + écran de démarrage)
 * et les icônes du site dans public/ (favicon),
 * ensuite déclinés en toutes tailles par @capacitor/assets :
 *   npm run app-icons
 *
 * Le logo est dessiné en formes géométriques (pas de police) : plaque jaune aux coins
 * biseautés façon HUD Night City, « CC » anguleux en noir, liseré cyan et rouge.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

const BG = '#06070a';
const YELLOW = '#fcee0a';
const CYAN = '#00f0ff';
const RED = '#ff003c';
const INK = '#050505';

/** Rectangle aux coins haut-droit et bas-gauche coupés. */
function bevelRect(x, y, w, h, cut) {
  return `${x},${y} ${x + w - cut},${y} ${x + w},${y + cut} ${x + w},${y + h} ${x + cut},${y + h} ${x},${y + h - cut}`;
}

/** Lettre C anguleuse : boîte (x, y, w, h), épaisseur t, biseau b à gauche. */
function letterC(x, y, w, h, t, b) {
  const x1 = x + w;
  const y1 = y + h;
  const bi = Math.max(b - t * 0.6, 0);
  return [
    [x + b, y],
    [x1, y],
    [x1, y + t],
    [x + t + bi, y + t],
    [x + t, y + t + bi],
    [x + t, y1 - t - bi],
    [x + t + bi, y1 - t],
    [x1, y1 - t],
    [x1, y1],
    [x + b, y1],
    [x, y1 - b],
    [x, y + b],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(' ');
}

/** Le logo, centré dans un carré de `size` px, occupant la fraction `scale`. */
function logo(size, scale) {
  const plate = size * scale;
  const px = (size - plate) / 2;
  const py = (size - plate) / 2;
  const u = plate / 100; // unité : 1 % de la plaque

  const letterW = 30 * u;
  const letterH = 46 * u;
  const gap = 6 * u;
  const lx = px + (plate - (letterW * 2 + gap)) / 2;
  const ly = py + (plate - letterH) / 2 - 2 * u;

  return `
    <polygon points="${bevelRect(px, py, plate, plate, 16 * u)}" fill="${YELLOW}" />
    <polygon points="${letterC(lx, ly, letterW, letterH, 9 * u, 9 * u)}" fill="${INK}" />
    <polygon points="${letterC(lx + letterW + gap, ly, letterW, letterH, 9 * u, 9 * u)}" fill="${INK}" />
    <rect x="${px + 12 * u}" y="${py + 82 * u}" width="${46 * u}" height="${3.2 * u}" fill="${INK}" />
    <rect x="${px + 62 * u}" y="${py + 82 * u}" width="${10 * u}" height="${3.2 * u}" fill="${RED}" />
    <rect x="${px + 16 * u}" y="${py + 8 * u}" width="${22 * u}" height="${2.4 * u}" fill="${INK}" opacity="0.55" />
  `;
}

/** Fond sombre avec grille légère et halo cyan, comme l'app. */
function background(size) {
  const step = size / 12;
  const lines = Array.from({ length: 13 }, (_, i) => i * step)
    .map(
      (p) =>
        `<line x1="${p}" y1="0" x2="${p}" y2="${size}" /><line x1="0" y1="${p}" x2="${size}" y2="${p}" />`,
    )
    .join('');
  return `
    <rect width="${size}" height="${size}" fill="${BG}" />
    <radialGradient id="glow" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="${CYAN}" stop-opacity="0.16" />
      <stop offset="1" stop-color="${CYAN}" stop-opacity="0" />
    </radialGradient>
    <rect width="${size}" height="${size}" fill="url(#glow)" />
    <g stroke="#ffffff" stroke-opacity="0.045" stroke-width="${size / 400}">${lines}</g>
  `;
}

const svg = (size, body) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`,
  );

mkdirSync('assets', { recursive: true });

// Icône classique (anciens Android) : fond + logo.
await sharp(svg(1024, background(1024) + logo(1024, 0.62)))
  .png()
  .toFile('assets/icon-only.png');
// Icône adaptative : le système découpe le cercle / carré arrondi ; logo dans la zone sûre.
await sharp(svg(1024, logo(1024, 0.5)))
  .png()
  .toFile('assets/icon-foreground.png');
await sharp(svg(1024, background(1024)))
  .png()
  .toFile('assets/icon-background.png');
// Écran de démarrage : logo seul, centré, sur fond sombre.
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp(svg(2732, background(2732) + logo(2732, 0.2)))
    .png()
    .toFile(`assets/${name}`);
}

// Site web : même logo pour l'onglet du navigateur et le raccourci d'écran d'accueil.
// SVG (net à toutes les tailles) + PNG pour les navigateurs et iOS qui ne lisent pas le SVG.
writeFileSync('public/favicon.svg', svg(64, logo(64, 0.94)));
await sharp(svg(512, logo(512, 0.94)))
  .resize(32)
  .png()
  .toFile('public/favicon-32.png');
await sharp(svg(180, background(180) + logo(180, 0.7)))
  .png()
  .toFile('public/apple-touch-icon.png');

console.log('✓ assets/ : icon-only, icon-foreground, icon-background, splash, splash-dark');
console.log('✓ public/ : favicon.svg, favicon-32.png, apple-touch-icon.png');
