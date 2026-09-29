import { useCallback, useState } from 'react';

import {
  compareNumbers,
  getCardById,
  getPrintingById,
  getPrintingInLanguage,
  getPrintingsByCard,
} from '../data/catalog';
import type { Card, CardLanguage, Printing } from '../data/types';
import { backupRaw, readJson, wasNormalized, writeJson } from '../storage/storage';

import type { DeckLine } from './deckRules';

const STORAGE_KEY = 'cybercardex.decks.v1';

/** `printingId` : version choisie pour cette carte (affichage, fiche, wishlist) ; les règles et
 * les exemplaires possédés comptent toutes les versions. */
export type DeckCard = { cardId: string; quantity: number; printingId?: string };
export type SavedDeck = { id: string; name: string; cards: DeckCard[]; updatedAt: string };

/** Ligne de deck valide ; une version inconnue ou d'une autre carte est simplement oubliée. */
export function cleanDeckCard(entry: unknown): DeckCard | undefined {
  const card = entry as Partial<DeckCard> | null;
  if (
    typeof card?.cardId !== 'string' ||
    !getCardById(card.cardId) ||
    typeof card.quantity !== 'number' ||
    !Number.isInteger(card.quantity) ||
    card.quantity <= 0
  ) {
    return undefined;
  }
  const printing = typeof card.printingId === 'string' && getPrintingById(card.printingId);
  return printing && printing.cardId === card.cardId
    ? { cardId: card.cardId, quantity: card.quantity, printingId: printing.id }
    : { cardId: card.cardId, quantity: card.quantity };
}

/**
 * Decks valides d'une donnée inconnue (stockage, sauvegarde importée). Un identifiant déjà
 * pris (sauvegarde modifiée à la main…) reçoit un nouvel identifiant : sinon, modifier ou
 * supprimer l'un des decks toucherait aussi l'autre.
 */
export function sanitizeDecks(stored: unknown): SavedDeck[] {
  const seen = new Set<string>();
  return (Array.isArray(stored) ? stored : []).flatMap((raw) => {
    const deck = raw as Partial<SavedDeck> | null;
    if (typeof deck?.id !== 'string' || !Array.isArray(deck.cards)) {
      return [];
    }
    let id = deck.id;
    for (let n = 2; seen.has(id); n += 1) {
      id = `${deck.id}-${n}`;
    }
    seen.add(id);
    return [
      {
        id,
        name: typeof deck.name === 'string' ? deck.name : '',
        cards: deck.cards.flatMap((entry) => cleanDeckCard(entry) ?? []),
        updatedAt: typeof deck.updatedAt === 'string' ? deck.updatedAt : new Date().toISOString(),
      },
    ];
  });
}

/** Decks enregistrés, sans les entrées invalides ni les cartes absentes du catalogue. */
export function loadDecks(): SavedDeck[] {
  const stored = readJson<unknown>(STORAGE_KEY);
  const decks = sanitizeDecks(stored);
  // Si le nettoyage change quoi que ce soit, la version brute est d'abord mise de côté.
  if (wasNormalized(stored, decks)) {
    backupRaw(STORAGE_KEY, 'corrigée à la lecture');
  }
  return decks;
}

export const saveDecks = (decks: SavedDeck[]) => writeJson(STORAGE_KEY, decks);

/** Deck créé puis laissé tel quel (ni carte ni nom) : rien à garder. */
export const isAbandoned = (deck: SavedDeck) => deck.cards.length === 0 && !deck.name.trim();

/** Decks enregistrés ; `changeDecks` les modifie et les sauvegarde aussitôt. */
export function useDecks() {
  const [decks, setDecks] = useState<SavedDeck[]>(loadDecks);
  const changeDecks = useCallback((change: (decks: SavedDeck[]) => SavedDeck[]) => {
    setDecks((current) => {
      const next = change(current);
      saveDecks(next);
      return next;
    });
  }, []);
  return [decks, changeDecks] as const;
}

type DeckEntryLine = DeckLine & { printingId?: string };

/** Lignes du deck avec leurs cartes (les cartes inconnues sont déjà écartées au chargement). */
export const deckLines = (deck: SavedDeck): DeckEntryLine[] =>
  deck.cards.flatMap((entry) => {
    const card = getCardById(entry.cardId);
    return card ? [{ card, quantity: entry.quantity, printingId: entry.printingId }] : [];
  });

/** Version affichée par défaut (et mise en wishlist) : la série principale d'abord, puis la Beta. */
const SET_PRIORITY = ['welcome-to-night-city-retail', 'welcome-to-night-city-beta'];

const setRank = (printing: Printing) => {
  const index = SET_PRIORITY.indexOf(printing.setId);
  return index < 0 ? SET_PRIORITY.length : index;
};

export function displayPrinting(card: Card, language: CardLanguage): Printing | undefined {
  const best = [...getPrintingsByCard(card.id)].sort((a, b) => setRank(a) - setRank(b))[0];
  return best && getPrintingInLanguage(best, language);
}

/** Version d'une ligne de deck : celle choisie (dans la langue préférée), sinon celle par défaut. */
export function linePrinting(
  card: Card,
  printingId: string | undefined,
  language: CardLanguage,
): Printing | undefined {
  const chosen = printingId ? getPrintingById(printingId) : undefined;
  return chosen && chosen.cardId === card.id
    ? getPrintingInLanguage(chosen, language)
    : displayPrinting(card, language);
}

/**
 * Versions d'une carte au choix (une par illustration : les langues d'une même impression ne
 * comptent qu'une fois, affichées dans la langue préférée) : Retail, Beta, puis les autres séries.
 */
export function cardVersions(card: Card, language: CardLanguage): Printing[] {
  const seen = new Set<string>();
  return getPrintingsByCard(card.id)
    .filter((printing) => printing.status !== 'stale')
    .filter((printing) => !seen.has(printing.variantKey) && seen.add(printing.variantKey))
    .map((printing) => getPrintingInLanguage(printing, language))
    .sort(
      (a, b) =>
        setRank(a) - setRank(b) ||
        a.setId.localeCompare(b.setId) ||
        compareNumbers(a.number, b.number),
    );
}

/** Nom du deck dans une liste exportée : la première ligne « // Nom ». */
export function deckNameFromText(text: string) {
  const first = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  return first?.startsWith('//') ? first.slice(2).trim().slice(0, 40) : '';
}
