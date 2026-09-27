import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { getThumbUrl } from '../data/catalog';
import type { Card, Printing } from '../data/types';
import { useT } from '../i18n/useT';
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

  if (!onActivate) {
    return (
      <Link to={`/cards/${printing.id}`} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <div className="card-tile-quick">
      <button
        type="button"
        className={`${className} quick`}
        onClick={onActivate}
        aria-label={t.quickAdd.addOne(`${card.name} #${printing.number}`)}
      >
        {content}
        {/* La clé relance l'animation « +1 » à chaque ajout. */}
        <span key={quantity} className="quick-pulse" aria-hidden="true">
          +1
        </span>
      </button>
      {owned && onDecrement && (
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

/** Grille de cartes, à la taille choisie par l'utilisateur. */
export function CardGrid({ children }: { children: ReactNode }) {
  const { cardSize } = useSettings();
  return <section className={`cards-grid size-${cardSize}`}>{children}</section>;
}
