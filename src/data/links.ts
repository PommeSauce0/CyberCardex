import { messages } from '../i18n';

import { getPriceData } from './livePrices';
import type { Card, Printing } from './types';

/** Langues des vendeurs sur Cardmarket (filtre de la page produit). */
const CARDMARKET_LANGUAGE: Record<string, number> = { EN: 1, FR: 2 };

type CardmarketLink = {
  url: string;
  /** Page de cette impression précise (sinon : recherche par nom). */
  exact: boolean;
  /** Prix indicatif en euros : tendance, ou à défaut le moins cher. */
  price?: number;
};

/** Date des prix affichés (« 27/09 ») : du jour si téléchargés, sinon ceux de l'app. */
export const cardmarketPriceDate = () =>
  new Date(getPriceData().updatedAt).toLocaleDateString(messages().locale, {
    day: '2-digit',
    month: '2-digit',
  });

/**
 * Lien Cardmarket d'une impression : sa page produit (reliée par `npm run sync-cardmarket`),
 * filtrée sur sa langue ; à défaut, la recherche du nom de la carte.
 */
export function getCardmarketLink(card: Card, printing: Printing): CardmarketLink {
  const product = getPriceData().products[printing.id];
  if (!product) {
    const query = card.subtitle ? `${card.name} ${card.subtitle}` : card.name;
    return {
      url: `https://www.cardmarket.com/${messages().cardmarketPath}/Cyberpunk/Products/Search?searchString=${encodeURIComponent(query)}`,
      exact: false,
    };
  }

  const language = CARDMARKET_LANGUAGE[printing.language];
  const foil = printing.finish === 'Foil';
  const candidates = foil
    ? [product.trendFoil, product.lowFoil, product.trend, product.low]
    : [product.trend, product.low];
  return {
    url: `https://www.cardmarket.com/${messages().cardmarketPath}/Cyberpunk/Products?idProduct=${product.id}${
      language ? `&language=${language}` : ''
    }`,
    exact: true,
    price: candidates.find((value) => value !== undefined && value > 0),
  };
}

/**
 * Prix de l'exemplaire le moins cher d'une carte, toutes versions confondues (pour jouer,
 * la version importe peu) : les versions non foil d'abord, les foil à défaut.
 */
export function cheapestCardPrice(card: Card, printings: Printing[]): number | undefined {
  const prices = (foil: boolean) =>
    printings
      .filter((printing) => (printing.finish === 'Foil') === foil)
      .flatMap((printing) => getCardmarketLink(card, printing).price ?? []);
  const standard = prices(false);
  const pool = standard.length > 0 ? standard : prices(true);
  return pool.length > 0 ? Math.min(...pool) : undefined;
}
