import {
  gameState,
  resetGameState,
  resetCaseOutcomeState,
  clearSavedGame,
  saveGameState
} from './GameData.js';
import { ScoreManager } from './ScoreManager.js';
import { EventBus } from './EventBus.js';
import SuspectGenerator from './SuspectGenerator.js';
import { RouteManager } from './RouteManager.js';
import { getEnergyManager } from './EnergyManager.js';

const HQ_CITY = 'Mark Agency Headquarters';
const HQ_ID = 'hq';
const DEFAULT_TRAVEL_HOURS = 8;
const MAX_DESTINATIONS = 5;
const MAX_ENCOUNTERS = 3;
const ESCAPE_ROUTE_LENGTH = 4;
const TRAVEL_ENCOUNTER_CHANCE = 0.18;

const SUSPECT_DATA_URL = '/assets/data/citysuspects.json';
const SUSPECT_FETCH_RETRIES = 1;
const SUSPECT_FETCH_RETRY_DELAY_MS = 800;

const TRAVEL_ENCOUNTERS = [
  { id: 'storm', label: 'Storm front over the route', timePenalty: 2, message: 'Heavy weather forces the pilot to slow the approach.' },
  { id: 'security_delay', label: 'Airport security delay', timePenalty: 1, message: 'A random security check slows everything down.' },
  { id: 'baggage_hold', label: 'Checked luggage hold-up', timePenalty: 1, message: 'Ground crew delays the departure while cargo is rechecked.' },
  { id: 'reroute', label: 'Flight path reroute', timePenalty: 3, message: 'Air traffic control redirects the plane around congestion.' }
];

let scoreManagerInstance = null;

export function getScoreManager() {
  if (!scoreManagerInstance) scoreManagerInstance = new ScoreManager();
  return scoreManagerInstance;
}

function syncScoreFromManager() {
  const manager = getScoreManager();
  if (typeof manager?.getSessionPoints === 'function') gameState.score = manager.getSessionPoints();
}

function emitScoreChanged(delta, label = 'Score update') {
  EventBus.emit('scoreChanged', { delta, total: gameState.score || 0, label });
}

function addSessionScore(points, label = 'Score update') {
  const manager = getScoreManager();
  if (typeof manager?.addScoreEvent === 'function') manager.addScoreEvent(points, label);
  else if (typeof manager?._add === 'function') manager._add(points, label);
  else gameState.score = Math.max(0, (gameState.score || 0) + points);
  syncScoreFromManager();
  emitScoreChanged(points, label);
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
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function resolveLocationId(location, context = 'location') {
  const id = location?.id || normalizeCityId(location?.city);

  if (!id) {
    console.error(
      `[gameSetup] Could not resolve a valid id for ${context}. ` +
      'Location is missing both "id" and a usable "city" name:',
      location
    );
  }

  return id;
}

function getLocationByCity(cityName, locations) {
  return Array.isArray(locations) ? locations.find(location => location.city === cityName) || null : null;
}

function getLocationById(cityId, locations) {
  return Array.isArray(locations) && cityId
    ? locations.find(location => resolveLocationId(location, 'lookup') === cityId) || null
    : null;
}

function validateSetupData(suspects, missions, locations) {
  if (!Array.isArray(suspects) || !suspects.length) throw new Error('No suspects data available.');
  if (!Array.isArray(missions) || !missions.length) throw new Error('No missions data available.');
  if (!Array.isArray(locations) || !locations.length) throw new Error('No locations data available.');

  const invalidLocations = locations.filter(location => !resolveLocationId(location, 'setup validation'));
  if (invalidLocations.length) {
    throw new Error(
      `${invalidLocations.length} location(s) in locations.json have no usable "id" or "city" field ` +
      'and would collide as null keys. Fix the data before starting a new game.'
    );
  }

  const idCounts = new Map();
  locations.forEach(location => {
    const id = resolveLocationId(location, 'duplicate check');
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  });

  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicateIds.length) {
    throw new Error(`Duplicate location ids detected in locations.json: ${duplicateIds.join(', ')}`);
  }
}

function getRouteManager() {
  if (gameState.routeManager instanceof RouteManager) return gameState.routeManager;

  const manager = new RouteManager(
    Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [],
    gameState.crimeCityId || null
  );

  if (gameState.routeManager && typeof gameState.routeManager === 'object') {
    manager.restore(gameState.routeManager);
  }

  gameState.routeManager = manager;
  return manager;
}

function syncRouteStateFromManager() {
  const manager = getRouteManager();

  if (manager.isComplete()) {
    gameState.routeIndex = manager.route.length;
    gameState.nextTargetCityId = null;
    gameState.nextTargetCity = null;
    gameState.mustIncludeCityId = null;
    gameState.canonicalTravelCityId = null;
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

  const targetId = manager.getNextExpectedCity();
  const targetCity = getLocationById(targetId, locations);
  gameState.nextTargetCity = targetCity?.city || null;
  gameState.clueScope = manager.isCrimeCityPhase() ? 'crime_scene' : 'route_leg';
}

function ensureMustIncludeDestination(destinations, locations) {
  const currentId = gameState.currentCityId;
  const requiredId = gameState.mustIncludeCityId;
  const result = [];
  const seen = new Set();

  const add = location => {
    const id = resolveLocationId(location, 'destination list');
    if (!location?.city || !id || id === currentId || id === HQ_ID || seen.has(id)) return;
    seen.add(id);
    result.push(location);
  };

  if (requiredId && requiredId !== currentId) add(getLocationById(requiredId, locations));
  destinations.forEach(add);
  return result.slice(0, MAX_DESTINATIONS);
}

function generateDestinationsForCurrentCity(locations) {
  const currentId = gameState.currentCityId;
  const returnId = gameState.lastTravel?.fromCityId || null;
  const candidates = [];

  const target = getLocationById(gameState.nextTargetCityId, locations);
  const previous = getLocationById(returnId, locations);
  if (target) candidates.push(target);
  if (previous) candidates.push(previous);

  const filler = shuffle(locations.filter(location => {
    const id = resolveLocationId(location, 'destination filler');
    return location?.city && id && id !== currentId && id !== HQ_ID;
  }));

  return ensureMustIncludeDestination([...candidates, ...filler], locations).slice(0, MAX_DESTINATIONS);
}

function buildActiveEncounters(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.encounters) && cityData.encounters.length) {
    return shuffle(cityData.encounters).slice(0, MAX_ENCOUNTERS);
  }

  const pool = Array.isArray(cityData.encounterPool) ? cityData.encounterPool : [];
  const slots = Array.isArray(cityData.encounterSlots) ? cityData.encounterSlots.filter(slot => slot.enabled !== false) : [];
  const count = Math.min(cityData.encounterRules?.count || MAX_ENCOUNTERS, pool.length, slots.length);

  return shuffle(pool).slice(0, count).map((encounter, index) => ({
    ...encounter,
    cityX: slots[index].cityX,
    cityY: slots[index].cityY,
    enabled: true
  }));
}

function clearTravelCluesForCity(cityId) {
  if (!cityId || !Array.isArray(gameState.cluesCollected)) return;
  gameState.cluesCollected = gameState.cluesCollected.filter(clue =>
    !clue || typeof clue !== 'object' || clue.type !== 'travel' || (clue.cityId !== cityId && clue.value !== cityId)
  );
}

function getTravelDistance(fromName, toName, locations) {
  const from = getLocationByCity(fromName, locations);
  const to = getLocationByCity(toName, locations);
  if (!from?.map || !to?.map) return null;
  return Math.hypot(to.map.x - from.map.x, to.map.y - from.map.y);
}

function getBaseTravelHoursFromDistance(distance) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) return DEFAULT_TRAVEL_HOURS;
  if (distance < 250) return 4;
  if (distance < 600) return 8;
  return 12;
}

function rollTravelEncounter() {
  return Math.random() < TRAVEL_ENCOUNTER_CHANCE ? structuredClone(getRandomItem(TRAVEL_ENCOUNTERS)) : null;
}

export function getTravelData(fromCityName, toCityName, locations, options = {}) {
  const distance = getTravelDistance(fromCityName, toCityName, locations);
  const baseTravelHours = getBaseTravelHoursFromDistance(distance);
  const encounter = options.travelEncounter !== undefined
    ? options.travelEncounter
    : options.allowEncounter === true ? rollTravelEncounter() : null;
  const travelHours = baseTravelHours + (encounter?.timePenalty || 0);

  return {
    fromCity: fromCityName,
    toCity: toCityName,
    distance,
    baseTravelHours,
    travelHours,
    travelEncounter: encounter,
    travelLabel: encounter ? `${baseTravelHours}h + ${encounter.timePenalty}h` : `${baseTravelHours}h`
  };
}

export function getTravelHours(fromCityName, toCityName, locations) {
  return getTravelData(fromCityName, toCityName, locations).travelHours;
}

export function getDestinationPreviewData(locations) {
  return (gameState.currentDestinations || []).map(location => {
    const travel = getTravelData(gameState.currentCity, location.city, locations);
    return {
      ...location,
      travelHours: travel.travelHours,
      baseTravelHours: travel.baseTravelHours,
      travelLabel: travel.travelLabel,
      isCorrect: resolveLocationId(location, 'destination preview') === gameState.nextTargetCityId
    };
  });
}

async function fetchCaseSuspects(thief, crimeCityId) {
  let lastError = null;

  for (let attempt = 0; attempt <= SUSPECT_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(SUSPECT_DATA_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      }

      const json = await response.json();
      const generator = new SuspectGenerator(json);
      return generator.generateCaseSuspects(thief, crimeCityId);
    } catch (error) {
      lastError = error;

      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      console.error(
        `[gameSetup] Attempt ${attempt + 1}/${SUSPECT_FETCH_RETRIES + 1} to load ` +
        `${SUSPECT_DATA_URL} failed${isOffline ? ' (browser reports offline)' : ''}:`,
        error
      );

      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, SUSPECT_FETCH_RETRY_DELAY_MS));
      }
    }
  }

  const offlineHint = typeof navigator !== 'undefined' && navigator.onLine === false
    ? ' The browser reports no network connection.'
    : '';

  throw new Error(
    `Failed to load suspect lineup from ${SUSPECT_DATA_URL} after ` +
    `${SUSPECT_FETCH_RETRIES + 1} attempt(s).${offlineHint} Last error: ${lastError?.message || lastError}`
  );
}

export async function setupNewGame(suspectsData, missionsData, locationsData, difficulty = 'field') {
  validateSetupData(suspectsData, missionsData, locationsData);
  clearSavedGame();
  resetGameState();
  // ===== ENERGY SYSTEM =====
  const energyManager = getEnergyManager();
  energyManager.init(difficulty);
  resetCaseOutcomeState();

  const scoreManager = getScoreManager();
  if (typeof scoreManager?.startSession === 'function') scoreManager.startSession();

  const thief = getRandomItem(suspectsData);
  const crimeCities = locationsData.filter(location => location.isCrimeCity === true);
  const mission = getRandomItem(missionsData.filter(item => crimeCities.some(city => city.city === item.city)));
  if (!thief) throw new Error('Failed to select a thief.');
  if (!crimeCities.length) throw new Error('No crime cities defined (isCrimeCity: true).');
  if (!mission?.city) throw new Error('Failed to select a valid mission with a crime city.');

  const crimeCityData = crimeCities.find(city => city.city === mission.city);
  const hqData = locationsData.find(location => location.id === HQ_ID || location.city === HQ_CITY);
  if (!crimeCityData) throw new Error(`No crime-city location found for: ${mission.city}`);
  if (!hqData) throw new Error(`No HQ location data found for city: ${HQ_CITY}`);

  const crimeCityId = resolveLocationId(crimeCityData, 'crime city');
  const escapeRoute = shuffle(locationsData
    .filter(location => {
      const id = resolveLocationId(location, 'escape route candidate');
      return location?.city && id !== crimeCityId && id !== HQ_ID;
    })
    .map(location => resolveLocationId(location, 'escape route'))
  ).slice(0, ESCAPE_ROUTE_LENGTH);

  Object.assign(gameState, {
    currentThiefId: thief.id ?? null,
    currentThief: structuredClone(thief),
    currentMission: structuredClone(mission),
    currentArtifact: mission.artifact ?? null,
    currentCity: hqData.city,
    currentCityId: hqData.id || HQ_ID,
    currentCityData: structuredClone(hqData),
    currentEncounterId: null,
    crimeCity: crimeCityData.city,
    crimeCityId,
    activeLocations: [],
    currentDestinations: [],
    escapeRoute,
    routeManager: new RouteManager(escapeRoute, crimeCityId),
    justReachedCorrectCityId: null,
    clueScope: 'crime_scene',
    score: 0,
    playerRank: 'Junior Agent',
    isGameActive: true,
    crimeSceneVisited: false,
    storyPhoneCallTriggered: false,
    pendingPhoneCall: false,
    pendingPhoneCallCityId: null,
    scoreSaved: false,
    cluesCollected: [],
    visitedEncounters: [],
    visitedCities: [hqData.id || HQ_ID],
    playerNotes: '',
    timeSpent: 0,
    travelHistory: [],
    lastTravel: null,
    lastTravelEncounter: null,
    caseSuspects: [],
    identityEvidence: null,
    traceEvidence: []
  });

  const caseData = await fetchCaseSuspects(gameState.currentThief, crimeCityId);
  gameState.caseSuspects = caseData.suspects || [];
  gameState.identityEvidence = caseData.identity_evidence || null;
  gameState.traceEvidence = caseData.trace_evidence || [];

  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);
  syncScoreFromManager();
  window.GAMESTATE = gameState;
  saveGameState();
  // Synchronizuj energię
  gameState.energy = energyManager.getCurrentEnergy();
  gameState.difficulty = difficulty;
  return gameState;
}

export function enterCity(cityName, locations) {
  const cityData = getLocationByCity(cityName, locations);
  if (!cityData) throw new Error(`No location data found for city: ${cityName}`);

  const cityId = resolveLocationId(cityData, 'enterCity');
  if (!cityId) throw new Error(`Cannot enter city "${cityName}": no valid id could be resolved.`);

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
  return {
    success: true,
    status: result.reason === 'crime_city_accepted' ? 'CRIME_SCENE_REACHED' : 'CONTINUE',
    result
  };
}

export function completeCityInvestigation(locations) {
  const cityId = gameState.currentCityId;
  const manager = getRouteManager();
  if (!cityId) return { success: false, status: 'NO_ACTIVE_TARGET' };
  if (!manager.canEnterCity(cityId)) return { success: false, status: 'WRONG_CITY' };
  return advanceInvestigation(locations, cityId);
}

export function travelToCity(cityName, locations) {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;
  const destination = getLocationByCity(cityName, locations);
  if (!destination) throw new Error(`No location data found for city: ${cityName}`);

  if (cityName === previousCity) {
    return { wasCorrect: false, travelHours: 0, baseTravelHours: 0, travelEncounter: null, status: 'ALREADY_HERE', fromCity: previousCity, toCity: cityName, toCityId: previousCityId, cityId: previousCityId, isCrimeSceneArrival: previousCityId === gameState.crimeCityId };
  }

  const travel = getTravelData(previousCity, cityName, locations, { allowEncounter: true });
  const destinationId = resolveLocationId(destination, 'travelToCity');
  if (!destinationId) throw new Error(`Cannot travel to "${cityName}": no valid id could be resolved.`);

  const manager = getRouteManager();
  const wasCorrect = manager.canEnterCity(destinationId);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;

  gameState.timeSpent = (gameState.timeSpent || 0) + travel.travelHours;
  const record = { from: previousCity, fromCityId: previousCityId, to: cityName, toCityId: destinationId, hours: travel.travelHours, baseHours: travel.baseTravelHours, wasCorrect, encounter: travel.travelEncounter, travelLabel: travel.travelLabel };
  if (!Array.isArray(gameState.travelHistory)) gameState.travelHistory = [];
  gameState.lastTravel = record;
  gameState.lastTravelEncounter = travel.travelEncounter;
  gameState.travelHistory.push(record);

  enterCity(cityName, locations);
  clearTravelCluesForCity(destinationId);

  const isFinalRouteCity = Boolean(
    wasCorrect &&
    manager.isRoutePhase() &&
    manager.currentRouteIndex === manager.route.length - 1
  );

  if (wasCorrect) {
    addSessionScore(100, `Correct city: ${cityName}`);
  } else {
    addSessionScore(-25, `False city: ${cityName}`);
  }

  if (isFinalRouteCity) {
    // Ostatnie miasto trasy: przylot od razu uruchamia finał.
    manager.enterCity(destinationId);
    syncInvestigationState(locations);

    gameState.justReachedCorrectCityId = null;
    gameState.currentDestinations = [];
    gameState.activeLocations = [];

    saveGameState();

    return {
      wasCorrect: true,
      travelHours: travel.travelHours,
      baseTravelHours: travel.baseTravelHours,
      travelEncounter: travel.travelEncounter,
      status: 'FINAL_SHOWDOWN',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationId,
      cityId: destinationId,
      isCrimeSceneArrival: false
    };
  }

  gameState.justReachedCorrectCityId = wasCorrect ? destinationId : null;

  syncInvestigationState(locations);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  saveGameState();

  return {
    wasCorrect,
    travelHours: travel.travelHours,
    baseTravelHours: travel.baseTravelHours,
    travelEncounter: travel.travelEncounter,
    status: wasCorrect
      ? (isCrimeSceneArrival ? 'CRIME_SCENE_REACHED' : 'CORRECT_CITY_REACHED')
      : 'FALSE_LEAD',
    fromCity: previousCity,
    toCity: cityName,
    toCityId: destinationId,
    cityId: destinationId,
    isCrimeSceneArrival
  };
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