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

/** Position de la photo sous le cadre : centre (px de la visée), échelle et angle (radians). */
export type ImageView = { cx: number; cy: number; scale: number; angle: number };

/**
 * Photo recadrée (et éventuellement tournée) à la main : on redessine la zone du cadre telle
 * qu'on la voit à l'écran. Comme pour la caméra, on ajoute la marge et on essaie quelques
 * échelles autour du cadre.
 */
export function captureFromImageView(
  image: HTMLImageElement,
  view: ImageView,
  frame: { left: number; top: number; width: number; height: number },
  scales = [1, 0.92, 1.08],
): Pixels[] {
  return scales.map((scale) => {
    const width = frame.width * scale * (1 + 2 * CAPTURE_MARGIN);
    const left = frame.left + frame.width / 2 - width / 2;
    const top = frame.top + frame.height / 2 - width / CARD_RATIO / 2;

    const context = getContext();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#000';
    context.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    // Visée → image de travail, puis la même transformation que la photo à l'écran.
    const ratio = CAPTURE_WIDTH / width;
    context.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio);
    context.translate(view.cx, view.cy);
    context.rotate(view.angle);
    context.scale(view.scale, view.scale);
    context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    context.setTransform(1, 0, 0, 1, 0, 0);

    const { data } = context.getImageData(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    return { data, width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT, channels: 4 };
  });
}

export const cameraAvailable = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia &&
  window.isSecureContext;
