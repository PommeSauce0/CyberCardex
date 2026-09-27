/*
 * Modèle de données :
 *   Card           carte logique (nom, règles) ;
 *   Printing       impression physique exacte (série, numéro, rareté, langue, finition) ;
 *   CollectionItem exemplaire possédé d'une impression.
 * Les impressions d'une même illustration dans plusieurs langues partagent le même `variantKey`.
 */

export type Rarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Epic'
  | 'Nova Rare'
  | 'Secret'
  | 'Iconic Legend'
  | 'Iconic Other'
  | 'Iconic Secret';

export type CardLanguage = 'EN' | 'FR';

export type CardFinish = 'Standard' | 'Foil' | 'Unknown';

type PrintingTreatment =
  | 'Alt Art'
  | 'Full Art'
  | 'Borderless'
  | 'Stamped'
  | 'Serialized'
  | 'Textless'
  | 'Beta Symbol'
  | 'Diptych'
  | 'Iconic Frame';

export type CardCondition = 'Mint' | 'Near Mint' | 'Excellent' | 'Good' | 'Played' | 'Poor';

export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'Other';

export type ReleaseType =
  | 'set'
  | 'promo'
  | 'event'
  | 'prerelease'
  | 'starter'
  | 'demo'
  | 'box-topper';

export type CardColor = 'Red' | 'Blue' | 'Green' | 'Yellow';

export type CardType = 'Legend' | 'Unit' | 'Gear' | 'Program';

export type Card = {
  id: string;
  name: string;
  subtitle?: string;
  color?: CardColor;
  cardType?: CardType;
  cost?: number;
  power?: number;
  ram?: number;
  rulesText?: string;
  classifications?: string[];
  keywords?: string[];
  eddiable?: boolean;
};

export type CardSet = {
  id: string;
  code: string;
  name: string;
  edition: string;
  releaseYear: number;
  releaseType: ReleaseType;
};

export type Printing = {
  id: string;
  /** Identifiant et page de l'impression sur cyberpunktcg.com. */
  sourceId?: string;
  sourceUrl?: string;
  cardId: string;
  setId: string;
  variantKey: string;
  number: string;
  rarity: Rarity;
  language: CardLanguage;
  finish: CardFinish;
  treatments?: PrintingTreatment[];
  imageUrl: string;
  artist?: string;
  /** Nom imprimé sur une carte non anglaise. */
  localizedName?: string;
  /** « stale » : retirée de l'API, gardée pour les collections qui la contiennent. */
  status?: 'active' | 'stale';
};

export type CollectionItem = {
  id: string;
  printingId: string;
  condition: CardCondition;
  graded: boolean;
  gradingCompany?: GradingCompany;
  grade?: number;
  purchasePrice?: number;
  notes?: string;
  createdAt: string;
};
