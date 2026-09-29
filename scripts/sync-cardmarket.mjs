/*
 * Relie chaque impression du catalogue à son produit Cardmarket (lien direct + prix).
 *
 *   npm run sync-cardmarket
 *
 * Source : les fichiers publics de Cardmarket (liste des produits et guide des prix,
 * Cyberpunk = jeu n° 23), mis à jour chaque jour par Cardmarket.
 * Résultat : src/data/cardmarket.json (identifiant produit + prix, par impression).
 *
 * Cardmarket ne donne pas le numéro des cartes. Correspondance :
 *  1. chaque extension Cardmarket est associée à la série locale qui partage le plus
 *     de noms de cartes (à égalité : la version Beta, la Retail n'étant pas en vente) ;
 *  2. dans une extension, les produits triés par identifiant suivent l'ordre des numéros
 *     (vérifié : 172 / 172 sur la Beta) ; on associe donc, nom par nom, les versions
 *     dans cet ordre. Si le nombre de versions diffère, la carte est laissée de côté.
 * Le même produit sert aux impressions EN et FR (la langue est un filtre Cardmarket).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = 23;
const BASE = 'https://downloads.s3.cardmarket.com/productCatalog';

const load = (file) => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url)));
const values = (data) => (Array.isArray(data) ? data : Object.values(data));

async function download(path) {
  const response = await fetch(`${BASE}/${path}`);
  if (!response.ok) {
    throw new Error(`${path} : HTTP ${response.status}`);
  }
  return response.json();
}

/** Noms mal orthographiés sur Cardmarket → nom officiel. */
const ALIASES = {
  'tetratonic rippler': 'tetratronic rippler',
};

const norm = (text) => {
  const key = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return ALIASES[key] ?? key;
};

const byNumber = (a, b) => a.number.localeCompare(b.number, undefined, { numeric: true });

const cards = Object.fromEntries(values(load('cards.json')).map((card) => [card.id, card]));
const printings = values(load('printings.json'));
const sets = values(load('sets.json'));

const cardName = (printing) => {
  const card = cards[printing.cardId];
  return norm(card.subtitle ? `${card.name} ${card.subtitle}` : card.name);
};

const [{ products }, { priceGuides, createdAt }] = await Promise.all([
  download(`productList/products_singles_${GAME}.json`),
  download(`priceGuide/price_guide_${GAME}.json`),
]);
const prices = new Map(priceGuides.map((guide) => [guide.idProduct, guide]));

// Impressions EN de chaque série, dans l'ordre des numéros.
const localSets = sets.map((set) => ({
  set,
  printings: printings.filter((p) => p.setId === set.id && p.language === 'EN').sort(byNumber),
}));

const expansions = new Map();
for (const product of products) {
  if (!expansions.has(product.idExpansion)) {
    expansions.set(product.idExpansion, []);
  }
  expansions.get(product.idExpansion).push(product);
}

const links = {};
const report = [];

// Affectation globale extension ↔ série : les paires les plus ressemblantes d'abord
// (noms en commun rapportés à la plus grande des deux tailles), la Beta à égalité.
const pairs = [];
for (const [idExpansion, list] of expansions) {
  list.sort((a, b) => a.idProduct - b.idProduct);
  const names = new Set(list.map((product) => norm(product.name)));
  for (const entry of localSets) {
    const shared = entry.printings.filter((p) => names.has(cardName(p))).length;
    const score = shared / Math.max(list.length, entry.printings.length);
    if (score >= 0.5) {
      pairs.push({ idExpansion, list, entry, score });
    }
  }
}
pairs.sort(
  (a, b) =>
    b.score - a.score || Number(/beta/.test(b.entry.set.id)) - Number(/beta/.test(a.entry.set.id)),
);

const usedExpansions = new Set();
const usedSets = new Set();
for (const { idExpansion, list, entry } of pairs) {
  if (usedExpansions.has(idExpansion) || usedSets.has(entry.set.id)) {
    continue;
  }
  usedExpansions.add(idExpansion);
  usedSets.add(entry.set.id);

  let linked = 0;
  const groups = new Map();
  for (const product of list) {
    const key = norm(product.name);
    groups.set(key, [...(groups.get(key) ?? []), product]);
  }
  for (const [name, group] of groups) {
    const locals = entry.printings.filter((p) => cardName(p) === name);
    if (locals.length !== group.length) {
      continue; // Versions en nombre différent : correspondance incertaine.
    }
    locals.forEach((printing, index) => {
      const product = group[index];
      const guide = prices.get(product.idProduct);
      // Toutes les langues de cette impression pointent vers le même produit.
      for (const variant of printings.filter((p) => p.variantKey === printing.variantKey)) {
        links[variant.id] = {
          id: product.idProduct,
          ...(guide && {
            trend: guide.trend ?? undefined,
            low: guide.low ?? undefined,
            trendFoil: guide['trend-foil'] || undefined,
            lowFoil: guide['low-foil'] ?? undefined,
          }),
        };
      }
      linked++;
    });
  }
  report.push(
    `  ${entry.set.id} ← extension ${idExpansion} : ${linked} / ${list.length} produits reliés`,
  );
}
for (const [idExpansion, list] of expansions) {
  if (!usedExpansions.has(idExpansion)) {
    report.push(`  extension ${idExpansion} (${list.length} produits) : aucune série locale`);
  }
}

// Garde-fous (le script tourne aussi chaque nuit sans personne, voir .github/workflows) :
// pas de prix plus anciens que ceux déjà publiés, pas de chute brutale des cartes reliées
// (format Cardmarket changé, extension renommée…). Dans ces cas, rien n'est écrit.
const outIndex = process.argv.indexOf('--out');
const output =
  outIndex > 0
    ? path.resolve(process.argv[outIndex + 1])
    : fileURLToPath(new URL('../src/data/cardmarket.json', import.meta.url));
let previous;
try {
  previous = JSON.parse(readFileSync(output));
} catch {
  previous = undefined;
}
const linkedCount = Object.keys(links).length;
const previousCount = previous ? Object.keys(previous.products ?? {}).length : 0;
const pricedCount = Object.values(links).filter((link) => link.trend || link.low).length;
const problems = [
  previous && Date.parse(createdAt) < Date.parse(previous.updatedAt)
    ? `prix du ${createdAt} plus anciens que ceux publiés (${previous.updatedAt})`
    : '',
  linkedCount < previousCount * 0.9
    ? `${linkedCount} impressions reliées au lieu de ${previousCount} (chute de plus de 10 %)`
    : '',
  pricedCount === 0 ? 'aucun prix dans le guide Cardmarket' : '',
].filter(Boolean);
if (problems.length > 0) {
  console.error(report.join('\n'));
  console.error(`✗ Rien n'est écrit :\n  ${problems.join('\n  ')}`);
  process.exit(1);
}

writeFileSync(output, `${JSON.stringify({ updatedAt: createdAt, products: links }, null, 2)}\n`);

console.log(report.join('\n'));
console.log(
  `✓ ${path.relative(process.cwd(), output)} : ${Object.keys(links).length} impressions reliées (prix du ${createdAt.slice(0, 10)})`,
);
