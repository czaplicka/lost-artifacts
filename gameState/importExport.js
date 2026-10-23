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

export function cloneDefaultState() {
  const state = cloneGameData(defaultGameState);
  normalizeCaseSuspects(state);
  // Klon danych publicznych: aliasy runtime nie są częścią szablonu.
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
  const nested = isPlainObject(saveData.state) ? saveData.state : {};
  const result = {};

  for (const source of [nested, saveData]) {
    for (const [key, value] of Object.entries(source)) {
      if (
        MANAGER_KEYS.has(key) ||
        MANAGED_PRIVATE_KEYS.has(key) ||
        BLOCKED_KEYS.has(key) ||
        RUNTIME_KEYS.has(key)
      ) continue;
      result[key] = value;
    }
  }
  return result;
}

function restoreRouteManager(serialized) {
  if (!isPlainObject(serialized)) return null;
  const manager = new RouteManager(serialized.route, serialized.crimeCityId);
  manager.restore(serialized);
  return manager;
}

export function normalizeImportedState(source) {
  const defaults = cloneGameData(defaultGameState);
  const state = { ...defaults, ...source };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(state[key])) {
        state[key] = cloneGameData(defaultValue);
      }
      continue;
    }
    if (isPlainObject(defaultValue)) {
      state[key] = isPlainObject(source[key])
        ? { ...cloneGameData(defaultValue), ...source[key] }
        : cloneGameData(defaultValue);
    }
  }

  state.reconstructedHeist = {
    ...createDefaultReconstructedHeist(),
    ...(isPlainObject(source.reconstructedHeist)
      ? source.reconstructedHeist
      : {})
  };

  normalizeCaseSuspects(state);
  state.caseDirector = null;
  state.routeManager = restoreRouteManager(source.routeManager);
  state._version = GAME_VERSION;

  if (!Number.isFinite(state._createdAt)) state._createdAt = Date.now();
  rebuildStateIndexes(state);
  return state;
}
