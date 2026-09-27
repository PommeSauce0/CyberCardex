import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';
import type { createBrowserRouter } from 'react-router-dom';

type Router = ReturnType<typeof createBrowserRouter>;

/** Fenêtres ouvertes par-dessus la page (visionneuse…) : le retour les ferme d'abord. */
const handlers: Array<{ current: () => void }> = [];

/** Tant que le composant est affiché, le bouton retour Android appelle `onBack`. */
export function useBackHandler(onBack: () => void) {
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    handlers.push(ref);
    return () => {
      handlers.splice(handlers.indexOf(ref), 1);
    };
  }, []);
}

/**
 * Bouton retour Android : ferme la fenêtre ouverte, sinon revient à la page précédente,
 * sinon au catalogue ; depuis le catalogue, quitte l'app (comportement Android habituel).
 */
export function setupAndroidBackButton(router: Router) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  void App.addListener('backButton', ({ canGoBack }) => {
    const top = handlers[handlers.length - 1];
    if (top) {
      top.current();
    } else if (router.state.location.pathname !== '/') {
      if (canGoBack) {
        void router.navigate(-1);
      } else {
        void router.navigate('/', { replace: true });
      }
    } else {
      void App.exitApp();
    }
  });
}
