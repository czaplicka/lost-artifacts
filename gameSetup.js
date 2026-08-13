import { gameState, resetGameState, resetCaseOutcomeState, clearSavedGame, saveGameState } from './GameData.js';
import { ScoreManager } from './ScoreManager.js';
import { EventBus } from './EventBus.js';
import SuspectGenerator from './SuspectGenerator.js';
import { RouteManager } from './RouteManager.js';
import { getEnergyManager } from './EnergyManager.js';

const HQ_CITY = 'Mark Agency Headquarters';
const HQ_ID = 'hq';
const MAX_DESTINATIONS = 5;
const MAX_ENCOUNTERS = 3;
const ESCAPE_ROUTE_LENGTH = 4;
const TRAVEL_ENCOUNTER_CHANCE = 0.18;
const SUSPECT_DATA_URL = '/assets/data/citysuspects.json';
const SUSPECT_FETCH_RETRIES = 1;
const SUSPECT_FETCH_RETRY_DELAY_MS = 800;

const STARTING_AGENCY_BUDGETS = { rookie: 900, field: 650, master: 450 };

const TRANSPORT_CONFIG = {
  plane: { id: 'plane', label: 'Plane', minHours: 2, hoursPerMapPixel: 0.012, baseCost: 130, costPerHour: 35, energyPerHour: 0.7 },
  train: { id: 'train', label: 'Train', minHours: 3, hoursPerMapPixel: 0.045, baseCost: 35, costPerHour: 15, energyPerHour: 1.15 },
  bus: { id: 'bus', label: 'Bus', minHours: 4, hoursPerMapPixel: 0.06, baseCost: 18, costPerHour: 9, energyPerHour: 1.7 },
  ship: { id: 'ship', label: 'Ship', minHours: 6, hoursPerMapPixel: 0.03, baseCost: 45, costPerHour: 12, energyPerHour: 1.25 }
};

const TRAVEL_ENCOUNTERS = {
  plane: [
    { id: 'storm', label: 'Storm front over the route', timePenalty: 2, message: 'Heavy weather forces the pilot to slow the approach.' },
    { id: 'security_delay', label: 'Airport security delay', timePenalty: 1, message: 'A random security check slows everything down.' },
    { id: 'baggage_hold', label: 'Checked luggage hold-up', timePenalty: 1, message: 'Ground crew delays departure while cargo is rechecked.' },
    { id: 'reroute', label: 'Flight path reroute', timePenalty: 3, message: 'Air traffic control redirects the plane around congestion.' }
  ],
  train: [
    { id: 'signal_failure', label: 'Signal failure', timePenalty: 2, message: 'A stubborn signal refuses to appreciate the urgency of your case.' },
    { id: 'missed_connection', label: 'Missed connection', timePenalty: 2, message: 'The connecting train left precisely when you reached the platform.' },
    { id: 'rail_strike', label: 'Rail disruption', timePenalty: 3, message: 'A timetable is only a suggestion when the network disagrees.' },
    { id: 'suspicious_passenger', label: 'Suspicious passenger', timePenalty: 1, message: 'A passenger drops a suspiciously heavy suitcase in the wrong compartment.' }
  ],
  bus: [
    { id: 'traffic_jam', label: 'Traffic jam', timePenalty: 2, message: 'The road is full of people who did not plan around your investigation.' },
    { id: 'roadworks', label: 'Roadworks', timePenalty: 2, message: 'Cones and a worker with a shovel defeat modern transport.' },
    { id: 'wrong_turn', label: 'Wrong turn', timePenalty: 1, message: 'The driver insists this scenic detour was intentional.' },
    { id: 'chatty_driver', label: 'Chatty driver', timePenalty: 1, message: 'The driver has several strong opinions about your case.' }
  ],
  ship: [
    { id: 'rough_seas', label: 'Rough seas', timePenalty: 3, message: 'The sea turns the journey into an unwanted balancing exercise.' },
    { id: 'customs_search', label: 'Customs inspection', timePenalty: 2, message: 'Customs officers become interested in every suitcase on board.' },
    { id: 'engine_trouble', label: 'Engine trouble', timePenalty: 3, message: 'The engine makes a noise best described as expensive.' },
    { id: 'port_delay', label: 'Port delay', timePenalty: 2, message: 'The harbor has misplaced a permit, a tugboat or both.' }
  ]
};

let scoreManagerInstance = null;

export function getScoreManager() {
  if (!scoreManagerInstance) scoreManagerInstance = new ScoreManager();
  return scoreManagerInstance;
}

function syncScoreFromManager() {
  const manager = getScoreManager();
  if (typeof manager?.getSessionPoints === 'function') gameState.score = manager.getSessionPoints();
}

function addSessionScore(points, label) {
  const manager = getScoreManager();
  if (typeof manager?.addScoreEvent === 'function') manager.addScoreEvent(points, label);
  else if (typeof manager?._add === 'function') manager._add(points, label);
  else gameState.score = Math.max(0, (gameState.score || 0) + points);
  syncScoreFromManager();
  EventBus.emit('scoreChanged', { delta: points, total: gameState.score || 0, label });
}

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomItem(items) {
  return Array.isArray(items) && items.length ? items[Math.floor(Math.random() * items.length)] : null;
}

function normalizeCityId(value) {
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase().replace(/\s+/g, '_') : null;
}

function resolveLocationId(location, context = 'location') {
  const id = location?.id || normalizeCityId(location?.city);
  if (!id) console.error(`[gameSetup] Missing id for ${context}:`, location);
  return id;
}

function getLocationByCity(cityName, locations) {
  return Array.isArray(locations) ? locations.find(location => location.city === cityName) || null : null;
}

function getLocationById(cityId, locations) {
  return Array.isArray(locations) && cityId ? locations.find(location => resolveLocationId(location, 'lookup') === cityId) || null : null;
}

function validateSetupData(suspects, missions, locations) {
  if (!Array.isArray(suspects) || !suspects.length) throw new Error('No suspects data available.');
  if (!Array.isArray(missions) || !missions.length) throw new Error('No missions data available.');
  if (!Array.isArray(locations) || !locations.length) throw new Error('No locations data available.');
  const ids = new Set();
  locations.forEach(location => {
    const id = resolveLocationId(location, 'setup validation');
    if (!id) throw new Error('A location is missing both id and city.');
    if (ids.has(id)) throw new Error(`Duplicate location id: ${id}`);
    ids.add(id);
  });
}

function getRouteManager() {
  if (gameState.routeManager instanceof RouteManager) return gameState.routeManager;
  const manager = new RouteManager(Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [], gameState.crimeCityId || null);
  if (gameState.routeManager && typeof gameState.routeManager === 'object') manager.restore(gameState.routeManager);
  gameState.routeManager = manager;
  return manager;
}

function syncRouteStateFromManager() {
  const manager = getRouteManager();
  if (manager.isComplete()) {
    Object.assign(gameState, { routeIndex: manager.route.length, nextTargetCityId: null, nextTargetCity: null, mustIncludeCityId: null, canonicalTravelCityId: null });
    return;
  }
  const targetId = manager.getNextExpectedCity();
  gameState.routeIndex = manager.isCrimeCityPhase() ? -1 : manager.currentRouteIndex;
  gameState.nextTargetCityId = targetId;
  gameState.mustIncludeCityId = targetId;
  gameState.canonicalTravelCityId = targetId;
}

function syncInvestigationState(locations) {
  const manager = getRouteManager();
  syncRouteStateFromManager();
  if (manager.isComplete()) {
    gameState.clueScope = 'finale';
    return;
  }
  gameState.nextTargetCity = getLocationById(manager.getNextExpectedCity(), locations)?.city || null;
  gameState.clueScope = manager.isCrimeCityPhase() ? 'crime_scene' : 'route_leg';
}

function ensureMustIncludeDestination(destinations, locations) {
  const result = [];
  const seen = new Set();
  const add = location => {
    const id = resolveLocationId(location, 'destination');
    if (!location?.city || !id || id === gameState.currentCityId || id === HQ_ID || seen.has(id)) return;
    seen.add(id);
    result.push(location);
  };
  if (gameState.mustIncludeCityId) add(getLocationById(gameState.mustIncludeCityId, locations));
  destinations.forEach(add);
  return result.slice(0, MAX_DESTINATIONS);
}

function generateDestinationsForCurrentCity(locations) {
  const target = getLocationById(gameState.nextTargetCityId, locations);
  const previous = getLocationById(gameState.lastTravel?.fromCityId, locations);
  const filler = shuffle(locations.filter(location => {
    const id = resolveLocationId(location, 'destination filler');
    return location?.city && id && id !== gameState.currentCityId && id !== HQ_ID;
  }));
  return ensureMustIncludeDestination([target, previous, ...filler].filter(Boolean), locations);
}

function buildActiveEncounters(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.encounters) && cityData.encounters.length) return shuffle(cityData.encounters).slice(0, MAX_ENCOUNTERS);
  const pool = Array.isArray(cityData.encounterPool) ? cityData.encounterPool : [];
  const slots = Array.isArray(cityData.encounterSlots) ? cityData.encounterSlots.filter(slot => slot.enabled !== false) : [];
  const count = Math.min(cityData.encounterRules?.count || MAX_ENCOUNTERS, pool.length, slots.length);
  return shuffle(pool).slice(0, count).map((encounter, index) => ({ ...encounter, cityX: slots[index].cityX, cityY: slots[index].cityY, enabled: true }));
}

function clearTravelCluesForCity(cityId) {
  if (!cityId || !Array.isArray(gameState.cluesCollected)) return;
  gameState.cluesCollected = gameState.cluesCollected.filter(clue => !clue || typeof clue !== 'object' || clue.type !== 'travel' || (clue.cityId !== cityId && clue.value !== cityId));
}

function getTravelDistance(fromName, toName, locations) {
  const from = getLocationByCity(fromName, locations);
  const to = getLocationByCity(toName, locations);
  return from?.map && to?.map ? Math.hypot(to.map.x - from.map.x, to.map.y - from.map.y) : 250;
}

function canTravelByLand(from, to) {
  if (from.country === to.country) return true;
  return from.travelRegion === to.travelRegion && ['europe', 'north_america'].includes(from.travelRegion);
}

function isTransportAvailable(from, to, type) {
  if (type === 'plane') return Boolean(from.airport && to.airport);
  if (type === 'train') return Boolean(from.trainStation && to.trainStation && canTravelByLand(from, to));
  if (type === 'bus') return Boolean(from.busStation && to.busStation && canTravelByLand(from, to));
  if (type === 'ship') return Boolean(from.harbor && to.harbor);
  return false;
}

function getTransportConfig(type) {
  return TRANSPORT_CONFIG[type] || null;
}

function calculateTravelValues(distance, type) {
  const config = getTransportConfig(type);
  const baseTravelHours = Math.max(config.minHours, Math.round(config.minHours + distance * config.hoursPerMapPixel));
  return {
    baseTravelHours,
    moneySpent: Math.round(config.baseCost + baseTravelHours * config.costPerHour),
    estimatedEnergyChange: -Math.max(2, Math.round(baseTravelHours * config.energyPerHour))
  };
}

function rollTravelEncounter(type) {
  return Math.random() < TRAVEL_ENCOUNTER_CHANCE ? structuredClone(getRandomItem(TRAVEL_ENCOUNTERS[type] || TRAVEL_ENCOUNTERS.plane)) : null;
}

function spendAgencyBudget(amount, description, metadata = {}) {
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
  const encounter = options.travelEncounter !== undefined ? options.travelEncounter : options.allowEncounter ? rollTravelEncounter(transportType) : null;
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

async function fetchCaseSuspects(thief, crimeCityId) {
  let lastError = null;

  for (
    let attempt = 0;
    attempt <= SUSPECT_FETCH_RETRIES;
    attempt += 1
  ) {
    try {
      const response = await fetch(SUSPECT_DATA_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const citySuspectsData = await response.json();

      const suspectGenerator = new SuspectGenerator(
        citySuspectsData
      );

      const caseData = suspectGenerator.generateCaseSuspects(
        thief,
        crimeCityId
      );

      suspectGenerator.prepareCaseState(caseData);

      return caseData;
    } catch (error) {
      lastError = error;

      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise((resolve) => {
          setTimeout(resolve, SUSPECT_FETCH_RETRY_DELAY_MS);
        });
      }
    }
  }

  throw new Error(
    `Failed to load suspects: ${lastError?.message || lastError}`
  );
}

export async function setupNewGame(suspectsData, missionsData, locationsData, difficulty = 'field') {
  validateSetupData(suspectsData, missionsData, locationsData);
  clearSavedGame();
  resetGameState();
  resetCaseOutcomeState();
  const energyManager = getEnergyManager();
  energyManager.init(difficulty);
  if (typeof getScoreManager()?.startSession === 'function') getScoreManager().startSession();
  const thief = getRandomItem(suspectsData);
  const crimeCities = locationsData.filter(location => location.isCrimeCity === true);
  const mission = getRandomItem(missionsData.filter(item => crimeCities.some(city => city.city === item.city)));
  const crimeCityData = crimeCities.find(city => city.city === mission?.city);
  const hqData = locationsData.find(location => location.id === HQ_ID || location.city === HQ_CITY);
  if (!thief || !crimeCityData || !hqData) throw new Error('Could not create a valid case.');
  const crimeCityId = resolveLocationId(crimeCityData, 'crime city');
  const escapeRoute = shuffle(locationsData.filter(location => {
    const id = resolveLocationId(location, 'escape route');
    return location?.city && id !== crimeCityId && id !== HQ_ID;
  }).map(location => resolveLocationId(location, 'escape route'))).slice(0, ESCAPE_ROUTE_LENGTH);

  Object.assign(gameState, {
    currentThiefId: thief.id ?? null, currentThief: structuredClone(thief),
    currentMission: structuredClone(mission), currentArtifact: mission.artifact ?? null,
    currentCity: hqData.city, currentCityId: hqData.id || HQ_ID, currentCityData: structuredClone(hqData),
    currentEncounterId: null, crimeCity: crimeCityData.city, crimeCityId,
    activeLocations: [], currentDestinations: [], escapeRoute,
    routeManager: new RouteManager(escapeRoute, crimeCityId), justReachedCorrectCityId: null,
    clueScope: 'crime_scene', score: 0, playerRank: 'Junior Agent', isGameActive: true,
    crimeSceneVisited: false, storyPhoneCallTriggered: false, pendingPhoneCall: false,
    pendingPhoneCallCityId: null, scoreSaved: false, cluesCollected: [], visitedEncounters: [],
    visitedCities: [hqData.id || HQ_ID], playerNotes: '', timeSpent: 0, travelHistory: [],
    lastTravel: null, lastTravelEncounter: null, caseSuspects: [], identityEvidence: null,
    traceEvidence: [], energy: energyManager.getCurrentEnergy(), difficulty,
    agencyBudget: STARTING_AGENCY_BUDGETS[difficulty] ?? STARTING_AGENCY_BUDGETS.field,
    agencyDebt: 0, moneyLog: []
  });
  const caseData = await fetchCaseSuspects(gameState.currentThief, crimeCityId);

  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);
  syncScoreFromManager();
  window.GAMESTATE = gameState;
  saveGameState();
  return gameState;
}

export function enterCity(cityName, locations) {
  const cityData = getLocationByCity(cityName, locations);
  if (!cityData) throw new Error(`No location data found for city: ${cityName}`);
  const cityId = resolveLocationId(cityData, 'enterCity');
  gameState.currentCity = cityData.city;
  gameState.currentCityId = cityId;
  gameState.currentCityData = structuredClone(cityData);
  gameState.currentEncounterId = null;
  gameState.activeLocations = buildActiveEncounters(cityData);
  if (!Array.isArray(gameState.visitedCities)) gameState.visitedCities = [];
  if (!gameState.visitedCities.includes(cityId)) gameState.visitedCities.push(cityId);
  return gameState.currentCityData;
}

export function markEncounterVisited(encounterId, clue = null) {
  if (!encounterId) return;
  if (!Array.isArray(gameState.visitedEncounters)) gameState.visitedEncounters = [];
  if (!gameState.visitedEncounters.includes(encounterId)) gameState.visitedEncounters.push(encounterId);
  if (clue?.id && !gameState.cluesCollected.some(item => item.id === clue.id)) {
    gameState.cluesCollected.push(clue);
    addSessionScore(50, `Encounter clue: ${encounterId}`);
  }
  saveGameState();
}

export function advanceInvestigation(locations, enteredCityId) {
  const manager = getRouteManager();
  const result = manager.enterCity(enteredCityId);
  if (!result.ok) {
    syncInvestigationState(locations);
    saveGameState();
    return { success: false, status: 'WRONG_CITY', result };
  }
  if (result.reason === 'crime_city_accepted') gameState.crimeSceneVisited = true;
  gameState.justReachedCorrectCityId = null;
  syncInvestigationState(locations);
  if (manager.isComplete()) {
    gameState.currentDestinations = [];
    gameState.activeLocations = [];
    saveGameState();
    return { success: true, status: 'FINAL_SHOWDOWN', result };
  }
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  saveGameState();
  return { success: true, status: result.reason === 'crime_city_accepted' ? 'CRIME_SCENE_REACHED' : 'CONTINUE', result };
}

export function completeCityInvestigation(locations) {
  const manager = getRouteManager();
  if (!gameState.currentCityId) return { success: false, status: 'NO_ACTIVE_TARGET' };
  if (!manager.canEnterCity(gameState.currentCityId)) return { success: false, status: 'WRONG_CITY' };
  return advanceInvestigation(locations, gameState.currentCityId);
}

export function travelToCity(cityName, locations, transportType = 'plane') {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;
  const origin = getLocationByCity(previousCity, locations);
  const destination = getLocationByCity(cityName, locations);
  if (!origin || !destination) throw new Error('Origin or destination city data is missing.');
  if (!getTransportConfig(transportType)) throw new Error(`Unknown transport type: ${transportType}`);
  if (!isTransportAvailable(origin, destination, transportType)) throw new Error(`${transportType} is unavailable for this route.`);
  if (cityName === previousCity) return { wasCorrect: false, transportType, transportLabel: getTransportConfig(transportType).label, travelHours: 0, baseTravelHours: 0, moneySpent: 0, energyChange: 0, travelEncounter: null, status: 'ALREADY_HERE', fromCity: previousCity, toCity: cityName, toCityId: previousCityId, cityId: previousCityId, isCrimeSceneArrival: previousCityId === gameState.crimeCityId };

  const travel = getTravelData(previousCity, cityName, locations, { allowEncounter: true, transportType });
  const destinationId = resolveLocationId(destination, 'travelToCity');
  const energyManager = getEnergyManager();
  const energyBefore = energyManager.getCurrentEnergy();
  const energyResult = energyManager.consumeTravel(transportType);
  const energyAfter = energyManager.getCurrentEnergy();
  const energyChange = energyAfter - energyBefore;
  gameState.energy = energyAfter;
  const payment = spendAgencyBudget(travel.moneySpent, `${travel.transportLabel}: ${previousCity} to ${cityName}`, { fromCityId: previousCityId, toCityId: destinationId, transportType });
  const manager = getRouteManager();
  const wasCorrect = manager.canEnterCity(destinationId);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;
  gameState.timeSpent = (gameState.timeSpent || 0) + travel.travelHours;
  const record = { from: previousCity, fromCityId: previousCityId, to: cityName, toCityId: destinationId, transportType, transportLabel: travel.transportLabel, hours: travel.travelHours, baseHours: travel.baseTravelHours, moneySpent: travel.moneySpent, energyChange, agencyDebtAdded: payment.debtAdded, wasCorrect, encounter: travel.travelEncounter, travelLabel: travel.travelLabel };
  if (!Array.isArray(gameState.travelHistory)) gameState.travelHistory = [];
  gameState.lastTravel = record;
  gameState.lastTravelEncounter = travel.travelEncounter;
  gameState.travelHistory.push(record);
  enterCity(cityName, locations);
  clearTravelCluesForCity(destinationId);
  const isFinalRouteCity = wasCorrect && manager.isRoutePhase() && manager.currentRouteIndex === manager.route.length - 1;
  addSessionScore(wasCorrect ? 100 : -25, wasCorrect ? `Correct city: ${cityName}` : `False city: ${cityName}`);

  if (isFinalRouteCity) {
    manager.enterCity(destinationId);
    syncInvestigationState(locations);
    gameState.justReachedCorrectCityId = null;
    gameState.currentDestinations = [];
    gameState.activeLocations = [];
    saveGameState();
    return { wasCorrect: true, ...travel, energyChange, agencyDebtAdded: payment.debtAdded, energyReachedZero: Boolean(energyResult?.energyReachedZero), status: 'FINAL_SHOWDOWN', fromCity: previousCity, toCity: cityName, toCityId: destinationId, cityId: destinationId, isCrimeSceneArrival: false };
  }

  gameState.justReachedCorrectCityId = wasCorrect ? destinationId : null;
  syncInvestigationState(locations);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  saveGameState();
  return { wasCorrect, ...travel, energyChange, agencyDebtAdded: payment.debtAdded, energyReachedZero: Boolean(energyResult?.energyReachedZero), status: wasCorrect ? (isCrimeSceneArrival ? 'CRIME_SCENE_REACHED' : 'CORRECT_CITY_REACHED') : 'FALSE_LEAD', fromCity: previousCity, toCity: cityName, toCityId: destinationId, cityId: destinationId, isCrimeSceneArrival };
}

export function resolveFinalArrest(selectedSuspectId) {
  const thiefId = gameState.currentThief?.id || gameState.currentThiefId;
  const success = Boolean(selectedSuspectId && thiefId && selectedSuspectId === thiefId);
  gameState.finalArrestSuspectId = selectedSuspectId ?? null;
  gameState.finalArrestResult = success ? 'SUCCESS' : 'FAILURE';
  gameState.caseResolved = success;
  gameState.caseFailed = !success;
  gameState.isGameActive = false;
  addSessionScore(success ? 500 : -150, success ? 'Correct arrest' : 'Wrong warrant');
  saveGameState();
  return { success, selectedSuspectId: selectedSuspectId ?? null, thiefId: thiefId ?? null, nextScene: success ? 'SuccessScene' : 'GameOverScene' };
}