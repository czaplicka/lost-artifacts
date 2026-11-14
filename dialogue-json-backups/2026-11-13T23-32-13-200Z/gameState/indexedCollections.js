import {
  isValidId,
  getEntryId,
  getIndexKey,
  cloneGameData
} from './dataUtils.js';


/**
 * Wskazówki zapisane przed wprowadzeniem wymogu "id" nie mają pola id.
 * Zamiast je kasować przy imporcie, nadajemy im stabilne id z treści.
 */
function assignLegacyClueId(entry) {
  if (
    entry === null ||
    typeof entry !== 'object' ||
    isValidId(entry.id)
  ) {
    return entry;
  }


  const parts = [
    entry.type,
    entry.category,
    entry.key,
    entry.value,
    entry.cityId,
    entry.tag,
    entry.text
  ].filter(
    part =>
      (typeof part === 'string' && part.trim()) ||
      (typeof part === 'number' && Number.isFinite(part))
  );


  const slug = parts
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);


  return slug
    ? { ...entry, id: `legacy_${slug}` }
    : entry;
}


export const INDEXED_COLLECTIONS = {
  cluesCollected: {
    indexKey: '_clueIndex',
    label: 'clue',
    prepareEntry: assignLegacyClueId
  },
  visitedEncounters: {
    indexKey: '_encounterIndex',
    label: 'encounter'
  },
  visitedCities: {
    indexKey: '_cityIndex',
    label: 'city'
  }
};


export const COLLECTION_KEYS = Object.keys(INDEXED_COLLECTIONS);
export const MANAGED_COLLECTION_KEYS = new Set(COLLECTION_KEYS);


export const MANAGED_PRIVATE_KEYS = new Set(
  Object.values(INDEXED_COLLECTIONS).map(
    config => config.indexKey
  )
);


/**
 * Zachowuje format poprawnych wpisów:
 * obiekt pozostaje obiektem, starszy identyfikator pozostaje ID.
 *
 * Usuwa wpisy bez ID i powtórzenia tego samego ID.
 *
 * clone = true  -> dane z zewnątrz, kopiujemy każdy wpis.
 * clone = false -> dane już należą do stanu (albo zostały wcześniej sklonowane).
 * prepareEntry  -> opcjonalna naprawa wpisu przed sprawdzeniem ID.
 */
export function normalizeCollection(entries, clone = true, prepareEntry = null) {
  if (!Array.isArray(entries)) {
    return [];
  }


  const result = [];
  const ids = new Set();


  for (const rawEntry of entries) {
    const entry = prepareEntry ? prepareEntry(rawEntry) : rawEntry;
    const id = getEntryId(entry);


    if (id === null) {
      continue;
    }


    const key = getIndexKey(id);


    if (ids.has(key)) {
      continue;
    }


    const copied = clone ? cloneGameData(entry) : entry;


    if (copied === undefined) {
      continue;
    }


    ids.add(key);
    result.push(copied);
  }


  return result;
}


export function rebuildCollectionIndex(state, collectionKey, clone = false) {
  const config = INDEXED_COLLECTIONS[collectionKey];


  if (!config) {
    return;
  }


  const collection = normalizeCollection(
    state[collectionKey],
    clone,
    config.prepareEntry || null
  );


  const index = {};


  collection.forEach((entry, position) => {
    index[getIndexKey(getEntryId(entry))] = position;
  });


  state[collectionKey] = collection;
  state[config.indexKey] = index;
}


export function rebuildStateIndexes(state, clone = false) {
  for (const collectionKey of COLLECTION_KEYS) {
    rebuildCollectionIndex(state, collectionKey, clone);
  }
}