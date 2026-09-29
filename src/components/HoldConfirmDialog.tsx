import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

import { useT } from '../i18n/useT';
import { useBackHandler } from '../native/backButton';

import { useFocusTrap } from './useFocusTrap';

import './HoldConfirmDialog.css';

/** Durée d'appui pour confirmer. */
const HOLD_MS = 1500;

/** Caractères qui remplacent peu à peu le titre pendant l'effet cyberpsychose. */
const NOISE = '#$%&*+/<=>?@[]^_{|}~01';

/** Titre qui se corrompt lettre par lettre, de plus en plus, pendant `active`. */
function useCorrupted(text: string, active: boolean) {
  const [corrupted, setCorrupted] = useState<string>();
  useEffect(() => {
    if (!active) {
      return;
    }
    const start = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / HOLD_MS);
      setCorrupted(
        [...text]
          .map((char) =>
            char !== ' ' && Math.random() < progress * 0.75
              ? NOISE[Math.floor(Math.random() * NOISE.length)]
              : char,
          )
          .join(''),
      );
    }, 70);
    return () => {
      window.clearInterval(timer);
      setCorrupted(undefined);
    };
  }, [text, active]);
  return active && corrupted ? corrupted : text;
}

type Props = {
  /** Rouge : effacer (vider). Vert : action voulue mais irréversible (remplacer, fusionner). */
  tone: 'danger' | 'safe';
  kicker: string;
  title: string;
  /** Paragraphes de la première étape. */
  text: string[];
  /** Seconde étape : texte et bouton à maintenir. */
  hold: { finalText: string; label: string; holding: string };
  /** Sauvegarde JSON avant de confirmer (la fenêtre reste ouverte). */
  onBackup: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Confirmation en deux temps : une alerte qui dit ce qui va changer, puis un bouton à
 * maintenir appuyé. Affichée dans <body> ; le retour Android et Échap la ferment.
 */
export default function HoldConfirmDialog({
  tone,
  kicker,
  title,
  text,
  hold,
  onBackup,
  onConfirm,
  onClose,
}: Props) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [holding, setHolding] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef);
  useBackHandler(onClose);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Confirmation seulement si l'appui dure HOLD_MS ; relâcher avant annule.
  useEffect(() => {
    if (!holding) {
      return;
    }
    const timer = window.setTimeout(onConfirm, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [holding, onConfirm]);

  // Effacement (rouge) : effet « cyberpsychose » qui monte pendant l'appui maintenu.
  const psycho = holding && tone === 'danger';
  const finalTitle = useCorrupted(t.settings.confirmFinalTitle, psycho);

  const holdKey = (event: ReactKeyboardEvent, down: boolean) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) {
        setHolding(down);
      }
    }
  };

  return createPortal(
    <div
      className={`confirm-backdrop ${tone}${psycho ? ' psycho' : ''}`}
      style={{ '--hold': `${HOLD_MS}ms` } as CSSProperties}
      onClick={onClose}
    >
      {psycho && (
        <div className="psycho-overlay" aria-hidden="true">
          <strong data-text={t.settings.psychoWarning}>{t.settings.psychoWarning}</strong>
          <span>{t.settings.psychoMaxTac}</span>
        </div>
      )}
      <div
        ref={dialogRef}
        className={`confirm-dialog ${tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-hazard" aria-hidden="true" />
        <p className="confirm-kicker">{kicker}</p>
        {step === 1 ? (
          <>
            <h2 id="confirm-title" key="title-1">
              {title}
            </h2>
            <div id="confirm-text" className="confirm-text">
              {text.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn" onClick={onBackup}>
                {t.settings.confirmBackup}
              </button>
              {/* Focus sur le choix sans risque. */}
              <button type="button" className="btn" onClick={onClose} autoFocus>
                {t.common.cancel}
              </button>
              <button type="button" className="btn confirm-next" onClick={() => setStep(2)}>
                {t.settings.confirmContinue}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="confirm-title" key="title-2" aria-label={t.settings.confirmFinalTitle}>
              {finalTitle}
            </h2>
            <div id="confirm-text" className="confirm-text">
              <p>{hold.finalText}</p>
            </div>
            <button
              type="button"
              className={`confirm-hold${holding ? ' holding' : ''}`}
              onPointerDown={() => setHolding(true)}
              onPointerUp={() => setHolding(false)}
              onPointerLeave={() => setHolding(false)}
              onPointerCancel={() => setHolding(false)}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => holdKey(event, true)}
              onKeyUp={(event) => holdKey(event, false)}
              onBlur={() => setHolding(false)}
            >
              <span className="confirm-hold-fill" aria-hidden="true" />
              <span className="confirm-hold-label">{holding ? hold.holding : hold.label}</span>
            </button>
            <button type="button" className="btn confirm-cancel" onClick={onClose} autoFocus>
              {t.common.cancel}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
