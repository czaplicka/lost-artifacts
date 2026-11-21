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
 * Kopia do snapshotu/zapisu, nie kloner zachowujący dowolne typy JS.
 * Zachowuje dotychczasowy format: Date -> ISO, nieobsługiwane wartości
 * są pomijane w obiektach, a w tablicach zastępowane null.
 * Jeden zbiorczy log na wywołanie, maksymalnie 20 przykładowych ścieżek.
 * Zwykłe undefined oraz celowo blokowane klucze nie wywołują ostrzeżeń.
 * RouteManager zachowuje jawny kontrakt serialize()/restore().
 */
export function cloneGameData(value, ancestors = new WeakSet()) {
  const counts = {
    dateToIso: 0,
    invalidDateToNull: 0,
    nonFiniteToNull: 0,
    unsupported: 0,
    circular: 0
  };
  const samples = [];
  let affected = 0;

  const report = (reason, path, type, action) => {
    counts[reason] += 1;
    affected += 1;
    if (samples.length < 20) samples.push({ path, type, action });
  };

  const childPath = (path, key) => /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;

  const typeName = item => {
    if (item instanceof Map) return 'Map';
    if (item instanceof Set) return 'Set';
    const prototype = Object.getPrototypeOf(item);
    const constructor = prototype &&
      Object.getOwnPropertyDescriptor(prototype, 'constructor')?.value;
    return typeof constructor === 'function' && constructor.name
      ? constructor.name : 'non-plain object';
  };

  function copy(item, path, omittedAction = 'omitted') {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') {
      return item;
    }
    if (typeof item === 'number') {
      if (Number.isFinite(item)) return item;
      report('nonFiniteToNull', path, 'number', 'replaced-with-null');
      return null;
    }
    if (item === undefined) return undefined;
    if (typeof item === 'function' || typeof item === 'symbol' || typeof item === 'bigint') {
      report('unsupported', path, typeof item, omittedAction);
      return undefined;
    }
    if (item instanceof Date) {
      if (Number.isFinite(item.getTime())) {
        report('dateToIso', path, 'Date', 'converted-to-iso-string');
        return item.toISOString();
      }
      report('invalidDateToNull', path, 'Date', 'replaced-with-null');
      return null;
    }
    if (ancestors.has(item)) {
      report('circular', path, 'circular reference', omittedAction);
      return undefined;
    }
    if (item instanceof RouteManager) {
      // Mark the manager too: a malformed serialize() must not recurse forever.
      ancestors.add(item);
      try {
        return copy(item.serialize(), path, omittedAction);
      } finally {
        ancestors.delete(item);
      }
    }
    if (!Array.isArray(item) && !isPlainObject(item)) {
      report('unsupported', path, typeName(item), omittedAction);
      return undefined;
    }

    ancestors.add(item);
    try {
      if (Array.isArray(item)) {
        return item.map((entry, index) => {
          const cloned = copy(entry, `${path}[${index}]`, 'replaced-with-null');
          return cloned === undefined ? null : cloned;
        });
      }
      const result = {};
      for (const [key, entry] of Object.entries(item)) {
        if (BLOCKED_KEYS.has(key)) continue;
        const cloned = copy(entry, childPath(path, key));
        if (cloned !== undefined) result[key] = cloned;
      }
      return result;
    } finally {
      ancestors.delete(item);
    }
  }

  const result = copy(value, '$', 'returned-undefined');
  if (affected > 0) {
    try {
      console.warn(
        `[GameState] cloneGameData: ${affected} value(s) converted or omitted.`,
        { affected, counts, samples, samplesTruncated: affected > samples.length }
      );
    } catch {
      // A diagnostic sink must not break the save operation.
    }
  }
  return result;
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