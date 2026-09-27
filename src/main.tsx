import { Capacitor } from '@capacitor/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Polices embarquées (fonctionnent hors ligne, y compris dans Capacitor).
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';

import './index.css';

import App from './App';
import { restoreNativeStorage } from './storage/storage';
import { startUpdateChecks } from './update/updater';

// Dans l'app Android, certains comportements de site web sont coupés (sélection du texte…).
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native-app');
  // Appui long : pas de menu « copier le lien / l'image » ni de glisser, sauf dans les champs.
  document.addEventListener('contextmenu', (event) => {
    if (!(event.target instanceof Element && event.target.closest('input, textarea'))) {
      event.preventDefault();
    }
  });
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Élément #root introuvable');
}

// Dans l'app Android, la collection est d'abord relue depuis le stockage natif.
void restoreNativeStorage().then(() =>
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);

// App Android : une nouvelle version est-elle publiée sur GitHub ?
startUpdateChecks();
