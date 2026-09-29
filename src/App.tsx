import { Capacitor } from '@capacitor/core';
import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './App.css';

import { CollectionProvider } from './collection/CollectionContext';
import AppLayout from './components/AppLayout';
import RouteError from './components/RouteError';
import { setupAndroidBackButton } from './native/backButton';
import HomePage from './pages/HomePage';
import { SettingsProvider } from './settings/SettingsContext';

// Chaque page est chargée à la demande : le premier écran reste léger.
const SetPage = lazy(() => import('./pages/SetPage'));
const CardPage = lazy(() => import('./pages/CardPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ScanPage = lazy(() => import('./pages/ScanPage'));
const DeckListPage = lazy(() => import('./pages/DeckListPage'));
const DeckEditorPage = lazy(() => import('./pages/DeckEditorPage'));
const DeckLegendsPage = lazy(() => import('./pages/DeckLegendsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    // Page qui plante ou fichier de page introuvable : écran d'erreur avec « Recharger ».
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/sets/:setId', element: <SetPage /> },
      { path: '/cards/:printingId', element: <CardPage /> },
      { path: '/search', element: <SearchPage /> },
      // Scanner : app Android uniquement (sur le site, /scan tombe sur la page introuvable).
      ...(Capacitor.isNativePlatform() ? [{ path: '/scan', element: <ScanPage /> }] : []),
      { path: '/collection', element: <CollectionPage /> },
      { path: '/decks', element: <DeckListPage /> },
      { path: '/decks/new', element: <DeckLegendsPage /> },
      { path: '/decks/:deckId', element: <DeckEditorPage /> },
      { path: '/wishlist', element: <WishlistPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

setupAndroidBackButton(router);

export default function App() {
  return (
    <SettingsProvider>
      <CollectionProvider>
        <RouterProvider router={router} />
      </CollectionProvider>
    </SettingsProvider>
  );
}
