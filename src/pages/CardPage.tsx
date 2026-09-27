import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import AddCopyForm from '../components/card/AddCopyForm';
import CardViewer from '../components/card/CardViewer';
import OwnedCopies from '../components/card/OwnedCopies';
import {
  getCardById,
  getPreferredPrintingsBySet,
  getPrintingById,
  getPrintingsByCard,
  getSetById,
  getThumbUrl,
} from '../data/catalog';
import { COLOR_HEX, formatPrice, getFinishLabel, plural } from '../data/labels';
import { cardmarketPriceDate, getCardmarketLink } from '../data/links';
import type { Card, Printing } from '../data/types';
import { EDGERUNNERS, isSpecialPrinting, playEdgerunners } from '../easter/events';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';

import './CardPage.css';

function RulesLine({ line }: { line: string }) {
  return line.split(/(\{[^}]+\})/).map((part, index) =>
    part.startsWith('{') && part.endsWith('}') ? (
      <span key={index} className="rules-keyword">
        {part.slice(1, -1)}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * "{Call} Trash 3." → mots-clés {…} mis en valeur, un paragraphe par ligne.
 * « A // B » sépare les effets au choix : un tiret par effet, comme sur la carte.
 */
function RulesText({ text }: { text: string }) {
  return (
    <div className="rules-text">
      {text.split('\n').flatMap((line, lineIndex) => {
        const options = line.split(/\s*\/\/\s*/);
        return options.length > 1 ? (
          options.map((option, optionIndex) => (
            <p key={`${lineIndex}-${optionIndex}`} className="rules-option">
              <RulesLine line={option} />
            </p>
          ))
        ) : (
          <p key={lineIndex}>
            <RulesLine line={line} />
          </p>
        );
      })}
    </div>
  );
}

/** Ce que fait la carte en jeu : couleur, type, stats et texte de règles (toujours en anglais). */
function GameInfo({ card }: { card: Card }) {
  const t = useT();
  const stats = [
    { label: t.card.cost, value: card.cost },
    { label: t.card.power, value: card.power },
    { label: 'RAM', value: card.ram },
  ].filter((stat) => stat.value !== undefined);

  if (!card.color && !card.cardType && !card.rulesText) {
    return null;
  }

  return (
    <section className="detail-panel card-block-effect">
      <div className="detail-panel-title">{t.card.effect}</div>

      <div className="game-summary">
        {stats.length > 0 && (
          <div className="game-stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="game-tags">
          {card.color && (
            <span className="game-tag">
              <span className="color-dot" style={{ background: COLOR_HEX[card.color] }} />
              {t.colors[card.color]}
            </span>
          )}
          {card.cardType && <span className="game-tag">{t.cardTypes[card.cardType]}</span>}
          {card.classifications?.map((classification) => (
            <Link
              key={classification}
              to={`/search?q=${encodeURIComponent(classification)}`}
              className="game-tag game-tag-link"
            >
              {classification}
            </Link>
          ))}
        </div>
      </div>

      {card.rulesText && <RulesText text={card.rulesText} />}
    </section>
  );
}

/** Toutes les impressions de la carte (séries, langues, finitions), la courante en surbrillance. */
function Versions({ printing, versions }: { printing: Printing; versions: Printing[] }) {
  const { countPrinting } = useCollection();
  const t = useT();

  return (
    <section className="card-versions card-block-versions">
      <div className="card-section-title">
        <h2>{t.card.versions}</h2>
        <span>{versions.length}</span>
      </div>
      <div className="card-versions-grid">
        {versions.map((version) => {
          const versionSet = getSetById(version.setId);
          const count = countPrinting(version.id);
          const current = version.id === printing.id;
          return (
            <Link
              key={version.id}
              to={`/cards/${version.id}`}
              replace
              className={['card-version', current ? 'current' : '', count > 0 ? 'owned' : '']
                .join(' ')
                .trim()}
              aria-current={current ? 'page' : undefined}
            >
              <span className="card-version-image">
                <img src={getThumbUrl(version)} alt="" loading="lazy" decoding="async" />
                {count > 0 && <span className="card-version-count">×{count}</span>}
              </span>
              <span className="card-version-set">
                {versionSet ? `${versionSet.name} ${versionSet.edition}` : version.setId}
              </span>
              <span className="card-version-meta">
                #{version.number} • {version.language}
                {version.finish === 'Foil' && ' • Foil'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// La clé remet l'état à zéro (image, visionneuse, formulaire) quand on change de carte.
export default function CardPage() {
  const { printingId } = useParams();
  return <CardPageContent key={printingId} printingId={printingId} />;
}

function CardPageContent({ printingId }: { printingId?: string }) {
  const { countVariant, getItemsForPrinting, isWished, toggleWish } = useCollection();
  const { preferredCardLanguage } = useSettings();
  const t = useT();

  const [imageError, setImageError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const printing = printingId ? getPrintingById(printingId) : undefined;
  const card = printing ? getCardById(printing.cardId) : undefined;
  const set = printing ? getSetById(printing.setId) : undefined;

  // Easter egg : Johnny Silverhand fait « buguer » sa fiche à l'ouverture,
  // et ses versions spéciales ajoutent sa réplique culte.
  const isJohnny = !!card?.id.startsWith('johnny-silverhand');
  const [glitching, setGlitching] = useState(isJohnny);
  const [johnnyQuote, setJohnnyQuote] = useState(
    isJohnny && !!printing && isSpecialPrinting(printing),
  );
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setGlitching(false), 750),
      window.setTimeout(() => setJohnnyQuote(false), 3700),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  if (!printing || !card || !set) {
    return (
      <main className="page">
        <Link className="back" to="/">
          ← {t.nav.home}
        </Link>
        <div className="empty-state">
          <strong>{t.card.notFoundTitle}</strong>
          <p>{t.card.notFoundText}</p>
        </div>
      </main>
    );
  }

  const ownedItems = getItemsForPrinting(printing.id);
  const cardmarket = getCardmarketLink(card, printing);

  // Promos Edgerunners (Rebecca #007 / Adam #008) : la scène se rejoue depuis leurs fiches.
  const ownsPromo = (id: string) => {
    const promo = getPrintingById(id);
    return !!promo && countVariant(promo.variantKey) > 0;
  };
  const edgerunnersReplay =
    (Object.values(EDGERUNNERS) as string[]).includes(printing.id) &&
    ownsPromo(EDGERUNNERS.rebecca) &&
    ownsPromo(EDGERUNNERS.adam);
  const wished = isWished(printing.id);
  const treatments = printing.treatments ?? [];
  const cardAlt = card.subtitle ? `${card.name}: ${card.subtitle}` : card.name;

  // Carte précédente / suivante dans la série (même ordre que la grille).
  const setPrintings = getPreferredPrintingsBySet(set.id, preferredCardLanguage);
  const position = setPrintings.findIndex((item) => item.variantKey === printing.variantKey);
  const previous = position > 0 ? setPrintings[position - 1] : undefined;
  const next = position >= 0 ? setPrintings[position + 1] : undefined;

  const versions = getPrintingsByCard(card.id);

  return (
    <main className="page card-page">
      <nav className="card-page-nav">
        <Link className="back" to={`/sets/${set.id}`}>
          ← {set.name} {set.edition}
        </Link>
        <div className="card-stepper">
          {previous ? (
            <Link to={`/cards/${previous.id}`} aria-label={t.card.previous} replace>
              ‹ #{previous.number}
            </Link>
          ) : (
            <span className="card-stepper-edge" />
          )}
          {position >= 0 && (
            <span className="card-stepper-position">
              {position + 1} / {setPrintings.length}
            </span>
          )}
          {next ? (
            <Link to={`/cards/${next.id}`} aria-label={t.card.next} replace>
              #{next.number} ›
            </Link>
          ) : (
            <span className="card-stepper-edge" />
          )}
        </div>
      </nav>

      <div className="card-layout">
        {/* Colonne gauche : image + versions. */}
        <aside className="card-side">
          <button
            type="button"
            className="card-artwork-button card-block-art"
            onClick={() => setViewerOpen(true)}
            disabled={imageError}
            aria-label={imageError ? t.card.imageUnavailable : t.card.viewCloser(card.name)}
          >
            <div
              className={[
                'card-artwork-large',
                printing.finish === 'Foil' ? 'is-foil' : '',
                glitching ? 'ee-glitch' : '',
              ]
                .join(' ')
                .trim()}
            >
              {!imageError ? (
                <img
                  src={printing.imageUrl}
                  alt={cardAlt}
                  draggable={false}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="large-fallback">
                  <strong>#{printing.number}</strong>
                  <span>{card.name}</span>
                  {card.subtitle && <small>{card.subtitle}</small>}
                </div>
              )}
            </div>
            {!imageError && (
              <span className="card-artwork-hint">
                <span aria-hidden="true">⛶</span>
                {t.card.closeUp}
              </span>
            )}
          </button>

          {versions.length > 1 && <Versions printing={printing} versions={versions} />}
        </aside>

        {/* Colonne droite, dans l'ordre d'usage : quoi → ma collection → effet → détails. */}
        <div className="card-main">
          <header className="card-heading card-block-head">
            <div className="card-detail-meta">
              <span>{set.edition}</span>
              <span>#{printing.number}</span>
              <span>{printing.rarity}</span>
              <span>{printing.language}</span>
              {printing.finish === 'Foil' && <span className="meta-foil">Foil</span>}
            </div>
            <h1 className={glitching ? 'ee-glitch' : undefined}>{card.name}</h1>
            {card.subtitle && <p className="card-detail-subtitle">{card.subtitle}</p>}
            {printing.localizedName && printing.language !== 'EN' && (
              <p className="card-detail-localized">{printing.localizedName}</p>
            )}
            {edgerunnersReplay && (
              <button type="button" className="ee-replay ee-er-replay" onClick={playEdgerunners}>
                ▶ Edgerunners
              </button>
            )}
          </header>

          <section className="detail-panel collection-panel card-block-collection">
            <div className="collection-panel-head">
              <div className="owned-summary">
                <span>{t.home.myCollection}</span>
                <strong>{plural(ownedItems.length, t.common.copy, t.common.copies)}</strong>
              </div>
              <button
                type="button"
                className={wished ? 'wish-button active' : 'wish-button'}
                aria-pressed={wished}
                onClick={() => toggleWish(printing.id)}
              >
                {wished ? t.card.inWishlist : t.card.addWishlist}
              </button>
            </div>

            <AddCopyForm printingId={printing.id} />
            <OwnedCopies printing={printing} items={ownedItems} />
          </section>

          <GameInfo card={card} />

          <section className="detail-panel card-block-print">
            <div className="detail-panel-title">{t.card.printing}</div>
            <dl className="details-grid">
              <dt>{t.card.set}</dt>
              <dd>
                <Link to={`/sets/${set.id}`}>
                  {set.name} — {set.edition}
                </Link>
              </dd>
              <dt>{t.card.number}</dt>
              <dd>#{printing.number}</dd>
              <dt>{t.card.rarity}</dt>
              <dd>{printing.rarity}</dd>
              <dt>{t.card.language}</dt>
              <dd>{printing.language}</dd>
              <dt>{t.card.finish}</dt>
              <dd className={printing.finish === 'Foil' ? 'finish-foil' : ''}>
                {getFinishLabel(printing.finish)}
              </dd>
              {treatments.length > 0 && (
                <>
                  <dt>{t.card.treatments}</dt>
                  <dd className="treatments">
                    {treatments.map((treatment) => (
                      <span key={treatment} className="treatment-chip">
                        {treatment}
                      </span>
                    ))}
                  </dd>
                </>
              )}
              <dt>{t.card.artist}</dt>
              <dd>
                {printing.artist ? (
                  <Link to={`/search?q=${encodeURIComponent(printing.artist)}`}>
                    {printing.artist}
                  </Link>
                ) : (
                  t.card.unknown
                )}
              </dd>
            </dl>
            <div className="external-links">
              <a
                className="btn source-button"
                href={cardmarket.url}
                target="_blank"
                rel="noreferrer"
              >
                {cardmarket.exact ? t.card.cardmarketView : t.card.cardmarketSearch}
                <span aria-hidden="true">↗</span>
              </a>
              {printing.sourceUrl && (
                <a
                  className="btn source-button"
                  href={printing.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.card.officialSite}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
            {cardmarket.price !== undefined && (
              <p className="cardmarket-price">
                {t.card.cardmarketPrice(formatPrice(cardmarket.price), cardmarketPriceDate())}
              </p>
            )}
          </section>
        </div>
      </div>

      {johnnyQuote && (
        <p className="ee-quote" aria-hidden="true">
          <small>Johnny Silverhand</small>
          Wake the f*** up, Samurai. We have a city to burn.
        </p>
      )}

      {viewerOpen && !imageError && (
        <CardViewer card={card} printing={printing} onClose={closeViewer} />
      )}
    </main>
  );
}
