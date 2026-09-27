import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Link } from 'react-router-dom';

import { getCardById, getPrintingById, getThumbUrl } from '../data/catalog';
import type { CollectionItem } from '../data/types';
import { useT } from '../i18n/useT';

import './CollectionHistory.css';

const HEIGHT = 190;
const PAD = { top: 16, right: 16, bottom: 26, left: 40 };
const DAY = 86_400_000;
const RECENT = 12;

type Point = { day: number; date: Date; total: number; added: number };

/** Jour local (minuit) d'une date ISO. */
const startOfDay = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/** Graduations « rondes » de l'axe vertical (0, 5, 10… ou 0, 50, 100…). */
function niceTicks(max: number) {
  const rough = Math.max(1, max) / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((value) => value >= rough) ?? rough;
  const top = Math.max(step, Math.ceil(max / step) * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/**
 * Historique : courbe du nombre d'exemplaires au fil des jours (d'après la date d'ajout
 * des exemplaires encore dans la collection) et derniers ajouts.
 */
export default function CollectionHistory({ items }: { items: CollectionItem[] }) {
  const t = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number>();

  useEffect(() => {
    const box = boxRef.current;
    if (!box) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Un point par jour d'ajout, cumulé ; le dernier point est aujourd'hui.
  const points = useMemo<Point[]>(() => {
    const perDay = new Map<number, number>();
    for (const item of items) {
      const day = startOfDay(item.createdAt).getTime();
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const list: Point[] = [];
    for (const [day, added] of [...perDay.entries()].sort(([a], [b]) => a - b)) {
      const total = (list.at(-1)?.total ?? 0) + added;
      list.push({ day, date: new Date(day), total, added });
    }
    const today = startOfDay(new Date().toISOString()).getTime();
    const last = list.at(-1);
    if (last && last.day < today) {
      list.push({ day: today, date: new Date(today), total: last.total, added: 0 });
    }
    return list;
  }, [items]);

  const recent = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT)
        .flatMap((item) => {
          const printing = getPrintingById(item.printingId);
          const card = printing && getCardById(printing.cardId);
          return printing && card ? [{ item, printing, card }] : [];
        }),
    [items],
  );

  const formatDay = (date: Date, long = false) =>
    date.toLocaleDateString(
      t.locale,
      long
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short' },
    );

  const hasCurve = points.length >= 2;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const first = points[0]?.day ?? 0;
  const span = Math.max(DAY, (points.at(-1)?.day ?? 0) - first);
  const ticks = niceTicks(points.at(-1)?.total ?? 0);
  const yMax = ticks.at(-1) ?? 1;
  const x = (day: number) => PAD.left + ((day - first) / span) * plotW;
  const y = (total: number) => PAD.top + plotH - (total / yMax) * plotH;

  // Escalier : la collection reste stable entre deux jours d'ajout.
  const line = points
    .map((point, index) =>
      index === 0 ? `M${x(point.day)},${y(point.total)}` : `H${x(point.day)}V${y(point.total)}`,
    )
    .join('');
  const area = `${line}V${y(0)}H${x(first)}Z`;

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(x(point.day) - px) < Math.abs(x(points[nearest].day) - px)) {
        nearest = index;
      }
    });
    setHover(nearest);
  }

  const active = hover !== undefined ? points[hover] : undefined;
  const summary = points.at(-1);

  return (
    <section className="section history">
      <div className="section-header">
        <h2>{t.history.title}</h2>
      </div>

      <div className="history-chart" ref={boxRef}>
        {hasCurve && width > 0 ? (
          <>
            <svg
              width={width}
              height={HEIGHT}
              role="img"
              aria-label={t.history.chartLabel(
                summary?.total ?? 0,
                formatDay(points[0].date, true),
              )}
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setHover(undefined)}
            >
              {ticks.map((tick) => (
                <g key={tick} className="history-grid">
                  <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
                  <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                    {tick}
                  </text>
                </g>
              ))}
              <text className="history-axis" x={PAD.left} y={HEIGHT - 6}>
                {formatDay(points[0].date)}
              </text>
              <text className="history-axis" x={width - PAD.right} y={HEIGHT - 6} textAnchor="end">
                {formatDay(points.at(-1)!.date)}
              </text>

              <path className="history-area" d={area} />
              <path className="history-line" d={line} />

              {active && (
                <g className="history-hover">
                  <line x1={x(active.day)} x2={x(active.day)} y1={PAD.top} y2={y(0)} />
                  <circle cx={x(active.day)} cy={y(active.total)} r={5} />
                </g>
              )}
              {!active && summary && (
                <circle className="history-end" cx={x(summary.day)} cy={y(summary.total)} r={5} />
              )}
            </svg>

            {active && (
              <div
                className="history-tooltip"
                style={{
                  left: Math.min(Math.max(x(active.day), 70), width - 70),
                }}
              >
                <strong>{t.history.total(active.total)}</strong>
                <span>{formatDay(active.date, true)}</span>
                {active.added > 0 && <small>{t.history.added(active.added)}</small>}
              </div>
            )}
          </>
        ) : (
          <p className="history-empty">{t.history.notEnough}</p>
        )}
      </div>

      {recent.length > 0 && (
        <>
          <span className="history-label">{t.history.recent}</span>
          <div className="history-recent">
            {recent.map(({ item, printing, card }) => (
              <Link key={item.id} to={`/cards/${printing.id}`} title={card.name}>
                <img src={getThumbUrl(printing)} alt={card.name} loading="lazy" />
                <small>{formatDay(new Date(item.createdAt))}</small>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
