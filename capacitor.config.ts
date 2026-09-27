import type { CapacitorConfig } from '@capacitor/cli';

// Application Android (Capacitor) : le build Vite (dist/) est embarqué dans l'APK
// (npm run apk / npm run apk:release, voir scripts/build-apk.mjs).
const config: CapacitorConfig = {
  appId: 'app.cybercardex',
  appName: 'CyberCardex',
  webDir: 'dist',
  backgroundColor: '#06070a',
  plugins: {
    SystemBars: {
      // Bord à bord : le CSS gère les marges via env(safe-area-inset-*).
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // Icônes claires sur fond sombre.
      style: 'DARK',
    },
  },
  android: {
    // Pas de contenu HTTP mixte, pas de débogage distant en release.
    allowMixedContent: false,
  },
};

export default config;
