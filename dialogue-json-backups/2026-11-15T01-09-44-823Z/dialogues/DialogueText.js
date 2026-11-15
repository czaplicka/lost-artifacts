const CATALOG_URL = new URL(
  '../assets/data/dialogue/extracted.json',
  import.meta.url
);

async function loadCatalog() {
  const response = await fetch(CATALOG_URL, {
    cache: 'no-cache'
  });

  if (!response.ok) {
    throw new Error(
      '[DialogueText] Cannot load extracted.json: HTTP ' +
      response.status
    );
  }

  const data = await response.json();

  if (
    data?.version !== 1 ||
    !data.sources ||
    typeof data.sources !== 'object' ||
    Array.isArray(data.sources)
  ) {
    throw new Error('[DialogueText] Invalid dialogue catalog.');
  }

  for (const [source, entries] of Object.entries(data.sources)) {
    if (
      !entries ||
      typeof entries !== 'object' ||
      Array.isArray(entries)
    ) {
      throw new Error(
        '[DialogueText] Invalid source section: ' + source
      );
    }

    for (const [id, value] of Object.entries(entries)) {
      if (typeof value !== 'string') {
        throw new Error(
          '[DialogueText] Expected a string: ' + source + '/' + id
        );
      }
    }

    Object.freeze(entries);
  }

  Object.freeze(data.sources);

  return Object.freeze(data);
}

const catalog = await loadCatalog();

export function dialogueText(source, id) {
  const entries = Object.hasOwn(catalog.sources, source)
    ? catalog.sources[source]
    : null;

  if (!entries || !Object.hasOwn(entries, id)) {
    throw new Error(
      '[DialogueText] Missing text: ' + source + '/' + id
    );
  }

  return entries[id];
}
