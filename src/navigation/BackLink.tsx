import { Link, useNavigate } from 'react-router-dom';

import { useT } from '../i18n/useT';

import { pageLabel, previousPage } from './backTrail';

type Props = {
  /** Page parente, quand il n'y a pas de page précédente (app ouverte directement ici). */
  fallbackTo: string;
  fallbackLabel: string;
};

/** Flèche + nom de la page (coupé avec « … » s'il est trop long). */
function BackContent({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">←</span>
      <span className="back-label">{label}</span>
    </>
  );
}

/** « ← … » : revient à la page précédente de l'app (avec son nom), sinon à la page parente. */
export default function BackLink({ fallbackTo, fallbackLabel }: Props) {
  const t = useT();
  const navigate = useNavigate();
  const previous = previousPage();

  if (previous) {
    return (
      <button type="button" className="back back-button" onClick={() => navigate(-1)}>
        <BackContent label={pageLabel(previous, t) ?? fallbackLabel} />
      </button>
    );
  }
  return (
    <Link className="back" to={fallbackTo} replace>
      <BackContent label={fallbackLabel} />
    </Link>
  );
}
