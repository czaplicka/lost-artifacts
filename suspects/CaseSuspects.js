// Jedna lista danych; stare nazwy pozostają wyłącznie aliasami runtime.
const LEGACY_KEYS = ['suspects', 'suspectList'];

function readLegacySuspects(state) {
  if (Array.isArray(state.caseSuspects) && state.caseSuspects.length) {
    return state.caseSuspects;
  }
  for (const key of LEGACY_KEYS) {
    if (Array.isArray(state[key]) && state[key].length) return state[key];
  }
  return Array.isArray(state.caseSuspects) ? state.caseSuspects : [];
}

export function normalizeCaseSuspects(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('Case suspect state must be an object.');
  }
  const suspects = readLegacySuspects(state);
  state.caseSuspects = suspects;
  for (const key of LEGACY_KEYS) {
    Object.defineProperty(state, key, {
      configurable: true,
      enumerable: false,
      get() { return this.caseSuspects; },
      set(value) {
        if (!Array.isArray(value)) throw new TypeError(`${key} must be an array.`);
        this.caseSuspects = value;
      }
    });
  }
  return state;
}

export function getCaseSuspects(state) {
  return Array.isArray(state?.caseSuspects) ? state.caseSuspects : [];
}
