import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { CardGrid, CardTile } from '../components/CardTile';
import CollectionHistory from '../components/CollectionHistory';
import {
  compareNumbers,
  getCardById,
  getCatalogEntries,
  getPreferredPrintingsBySet,
  getPrintingById,
  getSetById,
  sets,
} from '../data/catalog';
import { formatPercent, formatPrice, percent, plural, RARITIES, RARITY_RANK } from '../data/labels';
import type { Card, CardSet, Printing } from '../data/types';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';

import './CollectionPage.css';

const SORTS = [
  { id: '', key: 'recent' },
  { id: 'set', key: 'set' },
  { id: 'name', key: 'name' },
  { id: 'rarity', key: 'rarity' },
  { id: 'quantity', key: 'quantity' },
] as const;

type OwnedRow = {
  card: Card;
  set: CardSet;
  printing: Printing;
  quantity: number;
  lastAdded: string;
};

export default function CollectionPage() {
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') ?? '';
  const query = params.get('q') ?? '';

  const { items, countVariant } = useCollection();
  const { preferredCardLanguage } = useSettings();
  const t = useT();

  const ownedRows = useMemo(() => {
    const byPrinting = new Map<string, OwnedRow>();
    for (const item of items) {
      const existing = byPrinting.get(item.printingId);
      if (existing) {
        existing.quantity += 1;
        if (item.createdAt > existing.lastAdded) {
          existing.lastAdded = item.createdAt;
        }
        continue;
      }
      const printing = getPrintingById(item.printingId);
      const card = printing && getCardById(printing.cardId);
      const set = printing && getSetById(printing.setId);
      if (printing && card && set) {
        byPrinting.set(item.printingId, {
          card,
          set,
          printing,
          quantity: 1,
          lastAdded: item.createdAt,
        });
      }
    }
    return [...byPrinting.values()];
  }, [items]);

  const setOrder = new Map(sets.map((set, index) => [set.id, index]));

  const visibleRows = ownedRows
    .filter(({ card, printing }) => {
      const needle = query.trim().toLowerCase();
      return (
        !needle ||
        [card.name, card.subtitle, printing.localizedName, printing.number]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    })
    .sort((a, b) => {
      switch (sort) {
        case 'set':
          return (
            (setOrder.get(a.set.id) ?? 0) - (setOrder.get(b.set.id) ?? 0) ||
            compareNumbers(a.printing.number, b.printing.number)
          );
        case 'name':
          return a.card.name.localeCompare(b.card.name);
        case 'rarity':
          return (
            (RARITY_RANK.get(b.printing.rarity) ?? 0) - (RARITY_RANK.get(a.printing.rarity) ?? 0)
          );
        case 'quantity':
          return b.quantity - a.quantity || a.card.name.localeCompare(b.card.name);
        default:
          return b.lastAdded.localeCompare(a.lastAdded);
      }
    });

  // ---------- Statistiques ----------

  const entries = getCatalogEntries(preferredCardLanguage);
  const ownedEntries = entries.filter(({ printing }) => countVariant(printing.variantKey) > 0);
  const uniqueCards = new Set(ownedRows.map((row) => row.card.id)).size;
  const totalSpent = items.reduce((sum, item) => sum + (item.purchasePrice ?? 0), 0);
  const gradedCount = items.filter((item) => item.graded).length;
  const foilCount = ownedRows
    .filter((row) => row.printing.finish === 'Foil')
    .reduce((sum, row) => sum + row.quantity, 0);

  const setProgress = sets.map((set) => {
    const setPrintings = getPreferredPrintingsBySet(set.id, preferredCardLanguage);
    const owned = setPrintings.filter((printing) => countVariant(printing.variantKey) > 0).length;
    return { set, owned, total: setPrintings.length };
  });

  const rarityProgress = RARITIES.map((rarity) => {
    const all = entries.filter(({ printing }) => printing.rarity === rarity);
    const owned = all.filter(({ printing }) => countVariant(printing.variantKey) > 0);
    return { rarity, owned: owned.length, total: all.length };
  }).filter((row) => row.total > 0);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setParams(next, { replace: true });
  }

  if (items.length === 0) {
    return (
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">CyberCardex</p>
          <h1 className="page-title">{t.home.myCollection}</h1>
        </header>
        <div className="empty-state">
          <strong>{t.collection.emptyTitle}</strong>
          <p>{t.collection.emptyText}</p>
          <p>{t.collection.emptyBackup}</p>
          <Link to="/" className="btn btn-primary">
            {t.collection.browse}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">CyberCardex</p>
        <h1 className="page-title">{t.home.myCollection}</h1>
        <div className="collection-links">
          <Link to="/decks" className="btn btn-primary">
            {t.decks.title}
          </Link>
        </div>
      </header>

      <section className="stats-grid section">
        <div className="stat">
          <span className="stat-label">{t.home.progress}</span>
          <strong>{formatPercent(ownedEntries.length, entries.length)}</strong>
          <small>{t.collection.printingsCount(ownedEntries.length, entries.length)}</small>
        </div>
        <div className="stat">
          <span className="stat-label">{t.collection.copies}</span>
          <strong>{items.length}</strong>
          <small>
            {plural(
              ownedRows.length,
              t.collection.distinctPrinting,
              t.collection.distinctPrintings,
            )}
          </small>
        </div>
        <div className="stat">
          <span className="stat-label">{t.collection.uniqueCards}</span>
          <strong>{uniqueCards}</strong>
          <small>{t.collection.outOf(new Set(entries.map((entry) => entry.card.id)).size)}</small>
        </div>
        <div className="stat">
          <span className="stat-label">{t.collection.foilGraded}</span>
          <strong>
            {foilCount} / {gradedCount}
          </strong>
          <small>{t.common.copies}</small>
        </div>
        <div className="stat">
          <span className="stat-label">{t.collection.spent}</span>
          <strong>{formatPrice(totalSpent)}</strong>
          <small>{t.collection.spentHint}</small>
        </div>
      </section>

      <CollectionHistory items={items} />

      <div className="collection-columns section">
        <section>
          <div className="section-header">
            <h2>{t.collection.bySet}</h2>
          </div>
          <div className="progress-list">
            {setProgress.map(({ set, owned, total }) => {
              const value = percent(owned, total);
              const complete = total > 0 && owned === total;
              return (
                <Link key={set.id} to={`/sets/${set.id}`} className="progress-row">
                  <div className="progress-row-head">
                    <span>
                      {set.name}
                      <small>{set.edition}</small>
                    </span>
                    <strong className={complete ? 'complete' : ''}>
                      {owned}/{total}
                    </strong>
                  </div>
                  <div className="progress">
                    <div
                      className={complete ? 'progress-value complete' : 'progress-value'}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="section-header">
            <h2>{t.collection.byRarity}</h2>
          </div>
          <div className="progress-list">
            {rarityProgress.map(({ rarity, owned, total }) => {
              const value = percent(owned, total);
              return (
                <Link
                  key={rarity}
                  to={`/search?rarity=${encodeURIComponent(rarity)}&own=missing`}
                  className="progress-row"
                  title={t.collection.rarityMissing}
                >
                  <div className="progress-row-head">
                    <span>{rarity}</span>
                    <strong className={owned === total ? 'complete' : ''}>
                      {owned}/{total}
                    </strong>
                  </div>
                  <div className="progress">
                    <div className="progress-value" style={{ width: `${value}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section>
        <div className="section-header">
          <h2>{t.collection.myCards}</h2>
          <span>{ownedRows.length}</span>
        </div>

        <div className="collection-toolbar">
          <input
            type="search"
            className="search-input"
            placeholder={t.collection.filterPlaceholder}
            value={query}
            onChange={(event) => update('q', event.target.value)}
          />
          <select
            className="select"
            value={sort}
            onChange={(event) => update('sort', event.target.value)}
            aria-label={t.search.sort}
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {t.collection.sorts[option.key]}
              </option>
            ))}
          </select>
        </div>

        {visibleRows.length > 0 ? (
          <CardGrid>
            {visibleRows.map(({ card, set, printing, quantity }) => (
              <CardTile
                key={printing.id}
                card={card}
                printing={printing}
                quantity={quantity}
                meta={`${set.code} #${printing.number} • ${printing.language}`}
              />
            ))}
          </CardGrid>
        ) : (
          <div className="empty-state">
            <strong>{t.set.emptyTitle}</strong>
            <p>{t.collection.noMatch}</p>
          </div>
        )}
      </section>
    </main>
  );
}
