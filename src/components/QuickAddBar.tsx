import { CONDITIONS, isCardCondition } from '../collection/collectionData';
import type { QuickAdd } from '../collection/useQuickAdd';
import { getCardById } from '../data/catalog';
import type { CardLanguage } from '../data/types';
import { useT } from '../i18n/useT';

import { BoltIcon } from './Icons';
import './QuickAddBar.css';

const LANGUAGES: CardLanguage[] = ['EN', 'FR'];

type QuickAddBarProps = {
  quickAdd: QuickAdd;
  onClose?: () => void;
  /** Texte d'aide affiché tant que rien n'a été ajouté. */
  hint?: string;
  /** Intégrée dans la page au lieu d'être fixée en bas de l'écran. */
  inline?: boolean;
};

/** Barre fixe en bas d'écran : réglages de l'ajout rapide + compteur + annuler. */
export default function QuickAddBar({ quickAdd, onClose, hint, inline = false }: QuickAddBarProps) {
  const t = useT();
  const { condition, setCondition, language, setLanguage, count, last, undo } = quickAdd;
  const lastCard = last ? getCardById(last.cardId) : undefined;

  return (
    <div
      className={inline ? 'quick-add-bar inline' : 'quick-add-bar'}
      role="region"
      aria-label={t.quickAdd.title}
    >
      <div className="quick-add-status" aria-live="polite">
        <strong>
          <BoltIcon /> {t.quickAdd.title}
          {count > 0 && <span className="quick-add-count">+{count}</span>}
        </strong>
        <small>
          {lastCard && last
            ? t.quickAdd.last(`${lastCard.name} #${last.number} ${last.language}`)
            : (hint ?? t.quickAdd.hint)}
        </small>
      </div>

      <div className="quick-add-settings">
        <select
          className="select"
          value={condition}
          aria-label={t.quickAdd.condition}
          onChange={(event) => {
            if (isCardCondition(event.target.value)) {
              setCondition(event.target.value);
            }
          }}
        >
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <div className="quick-add-lang" role="group" aria-label={t.quickAdd.language}>
          {LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              className={language === code ? 'active' : ''}
              aria-pressed={language === code}
              onClick={() => setLanguage(code)}
            >
              {code}
            </button>
          ))}
        </div>

        <button type="button" className="btn" disabled={count === 0} onClick={undo}>
          {t.quickAdd.undo}
        </button>
        {onClose && (
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t.quickAdd.done}
          </button>
        )}
      </div>
    </div>
  );
}
