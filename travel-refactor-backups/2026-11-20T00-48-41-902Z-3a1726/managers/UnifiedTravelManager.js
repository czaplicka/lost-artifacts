import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';

function cloneData(data) {
  if (data === undefined || data === null) {
    return data;
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data));
}

/**
 * Warstwa zgodności dla istniejącego gameSetup.js.
 *
 * Podróże wykonuje managers/TravelManager.js.
 * Ten moduł nie jest już silnikiem podróży.
 */
class UnifiedTravelManager {
  constructor() {
    this.isInitialized = false;
    this.costLedger = [];
    this.lastTravelData = null;
  }

  init() {
    if (this.isInitialized) {
      return;
    }

    const state = gameState.getState();

    const savedState =
      state.unifiedTravelManagerState &&
      typeof state.unifiedTravelManagerState === 'object'
        ? state.unifiedTravelManagerState
        : state;

    this.restore(savedState);
    this.isInitialized = true;

    EventBus.emit('travelManagerInitialized');
  }

  getCostLedger() {
    return cloneData(this.costLedger);
  }

  getLastTravel() {
    return cloneData(this.lastTravelData);
  }

  clearCostLedger() {
    this.costLedger = [];
    gameState.costLedger = [];
  }

  serialize() {
    return {
      costLedger: cloneData(this.costLedger),
      lastTravelData: cloneData(this.lastTravelData)
    };
  }

  restore(data = {}) {
    this.costLedger = Array.isArray(data.costLedger)
      ? cloneData(data.costLedger).slice(-50)
      : [];

    this.lastTravelData = data.lastTravelData
      ? cloneData(data.lastTravelData)
      : null;
  }
}

let travelManagerInstance = null;

export function getUnifiedTravelManager() {
  if (!travelManagerInstance) {
    travelManagerInstance = new UnifiedTravelManager();
  }

  return travelManagerInstance;
}

export function createUnifiedTravelManager() {
  travelManagerInstance = new UnifiedTravelManager();

  return travelManagerInstance;
}

export default UnifiedTravelManager;