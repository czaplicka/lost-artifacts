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

  cash: 500,
  agencyBudget: 0,
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

export const gameState = structuredClone(defaultGameState);

const VALID_SLOT_FEEDBACK_STATUSES = new Set([
  'correct',
  'wrong-position',
  'absent'
]);

const VALID_MONEY_SOURCES = new Set(['cash', 'agency']);

const VALID_MONEY_CATEGORIES = new Set([
  'travel',
  'hotel',
  'food',
  'drink',
  'newspaper',
  'phone',
  'taxi',
  'informant',
  'side_case',
  'mission_reward',
  'office_upgrade',
  'item',
  'agency_advance',
  'refund'
]);

const VALID_DIFFICULTIES = new Set(['rookie', 'field', 'master']);
const VALID_CLUE_SCOPES = new Set(['crime_scene', 'route_leg', 'finale']);

function canUseLocalStorage() {
  try {
    const testKey = '__detective_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

function cloneDefaultState() {
  return structuredClone(defaultGameState);
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isValidId(value) {
  return typeof value === 'string' || typeof value === 'number';
}

function sanitizeIdOrNull(value) {
  return isValidId(value) ? value : null;
}

function sanitizeIdArray(value) {
  return Array.isArray(value) ? value.filter(isValidId) : [];
}

function sanitizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.length > 0)
    : [];
}

function sanitizeArray(value) {
  return Array.isArray(value) ? structuredClone(value) : [];
}

function sanitizeObject(value) {
  return isPlainObject(value) ? structuredClone(value) : {};
}

function sanitizeHeistCard(card) {
  if (!isPlainObject(card) || !isValidId(card.id)) return null;

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

function sanitizeMoneyTransaction(entry) {
  if (!isPlainObject(entry)) return null;
  if (typeof entry.id !== 'string' || !entry.id.trim()) return null;
  if (typeof entry.type !== 'string' || !entry.type.trim()) return null;
  if (!Number.isInteger(entry.amount) || entry.amount < 0) return null;

  return {
    id: entry.id,
    type: entry.type,
    source: VALID_MONEY_SOURCES.has(entry.source) ? entry.source : null,
    amount: entry.amount,
    category: VALID_MONEY_CATEGORIES.has(entry.category) ? entry.category : null,
    description: typeof entry.description === 'string' ? entry.description : '',
    missionId: sanitizeIdOrNull(entry.missionId),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
    metadata: sanitizeObject(entry.metadata)
  };
}

function sanitizeMoneyLog(value) {
  return Array.isArray(value)
    ? value.map(sanitizeMoneyTransaction).filter(Boolean).slice(-100)
    : [];
}

function sanitizeSaveData(data) {
  const clean = cloneDefaultState();
  const source = isPlainObject(data) ? data : {};

  clean.currentThiefId = sanitizeIdOrNull(source.currentThiefId);
  clean.currentThief = source.currentThief ? structuredClone(source.currentThief) : null;
  clean.currentArtifact = source.currentArtifact ?? null;
  clean.currentCity = source.currentCity ?? null;
  clean.currentCityId = sanitizeIdOrNull(source.currentCityId);
  clean.currentMission = source.currentMission ? structuredClone(source.currentMission) : null;
  clean.currentCityData = source.currentCityData ? structuredClone(source.currentCityData) : null;
  clean.currentEncounterId = sanitizeIdOrNull(source.currentEncounterId);

  clean.finalArrestResult = typeof source.finalArrestResult === 'string' || source.finalArrestResult === null
    ? source.finalArrestResult
    : null;
  clean.finalArrestSuspectId = sanitizeIdOrNull(source.finalArrestSuspectId);
  clean.caseResolved = typeof source.caseResolved === 'boolean' ? source.caseResolved : false;
  clean.caseFailed = typeof source.caseFailed === 'boolean' ? source.caseFailed : false;
  clean.arrestWarrantIssued = typeof source.arrestWarrantIssued === 'boolean'
    ? source.arrestWarrantIssued
    : false;
  clean.warrantSuspectName = typeof source.warrantSuspectName === 'string'
    ? source.warrantSuspectName
    : null;
  clean.warrantSuspectId = sanitizeIdOrNull(source.warrantSuspectId);
  clean.gameOverReason = typeof source.gameOverReason === 'string' ? source.gameOverReason : '';

  clean.crimeCity = source.crimeCity ?? null;
  clean.crimeCityId = sanitizeIdOrNull(source.crimeCityId);
  clean.crimeSceneVisited = typeof source.crimeSceneVisited === 'boolean'
    ? source.crimeSceneVisited
    : false;
  clean.specialScenesVisited = sanitizeObject(source.specialScenesVisited);
  clean.justReachedCorrectCityId = sanitizeIdOrNull(source.justReachedCorrectCityId);

  clean.activeLocations = sanitizeArray(source.activeLocations);
  clean.currentDestinations = sanitizeArray(source.currentDestinations);
  clean.escapeRoute = sanitizeArray(source.escapeRoute);
  clean.routeIndex = Number.isInteger(source.routeIndex) ? source.routeIndex : -1;
  clean.routeManager = sanitizeObject(source.routeManager);
  clean.nextTargetCity = source.nextTargetCity ?? null;
  clean.nextTargetCityId = sanitizeIdOrNull(source.nextTargetCityId);
  clean.mustIncludeCityId = sanitizeIdOrNull(source.mustIncludeCityId);
  clean.canonicalTravelCityId = sanitizeIdOrNull(source.canonicalTravelCityId);
  clean.clueScope = VALID_CLUE_SCOPES.has(source.clueScope)
    ? source.clueScope
    : 'crime_scene';

  clean.score = Number.isFinite(source.score) ? Math.max(0, Math.floor(source.score)) : 0;
  clean.scoreSaved = typeof source.scoreSaved === 'boolean' ? source.scoreSaved : false;
  clean.playerName = typeof source.playerName === 'string' && source.playerName.trim()
    ? source.playerName.trim()
    : 'Detective';
  clean.playerRank = typeof source.playerRank === 'string' && source.playerRank.trim()
    ? source.playerRank.trim()
    : 'Junior Agent';
  clean.avatarUrl = typeof source.avatarUrl === 'string' && source.avatarUrl.trim()
    ? source.avatarUrl.trim()
    : 'assets/profiles.png';
  clean.casesSolved = Number.isFinite(source.casesSolved)
    ? Math.max(0, Math.floor(source.casesSolved))
    : 0;
  clean.arrests = Number.isFinite(source.arrests)
    ? Math.max(0, Math.floor(source.arrests))
    : 0;
  clean.achievements = sanitizeStringArray(source.achievements);
  clean.completedCaseIds = sanitizeIdArray(source.completedCaseIds);
  clean.successfulArrestCaseIds = sanitizeIdArray(source.successfulArrestCaseIds);
  clean.isGameActive = typeof source.isGameActive === 'boolean' ? source.isGameActive : false;
  clean.difficulty = VALID_DIFFICULTIES.has(source.difficulty) ? source.difficulty : 'field';

  clean.maxEnergy = Number.isFinite(source.maxEnergy)
    ? Math.max(1, Math.floor(source.maxEnergy))
    : 100;
  clean.energy = Number.isFinite(source.energy)
    ? Phaser.Math.Clamp(Math.floor(source.energy), 0, clean.maxEnergy)
    : clean.maxEnergy;
  clean.energyLog = sanitizeArray(source.energyLog);

  clean.cash = Number.isFinite(source.cash) ? Math.max(0, Math.floor(source.cash)) : 500;
  clean.agencyBudget = Number.isFinite(source.agencyBudget)
    ? Math.max(0, Math.floor(source.agencyBudget))
    : 0;
  clean.agencyDebt = Number.isFinite(source.agencyDebt)
    ? Math.max(0, Math.floor(source.agencyDebt))
    : 0;
  clean.moneyLog = sanitizeMoneyLog(source.moneyLog);

  clean.timeSpent = Number.isFinite(source.timeSpent) ? Math.max(0, source.timeSpent) : 0;
  clean.travelHistory = sanitizeArray(source.travelHistory);
  clean.lastTravel = source.lastTravel ? structuredClone(source.lastTravel) : null;
  clean.lastTravelEncounter = source.lastTravelEncounter
    ? structuredClone(source.lastTravelEncounter)
    : null;

  clean.cluesCollected = sanitizeArray(source.cluesCollected);
  clean.visitedEncounters = sanitizeArray(source.visitedEncounters);
  clean.visitedCities = sanitizeArray(source.visitedCities);
  clean.playerNotes = typeof source.playerNotes === 'string' ? source.playerNotes : '';
  clean.encounterMemory = sanitizeObject(source.encounterMemory);
  clean.cityEncounterState = sanitizeObject(source.cityEncounterState);

  clean.storyPhoneCallTriggered = typeof source.storyPhoneCallTriggered === 'boolean'
    ? source.storyPhoneCallTriggered
    : false;
  clean.pendingPhoneCall = typeof source.pendingPhoneCall === 'boolean'
    ? source.pendingPhoneCall
    : false;
  clean.pendingPhoneCallCityId = sanitizeIdOrNull(source.pendingPhoneCallCityId);
  clean.hiddenObjectHistory = sanitizeArray(source.hiddenObjectHistory);
  clean.reconstructedHeist = sanitizeReconstructedHeist(source.reconstructedHeist);

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
  } catch (error) {
    console.error('Błąd zapisu do localStorage:', error);
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
    Object.assign(gameState, sanitizeSaveData(JSON.parse(savedData)));
    console.log('Wczytano zapis gry.');
    return true;
  } catch (error) {
    console.error('Błąd odczytu z localStorage:', error);
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
  } catch (error) {
    console.error('Błąd usuwania zapisu z localStorage:', error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.gameState = gameState;
}