import { useT } from '../i18n/useT';

export default function RouteError() {
  const t = useT();
  return (
    <main className="page page-narrow">
      <header className="page-header">
        <p className="eyebrow">{t.crash.eyebrow}</p>
        <h1 className="page-title">{t.crash.title}</h1>
        <p className="page-subtitle">{t.crash.text}</p>
      </header>
      <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        {t.crash.reload}
      </button>
    </main>
  );
}
