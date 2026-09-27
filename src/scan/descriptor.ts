/*
 * Empreinte visuelle d'une carte, utilisée par le scanner.
 *
 * Code pur (sans DOM ni Node) : le même calcul sert
 *   - au script `scripts/build-scan-index.mjs` (images officielles → public/scan-index.json),
 *   - au navigateur (image de la caméra → recherche de la carte la plus proche).
 *
 * Principe : on découpe l'illustration et la carte entière en petites cases, on prend la
 * couleur moyenne de chaque case, puis on normalise (moyenne 0, écart-type 1) pour ne pas
 * dépendre de la luminosité ou de la balance des blancs de la photo.
 */

export type Pixels = {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
  /** Nombre d'octets par pixel (4 pour RGBA, 3 pour RGB). */
  channels: number;
};

/** Position supposée de la carte dans l'image (pixels), avec une éventuelle inclinaison. */
export type Window = { x: number; y: number; width: number; height: number; angle?: number };

type Region = { x0: number; y0: number; x1: number; y1: number; cols: number; rows: number };

// Zones relatives à la carte (0 → 1). L'illustration est la partie la plus distinctive.
const ART: Region = { x0: 0.08, y0: 0.14, x1: 0.92, y1: 0.52, cols: 12, rows: 8 };
const FULL: Region = { x0: 0.03, y0: 0.03, x1: 0.97, y1: 0.97, cols: 6, rows: 8 };
const ART_LENGTH = ART.cols * ART.rows * 3;

/** Points échantillonnés par case (SAMPLES × SAMPLES). */
const SAMPLES = 4;

/** Proportions d'une carte (largeur / hauteur). */
export const CARD_RATIO = 733 / 1024;

/** Taille conseillée de l'image passée au calcul (les images officielles y sont réduites). */
export const SAMPLE_WIDTH = 192;
export const SAMPLE_HEIGHT = Math.round(SAMPLE_WIDTH / CARD_RATIO);

function fullWindow(pixels: Pixels): Window {
  return { x: 0, y: 0, width: pixels.width, height: pixels.height };
}

/** Couleur moyenne de chaque case, en suivant l'inclinaison de la fenêtre. */
function cellMeans(pixels: Pixels, region: Region, win: Window) {
  const { data, width, height, channels } = pixels;
  const angle = ((win.angle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = win.x + win.width / 2;
  const cy = win.y + win.height / 2;
  const cellWidth = (region.x1 - region.x0) / region.cols;
  const cellHeight = (region.y1 - region.y0) / region.rows;
  const out: number[] = [];

  for (let row = 0; row < region.rows; row += 1) {
    for (let col = 0; col < region.cols; col += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          // Point dans le repère de la carte (0 → 1), puis dans l'image.
          const u = region.x0 + cellWidth * (col + (sx + 0.5) / SAMPLES);
          const v = region.y0 + cellHeight * (row + (sy + 0.5) / SAMPLES);
          const dx = (u - 0.5) * win.width;
          const dy = (v - 0.5) * win.height;
          const x = Math.min(width - 1, Math.max(0, Math.round(cx + dx * cos - dy * sin)));
          const y = Math.min(height - 1, Math.max(0, Math.round(cy + dx * sin + dy * cos)));
          const i = (y * width + x) * channels;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
      }
      const n = SAMPLES * SAMPLES;
      out.push(r / n, g / n, b / n);
    }
  }
  return out;
}

/** Normalise chaque canal (R, G, B) séparément : insensible à la luminosité et aux dominantes. */
function normalizeChannels(values: number[]) {
  for (let channel = 0; channel < 3; channel += 1) {
    let sum = 0;
    let count = 0;
    for (let i = channel; i < values.length; i += 3) {
      sum += values[i];
      count += 1;
    }
    const mean = sum / count;
    let variance = 0;
    for (let i = channel; i < values.length; i += 3) {
      variance += (values[i] - mean) ** 2;
    }
    const std = Math.sqrt(variance / count) || 1;
    for (let i = channel; i < values.length; i += 3) {
      values[i] = (values[i] - mean) / std;
    }
  }
  return values;
}

/** Empreinte d'une carte occupant `win` (par défaut : toute l'image). */
export function computeDescriptor(pixels: Pixels, win: Window = fullWindow(pixels)) {
  const art = normalizeChannels(cellMeans(pixels, ART, win));
  const full = normalizeChannels(cellMeans(pixels, FULL, win));
  return Float32Array.from([...art, ...full]);
}

/** Similarité entre deux empreintes, de -1 (opposées) à 1 (identiques). L'illustration pèse 2/3. */
function similarity(a: ArrayLike<number>, b: ArrayLike<number>) {
  let art = 0;
  let full = 0;
  for (let i = 0; i < ART_LENGTH; i += 1) {
    art += a[i] * b[i];
  }
  for (let i = ART_LENGTH; i < a.length; i += 1) {
    full += a[i] * b[i];
  }
  return (2 * (art / ART_LENGTH) + full / (a.length - ART_LENGTH)) / 3;
}

// ---------- Recherche dans une photo ----------

/*
 * La photo est prise avec une marge autour du guide : la carte n'y est jamais parfaitement
 * cadrée ni droite. On calcule l'empreinte pour plusieurs tailles, positions et inclinaisons
 * possibles de la carte, et on garde la meilleure correspondance.
 */

/** Marge capturée autour du guide, de chaque côté (fraction de la taille du guide). */
export const CAPTURE_MARGIN = 0.12;

const SCALES = [0.8, 0.88, 0.96, 1.04];
const OFFSETS = [-0.05, 0, 0.05];
const ANGLES = [-4, 4];

function windowsFor(pixels: Pixels, angles: number[]) {
  const guideWidth = pixels.width / (1 + 2 * CAPTURE_MARGIN);
  const guideHeight = pixels.height / (1 + 2 * CAPTURE_MARGIN);
  const windows: Window[] = [];
  for (const angle of angles) {
    for (const scale of SCALES) {
      const width = guideWidth * scale;
      const height = guideHeight * scale;
      for (const dy of OFFSETS) {
        for (const dx of OFFSETS) {
          windows.push({
            x: (pixels.width - width) / 2 + dx * guideWidth,
            y: (pixels.height - height) / 2 + dy * guideHeight,
            width,
            height,
            angle,
          });
        }
      }
    }
  }
  return windows;
}

export type ScanIndexEntry = { id: string; descriptor: Float32Array };

export type ScanMatch = { id: string; score: number };

function bestScore(candidates: Float32Array[], descriptor: Float32Array) {
  let best = -Infinity;
  for (const candidate of candidates) {
    const score = similarity(candidate, descriptor);
    if (score > best) {
      best = score;
    }
  }
  return best;
}

/**
 * Classe les printings de l'index par ressemblance avec la photo.
 * 1re passe : cadrages droits sur tout l'index. 2e passe : cadrages inclinés sur les
 * meilleures pistes uniquement (rapide, même sur téléphone).
 */
export function findMatches(pixels: Pixels, index: ScanIndexEntry[], limit = 12): ScanMatch[] {
  const straight = windowsFor(pixels, [0]).map((win) => computeDescriptor(pixels, win));
  const firstPass = index
    .map((entry) => ({ entry, score: bestScore(straight, entry.descriptor) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);

  const tilted = windowsFor(pixels, ANGLES).map((win) => computeDescriptor(pixels, win));
  return firstPass
    .map(({ entry, score }) => ({
      id: entry.id,
      score: Math.max(score, bestScore(tilted, entry.descriptor)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ---------- Sérialisation compacte (int8 en base64) ----------

const SCALE = 40;

export function encodeDescriptor(descriptor: Float32Array) {
  let binary = '';
  for (const value of descriptor) {
    binary += String.fromCharCode(Math.max(-127, Math.min(127, Math.round(value * SCALE))) & 0xff);
  }
  return btoa(binary);
}

export function decodeDescriptor(encoded: string) {
  const binary = atob(encoded);
  const out = new Float32Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    const byte = binary.charCodeAt(i);
    out[i] = (byte > 127 ? byte - 256 : byte) / SCALE;
  }
  return out;
}
