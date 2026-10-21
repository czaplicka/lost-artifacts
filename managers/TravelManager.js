import { gameState } from '../GameData.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getEnergyManager } from './EnergyManager.js';
import {
  TRANSPORT_CONFIG,
  TRAVEL_ENCOUNTERS,
  TRAVEL_ENCOUNTER_CHANCE
} from '../TransportConfig.js';
import {
  getLocationByCity,
  getTravelDistance,
  isTransportAvailable,
  resolveLocationId
} from '../ui/LocationUI.js';
import {
  getScoreManager,
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity,
  clearTravelCluesForCity,
  enterCity,
  addSessionScore
} from './InvestigationManager.js';


function getRandomItem(items) {
  return Array.isArray(items) && items.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;
}


function getFreeTransfers() {
  return Math.max(0, Math.floor(Number(gameState.freeTransfers) || 0));
}


function hasFreeTransfer() {
  return getFreeTransfers() > 0;
}


function buildTravelLogEntry({
  idPrefix,
  type,
  source,
  amount,
  category,
  description,
  metadata = {}
}) {
  return {
    id: `${idPrefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    source,
    amount: Math.max(0, Math.floor(Number(amount) || 0)),
    category,
    description,
    missionId: gameState.currentMission?.id ?? null,
    createdAt: new Date().toISOString(),
    metadata: { ...metadata }
  };
}


export function getTransportConfig(type) {
  return TRANSPORT_CONFIG[type] || null;
}


export function calculateTravelValues(distance, type) {
  const config = getTransportConfig(type);


  if (!config) {
    throw new Error(`Unknown transport type: ${type}`);
  }


  const baseTravelHours = Math.max(
    config.minHours,
    Math.round(config.minHours + distance * config.hoursPerMapPixel)
  );


  return {
    baseTravelHours,
    moneySpent: Math.round(
      config.baseCost + baseTravelHours * config.costPerHour
    ),
    estimatedEnergyChange: -Math.max(
      2,
      Math.round(baseTravelHours * config.energyPerHour)
    )
  };
}


export function rollTravelEncounter(type) {
  return Math.random() < TRAVEL_ENCOUNTER_CHANCE
    ? structuredClone(
        getRandomItem(TRAVEL_ENCOUNTERS[type] || TRAVEL_ENCOUNTERS.plane)
      )
    : null;
}


export function spendAgencyBudget(amount, description, metadata = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const availableBudget = Math.max(0, Math.floor(gameState.agencyBudget || 0));
  const coveredByBudget = Math.min(availableBudget, safeAmount);
  const debtAdded = safeAmount - coveredByBudget;


  gameState.agencyBudget = availableBudget - coveredByBudget;
  gameState.agencyDebt = Math.max(0, Math.floor(gameState.agencyDebt || 0)) + debtAdded;


  if (!Array.isArray(gameState.moneyLog)) {
    gameState.moneyLog = [];
  }


  const expenseEntry = buildTravelLogEntry({
    idPrefix: 'travel',
    type: 'expense',
    source: 'agency',
    amount: safeAmount,
    category: 'travel',
    description,
    metadata: {
      ...metadata,
      coveredByBudget,
      debtAdded
    }
  });


  gameState.moneyLog.push(expenseEntry);


  let debtEntry = null;


  if (debtAdded > 0) {
    debtEntry = buildTravelLogEntry({
      idPrefix: 'agency_advance',
      type: 'debt',
      source: 'agency',
      amount: debtAdded,
      category: 'agency_advance',
      description: `Emergency advance for ${description}`,
      metadata: { ...metadata }
    });


    gameState.moneyLog.push(debtEntry);
  }


  requestAutosave();


  EventBus.emit('moneyChanged', {
    cash: gameState.cash,
    agencyBudget: gameState.agencyBudget,
    agencyDebt: gameState.agencyDebt,
    amount: safeAmount,
    category: 'travel',
    debtAdded,
    usedFreeTransfer: false
  });


  return {
    ok: true,
    usedFreeTransfer: false,
    amount: safeAmount,
    coveredByBudget,
    costFromCash: 0,
    costFromBudget: coveredByBudget,
    debtAdded,
    agencyBudget: gameState.agencyBudget,
    agencyDebt: gameState.agencyDebt,
    transaction: expenseEntry,
    debtTransaction: debtEntry
  };
}


export function consumeFreeTransfer(description, metadata = {}) {
  const freeTransfersBefore = getFreeTransfers();


  if (freeTransfersBefore <= 0) {
    return {
      ok: false,
      reason: 'no_free_transfers',
      freeTransfers: 0
    };
  }


  gameState.freeTransfers = freeTransfersBefore - 1;


  if (!Array.isArray(gameState.moneyLog)) {
    gameState.moneyLog = [];
  }


  const transaction = buildTravelLogEntry({
    idPrefix: 'travel_free',
    type: 'discount',
    source: 'bonus',
    amount: 0,
    category: 'travel',
    description,
    metadata: {
      ...metadata,
      usedFreeTransfer: true,
      freeTransfersBefore,
      freeTransfersAfter: gameState.freeTransfers
    }
  });


  gameState.moneyLog.push(transaction);


  requestAutosave();


  EventBus.emit('moneyChanged', {
    cash: gameState.cash,
    agencyBudget: gameState.agencyBudget,
    agencyDebt: gameState.agencyDebt,
    amount: 0,
    category: 'travel',
    debtAdded: 0,
    usedFreeTransfer: true,
    freeTransfers: gameState.freeTransfers
  });


  EventBus.emit('freeTransferUsed', {
    description,
    freeTransfersBefore,
    freeTransfersAfter: gameState.freeTransfers,
    transaction
  });


  return {
    ok: true,
    usedFreeTransfer: true,
    amount: 0,
    coveredByBudget: 0,
    costFromCash: 0,
    costFromBudget: 0,
    debtAdded: 0,
    freeTransfersBefore,
    freeTransfersAfter: gameState.freeTransfers,
    transaction
  };
}


export function payForTravel(amount, description, metadata = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));


  if (hasFreeTransfer()) {
    return consumeFreeTransfer(description, metadata);
  }


  return spendAgencyBudget(safeAmount, description, metadata);
}


export function getAvailableFreeTransfers() {
  return getFreeTransfers();
}


export function getTravelData(fromCityName, toCityName, locations, options = {}) {
  const transportType = options.transportType || 'plane';
  const config = getTransportConfig(transportType);


  if (!config) {
    throw new Error(`Unknown transport type: ${transportType}`);
  }


  const values = calculateTravelValues(
    getTravelDistance(fromCityName, toCityName, locations),
    transportType
  );


  const encounter =
    options.travelEncounter !== undefined
      ? options.travelEncounter
      : options.allowEncounter
        ? rollTravelEncounter(transportType)
        : null;


  const freeTransferAvailable = hasFreeTransfer();


  return {
    fromCity: fromCityName,
    toCity: toCityName,
    transportType,
    transportLabel: config.label,
    baseTravelHours: values.baseTravelHours,
    travelHours: values.baseTravelHours + (encounter?.timePenalty || 0),
    moneySpent: values.moneySpent,
    effectiveMoneySpent: freeTransferAvailable ? 0 : values.moneySpent,
    estimatedEnergyChange: values.estimatedEnergyChange,
    travelEncounter: encounter,
    freeTransferAvailable,
    travelLabel: encounter
      ? `${values.baseTravelHours}h + ${encounter.timePenalty}h`
      : `${values.baseTravelHours}h`
  };
}


export function getTravelHours(
  fromCityName,
  toCityName,
  locations,
  transportType = 'plane'
) {
  return getTravelData(fromCityName, toCityName, locations, {
    transportType
  }).travelHours;
}


export function getDestinationPreviewData(locations) {
  return (gameState.currentDestinations || []).map((location) => ({
    ...location,
    ...getTravelData(gameState.currentCity, location.city, locations, {
      transportType: 'plane'
    }),
    isCorrect:
      resolveLocationId(location, 'destination preview') ===
      gameState.nextTargetCityId
  }));
}


export function executeTravel({
  fromCityName,
  toCityName,
  locations,
  transportType = 'plane',
  allowEncounter = true,
  description = null,
  metadata = {}
}) {
  const fromLocation = getLocationByCity(fromCityName, locations);
  const toLocation = getLocationByCity(toCityName, locations);


  if (!fromLocation || !toLocation) {
    return {
      ok: false,
      reason: 'invalid_location',
      fromCityName,
      toCityName
    };
  }


  if (!isTransportAvailable(fromLocation, toLocation, transportType)) {
    return {
      ok: false,
      reason: 'transport_unavailable',
      fromCityName,
      toCityName,
      transportType
    };
  }


  const travelData = getTravelData(fromCityName, toCityName, locations, {
    transportType,
    allowEncounter
  });


  const paymentDescription =
    description ||
    `${travelData.transportLabel}: ${fromCityName} → ${toCityName}`;


  const paymentResult = payForTravel(
    travelData.moneySpent,
    paymentDescription,
    {
      ...metadata,
      fromCity: fromCityName,
      toCity: toCityName,
      transportType,
      baseTravelHours: travelData.baseTravelHours,
      travelHours: travelData.travelHours,
      encounterId: travelData.travelEncounter?.id ?? null
    }
  );


  if (!paymentResult.ok) {
    return {
      success: false,
      reason: paymentResult.reason || 'payment_failed',
      payment: paymentResult
    };
  }


  const energyManager = getEnergyManager();
  const energyResult = energyManager.consumeTravel(transportType);


  if (!energyResult?.success) {
    return {
      success: false,
      reason: energyResult?.reason || 'insufficient_energy',
      payment: paymentResult,
      energy: energyResult
    };
  }


  EventBus.emit('advanceTime', travelData.travelHours, 0);


  gameState.currentCity = toCityName;
  gameState.currentCityId =
    resolveLocationId(toLocation, 'travel destination') ?? gameState.currentCityId;


  requestAutosave();


  EventBus.emit('travelCompleted', {
    fromCity: fromCityName,
    toCity: toCityName,
    transportType,
    travelData,
    paymentResult,
    energyResult,
    usedFreeTransfer: paymentResult.usedFreeTransfer === true,
    freeTransfers: getFreeTransfers()
  });


  return {
    success: true,
    travelData,
    payment: paymentResult,
    energy: energyResult,
    usedFreeTransfer: paymentResult.usedFreeTransfer === true,
    freeTransfers: getFreeTransfers(),
    energyReachedZero: Boolean(energyResult.energyReachedZero)
  };
}


export function travelToCity(
  cityName,
  locations,
  transportType = 'plane'
) {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;


  const origin = getLocationByCity(previousCity, locations);
  const destination = getLocationByCity(cityName, locations);


  if (!origin || !destination) {
    throw new Error(
      'Origin or destination city data is missing.'
    );
  }


  const config = getTransportConfig(transportType);


  if (!config) {
    throw new Error(
      `Unknown transport type: ${transportType}`
    );
  }


  if (cityName === previousCity) {
    return {
      blocked: false,
      wasCorrect: false,
      transportType,
      transportLabel: config.label,
      travelHours: 0,
      baseTravelHours: 0,
      moneySpent: 0,
      effectiveMoneySpent: 0,
      agencyDebtAdded: 0,
      energyChange: 0,
      usedFreeTransfer: false,
      freeTransfersRemaining: getFreeTransfers(),
      travelEncounter: null,
      status: 'ALREADY_HERE',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: previousCityId,
      cityId: previousCityId,
      isCrimeSceneArrival:
        previousCityId === gameState.crimeCityId
    };
  }


  if (!isTransportAvailable(origin, destination, transportType)) {
    throw new Error(
      `${transportType} is unavailable for this route.`
    );
  }


  const destinationId = resolveLocationId(
    destination,
    'travelToCity'
  );


  const routeManager = getRouteManager();


  if (!routeManager) {
    throw new Error('Route manager is missing.');
  }


  const wasCorrect = routeManager.canEnterCity(destinationId);
  const isCrimeSceneArrival =
    destinationId === gameState.crimeCityId;


  const energyManager = getEnergyManager();
  const energyBefore = energyManager.getCurrentEnergy();


  const execution = executeTravel({
    fromCityName: previousCity,
    toCityName: cityName,
    locations,
    transportType,
    allowEncounter: true
  });


  if (!execution.success) {
    return {
      blocked: true,
      blockReason:
        execution.reason || 'travel_execution_failed',
      wasCorrect: false,
      transportType,
      transportLabel: config.label,
      travelHours: 0,
      baseTravelHours: 0,
      moneySpent: 0,
      effectiveMoneySpent: 0,
      agencyDebtAdded: 0,
      energyChange: 0,
      usedFreeTransfer: false,
      freeTransfersRemaining: getFreeTransfers(),
      travelEncounter: null,
      status: 'TRAVEL_BLOCKED',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationId,
      cityId: destinationId,
      isCrimeSceneArrival: false
    };
  }


  const energyAfter = energyManager.getCurrentEnergy();
  const energyChange = energyAfter - energyBefore;


  gameState.energy = energyAfter;


  const { travelData, payment } = execution;


  const travel = {
    transportType: travelData.transportType,
    transportLabel: travelData.transportLabel,
    travelHours: travelData.travelHours,
    baseTravelHours: travelData.baseTravelHours,
    moneySpent: Math.max(0, Number(payment.amount) || 0),
    effectiveMoneySpent: Math.max(0, Number(payment.amount) || 0),
    costFromCash: Math.max(0, Number(payment.costFromCash) || 0),
    costFromBudget: Math.max(0, Number(payment.costFromBudget) || 0),
    agencyDebtAdded: Math.max(0, Number(payment.debtAdded) || 0),
    usedFreeTransfer: Boolean(payment.usedFreeTransfer),
    freeTransfersRemaining: getFreeTransfers(),
    energyChange,
    travelEncounter: travelData.travelEncounter,
    travelLabel: travelData.travelLabel
  };


  const record = {
    from: previousCity,
    fromCityId: previousCityId,
    to: cityName,
    toCityId: destinationId,
    transportType: travel.transportType,
    transportLabel: travel.transportLabel,
    hours: travel.travelHours,
    baseHours: travel.baseTravelHours,
    moneySpent: travel.moneySpent,
    effectiveMoneySpent: travel.effectiveMoneySpent,
    costFromCash: travel.costFromCash,
    costFromBudget: travel.costFromBudget,
    energyChange,
    agencyDebtAdded: travel.agencyDebtAdded,
    usedFreeTransfer: travel.usedFreeTransfer,
    freeTransfersRemaining: travel.freeTransfersRemaining,
    wasCorrect,
    encounter: travel.travelEncounter,
    travelLabel: travel.travelLabel
  };


  gameState.lastTravel = record;
  gameState.lastTravelEncounter = travel.travelEncounter;
  gameState.addTravel(record);


  enterCity(cityName, locations);
  clearTravelCluesForCity(destinationId);


  const isFinalRouteCity =
    wasCorrect &&
    routeManager.isRoutePhase() &&
    routeManager.currentRouteIndex ===
      routeManager.route.length - 1;


  addSessionScore(
    wasCorrect ? 100 : -25,
    wasCorrect
      ? `Correct city: ${cityName}`
      : `False city: ${cityName}`
  );


  if (isFinalRouteCity) {
    routeManager.enterCity(destinationId);
    syncInvestigationState(locations);


    gameState.justReachedCorrectCityId = null;
    gameState.currentDestinations = [];
    gameState.activeLocations = [];


    saveGameState();


    return {
      blocked: false,
      wasCorrect: true,
      ...travel,
      energyReachedZero: Boolean(
        execution.energyReachedZero
      ),
      status: 'FINAL_SHOWDOWN',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationId,
      cityId: destinationId,
      isCrimeSceneArrival: false
    };
  }


  gameState.justReachedCorrectCityId =
    wasCorrect ? destinationId : null;


  syncInvestigationState(locations);


  gameState.currentDestinations =
    generateDestinationsForCurrentCity(locations);


  saveGameState();


  return {
    blocked: false,
    wasCorrect,
    ...travel,
    energyReachedZero: Boolean(
      execution.energyReachedZero
    ),
    status: wasCorrect
      ? isCrimeSceneArrival
        ? 'CRIME_SCENE_REACHED'
        : 'CORRECT_CITY_REACHED'
      : 'FALSE_LEAD',
    fromCity: previousCity,
    toCity: cityName,
    toCityId: destinationId,
    cityId: destinationId,
    isCrimeSceneArrival
  };
}