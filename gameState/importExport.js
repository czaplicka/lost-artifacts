import { RouteManager } from '../managers/RouteManager.js';

import {
  GAME_STATE_VERSION,
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


export function cloneDefaultState() {
  return cloneGameData(defaultGameState);
}


export function createInitialState() {
  const state = cloneGameData(defaultGameState);


  state._createdAt = Date.now();
  rebuildStateIndexes(state);


  return state;
}


/**
 * Starszy zapis mógł mieć dane jednocześnie w "state"
 * oraz bezpośrednio na najwyższym poziomie.
 *
 * Najwyższy poziom ma pierwszeństwo, zgodnie z dotychczasowym setupem.
 */
export function unwrapImportedState(saveData) {
  if (!isPlainObject(saveData)) {
    return null;
  }


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


function restoreRouteManager(serialized) {
  if (!isPlainObject(serialized)) {
    return null;
  }


  const manager = new RouteManager(
    serialized.route,
    serialized.crimeCityId
  );


  manager.restore(serialized);
  return manager;
}


/**
 * Oczekuje danych, które już zostały sklonowane w importFromSave().
 * Nie klonuje ich ponownie.
 */
export function normalizeImportedState(source) {
  const defaults = cloneGameData(defaultGameState);


  const state = {
    ...defaults,
    ...source
  };


  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(state[key])) {
        state[key] = cloneGameData(defaultValue);
      }


      continue;
    }


    if (isPlainObject(defaultValue)) {
      state[key] = isPlainObject(source[key])
        ? {
            ...cloneGameData(defaultValue),
            ...source[key]
          }
        : cloneGameData(defaultValue);
    }
  }


  state.reconstructedHeist = {
    ...createDefaultReconstructedHeist(),
    ...(isPlainObject(source.reconstructedHeist)
      ? source.reconstructedHeist
      : {})
  };


  // Zapis tworzy z podejrzanych trzy osobne kopie. Przywracamy
  // jedną wspólną tablicę, tak jak zakłada logika gry.
  const sharedSuspects =
    Array.isArray(state.caseSuspects) && state.caseSuspects.length
      ? state.caseSuspects
      : Array.isArray(state.suspects) && state.suspects.length
        ? state.suspects
        : Array.isArray(state.suspectList)
          ? state.suspectList
          : [];


  state.caseSuspects = sharedSuspects;
  state.suspects = sharedSuspects;
  state.suspectList = sharedSuspects;


  state.caseDirector = null;


  state.routeManager = restoreRouteManager(
    source.routeManager
  );


  state._version = GAME_STATE_VERSION;


  if (!Number.isFinite(state._createdAt)) {
    state._createdAt = Date.now();
  }


  rebuildStateIndexes(state);


  return state;
}