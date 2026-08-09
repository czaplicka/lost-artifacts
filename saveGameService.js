import { supabase } from './supabase-client.js';
import {
  gameState,
  defaultGameState
} from './GameData.js';
import { createSaveManager } from './SaveManager.js';
import { RouteManager } from './RouteManager.js';

const GAME_VERSION = '0.9.0';

function cloneData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
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
   * Zachowujemy referencję eksportowanego `gameState`, ale usuwamy cały
   * poprzedni runtime state. Dzięki temu pola z poprzedniej sesji nie mogą
   * przetrwać, jeśli nie występują w aktualnie ładowanym save.
   */
  Object.keys(gameState).forEach((key) => {
    delete gameState[key];
  });

  /*
   * Najpierw aktualne wartości domyślne wersji gry, a dopiero później dane
   * gracza. Stary zapis, któremu brakuje nowych pól, nadal będzie działał.
   */
  Object.assign(gameState, safeDefaults, safeSavedState);

  /*
   * RouteManager jest runtimeową instancją klasy. structuredClone zachowuje
   * tylko pola danych, nie zachowuje metod klasy, więc trzeba go odtworzyć.
   */
  gameState.routeManager = createRouteManagerFromSave(safeSavedState);

  return gameState;
}

export const saveManager = createSaveManager({
  supabase,

  gameVersion: GAME_VERSION,

  getState: () => {
    const state = cloneData(gameState);

    /*
     * Do save zapisujemy dane RouteManagera, nie instancję klasy.
     */
    if (gameState.routeManager instanceof RouteManager) {
      state.routeManager = gameState.routeManager.serialize();
    } else {
      delete state.routeManager;
    }

    return state;
  },

  applyState: replaceGameState
});