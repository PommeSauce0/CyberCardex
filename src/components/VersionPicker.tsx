import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { getSetById, getThumbUrl } from '../data/catalog';
import type { Card, Printing } from '../data/types';
import { useT } from '../i18n/useT';
import { useBackHandler } from '../native/backButton';

import { useFocusTrap } from './useFocusTrap';

import './VersionPicker.css';

type Props = {
  card: Card;
  versions: Printing[];
  /** Version actuelle (mise en avant). */
  current?: Printing;
  onPick: (printing: Printing) => void;
  onClose: () => void;
};

/**
 * Panneau « Quelle version ? » : une miniature par version de la carte (série, numéro, rareté).
 * Affiché dans <body>, hors de la page animée ; le retour Android et Échap le ferment.
 */
export default function VersionPicker({ card, versions, current, onPick, onClose }: Props) {
  const t = useT();
  useBackHandler(onClose);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="version-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="version-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t.decks.versionTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="version-sheet-header">
          <div>
            <strong>{t.decks.versionTitle}</strong>
            <span>
              {card.name}
              {card.subtitle && ` — ${card.subtitle}`}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label={t.common.close}>
            ×
          </button>
        </header>
        <div className="version-grid">
          {versions.map((printing) => {
            const set = getSetById(printing.setId);
            const isCurrent = current?.variantKey === printing.variantKey;
            return (
              <button
                key={printing.id}
                type="button"
                className={isCurrent ? 'version-option current' : 'version-option'}
                aria-pressed={isCurrent}
                onClick={() => onPick(printing)}
              >
                <img src={getThumbUrl(printing)} alt="" loading="lazy" />
                <strong>#{printing.number}</strong>
                {set && (
                  <small>
                    {/* L'édition d'abord : c'est ce qui distingue les versions (Retail, Beta…). */}
                    {set.edition} · {set.name}
                  </small>
                )}
                <small>
                  {printing.rarity}
                  {printing.finish === 'Foil' && ' · Foil'}
                </small>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
