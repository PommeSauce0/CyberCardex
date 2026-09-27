import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getThumbUrl } from '../data/catalog';
import type { Card, Printing } from '../data/types';
import { useT } from '../i18n/useT';
import type { BinderSlots } from '../settings/SettingsContext';

import './Binder.css';

/** Nombre d'intercalaires visé (le classeur est découpé en tranches de numéros). */
const TARGET_TABS = 5;

type BinderRow = { card: Card; printing: Printing };

type BinderProps = {
  rows: BinderRow[];
  /** Index de la page (0 = première page). */
  page: number;
  onPageChange: (page: number) => void;
  getQuantity: (printing: Printing) => number;
  /** Mode ajout rapide : un appui sur une pochette ajoute un exemplaire. */
  onActivate?: (printing: Printing) => void;
  /** Pochettes par page : 9 (3×3) ou 12 (4 colonnes × 3 rangées). */
  slotsPerPage: BinderSlots;
  onSlotsChange: (slots: BinderSlots) => void;
};

/** Page tournée en cours d'animation : de la double page `from` vers `to`. */
type Flip = { from: number; to: number; dir: 'next' | 'prev' };

function useIsWide() {
  const query = '(min-width: 900px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return wide;
}

function Slot({
  row,
  quantity,
  onActivate,
}: {
  row: BinderRow;
  quantity: number;
  onActivate?: (printing: Printing) => void;
}) {
  const t = useT();
  const { card, printing } = row;
  const owned = quantity > 0;
  const label = `${card.name}${card.subtitle ? ` — ${card.subtitle}` : ''} #${printing.number}`;

  // Carte manquante : son visuel, assombri, pour savoir quoi chercher.
  const inner = (
    <>
      <img src={getThumbUrl(printing)} alt="" decoding="async" draggable={false} />
      {owned ? (
        quantity > 1 && <span className="binder-qty">×{quantity}</span>
      ) : (
        <span className="binder-missing-number">#{printing.number}</span>
      )}
    </>
  );

  const className = owned ? 'binder-slot owned' : 'binder-slot missing';

  return onActivate ? (
    <button
      type="button"
      className={`${className} quick`}
      onClick={() => onActivate(printing)}
      aria-label={t.quickAdd.addOne(label)}
      title={label}
    >
      {inner}
    </button>
  ) : (
    <Link
      to={`/cards/${printing.id}`}
      className={className}
      aria-label={owned ? label : t.binder.missing(label)}
      title={label}
      draggable={false}
    >
      {inner}
    </Link>
  );
}

type PageProps = {
  rows: BinderRow[];
  slotsPerPage: number;
  pageIndex: number;
  pageCount: number;
  side?: 'left' | 'right';
  getQuantity: (printing: Printing) => number;
  onActivate?: (printing: Printing) => void;
};

/** Une page plastique (3×3 ou 4×3). Au-delà de la dernière page : feuille vide (même hauteur). */
function Page({
  rows,
  slotsPerPage,
  pageIndex,
  pageCount,
  side,
  getQuantity,
  onActivate,
}: PageProps) {
  const exists = pageIndex >= 0 && pageIndex < pageCount;
  const slots = exists ? rows.slice(pageIndex * slotsPerPage, (pageIndex + 1) * slotsPerPage) : [];

  return (
    <div
      className={['binder-page', `slots-${slotsPerPage}`, side ?? '', exists ? '' : 'blank']
        .join(' ')
        .trim()}
    >
      <div className="binder-grid">
        {slots.map((row) => (
          <Slot
            key={row.printing.id}
            row={row}
            quantity={getQuantity(row.printing)}
            onActivate={onActivate}
          />
        ))}
        {Array.from({ length: slotsPerPage - slots.length }, (_, i) => (
          <span key={`filler-${i}`} className="binder-slot filler" aria-hidden="true" />
        ))}
      </div>
      {exists && <span className="binder-page-number">{pageIndex + 1}</span>}
    </div>
  );
}

/** Classeur façon pages plastiques (9 ou 12 pochettes) : une page sur mobile, une double page sur grand écran. */
export default function Binder({
  rows,
  page,
  onPageChange,
  getQuantity,
  onActivate,
  slotsPerPage,
  onSlotsChange,
}: BinderProps) {
  const t = useT();
  const wide = useIsWide();
  const perSpread = wide ? 2 : 1;
  const pageCount = Math.max(1, Math.ceil(rows.length / slotsPerPage));
  const first = Math.min(Math.max(0, page - (page % perSpread)), pageCount - 1);

  const [settled, setSettled] = useState(first);
  const [flip, setFlip] = useState<Flip | null>(null);
  if (settled !== first) {
    // État dérivé : mis à jour pendant le rendu quand la page change.
    setSettled(first);
    setFlip({ from: settled, to: first, dir: first > settled ? 'next' : 'prev' });
  }

  const canPrev = first > 0;
  const canNext = first + perSpread < pageCount;
  const goPrev = () => canPrev && onPageChange(Math.max(0, first - perSpread));
  const goNext = () => canNext && onPageChange(first + perSpread);

  // Flèches du clavier (sauf pendant la saisie dans un champ).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      if (event.key === 'ArrowLeft' && first > 0) {
        onPageChange(Math.max(0, first - perSpread));
      } else if (event.key === 'ArrowRight' && first + perSpread < pageCount) {
        onPageChange(first + perSpread);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [first, perSpread, pageCount, onPageChange]);

  // Précharge les miniatures des pages voisines : la feuille tourne sur des images déjà prêtes.
  useEffect(() => {
    const start = Math.max(0, first - perSpread) * slotsPerPage;
    const end = (first + perSpread * 2) * slotsPerPage;
    for (const { printing } of rows.slice(start, end)) {
      new Image().src = getThumbUrl(printing);
    }
  }, [first, perSpread, rows, slotsPerPage]);

  // Page tournée depuis le bas de l'écran : on remonte juste au haut du classeur.
  const spreadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const spread = spreadRef.current;
    if (flip && spread && spread.getBoundingClientRect().top < 70) {
      spread.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [flip]);

  // Glisser du doigt pour tourner les pages.
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const pageProps = { rows, slotsPerPage, pageCount, getQuantity, onActivate };

  // Pendant l'animation : la page statique dessous, et la feuille qui pivote sur la reliure
  // (recto = page quittée, verso = page découverte).
  let base: number[];
  let sheet: { front: number; back: number } | null = null;
  if (!flip) {
    base = wide ? [first, first + 1] : [first];
  } else if (wide) {
    base = flip.dir === 'next' ? [flip.from, flip.to + 1] : [flip.to, flip.from + 1];
    sheet =
      flip.dir === 'next'
        ? { front: flip.from + 1, back: flip.to }
        : { front: flip.from, back: flip.to + 1 };
  } else {
    base = [flip.dir === 'next' ? flip.to : flip.from];
    sheet = flip.dir === 'next' ? { front: flip.from, back: -1 } : { front: flip.to, back: -1 };
  }

  const countOwned = (slice: BinderRow[]) =>
    slice.filter(({ printing }) => getQuantity(printing) > 0).length;

  const visiblePages = (wide ? [first, first + 1] : [first]).filter((index) => index < pageCount);
  const spreadRows = rows.slice(
    first * slotsPerPage,
    (visiblePages[visiblePages.length - 1] + 1) * slotsPerPage,
  );
  const ownedOnSpread = countOwned(spreadRows);

  // Intercalaires : tranches de pages consécutives (multiples d'une double page), avec la
  // plage de numéros qu'elles couvrent et leur remplissage.
  const pagesPerTab = Math.max(1, Math.ceil(pageCount / TARGET_TABS / perSpread)) * perSpread;
  const tabs =
    pageCount > perSpread * 2
      ? Array.from({ length: Math.ceil(pageCount / pagesPerTab) }, (_, index) => {
          const start = index * pagesPerTab;
          const end = Math.min(pageCount, start + pagesPerTab);
          const slice = rows.slice(start * slotsPerPage, end * slotsPerPage);
          return {
            start,
            end,
            from: slice[0].printing.number,
            to: slice[slice.length - 1].printing.number,
            owned: countOwned(slice),
            total: slice.length,
          };
        })
      : [];

  return (
    <section className="binder" aria-label={t.set.binder}>
      {tabs.length > 0 && (
        <nav className="binder-tabs" aria-label={t.binder.tabs}>
          {tabs.map((tab) => {
            const active = first >= tab.start && first < tab.end;
            return (
              <button
                key={tab.start}
                type="button"
                className={[
                  'binder-tab',
                  active ? 'active' : '',
                  tab.owned === tab.total ? 'complete' : '',
                ]
                  .join(' ')
                  .trim()}
                aria-current={active ? 'true' : undefined}
                aria-label={t.binder.tabLabel(
                  tab.from,
                  tab.to,
                  tab.start + 1,
                  tab.end,
                  tab.owned,
                  tab.total,
                )}
                onClick={() => !active && onPageChange(tab.start)}
              >
                <span className="binder-tab-inner">
                  <span className="binder-tab-range">
                    {tab.from}
                    <i>–</i>
                    {tab.to}
                  </span>
                  <span className="binder-tab-fill" aria-hidden="true">
                    <i style={{ width: `${(tab.owned / tab.total) * 100}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <div
        ref={spreadRef}
        className={['binder-spread', wide ? 'wide' : '', flip ? `flipping ${flip.dir}` : '']
          .join(' ')
          .trim()}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') {
            swipeStart.current = { x: event.clientX, y: event.clientY };
          }
        }}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start) {
            return;
          }
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (dx < 0) {
              goNext();
            } else {
              goPrev();
            }
          }
        }}
      >
        {base.map((pageIndex, i) => (
          <Page
            key={`base-${i}`}
            pageIndex={pageIndex}
            side={wide ? (i === 0 ? 'left' : 'right') : undefined}
            {...pageProps}
          />
        ))}

        {flip && sheet && (
          <div
            // La clé relance l'animation si on tourne une autre page avant la fin.
            key={`${flip.from}-${flip.to}`}
            className={`binder-sheet ${flip.dir}`}
            aria-hidden="true"
            inert
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) {
                setFlip(null);
              }
            }}
          >
            <div className="binder-sheet-face front">
              <Page
                pageIndex={sheet.front}
                side={wide ? (flip.dir === 'next' ? 'right' : 'left') : undefined}
                {...pageProps}
              />
            </div>
            <div className="binder-sheet-face back">
              <Page
                pageIndex={sheet.back}
                side={wide ? (flip.dir === 'next' ? 'left' : 'right') : undefined}
                {...pageProps}
              />
            </div>
          </div>
        )}
      </div>

      <nav className="binder-nav" aria-label={t.binder.pages}>
        <button
          type="button"
          className="btn binder-nav-arrow"
          onClick={goPrev}
          disabled={!canPrev}
          aria-label={t.binder.previous}
        >
          ‹
        </button>

        <div className="binder-nav-label">
          <strong>
            {visiblePages.length > 1
              ? t.binder.pagesRange(visiblePages[0] + 1, visiblePages[1] + 1)
              : t.binder.page(first + 1)}
            <span> / {pageCount}</span>
          </strong>
          <small>
            #{spreadRows[0]?.printing.number} → #
            {spreadRows[spreadRows.length - 1]?.printing.number}
            {' • '}
            {ownedOnSpread}/{spreadRows.length}
          </small>
        </div>

        <button
          type="button"
          className="btn binder-nav-arrow"
          onClick={goNext}
          disabled={!canNext}
          aria-label={t.binder.next}
        >
          ›
        </button>
      </nav>

      {/* Réglage discret : format des pages, retenu pour cette série. */}
      <div className="binder-format" role="group" aria-label={t.binder.format}>
        <span>{t.binder.format}</span>
        {([9, 12] as const).map((slots) => (
          <button
            key={slots}
            type="button"
            className={slots === slotsPerPage ? 'active' : ''}
            aria-pressed={slots === slotsPerPage}
            onClick={() => onSlotsChange(slots)}
          >
            {slots}
          </button>
        ))}
      </div>
    </section>
  );
}
