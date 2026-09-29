import { getCardById, getPrintingById, getSetById } from '../data/catalog';
import { loadDecks } from '../decks/deckStorage';
import type { Messages } from '../i18n';

/*
 * Chemin de chaque entrée de l'historique, rangé par position (`idx`, tenue par le routeur).
 * Permet d'afficher « ← Nom de la page précédente » et de savoir s'il y en a une.
 */
const trail: string[] = [];

/** Position de la page affichée dans l'historique (0 = première page ouverte). */
export const historyIndex = () => (window.history.state as { idx?: number } | null)?.idx ?? 0;

export function recordPage(path: string) {
  trail[historyIndex()] = path;
}

/** Page précédente dans l'app, si l'on y est arrivé en naviguant. */
export function previousPage(): string | undefined {
  const index = historyIndex();
  return index > 0 ? trail[index - 1] : undefined;
}

/** Nom lisible d'une page de l'app (pour « ← … »). */
export function pageLabel(path: string, t: Messages): string | undefined {
  const [pathname] = path.split('?');
  const [, section, id] = pathname.split('/');
  switch (section) {
    case '':
      return t.nav.home;
    case 'sets': {
      const set = getSetById(id);
      return set && `${set.name} ${set.edition}`;
    }
    case 'cards': {
      const printing = getPrintingById(id);
      return printing && getCardById(printing.cardId)?.name;
    }
    case 'decks':
      if (!id) {
        return t.decks.saved;
      }
      return loadDecks().find((deck) => deck.id === id)?.name || t.decks.untitled;
    case 'collection':
      return t.home.myCollection;
    case 'search':
      return t.nav.search;
    case 'wishlist':
      return t.nav.wishlist;
    case 'scan':
      return t.nav.scan;
    case 'settings':
      return t.nav.settings;
  }
}
