import { Capacitor } from '@capacitor/core';
import { useRef, useState, type ChangeEvent } from 'react';

import { parseImport, type ParsedImport } from '../collection/collectionData';
import { useCollection, type ImportMode } from '../collection/CollectionContext';
import { exportCsv, exportJson } from '../collection/exportFiles';
import { cards, getPrintingById, printings, sets } from '../data/catalog';
import type { CardLanguage } from '../data/types';
import { LANGUAGES as INTERFACE_LANGUAGES } from '../i18n';
import { useT } from '../i18n/useT';
import { useSettings } from '../settings/SettingsContext';
import { UpdateSettings } from '../update/UpdatePanel';

import './SettingsPage.css';

const CARD_LANGUAGES: CardLanguage[] = ['FR', 'EN'];

const REPOSITORY_URL = 'https://github.com/PommeSauce0/CyberCardex';

/** Nom de chaque langue dans sa propre langue. */
const LANGUAGE_NAMES = { fr: 'Français', en: 'English' } as const;

type Message = { kind: 'success' | 'error'; text: string };

export default function SettingsPage() {
  const {
    preferredCardLanguage,
    setPreferredCardLanguage,
    interfaceLanguage,
    setInterfaceLanguage,
  } = useSettings();
  const { items, wishlist, importData, clearAll } = useCollection();
  const t = useT();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<ParsedImport | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

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

  function confirmImport(mode: ImportMode) {
    if (!pendingImport) {
      return;
    }
    if (
      mode === 'replace' &&
      items.length > 0 &&
      !window.confirm(t.settings.confirmReplace(items.length))
    ) {
      return;
    }
    const added = importData(pendingImport, mode);
    const unknown = pendingImport.collection.filter(
      (item) => !getPrintingById(item.printingId),
    ).length;
    setPendingImport(null);
    setMessage({
      kind: 'success',
      text: t.settings.imported(
        added,
        mode === 'merge' ? pendingImport.collection.length - added : 0,
        unknown,
      ),
    });
  }

  function handleReset() {
    if (window.confirm(t.settings.confirmReset(items.length))) {
      clearAll();
      setMessage({ kind: 'success', text: t.settings.resetDone });
    }
  }

  const pendingUnknown = pendingImport
    ? pendingImport.collection.filter((item) => !getPrintingById(item.printingId)).length
    : 0;

  return (
    <main className="page page-narrow settings-page">
      <header className="page-header">
        <p className="eyebrow">CyberCardex</p>
        <h1 className="page-title">{t.nav.settings}</h1>
      </header>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>{t.settings.interfaceTitle}</h2>
          <p>{t.settings.interfaceText}</p>
        </div>

        <div className="language-options">
          {INTERFACE_LANGUAGES.map((language) => (
            <button
              key={language}
              type="button"
              className={
                interfaceLanguage === language ? 'language-option active' : 'language-option'
              }
              aria-pressed={interfaceLanguage === language}
              onClick={() => setInterfaceLanguage(language)}
            >
              <div className="language-radio">
                <span />
              </div>
              <div className="language-copy">
                <strong>{LANGUAGE_NAMES[language]}</strong>
              </div>
              <strong className="language-code">{language.toUpperCase()}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>{t.settings.cardLanguageTitle}</h2>
          <p>{t.settings.cardLanguageText}</p>
        </div>

        <div className="language-options">
          {CARD_LANGUAGES.map((code) => (
            <button
              key={code}
              type="button"
              className={
                preferredCardLanguage === code ? 'language-option active' : 'language-option'
              }
              aria-pressed={preferredCardLanguage === code}
              onClick={() => setPreferredCardLanguage(code)}
            >
              <div className="language-radio">
                <span />
              </div>
              <div className="language-copy">
                <strong>{LANGUAGE_NAMES[code === 'FR' ? 'fr' : 'en']}</strong>
                <span>{t.settings.cardLanguageOption[code]}</span>
              </div>
              <strong className="language-code">{code}</strong>
            </button>
          ))}
        </div>

        <div className="fallback-info">
          <strong>{t.settings.fallbackTitle}</strong>
          <p>{t.settings.fallbackText}</p>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>{t.settings.backupTitle}</h2>
          <p>{t.settings.backupText}</p>
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={items.length === 0 && wishlist.length === 0}
            onClick={() => void exportJson(items, wishlist)}
          >
            {t.settings.exportJson}
          </button>
          <button
            type="button"
            className="btn"
            disabled={items.length === 0}
            onClick={() => void exportCsv(items)}
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
            </p>
            <div className="settings-actions">
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
      </section>

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>{t.settings.dataTitle}</h2>
        </div>

        <dl className="settings-facts">
          <div>
            <dt>{t.settings.catalog}</dt>
            <dd>{t.settings.catalogCounts(cards.length, printings.length, sets.length)}</dd>
          </div>
          <div>
            <dt>{t.home.myCollection}</dt>
            <dd>{t.settings.collectionCounts(items.length, wishlist.length)}</dd>
          </div>
        </dl>

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-danger"
            disabled={items.length === 0 && wishlist.length === 0}
            onClick={handleReset}
          >
            {t.settings.reset}
          </button>
        </div>
      </section>

      <UpdateSettings className="settings-section" />

      <section className="settings-section settings-about">
        <div className="settings-section-heading">
          <h2>{t.about.title}</h2>
        </div>

        <p>{t.about.unofficial}</p>
        <p>{t.about.credits}</p>

        <dl className="settings-facts">
          <div>
            <dt>{t.about.version}</dt>
            <dd>{__APP_VERSION__}</dd>
          </div>
          <div>
            <dt>{t.about.sources}</dt>
            <dd>
              {t.about.cardData}{' '}
              <a href="https://cyberpunktcg.com" target="_blank" rel="noreferrer">
                cyberpunktcg.com
              </a>
              <br />
              {t.about.prices}
            </dd>
          </div>
        </dl>

        <h3>{t.about.privacyTitle}</h3>
        <p>{t.about.privacy}</p>
        <p>{t.about.privacyUpdates}</p>

        <h3>{t.about.licenseTitle}</h3>
        <p>
          {t.about.license}{' '}
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            {t.about.sourceCode}
          </a>
        </p>
      </section>
    </main>
  );
}
