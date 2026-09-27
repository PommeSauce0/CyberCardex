import { useMemo, useState } from 'react';

import { getPrintingInLanguage } from '../data/catalog';
import type { CardCondition, CardLanguage, Printing } from '../data/types';
import { useSettings } from '../settings/SettingsContext';

import { useCollection } from './CollectionContext';

/**
 * Ajout en un geste (ouverture de booster, scanner) : état et langue par défaut,
 * historique de la session pour pouvoir annuler.
 */
export function useQuickAdd() {
  const { items, addItem, removeItem } = useCollection();
  const { preferredCardLanguage } = useSettings();

  const [condition, setCondition] = useState<CardCondition>('Near Mint');
  const [language, setLanguage] = useState<CardLanguage>(preferredCardLanguage);
  const [added, setAdded] = useState<{ itemId: string; printing: Printing }[]>([]);

  // Seuls les ajouts encore dans la collection comptent : un exemplaire retiré autrement
  // (bouton « − » d'une carte, fiche…) disparaît aussi du compteur et de l'annulation.
  const history = useMemo(() => {
    const existing = new Set(items.map((item) => item.id));
    return added.filter((entry) => existing.has(entry.itemId));
  }, [added, items]);

  /** Ajoute un exemplaire ; la langue choisie est utilisée si l'impression existe dans cette langue. */
  function add(printing: Printing, exact = false) {
    const target = exact ? printing : getPrintingInLanguage(printing, language);
    const itemId = addItem({ printingId: target.id, condition, graded: false });
    setAdded((current) => [...current, { itemId, printing: target }]);
    return target;
  }

  function undo() {
    const last = history.at(-1);
    if (last) {
      removeItem(last.itemId);
      setAdded((current) => current.filter((entry) => entry.itemId !== last.itemId));
    }
  }

  return {
    condition,
    setCondition,
    language,
    setLanguage,
    history,
    count: history.length,
    last: history.at(-1)?.printing,
    add,
    undo,
  };
}

export type QuickAdd = ReturnType<typeof useQuickAdd>;
