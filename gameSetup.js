import { gameState, resetGameState, resetCaseOutcomeState } from '../GameData.js';
import { saveGameState, clearSavedGame } from '../GameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import SuspectGenerator from '../SuspectGenerator.js';
import { getEnergyManager } from '../EnergyManager.js';
import {
  HQ_CITY,
  HQ_ID,
  ESCAPE_ROUTE_LENGTH,
  SUSPECT_DATA_URL,
  SUSPECT_FETCH_RETRIES,
  SUSPECT_FETCH_RETRY_DELAY_MS,
  STARTING_AGENCY_BUDGETS
} from './TransportConfig.js';
import {
  resolveLocationId,
  getLocationByCity,
  validateSetupData,
  isTransportAvailable
} from './ui/LocationUI.js';
import {
  getTransportConfig,
  getTravelData,
  getTravelHours,
  getDestinationPreviewData
} from './TravelManager.js';
import {
  getScoreManager,
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity,
  clearTravelCluesForCity,
  enterCity,
  addSessionScore
} from './InvestigationManager.js';
import { RouteManager } from './RouteManager.js';

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getRandomItem(items) {
  return Array.isArray(items) && items.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;
}

function syncScoreFromManager() {
  const manager = getScoreManager();
if (typeof getScoreManager()?.startSession === 'function') {
  getScoreManager().startSession({
    reset: true
  });
}
}

async function fetchCaseSuspects(thief, crimeCityId) {
  let lastError = null;

  for (let attempt = 0; attempt <= SUSPECT_FETCH_RETRIES; attempt += 1) {
    try {
      const response = await fetch(SUSPECT_DATA_URL);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const citySuspectsData = await response.json();
      const suspectGenerator = new SuspectGenerator(citySuspectsData);

      const thiefForensics =
        thief?.restrictedProfile?.forensicAttributes ||
        thief?.forensicAttributes ||
        {};

      const requiredProfile = {
        hair_color:
          thiefForensics?.hair_color?.value ||
          thiefForensics?.hair_color ||
          'black',
        shoe_size_category:
          thiefForensics?.shoe_size_category?.value ||
          thiefForensics?.shoe_size_category ||
          'large'
      };

      const hardEvidence = [
        {
          id: 'lab_hair_sample',
          field: 'hair_color',
          value: requiredProfile.hair_color
        },
        {
          id: 'lab_shoe_print',
          field: 'shoe_size_category',
          value: requiredProfile.shoe_size_category
        }
      ];

      const caseData = suspectGenerator.generateCaseSuspects(
        thief,
        crimeCityId,
        {
          total: 10,
          hardEvidence
        }
      );

      suspectGenerator.prepareCaseState(caseData);

      gameState.currentMission.forensicHardEvidence = structuredClone(hardEvidence);
      gameState.currentMission.requiredForensicProfile = structuredClone(requiredProfile);

      return caseData;
    } catch (error) {
      lastError = error;

      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, SUSPECT_FETCH_RETRY_DELAY_MS)
        );
      }
    }
  }

  throw new Error(
    `Failed to load suspects: ${lastError?.message || lastError}`
  );
}

export async function setupNewGame(
  suspectsData,
  missionsData,
  locationsData,
  difficulty = 'field'
) {
  validateSetupData(suspectsData, missionsData, locationsData);
  clearSavedGame();
  resetGameState();
  resetCaseOutcomeState();

  const energyManager = getEnergyManager();
  energyManager.restore({
    energy: gameState.energy,
    maxEnergy: gameState.maxEnergy,
    difficulty: gameState.difficulty,
    energyLog: gameState.energyLog
  });

  if (typeof getScoreManager()?.startSession === 'function') {
getScoreManager().startSession({
  reset: true
});
  }

  const thief = getRandomItem(suspectsData);
  const crimeCities = locationsData.filter(
    (location) => location.isCrimeCity === true
  );
  const mission = getRandomItem(
    missionsData.filter((item) =>
      crimeCities.some((city) => city.city === item.city)
    )
  );
  const crimeCityData = crimeCities.find(
    (city) => city.city === mission?.city
  );
  const hqData = locationsData.find(
    (location) => location.id === HQ_ID || location.city === HQ_CITY
  );

  if (!thief || !mission || !crimeCityData || !hqData) {
    throw new Error('Could not create a valid case.');
  }

  const crimeCityId = resolveLocationId(crimeCityData, 'crime city');
  const escapeRoute = shuffle(
    locationsData
      .filter((location) => {
        const id = resolveLocationId(location, 'escape route');
        return location?.city && id !== crimeCityId && id !== HQ_ID;
      })
      .map((location) => resolveLocationId(location, 'escape route'))
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
    escapeRoute: [...escapeRoute],
    routeManager: null,
    routeIndex: -1,
    nextTargetCity: null,
    nextTargetCityId: null,
    mustIncludeCityId: null,
    canonicalTravelCityId: null,
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
    traceEvidence: [],
    energy: energyManager.getCurrentEnergy(),
    difficulty,
    agencyBudget: STARTING_AGENCY_BUDGETS[difficulty] ?? STARTING_AGENCY_BUDGETS.field,
    agencyDebt: 0,
    moneyLog: []
  });

  // Ważne: nie używamy getRouteManager() tutaj. Przed Object.assign()
  // mógł on odtworzyć manager z poprzedniej sprawy albo z nieaktualnym crimeCityId.
  // Świeży manager z aktualnym crimeCityId startuje w fazie CRIME_CITY.
  gameState.routeManager = new RouteManager(
    gameState.escapeRoute,
    gameState.crimeCityId
  );

  await fetchCaseSuspects(gameState.currentThief, crimeCityId);

  // Ustawia spójnie nextTargetCityId, mustIncludeCityId i canonicalTravelCityId.
  // Paryż / wybrane Crime City jest wstawiane przed fillerami na mapie.
  syncInvestigationState(locationsData);
  gameState.currentDestinations = generateDestinationsForCurrentCity(locationsData);

  syncScoreFromManager();

  window.GAMESTATE = gameState;
  saveGameState();
  return gameState;
}

export function travelToCity(cityName, locations, transportType = 'plane') {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;

  const origin = getLocationByCity(previousCity, locations);
  const destination = getLocationByCity(cityName, locations);

  if (!origin || !destination) {
    throw new Error('Origin or destination city data is missing.');
  }

  const config = getTransportConfig(transportType);
  if (!config) {
    throw new Error(`Unknown transport type: ${transportType}`);
  }

  if (!isTransportAvailable(origin, destination, transportType)) {
    throw new Error(`${transportType} is unavailable for this route.`);
  }

  if (cityName === previousCity) {
    return {
      wasCorrect: false,
      transportType,
      transportLabel: config.label,
      travelHours: 0,
      baseTravelHours: 0,
      moneySpent: 0,
      energyChange: 0,
      travelEncounter: null,
      status: 'ALREADY_HERE',
      fromCity: previousCity,
      toCity: cityName,
      toCityId: previousCityId,
      cityId: previousCityId,
      isCrimeSceneArrival: previousCityId === gameState.crimeCityId
    };
  }

  const travel = getTravelData(previousCity, cityName, locations, {
    allowEncounter: true,
    transportType
  });
  const destinationId = resolveLocationId(destination, 'travelToCity');
  const energyManager = getEnergyManager();

  const energyCost = Math.abs(Number(travel.estimatedEnergyChange) || 0);
  const energyBefore = energyManager.getCurrentEnergy();

  const energyResult = typeof energyManager.consumeCustom === 'function'
    ? energyManager.consumeCustom(
      energyCost,
      `Travel (${travel.transportLabel}): -${energyCost}`
    )
    : energyManager.consumeTravel(transportType);

  const energyAfter = energyManager.getCurrentEnergy();
  const energyChange = energyAfter - energyBefore;
  gameState.energy = energyAfter;

  const payment = { debtAdded: 0 };
  const manager = getRouteManager();
  const wasCorrect = manager.canEnterCity(destinationId);
  const isCrimeSceneArrival = destinationId === gameState.crimeCityId;

  gameState.timeSpent = (gameState.timeSpent || 0) + travel.travelHours;

  const record = {
    from: previousCity,
    fromCityId: previousCityId,
    to: cityName,
    toCityId: destinationId,
    transportType,
    transportLabel: travel.transportLabel,
    hours: travel.travelHours,
    baseHours: travel.baseTravelHours,
    moneySpent: travel.moneySpent,
    energyChange,
    agencyDebtAdded: payment.debtAdded,
    wasCorrect,
    encounter: travel.travelEncounter,
    travelLabel: travel.travelLabel
  };

  if (!Array.isArray(gameState.travelHistory)) {
    gameState.travelHistory = [];
  }

  gameState.lastTravel = record;
  gameState.lastTravelEncounter = travel.travelEncounter;
  gameState.travelHistory.push(record);

  enterCity(cityName, locations);
  clearTravelCluesForCity(destinationId);

  const isFinalRouteCity =
    wasCorrect &&
    manager.isRoutePhase() &&
    manager.currentRouteIndex === manager.route.length - 1;

  addSessionScore(
    wasCorrect ? 100 : -25,
    wasCorrect ? `Correct city: ${cityName}` : `False city: ${cityName}`
  );

  if (isFinalRouteCity) {
    manager.enterCity(destinationId);
    syncInvestigationState(locations);

    gameState.justReachedCorrectCityId = null;
    gameState.currentDestinations = [];
    gameState.activeLocations = [];

    saveGameState();

    return {
      wasCorrect: true,
      ...travel,
      energyChange,
      agencyDebtAdded: payment.debtAdded,
      energyReachedZero: Boolean(energyResult?.energyReachedZero),
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
    ...travel,
    energyChange,
    agencyDebtAdded: payment.debtAdded,
    energyReachedZero: Boolean(energyResult?.energyReachedZero),
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