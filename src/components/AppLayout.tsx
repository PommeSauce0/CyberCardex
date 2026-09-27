import { Capacitor } from '@capacitor/core';
import { Suspense, type ReactNode } from 'react';
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom';

import { useCollection } from '../collection/CollectionContext';
import EasterEggLayer from '../easter/EasterEggLayer';
import { onLogoTap } from '../easter/events';
import { useT } from '../i18n/useT';
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
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
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
