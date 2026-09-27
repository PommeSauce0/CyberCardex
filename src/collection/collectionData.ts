import type { CardCondition, CollectionItem, GradingCompany } from '../data/types';
import { messages } from '../i18n';
import { createId } from '../storage/storage';

export const CONDITIONS: CardCondition[] = [
  'Mint',
  'Near Mint',
  'Excellent',
  'Good',
  'Played',
  'Poor',
];

export const GRADING_COMPANIES: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'Other'];

export function isCardCondition(value: unknown): value is CardCondition {
  return CONDITIONS.includes(value as CardCondition);
}

export function isGradingCompany(value: unknown): value is GradingCompany {
  return GRADING_COMPANIES.includes(value as GradingCompany);
}

/**
 * Transforme une donnée inconnue (stockage, fichier importé) en CollectionItem valide,
 * ou undefined si elle est inutilisable. Les champs inconnus sont ignorés.
 */
function sanitizeItem(raw: unknown): CollectionItem | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const value = raw as Record<string, unknown>;

  if (typeof value.printingId !== 'string' || !value.printingId) {
    return undefined;
  }

  const graded = value.graded === true;
  const grade = Number(value.grade);
  const price = Number(value.purchasePrice);

  const item: CollectionItem = {
    id: typeof value.id === 'string' && value.id ? value.id : createId(),
    printingId: value.printingId,
    condition: isCardCondition(value.condition) ? value.condition : 'Near Mint',
    graded,
    createdAt:
      typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
        ? value.createdAt
        : new Date().toISOString(),
  };

  if (graded) {
    item.gradingCompany = isGradingCompany(value.gradingCompany) ? value.gradingCompany : 'Other';
    if (value.grade !== undefined && Number.isFinite(grade) && grade >= 1 && grade <= 10) {
      item.grade = grade;
    }
  }
  if (value.purchasePrice !== undefined && Number.isFinite(price) && price >= 0) {
    item.purchasePrice = price;
  }
  if (typeof value.notes === 'string' && value.notes.trim()) {
    item.notes = value.notes.trim();
  }

  return item;
}

export function sanitizeItems(raw: unknown): CollectionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const items: CollectionItem[] = [];
  for (const entry of raw) {
    const item = sanitizeItem(entry);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

export function sanitizeWishlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

// ---------- Export / import ----------

const EXPORT_APP = 'cybercardex';
const EXPORT_VERSION = 1;

export type CollectionExport = {
  app: typeof EXPORT_APP;
  version: number;
  exportedAt: string;
  collection: CollectionItem[];
  wishlist: string[];
};

export function buildExport(items: CollectionItem[], wishlist: string[]): CollectionExport {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    collection: items,
    wishlist,
  };
}

export type ParsedImport = {
  collection: CollectionItem[];
  wishlist: string[];
  rejected: number;
};

/** Accepte un export CyberCardex, ou un simple tableau d'exemplaires. */
export function parseImport(text: string): ParsedImport {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(messages().importErrors.notJson);
  }

  let rawCollection: unknown;
  let rawWishlist: unknown = [];

  if (Array.isArray(data)) {
    rawCollection = data;
  } else if (data && typeof data === 'object' && 'collection' in data) {
    const value = data as Record<string, unknown>;
    if (value.app !== undefined && value.app !== EXPORT_APP) {
      throw new Error(messages().importErrors.otherApp);
    }
    rawCollection = value.collection;
    rawWishlist = value.wishlist ?? [];
  } else {
    throw new Error(messages().importErrors.unknownFormat);
  }

  if (!Array.isArray(rawCollection)) {
    throw new Error(messages().importErrors.noCollection);
  }

  const collection = sanitizeItems(rawCollection);
  return {
    collection,
    wishlist: sanitizeWishlist(rawWishlist),
    rejected: rawCollection.length - collection.length,
  };
}

/**
 * Deux exemplaires sont identiques si toutes leurs informations utilisateur
 * sont les mêmes (id et createdAt ignorés).
 */
function getCopyGroupKey(item: CollectionItem) {
  return JSON.stringify({
    condition: item.condition,
    graded: item.graded,
    gradingCompany: item.graded ? (item.gradingCompany ?? null) : null,
    grade: item.graded ? (item.grade ?? null) : null,
    purchasePrice: item.purchasePrice ?? null,
    notes: item.notes?.trim() ?? '',
  });
}

export type CopyGroup = {
  key: string;
  items: CollectionItem[];
  representative: CollectionItem;
};

export function groupCopies(items: CollectionItem[]): CopyGroup[] {
  const groups = new Map<string, CollectionItem[]>();
  for (const item of items) {
    const key = getCopyGroupKey(item);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, groupItems]) => ({
    key,
    items: groupItems,
    representative: groupItems[0],
  }));
}
