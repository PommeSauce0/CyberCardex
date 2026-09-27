import { Link } from 'react-router-dom';

import { useT } from '../i18n/useT';

export default function NotFoundPage() {
  const t = useT();
  return (
    <main className="page page-narrow">
      <header className="page-header">
        <p className="eyebrow">{t.notFound.eyebrow}</p>
        <h1 className="page-title">{t.notFound.title}</h1>
        <p className="page-subtitle">{t.notFound.text}</p>
      </header>
      <Link to="/" className="btn btn-primary">
        {t.notFound.back}
      </Link>
    </main>
  );
}
