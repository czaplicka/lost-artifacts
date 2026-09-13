// UnifiedTravelManager.js
// ============================================================
// Singleton manager wszystkich aspektów podróży
// - Reguły transportu (czas, koszt, energia)
// - Konsumpcja energii
// - Historia podróży
// - Encounter'y
// - Budżet agencji
// ============================================================

import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import { getEnergyManager } from './EnergyManager.js';
import { saveGameState } from './GameStatePersistence.js';

export const TRANSPORT_TYPES = Object.freeze({
  PLANE: 'plane',
  TRAIN: 'train',
  BUS: 'bus',
  SHIP: 'ship',
  TAXI: 'taxi',
  CHEAP_FLIGHT: 'cheap_flight',
  EXPENSIVE_FLIGHT: 'expensive_flight'
});

// Wszystkie reguły transportu w jednym miejscu
export const TRANSPORT_RULES = Object.freeze({
  [TRANSPORT_TYPES.PLANE]: {
    id: 'plane',
    label: 'Plane',
    minTravelHours: 2,
    hoursPerMapPixel: 0.012,
    baseCost: 130,
    costPerHour: 35,
    energyPerHour: 0.7,
    encounterChance: 0.18
  },
  [TRANSPORT_TYPES.TRAIN]: {
    id: 'train',
    label: 'Train',
    minTravelHours: 3,
    hoursPerMapPixel: 0.045,
    baseCost: 35,
    costPerHour: 15,
    energyPerHour: 1.15,
    encounterChance: 0.18
  },
  [TRANSPORT_TYPES.BUS]: {
    id: 'bus',
    label: 'Bus',
    minTravelHours: 4,
    hoursPerMapPixel: 0.06,
    baseCost: 18,
    costPerHour: 9,
    energyPerHour: 1.7,
    encounterChance: 0.18
  },
  [TRANSPORT_TYPES.SHIP]: {
    id: 'ship',
    label: 'Ship',
    minTravelHours: 6,
    hoursPerMapPixel: 0.03,
    baseCost: 45,
    costPerHour: 12,
    energyPerHour: 1.25,
    encounterChance: 0.18
  },
  [TRANSPORT_TYPES.TAXI]: {
    id: 'taxi',
    label: 'Taxi',
    minTravelHours: 0.5,
    hoursPerMapPixel: 0.002,
    baseCost: 25,
    costPerHour: 20,
    energyPerHour: 0.5,
    encounterChance: 0.05
  },
  [TRANSPORT_TYPES.CHEAP_FLIGHT]: {
    id: 'cheap_flight',
    label: 'Cheap Flight',
    minTravelHours: 3,
    hoursPerMapPixel: 0.015,
    baseCost: 80,
    costPerHour: 25,
    energyPerHour: 0.9,
    encounterChance: 0.22
  },
  [TRANSPORT_TYPES.EXPENSIVE_FLIGHT]: {
    id: 'expensive_flight',
    label: 'Expensive Flight',
    minTravelHours: 1,
    hoursPerMapPixel: 0.008,
    baseCost: 200,
    costPerHour: 50,
    energyPerHour: 0.4,
    encounterChance: 0.08
  }
});

// Encounter'y dla każdego transportu
export const TRAVEL_ENCOUNTERS = Object.freeze({
  [TRANSPORT_TYPES.PLANE]: [
    { id: 'storm', label: 'Storm front', timePenalty: 2, message: 'Heavy weather forces the pilot to slow the approach.' },
    { id: 'security_delay', label: 'Airport security delay', timePenalty: 1, message: 'A random security check slows everything down.' },
    { id: 'baggage_hold', label: 'Baggage hold-up', timePenalty: 1, message: 'Ground crew delays departure while cargo is rechecked.' },
    { id: 'reroute', label: 'Flight reroute', timePenalty: 3, message: 'Air traffic control redirects the plane around congestion.' }
  ],
  [TRANSPORT_TYPES.TRAIN]: [
    { id: 'signal_failure', label: 'Signal failure', timePenalty: 2, message: 'A stubborn signal refuses to appreciate the urgency of your case.' },
    { id: 'missed_connection', label: 'Missed connection', timePenalty: 2, message: 'The connecting train left precisely when you reached the platform.' },
    { id: 'rail_strike', label: 'Rail disruption', timePenalty: 3, message: 'A timetable is only a suggestion when the network disagrees.' },
    { id: 'suspicious_passenger', label: 'Suspicious passenger', timePenalty: 1, message: 'A passenger drops a suspiciously heavy suitcase in the wrong compartment.' }
  ],
  [TRANSPORT_TYPES.BUS]: [
    { id: 'traffic_jam', label: 'Traffic jam', timePenalty: 2, message: 'The road is full of people who did not plan around your investigation.' },
    { id: 'roadworks', label: 'Roadworks', timePenalty: 2, message: 'Cones and a worker with a shovel defeat modern transport.' },
    { id: 'wrong_turn', label: 'Wrong turn', timePenalty: 1, message: 'The driver insists this scenic detour was intentional.' },
    { id: 'chatty_driver', label: 'Chatty driver', timePenalty: 1, message: 'The driver has several strong opinions about your case.' }
  ],
  [TRANSPORT_TYPES.SHIP]: [
    { id: 'rough_seas', label: 'Rough seas', timePenalty: 3, message: 'The sea turns the journey into an unwanted balancing exercise.' },
    { id: 'customs_search', label: 'Customs inspection', timePenalty: 2, message: 'Customs officers become interested in every suitcase on board.' },
    { id: 'engine_trouble', label: 'Engine trouble', timePenalty: 3, message: 'The engine makes a noise best described as expensive.' },
    { id: 'port_delay', label: 'Port delay', timePenalty: 2, message: 'The harbor has misplaced a permit, a tugboat or both.' }
  ],
  [TRANSPORT_TYPES.TAXI]: [
    { id: 'traffic', label: 'Heavy traffic', timePenalty: 1, message: 'The city streets are packed today.' },
    { id: 'lost_driver', label: 'Lost driver', timePenalty: 2, message: 'GPS and common sense have parted ways.' }
  ],
  [TRANSPORT_TYPES.CHEAP_FLIGHT]: [
    { id: 'overbooking', label: 'Overbooking chaos', timePenalty: 2, message: 'The airline decided everyone should board simultaneously.' },
    { id: 'mechanical_issue', label: 'Mechanical issue', timePenalty: 3, message: 'The mechanic found "something concerning" that needs inspection.' }
  ],
  [TRANSPORT_TYPES.EXPENSIVE_FLIGHT]: [
    { id: 'minor_delay', label: 'Minor delay', timePenalty: 1, message: 'Luxury service includes a brief coffee service delay.' }
  ]
});

function cloneData(data) {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
}

function getRandomItem(items) {
  return Array.isArray(items) && items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

class UnifiedTravelManager {
  constructor() {
    this.transportConfig = cloneData(TRANSPORT_RULES);
    this.encountersConfig = cloneData(TRAVEL_ENCOUNTERS);
    this.travelHistory = [];
    this.lastTravelData = null;
    this.isInitialized = false;
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.restore(gameState.getState());
    EventBus.emit('travelManagerInitialized');
  }

  // ============================================================
  // TRANSPORT CONFIGURATION
  // ============================================================

  getTransportRule(transportType) {
    const rule = this.transportConfig[transportType];
    if (!rule) {
      console.warn(`[UnifiedTravelManager] Unknown transport type: ${transportType}. Defaulting to plane.`);
      return this.transportConfig[TRANSPORT_TYPES.PLANE];
    }
    return rule;
  }

  isTransportAvailable(transportType) {
    return transportType in this.transportConfig;
  }

  getAllTransportTypes() {
    return Object.keys(this.transportConfig);
  }

  // ============================================================
  // TRAVEL CALCULATION
  // ============================================================

  /**
   * Oblicza parametry podróży między dwoma miastami
   * @param {string} fromCity - nazwa miasta startowego
   * @param {string} toCity - nazwa miasta docelowego
   * @param {number} distance - dystans w pikselach mapy
   * @param {string} transportType - typ transportu (default: plane)
   * @param {Object} options - opcje (allowEncounter, travelEncounter)
   * @returns {Object} dane podróży
   */
  calculateTravel(fromCity, toCity, distance, transportType = TRANSPORT_TYPES.PLANE, options = {}) {
    const rule = this.getTransportRule(transportType);
    const energyManager = getEnergyManager();

    // Czas podróży
    const baseTravelHours = Math.max(
      rule.minTravelHours,
      Math.round(rule.minTravelHours + distance * rule.hoursPerMapPixel)
    );

    // Encounter
    const encounter = options.travelEncounter !== undefined
      ? options.travelEncounter
      : (options.allowEncounter && Math.random() < rule.encounterChance)
        ? cloneData(getRandomItem(this.encountersConfig[transportType]))
        : null;

    const totalTravelHours = baseTravelHours + (encounter?.timePenalty || 0);

    // Koszt pieniędzy
    const moneyCost = Math.round(rule.baseCost + baseTravelHours * rule.costPerHour);

    // Koszt energii (przed skalowaniem)
    const baseEnergyCost = Math.max(2, Math.round(baseTravelHours * rule.energyPerHour));
    const scaledEnergyCost = energyManager.scaleCost(baseEnergyCost);

    return {
      fromCity,
      toCity,
      transportType,
      transportLabel: rule.label,
      baseTravelHours,
      totalTravelHours,
      travelEncounter: encounter,
      travelLabel: encounter ? `${baseTravelHours}h + ${encounter.timePenalty}h (delay)` : `${baseTravelHours}h`,
      moneyCost,
      energyCost: scaledEnergyCost,
      baseEnergyCost,
      distance
    };
  }

  // ============================================================
  // TRAVEL EXECUTION
  // ============================================================

  /**
   * Wykonuje podróż: koszt energii, pieniędzy, czas gry, historia
   * @param {Object} travelData - wynik calculateTravel()
   * @returns {Object} rezultat wykonania podróży
   */
  executeTravel(travelData) {
    if (!travelData || typeof travelData !== 'object') {
      return { success: false, reason: 'invalid_travel_data' };
    }

    const energyManager = getEnergyManager();
    const currentEnergy = energyManager.getCurrentEnergy();

    // Sprawdzenie energii
    if (currentEnergy < travelData.energyCost) {
      EventBus.emit('travelFailed', {
        reason: 'insufficient_energy',
        required: travelData.energyCost,
        current: currentEnergy
      });
      return { success: false, reason: 'insufficient_energy' };
    }

    // Sprawdzenie budżetu agencji
    const state = gameState.getState();
    const totalBudget = (state.agencyBudget || 0) + (state.cash || 0);
    if (totalBudget < travelData.moneyCost) {
      EventBus.emit('travelFailed', {
        reason: 'insufficient_money',
        required: travelData.moneyCost,
        available: totalBudget
      });
      return { success: false, reason: 'insufficient_money' };
    }

    // Konsumpcja energii
    const energyResult = energyManager.consumeCustom(
      travelData.energyCost,
      `Travel ${travelData.transportLabel} (${travelData.fromCity} → ${travelData.toCity}): -${travelData.energyCost}`
    );

    if (!energyResult.success) {
      return { success: false, reason: 'energy_consumption_failed' };
    }

    // Konsumpcja pieniędzy (budżet agencji + dług jeśli potrzeba)
    const cashAvailable = Math.max(0, Math.floor(state.cash || 0));
    const budgetAvailable = Math.max(0, Math.floor(state.agencyBudget || 0));
    const costFromCash = Math.min(cashAvailable, travelData.moneyCost);
    const costFromBudget = Math.min(budgetAvailable, travelData.moneyCost - costFromCash);
    const debtAdded = Math.max(0, travelData.moneyCost - costFromCash - costFromBudget);

    gameState.updateState({
      cash: cashAvailable - costFromCash,
      agencyBudget: budgetAvailable - costFromBudget,
      agencyDebt: (state.agencyDebt || 0) + debtAdded
    });

    // Advance time gry
    EventBus.emit('advanceTime', travelData.totalTravelHours, 0);

    // Historia
    const travelRecord = {
      id: `travel_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      fromCity: travelData.fromCity,
      toCity: travelData.toCity,
      transportType: travelData.transportType,
      travelHours: travelData.totalTravelHours,
      energyCost: travelData.energyCost,
      moneyCost: travelData.moneyCost,
      encounter: travelData.travelEncounter,
      timestamp: Date.now(),
      missionId: state.currentMission?.id || null
    };

    this.travelHistory.push(cloneData(travelRecord));
    this.lastTravelData = cloneData(travelData);

    gameState.updateState({
      travelHistory: this.travelHistory,
      lastTravel: travelRecord
    });

    saveGameState();

    // Events
    EventBus.emit('travelCompleted', {
      success: true,
      travelData,
      travelRecord,
      encounter: travelData.travelEncounter
    });

    if (travelData.travelEncounter) {
      EventBus.emit('travelEncounter', travelData.travelEncounter);
    }

    return {
      success: true,
      travelRecord,
      encounter: travelData.travelEncounter
    };
  }

  // ============================================================
  // CONVENIENCE METHODS
  // ============================================================

  /**
   * Szybka podróż: calculate + execute w jednym
   */
  travelTo(fromCity, toCity, distance, transportType = TRANSPORT_TYPES.PLANE, options = {}) {
    const travelData = this.calculateTravel(fromCity, toCity, distance, transportType, options);
    return this.executeTravel(travelData);
  }

  /**
   * Sprawdzenie czy gracz może lecieć danym transportem (energia + budżet)
   */
  canTravelWith(transportType, distance = 1000) {
    const rule = this.getTransportRule(transportType);
    const energyManager = getEnergyManager();
    const state = gameState.getState();

    const baseTravelHours = Math.max(rule.minTravelHours, rule.minTravelHours + distance * rule.hoursPerMapPixel);
    const baseEnergyCost = Math.max(2, Math.round(baseTravelHours * rule.energyPerHour));
    const scaledEnergyCost = energyManager.scaleCost(baseEnergyCost);
    const moneyCost = Math.round(rule.baseCost + baseTravelHours * rule.costPerHour);

    const hasEnergy = energyManager.getCurrentEnergy() >= scaledEnergyCost;
    const hasMoneyAndBudget = (state.cash || 0) + (state.agencyBudget || 0) >= moneyCost;

    return { hasEnergy, hasMoneyAndBudget, energyRequired: scaledEnergyCost, moneyRequired: moneyCost };
  }

  // ============================================================
  // HISTORY & STATE
  // ============================================================

  getTravelHistory() {
    return cloneData(this.travelHistory);
  }

  getLastTravel() {
    return this.lastTravelData ? cloneData(this.lastTravelData) : null;
  }

  clearTravelHistory() {
    this.travelHistory = [];
    gameState.updateState({ travelHistory: [] });
  }

  // ============================================================
  // SERIALIZATION
  // ============================================================

  serialize() {
    return {
      travelHistory: cloneData(this.travelHistory),
      lastTravelData: this.lastTravelData ? cloneData(this.lastTravelData) : null
    };
  }

  restore(data = {}) {
    if (Array.isArray(data.travelHistory)) {
      this.travelHistory = cloneData(data.travelHistory).slice(-50);
    } else {
      this.travelHistory = [];
    }

    if (data.lastTravel) {
      this.lastTravelData = cloneData(data.lastTravel);
    }
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