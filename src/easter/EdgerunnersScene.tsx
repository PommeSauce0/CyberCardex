import { useEffect } from 'react';

import { getPrintingById, getThumbUrl } from '../data/catalog';

import { useT } from '../i18n/useT';

import { EDGERUNNERS } from './events';

const DURATION = 6200;

/**
 * Easter egg Edgerunners : quand on possède les promos #007 (Rebecca) et #008 (Adam
 * Smasher), la carte d'Adam tombe du haut de l'écran et écrase celle de Rebecca.
 */
export default function EdgerunnersScene({ onDone }: { onDone: () => void }) {
  const t = useT();
  useEffect(() => {
    const timer = window.setTimeout(onDone, DURATION);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const rebecca = getPrintingById(EDGERUNNERS.rebecca);
  const adam = getPrintingById(EDGERUNNERS.adam);
  if (!rebecca || !adam) {
    return null;
  }

  return (
    <button type="button" className="ee-edgerunners" onClick={onDone} aria-label={t.common.close}>
      <span className="ee-er-warning" aria-hidden="true">
        ▼ {t.easter.incoming} ▼
      </span>

      <span className="ee-er-stage" aria-hidden="true">
        <span className="ee-er-shadow" />

        <span className="ee-er-card ee-er-rebecca">
          <img src={getThumbUrl(rebecca)} alt="" draggable={false} />
          <span className="ee-er-flash" />
          {/* Fissures qui partent du point d'impact. */}
          <svg className="ee-er-cracks" viewBox="0 -14 100 140" preserveAspectRatio="none">
            <path d="M56 84 L46 98 L50 112 L40 140" />
            <path d="M56 84 L66 100 L62 118 L74 140" />
            <path d="M56 84 L34 88 L20 80 L0 86" />
            <path d="M56 84 L80 82 L100 74" />
            <path d="M46 98 L24 110 L6 128" />
            <path d="M66 100 L88 112 L100 126" />
            <path d="M34 88 L28 66 L12 54" />
            <path d="M80 82 L84 62 L98 52" />
          </svg>
        </span>

        <span className="ee-er-card ee-er-adam">
          <img src={getThumbUrl(adam)} alt="" draggable={false} />
        </span>

        <span className="ee-er-dust left" />
        <span className="ee-er-dust right" />
        <span className="ee-er-shockwave" />
      </span>

      <span className="ee-er-text">
        <small>// Edgerunners</small>
        <strong data-text="FLATLINED">FLATLINED</strong>
        <span>Rebecca · {t.easter.flatlined}</span>
      </span>

      <span className="ee-er-impact" aria-hidden="true" />
    </button>
  );
}
