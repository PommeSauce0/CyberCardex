import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCollection } from '../collection/CollectionContext';
import { getPreferredPrintingsBySet, getPrintingById, getSetById, sets } from '../data/catalog';
import { messages } from '../i18n';
import { useT } from '../i18n/useT';

import EdgerunnersScene from './EdgerunnersScene';
import {
  EDGERUNNERS,
  onBraindance,
  onBraindanceMode,
  onCardAdded,
  onEdgerunners,
  onToast,
  showToast,
  type EasterToast,
} from './events';

import './easter.css';

const BRAINDANCE_MODE_SECONDS = 30;

type Toast = EasterToast & { id: number };

let nextId = 1;

/** Séries dont toutes les cartes (toutes langues confondues) sont possédées. */
function useCompletedSets() {
  const { countVariant } = useCollection();
  return useMemo(
    () =>
      sets
        .filter((set) => {
          const printings = getPreferredPrintingsBySet(set.id, 'EN');
          return (
            printings.length > 0 &&
            printings.every((printing) => countVariant(printing.variantKey) > 0)
          );
        })
        .map((set) => set.id),
    [countVariant],
  );
}

/** Couche globale des easter eggs : toasts, Braindance, scène Edgerunners. */
export default function EasterEggLayer() {
  const t = useT();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [braindanceSet, setBraindanceSet] = useState<string>();
  const [modeLeft, setModeLeft] = useState(0);

  useEffect(
    () =>
      onToast((toast) => {
        const id = nextId++;
        setToasts((current) => [...current.slice(-2), { ...toast, id }]);
        window.setTimeout(
          () => setToasts((current) => current.filter((item) => item.id !== id)),
          3800,
        );
      }),
    [],
  );

  // Série complétée pendant la visite → Braindance (pas au démarrage de l'app).
  const completed = useCompletedSets();
  const previousCompleted = useRef<string[] | null>(null);
  useEffect(() => {
    const previous = previousCompleted.current;
    previousCompleted.current = completed;
    const newlyCompleted = previous && completed.find((id) => !previous.includes(id));
    if (newlyCompleted) {
      setBraindanceSet(newlyCompleted);
    }
  }, [completed]);

  useEffect(() => onBraindance(setBraindanceSet), []);

  // Edgerunners : dès qu'on possède les deux promos, Adam tombe sur Rebecca.
  const { countVariant } = useCollection();
  const ownsPromo = (printingId: string) => {
    const printing = getPrintingById(printingId);
    return !!printing && countVariant(printing.variantKey) > 0;
  };
  const edgerunners = ownsPromo(EDGERUNNERS.rebecca) && ownsPromo(EDGERUNNERS.adam);
  const [sceneOn, setSceneOn] = useState(false);
  const previousEdgerunners = useRef<boolean | null>(null);
  useEffect(() => {
    const previous = previousEdgerunners.current;
    previousEdgerunners.current = edgerunners;
    if (previous === false && edgerunners) {
      // Juste après l'ajout, le temps que le bouton réagisse.
      const timer = window.setTimeout(() => setSceneOn(true), 500);
      return () => window.clearTimeout(timer);
    }
  }, [edgerunners]);
  useEffect(() => onEdgerunners(() => setSceneOn(true)), []);
  const closeScene = useCallback(() => setSceneOn(false), []);

  // Mode Braindance : filtre rouge + balayage renforcé, 30 s.
  useEffect(
    () =>
      onBraindanceMode(() => {
        setModeLeft(BRAINDANCE_MODE_SECONDS);
        showToast({
          kicker: 'Braindance',
          title: messages().easter.braindanceTitle,
          text: messages().easter.braindanceText,
          tone: 'red',
        });
      }),
    [],
  );
  const modeOn = modeLeft > 0;
  useEffect(() => {
    if (!modeOn) {
      return;
    }
    document.documentElement.classList.add('braindance-mode');
    const timer = window.setInterval(() => setModeLeft((left) => Math.max(0, left - 1)), 1000);
    return () => {
      window.clearInterval(timer);
      document.documentElement.classList.remove('braindance-mode');
    };
  }, [modeOn]);

  useEffect(
    () =>
      onCardAdded((printingId) => {
        const printing = getPrintingById(printingId);
        if (!printing) {
          return;
        }

        const now = new Date();
        if (now.getHours() === 20 && now.getMinutes() === 17) {
          showToast({
            kicker: '20:17',
            title: 'Right on time, choom',
            text: messages().easter.time2017,
            tone: 'yellow',
          });
        }
      }),
    [],
  );

  const braindance = braindanceSet ? getSetById(braindanceSet) : undefined;
  useEffect(() => {
    if (!braindanceSet) {
      return;
    }
    const timer = window.setTimeout(() => setBraindanceSet(undefined), 5200);
    return () => window.clearTimeout(timer);
  }, [braindanceSet]);

  return (
    <>
      <div className="ee-toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ee-toast ${toast.tone ?? 'yellow'}`}>
            <small>{toast.kicker}</small>
            <strong>{toast.title}</strong>
            {toast.text && <span>{toast.text}</span>}
          </div>
        ))}
      </div>

      {modeOn && (
        <div className="ee-braindance-mode" aria-hidden="true">
          <span className="ee-rec">
            <i /> REC BD · 00:{String(modeLeft).padStart(2, '0')}
          </span>
        </div>
      )}

      {sceneOn && <EdgerunnersScene onDone={closeScene} />}

      {braindance && (
        <button
          type="button"
          className="ee-braindance"
          onClick={() => setBraindanceSet(undefined)}
          aria-label={t.common.close}
        >
          <span className="ee-braindance-kicker">// {t.common.setComplete}</span>
          <strong className="ee-braindance-title" data-text="BRAINDANCE COMPLETE">
            BRAINDANCE COMPLETE
          </strong>
          <span className="ee-braindance-set">
            {braindance.name} — {braindance.edition}
          </span>
          <span className="ee-braindance-bar">
            <i />
          </span>
          <span className="ee-braindance-percent">100 %</span>
        </button>
      )}
    </>
  );
}
