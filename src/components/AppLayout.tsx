import { Capacitor } from '@capacitor/core';
import { Suspense, useEffect, type ReactNode } from 'react';
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import EasterEggLayer from '../easter/EasterEggLayer';
import { onLogoTap } from '../easter/events';
import { useT } from '../i18n/useT';
import { recordPage } from '../navigation/backTrail';
import { UpdateBanner } from '../update/UpdatePanel';

import './AppLayout.css';

const icons: Record<string, ReactNode> = {
  home: <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  collection: (
    <>
      <rect x="3" y="5" width="12" height="16" rx="1" />
      <path d="M8 3h12v16" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4" />
      <path d="M4 12h16" />
    </>
  ),
  wishlist: <path d="m12 3 2.8 5.9 6.2.8-4.6 4.3 1.2 6.2L12 17.2 6.4 20.2l1.2-6.2L3 9.7l6.2-.8z" />,
  // Engrenage anguleux à 8 dents, écrou hexagonal au centre.
  settings: (
    <>
      <path d="M9.8 4.7 10.6 1.9h2.8l.8 2.8 1.4.6 2.5-1.4 2 2-1.4 2.5.6 1.4 2.8.8v2.8l-2.8.8-.6 1.4 1.4 2.5-2 2-2.5-1.4-1.4.6-.8 2.8h-2.8l-.8-2.8-1.4-.6-2.5 1.4-2-2 1.4-2.5-.6-1.4-2.8-.8v-2.8l2.8-.8.6-1.4-1.4-2.5 2-2 2.5 1.4z" />
      <path d="M15.4 12 13.7 14.9h-3.4L8.6 12l1.7-2.9h3.4z" />
    </>
  ),
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

// Le scanner n'existe que dans l'app Android (caméra du téléphone), pas sur le site.
const ALL_NAV_ITEMS = [
  { to: '/', key: 'home', icon: 'home', end: true },
  { to: '/search', key: 'search', icon: 'search', end: false },
  { to: '/scan', key: 'scan', icon: 'scan', end: false },
  { to: '/collection', key: 'collection', icon: 'collection', end: false },
  { to: '/wishlist', key: 'wishlist', icon: 'wishlist', end: false },
  { to: '/settings', key: 'settings', icon: 'settings', end: false },
] as const;

const NAV_ITEMS = Capacitor.isNativePlatform()
  ? ALL_NAV_ITEMS
  : ALL_NAV_ITEMS.filter((item) => item.key !== 'scan');

export default function AppLayout() {
  const { wishlist } = useCollection();
  const t = useT();

  // Retient chaque page visitée à sa place dans l'historique (liens « ← … »).
  const location = useLocation();
  useEffect(() => recordPage(location.pathname + location.search), [location]);

  return (
    <div className="app-shell">
      <ScrollRestoration />

      <nav className="app-nav" aria-label={t.nav.main}>
        <NavLink to="/" className="app-nav-brand" aria-label={t.nav.brand} onClick={onLogoTap}>
          <span className="brand-mark" aria-hidden="true">
            CC
          </span>
          <span className="brand-text">
            Cyber<span>Cardex</span>
          </span>
        </NavLink>

        <div className="app-nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'app-nav-link active' : 'app-nav-link')}
            >
              <NavIcon name={item.icon} />
              <span>{t.nav[item.key]}</span>
              {item.icon === 'wishlist' && wishlist.length > 0 && (
                <small className="app-nav-count">{wishlist.length}</small>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <EasterEggLayer />

      <div className="app-content">
        <UpdateBanner />
        <Suspense fallback={<div className="page-loading">{t.common.loading}</div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
