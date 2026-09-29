import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { useQuickAdd } from '../collection/useQuickAdd';
import Binder from '../components/Binder';
import { CardGrid, CardTile } from '../components/CardTile';
import { BoltIcon, GridIcon } from '../components/Icons';
import QuickAddBar from '../components/QuickAddBar';
import { getCardById, getPreferredPrintingsBySet, getSetById } from '../data/catalog';
import { getCatalogTab, percent, plural } from '../data/labels';
import { playBraindance } from '../easter/events';
import { useT } from '../i18n/useT';
import BackLink from '../navigation/BackLink';
import { CARD_SIZES, useSettings } from '../settings/SettingsContext';

import './SetPage.css';

const FILTERS = ['all', 'owned', 'missing', 'wished'] as const;

type Filter = (typeof FILTERS)[number];

function isFilter(value: string | null): value is Filter {
  return FILTERS.some((filter) => filter === value);
}

export default function SetPage() {
  const { setId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  // Le champ garde sa propre valeur : l'adresse se met à jour avec un temps de retard, et
  // certains claviers (Samsung) perdent le mot en cours si la valeur affichée recule.
  const [searchDraft, setSearchDraft] = useState(search);
  const filterParam = searchParams.get('filter');
  const filter: Filter = isFilter(filterParam) ? filterParam : 'all';
  const view = searchParams.get('view') === 'binder' ? 'binder' : 'grid';
  const binderPage = Math.max(0, Number(searchParams.get('page') ?? 1) - 1) || 0;

  const { countVariant, isWished, removeLatestOfVariant } = useCollection();
  const quickAdd = useQuickAdd();
  const [quickMode, setQuickMode] = useState(false);
  const { preferredCardLanguage, cardSize, setCardSize, getBinderSlots, setBinderSlots } =
    useSettings();
  const t = useT();

  const set = setId ? getSetById(setId) : undefined;

  const rows = useMemo(() => {
    if (!set) {
      return [];
    }
    return getPreferredPrintingsBySet(set.id, preferredCardLanguage).flatMap((printing) => {
      const card = getCardById(printing.cardId);
      return card ? [{ card, printing }] : [];
    });
  }, [set, preferredCardLanguage]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Changement interne à la page (filtre, recherche, page du classeur) : on garde le défilement.
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  if (!set) {
    return (
      <main className="page">
        <BackLink fallbackTo="/" fallbackLabel={t.nav.home} />
        <div className="empty-state">
          <strong>{t.set.notFoundTitle}</strong>
          <p>{t.set.notFoundText}</p>
        </div>
      </main>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = rows.filter(({ card, printing }) => {
    const haystack = [card.name, card.subtitle, printing.localizedName, printing.number]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (normalizedSearch && !haystack.includes(normalizedSearch)) {
      return false;
    }
    const owned = countVariant(printing.variantKey) > 0;
    switch (filter) {
      case 'owned':
        return owned;
      case 'missing':
        return !owned;
      case 'wished':
        return isWished(printing.id);
      default:
        return true;
    }
  });

  const total = rows.length;
  const owned = rows.filter(({ printing }) => countVariant(printing.variantKey) > 0).length;
  const percentage = percent(owned, total);
  const complete = total > 0 && owned === total;
  const backTab = getCatalogTab(set);

  function setView(next: 'grid' | 'binder') {
    const params = new URLSearchParams(searchParams);
    params.delete('page');
    if (next === 'binder') {
      params.set('view', 'binder');
    } else {
      params.delete('view');
    }
    setSearchParams(params, { replace: true });
  }

  return (
    <main className={quickMode ? 'page has-quick-add' : 'page has-quick-fab'}>
      <BackLink
        fallbackTo={backTab === 'core' ? '/' : `/?tab=${backTab}`}
        fallbackLabel={t.nav.home}
      />

      <header className="set-header" data-code={set.code}>
        <div className="set-header-topline">
          <span className="set-code">{set.code}</span>
          <span className="set-edition-badge">{set.edition}</span>
          <span className="set-year-badge">{set.releaseYear}</span>
        </div>

        <h1>{set.name}</h1>

        <span className="set-progress-label">
          {t.home.cardsCount(owned, total)} • {percentage} %
          {complete && (
            <>
              {' • '}
              <button
                type="button"
                className="ee-replay"
                onClick={() => playBraindance(set.id)}
                title={t.set.replayBraindance}
              >
                {t.common.setComplete} ▶
              </button>
            </>
          )}
        </span>

        <div className="progress main-progress">
          <div
            className={complete ? 'progress-value complete' : 'progress-value'}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </header>

      <div className="set-toolbar">
        <div className="view-switch" role="group" aria-label={t.set.display}>
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            ▦ {t.set.grid}
          </button>
          <button
            type="button"
            className={view === 'binder' ? 'active' : ''}
            aria-pressed={view === 'binder'}
            onClick={() => setView('binder')}
          >
            ▤ {t.set.binder}
          </button>
        </div>
        {view === 'grid' && (
          <div className="view-switch size-switch" role="group" aria-label={t.set.cardSize}>
            {CARD_SIZES.map((size, index) => (
              <button
                key={size}
                type="button"
                className={cardSize === size ? 'active' : ''}
                aria-pressed={cardSize === size}
                aria-label={t.set.cardSizes[size]}
                title={t.set.cardSizes[size]}
                onClick={() => setCardSize(size)}
              >
                <GridIcon columns={(3 - index) as 1 | 2 | 3} />
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'binder' ? (
        <Binder
          rows={rows}
          page={binderPage}
          onPageChange={(page) => updateParam('page', page > 0 ? String(page + 1) : '')}
          getQuantity={(printing) => countVariant(printing.variantKey)}
          onActivate={quickMode ? (printing) => quickAdd.add(printing) : undefined}
          slotsPerPage={getBinderSlots(set.id)}
          onSlotsChange={(slots) => {
            setBinderSlots(set.id, slots);
            updateParam('page', '');
          }}
        />
      ) : (
        <>
          <section className="controls">
            <input
              type="search"
              className="search-input"
              placeholder={t.set.searchPlaceholder}
              value={searchDraft}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                updateParam('q', event.target.value);
              }}
            />

            <div className="filters">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={filter === item ? 'active' : ''}
                  aria-pressed={filter === item}
                  onClick={() => updateParam('filter', item === 'all' ? '' : item)}
                >
                  {t.filters[item]}
                </button>
              ))}
            </div>
          </section>

          <div className="results-count">
            {plural(filteredRows.length, t.common.card, t.common.cards)}
          </div>

          {filteredRows.length > 0 ? (
            <CardGrid browse={filteredRows.map((row) => row.printing.id)}>
              {filteredRows.map(({ card, printing }) => (
                <CardTile
                  key={printing.id}
                  card={card}
                  printing={printing}
                  quantity={countVariant(printing.variantKey)}
                  wished={isWished(printing.id)}
                  onActivate={quickMode ? () => quickAdd.add(printing) : undefined}
                  onDecrement={
                    quickMode ? () => removeLatestOfVariant(printing.variantKey) : undefined
                  }
                />
              ))}
            </CardGrid>
          ) : (
            <div className="empty-state">
              <strong>{t.set.emptyTitle}</strong>
              <p>{t.set.emptyText}</p>
            </div>
          )}
        </>
      )}

      {quickMode ? (
        <QuickAddBar quickAdd={quickAdd} onClose={() => setQuickMode(false)} />
      ) : (
        <button
          type="button"
          className="quick-add-fab"
          aria-label={t.quickAdd.title}
          title={t.quickAdd.title}
          onClick={() => setQuickMode(true)}
        >
          <BoltIcon />
          <span>{t.quickAdd.title}</span>
        </button>
      )}
    </main>
  );
}
