import { getPrintingById } from '../data/catalog';
import type { Printing } from '../data/types';

/**
 * Liste parcourue depuis une fiche carte : les impressions de la grille d'où l'on vient
 * (recherche, collection, wishlist, série filtrée, deck), dans l'ordre affiché.
 * Transmise dans l'état de navigation ; les flèches ‹ › de la fiche la suivent.
 */
type BrowseState = { browse?: string[] } | null;

export const browseState = (ids?: string[]): BrowseState => (ids ? { browse: ids } : null);

/** Impressions de la liste parcourue, si la carte affichée en fait partie. */
export function browsedPrintings(state: unknown, printingId: string): Printing[] | undefined {
  const ids = (state as BrowseState)?.browse;
  if (!Array.isArray(ids) || !ids.includes(printingId)) {
    return undefined;
  }
  return ids.flatMap((id) => getPrintingById(id) ?? []);
}
