import { supabase } from './supabase-client.js';
import {
  gameState,
  defaultGameState
} from './GameData.js';
import { createSaveManager } from './SaveManager.js';
import { RouteManager } from './RouteManager.js';

const GAME_VERSION = '0.9.0';

/**
 * Zwraca dane możliwe do umieszczenia w save:
 * string, number, boolean, null, tablice i zwykłe obiekty.
 *
 * Nie zapisujemy funkcji, Phaser objects, referencji cyklicznych,
 * elementów DOM ani runtimeowych instancji klas.
 */
function sanitizeSaveData(value, path = 'root', seen = new WeakSet()) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'function') {
    console.warn(`[Save] Function skipped at "${path}".`, value);
    return undefined;
  }

  if (typeof value === 'symbol' || typeof value === 'bigint') {
    console.warn(`[Save] Unsupported value skipped at "${path}".`, value);
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  if (seen.has(value)) {
    console.warn(`[Save] Circular reference skipped at "${path}".`);
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const sanitizedArray = value.map((item, index) => {
      const sanitizedItem = sanitizeSaveData(
        item,
        `${path}[${index}]`,
        seen
      );

      /*
       * JSON nie ma odpowiednika undefined w tablicy.
       * null zachowuje właściwy układ indeksów.
       */
      return typeof sanitizedItem === 'undefined'
        ? null
        : sanitizedItem;
    });

    seen.delete(value);
    return sanitizedArray;
  }

  const sanitizedObject = {};

  for (const [key, item] of Object.entries(value)) {
    const sanitizedItem = sanitizeSaveData(
      item,
      `${path}.${key}`,
      seen
    );

    if (typeof sanitizedItem !== 'undefined') {
      sanitizedObject[key] = sanitizedItem;
    }
  }

  seen.delete(value);
  return sanitizedObject;
}

function cloneData(value) {
  return sanitizeSaveData(value);
}

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function createRouteManagerFromSave(savedState) {
  const serializedManager = isPlainObject(savedState.routeManager)
    ? savedState.routeManager
    : null;

  const route = Array.isArray(serializedManager?.route)
    ? serializedManager.route
    : Array.isArray(savedState.escapeRoute)
      ? savedState.escapeRoute
      : [];

  const crimeCityId =
    serializedManager?.crimeCityId ||
    savedState.crimeCityId ||
    null;

  const routeManager = new RouteManager(route, crimeCityId);

  if (serializedManager) {
    routeManager.restore(serializedManager);
  }

  return routeManager;
}

function replaceGameState(savedState) {
  if (!isPlainObject(savedState)) {
    throw new Error(
      '[saveGameService] Cannot replace game state: save data must be a plain object.'
    );
  }

  const safeDefaults = cloneData(defaultGameState);
  const safeSavedState = cloneData(savedState);

  /*
   * Zachowujemy referencję eksportowanego gameState, ale czyścimy obiekt
   * przed odtworzeniem stanu z pliku.
   */
  Object.keys(gameState).forEach((key) => {
    delete gameState[key];
  });

  /*
   * Najpierw nowe domyślne pola z aktualnej wersji gry,
   * następnie faktyczny stan zapisany przez gracza.
   */
  Object.assign(gameState, safeDefaults, safeSavedState);

  /*
   * routeManager jest instancją runtimeową, a nie trwałą częścią save'a.
   * Odtwarzamy obiekt klasy na podstawie jej zserializowanych danych.
   */
  gameState.routeManager = createRouteManagerFromSave(safeSavedState);

  console.log('[SaveLoad] Restored snapshot:', {
    currentCityId: gameState.currentCityId,
    crimeCityId: gameState.crimeCityId,
    currentMission: gameState.currentMission,
    visitedCities: gameState.visitedCities,
    specialScenesCompleted: gameState.specialScenesCompleted,
    crimeCityProgress: gameState.crimeCityProgress
  });

  return gameState;
}

export const saveManager = createSaveManager({
  supabase,

  gameVersion: GAME_VERSION,

  getState: () => {
    /*
     * WAŻNE:
     * Nie wolno klonować gameState razem z RouteManagerem. To instancja
     * runtimeowa, która może zawierać metody, funkcje RNG, eventy albo
     * inne dane niemożliwe do zapisu przez structuredClone / JSON.
     */
    const {
      routeManager,
      ...serializableGameState
    } = gameState;

    /*
     * Tu klonujemy już tylko właściwe dane gry.
     */
    const state = cloneData(serializableGameState);

    /*
     * Następnie dokładamy czyste dane trasy, a nie instancję RouteManager.
     */
    if (routeManager instanceof RouteManager) {
      state.routeManager = cloneData(routeManager.serialize());
    }

    return state;
  },

  applyState: replaceGameState
});