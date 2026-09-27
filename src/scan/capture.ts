import { CAPTURE_MARGIN, CARD_RATIO, type Pixels } from './descriptor';

/** Résolution de travail : largeur de la zone capturée (guide + marge). */
const CAPTURE_WIDTH = 240;
const CAPTURE_HEIGHT = Math.round(CAPTURE_WIDTH / CARD_RATIO);

let canvas: HTMLCanvasElement | undefined;

function getContext() {
  canvas ??= document.createElement('canvas');
  canvas.width = CAPTURE_WIDTH;
  canvas.height = CAPTURE_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D indisponible');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return context;
}

/** Recopie une zone (source) dans l'image de travail, fond noir hors de la source. */
function grab(source: CanvasImageSource, sx: number, sy: number, sw: number, sh: number): Pixels {
  const context = getContext();
  context.fillStyle = '#000';
  context.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  context.drawImage(source, sx, sy, sw, sh, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  const { data } = context.getImageData(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
  return { data, width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT, channels: 4 };
}

/**
 * Capture la zone du guide (plus une marge) dans le flux vidéo.
 * `guide` est le rectangle du guide à l'écran, `video` l'élément affiché en object-fit: cover.
 */
function captureFromVideo(video: HTMLVideoElement, guide: DOMRect): Pixels | undefined {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) {
    return undefined;
  }
  const box = video.getBoundingClientRect();
  const scale = Math.max(box.width / videoWidth, box.height / videoHeight);
  const offsetX = (box.width - videoWidth * scale) / 2;
  const offsetY = (box.height - videoHeight * scale) / 2;

  const marginX = guide.width * CAPTURE_MARGIN;
  const marginY = guide.height * CAPTURE_MARGIN;
  const left = guide.left - box.left - marginX;
  const top = guide.top - box.top - marginY;

  return grab(
    video,
    (left - offsetX) / scale,
    (top - offsetY) / scale,
    (guide.width + 2 * marginX) / scale,
    (guide.height + 2 * marginY) / scale,
  );
}

/**
 * Photo prise dans le guide : la carte n'y est jamais cadrée au pixel près. On l'analyse
 * à plusieurs échelles autour du guide (carte un peu plus proche ou plus loin), et on
 * gardera la meilleure.
 */
export function captureFromVideoScales(
  video: HTMLVideoElement,
  guide: DOMRect,
  scales = [1, 0.9, 1.1],
): Pixels[] {
  return scales.flatMap((scale) => {
    const width = guide.width * scale;
    const height = guide.height * scale;
    const rect = new DOMRect(
      guide.left + (guide.width - width) / 2,
      guide.top + (guide.height - height) / 2,
      width,
      height,
    );
    const pixels = captureFromVideo(video, rect);
    return pixels ? [pixels] : [];
  });
}

/**
 * Photo importée : on ne sait pas où est la carte. On renvoie deux hypothèses —
 * carte qui remplit la photo, ou carte plus petite au centre — et on gardera la meilleure.
 */
export function captureFromImage(image: HTMLImageElement): Pixels[] {
  const { naturalWidth: width, naturalHeight: height } = image;
  // Plus grand rectangle aux proportions d'une carte, centré dans la photo.
  const fitWidth = Math.min(width, height * CARD_RATIO);
  const cx = width / 2;
  const cy = height / 2;

  const hypotheses = [
    // La carte remplit le cadre : le rectangle = le guide, on ajoute la marge autour.
    fitWidth * (1 + 2 * CAPTURE_MARGIN),
    // La carte occupe ~70 % de la photo : le rectangle = guide + marge.
    fitWidth * 0.95,
  ];

  return hypotheses.map((regionWidth) => {
    const regionHeight = regionWidth / CARD_RATIO;
    return grab(image, cx - regionWidth / 2, cy - regionHeight / 2, regionWidth, regionHeight);
  });
}

export const cameraAvailable = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  window.isSecureContext;
