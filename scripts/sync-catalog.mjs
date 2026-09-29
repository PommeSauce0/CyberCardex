/*
 * Synchronise le catalogue depuis l'API officielle (api.netdeck.gg).
 *
 * Sources, par priorité :
 *   1. API officielle     → cartes, printings, rareté, artiste, langue, image, stats
 *   2. data/printing-overrides.json → finition + traitements vérifiés (l'API ne les fournit pas)
 *   3. Règle vérifiée     → numéro "β…" ou set Pre-Release Beta ⇒ "Beta Symbol"
 *   4. Sinon              → finish "Unknown" (signalé, jamais deviné)
 *
 * Garanties :
 *   - aucune printing n'est supprimée : absente de l'API ⇒ status "stale"
 *   - les ids existants et variantKey sont conservés (la collection reste valide)
 *   - rien n'est écrit sans --apply ; rien n'est jamais supprimé du disque
 *
 * Usage :
 *   node scripts/sync-catalog.mjs              aperçu (aucune écriture)
 *   node scripts/sync-catalog.mjs --apply      écrit src/data/*.json + images WebP manquantes
 *   node scripts/sync-catalog.mjs --apply --no-images
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { buildScanIndex } from './build-scan-index.mjs';
import { buildThumbnails } from './build-thumbnails.mjs';

const API = 'https://api.netdeck.gg/api/cards/cyberpunk';
const PAGE_SIZE = 50;
const CONCURRENCY = 6;
const DATA_DIR = path.resolve('src/data');
const OVERRIDES_FILE = path.resolve('data/printing-overrides.json');
const REPORT_FILE = path.resolve('tmp/sync-report.json');

// Doit rester aligné avec le type Rarity de src/data/types.ts.
const KNOWN_RARITIES = new Set([
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Nova Rare',
  'Secret',
  'Iconic Legend',
  'Iconic Other',
  'Iconic Secret',
]);

const apply = process.argv.includes('--apply');
const withImages = !process.argv.includes('--no-images');

// ---------- Helpers ----------

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/β/g, 'beta')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Lit src/data/<name>.json, ou à défaut l'ancien src/data/<name>.ts. */
async function readCatalogFile(name) {
  const jsonPath = path.join(DATA_DIR, `${name}.json`);
  if (existsSync(jsonPath)) {
    return JSON.parse(await readFile(jsonPath, 'utf8'));
  }
  const source = await readFile(path.join(DATA_DIR, `${name}.ts`), 'utf8');
  return JSON.parse(source.slice(source.indexOf('= [') + 2, source.lastIndexOf(']') + 1));
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Écrit plusieurs fichiers : chacun d'abord dans un .tmp, puis tous renommés. Une erreur pendant
 * la préparation laisse les anciens fichiers intacts ; les renommages, eux, se font un par un (pas
 * une vraie transaction : en cas d'échec entre deux, relancer la synchro).
 */
async function writeJsonFiles(entries) {
  for (const [file, data] of entries) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  }
  for (const [file] of entries) {
    await rename(`${file}.tmp`, file);
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${url}`);
  }
  return response.json();
}

function omitEmpty(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

// ---------- Chargement de l'état local ----------

const localCards = await readCatalogFile('cards');
const localSets = await readCatalogFile('sets');
const localPrintings = await readCatalogFile('printings');

const cardsById = new Map(localCards.map((card) => [card.id, card]));
const localBySource = new Map(
  localPrintings.map((printing) => [printing.sourceId ?? printing.id, printing]),
);

let overrides = {};
const overridesExisted = existsSync(OVERRIDES_FILE);

if (overridesExisted) {
  overrides = JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'));
} else {
  // Premier lancement : l'état actuel (déjà vérifié) devient le registre.
  for (const printing of localPrintings) {
    const card = cardsById.get(printing.cardId);
    overrides[printing.sourceId ?? printing.id] = {
      label: `${[card?.name, card?.subtitle].filter(Boolean).join(' — ')} | ${printing.setId} #${printing.number} ${printing.language}`,
      finish: printing.finish,
      treatments: printing.treatments ?? [],
    };
  }
}

// ---------- Récupération API + images ----------

const apiCards = [];
const imageJobs = [];
const report = {
  newPrintings: [],
  stalePrintings: [],
  newCards: [],
  newSets: [],
  unknownFinish: [],
  imageFailures: [],
  changedFields: [],
};

async function downloadImage(job) {
  const target = path.resolve('public', job.imageUrl.replace(/^\//, ''));
  try {
    let url = job.url;
    let response = await fetch(url);

    if (response.status === 403) {
      // URL signée expirée : on redemande une URL fraîche.
      const card = await fetchJson(`${API}/${job.slug}`);
      url = card.printings.find((p) => p.id === job.id)?.image_url;
      response = await fetch(url);
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    job.done = true;
  } catch (error) {
    report.imageFailures.push(`${job.slug} ${job.id} : ${error.message}`);
  }
}

async function runPool(jobs) {
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        await downloadImage(queue.shift());
      }
    }),
  );
}

// Correspondance code de set API → setId local, apprise des printings connues.
const setIdByApiCode = new Map();

let offset = 0;
let total = Infinity;

while (offset < total) {
  const page = await fetchJson(`${API}?limit=${PAGE_SIZE}&offset=${offset}`);
  total = page.total;
  offset += page.items.length;
  if (!page.items.length) {
    break;
  }

  for (const card of page.items) {
    for (const printing of card.printings) {
      const local = localBySource.get(printing.id);
      if (local) {
        setIdByApiCode.set(printing.set.code, local.setId);
      }
    }
  }

  apiCards.push(...page.items);
  console.log(`… ${offset}/${total} cartes`);
}

// ---------- Sets ----------

const setsById = new Map(localSets.map((set) => [set.id, set]));

function resolveSetId(apiSet) {
  const known =
    setIdByApiCode.get(apiSet.code) ?? setIdByApiCode.get(apiSet.code.replace(/-[a-z]{2}$/, ''));
  if (known) {
    return known;
  }

  const id = slugify(apiSet.name.replace(/—/g, ' '));
  if (!setsById.has(id)) {
    // Nouveau set : métadonnées à compléter à la main dans sets.json.
    setsById.set(id, {
      id,
      code: apiSet.code.toUpperCase(),
      name: apiSet.name,
      edition: '',
      releaseYear: new Date().getFullYear(),
      releaseType: 'promo',
    });
    report.newSets.push(`${id} (${apiSet.name}) — métadonnées à compléter`);
  }
  setIdByApiCode.set(apiSet.code, id);
  return id;
}

// ---------- Cartes ----------

const nextCards = [];

for (const apiCard of apiCards) {
  const existing = cardsById.get(apiCard.slug);
  if (!existing) {
    report.newCards.push(apiCard.slug);
  }

  nextCards.push(
    omitEmpty({
      id: apiCard.slug,
      name: existing?.name ?? apiCard.name.toUpperCase(),
      subtitle: existing?.subtitle ?? apiCard.subname,
      color: apiCard.color,
      cardType: apiCard.card_type,
      cost: apiCard.cost,
      power: apiCard.power,
      ram: apiCard.ram,
      rulesText: apiCard.official_rules_text_en ?? apiCard.rules_text,
      classifications: apiCard.classifications?.length ? apiCard.classifications : undefined,
      keywords: apiCard.keywords?.length ? apiCard.keywords : undefined,
      eddiable: apiCard.is_eddiable,
    }),
  );
}

// Cartes locales absentes de l'API : conservées telles quelles.
const apiCardIds = new Set(nextCards.map((card) => card.id));
for (const card of localCards) {
  if (!apiCardIds.has(card.id)) {
    nextCards.push(card);
  }
}

// ---------- Printings ----------

const nextPrintings = [];
const seenSourceIds = new Set();

for (const apiCard of apiCards) {
  for (const apiPrinting of apiCard.printings) {
    seenSourceIds.add(apiPrinting.id);

    const local = localBySource.get(apiPrinting.id);
    const override = overrides[apiPrinting.id];
    const setId = local?.setId ?? resolveSetId(apiPrinting.set);
    const id = local?.id ?? apiPrinting.id;
    const number = apiPrinting.collector_number;
    const artist = apiPrinting.artist?.replace(/\s+/g, ' ').trim().toUpperCase();

    const treatments = new Set(override?.treatments ?? local?.treatments ?? []);
    if (number.startsWith('β') || setId === 'pre-release-beta') {
      treatments.add('Beta Symbol');
    }

    const finish = override?.finish ?? local?.finish ?? 'Unknown';

    const webpUrl = `/cards/${setId}/${id}.webp`;
    const hasWebp = existsSync(path.resolve('public', webpUrl.slice(1)));
    const imageUrl = hasWebp ? webpUrl : (local?.imageUrl ?? webpUrl);

    const printing = omitEmpty({
      id,
      sourceId: apiPrinting.id,
      sourceUrl: `https://cyberpunktcg.com/cards/${apiCard.slug}?printing=${apiPrinting.id}`,
      cardId: apiCard.slug,
      setId,
      variantKey: local?.variantKey ?? `${setId}-${slugify(number)}-${slugify(artist)}`,
      number,
      rarity: apiPrinting.rarity,
      language: apiPrinting.language.toUpperCase(),
      finish,
      imageUrl,
      artist,
      localizedName: apiPrinting.localized_name,
      status: 'active',
    });
    printing.treatments = [...treatments];

    const label = `${apiCard.slug} ${setId} #${number} ${printing.language}`;

    if (!local) {
      report.newPrintings.push(label);
    } else {
      for (const field of ['rarity', 'artist', 'number', 'language']) {
        if (local[field] !== undefined && local[field] !== printing[field]) {
          report.changedFields.push(
            `${label} — ${field} : "${local[field]}" → "${printing[field]}"`,
          );
        }
      }
    }
    if (finish === 'Unknown') {
      report.unknownFinish.push(`${apiPrinting.id}  (${label})`);
    }

    nextPrintings.push(printing);

    if (!hasWebp && apiPrinting.image_url) {
      imageJobs.push({
        id: apiPrinting.id,
        slug: apiCard.slug,
        url: apiPrinting.image_url,
        imageUrl: webpUrl,
        printing,
      });
    }
  }
}

// Images WebP officielles (~140 Ko). Les URLs signées expirent après ~5 min :
// downloadImage() redemande une URL fraîche en cas de 403.
if (apply && withImages && imageJobs.length) {
  console.log(`Téléchargement de ${imageJobs.length} images…`);
  await runPool(imageJobs);
  for (const job of imageJobs) {
    if (job.done) {
      job.printing.imageUrl = job.imageUrl;
    }
  }
}

for (const local of localPrintings) {
  if (!seenSourceIds.has(local.sourceId ?? local.id)) {
    nextPrintings.push({ ...local, status: 'stale' });
    report.stalePrintings.push(`${local.cardId} ${local.setId} #${local.number}`);
  }
}

const nextSets = [...setsById.values()];

// Ordre stable : série (ordre de sets.json) puis numéro naturel (β002 < β010, 005 < 005a),
// puis langue. L'API renvoie les printings groupées par carte, pas par numéro.
const setRank = new Map(nextSets.map((set, index) => [set.id, index]));
const numberCollator = new Intl.Collator('en', { numeric: true });
nextPrintings.sort(
  (a, b) =>
    (setRank.get(a.setId) ?? 999) - (setRank.get(b.setId) ?? 999) ||
    numberCollator.compare(a.number, b.number) ||
    a.language.localeCompare(b.language),
);

// ---------- Validation ----------

const errors = [];

// Une image manquante bloque l'écriture : sinon une carte pointerait vers un fichier absent.
for (const failure of report.imageFailures) {
  errors.push(`image non téléchargée : ${failure}`);
}
// Même contrôle avec --no-images : chaque impression écrite doit avoir son image sur le disque.
if (apply) {
  for (const printing of nextPrintings) {
    if (!existsSync(path.resolve('public', printing.imageUrl.replace(/^\//, '')))) {
      errors.push(`image absente : ${printing.imageUrl} (relancer sans --no-images)`);
    }
  }
}

function checkUnique(list, name) {
  const seen = new Set();
  for (const item of list) {
    if (seen.has(item.id)) {
      errors.push(`${name} : id dupliqué "${item.id}"`);
    }
    seen.add(item.id);
  }
}

checkUnique(nextCards, 'cards');
checkUnique(nextSets, 'sets');
checkUnique(nextPrintings, 'printings');

const cardIds = new Set(nextCards.map((card) => card.id));
const setIds = new Set(nextSets.map((set) => set.id));

for (const printing of nextPrintings) {
  if (!cardIds.has(printing.cardId)) {
    errors.push(`printing ${printing.id} : cardId inconnu "${printing.cardId}"`);
  }
  if (!setIds.has(printing.setId)) {
    errors.push(`printing ${printing.id} : setId inconnu "${printing.setId}"`);
  }
  if (!KNOWN_RARITIES.has(printing.rarity)) {
    errors.push(
      `printing ${printing.id} : rareté inconnue "${printing.rarity}" (à ajouter dans types.ts et KNOWN_RARITIES)`,
    );
  }
  if (!['Standard', 'Foil', 'Unknown'].includes(printing.finish)) {
    errors.push(`printing ${printing.id} : finition invalide "${printing.finish}"`);
  }
}

// Une printing possédée ne doit jamais disparaître.
for (const local of localPrintings) {
  if (!nextPrintings.some((printing) => printing.id === local.id)) {
    errors.push(`printing ${local.id} perdue`);
  }
}

// ---------- Rapport & écriture ----------

const count = (list) => list.length;
console.log(`
Cartes     : ${count(localCards)} → ${count(nextCards)}  (+${count(report.newCards)})
Sets       : ${count(localSets)} → ${count(nextSets)}  (+${count(report.newSets)})
Printings  : ${count(localPrintings)} → ${count(nextPrintings)}  (+${count(report.newPrintings)}, ${count(report.stalePrintings)} stale)
Champs modifiés par l'API : ${count(report.changedFields)}
Finition Unknown : ${count(report.unknownFinish)}
Images : ${imageJobs.filter((job) => job.done).length} téléchargées, ${count(report.imageFailures)} échecs`);

for (const [title, list] of [
  ['Nouvelles printings', report.newPrintings],
  ['Nouveaux sets', report.newSets],
  ['Stale', report.stalePrintings],
  ['Finition à renseigner dans data/printing-overrides.json', report.unknownFinish],
  ['Échecs images', report.imageFailures],
]) {
  if (list.length) {
    console.log(`\n${title} :\n  ${list.join('\n  ')}`);
  }
}

await writeJson(REPORT_FILE, report);

if (errors.length) {
  console.error(
    `\n✗ ${errors.length} erreur(s) de validation — rien n'a été écrit :\n  ${errors.join('\n  ')}`,
  );
  process.exit(1);
}

if (!apply) {
  console.log(
    `\nAperçu uniquement. Relance avec --apply pour écrire. Détails : ${path.relative('.', REPORT_FILE)}`,
  );
  process.exit(0);
}

await writeJsonFiles([
  [path.join(DATA_DIR, 'cards.json'), nextCards],
  [path.join(DATA_DIR, 'sets.json'), nextSets],
  [path.join(DATA_DIR, 'printings.json'), nextPrintings],
  ...(overridesExisted ? [] : [[OVERRIDES_FILE, overrides]]),
]);
if (!overridesExisted) {
  console.log(`✓ Registre créé : ${path.relative('.', OVERRIDES_FILE)}`);
}
console.log('✓ src/data/cards.json, sets.json, printings.json écrits.');

// Miniatures + empreintes du scanner (à refaire dès que des images changent). Un échec fait
// échouer la synchro : une image manquerait dans l'app ou dans le scanner.
const thumbs = await buildThumbnails();
const scan = await buildScanIndex();
console.log(
  `${thumbs.failed ? '✗' : '✓'} public/thumbs : ${thumbs.built} miniature(s) générée(s), ${thumbs.failed} échec(s)`,
);
console.log(`${scan.failed.length ? '✗' : '✓'} public/scan-index.json : ${scan.count} empreintes`);
if (thumbs.failed || scan.failed.length) {
  console.error(
    '\n✗ Synchro incomplète : les données sont écrites, mais des fichiers dérivés manquent.',
  );
  scan.failed.forEach((line) => console.error(`  Scanner : ${line}`));
  console.error('  Corrige les images concernées puis relance `npm run sync-catalog -- --apply`.');
  process.exit(1);
}
