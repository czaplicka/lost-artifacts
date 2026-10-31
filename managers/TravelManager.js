import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getEnergyManager } from './EnergyManager.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { TRANSPORT_CONFIG, TRAVEL_ENCOUNTERS, TRAVEL_ENCOUNTER_CHANCE } from '../TransportConfig.js';
import { getLocationByCity, getTravelDistance, isTransportAvailable, resolveLocationId } from '../ui/LocationUI.js';
import {
  getRouteManager, syncInvestigationState, generateDestinationsForCurrentCity,
  enterCity, addSessionScore
} from './InvestigationManager.js';
import { getTicketTravelBlock } from './TicketAnalysisService.js';
import { classifyPursuitArrival } from './PursuitCityContext.js';

let travelExecutionInProgress = false;
function getRandomItem(items) { return Array.isArray(items) && items.length ? items[Math.floor(Math.random() * items.length)] : null; }
function getFreeTransfers() { return Math.max(0, Math.floor(Number(gameState.freeTransfers) || 0)); }
function hasFreeTransfer() { return getFreeTransfers() > 0; }
function requestTravelAutosave() { if (!gameState.caseFailed) requestAutosave(); }
function capturePaymentState() {
  return { ...moneyManager.getBalances(), freeTransfers: gameState.freeTransfers, moneyLog: [...gameState.moneyLog] };
}
function restorePaymentState(snapshot) {
  gameState.cash = snapshot.cash; gameState.agencyBudget = snapshot.agencyBudget;
  gameState.agencyDebt = snapshot.agencyDebt; gameState.freeTransfers = snapshot.freeTransfers; gameState.moneyLog = snapshot.moneyLog;
}
function publishPayment(result, description) {
  moneyManager.persist(result.usedFreeTransfer ? 'travel_free_transfer_used' : 'travel_paid', result.transaction);
  EventBus.emit('moneyChanged', {
    ...moneyManager.getBalances(), amount: result.amount, category: ECONOMY_CATEGORY.TRAVEL,
    debtAdded: result.debtAdded, usedFreeTransfer: result.usedFreeTransfer, freeTransfers: getFreeTransfers()
  });
  if (result.usedFreeTransfer) EventBus.emit('freeTransferUsed', {
    description, freeTransfersBefore: result.freeTransfersBefore,
    freeTransfersAfter: result.freeTransfersAfter, transaction: result.transaction
  });
}
function prepareAgencyPayment(amount, description, metadata = {}) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const balances = moneyManager.getBalances();
  const coveredByBudget = Math.min(balances.agencyBudget, safeAmount), debtAdded = safeAmount - coveredByBudget;
  gameState.agencyBudget = balances.agencyBudget - coveredByBudget;
  gameState.agencyDebt = balances.agencyDebt + debtAdded;
  const transaction = moneyManager.addLogEntry({ type: 'expense', source: MONEY_SOURCE.AGENCY, amount: safeAmount,
    category: ECONOMY_CATEGORY.TRAVEL, description, metadata: { ...metadata, coveredByBudget, debtAdded } });
  let debtTransaction = null;
  if (debtAdded > 0) debtTransaction = moneyManager.addLogEntry({ type: 'debt', source: MONEY_SOURCE.AGENCY,
    amount: debtAdded, category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
    description: `Emergency advance for ${description}`, metadata: { ...metadata } });
  return { ok: true, usedFreeTransfer: false, amount: safeAmount, coveredByBudget, costFromCash: 0,
    costFromBudget: coveredByBudget, debtAdded, agencyBudget: gameState.agencyBudget,
    agencyDebt: gameState.agencyDebt, transaction, debtTransaction };
}
function prepareFreeTransfer(description, metadata = {}) {
  const freeTransfersBefore = getFreeTransfers();
  if (freeTransfersBefore <= 0) return { ok: false, reason: 'no_free_transfers', freeTransfers: 0 };
  gameState.freeTransfers = freeTransfersBefore - 1;
  const transaction = moneyManager.addLogEntry({ type: 'discount', source: 'bonus', amount: 0,
    category: ECONOMY_CATEGORY.TRAVEL, description, metadata: { ...metadata, usedFreeTransfer: true,
      freeTransfersBefore, freeTransfersAfter: gameState.freeTransfers } });
  return { ok: true, usedFreeTransfer: true, amount: 0, coveredByBudget: 0, costFromCash: 0,
    costFromBudget: 0, debtAdded: 0, freeTransfersBefore, freeTransfersAfter: gameState.freeTransfers, transaction };
}
function prepareTravelPayment(amount, description, metadata = {}) {
  return hasFreeTransfer() ? prepareFreeTransfer(description, metadata) : prepareAgencyPayment(amount, description, metadata);
}
function runStandalonePayment(prepare, description) {
  const snapshot = capturePaymentState(); let result;
  try {
    result = prepare();
    if (!result.ok) { restorePaymentState(snapshot); return result; }
  } catch (error) { restorePaymentState(snapshot); throw error; }
  publishPayment(result, description); return result;
}
export function getTransportConfig(type) { return TRANSPORT_CONFIG[type] || null; }
export function calculateTravelValues(distance, type) {
  const config = getTransportConfig(type);
  if (!config) throw new Error(`Unknown transport type: ${type}`);
  const baseTravelHours = Math.max(config.minHours, Math.round(config.minHours + distance * config.hoursPerMapPixel));
  return { baseTravelHours, moneySpent: Math.round(config.baseCost + baseTravelHours * config.costPerHour),
    estimatedEnergyChange: -Math.max(2, Math.round(baseTravelHours * config.energyPerHour)) };
}
export function rollTravelEncounter(type) {
  if (Math.random() >= TRAVEL_ENCOUNTER_CHANCE) return null;
  const encounter = getRandomItem(TRAVEL_ENCOUNTERS[type] || TRAVEL_ENCOUNTERS.plane);
  return encounter ? structuredClone(encounter) : null;
}
export function spendAgencyBudget(amount, description, metadata = {}) {
  return runStandalonePayment(() => prepareAgencyPayment(amount, description, metadata), description);
}
export function consumeFreeTransfer(description, metadata = {}) {
  return runStandalonePayment(() => prepareFreeTransfer(description, metadata), description);
}
export function payForTravel(amount, description, metadata = {}) {
  return runStandalonePayment(() => prepareTravelPayment(amount, description, metadata), description);
}
export function getAvailableFreeTransfers() { return getFreeTransfers(); }
export function getTravelData(fromCityName, toCityName, locations, options = {}) {
  const transportType = options.transportType || 'plane', config = getTransportConfig(transportType);
  if (!config) throw new Error(`Unknown transport type: ${transportType}`);
  const values = calculateTravelValues(getTravelDistance(fromCityName, toCityName, locations), transportType);
  const encounter = options.travelEncounter !== undefined ? options.travelEncounter
    : options.allowEncounter ? rollTravelEncounter(transportType) : null;
  const freeTransferAvailable = hasFreeTransfer();
  return { fromCity: fromCityName, toCity: toCityName, transportType, transportLabel: config.label,
    baseTravelHours: values.baseTravelHours, travelHours: values.baseTravelHours + (encounter?.timePenalty || 0),
    moneySpent: values.moneySpent, effectiveMoneySpent: freeTransferAvailable ? 0 : values.moneySpent,
    estimatedEnergyChange: values.estimatedEnergyChange, travelEncounter: encounter, freeTransferAvailable,
    travelLabel: encounter ? `${values.baseTravelHours}h + ${encounter.timePenalty}h` : `${values.baseTravelHours}h` };
}
export function getTravelHours(fromCityName, toCityName, locations, transportType = 'plane') {
  return getTravelData(fromCityName, toCityName, locations, { transportType }).travelHours;
}
export function getDestinationPreviewData(locations) {
  getRouteManager();
  return (gameState.currentDestinations || []).map(location => {
    const arrivalKind = classifyPursuitArrival(gameState, resolveLocationId(location, 'destination preview'));
    return { ...location,
      ...getTravelData(gameState.currentCity, location.city, locations, { transportType: 'plane' }),
      arrivalKind, isCorrect: ['NEXT_ROUTE_CITY', 'CRIME_CITY', 'RETURN_VISIT'].includes(arrivalKind)
    };
  });
}
export function executeTravel({ fromCityName, toCityName, locations, transportType = 'plane', allowEncounter = true, description = null, metadata = {} }) {
  if (travelExecutionInProgress) return { success: false, reason: 'travel_in_progress' };
  travelExecutionInProgress = true;
  try {
    const fromLocation = getLocationByCity(fromCityName, locations), toLocation = getLocationByCity(toCityName, locations);
    if (!fromLocation || !toLocation) return { ok: false, success: false, reason: 'invalid_location', fromCityName, toCityName };
    const destinationId = resolveLocationId(toLocation, 'travel destination');
    const ticketBlock = getTicketTravelBlock(destinationId);
    if (ticketBlock) {
      if (ticketBlock === 'ticket_analysis_required') EventBus.emit('showDialogue', {
        speaker: 'Detective', text: 'The damaged ticket needs a lab analysis before I can follow the thief.'
      });
      return { ok: false, success: false, reason: ticketBlock, payment: null, energy: null };
    }
    if (!isTransportAvailable(fromLocation, toLocation, transportType)) {
      return { ok: false, success: false, reason: 'transport_unavailable', fromCityName, toCityName, transportType };
    }
    const energyManager = getEnergyManager(), energyCost = energyManager.getTravelCost(transportType);
    const affordability = energyManager.canAfford(energyCost);
    if (!affordability.ok) return { success: false, reason: affordability.reason || 'insufficient_energy', payment: null,
      energy: { success: false, ...affordability, cost: energyCost, message: energyManager.getInsufficientEnergyMessage(energyCost) } };
    const travelData = getTravelData(fromCityName, toCityName, locations, { transportType, allowEncounter });
    const paymentDescription = description || `${travelData.transportLabel}: ${fromCityName} → ${toCityName}`;
    const snapshot = capturePaymentState(); let payment;
    try {
      payment = prepareTravelPayment(travelData.moneySpent, paymentDescription, { ...metadata,
        fromCity: fromCityName, toCity: toCityName, transportType, baseTravelHours: travelData.baseTravelHours,
        travelHours: travelData.travelHours, encounterId: travelData.travelEncounter?.id ?? null });
      if (!payment.ok) { restorePaymentState(snapshot); return { success: false, reason: payment.reason || 'payment_failed', payment }; }
    } catch (error) {
      restorePaymentState(snapshot); console.error('[TravelManager] Payment preparation failed:', error);
      return { success: false, reason: 'payment_failed', payment: null };
    }
    const energy = energyManager.consumeCustom(energyCost, `Travel (${transportType}): -${energyCost}`, {
      requireFullAmount: true, activityType: `travel_${transportType}`
    });
    if (!energy?.success) { restorePaymentState(snapshot); return { success: false, reason: energy?.reason || 'insufficient_energy', payment: null, energy }; }
    publishPayment(payment, paymentDescription);
    EventBus.emit('advanceTime', travelData.travelHours, 0);
    gameState.currentCity = toCityName; gameState.currentCityId = destinationId ?? gameState.currentCityId;
    requestTravelAutosave();
    EventBus.emit('travelCompleted', { fromCity: fromCityName, toCity: toCityName, transportType,
      travelData, paymentResult: payment, energyResult: energy, usedFreeTransfer: payment.usedFreeTransfer === true, freeTransfers: getFreeTransfers() });
    return { success: true, travelData, payment, energy, usedFreeTransfer: payment.usedFreeTransfer === true,
      freeTransfers: getFreeTransfers(), energyReachedZero: Boolean(energy.energyReachedZero) };
  } finally { travelExecutionInProgress = false; }
}
export function travelToCity(cityName, locations, transportType = 'plane') {
  const previousCity = gameState.currentCity, previousCityId = gameState.currentCityId;
  const origin = getLocationByCity(previousCity, locations), destination = getLocationByCity(cityName, locations);
  if (!origin || !destination) throw new Error('Origin or destination city data is missing.');
  const config = getTransportConfig(transportType);
  if (!config) throw new Error(`Unknown transport type: ${transportType}`);
  if (cityName === previousCity) return {
    blocked: false, wasCorrect: false, transportType, transportLabel: config.label,
    travelHours: 0, baseTravelHours: 0, moneySpent: 0, effectiveMoneySpent: 0, agencyDebtAdded: 0,
    energyChange: 0, usedFreeTransfer: false, freeTransfersRemaining: getFreeTransfers(),
    travelEncounter: null, status: 'ALREADY_HERE', fromCity: previousCity, toCity: cityName,
    toCityId: previousCityId, cityId: previousCityId, isCrimeSceneArrival: previousCityId === gameState.crimeCityId
  };
  if (!isTransportAvailable(origin, destination, transportType)) throw new Error(`${transportType} is unavailable for this route.`);
  const destinationId = resolveLocationId(destination, 'travelToCity');
  const manager = getRouteManager();
  if (!manager) throw new Error('Route manager is missing.');
  const arrivalKind = classifyPursuitArrival(gameState, destinationId);
  const shouldAdvance = arrivalKind === 'NEXT_ROUTE_CITY' && manager.isRoutePhase() && manager.canEnterCity(destinationId);
  const wasCorrect = ['NEXT_ROUTE_CITY', 'RETURN_VISIT', 'CRIME_CITY'].includes(arrivalKind);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;
  const energyManager = getEnergyManager(), before = energyManager.getCurrentEnergy();
  const execution = executeTravel({ fromCityName: previousCity, toCityName: cityName, locations, transportType, allowEncounter: true });
  if (!execution.success) return {
    blocked: true, blockReason: execution.reason || 'travel_execution_failed', wasCorrect: false,
    transportType, transportLabel: config.label, travelHours: 0, baseTravelHours: 0, moneySpent: 0,
    effectiveMoneySpent: 0, agencyDebtAdded: 0, energyChange: 0, usedFreeTransfer: false,
    freeTransfersRemaining: getFreeTransfers(), travelEncounter: null, status: 'TRAVEL_BLOCKED',
    fromCity: previousCity, toCity: cityName, toCityId: destinationId, cityId: destinationId,
    isCrimeSceneArrival: false, energy: execution.energy ?? null
  };
  const after = energyManager.getCurrentEnergy(), energyChange = after - before;
  gameState.energy = after;
  const { travelData, payment } = execution;
  const travel = {
    transportType: travelData.transportType, transportLabel: travelData.transportLabel,
    travelHours: travelData.travelHours, baseTravelHours: travelData.baseTravelHours,
    moneySpent: Math.max(0, Number(payment.amount) || 0), effectiveMoneySpent: Math.max(0, Number(payment.amount) || 0),
    costFromCash: Math.max(0, Number(payment.costFromCash) || 0), costFromBudget: Math.max(0, Number(payment.costFromBudget) || 0),
    agencyDebtAdded: Math.max(0, Number(payment.debtAdded) || 0), usedFreeTransfer: Boolean(payment.usedFreeTransfer),
    freeTransfersRemaining: getFreeTransfers(), energyChange, travelEncounter: travelData.travelEncounter, travelLabel: travelData.travelLabel
  };
  enterCity(cityName, locations);
  const arrival = shouldAdvance ? manager.enterCity(destinationId) : null;
  const advancedRoute = Boolean(arrival?.ok);
  const isFinal = Boolean(advancedRoute && manager.isComplete());
  const record = {
    from: previousCity, fromCityId: previousCityId, to: cityName, toCityId: destinationId,
    transportType: travel.transportType, transportLabel: travel.transportLabel,
    hours: travel.travelHours, baseHours: travel.baseTravelHours, moneySpent: travel.moneySpent,
    effectiveMoneySpent: travel.effectiveMoneySpent, costFromCash: travel.costFromCash,
    costFromBudget: travel.costFromBudget, energyChange, agencyDebtAdded: travel.agencyDebtAdded,
    usedFreeTransfer: travel.usedFreeTransfer, freeTransfersRemaining: travel.freeTransfersRemaining,
    wasCorrect, arrivalKind, advancedRoute, encounter: travel.travelEncounter, travelLabel: travel.travelLabel
  };
  gameState.lastTravel = record; gameState.lastTravelEncounter = travel.travelEncounter; gameState.addTravel(record);
  // Points are awarded only for a newly accepted pursuit stop, never a revisit.
  if (advancedRoute) addSessionScore(100, `Correct city: ${cityName}`);
  else if (arrivalKind === 'FALSE_LEAD') addSessionScore(-25, `False city: ${cityName}`);
  gameState.justReachedCorrectCityId = advancedRoute ? destinationId : null;
  syncInvestigationState(locations);
  if (isFinal) {
    gameState.currentDestinations = []; gameState.activeLocations = [];
  } else {
    gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  }
  requestTravelAutosave();
  const status = isFinal ? 'FINAL_SHOWDOWN'
    : isCrimeSceneArrival ? 'CRIME_SCENE_REACHED'
    : advancedRoute ? 'CORRECT_CITY_REACHED'
    : arrivalKind;
  return { blocked: false, wasCorrect, ...travel, arrivalKind, advancedRoute,
    energyReachedZero: Boolean(execution.energyReachedZero), status,
    fromCity: previousCity, toCity: cityName, toCityId: destinationId, cityId: destinationId, isCrimeSceneArrival };
}
