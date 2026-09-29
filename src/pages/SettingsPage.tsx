import { Capacitor } from '@capacitor/core';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

import { parseImport, type ParsedImport } from '../collection/collectionData';
import { useCollection, type ImportMode } from '../collection/CollectionContext';
import { exportCsv, exportJson, type SavedFile } from '../collection/exportFiles';
import { cards, getPrintingById, printings, sets } from '../data/catalog';
import HoldConfirmDialog from '../components/HoldConfirmDialog';
import StorageWarning from '../storage/StorageWarning';
import { loadDecks, saveDecks } from '../decks/deckStorage';
import { quietEasterEggs } from '../easter/events';
import type { CardLanguage } from '../data/types';
import { LANGUAGES as INTERFACE_LANGUAGES } from '../i18n';
import { useT } from '../i18n/useT';
import {
  CARDMARKET_MODES,
  DECK_CREATIONS,
  UI_SIZES,
  useSettings,
} from '../settings/SettingsContext';
import { UpdateSettings } from '../update/UpdatePanel';
import { updatesEnabled } from '../update/updater';

import { OFFICIAL_LINKS } from './officialLinks';
import './SettingsPage.css';

const CARD_LANGUAGES: CardLanguage[] = ['FR', 'EN'];

const REPOSITORY_URL = 'https://github.com/PommeSauce0/CyberCardex';

const LINK_NAMES = { discord: 'Discord', instagram: 'Instagram', x: 'X', facebook: 'Facebook' };

/** Nom de chaque langue dans sa propre langue. */
const LANGUAGE_NAMES = { fr: 'Français', en: 'English' } as const;

type Message = { kind: 'success' | 'error'; text: string };

/** Choix exclusif : les mêmes pastilles que les filtres de l'app (Toutes, Possédées…). */
function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="filters settings-choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={option.value === value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Ligne de réglage : nom et aide à gauche, contrôle à droite (dessous sur petit écran). */
function Row({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <strong>{title}</strong>
        {hint && <span>{hint}</span>}
      </div>
      {children && <div className="settings-row-control">{children}</div>}
    </div>
  );
}

function Group({
  id,
  title,
  intro,
  danger,
  children,
}: {
  id?: string;
  title: string;
  intro?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={danger ? 'settings-group danger' : 'settings-group'}>
      <h2>{title}</h2>
      {intro && <p className="settings-group-intro">{intro}</p>}
      <div className="settings-card">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const { items, wishlist, importData, clearAll } = useCollection();
  const t = useT();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [wiping, setWiping] = useState(false);
  const [confirming, setConfirming] = useState<ImportMode>();

  // Arrivée depuis la banderole de mise à jour (#update) : on amène la section à l'écran.
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#update') {
      const section = document.getElementById('update');
      section?.scrollIntoView({ block: 'center' });
      section?.classList.add('flash');
    }
  }, [hash]);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      const parsed = parseImport(await file.text());
      setPendingImport(parsed);
      setMessage(null);
    } catch (error) {
      setPendingImport(null);
      setMessage({ kind: 'error', text: (error as Error).message });
    }
  }

  /**
   * « restore » : collection et wishlist vides (appareil neuf, ou après « Vider ») : on reprend
   * tout, réglages compris, mais les decks de la sauvegarde s'ajoutent aux decks existants.
   */
  function confirmImport(choice: ImportMode | 'restore', confirmed = false) {
    if (!pendingImport) {
      return;
    }
    const importedDecks = pendingImport.decks;
    // Données déjà présentes : confirmation en deux temps (fenêtre verte), l'import étant
    // irréversible dans les deux modes.
    if (
      choice !== 'restore' &&
      !confirmed &&
      (items.length > 0 || wishlist.length > 0 || (importedDecks && loadDecks().length > 0))
    ) {
      setConfirming(choice);
      return;
    }
    setConfirming(undefined);
    const mode: ImportMode = choice === 'restore' ? 'replace' : choice;
    // Cartes importées d'un coup : pas de scène Edgerunners ni de « série complète ».
    quietEasterEggs();
    const added = importData(pendingImport, mode);
    // Decks : « Remplacer » reprend ceux de la sauvegarde, sinon on ajoute ceux qui manquent.
    // Sauvegarde v1 (sans decks) : on n'y touche pas. Réglages : pas en « Fusionner ».
    if (importedDecks) {
      const current = loadDecks();
      const known = new Set(current.map((deck) => deck.id));
      saveDecks(
        choice === 'replace'
          ? importedDecks
          : [...current, ...importedDecks.filter((deck) => !known.has(deck.id))],
      );
    }
    if (choice !== 'merge' && pendingImport.settings) {
      settings.restoreSettings(pendingImport.settings);
    }
    const unknown = pendingImport.collection.filter(
      (item) => !getPrintingById(item.printingId),
    ).length;
    setPendingImport(null);
    setMessage({
      kind: 'success',
      text:
        t.settings.imported(
          added,
          mode === 'merge' ? pendingImport.collection.length - added : 0,
          unknown,
        ) + (importedDecks ? ` ${t.settings.importedDecks(importedDecks.length)}` : ''),
    });
  }

  /** Lance un export ; le fichier enregistré ou l'échec s'affiche sous les boutons. */
  async function runExport(action: () => Promise<SavedFile>) {
    try {
      const saved = await action();
      if (saved) {
        setMessage({ kind: 'success', text: t.settings.exportSaved(saved.name) });
      }
    } catch {
      setMessage({ kind: 'error', text: t.settings.exportFailed });
    }
  }

  const backup = () =>
    void runExport(() => exportJson(items, wishlist, loadDecks(), settings.snapshot));

  /** Nouveau départ : collection, wishlist et decks (les réglages restent). */
  function wipe() {
    clearAll();
    saveDecks([]);
    setWiping(false);
    setMessage({ kind: 'success', text: t.settings.resetDone });
  }

  const pendingUnknown = pendingImport
    ? pendingImport.collection.filter((item) => !getPrintingById(item.printingId)).length
    : 0;
  const empty = items.length === 0 && wishlist.length === 0;
  // Fusionner ou remplacer n'a de sens que si la collection ou la wishlist a du contenu.
  const hasData = !empty;
  const deckCount = loadDecks().length;

  return (
    <main className="page page-narrow settings-page">
      <header className="page-header">
        <p className="eyebrow">CyberCardex</p>
        <h1 className="page-title">{t.nav.settings}</h1>
      </header>

      <Group title={t.settings.groupDisplay}>
        <Row title={t.settings.appLanguage}>
          <Choice
            label={t.settings.appLanguage}
            options={INTERFACE_LANGUAGES.map((language) => ({
              value: language,
              label: LANGUAGE_NAMES[language],
            }))}
            value={settings.interfaceLanguage}
            onChange={settings.setInterfaceLanguage}
          />
        </Row>
        <Row title={t.settings.cardLanguage} hint={t.settings.cardLanguageHint}>
          <Choice
            label={t.settings.cardLanguage}
            options={CARD_LANGUAGES.map((code) => ({ value: code, label: code }))}
            value={settings.preferredCardLanguage}
            onChange={settings.setPreferredCardLanguage}
          />
        </Row>
        <Row title={t.settings.uiSize} hint={t.settings.uiSizeHint}>
          <Choice
            label={t.settings.uiSize}
            options={UI_SIZES.map((size) => ({ value: size, label: t.settings.uiSizes[size] }))}
            value={settings.uiSize}
            onChange={settings.setUiSize}
          />
        </Row>
      </Group>

      <Group title={t.decks.title}>
        <Row title={t.settings.deckCreation} hint={t.settings.deckCreationHint}>
          <Choice
            label={t.settings.deckCreation}
            options={DECK_CREATIONS.map((mode) => ({
              value: mode,
              label: t.settings.deckCreations[mode],
            }))}
            value={settings.deckCreation}
            onChange={settings.setDeckCreation}
          />
        </Row>
      </Group>

      <Group title={t.home.myCollection}>
        <Row
          title={t.settings.collectionCounts(items.length, wishlist.length)}
          hint={t.settings.backupHint}
        />
        <StorageWarning />
        <div className="settings-buttons">
          <button type="button" className="btn btn-primary" onClick={backup}>
            {t.settings.exportJson}
          </button>
          <button
            type="button"
            className="btn"
            disabled={items.length === 0}
            onClick={() => void runExport(() => exportCsv(items))}
          >
            {t.settings.exportCsv}
          </button>
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            {t.settings.import}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            // Android classe souvent les .json en « fichier inconnu » : dans l'app, on montre
            // tous les fichiers (le contenu est vérifié à l'import).
            accept={Capacitor.isNativePlatform() ? undefined : 'application/json,.json'}
            hidden
            onChange={handleFile}
          />
        </div>

        {pendingImport && (
          <div className="import-preview" role="dialog" aria-label={t.settings.confirmImport}>
            <strong>{t.settings.importReady}</strong>
            <p>
              {t.settings.importSummary(
                pendingImport.collection.length,
                pendingImport.wishlist.length,
                pendingImport.rejected,
                pendingUnknown,
              )}
              {pendingImport.decks && ` • ${t.settings.decksCount(pendingImport.decks.length)}`}
            </p>
            <div className="settings-actions">
              {hasData ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => confirmImport('merge')}
                  >
                    {t.settings.merge}
                  </button>
                  <button type="button" className="btn" onClick={() => confirmImport('replace')}>
                    {t.settings.replace}
                  </button>
                </>
              ) : (
                // Collection vide : on restaure tout, sans effacer les decks déjà présents.
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => confirmImport('restore')}
                >
                  {t.settings.importNow}
                </button>
              )}
              <button type="button" className="btn" onClick={() => setPendingImport(null)}>
                {t.common.cancel}
              </button>
            </div>
          </div>
        )}

        {message && (
          <p className={`settings-message ${message.kind}`} role="status">
            {message.text}
          </p>
        )}
      </Group>

      <Group title={t.settings.groupExperimental} intro={t.settings.experimentalIntro}>
        <Row title="Cardmarket" hint={t.settings.cardmarketHint}>
          <Choice
            label="Cardmarket"
            options={CARDMARKET_MODES.map((mode) => ({
              value: mode,
              label: t.settings.cardmarketModes[mode],
            }))}
            value={settings.cardmarket}
            onChange={settings.setCardmarket}
          />
        </Row>
      </Group>

      <Group id="update" title={t.update.title}>
        <Row
          title={`${t.about.version} ${__APP_VERSION__}`}
          hint={updatesEnabled ? t.update.text : undefined}
        />
        {updatesEnabled && (
          <div className="settings-update">
            <UpdateSettings />
          </div>
        )}
      </Group>

      <Group title={t.about.title}>
        <p className="settings-unofficial">{t.about.unofficial}</p>
        <details className="settings-details">
          <summary>{t.about.officialLinks}</summary>
          <nav className="settings-official-links" aria-label={t.about.officialLinks}>
            {OFFICIAL_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{ '--brand': link.color } as CSSProperties}
              >
                <span className="settings-official-dot" aria-hidden="true" />
                {link.key === 'site'
                  ? t.about.officialSite
                  : link.key === 'rules'
                    ? t.about.howToPlay
                    : LINK_NAMES[link.key]}{' '}
                ↗
              </a>
            ))}
          </nav>
        </details>
        <details className="settings-details">
          <summary>{t.settings.aboutCredits}</summary>
          <p>{t.about.credits}</p>
          <p>
            {t.about.cardData}{' '}
            <a href="https://cyberpunktcg.com" target="_blank" rel="noreferrer">
              cyberpunktcg.com
            </a>{' '}
            ({t.settings.catalogCounts(cards.length, printings.length, sets.length)})
          </p>
          <p>{t.about.prices}</p>
        </details>
        <details className="settings-details">
          <summary>{t.about.privacyTitle}</summary>
          <p>{t.about.privacy}</p>
          <p>{t.about.privacyUpdates}</p>
          <p>{t.about.privacyPrices}</p>
        </details>
        <details className="settings-details">
          <summary>{t.about.licenseTitle}</summary>
          <p>
            {t.about.license}{' '}
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
              {t.about.sourceCode}
            </a>
          </p>
        </details>
      </Group>

      <Group title={t.settings.groupDanger} danger>
        <Row title={t.settings.reset} hint={t.settings.resetHint}>
          <button
            type="button"
            className="btn btn-danger"
            disabled={empty && deckCount === 0}
            onClick={() => setWiping(true)}
          >
            {t.settings.resetButton}
          </button>
        </Row>
      </Group>

      {wiping && (
        <HoldConfirmDialog
          tone="danger"
          kicker={t.settings.wipeKicker}
          title={t.settings.wipeTitle}
          text={[
            t.settings.wipeText(items.length, wishlist.length, deckCount),
            t.settings.wipeKeep,
          ]}
          hold={{
            finalText: t.settings.wipeFinalText,
            label: t.settings.wipeHold,
            holding: t.settings.wipeHolding,
          }}
          onBackup={backup}
          onConfirm={wipe}
          onClose={() => setWiping(false)}
        />
      )}
      {confirming === 'replace' && pendingImport && (
        <HoldConfirmDialog
          tone="safe"
          kicker={t.settings.replaceKicker}
          title={t.settings.replaceTitle}
          text={[
            t.settings.replaceText(
              items.length,
              wishlist.length,
              Boolean(pendingImport.decks),
              Boolean(pendingImport.settings),
            ),
            t.settings.replaceFrom(
              pendingImport.collection.length,
              pendingImport.wishlist.length,
              pendingImport.decks?.length,
            ),
          ]}
          hold={{
            finalText: t.settings.replaceFinalText,
            label: t.settings.replaceHold,
            holding: t.settings.replaceHolding,
          }}
          onBackup={backup}
          onConfirm={() => confirmImport('replace', true)}
          onClose={() => setConfirming(undefined)}
        />
      )}
      {confirming === 'merge' && pendingImport && (
        <HoldConfirmDialog
          tone="safe"
          kicker={t.settings.mergeKicker}
          title={t.settings.mergeTitle}
          text={[
            t.settings.replaceFrom(
              pendingImport.collection.length,
              pendingImport.wishlist.length,
              pendingImport.decks?.length,
            ),
            t.settings.mergeText,
          ]}
          hold={{
            finalText: t.settings.mergeFinalText,
            label: t.settings.mergeHold,
            holding: t.settings.mergeHolding,
          }}
          onBackup={backup}
          onConfirm={() => confirmImport('merge', true)}
          onClose={() => setConfirming(undefined)}
        />
      )}
    </main>
  );
}
