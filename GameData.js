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
    playerAttemptsLeft: 2
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
  nextTargetCity: null,
  nextTargetCityId: null,
  mustIncludeCityId: null,

  score: 0,
  playerRank: 'Junior Agent',
  isGameActive: false,

  timeSpent: 0,
  travelHistory: [],
  lastTravel: null,

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

export const gameState = structuredClone(defaultGameState);

function canUseLocalStorage() {
  try {
    const testKey = '__detective_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function cloneDefaultState() {
  return structuredClone(defaultGameState);
}

function isPlainObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value)
  );
}

function sanitizeSaveData(data) {
  const clean = cloneDefaultState();

  clean.currentThiefId = data?.currentThiefId ?? null;
  clean.currentThief = data?.currentThief ? structuredClone(data.currentThief) : null;
  clean.currentArtifact = data?.currentArtifact ?? null;

  clean.currentCity = data?.currentCity ?? null;
  clean.currentCityId = data?.currentCityId ?? null;
  clean.currentMission = data?.currentMission ? structuredClone(data.currentMission) : null;
  clean.currentCityData = data?.currentCityData ? structuredClone(data.currentCityData) : null;
  clean.currentEncounterId = data?.currentEncounterId ?? null;

  clean.finalArrestResult =
    typeof data?.finalArrestResult === 'string' || data?.finalArrestResult === null
      ? data.finalArrestResult
      : null;

  clean.finalArrestSuspectId = data?.finalArrestSuspectId ?? null;
  clean.caseResolved = typeof data?.caseResolved === 'boolean' ? data.caseResolved : false;
  clean.caseFailed = typeof data?.caseFailed === 'boolean' ? data.caseFailed : false;

  clean.arrestWarrantIssued =
    typeof data?.arrestWarrantIssued === 'boolean'
      ? data.arrestWarrantIssued
      : false;

  clean.warrantSuspectName =
    typeof data?.warrantSuspectName === 'string'
      ? data.warrantSuspectName
      : null;

  clean.warrantSuspectId =
    typeof data?.warrantSuspectId === 'string' || typeof data?.warrantSuspectId === 'number'
      ? data.warrantSuspectId
      : null;

  clean.gameOverReason =
    typeof data?.gameOverReason === 'string'
      ? data.gameOverReason
      : '';

  clean.crimeCity = data?.crimeCity ?? null;
  clean.crimeCityId = data?.crimeCityId ?? null;
  clean.crimeSceneVisited =
    typeof data?.crimeSceneVisited === 'boolean' ? data.crimeSceneVisited : false;

  clean.specialScenesVisited = isPlainObject(data?.specialScenesVisited)
    ? structuredClone(data.specialScenesVisited)
    : {};

  clean.justReachedCorrectCityId = data?.justReachedCorrectCityId ?? null;

  clean.activeLocations = Array.isArray(data?.activeLocations)
    ? structuredClone(data.activeLocations)
    : [];

  clean.currentDestinations = Array.isArray(data?.currentDestinations)
    ? structuredClone(data.currentDestinations)
    : [];

  clean.escapeRoute = Array.isArray(data?.escapeRoute)
    ? [...data.escapeRoute]
    : [];

  clean.routeIndex = Number.isInteger(data?.routeIndex) ? data.routeIndex : -1;
  clean.nextTargetCity = data?.nextTargetCity ?? null;
  clean.nextTargetCityId = data?.nextTargetCityId ?? null;
  clean.mustIncludeCityId = data?.mustIncludeCityId ?? null;

  clean.score = Number.isFinite(data?.score) ? data.score : 0;
  clean.playerRank =
    typeof data?.playerRank === 'string' ? data.playerRank : 'Junior Agent';
  clean.isGameActive =
    typeof data?.isGameActive === 'boolean' ? data.isGameActive : false;

  clean.timeSpent = Number.isFinite(data?.timeSpent) ? data.timeSpent : 0;
  clean.travelHistory = Array.isArray(data?.travelHistory)
    ? structuredClone(data.travelHistory)
    : [];
  clean.lastTravel = data?.lastTravel ? structuredClone(data.lastTravel) : null;

  clean.cluesCollected = Array.isArray(data?.cluesCollected)
    ? structuredClone(data.cluesCollected)
    : [];

  clean.visitedEncounters = Array.isArray(data?.visitedEncounters)
    ? [...data.visitedEncounters]
    : [];

  clean.visitedCities = Array.isArray(data?.visitedCities)
    ? [...data.visitedCities]
    : [];

  clean.playerNotes = typeof data?.playerNotes === 'string' ? data.playerNotes : '';

  clean.encounterMemory = isPlainObject(data?.encounterMemory)
    ? structuredClone(data.encounterMemory)
    : {};

  clean.cityEncounterState = isPlainObject(data?.cityEncounterState)
    ? structuredClone(data.cityEncounterState)
    : {};

  clean.storyPhoneCallTriggered =
    typeof data?.storyPhoneCallTriggered === 'boolean'
      ? data.storyPhoneCallTriggered
      : false;

  clean.pendingPhoneCall =
    typeof data?.pendingPhoneCall === 'boolean'
      ? data.pendingPhoneCall
      : false;

  clean.pendingPhoneCallCityId = data?.pendingPhoneCallCityId ?? null;

  clean.hiddenObjectHistory = Array.isArray(data?.hiddenObjectHistory)
    ? structuredClone(data.hiddenObjectHistory)
    : [];

  clean.reconstructedHeist = {
    ...createDefaultReconstructedHeist(),
    ...(isPlainObject(data?.reconstructedHeist)
      ? structuredClone(data.reconstructedHeist)
      : {})
  };

  clean.reconstructedHeist.thiefSkills = Array.isArray(clean.reconstructedHeist.thiefSkills)
    ? clean.reconstructedHeist.thiefSkills
    : [];

  clean.reconstructedHeist.allCards = Array.isArray(clean.reconstructedHeist.allCards)
    ? clean.reconstructedHeist.allCards
    : [];

  clean.reconstructedHeist.correctCardIds = Array.isArray(clean.reconstructedHeist.correctCardIds)
    ? clean.reconstructedHeist.correctCardIds
    : [];

  clean.reconstructedHeist.correctSequence = Array.isArray(clean.reconstructedHeist.correctSequence)
    ? clean.reconstructedHeist.correctSequence
    : [];

  clean.reconstructedHeist.selectedCards = Array.isArray(clean.reconstructedHeist.selectedCards)
    ? clean.reconstructedHeist.selectedCards
    : [];

  clean.reconstructedHeist.playerOrderedCards = Array.isArray(clean.reconstructedHeist.playerOrderedCards)
    ? clean.reconstructedHeist.playerOrderedCards
    : [];

  clean.reconstructedHeist.playerOrderedSentences = Array.isArray(clean.reconstructedHeist.playerOrderedSentences)
    ? clean.reconstructedHeist.playerOrderedSentences
    : [];

  clean.reconstructedHeist.playerSkills = Array.isArray(clean.reconstructedHeist.playerSkills)
    ? clean.reconstructedHeist.playerSkills
    : [];

  clean.reconstructedHeist.playerFinalText =
    typeof clean.reconstructedHeist.playerFinalText === 'string'
      ? clean.reconstructedHeist.playerFinalText
      : '';

  clean.reconstructedHeist.playerTheoryScore =
    Number.isFinite(clean.reconstructedHeist.playerTheoryScore)
      ? clean.reconstructedHeist.playerTheoryScore
      : 0;

  clean.reconstructedHeist.playerTheoryResult =
    typeof clean.reconstructedHeist.playerTheoryResult === 'string' ||
    clean.reconstructedHeist.playerTheoryResult === null
      ? clean.reconstructedHeist.playerTheoryResult
      : null;

  clean.reconstructedHeist.playerSlotFeedback = Array.isArray(clean.reconstructedHeist.playerSlotFeedback)
    ? clean.reconstructedHeist.playerSlotFeedback
    : [];

  clean.reconstructedHeist.playerAttemptsLeft =
    Number.isInteger(clean.reconstructedHeist.playerAttemptsLeft)
      ? clean.reconstructedHeist.playerAttemptsLeft
      : 2;

  return clean;
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

export function saveGameState() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping save.');
    return false;
  }

  try {
    localStorage.setItem('detectiveSaveData', JSON.stringify(gameState));
    console.log('Gra zapisana automatycznie.');
    return true;
  } catch (e) {
    console.error('Błąd zapisu do localStorage:', e);
    return false;
  }
}

export function loadGameState() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping load.');
    return false;
  }

  try {
    const savedData = localStorage.getItem('detectiveSaveData');
    if (!savedData) return false;

    const parsedData = JSON.parse(savedData);
    const safeData = sanitizeSaveData(parsedData);

    Object.assign(gameState, safeData);

    console.log('Wczytano zapis gry.');
    return true;
  } catch (e) {
    console.error('Błąd odczytu z localStorage:', e);
    resetGameState();
    return false;
  }
}

export function clearSavedGame() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping clear.');
    return false;
  }

  try {
    localStorage.removeItem('detectiveSaveData');
    console.log('Zapis gry usunięty.');
    return true;
  } catch (e) {
    console.error('Błąd usuwania zapisu z localStorage:', e);
    return false;
  }
}

// TYLKO DO DEBUGOWANIA - usuń przed publikacją
if (typeof window !== 'undefined') {
  window.gameState = gameState;
}