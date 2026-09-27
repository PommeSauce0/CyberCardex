/*
 * Vérifie que le catalogue local est complet et cohérent avec l'API officielle.
 * N'écrit rien. Code de sortie 1 si un problème est trouvé.
 *
 *   npm run verify-catalog
 *
 * Contrôles :
 *   - chaque carte / printing de l'API existe en local (et inversement) ;
 *   - les séries listées par l'API (/filters) sont toutes connues ;
 *   - la langue FR ne cache pas de printings absentes de la liste par défaut ;
 *   - chaque printing a une image WebP présente et lisible (733×1024) et sa miniature ;
 *   - aucune finition "Unknown", aucune carte sans printing, aucune série vide.
 */
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.netdeck.gg/api/cards/cyberpunk';
const PAGE_SIZE = 50;

const problems = [];
const warnings = [];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${url}`);
  }
  return response.json();
}

async function fetchAllCards(query = '') {
  const items = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const page = await fetchJson(`${API}?limit=${PAGE_SIZE}&offset=${offset}${query}`);
    total = page.total;
    offset += page.items.length;
    items.push(...page.items);
    if (!page.items.length) {
      break;
    }
  }
  return items;
}

const readLocal = async (name) =>
  JSON.parse(await readFile(path.resolve('src/data', `${name}.json`), 'utf8'));

const cards = await readLocal('cards');
const sets = await readLocal('sets');
const printings = await readLocal('printings');

console.log(`Local : ${cards.length} cartes, ${printings.length} printings, ${sets.length} séries`);

// ---------- Comparaison avec l'API ----------

const apiCards = await fetchAllCards();
const apiCardsFr = await fetchAllCards('&language=fr');
const apiPrintingIds = new Set(apiCards.flatMap((card) => card.printings.map((p) => p.id)));
const apiPrintingIdsFr = new Set(apiCardsFr.flatMap((card) => card.printings.map((p) => p.id)));

console.log(`API   : ${apiCards.length} cartes, ${apiPrintingIds.size} printings`);

const localCardIds = new Set(cards.map((card) => card.id));
const localSourceIds = new Set(printings.map((p) => p.sourceId ?? p.id));

for (const card of apiCards) {
  if (!localCardIds.has(card.slug)) {
    problems.push(`Carte absente en local : ${card.slug}`);
  }
}
for (const id of new Set([...apiPrintingIds, ...apiPrintingIdsFr])) {
  if (!localSourceIds.has(id)) {
    problems.push(`Printing absente en local : ${id}`);
  }
}
for (const printing of printings) {
  const id = printing.sourceId ?? printing.id;
  if (!apiPrintingIds.has(id) && !apiPrintingIdsFr.has(id)) {
    (printing.status === 'stale' ? warnings : problems).push(
      `Printing locale absente de l'API : ${printing.cardId} ${printing.setId} #${printing.number}` +
        (printing.status === 'stale' ? ' (déjà marquée stale)' : ''),
    );
  }
}

// ---------- Séries ----------

const filters = await fetchJson(`${API}/filters`);
const apiSets = filters.filters.find((filter) => filter.key === 'set')?.options ?? [];
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const localSetKeys = new Set(
  sets.flatMap((set) => [normalize(set.name), normalize(`${set.name} ${set.edition}`)]),
);
const printingSetNames = new Set(
  apiCards.flatMap((card) => card.printings.map((p) => normalize(p.set?.name ?? ''))),
);

for (const apiSet of apiSets) {
  const key = normalize(apiSet.name);
  if (!localSetKeys.has(key) && !printingSetNames.has(key)) {
    problems.push(`Série de l'API inconnue en local : ${apiSet.name} (${apiSet.code})`);
  }
}
console.log(`Séries API : ${apiSets.length}`);

// ---------- Intégrité locale ----------

const printingsByCard = new Map();
const printingsBySet = new Map();
for (const printing of printings) {
  printingsByCard.set(printing.cardId, (printingsByCard.get(printing.cardId) ?? 0) + 1);
  printingsBySet.set(printing.setId, (printingsBySet.get(printing.setId) ?? 0) + 1);

  if (printing.finish === 'Unknown') {
    problems.push(`Finition inconnue : ${printing.id} (${printing.setId} #${printing.number})`);
  }
}
for (const card of cards) {
  if (!printingsByCard.has(card.id)) {
    problems.push(`Carte sans aucune printing : ${card.id}`);
  }
}
for (const set of sets) {
  if (!printingsBySet.has(set.id)) {
    problems.push(`Série vide : ${set.id}`);
  }
}

// ---------- Images ----------

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  warnings.push('sharp absent : dimensions des images non vérifiées');
}

let imagesOk = 0;
for (const printing of printings) {
  const file = path.resolve('public', printing.imageUrl.replace(/^\//, ''));
  if (!printing.imageUrl.endsWith('.webp')) {
    problems.push(`Image non WebP : ${printing.imageUrl}`);
    continue;
  }
  if (!existsSync(file) || statSync(file).size < 5000) {
    problems.push(`Image manquante ou vide : ${printing.imageUrl}`);
    continue;
  }
  if (sharp) {
    try {
      const { width, height } = await sharp(file).metadata();
      if (Math.abs(width / height - 733 / 1024) > 0.01) {
        warnings.push(`Proportions inhabituelles (${width}×${height}) : ${printing.imageUrl}`);
      }
    } catch {
      problems.push(`Image illisible : ${printing.imageUrl}`);
      continue;
    }
  }
  const thumb = path.resolve('public/thumbs', printing.imageUrl.replace(/^\/cards\//, ''));
  if (!existsSync(thumb)) {
    problems.push(`Miniature manquante : ${printing.imageUrl} (npm run build-thumbnails)`);
    continue;
  }
  imagesOk += 1;
}
console.log(`Images : ${imagesOk}/${printings.length} OK`);

// ---------- Index du scanner ----------

const scanIndexFile = path.resolve('public/scan-index.json');
if (existsSync(scanIndexFile)) {
  const { entries } = JSON.parse(await readFile(scanIndexFile, 'utf8'));
  const indexed = new Set(entries.map(([id]) => id));
  const missing = printings.filter((p) => p.status !== 'stale' && !indexed.has(p.id));
  if (missing.length) {
    problems.push(
      `Index du scanner incomplet (${missing.length}) : lance npm run build-scan-index`,
    );
  }
  console.log(`Scanner : ${indexed.size} empreintes`);
} else {
  problems.push('Index du scanner absent : lance npm run build-scan-index');
}

// ---------- Résultat ----------

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} avertissement(s) :\n  ${warnings.join('\n  ')}`);
}
if (problems.length) {
  console.error(`\n✗ ${problems.length} problème(s) :\n  ${problems.join('\n  ')}`);
  console.error('\n→ Lance `npm run sync-catalog -- --apply` pour récupérer ce qui manque.');
  process.exit(1);
}
console.log('\n✓ Catalogue complet : toutes les cartes, printings et images sont présentes.');
