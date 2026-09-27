import { groupCopies } from '../../collection/collectionData';
import { useCollection } from '../../collection/CollectionContext';
import { formatPrice, getFinishLabel } from '../../data/labels';
import type { CollectionItem, Printing } from '../../data/types';
import { useT } from '../../i18n/useT';

type OwnedCopiesProps = {
  printing: Printing;
  items: CollectionItem[];
};

/** Exemplaires possédés de cette impression, regroupés quand ils sont identiques. */
export default function OwnedCopies({ printing, items }: OwnedCopiesProps) {
  const { addItem, removeItem } = useCollection();
  const t = useT();
  const groups = groupCopies(items);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="owned-items">
      {groups.map((group) => {
        const item = group.representative;
        const quantity = group.items.length;

        return (
          <article className="owned-item" key={group.key}>
            <div className="owned-item-head">
              <div className="owned-item-main">
                <strong>{item.condition}</strong>
                <span>
                  {printing.language} • {getFinishLabel(printing.finish)}
                </span>
              </div>
              {quantity > 1 && <span className="copy-quantity">×{quantity}</span>}
            </div>

            <div className="owned-item-details">
              {item.graded ? (
                <span className="graded-badge">
                  {item.gradingCompany ?? t.owned.graded} {item.grade ?? '—'}
                </span>
              ) : (
                <span>{t.owned.notGraded}</span>
              )}
              {item.purchasePrice !== undefined && <span>{formatPrice(item.purchasePrice)}</span>}
            </div>

            {item.notes && <p className="owned-item-notes">{item.notes}</p>}

            <div className="owned-item-actions">
              <button
                type="button"
                className="copy-button"
                aria-label={t.owned.addSame}
                onClick={() =>
                  addItem({
                    printingId: item.printingId,
                    condition: item.condition,
                    graded: item.graded,
                    gradingCompany: item.gradingCompany,
                    grade: item.grade,
                    purchasePrice: item.purchasePrice,
                    notes: item.notes,
                  })
                }
              >
                +1
              </button>
              <button
                type="button"
                className="delete-item"
                onClick={() => removeItem(group.items[group.items.length - 1].id)}
              >
                {quantity > 1 ? t.owned.removeOne : t.owned.delete}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
