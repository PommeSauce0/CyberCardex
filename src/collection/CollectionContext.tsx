import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getPrintingById } from '../data/catalog';
import type { CollectionItem } from '../data/types';
import { emitCardAdded } from '../easter/events';
import { backupRaw, createId, readJson, subscribeToKey, writeJson } from '../storage/storage';

import { sanitizeItems, sanitizeWishlist, type ParsedImport } from './collectionData';

const COLLECTION_KEY = 'cybercardex.collection.v1';
const WISHLIST_KEY = 'cybercardex.wishlist.v1';

export type NewCollectionItem = Omit<CollectionItem, 'id' | 'createdAt'>;

export type ImportMode = 'merge' | 'replace';

type CollectionContextValue = {
  items: CollectionItem[];
  wishlist: string[];

  /** Ajoute un exemplaire et retourne son id (utile pour annuler). */
  addItem: (item: NewCollectionItem) => string;
  removeItem: (itemId: string) => void;
  /** Retire l'exemplaire le plus récent d'une variante (toutes langues). */
  removeLatestOfVariant: (variantKey: string) => void;

  getItemsForPrinting: (printingId: string) => CollectionItem[];
  countPrinting: (printingId: string) => number;

  /**
   * Exemplaires possédés d'une variante, toutes langues confondues
   * (ex. WNC Retail #005a EN + FR). Sert à la progression, comme dans PokéCardex.
   */
  countVariant: (variantKey: string) => number;
  /** Exemplaires d'une carte, toutes versions confondues (séries, langues, finitions). */
  countCard: (cardId: string) => number;

  isWished: (printingId: string) => boolean;
  toggleWish: (printingId: string) => void;

  /** Retourne le nombre d'exemplaires réellement ajoutés. */
  importData: (data: ParsedImport, mode: ImportMode) => number;
  clearAll: () => void;
};

const CollectionContext = createContext<CollectionContextValue | undefined>(undefined);

const EMPTY: CollectionItem[] = [];

/** Lit une liste ; si des entrées sont rejetées, la version brute est d'abord mise de côté. */
function loadList<T>(key: string, sanitize: (raw: unknown) => T[]) {
  const raw = readJson<unknown>(key);
  const list = sanitize(raw);
  if (raw !== undefined && (!Array.isArray(raw) || list.length !== raw.length)) {
    backupRaw(key, 'en partie invalide');
  }
  return list;
}

const loadCollection = () => loadList(COLLECTION_KEY, sanitizeItems);
const loadWishlist = () => loadList(WISHLIST_KEY, sanitizeWishlist);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CollectionItem[]>(loadCollection);
  const [wishlist, setWishlist] = useState<string[]>(loadWishlist);

  useEffect(() => writeJson(COLLECTION_KEY, items), [items]);
  useEffect(() => writeJson(WISHLIST_KEY, wishlist), [wishlist]);

  // Garde plusieurs onglets ouverts synchronisés.
  useEffect(() => {
    const offCollection = subscribeToKey(COLLECTION_KEY, () => setItems(loadCollection()));
    const offWishlist = subscribeToKey(WISHLIST_KEY, () => setWishlist(loadWishlist()));
    return () => {
      offCollection();
      offWishlist();
    };
  }, []);

  const itemsByPrinting = useMemo(() => {
    const map = new Map<string, CollectionItem[]>();
    for (const item of items) {
      const list = map.get(item.printingId) ?? [];
      list.push(item);
      map.set(item.printingId, list);
    }
    return map;
  }, [items]);

  const countByVariant = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const variantKey = getPrintingById(item.printingId)?.variantKey;
      if (variantKey) {
        map.set(variantKey, (map.get(variantKey) ?? 0) + 1);
      }
    }
    return map;
  }, [items]);

  const countByCard = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const cardId = getPrintingById(item.printingId)?.cardId;
      if (cardId) {
        map.set(cardId, (map.get(cardId) ?? 0) + 1);
      }
    }
    return map;
  }, [items]);

  // La wishlist vise une impression, toutes langues confondues : une carte souhaitée en EN
  // l'est aussi quand l'app l'affiche en FR, et un exemplaire FR la retire de la liste.
  const wishedVariants = useMemo(
    () =>
      new Set(wishlist.map((id) => getPrintingById(id)?.variantKey).filter(Boolean) as string[]),
    [wishlist],
  );

  const addItem = useCallback((item: NewCollectionItem) => {
    const newItem: CollectionItem = {
      ...item,
      id: createId(),
      createdAt: new Date().toISOString(),
    };
    setItems((current) => [...current, newItem]);
    emitCardAdded(item.printingId);
    // Une carte obtenue n'est plus recherchée (quelle que soit sa langue).
    const variantKey = getPrintingById(item.printingId)?.variantKey;
    setWishlist((current) =>
      current.filter(
        (id) => id !== item.printingId && getPrintingById(id)?.variantKey !== variantKey,
      ),
    );
    return newItem.id;
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  const removeLatestOfVariant = useCallback((variantKey: string) => {
    setItems((current) => {
      let latestIndex = -1;
      current.forEach((item, index) => {
        if (
          getPrintingById(item.printingId)?.variantKey === variantKey &&
          (latestIndex < 0 || item.createdAt >= current[latestIndex].createdAt)
        ) {
          latestIndex = index;
        }
      });
      return latestIndex < 0 ? current : current.filter((_, index) => index !== latestIndex);
    });
  }, []);

  const toggleWish = useCallback((printingId: string) => {
    const variantKey = getPrintingById(printingId)?.variantKey;
    setWishlist((current) => {
      const sameVariant = (id: string) =>
        id === printingId || (!!variantKey && getPrintingById(id)?.variantKey === variantKey);
      return current.some(sameVariant)
        ? current.filter((id) => !sameVariant(id))
        : [...current, printingId];
    });
  }, []);

  const importData = useCallback<CollectionContextValue['importData']>(
    (data, mode) => {
      let added = data.collection.length;
      if (mode === 'replace') {
        setItems(data.collection);
        setWishlist(data.wishlist);
      } else {
        const existingIds = new Set(items.map((item) => item.id));
        const newItems = data.collection.filter((item) => !existingIds.has(item.id));
        added = newItems.length;
        setItems((current) => [...current, ...newItems]);
        setWishlist((current) => [...new Set([...current, ...data.wishlist])]);
      }
      return added;
    },
    [items],
  );

  const clearAll = useCallback(() => {
    setItems([]);
    setWishlist([]);
  }, []);

  const value = useMemo<CollectionContextValue>(
    () => ({
      items,
      wishlist,
      addItem,
      removeItem,
      removeLatestOfVariant,
      getItemsForPrinting: (printingId) => itemsByPrinting.get(printingId) ?? EMPTY,
      countPrinting: (printingId) => itemsByPrinting.get(printingId)?.length ?? 0,
      countVariant: (variantKey) => countByVariant.get(variantKey) ?? 0,
      countCard: (cardId) => countByCard.get(cardId) ?? 0,
      isWished: (printingId) => {
        const variantKey = getPrintingById(printingId)?.variantKey;
        return !!variantKey && wishedVariants.has(variantKey);
      },
      toggleWish,
      importData,
      clearAll,
    }),
    [
      items,
      wishlist,
      itemsByPrinting,
      countByVariant,
      countByCard,
      wishedVariants,
      addItem,
      removeItem,
      removeLatestOfVariant,
      toggleWish,
      importData,
      clearAll,
    ],
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCollection() {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error('useCollection doit être utilisé dans CollectionProvider');
  }
  return context;
}
