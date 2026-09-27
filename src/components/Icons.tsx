/** Petites icônes SVG (les emojis s'affichent en couleur et cassent le style HUD). */

const common = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
} as const;

export function BoltIcon() {
  return (
    <svg {...common} fill="currentColor">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </svg>
  );
}

export function ScanIcon() {
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M4 12h16" />
    </svg>
  );
}

/** Grille de 1 à 3 colonnes (choix de la taille des cartes). */
export function GridIcon({ columns }: { columns: 1 | 2 | 3 }) {
  const size = (20 - (columns - 1) * 2) / columns;
  return (
    <svg {...common} fill="currentColor">
      {Array.from({ length: columns * columns }, (_, i) => (
        <rect
          key={i}
          x={2 + (i % columns) * (size + 2)}
          y={2 + Math.floor(i / columns) * (size + 2)}
          width={size}
          height={size}
          rx="0.5"
        />
      ))}
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
