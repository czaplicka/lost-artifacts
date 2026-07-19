import { gameState, resetGameState } from './gamedata.js';

const HQ_CITY = 'Mark Agency Headquarters';
const HQ_ID = 'hq';
const DEFAULT_TRAVEL_HOURS = 8;
const MAX_DESTINATIONS = 5;
const MAX_ENCOUNTERS = 3;
const ESCAPE_ROUTE_LENGTH = 4;

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
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
        'London': 'london',
        'Paris': 'paris',
        'New Delhi': 'newdelhi',
        'Warsaw': 'warsaw',
        'New York City': 'newyorkcity',
        'Berlin': 'berlin',
        'Mark Agency Headquarters': 'hq'
    };

    if (!cityName || typeof cityName !== 'string') return null;

    return map[cityName] || cityName.toLowerCase().replace(/\s+/g, '_');
}

function getLocationByCity(cityName, locationsData) {
    if (!Array.isArray(locationsData)) return null;
    return locationsData.find(loc => loc.city === cityName) || null;
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

function generateDestinationsForCurrentCity(locationsData) {
    const currentCity = gameState.currentCity;
    const correctCity = gameState.nextTargetCity;

    const availableCities = locationsData.filter(loc =>
        loc &&
        loc.city &&
        loc.city !== currentCity &&
        loc.city !== correctCity &&
        loc.city !== HQ_CITY
    );

    const finalDestinations = shuffle(availableCities).slice(0, MAX_DESTINATIONS - 1);

    if (correctCity) {
        const correctCityData = locationsData.find(loc => loc.city === correctCity);

        if (correctCityData && !finalDestinations.some(loc => loc.city === correctCity)) {
            finalDestinations.push(correctCityData);
        }
    }

    return shuffle(finalDestinations);
}

function buildActiveEncounters(cityData) {
    if (!cityData) return [];

    if (Array.isArray(cityData.encounters) && cityData.encounters.length > 0) {
        return getRandomItems(cityData.encounters, Math.min(MAX_ENCOUNTERS, cityData.encounters.length));
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

    if (locationPool.length === 0 || npcPool.length === 0) {
        return [];
    }

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

export function getTravelHours(fromCityName, toCityName, locationsData) {
    const from = getLocationByCity(fromCityName, locationsData);
    const to = getLocationByCity(toCityName, locationsData);

    if (!from?.map || !to?.map) return DEFAULT_TRAVEL_HOURS;

    const dx = to.map.x - from.map.x;
    const dy = to.map.y - from.map.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 250) return 4;
    if (distance < 600) return 8;
    return 12;
}

export function getDestinationPreviewData(locationsData) {
    if (!Array.isArray(gameState.currentDestinations)) return [];

    return gameState.currentDestinations.map(loc => ({
        ...loc,
        travelHours: getTravelHours(gameState.currentCity, loc.city, locationsData),
        isCorrect: loc.city === gameState.nextTargetCity
    }));
}

export function setupNewGame(suspectsData, missionsData, locationsData) {
    validateSetupData(suspectsData, missionsData, locationsData);
    resetGameState();

    const thief = getRandomItem(suspectsData);
    const mission = getRandomItem(missionsData);

    if (!thief) {
        throw new Error('Failed to select a thief.');
    }

    if (!mission || !mission.city) {
        throw new Error('Failed to select a valid mission.');
    }

    const crimeCityData = locationsData.find(location => location.city === mission.city);
    const hqData = locationsData.find(location => location.city === HQ_CITY || location.id === HQ_ID);

    if (!crimeCityData) {
        throw new Error(`No location data found for city: ${mission.city}`);
    }

    if (!hqData) {
        throw new Error(`No HQ location data found for city: ${HQ_CITY}`);
    }

    gameState.currentThief = thief;
    gameState.currentMission = mission;
    gameState.currentArtifact = mission.artifact ?? null;

    gameState.currentCity = hqData.city;
    gameState.currentCityId = hqData.id || HQ_ID;
    gameState.currentCityData = hqData;
    gameState.currentEncounterId = null;

    gameState.activeLocations = [];
    gameState.currentDestinations = [];
    gameState.escapeRoute = [];
    gameState.routeIndex = -1;
    gameState.nextTargetCity = mission.city;

    gameState.score = 0;
    gameState.playerRank = 'Junior Agent';
    gameState.isGameActive = true;

    gameState.cluesCollected = [];
    gameState.visitedEncounters = [];
    gameState.visitedCities = [hqData.city];
    gameState.playerNotes = '';

    gameState.timeSpent = 0;
    gameState.travelHistory = [];
    gameState.lastTravel = null;

    const availableCities = locationsData
        .map(loc => loc.city)
        .filter(city => city && city !== mission.city && city !== HQ_CITY);

    gameState.escapeRoute = shuffle(availableCities).slice(0, ESCAPE_ROUTE_LENGTH);
    gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

    console.log(`[NOWA GRA] Złodziej: ${thief.name}`);
    console.log(`[NOWA GRA] Start w HQ: ${gameState.currentCity}`);
    console.log(`[NOWA GRA] Pierwszy lot na miejsce zbrodni do: ${mission.city}`);
    console.log(`[NOWA GRA] Trasa ucieczki (później): ${gameState.escapeRoute.join(' -> ')}`);

    return gameState;
}

export function enterCity(cityName, locationsData) {
    const cityData = getLocationByCity(cityName, locationsData);

    if (!cityData) {
        throw new Error(`No location data found for city: ${cityName}`);
    }

    gameState.currentCity = cityData.city;
    gameState.currentCityId = cityData.id || normalizeCityId(cityData.city);
    gameState.currentCityData = cityData;
    gameState.currentEncounterId = null;
    gameState.activeLocations = buildActiveEncounters(cityData);

    if (!gameState.visitedCities.includes(cityData.city)) {
        gameState.visitedCities.push(cityData.city);
    }

    return gameState.currentCityData;
}

export function markEncounterVisited(encounterId, clue = null) {
    if (!encounterId) return;

    if (!gameState.visitedEncounters.includes(encounterId)) {
        gameState.visitedEncounters.push(encounterId);
    }

    if (clue && clue.id && !gameState.cluesCollected.some(item => item.id === clue.id)) {
        gameState.cluesCollected.push(clue);
        gameState.score += 50;
    }
}

export function advanceInvestigation(locationsData) {
    gameState.routeIndex += 1;

    if (gameState.routeIndex === 0) {
        gameState.nextTargetCity = gameState.escapeRoute[gameState.routeIndex] || null;
        gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
        gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
        gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);
        return 'CRIME_SCENE_REACHED';
    }

    if (gameState.routeIndex >= gameState.escapeRoute.length) {
        gameState.nextTargetCity = null;
        gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
        gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
        gameState.currentDestinations = [];
        return 'FINAL_SHOWDOWN';
    }

    gameState.nextTargetCity = gameState.escapeRoute[gameState.routeIndex];
    gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
    gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
    gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

    console.log(`Złodziej przemieścił się! Nowy cel to: ${gameState.nextTargetCity}`);
    return 'CONTINUE';
}

export function travelToCity(cityName, locationsData) {
    const previousCity = gameState.currentCity;
    const travelHours = getTravelHours(previousCity, cityName, locationsData);
    const wasCorrect = cityName === gameState.nextTargetCity;

    gameState.timeSpent += travelHours;

    const travelRecord = {
        from: previousCity,
        to: cityName,
        hours: travelHours,
        wasCorrect
    };

    gameState.lastTravel = travelRecord;
    gameState.travelHistory.push(travelRecord);

    enterCity(cityName, locationsData);

    if (wasCorrect) {
        gameState.score += 100;

        const status = advanceInvestigation(locationsData);

        return {
            wasCorrect,
            travelHours,
            status,
            fromCity: previousCity,
            toCity: cityName
        };
    }

    gameState.score = Math.max(0, gameState.score - 25);
    gameState.currentCityData = getLocationByCity(gameState.currentCity, locationsData);
    gameState.activeLocations = buildActiveEncounters(gameState.currentCityData);
    gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

    return {
        wasCorrect,
        travelHours,
        status: 'WRONG_CITY',
        fromCity: previousCity,
        toCity: cityName
    };
}