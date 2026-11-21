import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    label: __dialogueText("gameState/indexedCollections.js", "t_4c424a68bbc374bc8aa7"),
    prepareEntry: assignLegacyClueId
  },
  visitedEncounters: {
    indexKey: '_encounterIndex',
    label: __dialogueText("gameState/indexedCollections.js", "t_f70b7769ae02a76af966")
  },
  visitedCities: {
    indexKey: '_cityIndex',
    label: __dialogueText("gameState/indexedCollections.js", "t_11a62c23412b77477a71")
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
 * collectionKey -> nazwa kolekcji w zbiorczym logu odrzuconych wpisów.
 */
export function normalizeCollection(
  entries,
  clone = true,
  prepareEntry = null,
  collectionKey = 'unknown'
) {
  if (!Array.isArray(entries)) {
    return [];
  }


  const result = [];
  const ids = new Set();
  let invalidId = 0;
  let duplicateId = 0;
  let cloneFailed = 0;


  for (const rawEntry of entries) {
    const entry = prepareEntry ? prepareEntry(rawEntry) : rawEntry;
    const id = getEntryId(entry);


    if (id === null) {
      invalidId += 1;
      continue;
    }


    const key = getIndexKey(id);


    if (ids.has(key)) {
      duplicateId += 1;
      continue;
    }


    const copied = clone ? cloneGameData(entry) : entry;


    if (copied === undefined) {
      cloneFailed += 1;
      continue;
    }


    ids.add(key);
    result.push(copied);
  }


  const rejected = invalidId + duplicateId + cloneFailed;

  if (rejected > 0) {
    console.warn(
      `[GameState] normalizeCollection(${collectionKey}): ` +
      `rejected ${rejected} of ${entries.length} entries.`,
      {
        collectionKey,
        total: entries.length,
        kept: result.length,
        rejected,
        invalidId,
        duplicateId,
        cloneFailed
      }
    );
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
    config.prepareEntry || null,
    collectionKey
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