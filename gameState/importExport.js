// compact-suspect-save-v1
import { restoreCaseSuspectProfiles } from './suspectSaveFormat.js';
import { migrateLegacyTravelState } from './legacyTravelMigration.js';
import {
  migrateLegacySuspectExclusionState
} from './legacySuspectExclusionMigration.js';
import { RouteManager } from '../managers/RouteManager.js';
import { GAME_VERSION } from '../config/gameVersion.js';
import {
  defaultGameState,
  createDefaultReconstructedHeist
} from './defaultState.js';
import {
  BLOCKED_KEYS,
  MANAGER_KEYS,
  RUNTIME_KEYS,
  isPlainObject,
  cloneGameData
} from './dataUtils.js';
import {
  MANAGED_PRIVATE_KEYS,
  rebuildStateIndexes
} from './indexedCollections.js';
import { normalizeCaseSuspects } from '../suspects/CaseSuspects.js';

const own = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

export function cloneDefaultState() {
  const state = cloneGameData(defaultGameState);
  normalizeCaseSuspects(state);

  // Public data only; do not retain runtime aliases in the template.
  return cloneGameData(state);
}

export function createInitialState() {
  const state = cloneGameData(defaultGameState);
  normalizeCaseSuspects(state);
  state._createdAt = Date.now();
  rebuildStateIndexes(state);
  return state;
}

export function unwrapImportedState(saveData) {
  if (!isPlainObject(saveData)) return null;

  const nested = isPlainObject(saveData.state)
    ? saveData.state
    : {};

  const result = {};

  for (const source of [nested, saveData]) {
    for (const [key, value] of Object.entries(source)) {
      if (
        MANAGER_KEYS.has(key) ||
        MANAGED_PRIVATE_KEYS.has(key) ||
        BLOCKED_KEYS.has(key) ||
        RUNTIME_KEYS.has(key)
      ) {
        continue;
      }

      result[key] = value;
    }
  }

  return result;
}

function reportTypeMismatch(path, expected) {
  console.warn(
    `[GameState] Invalid saved type at "${path}"; expected ${expected}. Using its default value.`
  );
}

function mergeSavedWithDefaults(defaultValue, savedValue, path) {
  // Missing fields are different from an explicitly saved null.
  if (savedValue === undefined) {
    return cloneGameData(defaultValue);
  }

  if (Array.isArray(defaultValue)) {
    // Arrays represent complete saved collections, never positional patches.
    if (!Array.isArray(savedValue)) {
      reportTypeMismatch(path, 'an array');
      return cloneGameData(defaultValue);
    }

    return cloneGameData(savedValue);
  }

  if (isPlainObject(defaultValue)) {
    if (savedValue === null) return null;

    if (!isPlainObject(savedValue)) {
      reportTypeMismatch(path, 'a plain object or null');
      return cloneGameData(defaultValue);
    }

    const result = {};
    const keys = new Set([
      ...Object.keys(defaultValue),
      ...Object.keys(savedValue)
    ]);

    for (const key of keys) {
      if (BLOCKED_KEYS.has(key)) continue;

      const nextPath = path ? `${path}.${key}` : key;

      const fallback = own(defaultValue, key)
        ? defaultValue[key]
        : undefined;

      const saved = own(savedValue, key)
        ? savedValue[key]
        : undefined;

      const merged = mergeSavedWithDefaults(
        fallback,
        saved,
        nextPath
      );

      if (merged !== undefined) {
        result[key] = merged;
      }
    }

    return result;
  }

  // A null default does not describe the schema of a populated saved object.
  // Retain such objects and extension fields without guessing their contents.
  return cloneGameData(savedValue);
}

function restoreRouteManager(serialized) {
  if (serialized == null) return null;

  try {
    if (!isPlainObject(serialized)) {
      throw new TypeError(
        'Route manager data must be a plain object.'
      );
    }

    if (
      own(serialized, 'route') &&
      !Array.isArray(serialized.route)
    ) {
      throw new TypeError('Saved route must be an array.');
    }

    const manager = new RouteManager(
      serialized.route,
      serialized.crimeCityId
    );

    if (manager.restore(serialized) === false) {
      throw new Error(
        'Route manager rejected the saved route.'
      );
    }

    return manager;
  } catch (error) {
    // Failure of this optional runtime object must not reject the whole save.
    console.warn(
      '[GameState] Could not restore routeManager; resetting it to null.',
      error
    );

    return null;
  }
}

export function normalizeImportedState(source) {
  if (!isPlainObject(source)) {
    throw new TypeError(
      '[GameState] Imported state must be a plain object.'
    );
  }

  const defaults = cloneGameData(defaultGameState);

  defaults.reconstructedHeist =
    createDefaultReconstructedHeist();

  // Work only with owned data, including when this function is called directly.
  const imported = cloneGameData(
    unwrapImportedState(source)
  );

  const state = mergeSavedWithDefaults(
    defaults,
    imported,
    ''
  );

  migrateLegacyTravelState(state);
  migrateLegacySuspectExclusionState(state);

  normalizeCaseSuspects(state);
  restoreCaseSuspectProfiles(state);

  state.caseDirector = null;
  state.routeManager = restoreRouteManager(
    imported.routeManager
  );

  state._version = GAME_VERSION;

  if (!Number.isFinite(state._createdAt)) {
    state._createdAt = Date.now();
  }

  rebuildStateIndexes(state);

  return state;
}