import { en } from './en';
import { fr } from './fr';

/*
 * Traductions de l'interface. Le texte des cartes (noms, effets) reste celui du catalogue.
 *
 * - Dans un composant : `const t = useT()` (src/i18n/useT.ts), puis `t.nav.search`…
 * - Hors React (libellés, formats, messages d'erreur) : `messages()`.
 * Le dictionnaire anglais a le même type que le français : une clé oubliée ne compile pas.
 */

export type Language = 'fr' | 'en';
export type Messages = typeof fr;

export const LANGUAGES: Language[] = ['fr', 'en'];

const dictionaries: Record<Language, Messages> = { fr, en };

/** Langue du téléphone ou du navigateur : français si c'est du français, sinon anglais. */
export function detectLanguage(): Language {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr')
    ? 'fr'
    : 'en';
}

let current: Language = detectLanguage();

export function setCurrentLanguage(language: Language) {
  current = language;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

export const getMessages = (language: Language) => dictionaries[language];

/** Messages de la langue courante, pour le code hors composants. */
export const messages = () => dictionaries[current];
