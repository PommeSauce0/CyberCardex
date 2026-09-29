import { Link } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { CardGrid, CardTile } from '../components/CardTile';
import { getCardById, getPrintingById, getSetById } from '../data/catalog';
import { formatPrice } from '../data/labels';
import { getCardmarketLink } from '../data/links';
import { usePriceData } from '../data/livePrices';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';

export default function WishlistPage() {
  const { wishlist, countVariant, countCard, toggleWish } = useCollection();
  const t = useT();
  const { cardmarket: cardmarketMode } = useSettings();
  usePriceData();

  // Une ligne par impression : une ancienne entrée EN + FR de la même carte ne compte qu'une fois.
  const seen = new Set<string>();
  const rows = wishlist.flatMap((printingId) => {
    const printing = getPrintingById(printingId);
    const card = printing && getCardById(printing.cardId);
    const set = printing && getSetById(printing.setId);
    if (!printing || !card || !set || seen.has(printing.variantKey)) {
      return [];
    }
    seen.add(printing.variantKey);
    return [{ printing, card, set }];
  });

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">{t.wishlist.eyebrow}</p>
        <h1 className="page-title">Wishlist</h1>
        <p className="page-subtitle">{t.wishlist.subtitle}</p>
      </header>

      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>{t.wishlist.emptyTitle}</strong>
          <p>{t.wishlist.emptyText}</p>
          <Link to="/search?own=missing" className="btn btn-primary">
            {t.wishlist.seeMissing}
          </Link>
        </div>
      ) : (
        <>
          <div className="section-header">
            <h2>{t.wishlist.toFind}</h2>
            <span>{rows.length}</span>
          </div>
          <CardGrid browse={rows.map((row) => row.printing.id)}>
            {rows.map(({ card, set, printing }) => {
              const cardmarket = getCardmarketLink(card, printing);
              return (
                <div key={printing.id} className="wishlist-item">
                  <CardTile
                    card={card}
                    printing={printing}
                    quantity={countVariant(printing.variantKey)}
                    dimMissing={false}
                    meta={`${set.code} #${printing.number} • ${printing.language} • ${printing.rarity}`}
                  />
                  {countCard(card.id) > countVariant(printing.variantKey) && (
                    <p className="wishlist-owned">
                      {t.wishlist.ownedElsewhere(
                        countCard(card.id) - countVariant(printing.variantKey),
                      )}
                    </p>
                  )}
                  <div className="wishlist-actions">
                    {cardmarketMode !== 'off' && (
                      <a
                        className="btn wishlist-price"
                        href={cardmarket.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {cardmarketMode === 'link'
                          ? t.wishlist.cardmarket
                          : cardmarket.price !== undefined
                            ? formatPrice(cardmarket.price)
                            : t.wishlist.price}{' '}
                        ↗
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn wishlist-remove"
                      onClick={() => toggleWish(printing.id)}
                    >
                      {t.wishlist.remove}
                    </button>
                  </div>
                </div>
              );
            })}
          </CardGrid>
        </>
      )}
    </main>
  );
}
