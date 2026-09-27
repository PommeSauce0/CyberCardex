import { readFileSync } from 'node:fs';

import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import type { Plugin, Rule } from 'postcss';
import { defineConfig } from 'vite';

/*
 * Sur un écran tactile, « :hover » reste actif après un appui (bouton qui reste cyan, carte
 * qui reste surélevée…). On réserve donc tous les styles de survol aux appareils qui
 * survolent vraiment (souris, pavé tactile), sans avoir à l'écrire dans chaque fichier CSS.
 */
function hoverOnlyWithPointer(): Plugin {
  const insideHoverMedia = (rule: Rule) => {
    type Parent = { type: string; params?: string; parent?: unknown } | undefined;
    for (let node = rule.parent as Parent; node; node = node.parent as Parent) {
      if (node.type === 'atrule' && node.params?.includes('hover')) {
        return true;
      }
    }
    return false;
  };

  return {
    postcssPlugin: 'hover-only-with-pointer',
    Rule(rule, { AtRule }) {
      if (!rule.selector.includes(':hover') || insideHoverMedia(rule)) {
        return;
      }
      // « .a:hover, .a:focus-visible » : la partie clavier reste valable partout.
      const others = rule.selectors.filter((selector) => !selector.includes(':hover'));
      if (others.length > 0) {
        rule.cloneBefore({ selectors: others });
        rule.selectors = rule.selectors.filter((selector) => selector.includes(':hover'));
      }
      const media = new AtRule({ name: 'media', params: '(hover: hover)' });
      rule.replaceWith(media);
      media.append(rule);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Mode « phone » : HTTPS + accès depuis le réseau local, pour tester sur un téléphone
  // (le navigateur refuse la caméra en HTTP).
  //   npm run phone      → build de production servi en HTTPS (rapide, conseillé)
  //   npm run dev:phone  → serveur de dev (rechargement à chaud, mais lent sur mobile)
  plugins: mode === 'phone' ? [react(), basicSsl()] : [react()],
  // Version de package.json, affichée dans Réglages → À propos.
  define: {
    __APP_VERSION__: JSON.stringify(
      JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version,
    ),
  },
  css: { postcss: { plugins: [hoverOnlyWithPointer()] } },
  server: mode === 'phone' ? { host: true } : undefined,
  preview: mode === 'phone' ? { host: true } : undefined,
  build: {
    rolldownOptions: {
      output: {
        // Fichiers séparés : une mise à jour du code ne force pas à re-télécharger
        // le catalogue ni React (et inversement).
        codeSplitting: {
          groups: [
            { name: 'catalog', test: /src[\\/]data[\\/].*\.json/ },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
}));
