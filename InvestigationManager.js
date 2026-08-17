import { gameState, resetCaseOutcomeState } from './GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { EventBus } from './EventBus.js';
import { ScoreManager } from './ScoreManager.js';
import { RouteManager } from './RouteManager.js';
import { 
  HQ_ID, 
  MAX_DESTINATIONS, 
  MAX_ENCOUNTERS 
} from './TransportConfig.js';
import { 
  getLocationByCity, 
  getLocationById, 
  resolveLocationId 
} from './ui/LocationUI.js';

let scoreManagerInstance = null;

export function getScoreManager() {
  if (!scoreManagerInstance) scoreManagerInstance = new ScoreManager();
  return scoreManagerInstance;
}

function syncScoreFromManager() {
  const manager = getScoreManager();
  if (typeof manager?.getSessionPoints === 'function') gameState.score = manager.getSessionPoints();
}

export function addSessionScore(points, label) {
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

export function getRouteManager() {
  if (gameState.routeManager instanceof RouteManager) return gameState.routeManager;
  const manager = new RouteManager(Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [], gameState.crimeCityId || null);
  if (gameState.routeManager && typeof gameState.routeManager === 'object') manager.restore(gameState.routeManager);
  gameState.routeManager = manager;
  return manager;
}

export function syncRouteStateFromManager() {
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

export function syncInvestigationState(locations) {
  const manager = getRouteManager();
  syncRouteStateFromManager();
  if (manager.isComplete()) {
    gameState.clueScope = 'finale';
    return;
  }
  gameState.nextTargetCity = getLocationById(manager.getNextExpectedCity(), locations)?.city || null;
  gameState.clueScope = manager.isCrimeCityPhase() ? 'crime_scene' : 'route_leg';
}

export function ensureMustIncludeDestination(destinations, locations) {
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

export function generateDestinationsForCurrentCity(locations) {
  const target = getLocationById(gameState.nextTargetCityId, locations);
  const previous = getLocationById(gameState.lastTravel?.fromCityId, locations);
  const filler = shuffle(locations.filter(location => {
    const id = resolveLocationId(location, 'destination filler');
    return location?.city && id && id !== gameState.currentCityId && id !== HQ_ID;
  }));
  return ensureMustIncludeDestination([target, previous, ...filler].filter(Boolean), locations);
}

export function buildActiveEncounters(cityData) {
  if (!cityData) return [];
  if (Array.isArray(cityData.encounters) && cityData.encounters.length) return shuffle(cityData.encounters).slice(0, MAX_ENCOUNTERS);
  const pool = Array.isArray(cityData.encounterPool) ? cityData.encounterPool : [];
  const slots = Array.isArray(cityData.encounterSlots) ? cityData.encounterSlots.filter(slot => slot.enabled !== false) : [];
  const count = Math.min(cityData.encounterRules?.count || MAX_ENCOUNTERS, pool.length, slots.length);
  return shuffle(pool).slice(0, count).map((encounter, index) => ({ ...encounter, cityX: slots[index].cityX, cityY: slots[index].cityY, enabled: true }));
}

export function clearTravelCluesForCity(cityId) {
  if (!cityId || !Array.isArray(gameState.cluesCollected)) return;
  gameState.cluesCollected = gameState.cluesCollected.filter(clue => !clue || typeof clue !== 'object' || clue.type !== 'travel' || (clue.cityId !== cityId && clue.value !== cityId));
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

export function resolveFinalArrest(selectedSuspectId) {
  const thiefId = gameState.trueThiefCaseSuspectId || gameState.realThiefSuspectId;

  const success = Boolean(
    selectedSuspectId &&
    thiefId &&
    selectedSuspectId === thiefId
  );
  gameState.finalArrestSuspectId = selectedSuspectId ?? null;
  gameState.finalArrestResult = success ? 'SUCCESS' : 'FAILURE';
  gameState.caseResolved = success;
  gameState.caseFailed = !success;
  gameState.isGameActive = false;
  addSessionScore(success ? 500 : -150, success ? 'Correct arrest' : 'Wrong warrant');
  saveGameState();
  return { success, selectedSuspectId: selectedSuspectId ?? null, thiefId: thiefId ?? null, nextScene: success ? 'SuccessScene' : 'GameOverScene' };
}