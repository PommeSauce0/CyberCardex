import { useSyncExternalStore } from 'react';

import embedded from './cardmarket.json';

/*
 * Prix Cardmarket : les plus récents parmi
 *   1. ceux publiés chaque nuit sur la branche `data` du dépôt (.github/workflows/prices.yml),
 *      téléchargés au lancement en mode « Lien + prix » puis gardés sur l'appareil ;
 *   2. ceux livrés avec l'app (src/data/cardmarket.json, `npm run sync-cardmarket`).
 * Sans réseau, les derniers prix téléchargés restent affichés.
 */

/** Fichier publié par le workflow (à changer si le code est repris dans un autre dépôt). */
const PRICES_URL = 'https://raw.githubusercontent.com/PommeSauce0/CyberCardex/data/cardmarket.json';
// Hors du préfixe « cybercardex. » : simple cache, pas recopié dans le stockage natif
// (restoreNativeStorage), où une vieille copie écraserait les prix plus récents.
const CACHE_KEY = 'cache.cybercardex.prices.v1';

export type CardmarketProduct = {
  id: number;
  trend?: number;
  low?: number;
  trendFoil?: number;
  lowFoil?: number;
};

export type PriceData = { updatedAt: string; products: Record<string, CardmarketProduct> };

const isPrice = (value: unknown) =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value));

/** Contenu attendu (fichier téléchargé ou gardé sur l'appareil : jamais pris sur parole). */
export function isPriceData(data: unknown): data is PriceData {
  const value = data as Partial<PriceData> | null;
  if (
    typeof value?.updatedAt !== 'string' ||
    Number.isNaN(Date.parse(value.updatedAt)) ||
    typeof value.products !== 'object' ||
    value.products === null
  ) {
    return false;
  }
  return Object.values(value.products).every((product) => {
    const entry = product as Partial<CardmarketProduct> | null;
    return (
      typeof entry?.id === 'number' &&
      isPrice(entry.trend) &&
      isPrice(entry.low) &&
      isPrice(entry.trendFoil) &&
      isPrice(entry.lowFoil)
    );
  });
}

/** Les prix les plus récents des deux (le premier à égalité). */
export function newest(a: PriceData, b?: PriceData): PriceData {
  return b && Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a;
}

function readCache(): PriceData | undefined {
  try {
    const cached: unknown = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return isPriceData(cached) ? cached : undefined;
  } catch {
    return undefined;
  }
}

let current: PriceData = newest(embedded as PriceData, readCache());
const listeners = new Set<() => void>();

export const getPriceData = () => current;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Prix à jour dans un composant : il se réaffiche quand de nouveaux prix arrivent. */
export const usePriceData = () => useSyncExternalStore(subscribe, getPriceData);

let refreshing = false;
let refreshed = false;

/** Télécharge les prix du jour (une fois par lancement ; en cas d'échec, on garde les actuels). */
export async function refreshPrices() {
  if (refreshing || refreshed) {
    return;
  }
  refreshing = true;
  try {
    const response = await fetch(PRICES_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const data: unknown = response.ok ? await response.json() : undefined;
    refreshed = true;
    if (isPriceData(data) && newest(current, data) === data) {
      current = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        // Stockage plein ou indisponible : les prix restent valables pour ce lancement.
      }
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Hors connexion ou délai dépassé : nouvel essai au prochain lancement.
  } finally {
    refreshing = false;
  }
}
