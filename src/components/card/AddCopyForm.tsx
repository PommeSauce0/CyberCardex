import { useState, type FormEvent } from 'react';

import {
  CONDITIONS,
  GRADING_COMPANIES,
  isCardCondition,
  isGradingCompany,
} from '../../collection/collectionData';
import { useCollection } from '../../collection/CollectionContext';
import type { CardCondition, GradingCompany } from '../../data/types';
import { useT } from '../../i18n/useT';

export default function AddCopyForm({ printingId }: { printingId: string }) {
  const { addItem } = useCollection();
  const t = useT();

  const [condition, setCondition] = useState<CardCondition>('Near Mint');
  const [graded, setGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState<GradingCompany>('PSA');
  const [grade, setGrade] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [justAdded, setJustAdded] = useState(false);
  // Options repliées par défaut : l'ajout courant = choisir l'état et valider.
  const [showDetails, setShowDetails] = useState(false);

  const detailsSummary = [
    graded && `${gradingCompany} ${grade}`.trim(),
    purchasePrice.trim() && `${purchasePrice.trim()} €`,
    notes.trim() && t.addCopy.noteShort,
  ]
    .filter(Boolean)
    .join(' • ');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    let parsedGrade: number | undefined;
    if (graded) {
      if (grade.trim() === '') {
        setShowDetails(true);
        setFormError(t.addCopy.errorGradeMissing);
        return;
      }
      parsedGrade = Number(grade.replace(',', '.'));
      if (!Number.isFinite(parsedGrade) || parsedGrade < 1 || parsedGrade > 10) {
        setFormError(t.addCopy.errorGradeRange);
        return;
      }
    }

    const normalizedPrice = purchasePrice.trim().replace(',', '.');
    const parsedPrice = normalizedPrice ? Number(normalizedPrice) : undefined;
    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setFormError(t.addCopy.errorPrice);
      return;
    }

    addItem({
      printingId,
      condition,
      graded,
      gradingCompany: graded ? gradingCompany : undefined,
      grade: graded ? parsedGrade : undefined,
      purchasePrice: parsedPrice,
      notes: notes.trim() || undefined,
    });

    // L'état reste sélectionné pour enchaîner plusieurs ajouts identiques.
    setGrade('');
    setPurchasePrice('');
    setNotes('');
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <form className="collection-form" onSubmit={handleSubmit}>
      <div className="add-quick-row">
        <select
          className="select"
          aria-label={t.addCopy.condition}
          value={condition}
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
        <button className="add-card-button" type="submit">
          {justAdded ? t.common.added : t.common.add}
        </button>
      </div>

      <button
        type="button"
        className="add-more-toggle"
        aria-expanded={showDetails}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span aria-hidden="true">{showDetails ? '−' : '+'}</span>
        {t.addCopy.more}
        {!showDetails && detailsSummary && <em>{detailsSummary}</em>}
      </button>

      {showDetails && (
        <div className="add-more">
          <label className="toggle-row">
            <div>
              <strong>{t.addCopy.graded}</strong>
              <span>PSA, BGS, CGC...</span>
            </div>
            <input
              type="checkbox"
              checked={graded}
              onChange={(event) => {
                setGraded(event.target.checked);
                setFormError('');
              }}
            />
          </label>

          {graded && (
            <div className="grading-fields">
              <label>
                <span>{t.addCopy.company}</span>
                <select
                  value={gradingCompany}
                  onChange={(event) => {
                    if (isGradingCompany(event.target.value)) {
                      setGradingCompany(event.target.value);
                    }
                  }}
                >
                  {GRADING_COMPANIES.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t.addCopy.grade}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="10"
                  value={grade}
                  onChange={(event) => {
                    setGrade(event.target.value);
                    setFormError('');
                  }}
                />
              </label>
            </div>
          )}

          <label>
            <span>{t.addCopy.purchasePrice}</span>
            <div className="price-input">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={purchasePrice}
                onChange={(event) => setPurchasePrice(event.target.value)}
              />
              <span>€</span>
            </div>
          </label>

          <label>
            <span>{t.addCopy.notes}</span>
            <textarea
              rows={2}
              placeholder={t.addCopy.notesPlaceholder}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
      )}

      {formError && (
        <div className="form-error" role="alert">
          {formError}
        </div>
      )}
    </form>
  );
}
