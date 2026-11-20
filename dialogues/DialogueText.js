import { GAME_VERSION } from '../config/gameVersion.js';

const CATALOG_URL = new URL(
  '../assets/data/dialogue/extracted.json',
  import.meta.url
);

CATALOG_URL.searchParams.set('v', GAME_VERSION);

const LOAD_TIMEOUT_MS = 8000;
const reportedMissing = new Set();

let loadFailed = false;
let bannerScheduled = false;

function emptyCatalog() {
  return Object.freeze({
    version: 1,
    sources: Object.freeze(Object.create(null))
  });
}

function showLoadWarning() {
  if (
    typeof document === 'undefined' ||
    bannerScheduled
  ) {
    return;
  }

  bannerScheduled = true;

  const show = () => {
    if (
      !document.body ||
      document.getElementById('dialogue-load-warning')
    ) {
      return;
    }

    const banner = document.createElement('div');

    banner.id = 'dialogue-load-warning';
    banner.setAttribute('role', 'alert');

    banner.textContent =
      'Dialogue text could not be loaded. Some text will be missing. ' +
      'Check your connection and reload the game.';

    banner.style.cssText =
      'position:fixed;' +
      'left:12px;' +
      'right:12px;' +
      'top:12px;' +
      'z-index:2147483647;' +
      'padding:12px 16px;' +
      'background:#37251b;' +
      'color:#fff1d0;' +
      'border:2px solid #d4af37;' +
      'font:16px/1.5 monospace;';

    document.body.appendChild(banner);
  };

  if (document.body) {
    show();
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      show,
      { once: true }
    );
  }
}

function validateCatalog(data) {
  if (
    data?.version !== 1 ||
    !data.sources ||
    typeof data.sources !== 'object' ||
    Array.isArray(data.sources)
  ) {
    throw new Error('Invalid dialogue catalog.');
  }

  const sources = Object.create(null);

  for (
    const [source, entries]
    of Object.entries(data.sources)
  ) {
    if (
      !entries ||
      typeof entries !== 'object' ||
      Array.isArray(entries)
    ) {
      console.error(
        '[DialogueText] Invalid source section:',
        source
      );

      continue;
    }

    const validEntries = Object.create(null);

    for (const [id, value] of Object.entries(entries)) {
      if (typeof value !== 'string') {
        console.error(
          '[DialogueText] Expected a string:',
          source,
          id
        );

        continue;
      }

      validEntries[id] = value;
    }

    sources[source] = Object.freeze(validEntries);
  }

  return Object.freeze({
    version: 1,
    sources: Object.freeze(sources)
  });
}

async function loadCatalog() {
  let timer = null;
  const controller = new AbortController();

  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error('Dialogue catalog loading timed out.')
        );

        controller.abort();
      }, LOAD_TIMEOUT_MS);
    });

    const request = (async () => {
      const response = await fetch(CATALOG_URL, {
        cache: 'force-cache',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(
          'Cannot load extracted.json: HTTP ' +
          response.status
        );
      }

      // Timeout obejmuje również odczyt i parsowanie odpowiedzi.
      return validateCatalog(await response.json());
    })();

    return await Promise.race([request, timeout]);
  } catch (error) {
    loadFailed = true;

    console.error(
      '[DialogueText] Catalog unavailable; using placeholders.',
      error
    );

    showLoadWarning();

    return emptyCatalog();
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

// Moduły odczytujące teksty podczas importu czekają na katalog.
// Obsłużony błąd ładowania nie przerywa grafu importów.
const catalog = await loadCatalog();

export function dialogueText(source, id) {
  const sourceKey = typeof source === 'string'
    ? source
    : '<invalid-source>';

  const textKey = typeof id === 'string'
    ? id
    : '<invalid-id>';

  const entries = Object.hasOwn(
    catalog.sources,
    sourceKey
  )
    ? catalog.sources[sourceKey]
    : null;

  if (
    entries &&
    Object.hasOwn(entries, textKey)
  ) {
    return entries[textKey];
  }

  const missingKey = JSON.stringify([
    sourceKey,
    textKey
  ]);

  if (!reportedMissing.has(missingKey)) {
    reportedMissing.add(missingKey);

    console.error(
      '[DialogueText] Missing text:',
      sourceKey,
      textKey
    );
  }

  return `[Missing text: ${sourceKey}/${textKey}]`;
}

export function getDialogueTextStatus() {
  return {
    loaded: !loadFailed,
    sourceCount: Object.keys(catalog.sources).length,
    missingCount: reportedMissing.size
  };
}