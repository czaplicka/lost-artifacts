import { RouteManager } from '../managers/RouteManager.js';


// Klucze, których nigdy nie kopiujemy ani nie nadpisujemy.
export const BLOCKED_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor'
]);


// Pola samego menedżera stanu (nie są częścią zapisu gry).
export const MANAGER_KEYS = new Set([
  'state',
  'dirty',
  'saveCheckpoint',
  'historyLimit',
  'memoryObjectLimit'
]);


// Pola istniejące tylko w czasie działania gry (nie trafiają do zapisu).
export const RUNTIME_KEYS = new Set([
  'caseDirector'
]);


export function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}


export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }


  const prototype = Object.getPrototypeOf(value);


  return (
    prototype === Object.prototype ||
    prototype === null
  );
}


export function isValidId(id) {
  return (
    (typeof id === 'string' && id.trim().length > 0) ||
    (typeof id === 'number' && Number.isFinite(id))
  );
}


export function getEntryId(entry) {
  const id =
    entry !== null && typeof entry === 'object'
      ? entry.id
      : entry;


  return isValidId(id) ? id : null;
}


export function getIndexKey(id) {
  return `${typeof id}:${String(id)}`;
}


/**
 * Kopia danych do snapshotu lub zapisu.
 *
 * Nie przenosi funkcji, cykli ani dowolnych instancji klas.
 * RouteManager ma jawny kontrakt serializacji.
 */
export function cloneGameData(value, ancestors = new WeakSet()) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }


  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }


  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    return undefined;
  }


  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString()
      : null;
  }


  if (value instanceof RouteManager) {
    return cloneGameData(value.serialize(), ancestors);
  }


  if (
    typeof value !== 'object' ||
    ancestors.has(value)
  ) {
    return undefined;
  }


  if (
    !Array.isArray(value) &&
    !isPlainObject(value)
  ) {
    return undefined;
  }


  ancestors.add(value);


  try {
    if (Array.isArray(value)) {
      return value.map(item => {
        const cloned = cloneGameData(item, ancestors);
        return cloned === undefined ? null : cloned;
      });
    }


    const result = {};


    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) {
        continue;
      }


      const cloned = cloneGameData(item, ancestors);


      if (cloned !== undefined) {
        result[key] = cloned;
      }
    }


    return result;
  } finally {
    ancestors.delete(value);
  }
}


export function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(value)
  ) {
    return value;
  }


  seen.add(value);


  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }


  return Object.freeze(value);
}