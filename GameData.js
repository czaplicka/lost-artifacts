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
  nextTargetCity: null,
  nextTargetCityId: null,
  mustIncludeCityId: null,

score: 0,

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
  // ===== ENERGY SYSTEM =====
  energy: 100,
  maxEnergy: 100,
  energyLog: [],

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

// NEW: an "id" in this game is always either a string or a number
// (suspect ids, city ids, card ids, scene ids...). Anything else
// (object, array, boolean, function-shaped JSON) is rejected as invalid.
function isValidId(value) {
  return typeof value === 'string' || typeof value === 'number';
}

function sanitizeIdOrNull(value) {
  return isValidId(value) ? value : null;
}

// NEW: strips a raw array down to only the elements that are valid ids,
// dropping anything malformed instead of blindly trusting "it's an array".
function sanitizeIdArray(value) {
  return Array.isArray(value) ? value.filter(isValidId) : [];
}

// NEW: strips a raw array down to only non-empty string elements.
function sanitizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.length > 0)
    : [];
}

// NEW: whitelist-based validation of a single "heist card" object, as used
// by the crime-scene hidden-object minigame and the Mastermind sequencing
// minigame (allCards / selectedCards / playerOrderedCards). Only known,
// correctly-typed fields survive; unknown or malformed entries are dropped
// entirely rather than passed through structuredClone verbatim.
// NOTE: adjust this whitelist if your actual card schema has more fields.
function sanitizeHeistCard(card) {
  if (!isPlainObject(card)) return null;
  if (!isValidId(card.id)) return null;

  return {
    id: card.id,
    label: typeof card.label === 'string' ? card.label : '',
    type: typeof card.type === 'string' ? card.type : '',
    isRedHerring: Boolean(card.isRedHerring)
  };
}

function sanitizeHeistCardArray(value) {
  return Array.isArray(value)
    ? value.map(sanitizeHeistCard).filter(Boolean)
    : [];
}

// NEW: whitelist-based validation of a single Mastermind feedback entry
// (per-slot "correct / wrong position / not present" style result).
// Rejects anything with an unexpected status value instead of trusting
// whatever was in localStorage.
const VALID_SLOT_FEEDBACK_STATUSES = new Set(['correct', 'wrong-position', 'absent']);

function sanitizeSlotFeedback(entry) {
  if (!isPlainObject(entry)) return null;
  if (!Number.isInteger(entry.slotIndex) || entry.slotIndex < 0) return null;
  if (!VALID_SLOT_FEEDBACK_STATUSES.has(entry.status)) return null;

  return {
    slotIndex: entry.slotIndex,
    status: entry.status
  };
}

function sanitizeSlotFeedbackArray(value) {
  return Array.isArray(value)
    ? value.map(sanitizeSlotFeedback).filter(Boolean)
    : [];
}

// NEW: fully validates reconstructedHeist field-by-field instead of
// spreading the raw parsed object and only spot-checking a few array
// fields afterwards. Anything malformed falls back to the safe default.
function sanitizeReconstructedHeist(data) {
  const defaults = createDefaultReconstructedHeist();
  const safeData = isPlainObject(data) ? data : {};

  return {
    cityId: sanitizeIdOrNull(safeData.cityId),
    sceneId: sanitizeIdOrNull(safeData.sceneId),
    thiefId: sanitizeIdOrNull(safeData.thiefId),
    thiefName: typeof safeData.thiefName === 'string' ? safeData.thiefName : null,

    thiefSkills: sanitizeStringArray(safeData.thiefSkills),
    allCards: sanitizeHeistCardArray(safeData.allCards),
    correctCardIds: sanitizeIdArray(safeData.correctCardIds),
    correctSequence: sanitizeIdArray(safeData.correctSequence),
    selectedCards: sanitizeHeistCardArray(safeData.selectedCards),
    playerOrderedCards: sanitizeHeistCardArray(safeData.playerOrderedCards),
    playerOrderedSentences: sanitizeStringArray(safeData.playerOrderedSentences),

    playerFinalText: typeof safeData.playerFinalText === 'string'
      ? safeData.playerFinalText
      : defaults.playerFinalText,

    playerSkills: sanitizeStringArray(safeData.playerSkills),

    playerTheoryScore: Number.isFinite(safeData.playerTheoryScore)
      ? safeData.playerTheoryScore
      : defaults.playerTheoryScore,

    playerTheoryResult:
      typeof safeData.playerTheoryResult === 'string' || safeData.playerTheoryResult === null
        ? safeData.playerTheoryResult
        : defaults.playerTheoryResult,

    playerSlotFeedback: sanitizeSlotFeedbackArray(safeData.playerSlotFeedback),

    playerAttemptsLeft: Number.isInteger(safeData.playerAttemptsLeft)
      ? Phaser.Math.Clamp(safeData.playerAttemptsLeft, 0, 4)
      : defaults.playerAttemptsLeft
  };
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

clean.score = Number.isFinite(data?.score)
    ? Math.max(0, Math.floor(data.score))
    : 0;

clean.playerName =
    typeof data?.playerName === 'string' && data.playerName.trim()
        ? data.playerName.trim()
        : 'Detective';

clean.playerRank =
    typeof data?.playerRank === 'string' && data.playerRank.trim()
        ? data.playerRank.trim()
        : 'Junior Agent';

clean.avatarUrl =
    typeof data?.avatarUrl === 'string' && data.avatarUrl.trim()
        ? data.avatarUrl.trim()
        : 'assets/profiles.png';

clean.casesSolved = Number.isFinite(data?.casesSolved)
    ? Math.max(0, Math.floor(data.casesSolved))
    : 0;

clean.arrests = Number.isFinite(data?.arrests)
    ? Math.max(0, Math.floor(data.arrests))
    : 0;

clean.achievements = Array.isArray(data?.achievements)
    ? data.achievements.filter(
        achievement =>
            typeof achievement === 'string' &&
            achievement.trim().length > 0
    )
    : [];
clean.completedCaseIds = Array.isArray(data?.completedCaseIds)
    ? data.completedCaseIds.filter(isValidId)
    : [];

clean.successfulArrestCaseIds = Array.isArray(data?.successfulArrestCaseIds)
    ? data.successfulArrestCaseIds.filter(isValidId)
    : [];
clean.isGameActive =
    typeof data?.isGameActive === 'boolean'
        ? data.isGameActive
        : false;
const validDifficulties = new Set([
    'rookie',
    'field',
    'master',
]);

clean.difficulty = validDifficulties.has(data?.difficulty)
    ? data.difficulty
    : 'field';
    // ===== ENERGY SYSTEM =====
  clean.energy = Number.isFinite(data?.energy)
    ? Phaser.Math.Clamp(data.energy, 0, 100)
    : 100;

  clean.maxEnergy = Number.isFinite(data?.maxEnergy)
    ? Math.max(1, data.maxEnergy)
    : 100;

  clean.energyLog = Array.isArray(data?.energyLog)
    ? structuredClone(data.energyLog)
    : [];
    
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

  // CHANGED: full field-by-field validation instead of a shallow spread +
  // spot-checked arrays. See sanitizeReconstructedHeist() above.
  clean.reconstructedHeist = sanitizeReconstructedHeist(data?.reconstructedHeist);

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

// DELETE BEFORE PRODUCTION
// TYLKO DO DEBUGOWANIA - usuń przed publikacją
if (typeof window !== 'undefined') {
  window.gameState = gameState;
}