// GameSetup.js
import {
  gameState,
  resetGameState,
  resetCaseOutcomeState
} from './GameData.js';

import {
  saveGameState,
  clearSavedGame
} from './GameStatePersistence.js';

import { EventBus } from './EventBus.js';
import SuspectGenerator from './suspects/SuspectGenerator.js';

import {
  normalizeHardEvidence
} from './suspects/forensicEvidence.js';

import { getEnergyManager } from './managers/EnergyManager.js';
import { getRankManager } from './managers/RankManager.js';
import { CaseDirector } from './CaseDirector.js';

import caseModifiers from './assets/data/caseModifiers.json' with {
  type: 'json'
};

import onboardingSchedule from './assets/data/onboardingSchedule.json' with {
  type: 'json'
};

import { CrimeLabManager } from './scenes/CSI/CrimeLabManager.js';

import {
  createUnifiedTravelManager,
  getUnifiedTravelManager
} from './managers/UnifiedTravelManager.js';

import { drawMotive } from './motiveService.js';

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
  getScoreManager,
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity,
  clearTravelCluesForCity,
  enterCity,
  addSessionScore
} from './managers/InvestigationManager.js';

import { RouteManager } from './managers/RouteManager.js';

const RANK_TO_SCHEDULE_KEY = {
  'Junior Agent': '0',
  'Field Agent': '1',
  'Senior Agent': '2',
  'Lead Investigator': '4'
};

// Minutes from midnight in the crime city's local time.
const CRIME_WINDOW_START_MINUTES = [
  18 * 60,
  19 * 60,
  20 * 60,
  21 * 60
];

const CRIME_WINDOW_DURATION_MINUTES = 15;

// Case-relative day of the theft, before the investigation starts.
// This is not gameState.currentDay and does not advance during play.
const CRIME_DAY = 0;

let currentMotive = null;

function resolveCaseIndexFromRank(rankId) {
  return Number(
    RANK_TO_SCHEDULE_KEY[rankId] ??
    Object.keys(RANK_TO_SCHEDULE_KEY).length
  );
}

function buildCaseDirector() {
  const rankId = getRankManager().getCurrentRank().id;
  const key = RANK_TO_SCHEDULE_KEY[rankId];

  const forcedStages =
    key !== undefined
      ? onboardingSchedule[key] || {}
      : {};

  const caseDirector = new CaseDirector(caseModifiers);

  const template = caseDirector.generate(
    resolveCaseIndexFromRank(rankId),
    forcedStages
  );

  return {
    caseDirector,
    template
  };
}

function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i]
    ];
  }

  return result;
}

function getRandomItem(items) {
  return Array.isArray(items) && items.length
    ? items[Math.floor(Math.random() * items.length)]
    : null;
}

export function getCurrentMotive() {
  return currentMotive;
}

function ensureCaseDataShaped() {
  if (
    !gameState.caseData ||
    typeof gameState.caseData !== 'object'
  ) {
    gameState.caseData = {};
  }

  if (!Array.isArray(gameState.caseData.motiveStagesDone)) {
    gameState.caseData.motiveStagesDone = [];
  }
}

function createEmptyCaseData() {
  return {
    motiveId: null,
    correctMotiveAnswerId: null,
    motiveStagesDone: [],
    motiveBoardUnlocked: false,
    crimeWindow: null
  };
}

function setupCaseCrimeWindow() {
  ensureCaseDataShaped();

  // Do not reroll a window already assigned to this case.
  if (gameState.caseData.crimeWindow != null) {
    return gameState.caseData.crimeWindow;
  }

  const startMinute = getRandomItem(
    CRIME_WINDOW_START_MINUTES
  );

  if (!Number.isInteger(startMinute)) {
    throw new Error('Could not generate the crime time window.');
  }

  const crimeWindow = {
    day: CRIME_DAY,
    startMinute,
    endMinute: startMinute + CRIME_WINDOW_DURATION_MINUTES
  };

  gameState.caseData.crimeWindow = crimeWindow;

  return crimeWindow;
}

function setupCaseMotive() {
  currentMotive = drawMotive();

  Object.assign(gameState.caseData, {
    motiveId: currentMotive.id,
    correctMotiveAnswerId: currentMotive.crimeBoard.answerId,
    motiveStagesDone: [],
    motiveBoardUnlocked: false
  });

  return currentMotive;
}

function syncScoreFromManager() {
  const manager = getScoreManager();

  if (typeof manager?.startSession === 'function') {
    manager.startSession({ reset: true });
  }
}

function resetForensicCaseState() {
  Object.assign(gameState, {
    caseSuspects: [],
    suspects: [],
    suspectList: [],
    excludedSuspects: [],

    identityEvidence: null,
    traceEvidence: [],
    identityEvidenceResult: null,

    hypothesisEvidence: null,
    hypothesisEvidenceResult: null,
    hypothesisAttempts: [],

    forensicResults: [],
    interviewEvidenceResults: [],
    csiLabCompleted: false,

    caseCsiAssignments: {},
    caseForensics: {},
    crimeCityProgress: {},

    suspectExclusionState: {},
    suspectGridInput: null,
    alibiInvestigation: null,

    crimeCityEncounterState: {},
    alibiAccusations: {},
    reconstructedHeist: null,

    selectedThiefProfile: null,
    selectedThief: null,
    thief: null,

    realThiefSuspectId: null,
    trueThiefCaseSuspectId: null,
    forensicTwinSuspectId: null,

    forensicSurvivorIds: [],
    selectedSuspectId: null,
    currentCaseId: null
  });
}

async function fetchCaseSuspects(thief, crimeCityId) {
  const lab = new CrimeLabManager(gameState, crimeCityId);

  const identityEvidence = lab.ensureIdentityEvidence();
  const traceEvidence = lab.ensureRandomTraceEvidence();

  const assigned = [
    identityEvidence,
    ...traceEvidence
  ];

  const normalized = normalizeHardEvidence(assigned);

  if (normalized.length !== 3) {
    throw new Error(
      'Case setup requires three usable forensic clues.'
    );
  }

  const hardEvidence = normalized.map(
    ({ matches, ...evidence }) => evidence
  );

  // Retry downloading only; do not disguise generation errors as fetch errors.
  let citySuspectsData;
  let lastError;

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

      citySuspectsData = await response.json();
      break;
    } catch (error) {
      lastError = error;

      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise((resolve) => {
          setTimeout(
            resolve,
            SUSPECT_FETCH_RETRY_DELAY_MS
          );
        });
      }
    }
  }

  if (citySuspectsData === undefined) {
    throw new Error(
      `Failed to load suspects: ${lastError?.message || lastError}`
    );
  }

  const generator = new SuspectGenerator(citySuspectsData);

  const caseData = generator.generateCaseSuspects(
    thief,
    crimeCityId,
    {
      total: 10,
      hardEvidence
    }
  );

  generator.prepareCaseState(caseData);

  gameState.currentMission.forensicHardEvidence =
    structuredClone(caseData.hardEvidence);

  gameState.currentMission.requiredForensicProfile =
    Object.fromEntries(
      caseData.hardEvidence.map((evidence) => [
        evidence.forensicField,
        evidence.normalizedValue
      ])
    );

  gameState.currentMission.traceEvidence =
    structuredClone(traceEvidence);

  saveGameState();

  return caseData;
}

export async function setupNewGame(
  suspectsData,
  missionsData,
  locationsData,
  difficulty = 'field'
) {
  validateSetupData(
    suspectsData,
    missionsData,
    locationsData
  );

  clearSavedGame();
  resetGameState();
  resetCaseOutcomeState();

  const energyManager = getEnergyManager();
  energyManager.init(difficulty);

  const travelManager = createUnifiedTravelManager();
  travelManager.init();

  const investigationStartTime =
    gameState.getState().timeSpent || 0;

  gameState.updateState({
    investigationPhaseActive: true,
    investigationStartTime,
    investigationDeadline: investigationStartTime + 4 * 24,
    escapePhaseActive: false
  });

  getRankManager().init();

  if (typeof getScoreManager()?.startSession === 'function') {
    getScoreManager().startSession({ reset: true });
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
    (location) =>
      location.id === HQ_ID ||
      location.city === HQ_CITY
  );

  if (!thief || !mission || !crimeCityData || !hqData) {
    throw new Error('Could not create a valid case.');
  }

  const crimeCityId = resolveLocationId(
    crimeCityData,
    'crime city'
  );

  const { caseDirector, template } = buildCaseDirector();

  const escapeRouteLength =
    template.stages.cityChain?.cityCount ??
    ESCAPE_ROUTE_LENGTH;

  const escapeRoute = shuffle(
    locationsData
      .filter((location) => {
        const id = resolveLocationId(
          location,
          'escape route'
        );

        return (
          location?.city &&
          id !== crimeCityId &&
          id !== HQ_ID
        );
      })
      .map((location) =>
        resolveLocationId(location, 'escape route')
      )
  ).slice(0, escapeRouteLength);

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

    energy: energyManager.getCurrentEnergy(),
    difficulty,

    cash: 100,
    agencyBudget:
      STARTING_AGENCY_BUDGETS[difficulty] ??
      STARTING_AGENCY_BUDGETS.field,

    agencyDebt: 0,
    moneyLog: [],
    passport: null,

    caseDirector,
    caseTemplate: template,
    caseData: createEmptyCaseData()
  });

  resetForensicCaseState();
  ensureCaseDataShaped();

  const crimeWindow = setupCaseCrimeWindow();
  const motive = setupCaseMotive();

  console.log(
    '[setupNewGame] Crime window created:',
    crimeWindow
  );

  console.log(
    '[setupNewGame] Motive drawn:',
    motive.id,
    `(${motive.crimeBoard.label})`
  );

  gameState.routeManager = new RouteManager(
    gameState.escapeRoute,
    gameState.crimeCityId
  );

  await fetchCaseSuspects(
    gameState.currentThief,
    crimeCityId
  );

  syncInvestigationState(locationsData);

  gameState.currentDestinations =
    generateDestinationsForCurrentCity(locationsData);

  syncScoreFromManager();

  window.GAMESTATE = gameState;

  saveGameState();

  EventBus.emit('case-simplified-notice', {
    rank: gameState.playerRank,
    stages: template.stages
  });

  return gameState;
}

export async function advanceToNextCase(
  suspectsData,
  missionsData,
  locationsData
) {
  resetCaseOutcomeState();

  const { caseDirector, template } = buildCaseDirector();
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

  if (!thief || !mission || !crimeCityData) {
    throw new Error('Could not create a valid case.');
  }

  const crimeCityId = resolveLocationId(
    crimeCityData,
    'crime city'
  );

  const escapeRouteLength =
    template.stages.cityChain?.cityCount ??
    ESCAPE_ROUTE_LENGTH;

  const escapeRoute = shuffle(
    locationsData
      .filter((location) => {
        const id = resolveLocationId(
          location,
          'escape route'
        );

        return (
          location?.city &&
          id !== crimeCityId &&
          id !== HQ_ID
        );
      })
      .map((location) =>
        resolveLocationId(location, 'escape route')
      )
  ).slice(0, escapeRouteLength);

  Object.assign(gameState, {
    currentThiefId: thief.id ?? null,
    currentThief: structuredClone(thief),
    currentMission: structuredClone(mission),

    currentArtifact: mission.artifact ?? null,

    crimeCity: crimeCityData.city,
    crimeCityId,

    activeLocations: [],
    currentDestinations: [],
    escapeRoute: [...escapeRoute],

    routeManager: new RouteManager(
      escapeRoute,
      crimeCityId
    ),

    routeIndex: -1,
    nextTargetCity: null,
    nextTargetCityId: null,
    mustIncludeCityId: null,

    canonicalTravelCityId: null,
    justReachedCorrectCityId: null,
    clueScope: 'crime_scene',

    crimeSceneVisited: false,
    storyPhoneCallTriggered: false,
    pendingPhoneCall: false,
    pendingPhoneCallCityId: null,

    cluesCollected: [],
    visitedEncounters: [],
    lastTravel: null,
    lastTravelEncounter: null,

    caseDirector,
    caseTemplate: template,
    caseData: createEmptyCaseData()
  });

  resetForensicCaseState();
  ensureCaseDataShaped();

  const crimeWindow = setupCaseCrimeWindow();
  const motive = setupCaseMotive();

  console.log(
    '[advanceToNextCase] Crime window created:',
    crimeWindow
  );

  console.log(
    '[advanceToNextCase] Motive drawn:',
    motive.id,
    `(${motive.crimeBoard.label})`
  );

  await fetchCaseSuspects(
    gameState.currentThief,
    crimeCityId
  );

  syncInvestigationState(locationsData);

  gameState.currentDestinations =
    generateDestinationsForCurrentCity(locationsData);

  saveGameState();

  EventBus.emit('case-simplified-notice', {
    rank: gameState.playerRank,
    stages: template.stages
  });

  return gameState;
}

export function travelToCity(
  cityName,
  locations,
  transportType = 'plane'
) {
  const previousCity = gameState.currentCity;
  const previousCityId = gameState.currentCityId;

  const origin = getLocationByCity(
    previousCity,
    locations
  );

  const destination = getLocationByCity(
    cityName,
    locations
  );

  if (!origin || !destination) {
    throw new Error(
      'Origin or destination city data is missing.'
    );
  }

  const travelManager = getUnifiedTravelManager();

  if (!travelManager.isTransportAvailable(transportType)) {
    throw new Error(
      `Unknown transport type: ${transportType}`
    );
  }

  const config = travelManager.getTransportRule(
    transportType
  );

  if (cityName === previousCity) {
    return {
      blocked: false,
      wasCorrect: false,
      transportType,
      transportLabel: config.label,

      travelHours: 0,
      baseTravelHours: 0,
      moneySpent: 0,
      agencyDebtAdded: 0,
      energyChange: 0,

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

  if (
    !isTransportAvailable(
      origin,
      destination,
      transportType
    )
  ) {
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

  const wasCorrect = routeManager.canEnterCity(
    destinationId
  );

  const isCrimeSceneArrival =
    destinationId === gameState.crimeCityId;

  const travelData =
    travelManager.calculateTravelBetweenLocations(
      origin,
      destination,
      transportType,
      { allowEncounter: true }
    );

  const energyManager = getEnergyManager();
  const energyBefore = energyManager.getCurrentEnergy();

  const execution = travelManager.executeTravel(
    travelData
  );

  if (!execution.success) {
    return {
      blocked: true,
      blockReason:
        execution.reason || 'travel_execution_failed',

      wasCorrect: false,
      transportType,
      transportLabel: config.label,

      travelHours: 0,
      baseTravelHours: travelData.baseTravelHours,

      moneySpent: 0,
      agencyDebtAdded: 0,
      energyChange: 0,

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

  const payment = execution.payment;

  const travel = {
    transportType: travelData.transportType,
    transportLabel: travelData.transportLabel,

    travelHours: travelData.totalTravelHours,
    baseTravelHours: travelData.baseTravelHours,

    moneySpent: payment.amount,
    costFromCash: payment.costFromCash,
    costFromBudget: payment.costFromBudget,
    agencyDebtAdded: payment.debtAdded,

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
    costFromCash: travel.costFromCash,
    costFromBudget: travel.costFromBudget,

    energyChange,
    agencyDebtAdded: travel.agencyDebtAdded,

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