import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { EventBus } from './EventBus.js';
import { getEnergyManager } from './EnergyManager.js';
import { 
  TRANSPORT_CONFIG, 
  TRAVEL_ENCOUNTERS, 
  TRAVEL_ENCOUNTER_CHANCE 
} from './TransportConfig.js';
import { 
  getLocationByCity, 
  getTravelDistance, 
  isTransportAvailable, 
  resolveLocationId 
} from './ui/LocationUI.js';

function getRandomItem(items) {
  return Array.isArray(items) && items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

export function getTransportConfig(type) {
  return TRANSPORT_CONFIG[type] || null;
}

export function calculateTravelValues(distance, type) {
  const config = getTransportConfig(type);
  const baseTravelHours = Math.max(config.minHours, Math.round(config.minHours + distance * config.hoursPerMapPixel));
  return {
    baseTravelHours,
    moneySpent: Math.round(config.baseCost + baseTravelHours * config.costPerHour),
    estimatedEnergyChange: -Math.max(2, Math.round(baseTravelHours * config.energyPerHour))
  };
}

export function rollTravelEncounter(type) {
  return Math.random() < TRAVEL_ENCOUNTER_CHANCE 
    ? structuredClone(getRandomItem(TRAVEL_ENCOUNTERS[type] || TRAVEL_ENCOUNTERS.plane)) 
    : null;
}

export function spendAgencyBudget(amount, description, metadata = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const availableBudget = Math.max(0, Math.floor(gameState.agencyBudget || 0));
  const coveredByBudget = Math.min(availableBudget, safeAmount);
  const debtAdded = safeAmount - coveredByBudget;

  gameState.agencyBudget = availableBudget - coveredByBudget;
  gameState.agencyDebt = Math.max(0, Math.floor(gameState.agencyDebt || 0)) + debtAdded;

  if (!Array.isArray(gameState.moneyLog)) gameState.moneyLog = [];
  const timestamp = new Date().toISOString();

  gameState.moneyLog.push({
    id: `travel_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: 'expense', source: 'agency', amount: safeAmount, category: 'travel', description,
    missionId: gameState.currentMission?.id ?? null, createdAt: timestamp,
    metadata: { ...metadata, coveredByBudget, debtAdded }
  });

  if (debtAdded > 0) {
    gameState.moneyLog.push({
      id: `agency_advance_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type: 'debt', source: 'agency', amount: debtAdded, category: 'agency_advance',
      description: `Emergency advance for ${description}`, missionId: gameState.currentMission?.id ?? null,
      createdAt: timestamp, metadata: { ...metadata }
    });
  }

  EventBus.emit('moneyChanged', {
    cash: gameState.cash,
    agencyBudget: gameState.agencyBudget,
    agencyDebt: gameState.agencyDebt,
    amount: safeAmount,
    category: 'travel',
    debtAdded
  });

  return { amount: safeAmount, coveredByBudget, debtAdded, agencyBudget: gameState.agencyBudget, agencyDebt: gameState.agencyDebt };
}

export function getTravelData(fromCityName, toCityName, locations, options = {}) {
  const transportType = options.transportType || 'plane';
  const config = getTransportConfig(transportType);
  if (!config) throw new Error(`Unknown transport type: ${transportType}`);

  const values = calculateTravelValues(getTravelDistance(fromCityName, toCityName, locations), transportType);
  const encounter = options.travelEncounter !== undefined 
    ? options.travelEncounter 
    : options.allowEncounter ? rollTravelEncounter(transportType) : null;

  return {
    fromCity: fromCityName, toCity: toCityName, transportType, transportLabel: config.label,
    baseTravelHours: values.baseTravelHours, travelHours: values.baseTravelHours + (encounter?.timePenalty || 0),
    moneySpent: values.moneySpent, estimatedEnergyChange: values.estimatedEnergyChange,
    travelEncounter: encounter,
    travelLabel: encounter ? `${values.baseTravelHours}h + ${encounter.timePenalty}h` : `${values.baseTravelHours}h`
  };
}

export function getTravelHours(fromCityName, toCityName, locations, transportType = 'plane') {
  return getTravelData(fromCityName, toCityName, locations, { transportType }).travelHours;
}

export function getDestinationPreviewData(locations) {
  return (gameState.currentDestinations || []).map(location => ({
    ...location,
    ...getTravelData(gameState.currentCity, location.city, locations, { transportType: 'plane' }),
    isCorrect: resolveLocationId(location, 'destination preview') === gameState.nextTargetCityId
  }));
}