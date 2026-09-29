import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { getThumbUrl } from '../data/catalog';
import { CARD_COLORS, COLOR_HEX, percent } from '../data/labels';
import { deckCounts, deckIssues } from '../decks/deckRules';
import {
  deckLines,
  deckNameFromText,
  linePrinting,
  isAbandoned,
  loadDecks,
  saveDecks,
  type SavedDeck,
} from '../decks/deckStorage';
import { parseDeck } from '../decks/parseDeck';
import { useT } from '../i18n/useT';
import BackLink from '../navigation/BackLink';
import { useSettings } from '../settings/SettingsContext';
import { createId } from '../storage/storage';

import './DeckPage.css';

/** Decks enregistrés, sans ceux créés puis laissés vides (nettoyés au passage). */
function loadKeptDecks() {
  const decks = loadDecks();
  const kept = decks.filter((deck) => !isAbandoned(deck));
  if (kept.length !== decks.length) {
    saveDecks(kept);
  }
  return kept.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export default function DeckListPage() {
  const t = useT();
  const navigate = useNavigate();
  const { countCard } = useCollection();
  const { preferredCardLanguage, deckCreation } = useSettings();

  const [decks] = useState(loadKeptDecks);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importUnknown, setImportUnknown] = useState<string[]>([]);

  /** Enregistre le nouveau deck tout de suite, puis ouvre son éditeur. */
  function openNew(deck: SavedDeck, unknown: string[] = []) {
    saveDecks([deck, ...decks]);
    navigate(`/decks/${deck.id}`, { state: { unknown } });
  }

  function createDeck() {
    if (deckCreation === 'guided') {
      navigate('/decks/new');
      return;
    }
    openNew({ id: createId(), name: '', cards: [], updatedAt: new Date().toISOString() });
  }

  function importDeck() {
    const parsed = parseDeck(importText);
    if (parsed.lines.length === 0) {
      setImportUnknown(parsed.unknown);
      return;
    }
    openNew(
      {
        id: createId(),
        name: deckNameFromText(importText),
        cards: parsed.lines.map((line) => ({ cardId: line.card.id, quantity: line.quantity })),
        updatedAt: new Date().toISOString(),
      },
      parsed.unknown,
    );
  }

  const importPanel = importOpen && (
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
        onClick={importDeck}
      >
        {t.decks.importCreate}
      </button>
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
    </div>
  );

  return (
    <main className="page deck-page">
      <BackLink fallbackTo="/collection" fallbackLabel={t.home.myCollection} />
      <header className="page-header">
        <p className="eyebrow">{t.decks.eyebrow}</p>
        <h1 className="page-title">{t.decks.saved}</h1>
        <p className="page-subtitle">{t.decks.listSubtitle}</p>
      </header>

      {decks.length === 0 ? (
        <div className="empty-state deck-empty">
          <strong>{t.decks.listEmptyTitle}</strong>
          <p>{t.decks.listEmptyText}</p>
          <button type="button" className="btn btn-primary" onClick={createDeck}>
            + {t.decks.create}
          </button>
          <button
            type="button"
            className="deck-empty-import"
            onClick={() => setImportOpen((open) => !open)}
          >
            {t.decks.importToggle}
          </button>
          {importPanel}
        </div>
      ) : (
        <>
          <div className="deck-list-actions">
            <button type="button" className="btn btn-primary" onClick={createDeck}>
              + {t.decks.createShort}
            </button>
            <button type="button" className="btn" onClick={() => setImportOpen((open) => !open)}>
              {t.decks.importShort}
            </button>
          </div>
          {importPanel}

          <ul className="deck-tiles">
            {decks.map((deck) => {
              const lines = deckLines(deck);
              const legends = lines.filter((line) => line.card.cardType === 'Legend');
              const colors = CARD_COLORS.filter((color) =>
                (legends.length > 0 ? legends : lines).some((line) => line.card.color === color),
              );
              const counts = deckCounts(lines);
              const issues = deckIssues(lines).length;
              const total = counts.legends + counts.cards;
              const have = lines.reduce(
                (sum, line) => sum + Math.min(countCard(line.card.id), line.quantity),
                0,
              );
              return (
                <li key={deck.id}>
                  <Link className="deck-tile" to={`/decks/${deck.id}`}>
                    <span className="deck-tile-legends" aria-hidden="true">
                      {[0, 1, 2].map((index) => {
                        const legend = legends[index];
                        const printing =
                          legend &&
                          linePrinting(legend.card, legend.printingId, preferredCardLanguage);
                        return printing ? (
                          <img key={index} src={getThumbUrl(printing)} alt="" />
                        ) : (
                          <i key={index} />
                        );
                      })}
                    </span>
                    <span className="deck-tile-text">
                      <span className="deck-tile-head">
                        <strong>{deck.name || t.decks.untitled}</strong>
                        <em className={issues === 0 ? 'ok' : 'warn'}>
                          {issues === 0 ? t.decks.legal : t.decks.issuesCount(issues)}
                        </em>
                      </span>
                      <span className="deck-tile-names">
                        {colors.map((color) => (
                          <i
                            key={color}
                            className="color-dot"
                            style={{ background: COLOR_HEX[color] }}
                          />
                        ))}
                        {legends.length > 0
                          ? legends.map((line) => line.card.name).join(' · ')
                          : t.decks.noLegend}
                      </span>
                      <small>
                        {t.decks.legendsCount(counts.legends)} • {t.decks.cardsCount(counts.cards)}
                        {total > 0 && ` • ${t.decks.ownedPercent(percent(have, total))}`}
                      </small>
                      <span className="progress">
                        <span
                          className={
                            total > 0 && have === total
                              ? 'progress-value complete'
                              : 'progress-value'
                          }
                          style={{ width: `${percent(have, total)}%` }}
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
