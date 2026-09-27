import { Link, useSearchParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import { getCatalogEntries, getPreferredPrintingsBySet, sets } from '../data/catalog';
import {
  CATALOG_TABS,
  getCatalogTab,
  getReleaseDisplayInfo,
  formatPercent,
  percent,
  plural,
  type CatalogTab,
} from '../data/labels';
import { onLogoTap } from '../easter/events';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';

/** Dates anniversaires : sortie de Cyberpunk 2077, Kickstarter de Cyberpunk TCG. */
function DateBanner() {
  const t = useT();
  const today = new Date();
  const year = today.getFullYear();
  const day = `${today.getMonth() + 1}-${today.getDate()}`;

  if (day === '12-10') {
    return (
      <aside className="ee-date-banner">
        <small>{t.dates.cyberpunkDate}</small>
        <strong>Happy birthday, Night City</strong>
        <span>{t.dates.cyberpunkText(year - 2020)}</span>
      </aside>
    );
  }

  if (day === '3-17') {
    return (
      <aside className="ee-date-banner cyan">
        <small>{t.dates.kickstarterDate}</small>
        <strong>{t.dates.kickstarterTitle}</strong>
        <span>{t.dates.kickstarterText(year - 2026)}</span>
      </aside>
    );
  }

  return null;
}

function isCatalogTab(value: string | null): value is CatalogTab {
  return CATALOG_TABS.some((tab) => tab === value);
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: CatalogTab = isCatalogTab(tabParam) ? tabParam : 'core';

  const { items, countVariant } = useCollection();
  const { preferredCardLanguage } = useSettings();
  const t = useT();

  const entries = getCatalogEntries(preferredCardLanguage);
  const ownedTotal = entries.filter(({ printing }) => countVariant(printing.variantKey) > 0).length;
  const globalPercentage = percent(ownedTotal, entries.length);
  const globalLabel = formatPercent(ownedTotal, entries.length);

  const visibleSets = sets.filter((set) => getCatalogTab(set) === activeTab);

  return (
    <main className="page">
      <header className="home-header">
        <p className="eyebrow">Cyberpunk Trading Card Game</p>
        {/* 7 appuis rapides : mode Braindance caché. */}
        <h1 onClick={onLogoTap}>CyberCardex</h1>
        <p className="page-subtitle">{t.home.subtitle}</p>
      </header>

      <DateBanner />

      <section className="stats-grid home-summary">
        <Link to="/collection" className="stat">
          <span className="stat-label">{t.home.myCollection}</span>
          <strong>
            {ownedTotal} / {entries.length}
          </strong>
          <small>{plural(items.length, t.common.copy, t.common.copies)}</small>
        </Link>
        <div className="stat">
          <span className="stat-label">{t.home.progress}</span>
          <strong>{globalLabel}</strong>
          <div className="progress">
            <div className="progress-value" style={{ width: `${globalPercentage}%` }} />
          </div>
        </div>
      </section>

      <nav className="catalog-tabs" aria-label={t.home.categories}>
        {CATALOG_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'catalog-tab active' : 'catalog-tab'}
            aria-pressed={activeTab === tab}
            onClick={() => setSearchParams(tab === 'core' ? {} : { tab }, { replace: true })}
          >
            <span>{t.home.tabs[tab]}</span>
            <small>{sets.filter((set) => getCatalogTab(set) === tab).length}</small>
          </button>
        ))}
      </nav>

      <section>
        <div className="section-header">
          <h2>{t.home.tabTitles[activeTab]}</h2>
          <span>{visibleSets.length}</span>
        </div>

        {visibleSets.length === 0 ? (
          <div className="empty-state">
            <strong>{t.home.emptyTab}</strong>
          </div>
        ) : (
          <div className="sets">
            {visibleSets.map((set) => {
              const displayInfo = getReleaseDisplayInfo(set);
              const setPrintings = getPreferredPrintingsBySet(set.id, preferredCardLanguage);
              const cardCount = setPrintings.length;
              const ownedCount = setPrintings.filter(
                (printing) => countVariant(printing.variantKey) > 0,
              ).length;
              const percentage = percent(ownedCount, cardCount);
              const complete = cardCount > 0 && ownedCount === cardCount;
              const languages = [...new Set(setPrintings.map((printing) => printing.language))];

              return (
                <Link
                  to={`/sets/${set.id}`}
                  className={complete ? 'set-card complete' : 'set-card'}
                  key={set.id}
                >
                  <div className="set-visual">
                    <span className="set-code-home">{set.code}</span>
                    <span className="set-edition-visual">{displayInfo.typeLabel}</span>
                    {displayInfo.variantLabel && (
                      <span className="set-variant-visual">{displayInfo.variantLabel}</span>
                    )}
                    <span className="set-year-visual">{set.releaseYear}</span>
                  </div>

                  <div className="set-info">
                    <div className="set-title-row">
                      <div>
                        <div className="set-meta-row">
                          <span className="set-edition">{displayInfo.typeLabel}</span>
                          {displayInfo.variantLabel && (
                            <span className="set-variant">{displayInfo.variantLabel}</span>
                          )}
                          <span className="set-year">{set.releaseYear}</span>
                          {languages.length > 0 && (
                            <span className="set-language">{languages.join(' / ')}</span>
                          )}
                        </div>
                        <h3>{set.name}</h3>
                      </div>
                      <span className="arrow">›</span>
                    </div>

                    <p>{t.home.cardsCount(ownedCount, cardCount)}</p>

                    <div className="progress">
                      <div
                        className={complete ? 'progress-value complete' : 'progress-value'}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <span className="percentage">
                      {complete ? t.common.setComplete : t.home.percentComplete(percentage)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
