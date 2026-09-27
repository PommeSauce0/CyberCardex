import type { Printing } from '../data/types';

/*
 * Easter eggs : les pages envoient des événements, la couche globale (EasterEggLayer)
 * les affiche. Aucun état partagé à faire passer dans l'arbre React.
 */

export type EasterToast = {
  kicker: string;
  title: string;
  text?: string;
  tone?: 'yellow' | 'cyan' | 'red';
};

const TOAST = 'cybercardex:toast';
const CARD_ADDED = 'cybercardex:card-added';
const BRAINDANCE_SET = 'cybercardex:braindance-set';
const BRAINDANCE_MODE = 'cybercardex:braindance-mode';

function listen<T>(name: string, handler: (detail: T) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<T>).detail);
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}

const emit = <T>(name: string, detail: T) =>
  window.dispatchEvent(new CustomEvent(name, { detail }));

export const showToast = (toast: EasterToast) => emit(TOAST, toast);
export const onToast = (handler: (toast: EasterToast) => void) => listen(TOAST, handler);

/** Envoyé à chaque exemplaire ajouté à la collection. */
export const emitCardAdded = (printingId: string) => emit(CARD_ADDED, printingId);
export const onCardAdded = (handler: (printingId: string) => void) => listen(CARD_ADDED, handler);

/** Rejoue l'animation « série complète » d'une série. */
export const playBraindance = (setId: string) => emit(BRAINDANCE_SET, setId);
export const onBraindance = (handler: (setId: string) => void) => listen(BRAINDANCE_SET, handler);

/** Mode Braindance caché (7 appuis sur le logo). */
const startBraindanceMode = () => emit(BRAINDANCE_MODE, null);
export const onBraindanceMode = (handler: () => void) => listen(BRAINDANCE_MODE, handler);

/**
 * Promos Set 1 de Pandart Studio dont les illustrations se répondent : Rebecca tire vers
 * le haut (#007), Adam Smasher lui tombe dessus (#008) — comme dans Edgerunners.
 */
export const EDGERUNNERS = {
  rebecca: 'f625d2ac-3007-48f4-82b3-b521fc11a172',
  adam: 'aedbd6fe-19d2-4185-b708-b6393e21da20',
} as const;

const EDGERUNNERS_SCENE = 'cybercardex:edgerunners';
export const playEdgerunners = () => emit(EDGERUNNERS_SCENE, null);
export const onEdgerunners = (handler: () => void) => listen(EDGERUNNERS_SCENE, handler);

/** Versions spéciales : Secret, Iconic, Nova Rare (celles qui déclenchent les effets). */
export const isSpecialPrinting = (printing: Printing) =>
  /secret|iconic|nova/i.test(printing.rarity);

/** Compte des appuis rapprochés : `onTap()` renvoie vrai au 7e appui en moins de 3 s. */
function createTapCounter(target = 7, windowMs = 3000) {
  let taps: number[] = [];
  return () => {
    const now = Date.now();
    taps = [...taps.filter((time) => now - time < windowMs), now];
    if (taps.length >= target) {
      taps = [];
      return true;
    }
    return false;
  };
}

const logoTaps = createTapCounter();

/** À brancher sur le logo (barre du haut, titre de l'accueil) : 7 appuis = mode Braindance. */
export function onLogoTap() {
  if (logoTaps()) {
    startBraindanceMode();
  }
}
