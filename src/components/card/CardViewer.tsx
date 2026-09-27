import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import { getFinishLabel } from '../../data/labels';
import type { Card, Printing } from '../../data/types';
import { useT } from '../../i18n/useT';
import { useBackHandler } from '../../native/backButton';

/*
 * Visionneuse plein écran : tilt 3D + reflet (souris / doigt), zoom molette,
 * pinch-to-zoom, double-tap, pan, swipe vers le bas pour fermer.
 * Pointer Events + transforms CSS : compatible WebView Capacitor.
 */

type ViewerPoint = { x: number; y: number };

type ViewerGestureState = {
  mode: 'idle' | 'single' | 'pinch';
  startPointer: ViewerPoint;
  startPan: ViewerPoint;
  startZoom: number;
  startDistance: number;
  startMidpoint: ViewerPoint;
  pointerType: string;
  moved: boolean;
};

const ORIGIN: ViewerPoint = { x: 0, y: 0 };
const DEFAULT_LIGHT: ViewerPoint = { x: 50, y: 42 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(first: ViewerPoint, second: ViewerPoint) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function getMidpoint(first: ViewerPoint, second: ViewerPoint): ViewerPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function createGestureState(): ViewerGestureState {
  return {
    mode: 'idle',
    startPointer: ORIGIN,
    startPan: ORIGIN,
    startZoom: 1,
    startDistance: 0,
    startMidpoint: ORIGIN,
    pointerType: '',
    moved: false,
  };
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type CardViewerProps = {
  card: Card;
  printing: Printing;
  onClose: () => void;
};

export default function CardViewer({ card, printing, onClose }: CardViewerProps) {
  // Bouton retour Android : ferme la visionneuse au lieu de quitter la fiche.
  useBackHandler(onClose);
  const t = useT();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<ViewerPoint>(ORIGIN);
  const [rotation, setRotation] = useState<ViewerPoint>(ORIGIN);
  const [light, setLight] = useState<ViewerPoint>(DEFAULT_LIGHT);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pointersRef = useRef(new Map<number, ViewerPoint>());
  const gestureRef = useRef<ViewerGestureState>(createGestureState());
  const zoomRef = useRef(1);
  const panRef = useRef<ViewerPoint>(ORIGIN);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const cardAlt = card.subtitle ? `${card.name}: ${card.subtitle}` : card.name;
  const finishLabel = getFinishLabel(printing.finish);

  // Bloque le scroll de la page, Échap pour fermer, focus sur le bouton fermer.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function resetView() {
    pointersRef.current.clear();
    gestureRef.current = createGestureState();
    zoomRef.current = 1;
    panRef.current = ORIGIN;
    lastTapRef.current = null;
    setZoom(1);
    setPan(ORIGIN);
    setRotation(ORIGIN);
    setLight(DEFAULT_LIGHT);
  }

  function clampPan(point: ViewerPoint, zoomValue: number): ViewerPoint {
    if (zoomValue <= 1.001) {
      return ORIGIN;
    }
    const stage = stageRef.current;
    if (!stage) {
      return point;
    }
    const rect = stage.getBoundingClientRect();
    const maxX = rect.width * 0.43 * (zoomValue - 1);
    const maxY = rect.height * 0.43 * (zoomValue - 1);
    return { x: clamp(point.x, -maxX, maxX), y: clamp(point.y, -maxY, maxY) };
  }

  function setPanSafe(point: ViewerPoint, zoomValue = zoomRef.current) {
    const clamped = clampPan(point, zoomValue);
    panRef.current = clamped;
    setPan(clamped);
  }

  function setZoomSafe(value: number) {
    const nextZoom = clamp(value, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    setPanSafe(panRef.current, nextZoom);
    if (nextZoom > 1.02) {
      setRotation(ORIGIN);
    }
  }

  function toggleZoom() {
    setZoomSafe(zoomRef.current > 1.05 ? 1 : 2.25);
  }

  function updateLight(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }
    setLight({
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }

  function updateTilt(clientX: number, clientY: number) {
    if (prefersReducedMotion() || zoomRef.current > 1.02) {
      setRotation(ORIGIN);
      return;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const normalizedX = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const normalizedY = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    setRotation({ x: normalizedY * -9, y: normalizedX * 11 });
  }

  function startPinch(first: ViewerPoint, second: ViewerPoint, point: ViewerPoint, type: string) {
    gestureRef.current = {
      mode: 'pinch',
      startPointer: point,
      startPan: panRef.current,
      startZoom: zoomRef.current,
      startDistance: Math.max(1, getDistance(first, second)),
      startMidpoint: getMidpoint(first, second),
      pointerType: type,
      moved: true,
    };
    setRotation(ORIGIN);
  }

  function startSingle(point: ViewerPoint, type: string) {
    gestureRef.current = {
      mode: 'single',
      startPointer: point,
      startPan: panRef.current,
      startZoom: zoomRef.current,
      startDistance: 0,
      startMidpoint: point,
      pointerType: type,
      moved: false,
    };
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.stopPropagation();
    setZoomSafe(zoomRef.current + (event.deltaY < 0 ? 1 : -1) * 0.18);
    updateLight(event.clientX, event.clientY);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Certains WebViews peuvent refuser la capture.
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    updateLight(point.x, point.y);

    const points = [...pointersRef.current.values()];
    if (points.length >= 2) {
      startPinch(points[0], points[1], point, event.pointerType);
    } else {
      startSingle(point, event.pointerType);
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      // Survol souris sans clic : tilt + reflet uniquement.
      if (event.pointerType === 'mouse') {
        updateLight(event.clientX, event.clientY);
        updateTilt(event.clientX, event.clientY);
      }
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    updateLight(point.x, point.y);

    const points = [...pointersRef.current.values()];
    const gesture = gestureRef.current;

    if (points.length >= 2) {
      const [first, second] = points;
      if (gesture.mode !== 'pinch') {
        startPinch(first, second, point, event.pointerType);
        return;
      }
      const midpoint = getMidpoint(first, second);
      const nextZoom = clamp(
        gesture.startZoom * (getDistance(first, second) / Math.max(1, gesture.startDistance)),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      setPanSafe(
        {
          x: gesture.startPan.x + midpoint.x - gesture.startMidpoint.x,
          y: gesture.startPan.y + midpoint.y - gesture.startMidpoint.y,
        },
        nextZoom,
      );
      setRotation(ORIGIN);
      return;
    }

    if (gesture.mode !== 'single') {
      return;
    }

    const deltaX = point.x - gesture.startPointer.x;
    const deltaY = point.y - gesture.startPointer.y;
    if (Math.hypot(deltaX, deltaY) > 6) {
      gesture.moved = true;
    }

    if (zoomRef.current > 1.02) {
      setPanSafe({ x: gesture.startPan.x + deltaX, y: gesture.startPan.y + deltaY });
      return;
    }

    updateTilt(point.x, point.y);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointersRef.current.get(event.pointerId) ?? {
      x: event.clientX,
      y: event.clientY,
    };
    const gesture = gestureRef.current;
    const deltaX = point.x - gesture.startPointer.x;
    const deltaY = point.y - gesture.startPointer.y;

    const isTouchTap =
      gesture.mode === 'single' && gesture.pointerType === 'touch' && !gesture.moved;

    const isSwipeDown =
      gesture.mode === 'single' &&
      gesture.pointerType === 'touch' &&
      zoomRef.current <= 1.02 &&
      gesture.moved &&
      deltaY > 120 &&
      Math.abs(deltaY) > Math.abs(deltaX) * 1.15;

    pointersRef.current.delete(event.pointerId);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Même fallback que lors de la capture.
    }

    if (isSwipeDown) {
      onClose();
      return;
    }

    if (isTouchTap) {
      const now = Date.now();
      const previousTap = lastTapRef.current;
      if (
        previousTap &&
        now - previousTap.time < 320 &&
        Math.hypot(point.x - previousTap.x, point.y - previousTap.y) < 36
      ) {
        lastTapRef.current = null;
        toggleZoom();
      } else {
        lastTapRef.current = { time: now, x: point.x, y: point.y };
      }
    }

    const remaining = [...pointersRef.current.values()];
    if (remaining.length === 1) {
      startSingle(remaining[0], event.pointerType);
      return;
    }
    if (remaining.length === 0) {
      gestureRef.current = createGestureState();
      if (event.pointerType !== 'mouse') {
        setRotation(ORIGIN);
      }
      if (zoomRef.current <= 1.02) {
        setPanSafe(ORIGIN, 1);
      }
    }
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) {
      gestureRef.current = createGestureState();
      setRotation(ORIGIN);
    }
  }

  // La molette doit empêcher le scroll : l'écouteur React est passif, on passe par le DOM.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const preventScroll = (event: WheelEvent) => event.preventDefault();
    stage.addEventListener('wheel', preventScroll, { passive: false });
    return () => stage.removeEventListener('wheel', preventScroll);
  }, []);

  const cardStyle = {
    transform:
      `translate3d(${pan.x}px, ${pan.y}px, 0) ` +
      `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
    '--viewer-light-x': `${light.x}%`,
    '--viewer-light-y': `${light.y}%`,
  } as CSSProperties;

  return (
    <div
      className="card-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={t.viewer.label(card.name)}
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        className="card-viewer-close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label={t.viewer.close}
      >
        ×
      </button>

      <div
        ref={stageRef}
        className="card-viewer-stage"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation();
          toggleZoom();
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse' && pointersRef.current.size === 0) {
            setRotation(ORIGIN);
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className={`card-viewer-card${printing.finish === 'Foil' ? ' is-foil' : ''}`}
          style={cardStyle}
        >
          <img src={printing.imageUrl} alt={cardAlt} draggable={false} />
          <span className="card-viewer-shine" aria-hidden="true" />
        </div>
      </div>

      <div className="card-viewer-toolbar" onClick={(event) => event.stopPropagation()}>
        <div className="card-viewer-caption">
          <strong>{card.name}</strong>
          <span>
            #{printing.number} • {finishLabel}
          </span>
        </div>

        <div className="card-viewer-help">
          <span className="card-viewer-help-desktop">{t.viewer.helpDesktop}</span>
          <span className="card-viewer-help-touch">{t.viewer.helpTouch}</span>
        </div>

        <div className="card-viewer-zoom-controls" aria-label={t.viewer.zoomControls}>
          <button
            type="button"
            onClick={() => setZoomSafe(zoomRef.current - 0.25)}
            disabled={zoom <= 1.001}
            aria-label={t.viewer.zoomOut}
          >
            −
          </button>
          <button
            type="button"
            className="card-viewer-reset"
            onClick={resetView}
            aria-label={t.viewer.reset}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoomSafe(zoomRef.current + 0.25)}
            disabled={zoom >= 3.999}
            aria-label={t.viewer.zoomIn}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
