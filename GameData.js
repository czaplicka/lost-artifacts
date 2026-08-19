export function createDefaultReconstructedHeist() {
  return {
    cityId: null,
    sceneId: null,
    thiefId: null,
    thiefName: null,
    thiefSkills: [],
    allCards: [],
    correctCardIds: [],
    correctSequence: [],
    selectedCards: [],
    playerOrderedCards: [],
    playerOrderedSentences: [],
    playerFinalText: '',
    playerSkills: [],
    playerTheoryScore: 0,
    playerTheoryResult: null,
    playerSlotFeedback: [],
    playerAttemptsLeft: 3
  };
}

export const defaultGameState = {
  currentThiefId: null,
  currentThief: null,
  currentArtifact: null,
  currentCity: null,
  currentCityId: null,
  currentMission: null,
  currentCityData: null,
  currentEncounterId: null,

  finalArrestResult: null,
  finalArrestSuspectId: null,
  caseResolved: false,
  caseFailed: false,
  arrestWarrantIssued: false,
  warrantSuspectName: null,
  warrantSuspectId: null,
  gameOverReason: '',

  crimeCity: null,
  crimeCityId: null,
  crimeSceneVisited: false,
  specialScenesVisited: {},
  justReachedCorrectCityId: null,

  activeLocations: [],
  currentDestinations: [],
  escapeRoute: [],
  routeIndex: -1,
  routeManager: null,
  nextTargetCity: null,
  nextTargetCityId: null,
  mustIncludeCityId: null,
  canonicalTravelCityId: null,
  clueScope: 'crime_scene',

  score: 0,
  scoreSaved: false,
  playerName: 'Detective',
  playerRank: 'Junior Agent',
  avatarUrl: 'assets/profiles.png',
  casesSolved: 0,
  arrests: 0,
  achievements: [],
  completedCaseIds: [],
  successfulArrestCaseIds: [],
  isGameActive: false,
  difficulty: 'field',

  energy: 100,
  maxEnergy: 100,
  energyLog: [],

  cash: 100,
  agencyBudget: 500,
  agencyDebt: 0,
  moneyLog: [],

  timeSpent: 0,
  travelHistory: [],
  lastTravel: null,
  lastTravelEncounter: null,

  cluesCollected: [],
  visitedEncounters: [],
  visitedCities: [],
  playerNotes: '',
  encounterMemory: {},
  cityEncounterState: {},

  storyPhoneCallTriggered: false,
  pendingPhoneCall: false,
  pendingPhoneCallCityId: null,

  hiddenObjectHistory: [],
  reconstructedHeist: createDefaultReconstructedHeist()
};

export const gameState = cloneGameData(defaultGameState);

function cloneGameData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

export function cloneDefaultState() {
  return cloneGameData(defaultGameState);
}

export function resetGameState() {
  Object.assign(gameState, cloneDefaultState());
}

export function resetCaseOutcomeState() {
  gameState.finalArrestResult = null;
  gameState.finalArrestSuspectId = null;
  gameState.caseResolved = false;
  gameState.caseFailed = false;
  gameState.arrestWarrantIssued = false;
  gameState.warrantSuspectName = null;
  gameState.warrantSuspectId = null;
  gameState.gameOverReason = '';
}

export function resetReconstructedHeist() {
  gameState.reconstructedHeist = createDefaultReconstructedHeist();
}

if (typeof window !== 'undefined') {
  window.gameState = gameState;
}