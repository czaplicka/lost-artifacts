import { gameState } from '../GameData.js';
import { saveGameState, requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { ScoreManager } from './ScoreManager.js';
import { RouteManager } from './RouteManager.js';
import { HQ_ID, MAX_DESTINATIONS } from '../TransportConfig.js';
import { getLocationByCity, getLocationById, resolveLocationId } from '../ui/LocationUI.js';
import { getPursuitCityContext } from './PursuitCityContext.js';

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
  const manager = new RouteManager(
    Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [],
    gameState.crimeCityId || null
  );
  if (gameState.routeManager && typeof gameState.routeManager === 'object') manager.restore(gameState.routeManager);
  gameState.routeManager = manager;
  return manager;
}

export function syncRouteStateFromManager() {
  const manager = getRouteManager();
  if (manager.isComplete()) {
    Object.assign(gameState, {
      routeIndex: manager.route.length, nextTargetCityId: null, nextTargetCity: null,
      mustIncludeCityId: null, canonicalTravelCityId: null
    });
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
    if (!location?.city) return;
    const id = resolveLocationId(location, 'destination');
    if (!id || id === gameState.currentCityId || id === HQ_ID || seen.has(id)) return;
    seen.add(id);
    result.push(location);
  };
  if (gameState.mustIncludeCityId) add(getLocationById(gameState.mustIncludeCityId, locations));
  (destinations || []).forEach(add);
  return result.slice(0, MAX_DESTINATIONS);
}

function destinationCaseKey() {
  const mission = gameState.currentMission || {};
  return JSON.stringify([
    gameState.currentCaseId ?? null,
    mission.id ?? mission.missionId ?? null,
    gameState.investigationStartTime ?? null,
    gameState.caseIndex ?? mission.caseIndex ?? null,
    gameState.crimeCityId ?? null,
    gameState.currentThiefId ?? null,
    gameState.escapeRoute || []
  ]);
}

function getDestinationMemory() {
  const caseKey = destinationCaseKey();
  const saved = gameState.destinationMapMemory;
  if (saved?.version === 1 && saved.caseKey === caseKey &&
      saved.cities && typeof saved.cities === 'object' && !Array.isArray(saved.cities)) return saved;
  const fresh = { version: 1, caseKey, cities: {} };
  gameState.destinationMapMemory = fresh;
  return fresh;
}

function getLocalRouteTargetId(cityId) {
  getRouteManager();
  const context = getPursuitCityContext(gameState, cityId);
  if (context.isCrimeCity || context.isCorrectCity) return context.targetCityId;
  return gameState.nextTargetCityId || null;
}

export function generateDestinationsForCurrentCity(locations, options = {}) {
  const list = Array.isArray(locations) ? locations : locations?.locations || [];
  const cityId = gameState.currentCityId;
  if (!cityId || !list.length) return [];
  const memory = getDestinationMemory();
  const key = JSON.stringify(cityId);
  const savedIds = memory.cities[key];
  const result = [];
  const seen = new Set();
  const add = location => {
    if (!location?.city) return;
    const id = resolveLocationId(location, 'persistent destination');
    if (!id || id === cityId || id === HQ_ID || seen.has(id)) return;
    seen.add(id);
    result.push(location);
  };
  const requireDestination = location => {
    if (!location?.city) return;
    const id = resolveLocationId(location, 'required local destination');
    if (!id || id === cityId || id === HQ_ID || seen.has(id)) return;
    if (result.length >= MAX_DESTINATIONS) {
      const removed = result.pop();
      seen.delete(resolveLocationId(removed, 'replaced destination'));
    }
    add(location);
  };

  if (Array.isArray(savedIds)) {
    for (const id of savedIds) add(getLocationById(id, list));
  } else if (options.preserveCurrent && Array.isArray(gameState.currentDestinations)) {
    for (const location of gameState.currentDestinations) {
      if (location?.city) add(getLocationById(resolveLocationId(location, 'existing destination'), list));
    }
  }
  // Repair a legacy map only when its local next stop is missing.
  requireDestination(getLocationById(getLocalRouteTargetId(cityId), list));
  if (!Array.isArray(savedIds)) add(getLocationById(gameState.lastTravel?.fromCityId, list));
  if (result.length < MAX_DESTINATIONS) {
    const filler = list.filter(location => {
      if (!location?.city) return false;
      const id = resolveLocationId(location, 'destination filler');
      return id && id !== cityId && id !== HQ_ID && !seen.has(id);
    });
    for (const location of shuffle(filler)) {
      if (result.length >= MAX_DESTINATIONS) break;
      add(location);
    }
  }
  const selected = result.slice(0, MAX_DESTINATIONS);
  const ids = selected.map(location => resolveLocationId(location, 'saved destination'));
  if (JSON.stringify(savedIds) !== JSON.stringify(ids)) {
    gameState.destinationMapMemory = { ...memory, cities: { ...memory.cities, [key]: ids } };
    requestAutosave();
  }
  return selected;
}

export function clearTravelCluesForCity(cityId) {
  // Compatibility export: collected evidence must survive arrival and revisits.
  return cityId || null;
}

export function enterCity(cityName, locations) {
  const cityData = getLocationByCity(cityName, locations);
  if (!cityData) throw new Error(`No location data found for city: ${cityName}`);
  const cityId = resolveLocationId(cityData, 'enterCity');
  gameState.currentCity = cityData.city;
  gameState.currentCityId = cityId;
  gameState.currentCityData = structuredClone(cityData);
  gameState.currentEncounterId = null;
  gameState.addCity(cityId);
  return gameState.currentCityData;
}

export function markEncounterVisited(encounterId, clue = null) {
  if (!encounterId) return;
  gameState.addEncounter(encounterId);
  if (clue?.id && gameState.addClue(clue)) addSessionScore(50, `Encounter clue: ${encounterId}`);
  requestAutosave();
}

export function advanceInvestigation(locations, enteredCityId) {
  const manager = getRouteManager();
  const context = getPursuitCityContext(gameState, enteredCityId);
  if (context.isCurrentVisitedRouteCity || (context.isCrimeCity && !manager.isCrimeCityPhase())) {
    syncInvestigationState(locations);
    return { success: true, status: 'RETURN_VISIT', result: { ok: true, reason: 'already_accepted', advanced: false } };
  }
  const result = manager.enterCity(enteredCityId);
  if (!result.ok) {
    syncInvestigationState(locations);
    saveGameState();
    return { success: false, status: 'WRONG_CITY', result };
  }
  if (result.reason === 'crime_city_accepted') gameState.crimeSceneVisited = true;
  gameState.justReachedCorrectCityId = context.isCrimeCity ? null : enteredCityId;
  syncInvestigationState(locations);
  if (manager.isComplete()) {
    gameState.currentDestinations = [];
    saveGameState();
    return { success: true, status: 'FINAL_SHOWDOWN', result };
  }
  gameState.currentDestinations = generateDestinationsForCurrentCity(locations);
  saveGameState();
  return { success: true, status: result.reason === 'crime_city_accepted' ? 'CRIME_SCENE_REACHED' : 'CONTINUE', result };
}

export function completeCityInvestigation(locations) {
  if (!gameState.currentCityId) return { success: false, status: 'NO_ACTIVE_TARGET' };
  return advanceInvestigation(locations, gameState.currentCityId);
}

export function resolveFinalArrest(selectedSuspectId) {
  const thiefId = gameState.trueThiefCaseSuspectId || gameState.realThiefSuspectId;
  const success = Boolean(selectedSuspectId && thiefId && selectedSuspectId === thiefId);
  gameState.finalArrestSuspectId = selectedSuspectId ?? null;
  gameState.finalArrestResult = success ? 'SUCCESS' : 'FAILURE';
  gameState.caseResolved = success;
  gameState.caseFailed = !success;
  gameState.isGameActive = false;
  addSessionScore(success ? 500 : -150, success ? 'Correct arrest' : 'Wrong warrant');
  saveGameState();
  return { success, selectedSuspectId: selectedSuspectId ?? null, thiefId: thiefId ?? null,
    nextScene: success ? 'SuccessScene' : 'GameOverScene' };
}
