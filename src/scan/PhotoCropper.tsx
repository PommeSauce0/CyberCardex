import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import { useT } from '../i18n/useT';
import { useBackHandler } from '../native/backButton';

import { captureFromImageView, type ImageView } from './capture';
import { CARD_RATIO, type Pixels } from './descriptor';

type Props = {
  image: HTMLImageElement;
  /** Message d'échec de la dernière analyse (on reste sur le recadrage pour réessayer). */
  error?: string;
  onAnalyse: (pixels: Pixels[]) => void;
  /** On touche à la photo après un échec : le message d'erreur peut disparaître. */
  onAdjust: () => void;
  onCancel: () => void;
};

type Frame = { left: number; top: number; width: number; height: number };

/** Cadre de la visée, calculé comme dans le CSS de `.scan-guide` (84 % de haut, 88 % max de large). */
function guideRect(width: number, height: number): Frame {
  let guideHeight = height * 0.84;
  let guideWidth = guideHeight * CARD_RATIO;
  if (guideWidth > width * 0.88) {
    guideWidth = width * 0.88;
    guideHeight = guideWidth / CARD_RATIO;
  }
  return {
    left: (width - guideWidth) / 2,
    top: (height - guideHeight) / 2,
    width: guideWidth,
    height: guideHeight,
  };
}

/** Icônes des commandes : annuler, analyser (cadre de visée), quart de tour. */
function CropIcon({ kind }: { kind: 'close' | 'scan' | 'rotate' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'rotate' && (
        <>
          <path d="M20 11a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v5h-5" />
        </>
      )}
      {kind === 'close' && <path d="M6 6l12 12M18 6 6 18" />}
      {kind === 'scan' && <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16" />}
    </svg>
  );
}

/** Tourne le point (x, y) de `angle` autour de l'origine. */
const rotate = (x: number, y: number, angle: number) => ({
  x: x * Math.cos(angle) - y * Math.sin(angle),
  y: x * Math.sin(angle) + y * Math.cos(angle),
});

/**
 * Photo importée : on place soi-même la carte dans le cadre avant l'analyse (glisser pour
 * déplacer, pincer pour zoomer, tourner à deux doigts ou d'un quart de tour), comme pour
 * recadrer une photo de profil. La photo couvre toujours tout le cadre.
 */
export default function PhotoCropper({ image, error, onAnalyse, onAdjust, onCancel }: Props) {
  const t = useT();
  // Retour Android : on abandonne le recadrage (sans quitter la page du scanner).
  useBackHandler(onCancel);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef<Frame>(undefined);
  const [view, setView] = useState<ImageView>();
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const { naturalWidth: imageWidth, naturalHeight: imageHeight } = image;

  /** Plus petite échelle pour que la photo tournée de `angle` couvre le cadre. */
  function minScale(angle: number) {
    const box = frame.current!;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    // Demi-dimensions du cadre vues dans le repère de la photo.
    const halfX = (box.width / 2) * cos + (box.height / 2) * sin;
    const halfY = (box.width / 2) * sin + (box.height / 2) * cos;
    return Math.max((2 * halfX) / imageWidth, (2 * halfY) / imageHeight);
  }

  /** Vrai si les 4 coins du cadre tombent dans la photo. */
  function covers(next: ImageView) {
    const box = frame.current!;
    const corners = [
      [box.left, box.top],
      [box.left + box.width, box.top],
      [box.left, box.top + box.height],
      [box.left + box.width, box.top + box.height],
    ];
    return corners.every(([x, y]) => {
      const point = rotate(x - next.cx, y - next.cy, -next.angle);
      return (
        Math.abs(point.x / next.scale) <= imageWidth / 2 + 0.5 &&
        Math.abs(point.y / next.scale) <= imageHeight / 2 + 0.5
      );
    });
  }

  /**
   * Rend la vue valide : échelle au moins égale au minimum pour cet angle (et 8× au plus),
   * puis, si un bord du cadre dépasse encore, on ramène la photo vers le centre du cadre
   * juste assez pour le couvrir.
   */
  function resolve(next: ImageView): ImageView {
    const box = frame.current;
    if (!box) {
      return next;
    }
    const least = minScale(next.angle);
    const scale = Math.min(least * 8, Math.max(least, next.scale));
    const scaled = { ...next, scale };
    if (covers(scaled)) {
      return scaled;
    }
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const toward = (share: number) => ({
      ...scaled,
      cx: scaled.cx + (center.x - scaled.cx) * share,
      cy: scaled.cy + (center.y - scaled.cy) * share,
    });
    let low = 0;
    let high = 1;
    for (let step = 0; step < 20; step += 1) {
      const middle = (low + high) / 2;
      if (covers(toward(middle))) {
        high = middle;
      } else {
        low = middle;
      }
    }
    return toward(high);
  }

  /** Déplacement : on glisse le long d'un bord au lieu de s'y bloquer. */
  function pan(current: ImageView, dx: number, dy: number) {
    const candidate = [
      { ...current, cx: current.cx + dx, cy: current.cy + dy },
      { ...current, cx: current.cx + dx },
      { ...current, cy: current.cy + dy },
    ].find(covers);
    if (candidate) {
      setView(candidate);
    }
  }

  /** Cadrage de départ : la photo couvre le cadre, centrée. */
  function attachViewport(node: HTMLDivElement | null) {
    viewportRef.current = node;
    if (!node || view) {
      return;
    }
    const { width, height } = node.getBoundingClientRect();
    frame.current = guideRect(width, height);
    setView({ cx: width / 2, cy: height / 2, scale: minScale(0), angle: 0 });
  }

  // Écran tourné ou redimensionné : le cadre change, la photo suit (même partie de la photo
  // dans le cadre), sinon l'affichage et la zone analysée ne coïncideraient plus.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(() => {
      const before = frame.current;
      const { width, height } = node.getBoundingClientRect();
      if (!before || width === 0 || height === 0) {
        return;
      }
      const after = guideRect(width, height);
      if (after.left === before.left && after.top === before.top && after.width === before.width) {
        return;
      }
      frame.current = after;
      const ratio = after.width / before.width;
      setView((current) =>
        current
          ? resolve({
              ...current,
              cx:
                after.left +
                after.width / 2 +
                (current.cx - before.left - before.width / 2) * ratio,
              cy:
                after.top +
                after.height / 2 +
                (current.cy - before.top - before.height / 2) * ratio,
              scale: current.scale * ratio,
            })
          : current,
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
    // resolve ne lit que frame.current et les dimensions de la photo : un seul observateur suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Zoom et rotation autour d'un point de la visée (le point sous les doigts ne bouge pas). */
  function transformAt(
    current: ImageView,
    factor: number,
    turn: number,
    px: number,
    py: number,
  ): ImageView {
    const offset = rotate(current.cx - px, current.cy - py, turn);
    return {
      cx: px + offset.x * factor,
      cy: py + offset.y * factor,
      scale: current.scale * factor,
      angle: current.angle + turn,
    };
  }

  const local = (event: { clientX: number; clientY: number }) => {
    const box = viewportRef.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    onAdjust();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !view) {
      return;
    }
    const point = local(event);
    const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId);
    pointers.current.set(event.pointerId, point);

    if (others.length === 0) {
      pan(view, point.x - previous.x, point.y - previous.y);
      return;
    }
    // Deux doigts : écartement = zoom, angle entre les doigts = rotation, milieu = déplacement.
    const other = others[0][1];
    const before = Math.hypot(previous.x - other.x, previous.y - other.y);
    const after = Math.hypot(point.x - other.x, point.y - other.y);
    const turn =
      Math.atan2(point.y - other.y, point.x - other.x) -
      Math.atan2(previous.y - other.y, previous.x - other.x);
    const midBefore = { x: (previous.x + other.x) / 2, y: (previous.y + other.y) / 2 };
    const midAfter = { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 };
    const moved = transformAt(
      view,
      before > 0 ? after / before : 1,
      turn,
      midBefore.x,
      midBefore.y,
    );
    setView(
      resolve({
        ...moved,
        cx: moved.cx + midAfter.x - midBefore.x,
        cy: moved.cy + midAfter.y - midBefore.y,
      }),
    );
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!view) {
      return;
    }
    const point = local(event);
    onAdjust();
    setView(resolve(transformAt(view, event.deltaY < 0 ? 1.1 : 1 / 1.1, 0, point.x, point.y)));
  }

  function zoomButton(factor: number) {
    const box = viewportRef.current?.getBoundingClientRect();
    if (view && box) {
      onAdjust();
      setView(resolve(transformAt(view, factor, 0, box.width / 2, box.height / 2)));
    }
  }

  /** Quart de tour autour du cadre ; si la photo était au plus serré, elle le reste. */
  function quarterTurn() {
    const box = frame.current;
    if (!view || !box) {
      return;
    }
    onAdjust();
    const tight = view.scale <= minScale(view.angle) * 1.001;
    const turned = transformAt(
      view,
      1,
      Math.PI / 2,
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    setView(resolve(tight ? { ...turned, scale: minScale(turned.angle) } : turned));
  }

  function analyse() {
    if (view && frame.current) {
      onAnalyse(captureFromImageView(image, view, frame.current));
    }
  }

  return (
    <div className="scan-camera scan-crop">
      <div
        ref={attachViewport}
        className="scan-viewport scan-crop-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onWheel={onWheel}
      >
        {view && (
          <img
            src={image.src}
            alt=""
            draggable={false}
            style={{
              width: imageWidth,
              height: imageHeight,
              transform: `translate(${view.cx}px, ${view.cy}px) rotate(${view.angle}rad) scale(${view.scale}) translate(${-imageWidth / 2}px, ${-imageHeight / 2}px)`,
            }}
          />
        )}
        <div className={`scan-guide ${error ? 'error' : 'idle'}`} aria-hidden="true" />

        {/* Zoom posé sur la photo, comme sur une carte (le pincement marche aussi). */}
        <div className="scan-crop-zoom" onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            aria-label={t.scan.zoomIn}
            title={t.scan.zoomIn}
            onClick={() => zoomButton(1.25)}
          >
            +
          </button>
          <button
            type="button"
            aria-label={t.scan.zoomOut}
            title={t.scan.zoomOut}
            onClick={() => zoomButton(1 / 1.25)}
          >
            −
          </button>
        </div>
      </div>

      <p className={`scan-status ${error ? 'error' : 'idle'}`} role="status">
        {error ?? t.scan.cropHint}
      </p>

      {/* Même disposition que la caméra : Annuler — gros bouton Analyser — Tourner. */}
      <div className="scan-controls">
        <button type="button" className="scan-icon-button" onClick={onCancel}>
          <CropIcon kind="close" />
          <span>{t.common.cancel}</span>
        </button>
        <button
          type="button"
          className="scan-shutter scan-analyse"
          disabled={!view}
          aria-label={t.scan.analyse}
          title={t.scan.analyse}
          onClick={analyse}
        >
          <span>
            <CropIcon kind="scan" />
          </span>
        </button>
        <button type="button" className="scan-icon-button" onClick={quarterTurn}>
          <CropIcon kind="rotate" />
          <span>{t.scan.rotateShort}</span>
        </button>
      </div>
    </div>
  );
}
