import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { CardGrid, CardTile } from '../components/CardTile';
import { norm, searchCards } from '../data/cardSearch';
import {
  compareNumbers,
  getCatalogEntries,
  getPrintingInLanguage,
  getPrintingsByCard,
  getThumbUrl,
  type CatalogEntry,
} from '../data/catalog';
import type { Card } from '../data/types';
import { CARD_COLORS, CARD_TYPES, COLOR_HEX, plural, RARITIES, RARITY_RANK } from '../data/labels';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';

import './SearchPage.css';

const PAGE_SIZE = 60;

const OWNERSHIP = [
  { id: '', key: 'all' },
  { id: 'owned', key: 'owned' },
  { id: 'missing', key: 'missing' },
  { id: 'wished', key: 'wished' },
] as const;

const COSTS = ['1', '2', '3', '4', '5', '6', '7+'];

const SORTS = [
  { id: '', key: 'set' },
  { id: 'name', key: 'name' },
  { id: 'cost', key: 'cost' },
  { id: 'rarity', key: 'rarity' },
] as const;

const CORRUPTED = '█▓▒░#@%&$§¤';

/** Texte « corrompu » : chaque lettre remplacée au hasard. */
function corrupt(text: string) {
  return text.replace(/\S/g, () => CORRUPTED[Math.floor(Math.random() * CORRUPTED.length)]);
}

/**
 * Easter egg : chercher « Blackwall » fait trembler l'écran et corrompt la page une
 * seconde, puis le mur répond.
 */
function BlackwallBreach() {
  const t = useT();
  const [breaching, setBreaching] = useState(true);
  const [noise, setNoise] = useState(() => corrupt('BLACKWALL BREACH DETECTED'));

  useEffect(() => {
    const content = document.querySelector('.app-content');
    content?.classList.add('ee-shake');
    const scramble = window.setInterval(() => setNoise(corrupt('BLACKWALL BREACH DETECTED')), 80);
    const end = window.setTimeout(() => {
      window.clearInterval(scramble);
      content?.classList.remove('ee-shake');
      setBreaching(false);
    }, 1200);
    return () => {
      content?.classList.remove('ee-shake');
      window.clearInterval(scramble);
      window.clearTimeout(end);
    };
  }, []);

  return breaching ? (
    <div className="ee-blackwall-breach" aria-hidden="true">
      <strong>{noise}</strong>
    </div>
  ) : (
    <div className="ee-blackwall" role="status">
      <small>// Blackwall</small>
      <strong>{t.search.blackwallTitle}</strong>
      <span>{t.search.blackwallText}</span>
    </div>
  );
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function searchText({ card, printing, set }: CatalogEntry) {
  return normalize(
    [
      card.name,
      card.subtitle,
      printing.localizedName,
      printing.number,
      printing.artist,
      set.name,
      card.rulesText,
      ...(card.classifications ?? []),
    ]
      .filter(Boolean)
      .join(' '),
  );
}

/** Texte de recherche qui désigne exactement une carte (tous ses mots sont dans son nom). */
const cardQuery = (card: Card) => (card.subtitle ? `${card.name} ${card.subtitle}` : card.name);

/** Met en évidence les mots tapés dans le nom proposé (sans tenir compte des accents). */
function Highlight({ text, query }: { text: string; query: string }) {
  const words = norm(query)
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  // Repère caractère par caractère : norm garde une lettre par lettre de base, et efface
  // espaces et ponctuation, qu'on remplace par un espace pour ne pas décaler les positions.
  const chars = [...text];
  const folded = chars.map((char) => norm(char) || ' ').join('');
  if (words.length === 0 || folded.length !== chars.length) {
    return <>{text}</>;
  }
  const marked = new Array<boolean>(chars.length).fill(false);
  for (const word of words) {
    for (let at = folded.indexOf(word); at >= 0; at = folded.indexOf(word, at + 1)) {
      marked.fill(true, at, at + word.length);
    }
  }
  const parts: { text: string; mark: boolean }[] = [];
  chars.forEach((char, index) => {
    const last = parts.at(-1);
    if (last && last.mark === marked[index]) {
      last.text += char;
    } else {
      parts.push({ text: char, mark: marked[index] });
    }
  });
  return (
    <>
      {parts.map((part, index) =>
        part.mark ? <mark key={index}>{part.text}</mark> : <span key={index}>{part.text}</span>,
      )}
    </>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Filtres repliés par défaut sur mobile pour laisser la place aux résultats.
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 601px)').matches,
  );

  const { countVariant, isWished } = useCollection();
  const { preferredCardLanguage } = useSettings();
  const t = useT();

  const query = params.get('q') ?? '';
  // Le champ garde sa propre valeur : l'adresse se met à jour avec un temps de retard, et
  // certains claviers (Samsung) perdent le mot en cours si la valeur affichée recule.
  const [draft, setDraft] = useState(query);
  // Autocomplétion : noms de cartes proposés pendant la saisie.
  const [suggestOpen, setSuggestOpen] = useState(false);
  /** Suggestion mise en avant au clavier (flèches), -1 = aucune. */
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(
    () =>
      draft.trim().length >= 2
        ? searchCards(draft, 6).filter((card) => cardQuery(card) !== draft)
        : [],
    [draft],
  );
  const showSuggestions = suggestOpen && suggestions.length > 0;

  function chooseSuggestion(card: Card) {
    setDraft(cardQuery(card));
    update({ q: cardQuery(card) });
    setSuggestOpen(false);
    setActiveSuggestion(-1);
    inputRef.current?.blur();
  }

  function onSuggestKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSuggestOpen(false);
      setActiveSuggestion(-1);
      return;
    }
    if (!showSuggestions) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setSuggestOpen(true);
      }
      return;
    }
    const count = suggestions.length;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // De -1 (le champ) à la dernière option, en boucle.
      setActiveSuggestion((current) => {
        const next = current + step;
        return next >= count ? -1 : next < -1 ? count - 1 : next;
      });
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    }
  }

  const colors = params.get('color')?.split(',').filter(Boolean) ?? [];
  const types = params.get('type')?.split(',').filter(Boolean) ?? [];
  const costs = params.get('cost')?.split(',').filter(Boolean) ?? [];
  const rarity = params.get('rarity') ?? '';
  const ownership = params.get('own') ?? '';
  const foilOnly = params.get('foil') === '1';
  const sort = params.get('sort') ?? '';

  const indexed = useMemo(
    () =>
      getCatalogEntries(preferredCardLanguage).map((entry, order) => ({
        ...entry,
        order,
        text: searchText(entry),
      })),
    [preferredCardLanguage],
  );

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    setParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
  }

  function toggleInList(key: string, list: string[], value: string) {
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    update({ [key]: next.join(',') });
  }

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const blackwall = terms.join(' ') === 'blackwall';
  const breathtaking = terms.join(' ').includes('breathtaking');

  const results = indexed.filter((entry) => {
    const { card, printing } = entry;
    if (terms.some((term) => !entry.text.includes(term))) {
      return false;
    }
    if (colors.length && !(card.color && colors.includes(card.color))) {
      return false;
    }
    if (types.length && !(card.cardType && types.includes(card.cardType))) {
      return false;
    }
    if (costs.length) {
      const cost = card.cost;
      const bucket = cost === undefined ? '' : cost >= 7 ? '7+' : String(cost);
      if (!costs.includes(bucket)) {
        return false;
      }
    }
    if (rarity && printing.rarity !== rarity) {
      return false;
    }
    if (foilOnly && printing.finish !== 'Foil') {
      return false;
    }
    const owned = countVariant(printing.variantKey) > 0;
    if (ownership === 'owned' && !owned) {
      return false;
    }
    if (ownership === 'missing' && owned) {
      return false;
    }
    if (ownership === 'wished' && !isWished(printing.id)) {
      return false;
    }
    return true;
  });

  if (sort === 'name') {
    results.sort(
      (a, b) =>
        a.card.name.localeCompare(b.card.name) ||
        (a.card.subtitle ?? '').localeCompare(b.card.subtitle ?? '') ||
        a.order - b.order,
    );
  } else if (sort === 'cost') {
    results.sort(
      (a, b) =>
        (a.card.cost ?? 99) - (b.card.cost ?? 99) ||
        a.card.name.localeCompare(b.card.name) ||
        a.order - b.order,
    );
  } else if (sort === 'rarity') {
    results.sort(
      (a, b) =>
        (RARITY_RANK.get(b.printing.rarity) ?? 0) - (RARITY_RANK.get(a.printing.rarity) ?? 0) ||
        compareNumbers(a.printing.number, b.printing.number) ||
        a.order - b.order,
    );
  }

  const activeFilterCount =
    colors.length +
    types.length +
    costs.length +
    (rarity ? 1 : 0) +
    (foilOnly ? 1 : 0) +
    (ownership ? 1 : 0);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">{t.search.eyebrow}</p>
        <h1 className="page-title">{t.nav.search}</h1>
      </header>

      <section className="controls search-suggest">
        <input
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder={t.search.placeholder}
          value={draft}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="search-suggestions"
          aria-activedescendant={
            showSuggestions && activeSuggestion >= 0
              ? `suggestion-${suggestions[activeSuggestion].id}`
              : undefined
          }
          onChange={(event) => {
            setDraft(event.target.value);
            update({ q: event.target.value });
            setSuggestOpen(true);
            setActiveSuggestion(-1);
          }}
          onFocus={() => setSuggestOpen(true)}
          onBlur={() => {
            setSuggestOpen(false);
            setActiveSuggestion(-1);
          }}
          onKeyDown={onSuggestKey}
        />
        {showSuggestions && (
          // Modèle ARIA combobox : le focus reste dans le champ, les flèches parcourent
          // les options, Entrée choisit, Échap ferme.
          <ul id="search-suggestions" className="search-suggestions" role="listbox">
            {suggestions.map((card, index) => {
              const printing = getPrintingsByCard(card.id)[0];
              return (
                <li
                  key={card.id}
                  id={`suggestion-${card.id}`}
                  role="option"
                  aria-selected={index === activeSuggestion}
                  className={index === activeSuggestion ? 'active' : undefined}
                  // Avant la perte du focus du champ, qui fermerait la liste.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => chooseSuggestion(card)}
                >
                  <span className="suggestion-thumb">
                    {printing && (
                      <img
                        src={getThumbUrl(getPrintingInLanguage(printing, preferredCardLanguage))}
                        alt=""
                      />
                    )}
                  </span>
                  <span className="suggestion-text">
                    <strong>
                      <Highlight text={card.name} query={draft} />
                    </strong>
                    {card.subtitle && (
                      <small>
                        <Highlight text={card.subtitle} query={draft} />
                      </small>
                    )}
                  </span>
                  <span className="suggestion-meta">
                    {card.color && (
                      <i className="color-dot" style={{ background: COLOR_HEX[card.color] }} />
                    )}
                    {card.cardType && t.cardTypes[card.cardType]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="btn filters-toggle"
        aria-expanded={filtersOpen}
        aria-controls="search-filters"
        onClick={() => setFiltersOpen((open) => !open)}
      >
        {filtersOpen ? t.search.hideFilters : t.search.filters}
        {activeFilterCount > 0 && <span className="filters-count">{activeFilterCount}</span>}
      </button>

      <section
        id="search-filters"
        className="search-filters"
        aria-label={t.search.filters}
        hidden={!filtersOpen}
      >
        <div className="filter-row">
          <span className="filter-label">{t.search.color}</span>
          <div className="filters">
            {CARD_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={colors.includes(color) ? 'active' : ''}
                aria-pressed={colors.includes(color)}
                onClick={() => toggleInList('color', colors, color)}
              >
                <span className="color-dot" style={{ background: COLOR_HEX[color] }} />
                {t.colors[color]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">{t.search.type}</span>
          <div className="filters">
            {CARD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={types.includes(type) ? 'active' : ''}
                aria-pressed={types.includes(type)}
                onClick={() => toggleInList('type', types, type)}
              >
                {t.cardTypes[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">{t.card.cost}</span>
          <div className="filters">
            {COSTS.map((cost) => (
              <button
                key={cost}
                type="button"
                className={costs.includes(cost) ? 'active cost-chip' : 'cost-chip'}
                aria-pressed={costs.includes(cost)}
                onClick={() => toggleInList('cost', costs, cost)}
              >
                {cost}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">{t.nav.collection}</span>
          <div className="filters">
            {OWNERSHIP.map((item) => (
              <button
                key={item.id}
                type="button"
                className={ownership === item.id ? 'active' : ''}
                aria-pressed={ownership === item.id}
                onClick={() => update({ own: item.id })}
              >
                {t.filters[item.key]}
              </button>
            ))}
            <button
              type="button"
              className={foilOnly ? 'active' : ''}
              aria-pressed={foilOnly}
              onClick={() => update({ foil: foilOnly ? '' : '1' })}
            >
              {t.search.foilOnly}
            </button>
          </div>
        </div>

        <div className="filter-row filter-selects">
          <label>
            <span className="filter-label">{t.card.rarity}</span>
            <select
              className="select"
              value={rarity}
              onChange={(event) => update({ rarity: event.target.value })}
            >
              <option value="">{t.filters.all}</option>
              {RARITIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="filter-label">{t.search.sort}</span>
            <select
              className="select"
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {t.search.sorts[option.key]}
                </option>
              ))}
            </select>
          </label>

          {(activeFilterCount > 0 || query) && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                // Le champ a sa propre valeur (draft) : on la vide aussi.
                setDraft('');
                setParams({}, { replace: true });
              }}
            >
              {t.search.reset}
            </button>
          )}
        </div>
      </section>

      {breathtaking && (
        <div className="ee-breathtaking" role="status">
          <small>Keanu says</small>
          <strong>No, YOU'RE breathtaking!</strong>
        </div>
      )}

      {blackwall && <BlackwallBreach />}

      {!blackwall && (
        <div className="results-count">
          {plural(results.length, t.search.result, t.search.results)}
        </div>
      )}

      {results.length > 0 ? (
        <>
          <CardGrid browse={results.map((entry) => entry.printing.id)}>
            {results.slice(0, visibleCount).map(({ card, printing, set }) => (
              <CardTile
                key={printing.id}
                card={card}
                printing={printing}
                quantity={countVariant(printing.variantKey)}
                wished={isWished(printing.id)}
                meta={`${set.code} #${printing.number} • ${printing.rarity}`}
              />
            ))}
          </CardGrid>

          {visibleCount < results.length && (
            <div className="load-more">
              <button
                type="button"
                className="btn"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                {t.search.showMore(results.length - visibleCount)}
              </button>
            </div>
          )}
        </>
      ) : blackwall || breathtaking ? null : (
        <div className="empty-state">
          <strong>{t.search.emptyTitle}</strong>
          <p>{t.search.emptyText}</p>
        </div>
      )}
    </main>
  );
}
