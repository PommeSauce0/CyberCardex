/*
 * Liens officiels de Cyberpunk TCG (relevés sur cyberpunktcg.com). Ni logos ni icônes de
 * marques : juste une couleur proche de chaque réseau. L'app n'est pas officielle.
 */

const SITE = 'https://www.cyberpunktcg.com';

export const OFFICIAL_LINKS = [
  { key: 'site', url: SITE, color: 'var(--c-yellow)' },
  { key: 'rules', url: `${SITE}/gameplay-guide`, color: 'var(--c-cyan)' },
  { key: 'discord', url: 'https://discord.com/invite/cyberpunktcg', color: '#5865f2' },
  { key: 'instagram', url: 'https://www.instagram.com/cyberpunktcg/', color: '#ff4f8b' },
  { key: 'x', url: 'https://x.com/Cyberpunk_TCG', color: 'var(--c-text)' },
  {
    key: 'facebook',
    url: 'https://www.facebook.com/profile.php?id=61581669616204',
    color: '#3b82ff',
  },
] as const;
