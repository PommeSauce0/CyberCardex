import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { downloadFile } from '../collection/exportFiles';
import {
  getCardById,
  getPrintingInLanguage,
  getPrintingsByCard,
  getThumbUrl,
} from '../data/catalog';
import { searchCards } from '../data/cardSearch';
import { COLOR_HEX, percent } from '../data/labels';
import type { Card, CardLanguage, Printing } from '../data/types';
import { deckFileName, deckToText } from '../decks/exportDeck';
import { parseDeck } from '../decks/parseDeck';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';
import { backupRaw, createId, readJson, writeJson } from '../storage/storage';

import './DeckPage.css';

const STORAGE_KEY = 'cybercardex.decks.v1';

type DeckCard = { cardId: string; quantity: number };
type SavedDeck = { id: string; name: string; cards: DeckCard[]; updatedAt: string };

const isDeckCard = (entry: unknown): entry is DeckCard => {
  const card = entry as Partial<DeckCard> | null;
  return (
    typeof card?.cardId === 'string' &&
    !!getCardById(card.cardId) &&
    typeof card.quantity === 'number' &&
    Number.isInteger(card.quantity) &&
    card.quantity > 0
  );
};

/** Decks enregistrés, sans les entrées invalides ni les cartes absentes du catalogue. */
function loadDecks(): SavedDeck[] {
  const stored = readJson<unknown>(STORAGE_KEY);
  if (stored === undefined) {
    return [];
  }
  let dropped = !Array.isArray(stored);
  const decks = (Array.isArray(stored) ? stored : []).flatMap((raw) => {
    const deck = raw as Partial<SavedDeck> | null;
    if (typeof deck?.id !== 'string' || !Array.isArray(deck.cards)) {
      dropped = true;
      return [];
    }
    const cards = deck.cards.filter(isDeckCard);
    dropped ||= cards.length !== deck.cards.length;
    return [
      {
        id: deck.id,
        name: typeof deck.name === 'string' ? deck.name : '',
        cards,
        updatedAt: typeof deck.updatedAt === 'string' ? deck.updatedAt : new Date().toISOString(),
      },
    ];
  });
  if (dropped) {
    backupRaw(STORAGE_KEY, 'en partie invalide');
  }
  return decks;
}

/** Version affichée (et mise en wishlist) : la série principale d'abord, puis la Beta. */
const SET_PRIORITY = ['welcome-to-night-city-retail', 'welcome-to-night-city-beta'];

function displayPrinting(card: Card, language: CardLanguage): Printing | undefined {
  const rank = (printing: Printing) => {
    const index = SET_PRIORITY.indexOf(printing.setId);
    return index < 0 ? SET_PRIORITY.length : index;
  };
  const best = [...getPrintingsByCard(card.id)].sort((a, b) => rank(a) - rank(b))[0];
  return best && getPrintingInLanguage(best, language);
}

const TYPE_ORDER = ['Legend', 'Unit', 'Gear', 'Program'];
/** Rang d'un type de carte ; un type inconnu (nouvelle série) passe après les autres. */
const typeRank = (type?: string) => {
  const rank = TYPE_ORDER.indexOf(type ?? '');
  return rank === -1 ? TYPE_ORDER.length : rank;
};

export default function DeckPage() {
  const t = useT();
  const { countCard, isWished, toggleWish } = useCollection();
  const { preferredCardLanguage } = useSettings();

  const [decks, setDecks] = useState<SavedDeck[]>(loadDecks);
  const [currentId, setCurrentId] = useState<string | undefined>(() => decks[0]?.id);
  const [query, setQuery] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importUnknown, setImportUnknown] = useState<string[]>([]);
  const [wishAdded, setWishAdded] = useState(0);
  const [copyState, setCopyState] = useState<'copied' | 'failed'>();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => writeJson(STORAGE_KEY, decks), [decks]);

  const deck = decks.find((item) => item.id === currentId);
  const suggestions = useMemo(() => searchCards(query), [query]);

  /** Modifie le deck ouvert (en le créant s'il n'existe pas encore). */
  function updateDeck(change: (deck: SavedDeck) => SavedDeck) {
    setWishAdded(0);
    setCopyState(undefined);
    const id = currentId ?? createId();
    if (!currentId) {
      setCurrentId(id);
    }
    setDecks((current) => {
      const base: SavedDeck = current.find((item) => item.id === id) ?? {
        id,
        name: '',
        cards: [],
        updatedAt: '',
      };
      const next = { ...change(base), updatedAt: new Date().toISOString() };
      return [next, ...current.filter((item) => item.id !== id)];
    });
  }

  function setQuantity(cardId: string, quantity: number) {
    updateDeck((current) => {
      const others = current.cards.filter((entry) => entry.cardId !== cardId);
      const index = current.cards.findIndex((entry) => entry.cardId === cardId);
      if (quantity <= 0) {
        return { ...current, cards: others };
      }
      const cards = [...current.cards];
      if (index < 0) {
        cards.push({ cardId, quantity });
      } else {
        cards[index] = { cardId, quantity };
      }
      return { ...current, cards };
    });
  }

  function addCard(card: Card) {
    const existing = deck?.cards.find((entry) => entry.cardId === card.id);
    setQuantity(card.id, (existing?.quantity ?? 0) + 1);
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

  function newDeck() {
    setCurrentId(undefined);
    setQuery('');
    setImportUnknown([]);
    setWishAdded(0);
  }

  function deleteDeck() {
    if (deck && window.confirm(t.decks.confirmDelete(deck.name || t.decks.untitled))) {
      setDecks((current) => current.filter((item) => item.id !== deck.id));
      newDeck();
    }
  }

  // Lignes du deck : légendes d'abord, puis par type et par nom.
  const rows = (deck?.cards ?? [])
    .flatMap((entry) => {
      const card = getCardById(entry.cardId);
      if (!card) {
        return [];
      }
      const owned = countCard(card.id);
      return [
        {
          card,
          quantity: entry.quantity,
          owned,
          missing: Math.max(0, entry.quantity - owned),
          printing: displayPrinting(card, preferredCardLanguage),
        },
      ];
    })
    .sort(
      (a, b) =>
        typeRank(a.card.cardType) - typeRank(b.card.cardType) ||
        a.card.name.localeCompare(b.card.name),
    );

  const total = rows.reduce((sum, row) => sum + row.quantity, 0);
  const have = rows.reduce((sum, row) => sum + Math.min(row.owned, row.quantity), 0);
  const missingRows = rows.filter((row) => row.missing > 0);

  const deckName = deck?.name || t.decks.untitled;
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

  function exportFile() {
    void downloadFile(deckFileName(deckName), exportText(), 'text/plain');
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
      <Link className="back" to="/collection">
        ← {t.home.myCollection}
      </Link>
      <header className="page-header">
        <p className="eyebrow">{t.decks.eyebrow}</p>
        <h1 className="page-title">{t.decks.title}</h1>
        <p className="page-subtitle">{t.decks.subtitle}</p>
      </header>

      <section className="deck-saved">
        <span className="deck-label">{t.decks.saved}</span>
        <div className="deck-saved-list">
          {decks.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === currentId ? 'active' : ''}
              onClick={() => {
                setCurrentId(item.id);
                setCopyState(undefined);
                setQuery('');
                setImportUnknown([]);
                setWishAdded(0);
              }}
            >
              {item.name || t.decks.untitled}
            </button>
          ))}
          <button
            type="button"
            className={currentId && deck ? 'deck-new' : 'deck-new active'}
            onClick={newDeck}
          >
            + {t.decks.new}
          </button>
        </div>
      </section>

      <section className="deck-editor">
        <input
          className="deck-input"
          value={deck?.name ?? ''}
          maxLength={40}
          placeholder={t.decks.namePlaceholder}
          onChange={(event) => {
            const name = event.target.value;
            updateDeck((current) => ({ ...current, name }));
          }}
        />

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
                const inDeck = deck?.cards.find((entry) => entry.cardId === card.id)?.quantity;
                return (
                  <li key={card.id}>
                    <button type="button" onClick={() => addCard(card)}>
                      {printing && <img src={getThumbUrl(printing)} alt="" />}
                      <span className="deck-suggestion-text">
                        <strong>{card.name}</strong>
                        {card.subtitle && <span>{card.subtitle}</span>}
                        <small>
                          {card.color && (
                            <i
                              className="color-dot"
                              style={{ background: COLOR_HEX[card.color] }}
                            />
                          )}
                          {card.cardType && t.cardTypes[card.cardType]}
                          {' • '}
                          {owned > 0 ? t.decks.ownedCount(owned) : t.decks.notOwned}
                          {inDeck ? ` • ${t.decks.inDeck(inDeck)}` : ''}
                        </small>
                      </span>
                      <span className="deck-suggestion-add" aria-hidden="true">
                        +
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="deck-actions">
          <button type="button" className="btn" onClick={() => setImportOpen((open) => !open)}>
            {t.decks.importToggle}
          </button>
          {rows.length > 0 && (
            <>
              <button type="button" className="btn" onClick={() => void copyList()}>
                {copyState === 'copied' ? t.decks.copied : t.decks.copy}
              </button>
              <button type="button" className="btn" onClick={exportFile}>
                {t.decks.exportFile}
              </button>
            </>
          )}
          {deck && (
            <button type="button" className="btn btn-danger" onClick={deleteDeck}>
              {t.decks.delete}
            </button>
          )}
        </div>

        {copyState === 'failed' && <p className="deck-copy-failed">{t.decks.copyFailed}</p>}
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
      </section>

      {rows.length > 0 ? (
        <section className="deck-result">
          <div className="stats-grid deck-stats">
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
            <div className="stat">
              <span className="stat-label">{t.decks.missing}</span>
              <strong>{total - have}</strong>
              <small>{t.decks.missingCards(missingRows.length)}</small>
            </div>
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

          <ul className="deck-list">
            {rows.map((row) => (
              <li key={row.card.id} className={row.missing > 0 ? 'missing' : 'complete'}>
                <Link
                  to={row.printing ? `/cards/${row.printing.id}` : '#'}
                  className="deck-row-card"
                >
                  {row.printing && <img src={getThumbUrl(row.printing)} alt="" />}
                  <span>
                    <strong>{row.card.name}</strong>
                    {row.card.subtitle && <small>{row.card.subtitle}</small>}
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
                    onClick={() => setQuantity(row.card.id, row.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="empty-state">
          <strong>{t.decks.emptyTitle}</strong>
          <p>{t.decks.emptyText}</p>
        </div>
      )}
    </main>
  );
}
