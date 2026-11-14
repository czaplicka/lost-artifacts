import { GameStateManager } from './GameStateManager.js';

import {
  BLOCKED_KEYS,
  MANAGER_KEYS,
  hasOwn,
  isPlainObject
} from './dataUtils.js';

import {
  MANAGED_COLLECTION_KEYS,
  MANAGED_PRIVATE_KEYS,
  rebuildStateIndexes
} from './indexedCollections.js';


const manager = new GameStateManager();
const boundMethods = new Map();


/**
 * Warstwa zgodności ze scenami:
 *
 * gameState.score = 100
 * Object.assign(gameState, {...})
 * gameState.addClue(...)
 *
 * Wszystkie dane trafiają do manager.state.
 */
export const gameState = new Proxy(manager, {
  get(target, key) {
    if (hasOwn(target, key)) {
      return Reflect.get(target, key, target);
    }


    const prototypeValue = Reflect.get(
      GameStateManager.prototype,
      key,
      target
    );


    if (typeof prototypeValue === 'function') {
      if (!boundMethods.has(key)) {
        boundMethods.set(
          key,
          prototypeValue.bind(target)
        );
      }


      return boundMethods.get(key);
    }


    return Reflect.get(target.state, key);
  },


  set(target, key, value) {
    if (typeof key === 'symbol') {
      return false;
    }


    if (
      BLOCKED_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      throw new TypeError(
        `[GameState] Cannot overwrite manager API "${key}".`
      );
    }


    if (key === 'state') {
      if (!isPlainObject(value)) {
        throw new TypeError(
          '[GameState] state must be a plain object.'
        );
      }


      // Obce dane: odbudowujemy indeksy, żeby addClue/addCity nie wywaliły się.
      rebuildStateIndexes(value, true);
      target.state = value;
      target.dirty = true;


      return true;
    }


    if (MANAGER_KEYS.has(key)) {
      return Reflect.set(target, key, value, target);
    }


    if (MANAGED_PRIVATE_KEYS.has(key)) {
      throw new TypeError(
        `[GameState] "${key}" is a derived index.`
      );
    }


    if (MANAGED_COLLECTION_KEYS.has(key)) {
      if (!target.replaceIndexedCollection(key, value)) {
        throw new TypeError(
          `[GameState] "${key}" must be an array.`
        );
      }


      return true;
    }


    target.state[key] = value;
    target.dirty = true;


    return true;
  },


  has(target, key) {
    return (
      Reflect.has(target, key) ||
      Reflect.has(target.state, key)
    );
  },


  ownKeys(target) {
    return [
      ...new Set([
        ...Reflect.ownKeys(target),
        ...Reflect.ownKeys(target.state)
      ])
    ];
  },


  getOwnPropertyDescriptor(target, key) {
    const own = Reflect.getOwnPropertyDescriptor(
      target,
      key
    );


    if (own) {
      return own;
    }


    if (hasOwn(target.state, key)) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: target.state[key]
      };
    }


    return undefined;
  },


  /**
   * Zgodność z installRestoredFieldAccessors()
   * z poprzedniej wersji saveGameService.js.
   *
   * Proxy już przekierowuje te pola, więc nie instalujemy
   * kolejnego zestawu getterów i setterów na managerze.
   */
  defineProperty(target, key, descriptor) {
    if (
      typeof key !== 'string' ||
      BLOCKED_KEYS.has(key) ||
      MANAGER_KEYS.has(key) ||
      MANAGED_PRIVATE_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      return false;
    }


    if (descriptor.configurable === false) {
      return false;
    }


    if (
      typeof descriptor.get === 'function' ||
      typeof descriptor.set === 'function'
    ) {
      return (
        hasOwn(target.state, key) &&
        descriptor.configurable === true
      );
    }


    if (hasOwn(descriptor, 'value')) {
      if (MANAGED_COLLECTION_KEYS.has(key)) {
        return target.replaceIndexedCollection(
          key,
          descriptor.value
        );
      }


      target.state[key] = descriptor.value;
      target.dirty = true;
    }


    return true;
  },


  deleteProperty(target, key) {
    if (
      MANAGER_KEYS.has(key) ||
      MANAGED_PRIVATE_KEYS.has(key) ||
      BLOCKED_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      return false;
    }


    if (MANAGED_COLLECTION_KEYS.has(key)) {
      return target.replaceIndexedCollection(key, []);
    }


    if (hasOwn(target.state, key)) {
      delete target.state[key];
      target.dirty = true;
    }


    return true;
  }
});


export function resetGameState() {
  manager.resetFull();
}


export function resetCaseOutcomeState() {
  return manager.resetCaseOutcome();
}


export function resetReconstructedHeist() {
  manager.resetReconstructedHeist();
}


if (typeof window !== 'undefined') {
  const debugApi = Object.freeze({
    _message:
      'Read-only debug API. Use imported gameState in game code.',


    getState: () => manager.getState(),
    getDebugInfo: () => manager.getDebugInfo()
  });


  const descriptor = Object.getOwnPropertyDescriptor(
    window,
    'gameState'
  );


  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(window, 'gameState', {
      get: () => debugApi,
      configurable: false,
      enumerable: true
    });
  }
} 