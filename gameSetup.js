import {
  gameState,
  resetGameState,
  clearSavedGame,
  saveGameState
} from './GameData.js';

const HQ_CITY = 'Mark Agency Headquarters';
const HQ_ID = 'hq';
const DEFAULT_TRAVEL_HOURS = 8;
const MAX_DESTINATIONS = 5;
const MAX_ENCOUNTERS = 3;
const ESCAPE_ROUTE_LENGTH = 4;

const TRAVEL_ENCOUNTER_CHANCE = 0.18;

const TRAVEL_ENCOUNTERS = [
  {
    id: 'storm',
    label: 'Storm front over the route',
    timePenalty: 2,
    message: 'Heavy weather forces the pilot to slow the approach.'
  },
  {
    id: 'security_delay',
    label: 'Airport security delay',
    timePenalty: 1,
    message: 'A random security check slows everything down.'
  },
  {
    id: 'baggage_hold',
    label: 'Checked luggage hold-up',
    timePenalty: 1,
    message: 'Ground crew delays the departure while cargo is rechecked.'
  },
  {
    id: 'reroute',
    label: 'Flight path reroute',
    timePenalty: 3,
    message: 'Air traffic control redirects the plane around congestion.'
  }
];

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomItem(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems(array, count) {
  if (!Array.isArray(array) || array.length === 0) return [];
  return shuffle(array).slice(0, Math.max(0, count));
}

function normalizeCityId(cityName) {
  const map = {
    London: 'london',
    Paris: 'paris',
    'New Delhi': 'new_delhi',
    Warsaw: 'warsaw',
    'New York City': 'new_york_city',
    Berlin: 'berlin',
    'Mark Agency Headquarters': 'hq'
  };

  if (!cityName || typeof cityName !== 'string') return null;
  return map[cityName] || cityName.toLowerCase().replace(/\s+/g, '_');
}

function getLocationByCity(cityName, locationsData) {
  if (!Array.isArray(locationsData)) return null;
  return locationsData.find(loc => loc.city === cityName) || null;
}

function getLocationById(cityId, locationsData) {
  if (!Array.isArray(locationsData) || !cityId) return null;
  return (
    locationsData.find(
      loc => (loc.id || normalizeCityId(loc.city)) === cityId
    ) || null
  );
}

function validateSetupData(suspectsData, missionsData, locationsData) {
  if (!Array.isArray(suspectsData) || suspectsData.length === 0) {
    throw new Error('No suspects data available.');
  }

  if (!Array.isArray(missionsData) || missionsData.length === 0) {
    throw new Error('No missions data available.');
  }

  if (!Array.isArray(locationsData) || locationsData.length === 0) {
    throw new Error('No locations data available.');
  }
}

function syncInvestigationState(locationsData) {
  if (!Array.isArray(gameState.escapeRoute)) {
    gameState.escapeRoute = [];
  }

  const routeIndex = Number.isInteger(gameState.routeIndex)
    ? gameState.routeIndex
    : -1;
  const isFinale = routeIndex >= gameState.escapeRoute.length;

  if (!gameState.crimeSceneVisited) {
    gameState.clueScope = 'crime_scene';
    gameState.canonicalTravelCityId = gameState.crimeCityId || null;
    gameState.nextTargetCityId = gameState.crimeCityId || null;

    const crimeCityData = getLocationById(gameState.crimeCityId, locationsData);
    gameState.nextTargetCity =
      crimeCityData?.city || gameState.crimeCity || null;
    gameState.mustIncludeCityId = gameState.crimeCityId || null;
    return;
  }

  if (isFinale) {
    gameState.clueScope = 'finale';
    gameState.canonicalTravelCityId = null;
    gameState.nextTargetCityId = null;
    gameState.nextTargetCity = null;
    gameState.mustIncludeCityId = null;
    return;
  }

  const activeRouteCityId = gameState.escapeRoute[routeIndex] ?? null;
  const activeRouteCityData = getLocationById(activeRouteCityId, locationsData);

  gameState.clueScope = 'route_leg';
  gameState.canonicalTravelCityId = activeRouteCityId;
  gameState.nextTargetCityId = activeRouteCityId;
  gameState.nextTargetCity = activeRouteCityData?.city || null;
  gameState.mustIncludeCityId = activeRouteCityId;
}

function ensureMustIncludeDestination(destinations, locationsData) {
  const currentCityId = gameState.currentCityId || null;
  const mustIncludeCityId = gameState.mustIncludeCityId;

  let result = Array.isArray(destinations) ? [...destinations] : [];

  result = result.filter(loc => {
    const locId = loc?.id || normalizeCityId(loc?.city);
    return locId && locId !== currentCityId;
  });

  if (!mustIncludeCityId) {
    return result.slice(0, MAX_DESTINATIONS);
  }

  if (currentCityId === mustIncludeCityId) {
    gameState.mustIncludeCityId = null;
    return result.slice(0, MAX_DESTINATIONS);
  }

  const alreadyIncluded = result.some(
    loc => (loc?.id || normalizeCityId(loc?.city)) === mustIncludeCityId
  );

  if (!alreadyIncluded) {
    const requiredCity = getLocationById(mustIncludeCityId, locationsData);

    if (requiredCity) {
      const requiredCityId =
        requiredCity.id || normalizeCityId(requiredCity.city);

      if (requiredCityId !== currentCityId) {
        result.unshift(requiredCity);
      }
    }
  }

  const seen = new Set();
  result = result.filter(loc => {
    const locId = loc?.id || normalizeCityId(loc?.city);
    if (!locId || seen.has(locId)) return false;
    seen.add(locId);
    return true;
  });

  return result.slice(0, MAX_DESTINATIONS);
}

function generateDestinationsForCurrentCity(locationsData) {
  const currentCityId =
    gameState.currentCityId || normalizeCityId(gameState.currentCity);
  const correctCityId = gameState.nextTargetCityId || null;
  const returnCityId =
    gameState.lastTravel?.fromCityId ||
    normalizeCityId(gameState.lastTravel?.from);

  const finalDestinations = [];
  const usedCityIds = new Set();

  const addCity = cityData => {
    if (!cityData?.city) return;

    const cityId = cityData.id || normalizeCityId(cityData.city);

    if (!cityId) return;
    if (cityId === currentCityId) return;
    if (cityId === HQ_ID) return;
    if (usedCityIds.has(cityId)) return;

    finalDestinations.push(cityData);
    usedCityIds.add(cityId);
  };

  if (correctCityId) {
    addCity(getLocationById(correctCityId, locationsData));
  }

  if (returnCityId) {
    addCity(getLocationById(returnCityId, locationsData));
  }

  const fillerCities = shuffle(
    locationsData.filter(loc => {
      const locId = loc?.id || normalizeCityId(loc?.city);
      return (
        loc &&
        loc.city &&
        locId &&
        locId !== currentCityId &&
        locId !== HQ_ID &&
        !usedCityIds.has(locId)
      );
    })
  );

  for (const cityData of fillerCities) {
    if (finalDestinations.length >= MAX_DESTINATIONS) break;
    addCity(cityData);
  }

  let result = ensureMustIncludeDestination(finalDestinations, locationsData);

  if (result.length < MAX_DESTINATIONS) {
    const alreadyUsed = new Set(
      result.map(loc => loc?.id || normalizeCityId(loc?.city)).filter(Boolean)
    );

    const topUpCities = shuffle(
      locationsData.filter(loc => {
        const locId = loc?.id || normalizeCityId(loc?.city);
        return (
          loc &&
          loc.city &&
          locId &&
          locId !== currentCityId &&
          locId !== HQ_ID &&
          !alreadyUsed.has(locId)
        );
      })
    );

    for (const cityData of topUpCities) {
      if (result.length >= MAX_DESTINATIONS) break;
      result.push(cityData);
      alreadyUsed.add(cityData.id || normalizeCityId(cityData.city));
    }
  }

  const deduped = [];
  const seen = new Set();

  for (const city of result) {
    const cityId = city?.id || normalizeCityId(city?.city);
    if (!cityId || seen.has(cityId) || cityId === currentCityId || cityId === HQ_ID) {
      continue;
    }
    seen.add(cityId);
    deduped.push(city);
    if (deduped.length >= MAX_DESTINATIONS) break;
  }

  return deduped;
}

function buildActiveEncounters(cityData) {
  if (!cityData) return [];

  if (Array.isArray(cityData.encounters) && cityData.encounters.length > 0) {
    return getRandomItems(
      cityData.encounters,
      Math.min(MAX_ENCOUNTERS, cityData.encounters.length)
    );
  }

  const locationPool = Array.isArray(cityData.locationPool)
    ? cityData.locationPool
    : Array.isArray(cityData.availableLocations)
    ? cityData.availableLocations
    : [];

  const npcPool = Array.isArray(cityData.npcPool)
    ? cityData.npcPool
    : Array.isArray(cityData.npc)
    ? cityData.npc
    : [];

  if (locationPool.length === 0 && npcPool.length === 0) return [];

  const chosenLocations = getRandomItems(
    locationPool,
    Math.min(MAX_ENCOUNTERS, locationPool.length)
  );

  return chosenLocations.map((locationId, index) => ({
    id: `${normalizeCityId(cityData.city)}_${npcPool[index] || 'bum'}_${locationId}`,
    npcId: npcPool[index] || 'bum',
    locationId,
    cityX: [420, 960, 1500][index] || 420,
    cityY: [700, 620, 700][index] || 700,
    enabled: true
  }));
}

function clearTravelCluesForCity(cityId) {
  if (!cityId || !Array.isArray(gameState.cluesCollected)) return;

  gameState.cluesCollected = gameState.cluesCollected.filter(clue => {
    if (!clue || typeof clue !== 'object') return true;
    if (clue.type !== 'travel') return true;

    return clue.cityId !== cityId && clue.value !== cityId;
  });
}

function getTravelDistance(fromCityName, toCityName, locationsData) {
  const from = getLocationByCity(fromCityName, locationsData);
  const to = getLocationByCity(toCityName, locationsData);

  if (!from?.map || !to?.map) {
    return null;
  }

  const dx = to.map.x - from.map.x;
  const dy = to.map.y - from.map.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getBaseTravelHoursFromDistance(distance) {
  if (typeof distance !== 'number' || Number.isNaN(distance)) {
    return DEFAULT_TRAVEL_HOURS;
  }

  if (distance < 250) return 4;
  if (distance < 600) return 8;
  return 12;
}

function rollTravelEncounter() {
  const shouldTrigger = Math.random() < TRAVEL_ENCOUNTER_CHANCE;
  if (!shouldTrigger) return null;

  const encounter = getRandomItem(TRAVEL_ENCOUNTERS);
  if (!encounter) return null;

  return structuredClone(encounter);
}

export function getTravelData(
  fromCityName,
  toCityName,
  locationsData,
  options = {}
) {
  const distance = getTravelDistance(fromCityName, toCityName, locationsData);
  const baseTravelHours = getBaseTravelHoursFromDistance(distance);

  const allowEncounter = options.allowEncounter === true;
  const encounter =
    options.travelEncounter !== undefined
      ? options.travelEncounter
      : allowEncounter
      ? rollTravelEncounter()
      : null;

  const encounterPenalty = encounter?.timePenalty || 0;
  const travelHours = baseTravelHours + encounterPenalty;

  return {
    fromCity: fromCityName,
    toCity: toCityName,
    distance,
    baseTravelHours,
    travelHours,
    travelEncounter: encounter,
    travelLabel: encounter
      ? `${baseTravelHours}h + ${encounterPenalty}h`
      : `${baseTravelHours}h`
  };
}

export function getTravelHours(fromCityName, toCityName, locationsData) {
  return getTravelData(fromCityName, toCityName, locationsData).travelHours;
}

export function getDestinationPreviewData(locationsData) {
  if (!Array.isArray(gameState.currentDestinations)) return [];

  return gameState.currentDestinations.map(loc => {
    const travelData = getTravelData(
      gameState.currentCity,
      loc.city,
      locationsData,
      { allowEncounter: false }
    );

    return {
      ...loc,
      travelHours: travelData.travelHours,
      baseTravelHours: travelData.baseTravelHours,
      travelLabel: travelData.travelLabel,
      isCorrect:
        (loc.id || normalizeCityId(loc.city)) === gameState.nextTargetCityId
    };
  });
}

export function setupNewGame(suspectsData, missionsData, locationsData) {
  validateSetupData(suspectsData, missionsData, locationsData);

  clearSavedGame();
  resetGameState();

  gameState.finalArrestResult = null;
  gameState.finalArrestSuspectId = null;
  gameState.caseResolved = false;
  gameState.caseFailed = false;
  gameState.crimeSceneVisited = false;
  gameState.storyPhoneCallTriggered = false;
  gameState.pendingPhoneCall = false;
  gameState.pendingPhoneCallCityId = null;

  const thief = getRandomItem(suspectsData);
  const mission = getRandomItem(missionsData);

  if (!thief) throw new Error('Failed to select a thief.');
  if (!mission || !mission.city) throw new Error('Failed to select a valid mission.');

  const crimeCityData = locationsData.find(location => location.city === mission.city);
  const hqData = locationsData.find(
    location => location.city === HQ_CITY || location.id === HQ_ID
  );

  if (!crimeCityData) {
    throw new Error(`No location data found for city: ${mission.city}`);
  }

  if (!hqData) {
    throw new Error(`No HQ location data found for city: ${HQ_CITY}`);
  }

  const crimeCityId = crimeCityData.id || normalizeCityId(crimeCityData.city);

  const availableEscapeRouteIds = shuffle(
    locationsData
      .filter(loc => {
        const locId = loc.id || normalizeCityId(loc.city);
        return loc?.city && locId !== crimeCityId && locId !== HQ_ID;
      })
      .map(loc => loc.id || normalizeCityId(loc.city))
  ).slice(0, ESCAPE_ROUTE_LENGTH);

  gameState.currentThiefId = thief.id ?? null;
  gameState.currentThief = structuredClone(thief);
  gameState.currentMission = structuredClone(mission);
  gameState.currentArtifact = mission.artifact ?? null;

  gameState.currentCity = hqData.city;
  gameState.currentCityId = hqData.id || HQ_ID;
  gameState.currentCityData = structuredClone(hqData);
  gameState.currentEncounterId = null;

  gameState.crimeCity = crimeCityData.city;
  gameState.crimeCityId = crimeCityId;
  gameState.activeLocations = [];
  gameState.currentDestinations = [];
  gameState.escapeRoute = availableEscapeRouteIds;
  gameState.routeIndex = -1;
  gameState.nextTargetCity = crimeCityData.city;
  gameState.nextTargetCityId = crimeCityId;
  gameState.mustIncludeCityId = crimeCityId;
  gameState.justReachedCorrectCityId = null;

  gameState.canonicalTravelCityId = crimeCityId;
  gameState.clueScope = 'crime_scene';

  gameState.score = 0;
  gameState.playerRank = 'Junior Agent';
  gameState.isGameActive = true;

  gameState.cluesCollected = [];
  gameState.visitedEncounters = [];
  gameState.visitedCities = [gameState.currentCityId];
  gameState.playerNotes = '';
  gameState.timeSpent = 0;
  gameState.travelHistory = [];
  gameState.lastTravel = null;
  gameState.lastTravelEncounter = null;

  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

  window.GAMESTATE = gameState;
  console.log('[NOWA GRA] Start:', {
    thief: thief.name,
    crimeCity: gameState.crimeCity,
    crimeCityId: gameState.crimeCityId,
    escapeRoute: gameState.escapeRoute,
    canonicalTravelCityId: gameState.canonicalTravelCityId,
    clueScope: gameState.clueScope
  });

  saveGameState();
  return gameState;
}

export function enterCity(cityName, locationsData) {
  const cityData = getLocationByCity(cityName, locationsData);
  if (!cityData) throw new Error(`No location data found for city: ${cityName}`);

  const cityId = cityData.id || normalizeCityId(cityData.city);

  gameState.currentCity = cityData.city;
  gameState.currentCityId = cityId;
  gameState.currentCityData = structuredClone(cityData);
  gameState.currentEncounterId = null;
  gameState.activeLocations = buildActiveEncounters(cityData);

  if (!Array.isArray(gameState.visitedCities)) {
    gameState.visitedCities = [];
  }

  if (!gameState.visitedCities.includes(cityId)) {
    gameState.visitedCities.push(cityId);
  }

  if (gameState.currentCityId === gameState.crimeCityId) {
    gameState.crimeSceneVisited = true;
  }

  syncInvestigationState(locationsData);

  if (gameState.mustIncludeCityId && gameState.currentCityId === gameState.mustIncludeCityId) {
    gameState.mustIncludeCityId = null;
  }

  return gameState.currentCityData;
}

export function markEncounterVisited(encounterId, clue = null) {
  if (!encounterId) return;

  if (!gameState.visitedEncounters.includes(encounterId)) {
    gameState.visitedEncounters.push(encounterId);
  }

  if (clue?.id && !gameState.cluesCollected.some(item => item.id === clue.id)) {
    gameState.cluesCollected.push(clue);
    gameState.score += 50;
  }

  saveGameState();
}

export function advanceInvestigation(locationsData) {
  gameState.routeIndex += 1;

  if (!Array.isArray(gameState.escapeRoute)) {
    gameState.escapeRoute = [];
  }

  if (gameState.routeIndex >= gameState.escapeRoute.length) {
    syncInvestigationState(locationsData);
    gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
    gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
    gameState.currentDestinations = [];
    saveGameState();
    return 'FINAL_SHOWDOWN';
  }

  const nextCityId = gameState.escapeRoute[gameState.routeIndex] ?? null;
  const nextCityData = getLocationById(nextCityId, locationsData);

  if (!nextCityId || !nextCityData) {
    console.error('[advanceInvestigation] invalid next city', {
      routeIndex: gameState.routeIndex,
      escapeRoute: gameState.escapeRoute,
      nextCityId
    });
    gameState.routeIndex = gameState.escapeRoute.length;
    syncInvestigationState(locationsData);
    gameState.currentDestinations = [];
    saveGameState();
    return 'FINAL_SHOWDOWN';
  }

  syncInvestigationState(locationsData);
  gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
  gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

  console.log('[advanceInvestigation]', {
    routeIndex: gameState.routeIndex,
    currentCity: gameState.currentCity,
    currentCityId: gameState.currentCityId,
    nextTargetCity: gameState.nextTargetCity,
    nextTargetCityId: gameState.nextTargetCityId,
    canonicalTravelCityId: gameState.canonicalTravelCityId,
    clueScope: gameState.clueScope,
    escapeRoute: gameState.escapeRoute
  });

  saveGameState();
  return gameState.routeIndex === 0 ? 'CRIME_SCENE_REACHED' : 'CONTINUE';
}

export function completeCityInvestigation(locationsData) {
  const currentCityId = gameState.currentCityId;
  const targetCityId = gameState.nextTargetCityId;
  const justReachedCorrectCityId = gameState.justReachedCorrectCityId || null;

  const isPlayerInResolvableCity = Boolean(
    currentCityId &&
      (
        currentCityId === targetCityId ||
        currentCityId === justReachedCorrectCityId
      )
  );

  if (!currentCityId) {
    return { success: false, status: 'NO_ACTIVE_TARGET' };
  }

  if (!isPlayerInResolvableCity) {
    return { success: false, status: 'WRONG_CITY' };
  }

  gameState.justReachedCorrectCityId = null;

  const status = advanceInvestigation(locationsData);
  saveGameState();

  return {
    success: true,
    status
  };
}

export function travelToCity(cityName, locationsData) {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;

  if (cityName === previousCity) {
    return {
      wasCorrect: false,
      travelHours: 0,
      baseTravelHours: 0,
      travelEncounter: null,
      status: 'ALREADY_HERE',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: previousCityId,
      cityId: previousCityId,
      isCrimeSceneArrival: previousCityId === gameState.crimeCityId
    };
  }

  const travelData = getTravelData(previousCity, cityName, locationsData, {
    allowEncounter: true
  });

  const destinationCityData = getLocationByCity(cityName, locationsData);
  const destinationCityId =
    destinationCityData?.id || normalizeCityId(cityName);
  const expectedTargetCityId = gameState.nextTargetCityId;
  const wasCorrect = Boolean(
    destinationCityId &&
      expectedTargetCityId &&
      destinationCityId === expectedTargetCityId
  );
  const isCrimeSceneArrival = destinationCityId === gameState.crimeCityId;

  console.log('[travelToCity] validation', {
    fromCity: previousCity,
    toCity: cityName,
    destinationCityId,
    expectedTargetCityId,
    canonicalTravelCityId: gameState.canonicalTravelCityId,
    clueScope: gameState.clueScope,
    wasCorrect,
    routeIndex: gameState.routeIndex,
    escapeRoute: gameState.escapeRoute,
    baseTravelHours: travelData.baseTravelHours,
    travelHours: travelData.travelHours,
    travelEncounter: travelData.travelEncounter
  });

  gameState.timeSpent += travelData.travelHours;

  const travelRecord = {
    from: previousCity,
    fromCityId: previousCityId,
    to: cityName,
    toCityId: destinationCityId,
    hours: travelData.travelHours,
    baseHours: travelData.baseTravelHours,
    wasCorrect,
    encounter: travelData.travelEncounter,
    travelLabel: travelData.travelLabel
  };

  if (!Array.isArray(gameState.travelHistory)) {
    gameState.travelHistory = [];
  }

  gameState.lastTravel = travelRecord;
  gameState.lastTravelEncounter = travelData.travelEncounter;
  gameState.travelHistory.push(travelRecord);

  enterCity(cityName, locationsData);
  clearTravelCluesForCity(destinationCityId);

  if (isCrimeSceneArrival) {
    gameState.crimeSceneVisited = true;
    syncInvestigationState(locationsData);
  }

  if (wasCorrect) {
    gameState.score += 100;
    gameState.justReachedCorrectCityId = destinationCityId;

    const finalRouteCityId = Array.isArray(gameState.escapeRoute) && gameState.escapeRoute.length > 0
      ? gameState.escapeRoute[gameState.escapeRoute.length - 1]
      : null;

    const isFinalRouteCity =
      !isCrimeSceneArrival &&
      destinationCityId &&
      finalRouteCityId &&
      destinationCityId === finalRouteCityId;

    if (isFinalRouteCity) {
      gameState.routeIndex = gameState.escapeRoute.length;
      gameState.justReachedCorrectCityId = null;
      syncInvestigationState(locationsData);
      gameState.currentDestinations = [];
      gameState.activeLocations = [];
      saveGameState();

      return {
        wasCorrect,
        travelHours: travelData.travelHours,
        baseTravelHours: travelData.baseTravelHours,
        travelEncounter: travelData.travelEncounter,
        status: 'FINAL_SHOWDOWN',
        fromCity: previousCity,
        toCity: cityName,
        toCityId: destinationCityId,
        cityId: destinationCityId,
        isCrimeSceneArrival
      };
    }

    saveGameState();

    return {
      wasCorrect,
      travelHours: travelData.travelHours,
      baseTravelHours: travelData.baseTravelHours,
      travelEncounter: travelData.travelEncounter,
      status: isCrimeSceneArrival
        ? 'CRIME_SCENE_REACHED'
        : 'CORRECT_CITY_REACHED',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: destinationCityId,
      cityId: destinationCityId,
      isCrimeSceneArrival
    };
  }

  gameState.justReachedCorrectCityId = null;
  syncInvestigationState(locationsData);
  gameState.score = Math.max(0, gameState.score - 25);
  gameState.currentDestinations = generateDestinationsForCurrentCity(
    locationsData
  );
  saveGameState();

  return {
    wasCorrect,
    travelHours: travelData.travelHours,
    baseTravelHours: travelData.baseTravelHours,
    travelEncounter: travelData.travelEncounter,
    status: 'FALSE_LEAD',
    fromCity: previousCity,
    toCity: cityName,
    toCityId: destinationCityId,
    cityId: destinationCityId,
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

  saveGameState();

  return {
    success,
    selectedSuspectId: selectedSuspectId ?? null,
    thiefId: thiefId ?? null,
    nextScene: success ? 'SuccessScene' : 'GameOverScene'
  };
}