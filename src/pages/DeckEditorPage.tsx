import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import VersionPicker from '../components/VersionPicker';
import { downloadFile } from '../collection/exportFiles';
import { getPrintingsByCard, getThumbUrl } from '../data/catalog';
import { searchCards } from '../data/cardSearch';
import { CARD_COLORS, CARD_TYPES, COLOR_HEX, formatPrice, percent } from '../data/labels';
import { cardmarketPriceDate, cheapestCardPrice } from '../data/links';
import { usePriceData } from '../data/livePrices';
import type { Card, CardColor, CardType, Printing } from '../data/types';
import { deckFileName, deckToText } from '../decks/exportDeck';
import {
  DECK_SORTS,
  LEGEND_COUNT,
  MAX_CARDS,
  MIN_CARDS,
  costCurve,
  deckCounts,
  deckIssues,
  groupLines,
  maxCopies,
  ramByColor,
  sortLines,
  type DeckGroup,
  type DeckIssue,
  type DeckLine,
} from '../decks/deckRules';
import {
  cardVersions,
  deckLines,
  displayPrinting,
  linePrinting,
  saveDecks,
  useDecks,
  type SavedDeck,
} from '../decks/deckStorage';
import { parseDeck } from '../decks/parseDeck';
import { useT } from '../i18n/useT';
import { browseState } from '../navigation/browse';
import BackLink from '../navigation/BackLink';
import { previousPage } from '../navigation/backTrail';
import { useSettings } from '../settings/SettingsContext';

import './DeckPage.css';

type EditorState = { unknown?: string[] } | null;

export default function DeckEditorPage() {
  const t = useT();
  const { deckId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as EditorState;
  const { countCard, isWished, toggleWish } = useCollection();
  const { preferredCardLanguage, deckSort, setDeckSort, cardmarket } = useSettings();

  usePriceData();
  const [decks, changeDecks] = useDecks();
  const [query, setQuery] = useState('');
  /** Carte dont on choisit la version (panneau ouvert). */
  const [picking, setPicking] = useState<Card>();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importUnknown, setImportUnknown] = useState<string[]>(state?.unknown ?? []);
  const [wishAdded, setWishAdded] = useState(0);
  const [copyState, setCopyState] = useState<'copied' | 'failed' | 'saved' | 'exportFailed'>();
  const searchRef = useRef<HTMLInputElement>(null);

  const deck = decks.find((item) => item.id === deckId);
  const suggestions = useMemo(() => searchCards(query), [query]);

  /** Après suppression : retour à la page précédente, sinon à la liste des decks. */
  function backToList() {
    if (previousPage()) {
      navigate(-1);
    } else {
      navigate('/decks', { replace: true });
    }
  }

  if (!deck) {
    return <Navigate to="/decks" replace />;
  }

  function updateDeck(change: (deck: SavedDeck) => SavedDeck) {
    setWishAdded(0);
    setCopyState(undefined);
    changeDecks((current) =>
      current.map((item) =>
        item.id === deckId ? { ...change(item), updatedAt: new Date().toISOString() } : item,
      ),
    );
  }

  function setQuantity(cardId: string, quantity: number) {
    updateDeck((current) => {
      if (quantity <= 0) {
        return { ...current, cards: current.cards.filter((entry) => entry.cardId !== cardId) };
      }
      const cards = [...current.cards];
      const index = cards.findIndex((entry) => entry.cardId === cardId);
      if (index < 0) {
        cards.push({ cardId, quantity });
      } else {
        cards[index] = { ...cards[index], quantity };
      }
      return { ...current, cards };
    });
  }

  function setVersion(cardId: string, printing: Printing) {
    updateDeck((current) => ({
      ...current,
      cards: current.cards.map((entry) =>
        entry.cardId === cardId ? { ...entry, printingId: printing.id } : entry,
      ),
    }));
    setPicking(undefined);
  }

  const quantityOf = (cardId: string) =>
    deck.cards.find((entry) => entry.cardId === cardId)?.quantity ?? 0;

  function addCard(card: Card) {
    setQuantity(card.id, quantityOf(card.id) + 1);
    setQuery('');
    searchRef.current?.focus();
  }

  function importList() {
    const parsed = parseDeck(importText);
    updateDeck((current) => {
      const cards = [...current.cards];
      for (const line of parsed.lines) {
        const index = cards.findIndex((entry) => entry.cardId === line.card.id);
        if (index < 0) {
          cards.push({ cardId: line.card.id, quantity: line.quantity });
        } else {
          cards[index] = { ...cards[index], quantity: cards[index].quantity + line.quantity };
        }
      }
      return { ...current, cards };
    });
    setImportUnknown(parsed.unknown);
    if (parsed.unknown.length === 0) {
      setImportText('');
      setImportOpen(false);
    }
  }

  function deleteDeck() {
    if (window.confirm(t.decks.confirmDelete(deck!.name || t.decks.untitled))) {
      // Sauvegarde directe puis départ : l'éditeur ne se réaffiche pas sans son deck.
      saveDecks(decks.filter((item) => item.id !== deckId));
      backToList();
    }
  }

  const lines = deckLines(deck);
  const counts = deckCounts(lines);
  const issues = deckIssues(lines);
  const ram = ramByColor(lines);
  const ramShort = new Set(issues.flatMap((issue) => (issue.kind === 'ram' ? [issue.color] : [])));
  const ramColors = CARD_COLORS.filter(
    (color) => ram[color] !== undefined || lines.some((line) => line.card.color === color),
  );

  const rows = sortLines(
    lines.map((line) => {
      const owned = countCard(line.card.id);
      return {
        ...line,
        owned,
        missing: Math.max(0, line.quantity - owned),
        printing: linePrinting(line.card, line.printingId, preferredCardLanguage),
      };
    }),
    deckSort,
  );

  /** Intertitre d'un groupe de la liste, selon le tri choisi. */
  function groupTitle(group: DeckGroup<DeckLine>) {
    const value = group.value;
    if (group.legends) {
      return t.decks.groupLegends;
    }
    switch (deckSort) {
      case 'type':
        return value ? t.cardTypes[value as CardType] : t.decks.otherType;
      case 'color':
        return value ? t.colors[value as CardColor] : t.decks.otherType;
      case 'ram':
        return value === undefined ? t.decks.groupNoRam : `RAM ${value}`;
      case 'cost':
        return value === undefined ? t.decks.groupNoCost : `${t.decks.sorts.cost} ${value}`;
      case 'name':
        return t.decks.groupCards;
    }
  }

  // Fiche ouverte depuis le deck : ‹ › passent d'une carte du deck à l'autre (ordre du tri).
  const deckBrowse = groupLines(rows, deckSort).flatMap((group) =>
    group.lines.flatMap((row) => (row.printing ? [row.printing.id] : [])),
  );

  const total = counts.legends + counts.cards;
  const have = rows.reduce((sum, row) => sum + Math.min(row.owned, row.quantity), 0);
  const missingRows = rows.filter((row) => row.missing > 0);

  // Coût pour compléter : l'exemplaire le moins cher de chaque carte manquante (toutes versions).
  let completeCost = 0;
  let noPrice = 0;
  for (const row of missingRows) {
    const price = cheapestCardPrice(row.card, getPrintingsByCard(row.card.id));
    if (price) {
      completeCost += price * row.missing;
    } else {
      noPrice++;
    }
  }

  const nonLegends = lines.filter((line) => line.card.cardType !== 'Legend');
  const curve = costCurve(lines);
  const curveMax = Math.max(1, ...curve.map((entry) => entry.count));
  const byColor = CARD_COLORS.map((color) => ({
    color,
    count: nonLegends
      .filter((line) => line.card.color === color)
      .reduce((sum, line) => sum + line.quantity, 0),
  })).filter((entry) => entry.count > 0);
  const byType = CARD_TYPES.filter((type) => type !== 'Legend')
    .map((type) => ({
      type,
      count: nonLegends
        .filter((line) => line.card.cardType === type)
        .reduce((sum, line) => sum + line.quantity, 0),
    }))
    .filter((entry) => entry.count > 0);

  const colorName = (color: keyof typeof t.colors) => t.colors[color];
  function issueText(issue: DeckIssue) {
    switch (issue.kind) {
      case 'legendCount':
        return t.decks.issueLegendCount(issue.count);
      case 'legendName':
        return t.decks.issueLegendName(issue.name);
      case 'cardCount':
        return t.decks.issueCardCount(issue.count);
      case 'copies':
        return t.decks.issueCopies(issue.card.name, issue.quantity, issue.max);
      case 'ram':
        return t.decks.issueRam(issue.card.name, colorName(issue.color), issue.need, issue.have);
    }
  }

  const deckName = deck.name || t.decks.untitled;
  const exportText = () =>
    deckToText(deckName, rows, (type) => (type ? t.cardTypes[type] : t.decks.otherType));

  async function copyList() {
    try {
      await navigator.clipboard.writeText(exportText());
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }

  function addMissingToWishlist() {
    let added = 0;
    for (const row of missingRows) {
      if (row.printing && !isWished(row.printing.id)) {
        toggleWish(row.printing.id);
        added++;
      }
    }
    setWishAdded(added || -1);
  }

  return (
    <main className="page deck-page">
      <BackLink fallbackTo="/decks" fallbackLabel={t.decks.saved} />

      <header className="deck-header">
        <input
          className="deck-name-input"
          value={deck.name}
          maxLength={40}
          placeholder={t.decks.newDeck}
          aria-label={t.decks.namePlaceholder}
          onChange={(event) => {
            const name = event.target.value;
            updateDeck((current) => ({ ...current, name }));
          }}
        />
        <div className="deck-counters">
          <span className={counts.legends === LEGEND_COUNT ? 'ok' : 'warn'}>
            {t.decks.legendsCount(counts.legends)}
          </span>
          <span className={counts.cards >= MIN_CARDS && counts.cards <= MAX_CARDS ? 'ok' : 'warn'}>
            {t.decks.cardsCount(counts.cards)}
          </span>
          {lines.length > 0 && issues.length === 0 && (
            <span className="ok legal">{t.decks.legal}</span>
          )}
        </div>
        {ramColors.length > 0 && (
          <div className="deck-ram" title={t.decks.ramTitle}>
            <span className="deck-ram-label">RAM</span>
            {ramColors.map((color) => (
              <span key={color} className={ramShort.has(color) ? 'warn' : ''}>
                <i className="color-dot" style={{ background: COLOR_HEX[color] }} />
                {t.decks.ram(colorName(color), ram[color] ?? 0)}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="deck-actions">
        <button type="button" className="btn" onClick={() => setImportOpen((open) => !open)}>
          {t.decks.importShort}
        </button>
        <button
          type="button"
          className="btn"
          disabled={rows.length === 0}
          onClick={() => void copyList()}
        >
          {copyState === 'copied' ? t.decks.copied : t.decks.copy}
        </button>
        <button
          type="button"
          className="btn"
          disabled={rows.length === 0}
          onClick={() =>
            void downloadFile(deckFileName(deckName), exportText(), 'text/plain').then(
              (saved) => saved && setCopyState('saved'),
              () => setCopyState('exportFailed'),
            )
          }
        >
          {copyState === 'saved' ? t.decks.fileSaved : t.decks.exportFile}
        </button>
        <button type="button" className="btn btn-danger" onClick={deleteDeck}>
          {t.decks.delete}
        </button>
      </div>

      {copyState === 'failed' && <p className="deck-copy-failed">{t.decks.copyFailed}</p>}
      {copyState === 'exportFailed' && (
        <p className="deck-copy-failed">{t.settings.exportFailed}</p>
      )}
      {importOpen && (
        <div className="deck-import">
          <textarea
            className="deck-input deck-text"
            value={importText}
            rows={6}
            placeholder={t.decks.textPlaceholder}
            spellCheck={false}
            onChange={(event) => setImportText(event.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={!importText.trim()}
            onClick={importList}
          >
            {t.decks.importButton}
          </button>
        </div>
      )}
      {importUnknown.length > 0 && (
        <div className="deck-unknown" role="status">
          <strong>{t.decks.unknown(importUnknown.length)}</strong>
          <ul>
            {importUnknown.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {lines.length > 0 && issues.length > 0 && (
        <ul className="deck-issues" role="status">
          {issues.map((issue, index) => (
            <li key={index}>{issueText(issue)}</li>
          ))}
        </ul>
      )}

      {/* Ajout par le nom, avec suggestions pour choisir la bonne carte. */}
      <div className="deck-search">
        <input
          ref={searchRef}
          className="deck-input"
          type="search"
          value={query}
          placeholder={t.decks.searchPlaceholder}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() && (
          <ul className="deck-suggestions" role="listbox">
            {suggestions.length === 0 && <li className="deck-no-match">{t.decks.noMatch}</li>}
            {suggestions.map((card) => {
              const printing = displayPrinting(card, preferredCardLanguage);
              const owned = countCard(card.id);
              const inDeck = quantityOf(card.id);
              const full = inDeck >= maxCopies(card);
              return (
                <li key={card.id}>
                  <button type="button" disabled={full} onClick={() => addCard(card)}>
                    {printing && <img src={getThumbUrl(printing)} alt="" />}
                    <span className="deck-suggestion-text">
                      <strong>{card.name}</strong>
                      {card.subtitle && <span>{card.subtitle}</span>}
                      <small>
                        {card.color && (
                          <i className="color-dot" style={{ background: COLOR_HEX[card.color] }} />
                        )}
                        {card.cardType && t.cardTypes[card.cardType]}
                        {' • '}
                        {owned > 0 ? t.decks.ownedCount(owned) : t.decks.notOwned}
                        {inDeck ? ` • ${t.decks.inDeck(inDeck)}` : ''}
                      </small>
                    </span>
                    <span
                      className={full ? 'deck-suggestion-add full' : 'deck-suggestion-add'}
                      aria-hidden="true"
                    >
                      {full ? t.decks.maxReached(maxCopies(card)) : '+'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows.length > 0 ? (
        <>
          <div className="deck-sort" role="group" aria-label={t.decks.sortBy}>
            <span className="deck-label">{t.decks.sortBy}</span>
            {DECK_SORTS.map((sort) => (
              <button
                key={sort}
                type="button"
                className={sort === deckSort ? 'active' : ''}
                aria-pressed={sort === deckSort}
                onClick={() => setDeckSort(sort)}
              >
                {t.decks.sorts[sort]}
              </button>
            ))}
          </div>

          {groupLines(rows, deckSort).map((group) => (
            <section key={group.legends ? 'legends' : String(group.value)} className="deck-group">
              <h2 className="deck-group-title">
                {groupTitle(group)}
                <small>{group.count}</small>
              </h2>
              <ul className="deck-list">
                {group.lines.map((row) => (
                  <li key={row.card.id} className={row.missing > 0 ? 'missing' : 'complete'}>
                    {/* Miniature : touche pour changer de version (si la carte en a plusieurs). */}
                    {cardVersions(row.card, preferredCardLanguage).length > 1 ? (
                      <button
                        type="button"
                        className="deck-row-thumb"
                        aria-label={t.decks.versionChange(row.card.name)}
                        onClick={() => setPicking(row.card)}
                      >
                        {row.printing && <img src={getThumbUrl(row.printing)} alt="" />}
                        <span aria-hidden="true">⇄</span>
                      </button>
                    ) : (
                      <span className="deck-row-thumb">
                        {row.printing && <img src={getThumbUrl(row.printing)} alt="" />}
                      </span>
                    )}
                    <Link
                      to={row.printing ? `/cards/${row.printing.id}` : '#'}
                      state={browseState(deckBrowse)}
                      className="deck-row-card"
                    >
                      <span>
                        <strong>{row.card.name}</strong>
                        {row.card.subtitle && <small>{row.card.subtitle}</small>}
                        <span className="deck-row-meta">
                          {row.card.color && (
                            <i
                              className="color-dot"
                              style={{ background: COLOR_HEX[row.card.color] }}
                            />
                          )}
                          {row.card.cardType && t.cardTypes[row.card.cardType]}
                          {row.card.cost !== undefined &&
                            ` • ${t.decks.sorts.cost} ${row.card.cost}`}
                          {row.card.ram !== undefined && ` • RAM ${row.card.ram}`}
                        </span>
                        <em>
                          {row.owned === 0
                            ? `${t.decks.notOwned} • ${t.decks.rowNone(row.missing)}`
                            : row.missing > 0
                              ? t.decks.rowMissing(row.owned, row.missing)
                              : t.decks.rowOk(row.owned)}
                          {row.printing && isWished(row.printing.id) && ' • ★'}
                        </em>
                      </span>
                    </Link>
                    <div className="deck-stepper">
                      <button
                        type="button"
                        aria-label={t.decks.less(row.card.name)}
                        onClick={() => setQuantity(row.card.id, row.quantity - 1)}
                      >
                        −
                      </button>
                      <strong>{row.quantity}</strong>
                      <button
                        type="button"
                        aria-label={t.decks.more(row.card.name)}
                        disabled={row.quantity >= maxCopies(row.card)}
                        onClick={() => setQuantity(row.card.id, row.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <details className="deck-stats-panel" open>
            <summary>{t.decks.stats}</summary>

            <div className={cardmarket === 'price' ? 'stats-grid deck-stats' : 'stats-grid'}>
              <div className="stat">
                <span className="stat-label">{t.decks.owned}</span>
                <strong>
                  {have} / {total}
                </strong>
                <div className="progress">
                  <div
                    className={have === total ? 'progress-value complete' : 'progress-value'}
                    style={{ width: `${percent(have, total)}%` }}
                  />
                </div>
              </div>
              {cardmarket === 'price' && (
                <div className="stat">
                  <span className="stat-label">{t.decks.completeCost}</span>
                  <strong>{formatPrice(completeCost)}</strong>
                  <small>
                    {t.decks.completeCostHint(cardmarketPriceDate())}
                    {noPrice > 0 && ` • ${t.decks.noPrice(noPrice)}`}
                  </small>
                </div>
              )}
            </div>

            {missingRows.length > 0 ? (
              <div className="deck-wish">
                <button type="button" className="btn" onClick={addMissingToWishlist}>
                  ☆ {t.decks.addMissing}
                </button>
                {wishAdded !== 0 && (
                  <span>{wishAdded > 0 ? t.decks.wishAdded(wishAdded) : t.decks.wishAlready}</span>
                )}
              </div>
            ) : (
              <p className="deck-complete">{t.decks.complete}</p>
            )}

            {curve.length > 0 && (
              <section className="deck-chart">
                <span className="deck-label">{t.decks.costCurve}</span>
                <div className="deck-curve">
                  {curve.map((entry) => (
                    <div key={entry.cost ?? 'none'} className="deck-curve-bar">
                      <small>{entry.count}</small>
                      <i style={{ height: `${(entry.count / curveMax) * 100}%` }} />
                      <span>{entry.cost ?? t.decks.noCost}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="deck-split">
              {byColor.length > 0 && (
                <section className="deck-chart">
                  <span className="deck-label">{t.decks.byColor}</span>
                  {byColor.map((entry) => (
                    <div key={entry.color} className="deck-share">
                      <span>{colorName(entry.color)}</span>
                      <i>
                        <b
                          style={{
                            width: `${percent(entry.count, counts.cards)}%`,
                            background: COLOR_HEX[entry.color],
                          }}
                        />
                      </i>
                      <small>{entry.count}</small>
                    </div>
                  ))}
                </section>
              )}
              {byType.length > 0 && (
                <section className="deck-chart">
                  <span className="deck-label">{t.decks.byType}</span>
                  {byType.map((entry) => (
                    <div key={entry.type} className="deck-share">
                      <span>{t.cardTypes[entry.type]}</span>
                      <i>
                        <b style={{ width: `${percent(entry.count, counts.cards)}%` }} />
                      </i>
                      <small>{entry.count}</small>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </details>
        </>
      ) : (
        <div className="empty-state">
          <strong>{t.decks.emptyTitle}</strong>
          <p>{t.decks.emptyText}</p>
        </div>
      )}

      {picking && (
        <VersionPicker
          card={picking}
          versions={cardVersions(picking, preferredCardLanguage)}
          current={rows.find((row) => row.card.id === picking.id)?.printing}
          onPick={(printing) => setVersion(picking.id, printing)}
          onClose={() => setPicking(undefined)}
        />
      )}
    </main>
  );
}
