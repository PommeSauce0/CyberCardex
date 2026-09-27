import { messages } from '../i18n';

import { decodeDescriptor, type ScanIndexEntry } from './descriptor';

let cache: Promise<ScanIndexEntry[]> | undefined;

/** Charge (une seule fois) l'index du scanner généré par `npm run build-scan-index`. */
export function loadScanIndex() {
  cache ??= fetch(`${import.meta.env.BASE_URL}scan-index.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(messages().scan.indexError(response.status));
      }
      return response.json() as Promise<{ entries: [string, string][] }>;
    })
    .then(({ entries }) =>
      entries.map(([id, encoded]) => ({ id, descriptor: decodeDescriptor(encoded) })),
    )
    .catch((error) => {
      cache = undefined;
      throw error;
    });
  return cache;
}
