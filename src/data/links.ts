import { messages } from '../i18n';

import cardmarket from './cardmarket.json';
import type { Card, Printing } from './types';

type CardmarketProduct = {
  id: number;
  trend?: number;
  low?: number;
  trendFoil?: number;
  lowFoil?: number;
};

const products = cardmarket.products as Record<string, CardmarketProduct>;

/** Langues des vendeurs sur Cardmarket (filtre de la page produit). */
const CARDMARKET_LANGUAGE: Record<string, number> = { EN: 1, FR: 2 };

export type CardmarketLink = {
  url: string;
  /** Page de cette impression précise (sinon : recherche par nom). */
  exact: boolean;
  /** Prix indicatif en euros : tendance, ou à défaut le moins cher. */
  price?: number;
};

/** Date des prix embarqués (« 27/09 »). */
export const cardmarketPriceDate = () =>
  new Date(cardmarket.updatedAt).toLocaleDateString(messages().locale, {
    day: '2-digit',
    month: '2-digit',
  });

/**
 * Lien Cardmarket d'une impression : sa page produit (reliée par `npm run sync-cardmarket`),
 * filtrée sur sa langue ; à défaut, la recherche du nom de la carte.
 */
export function getCardmarketLink(card: Card, printing: Printing): CardmarketLink {
  const product = products[printing.id];
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
