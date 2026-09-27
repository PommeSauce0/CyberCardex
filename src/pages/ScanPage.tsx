import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { useQuickAdd } from '../collection/useQuickAdd';
import { CloseIcon, ImageIcon, ScanIcon } from '../components/Icons';
import QuickAddBar from '../components/QuickAddBar';
import { getCardById, getPrintingById, getSetById, getThumbUrl } from '../data/catalog';
import type { Printing } from '../data/types';
import { showToast } from '../easter/events';
import { useT } from '../i18n/useT';
import { cameraAvailable, captureFromImage, captureFromVideoScales } from '../scan/capture';
import { findMatches, type Pixels, type ScanIndexEntry, type ScanMatch } from '../scan/descriptor';
import { loadScanIndex } from '../scan/scanIndex';

import './ScanPage.css';

/*
 * Carte reconnue si les deux conditions sont remplies (calibrées sur des photos simulées
 * de vraies cartes et sur des photos sans carte : autre jeu, photo floue, bureau…) :
 *  - score du meilleur candidat : une vraie carte obtient ~0,9 (rarement moins de 0,75),
 *    une image sans carte ~0,5 et jusqu'à ~0,6 ;
 *  - écart avec la meilleure AUTRE carte : une vraie carte se détache nettement (≥ 0,18),
 *    une image sans carte ressemble un peu à tout (écart < 0,07).
 */
const MIN_SCORE = 0.62;
const MIN_GAP = 0.08;

/** La meilleure piste se détache-t-elle assez des autres cartes ? */
function isConfident(matches: ScanMatch[]) {
  const best = matches[0];
  if (!best || best.score < MIN_SCORE) {
    return false;
  }
  const cardId = getPrintingById(best.id)?.cardId;
  const other = matches.find((match) => getPrintingById(match.id)?.cardId !== cardId);
  return best.score - (other?.score ?? 0) >= MIN_GAP;
}

type Status = { kind: 'loading' } | { kind: 'idle' } | { kind: 'error'; message: string };

type Result = { matches: ScanMatch[]; selected: Printing };

/** Regroupe les meilleures pistes : la carte trouvée et ses autres versions proches. */
function buildResult(matches: ScanMatch[], preferredLanguage: string): Result | undefined {
  const best = matches[0] && getPrintingById(matches[0].id);
  if (!best) {
    return undefined;
  }
  // Versions quasi identiques (EN/FR, Beta/Retail…) : même carte, score proche.
  const sameCard = matches.filter(
    (match) =>
      getPrintingById(match.id)?.cardId === best.cardId && match.score >= matches[0].score - 0.08,
  );
  const preferred = sameCard
    .map((match) => getPrintingById(match.id)!)
    .find((printing) => printing.language === preferredLanguage);
  return { matches, selected: preferred ?? best };
}

function describe(printing: Printing) {
  const set = getSetById(printing.setId);
  return `${set?.code ?? printing.setId} ${set?.edition ?? ''} #${printing.number} • ${printing.language}${
    printing.finish === 'Foil' ? ' • Foil' : ''
  }`;
}

export default function ScanPage() {
  const quickAdd = useQuickAdd();
  const t = useT();
  const { countPrinting } = useCollection();

  const [index, setIndex] = useState<ScanIndexEntry[]>();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [cameraOn, setCameraOn] = useState(false);
  const [result, setResult] = useState<Result>();
  const [justAdded, setJustAdded] = useState(false);
  // Photo prise : la vidéo est en pause sur l'image analysée.
  const [frozen, setFrozen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const resumeTimerRef = useRef<number | undefined>(undefined);
  const addedTimerRef = useRef<number | undefined>(undefined);
  // Page encore affichée / caméra en cours d'ouverture (la permission peut prendre du temps).
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  // Easter egg : cartes reconnues d'affilée, sans scan raté.
  const streakRef = useRef(0);

  // Fait défiler jusqu'au résultat dès qu'une carte est reconnue.
  const resultId = result?.matches[0]?.id;
  useEffect(() => {
    if (resultId) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [resultId]);

  const hasCamera = cameraAvailable();

  useEffect(() => {
    loadScanIndex()
      .then((entries) => {
        setIndex(entries);
        setStatus({ kind: 'idle' });
      })
      .catch((error: Error) => setStatus({ kind: 'error', message: error.message }));
  }, []);

  const stopCamera = useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    setFrozen(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(addedTimerRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  async function startCamera() {
    if (startingRef.current || streamRef.current) {
      return;
    }
    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      // Page quittée pendant la demande de permission : on éteint aussitôt la caméra.
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraOn(true);
      setFrozen(false);
      setResult(undefined);
      setStatus({ kind: 'idle' });
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        // La visée prend tout l'écran, sous l'en-tête de la page.
        stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message:
          (error as Error).name === 'NotAllowedError' ? t.scan.cameraDenied : t.scan.cameraError,
      });
    } finally {
      startingRef.current = false;
    }
  }

  /** Analyse la photo (plusieurs cadrages) ; renvoie vrai si une carte a été reconnue. */
  const analyse = useCallback(
    (pixelsList: Pixels[]) => {
      if (!index) {
        return false;
      }
      let matches: ScanMatch[] = [];
      for (const pixels of pixelsList) {
        const found = findMatches(pixels, index, 12);
        if (!matches[0] || (found[0] && found[0].score > matches[0].score)) {
          matches = found;
        }
      }

      if (isConfident(matches)) {
        setResult(buildResult(matches, quickAdd.language));
        setStatus({ kind: 'idle' });
        streakRef.current += 1;
        if (streakRef.current % 10 === 0) {
          showToast({
            kicker: 'Scanner',
            title: `Scan streak ×${streakRef.current}`,
            text: t.scan.streak,
            tone: 'cyan',
          });
        }
        return true;
      }

      streakRef.current = 0;
      setStatus({
        kind: 'error',
        message: t.scan.notRecognised,
      });
      return false;
    },
    [index, quickAdd.language, t],
  );

  const resume = useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    setFrozen(false);
    void videoRef.current?.play();
  }, []);

  function rescan() {
    setResult(undefined);
    setStatus({ kind: 'idle' });
    if (cameraOn) {
      resume();
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /** Déclencheur : fige l'image et l'analyse ; si rien n'est reconnu, la visée reprend. */
  function takePhoto() {
    if (frozen) {
      rescan();
      return;
    }
    const video = videoRef.current;
    const guide = guideRef.current;
    if (!video || !guide) {
      return;
    }
    const pixels = captureFromVideoScales(video, guide.getBoundingClientRect());
    if (pixels.length === 0) {
      return;
    }
    video.pause();
    setFrozen(true);
    if (!analyse(pixels)) {
      // Le temps de voir la photo ratée, puis retour à la visée.
      resumeTimerRef.current = window.setTimeout(resume, 1200);
    }
  }

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      analyse(captureFromImage(image));
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      setStatus({ kind: 'error', message: t.scan.imageError });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function addSelected() {
    // Double appui : un seul exemplaire ajouté.
    if (!result || justAdded) {
      return;
    }
    quickAdd.add(result.selected, true);
    setJustAdded(true);
    addedTimerRef.current = window.setTimeout(() => {
      setJustAdded(false);
      rescan();
    }, 700);
  }

  // Autres versions à proposer : pistes proches, dédoublonnées, la carte trouvée en premier.
  const alternatives = result
    ? result.matches
        .filter((match) => match.score >= result.matches[0].score - 0.12)
        .map((match) => getPrintingById(match.id)!)
        .filter(Boolean)
        .sort(
          (a, b) =>
            Number(b.cardId === result.selected.cardId) -
            Number(a.cardId === result.selected.cardId),
        )
        .slice(0, 8)
    : [];

  const selectedCard = result ? getCardById(result.selected.cardId) : undefined;

  const statusText = (() => {
    switch (status.kind) {
      case 'loading':
        return t.scan.loading;
      case 'error':
        return status.message;
      default:
        return result ? t.scan.recognised : t.scan.aim;
    }
  })();

  return (
    <main className="page scan-page">
      <header className="page-header">
        <p className="eyebrow">{t.scan.eyebrow}</p>
        <h1 className="page-title">{t.nav.scan}</h1>
        <p className="page-subtitle">{t.scan.subtitle}</p>
      </header>

      <QuickAddBar quickAdd={quickAdd} inline hint={t.scan.quickAddHint} />

      <section ref={stageRef} className="scan-stage">
        {cameraOn ? (
          <div className="scan-camera">
            <div className={frozen ? 'scan-viewport frozen' : 'scan-viewport'}>
              <video ref={videoRef} playsInline muted aria-label={t.scan.preview} />
              <div ref={guideRef} className={`scan-guide ${status.kind}`} aria-hidden="true" />
              {frozen && <span className="scan-flash" aria-hidden="true" />}
            </div>

            <p className={`scan-status ${status.kind}`} role="status">
              {statusText}
            </p>

            <div className="scan-controls">
              <button type="button" className="scan-icon-button" onClick={stopCamera}>
                <CloseIcon />
                <span>{t.scan.stop}</span>
              </button>
              <button
                type="button"
                className={frozen ? 'scan-shutter frozen' : 'scan-shutter'}
                onClick={takePhoto}
                aria-label={frozen ? t.scan.resume : t.scan.shoot}
              >
                <span />
              </button>
              <button
                type="button"
                className="scan-icon-button"
                disabled={!index}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon />
                <span>{t.scan.gallery}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="scan-start empty-state">
            <strong>{t.scan.ready}</strong>
            {hasCamera ? <p>{t.scan.readyText}</p> : <p>{t.scan.noCamera}</p>}
            {status.kind === 'error' && <p className="scan-error">{status.message}</p>}
            <div className="scan-start-actions">
              {hasCamera && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!index}
                  onClick={startCamera}
                >
                  {index ? (
                    <>
                      <ScanIcon /> {t.scan.start}
                    </>
                  ) : (
                    t.common.loading
                  )}
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={!index}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon /> {t.scan.importPhoto}
              </button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      </section>

      {result && selectedCard && (
        <section ref={resultRef} className="scan-result" aria-live="polite">
          <div className="scan-result-head">
            <img
              className="scan-result-image"
              src={getThumbUrl(result.selected)}
              alt={selectedCard.name}
            />
            <div className="scan-result-body">
              <p className="eyebrow">{t.scan.recognised}</p>
              <h2>{selectedCard.name}</h2>
              {selectedCard.subtitle && <p className="scan-result-sub">{selectedCard.subtitle}</p>}
              <p className="scan-result-meta">{describe(result.selected)}</p>
              {countPrinting(result.selected.id) > 0 && (
                <p className="scan-result-owned">
                  {t.scan.alreadyOwned(countPrinting(result.selected.id))}
                </p>
              )}
            </div>
          </div>

          {alternatives.length > 1 && (
            <div className="scan-result-versions">
              <span className="filter-label">{t.scan.chooseVersion}</span>
              <div className="scan-versions">
                {alternatives.map((printing) => (
                  <button
                    key={printing.id}
                    type="button"
                    className={printing.id === result.selected.id ? 'active' : ''}
                    aria-pressed={printing.id === result.selected.id}
                    onClick={() => setResult({ ...result, selected: printing })}
                  >
                    <img src={getThumbUrl(printing)} alt="" />
                    <small>
                      {printing.cardId === result.selected.cardId
                        ? describe(printing)
                        : `${getCardById(printing.cardId)?.name} — ${describe(printing)}`}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="scan-result-actions">
            <button type="button" className="btn btn-primary scan-add" onClick={addSelected}>
              {justAdded ? (
                t.common.added
              ) : (
                <>
                  {t.common.add}
                  <small>
                    {quickAdd.condition} • {quickAdd.language}
                  </small>
                </>
              )}
            </button>
            <Link to={`/cards/${result.selected.id}`} className="btn">
              {t.scan.openCard}
            </Link>
            <button type="button" className="btn" onClick={rescan}>
              {t.scan.rescan}
            </button>
          </div>
        </section>
      )}

      {quickAdd.history.length > 0 && (
        <section className="scan-session">
          <div className="section-header">
            <h2>{t.scan.session}</h2>
            <span>{quickAdd.count}</span>
          </div>
          <div className="scan-session-strip">
            {[...quickAdd.history].reverse().map(({ itemId, printing }) => (
              <Link key={itemId} to={`/cards/${printing.id}`} title={describe(printing)}>
                <img src={getThumbUrl(printing)} alt={getCardById(printing.cardId)?.name ?? ''} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
