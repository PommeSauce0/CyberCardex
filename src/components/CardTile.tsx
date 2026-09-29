import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { getThumbUrl } from '../data/catalog';
import type { Card, Printing } from '../data/types';
import { useT } from '../i18n/useT';
import { browseState } from '../navigation/browse';
import { useSettings } from '../settings/SettingsContext';

import './CardTile.css';

function CardArtwork({ card, printing }: { card: Card; printing: Printing }) {
  // Miniature d'abord ; si elle manque, image pleine taille ; sinon texte de secours.
  const [source, setSource] = useState<'thumb' | 'full' | 'none'>('thumb');

  if (source === 'none') {
    return (
      <div className="card-image-fallback">
        <span className="fallback-number">#{printing.number}</span>
        <span className="fallback-name">{card.name}</span>
        {card.subtitle && <span className="fallback-subtitle">{card.subtitle}</span>}
      </div>
    );
  }

  return (
    <img
      src={source === 'thumb' ? getThumbUrl(printing) : printing.imageUrl}
      alt={card.subtitle ? `${card.name}: ${card.subtitle}` : card.name}
      loading="lazy"
      decoding="async"
      onError={() => setSource(source === 'thumb' ? 'full' : 'none')}
    />
  );
}

/** Liste de la grille (ids d'impressions, dans l'ordre affiché) pour les flèches de la fiche. */
const BrowseContext = createContext<string[] | undefined>(undefined);

type CardTileProps = {
  card: Card;
  printing: Printing;
  /** Exemplaires possédés (toutes langues de cette impression). */
  quantity: number;
  wished?: boolean;
  /** Ligne d'info sous le nom (par défaut : numéro • rareté • langue). */
  meta?: string;
  /** Affiche la carte en grisé si elle n'est pas possédée. */
  dimMissing?: boolean;
  /** Mode ajout rapide : un appui ajoute un exemplaire au lieu d'ouvrir la fiche. */
  onActivate?: () => void;
  /** Mode ajout rapide : bouton « − » pour retirer un exemplaire. */
  onDecrement?: () => void;
};

export function CardTile({
  card,
  printing,
  quantity,
  wished = false,
  meta,
  dimMissing = true,
  onActivate,
  onDecrement,
}: CardTileProps) {
  const t = useT();
  const browse = useContext(BrowseContext);
  // Animation « +1 » : seulement après un ajout (pas à l'ouverture du mode éclair).
  const [pulse, setPulse] = useState(0);
  const activate = () => {
    onActivate?.();
    setPulse((count) => count + 1);
  };
  const owned = quantity > 0;
  const className = ['card-tile', owned ? 'owned' : dimMissing ? 'missing' : ''].join(' ');

  const content = (
    <>
      <div className="card-placeholder">
        <CardArtwork card={card} printing={printing} />
        {printing.finish === 'Foil' && <span className="foil-badge">Foil</span>}
        {owned && <div className="owned-badge">×{quantity}</div>}
        {wished && !owned && (
          <div className="wish-badge" title={t.common.inWishlist}>
            ★
          </div>
        )}
      </div>

      <div className="card-info">
        <strong className="card-name">{card.name}</strong>
        <span className={card.subtitle ? 'card-subtitle' : 'card-subtitle empty'}>
          {card.subtitle ?? ' '}
        </span>
        <span className="card-metadata">
          {meta ?? `#${printing.number} • ${printing.rarity} • ${printing.language}`}
        </span>
      </div>
    </>
  );

  // Même structure avec ou sans ajout rapide : basculer de mode met à jour les tuiles au
  // lieu de les recréer (images comprises), sinon l'appui sur l'éclair saccade.
  return (
    <div className="card-tile-cell">
      <Link
        to={`/cards/${printing.id}`}
        state={browseState(browse)}
        className={onActivate ? `${className} quick` : className}
        role={onActivate ? 'button' : undefined}
        aria-label={onActivate ? t.quickAdd.addOne(`${card.name} #${printing.number}`) : undefined}
        onClick={
          onActivate &&
          ((event) => {
            event.preventDefault();
            activate();
          })
        }
        onKeyDown={
          onActivate &&
          ((event) => {
            if (event.key === ' ') {
              event.preventDefault();
              activate();
            }
          })
        }
      >
        {content}
        {onActivate && pulse > 0 && (
          // La clé relance l'animation à chaque ajout ; le « +1 » disparaît ensuite.
          <span
            key={pulse}
            className="quick-pulse"
            aria-hidden="true"
            onAnimationEnd={() => setPulse(0)}
          >
            +1
          </span>
        )}
      </Link>
      {onActivate && owned && onDecrement && (
        <button
          type="button"
          className="quick-decrement"
          onClick={onDecrement}
          aria-label={t.quickAdd.removeOne(`${card.name} #${printing.number}`)}
        >
          −
        </button>
      )}
    </div>
  );
}

/**
 * Grille de cartes, à la taille choisie par l'utilisateur. `browse` : toute la liste affichée
 * (ids d'impressions), pour passer d'une carte à l'autre de cette liste depuis la fiche.
 */
export function CardGrid({ children, browse }: { children: ReactNode; browse?: string[] }) {
  const { cardSize } = useSettings();
  return (
    <BrowseContext.Provider value={browse}>
      <section className={`cards-grid size-${cardSize}`}>{children}</section>
    </BrowseContext.Provider>
  );
}
