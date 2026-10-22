import {
  gameState,
  resetGameState,
  resetCaseOutcomeState,
  createDefaultReconstructedHeist
} from './GameData.js';

import { startCaseClock } from './CaseTimeHelper.js';
import {
  saveGameState,
  clearSavedGame
} from './gameStatePersistence.js';

import { EventBus } from './EventBus.js';
import SuspectGenerator from './suspects/SuspectGenerator.js';

import {
  normalizeHardEvidence
} from './suspects/forensicEvidence.js';

import { getEnergyManager } from './managers/EnergyManager.js';
import { getRankManager } from './managers/RankManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { CaseDirector } from './CaseDirector.js';

import caseModifiers from './assets/data/caseModifiers.json' with {
  type: 'json'
};

import onboardingSchedule from './assets/data/onboardingSchedule.json' with {
  type: 'json'
};

import { CrimeLabManager } from './scenes/CSI/CrimeLabManager.js';

import {
  createUnifiedTravelManager
} from './managers/UnifiedTravelManager.js';

import { drawMotive, getMotiveById } from './motiveService.js';

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
  validateSetupData
} from './ui/LocationUI.js';

import {
  getScoreManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity
} from './managers/InvestigationManager.js';

import { RouteManager } from './managers/RouteManager.js';

const RANK_TO_SCHEDULE_KEY = {
  'Junior Agent': '0',
  'Field Agent': '1',
  'Senior Agent': '2',
  'Lead Investigator': '4'
};

const CRIME_WINDOW_START_MINUTES = [
  18 * 60,
  19 * 60,
  20 * 60,
  21 * 60
];

const CRIME_WINDOW_DURATION_MINUTES = 15;
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
  const motiveId = gameState.caseData?.motiveId ?? null;

  if (!motiveId) {
    currentMotive = null;
    return null;
  }

  // Po odświeżeniu strony, wczytaniu zapisu albo zmianie sprawy
  // odtwarzamy pełny motyw z zapisanego ID.
  if (currentMotive?.id !== motiveId) {
    currentMotive = getMotiveById(motiveId);
  }

  return currentMotive;
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

function ensureCaseDataShaped() {
  if (
    !gameState.caseData ||
    typeof gameState.caseData !== 'object' ||
    Array.isArray(gameState.caseData)
  ) {
    gameState.caseData = createEmptyCaseData();
  }

  if (!Array.isArray(gameState.caseData.motiveStagesDone)) {
    gameState.caseData.motiveStagesDone = [];
  }
}

function setupCaseCrimeWindow() {
  ensureCaseDataShaped();

  if (gameState.caseData.crimeWindow != null) {
    return gameState.caseData.crimeWindow;
  }

  const startMinute = getRandomItem(
    CRIME_WINDOW_START_MINUTES
  );

  if (!Number.isInteger(startMinute)) {
    throw new Error(
      'Could not generate the crime time window.'
    );
  }

  const crimeWindow = {
    day: CRIME_DAY,
    startMinute,
    endMinute:
      startMinute + CRIME_WINDOW_DURATION_MINUTES
  };

  gameState.caseData.crimeWindow = crimeWindow;

  return crimeWindow;
}

function setupCaseMotive() {
  const motive = drawMotive();

  if (
    !motive?.id ||
    !motive.crimeBoard ||
    motive.crimeBoard.answerId == null
  ) {
    throw new Error(
      'Could not generate a valid case motive.'
    );
  }

  currentMotive = motive;

  Object.assign(gameState.caseData, {
    motiveId: motive.id,
    correctMotiveAnswerId: motive.crimeBoard.answerId,
    motiveStagesDone: [],
    motiveBoardUnlocked: false
  });

  return motive;
}

function startScoreSession() {
  const manager = getScoreManager();

  if (typeof manager?.startSession === 'function') {
    manager.startSession({
      reset: true
    });
  }
}

function resetInventory() {
  inventoryManager.close();
  inventoryManager.clearAll();

  gameState.inventory = inventoryManager.exportState();
}

function resetForensicCaseState() {
  gameState.updateState({
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
    crimeCityCurrentNodes: {},

    suspectExclusionState: {},
    suspectGridInput: null,
    alibiInvestigation: null,

    crimeCityEncounterState: {},
    alibiAccusations: {},

    reconstructedHeist:
      createDefaultReconstructedHeist(),

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

function resetArtifactRecovery() {
  gameState.artifactRecovery = {
    missionId: null,
    artifactId: null,
    recovered: false,
    recoveredAt: null,
    recoveredFrom: null,
    recoveredLocation: null,
    condition: null
  };
}

function startInvestigationClock() {
  startCaseClock(gameState);
}

function selectCase(
  suspectsData,
  missionsData,
  locationsData
) {
  const thief = getRandomItem(suspectsData);

  const crimeCities = locationsData.filter(
    location => location.isCrimeCity === true
  );

  const eligibleMissions = missionsData.filter(
    mission => crimeCities.some(
      city => city.city === mission.city
    )
  );

  const mission = getRandomItem(eligibleMissions);

  const crimeCityData = crimeCities.find(
    city => city.city === mission?.city
  );

  if (!thief || !mission || !crimeCityData) {
    throw new Error(
      'Could not create a valid case.'
    );
  }

  return {
    thief,
    mission,
    crimeCityData,

    crimeCityId: resolveLocationId(
      crimeCityData,
      'crime city'
    )
  };
}

function createEscapeRoute(
  locationsData,
  crimeCityId,
  template
) {
  const requestedLength =
    template.stages.cityChain?.cityCount ??
    ESCAPE_ROUTE_LENGTH;

  if (
    !Number.isInteger(requestedLength) ||
    requestedLength < 0
  ) {
    throw new Error(
      'Case template contains an invalid city count.'
    );
  }

  return shuffle(
    locationsData
      .filter(location => {
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
      .map(location =>
        resolveLocationId(
          location,
          'escape route'
        )
      )
  ).slice(0, requestedLength);
}

function applyCaseConfiguration({
  selectedCase,
  caseDirector,
  template,
  escapeRoute
}) {
  const {
    thief,
    mission,
    crimeCityData,
    crimeCityId
  } = selectedCase;

  gameState.updateState({
    currentThiefId: thief.id ?? null,
    currentThief: structuredClone(thief),
    currentMission: structuredClone(mission),

    currentArtifact: mission.artifact
      ? structuredClone(mission.artifact)
      : null,

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

    lastTravel: null,
    lastTravelEncounter: null,

    caseDirector,
    caseTemplate: structuredClone(template),
    caseData: createEmptyCaseData()
  });

  gameState.clearClues();
  gameState.clearEncounters();

  resetArtifactRecovery();
  resetForensicCaseState();

  setupCaseCrimeWindow();
  setupCaseMotive();
}

async function fetchSuspectSource() {
  let lastError;

  for (
    let attempt = 0;
    attempt <= SUSPECT_FETCH_RETRIES;
    attempt += 1
  ) {
    try {
      const response = await fetch(SUSPECT_DATA_URL);

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      lastError = error;

      if (attempt < SUSPECT_FETCH_RETRIES) {
        await new Promise(resolve => {
          setTimeout(
            resolve,
            SUSPECT_FETCH_RETRY_DELAY_MS
          );
        });
      }
    }
  }

  throw new Error(
    'Failed to load suspects: ' +
    (lastError?.message || String(lastError))
  );
}

async function fetchCaseSuspects(thief, crimeCityId) {
  const lab = new CrimeLabManager(
    gameState,
    crimeCityId
  );

  const identityEvidence =
    lab.ensureIdentityEvidence();

  const traceEvidence =
    lab.ensureRandomTraceEvidence();

  const normalized = normalizeHardEvidence([
    identityEvidence,
    ...traceEvidence
  ]);

  if (normalized.length !== 3) {
    throw new Error(
      'Case setup requires three usable forensic clues.'
    );
  }

  const hardEvidence = normalized.map(
    ({ matches, ...evidence }) => evidence
  );

  const citySuspectsData =
    await fetchSuspectSource();

  const generator = new SuspectGenerator(
    citySuspectsData
  );

  const generatedCase =
    generator.generateCaseSuspects(
      thief,
      crimeCityId,
      {
        total: 10,
        hardEvidence
      }
    );

  generator.prepareCaseState(generatedCase);

  if (!gameState.currentMission) {
    throw new Error(
      'Current mission is missing during suspect setup.'
    );
  }

  gameState.currentMission = {
    ...gameState.currentMission,

    forensicHardEvidence:
      structuredClone(generatedCase.hardEvidence),

    requiredForensicProfile:
      Object.fromEntries(
        generatedCase.hardEvidence.map(evidence => [
          evidence.forensicField,
          evidence.normalizedValue
        ])
      ),

    traceEvidence: structuredClone(traceEvidence)
  };

  return generatedCase;
}

function finishCaseSetup(locationsData, template) {
  syncInvestigationState(locationsData);

  gameState.currentDestinations =
    generateDestinationsForCurrentCity(
      locationsData
    );

  const saved = saveGameState();

  if (!saved) {
    console.warn(
      '[GameSetup] Case is ready, but autosave was not written.'
    );
  }

  EventBus.emit('case-simplified-notice', {
    rank: gameState.playerRank,
    stages: template.stages
  });
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

  const selectedCase = selectCase(
    suspectsData,
    missionsData,
    locationsData
  );

  const hqData = locationsData.find(
    location =>
      location.id === HQ_ID ||
      location.city === HQ_CITY
  );

  if (!hqData) {
    throw new Error(
      'Headquarters city data is missing.'
    );
  }

  clearSavedGame();
  resetGameState();
  resetCaseOutcomeState();
  resetInventory();

  currentMotive = null;

  const energyManager = getEnergyManager();
  energyManager.init(difficulty);

  const travelManager =
    createUnifiedTravelManager();

  travelManager.init();

  getRankManager().init();

  const { caseDirector, template } =
    buildCaseDirector();

  const escapeRoute = createEscapeRoute(
    locationsData,
    selectedCase.crimeCityId,
    template
  );

  gameState.updateState({
    currentCity: hqData.city,
    currentCityId: hqData.id || HQ_ID,
    currentCityData: structuredClone(hqData),
    currentEncounterId: null,

    score: 0,
    scoreSaved: false,

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

    isGameActive: false
  });

  gameState.replaceIndexedCollection(
    'visitedCities',
    [hqData.id || HQ_ID]
  );

  applyCaseConfiguration({
    selectedCase,
    caseDirector,
    template,
    escapeRoute
  });

  startInvestigationClock();
  startScoreSession();

  await fetchCaseSuspects(
    gameState.currentThief,
    selectedCase.crimeCityId
  );

  gameState.isGameActive = true;

  finishCaseSetup(locationsData, template);

  return gameState;
}

export async function advanceToNextCase(
  suspectsData,
  missionsData,
  locationsData
) {
  validateSetupData(
    suspectsData,
    missionsData,
    locationsData
  );

  const selectedCase = selectCase(
    suspectsData,
    missionsData,
    locationsData
  );

  const { caseDirector, template } =
    buildCaseDirector();

  const escapeRoute = createEscapeRoute(
    locationsData,
    selectedCase.crimeCityId,
    template
  );

  resetCaseOutcomeState();
  currentMotive = null;

  applyCaseConfiguration({
    selectedCase,
    caseDirector,
    template,
    escapeRoute
  });

  startInvestigationClock();

  await fetchCaseSuspects(
    gameState.currentThief,
    selectedCase.crimeCityId
  );

  finishCaseSetup(locationsData, template);

  return gameState;
}