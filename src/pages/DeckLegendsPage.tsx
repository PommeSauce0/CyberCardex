import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import VersionPicker from '../components/VersionPicker';
import { cards, getThumbUrl } from '../data/catalog';
import { CARD_COLORS, COLOR_HEX } from '../data/labels';
import type { Card, Printing } from '../data/types';
import { LEGEND_COUNT, legendBlocked, ramByColor } from '../decks/deckRules';
import { cardVersions, displayPrinting, loadDecks, saveDecks } from '../decks/deckStorage';
import { useT } from '../i18n/useT';
import BackLink from '../navigation/BackLink';
import { useSettings } from '../settings/SettingsContext';
import { createId } from '../storage/storage';

import './DeckPage.css';

/** Toutes les Légendes du catalogue, par couleur puis par nom. */
function legendsByColor() {
  const legends = cards
    .filter((card) => card.cardType === 'Legend')
    .sort(
      (a, b) => a.name.localeCompare(b.name) || (a.subtitle ?? '').localeCompare(b.subtitle ?? ''),
    );
  return CARD_COLORS.map((color) => ({
    color,
    legends: legends.filter((card) => card.color === color),
  })).filter((group) => group.legends.length > 0);
}

/** Le catalogue ne change pas pendant l'utilisation : calculé une fois. */
const GROUPS = legendsByColor();

/** Création guidée d'un deck : on choisit d'abord ses 3 Légendes (réglage « Création de deck »). */
export default function DeckLegendsPage() {
  const t = useT();
  const navigate = useNavigate();
  const { preferredCardLanguage } = useSettings();
  /** Légendes choisies, avec la version retenue (si la carte en a plusieurs). */
  const [chosen, setChosen] = useState<{ card: Card; printing?: Printing }[]>([]);
  /** Légende dont on choisit la version (panneau ouvert). */
  const [picking, setPicking] = useState<Card>();
  const chosenCards = chosen.map((entry) => entry.card);

  function toggle(card: Card) {
    if (chosen.some((entry) => entry.card.id === card.id)) {
      setChosen(chosen.filter((entry) => entry.card.id !== card.id));
    } else if (!legendBlocked(chosenCards, card)) {
      if (cardVersions(card, preferredCardLanguage).length > 1) {
        setPicking(card);
      } else {
        setChosen([...chosen, { card }]);
      }
    }
  }

  function pickVersion(printing: Printing) {
    if (picking) {
      setChosen([...chosen, { card: picking, printing }]);
      setPicking(undefined);
    }
  }

  /** Crée le deck (avec ou sans Légendes) et ouvre son éditeur à la place de cet écran. */
  function create(legends: typeof chosen) {
    const deck = {
      id: createId(),
      name: '',
      cards: legends.map(({ card, printing }) => ({
        cardId: card.id,
        quantity: 1,
        ...(printing && { printingId: printing.id }),
      })),
      updatedAt: new Date().toISOString(),
    };
    saveDecks([deck, ...loadDecks()]);
    navigate(`/decks/${deck.id}`, { replace: true });
  }

  const ram = ramByColor(chosenCards.map((card) => ({ card, quantity: 1 })));

  return (
    <main className="page deck-page deck-legends-page">
      <BackLink fallbackTo="/decks" fallbackLabel={t.decks.saved} />
      <header className="page-header">
        <p className="eyebrow">{t.decks.eyebrow}</p>
        <h1 className="page-title">{t.decks.pickTitle}</h1>
        <p className="page-subtitle">{t.decks.pickSubtitle}</p>
      </header>

      {GROUPS.map(({ color, legends }) => (
        <section key={color} className="deck-group">
          <h2 className="deck-group-title">
            <i className="color-dot" style={{ background: COLOR_HEX[color] }} />
            {t.colors[color]}
          </h2>
          <div className="legend-picks">
            {legends.map((card) => {
              const entry = chosen.find((item) => item.card.id === card.id);
              const selected = !!entry;
              const printing = entry?.printing ?? displayPrinting(card, preferredCardLanguage);
              const versions = cardVersions(card, preferredCardLanguage).length;
              const blocked = selected ? undefined : legendBlocked(chosenCards, card);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={selected ? 'legend-pick selected' : 'legend-pick'}
                  aria-pressed={selected}
                  disabled={!!blocked}
                  onClick={() => toggle(card)}
                >
                  <span className="legend-pick-image">
                    {printing && <img src={getThumbUrl(printing)} alt="" loading="lazy" />}
                    {selected && <b aria-hidden="true">✓</b>}
                  </span>
                  <strong>{card.name}</strong>
                  {card.subtitle && <small>{card.subtitle}</small>}
                  <em>
                    {selected
                      ? t.decks.pickSelected
                      : blocked === 'sameName'
                        ? t.decks.pickSameName
                        : [
                            card.ram !== undefined && `RAM ${card.ram}`,
                            versions > 1 && t.decks.versionsCount(versions),
                          ]
                            .filter(Boolean)
                            .join(' · ') || ' '}
                  </em>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="legend-picks-bar">
        <div className="legend-picks-summary">
          <strong className={chosen.length === LEGEND_COUNT ? 'ok' : ''}>
            {t.decks.pickCount(chosen.length)}
          </strong>
          {CARD_COLORS.filter((color) => ram[color] !== undefined).map((color) => (
            <span key={color}>
              <i className="color-dot" style={{ background: COLOR_HEX[color] }} />
              {t.decks.ram(t.colors[color], ram[color] ?? 0)}
            </span>
          ))}
        </div>
        <div className="legend-picks-actions">
          <button type="button" className="btn" onClick={() => create([])}>
            {t.decks.pickSkip}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={chosen.length === 0}
            onClick={() => create(chosen)}
          >
            {t.decks.pickContinue}
          </button>
        </div>
      </div>

      {picking && (
        <VersionPicker
          card={picking}
          versions={cardVersions(picking, preferredCardLanguage)}
          onPick={pickVersion}
          onClose={() => setPicking(undefined)}
        />
      )}
    </main>
  );
}
