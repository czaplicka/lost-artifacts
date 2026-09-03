/**
 * ✅ VERSIONED DEFAULT STATE — łatwo migrować staże save'y
 */
const GAME_STATE_VERSION = '1.0.0';

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
  // ✅ Metadata
  _version: GAME_STATE_VERSION,
  _lastSave: null,
  _createdAt: null,

  // Case state
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
  energyLog: [],  // ✅ Limited by _rotateHistoryArrays()

  cash: 100,
  agencyBudget: 500,
  agencyDebt: 0,
  moneyLog: [],  // ✅ Limited by _rotateHistoryArrays()

  timeSpent: 0,
  travelHistory: [],  // ✅ Limited by _rotateHistoryArrays()
  lastTravel: null,
  lastTravelEncounter: null,

  // ✅ Changed to Map-like objects for faster lookup
  cluesCollected: [],  // Keep array for iteration, but add indexing
  _clueIndex: {},      // Map: clueId → index for O(1) lookup

  visitedEncounters: [],
  _encounterIndex: {},  // Map: encounterId → index

  visitedCities: [],
  _cityIndex: {},  // Map: cityId → index

  playerNotes: '',
  encounterMemory: {},  // ✅ Will be limited by garbage collection
  cityEncounterState: {},  // ✅ Will be limited

  storyPhoneCallTriggered: false,
  pendingPhoneCall: false,
  pendingPhoneCallCityId: null,

  hiddenObjectHistory: [],  // ✅ Limited by _rotateHistoryArrays()
  reconstructedHeist: createDefaultReconstructedHeist()
};

/**
 * ✅ BETTER CLONE FALLBACK — Handles more cases than JSON
 */
function cloneGameData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  // ✅ Fallback z lepszą obsługą
  return _deepClone(value);
}

function _deepClone(obj, seen = new WeakSet()) {
  // Handle primitives
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return undefined;
  }

  seen.add(obj);

  // Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => _deepClone(item, seen));
  }

  // Objects
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = _deepClone(obj[key], seen);
    }
  }

  return cloned;
}

/**
 * ✅ GAME STATE MANAGER — Kontroluje mutacje i cleanup
 */
class GameStateManager {
  constructor() {
    this.state = cloneGameData(defaultGameState);
    this.dirty = false;
    this.saveCheckpoint = null;
    this.historyLimit = 100;  // ← Keep only last 100 entries
    this.memoryObjectLimit = 500;  // ← Keep only 500 objects w memory
  }

  /**
   * ✅ Get copy of state (zabezpieczenie przed mutacją)
   */
  getState() {
    return this.state;
  }

  /**
   * ✅ Update state z validation
   */
  updateState(updates) {
    for (const [key, value] of Object.entries(updates)) {
      if (key.startsWith('_')) {
        console.warn(`[GameState] Attempt to set private field: ${key}`);
        continue;
      }

      if (!(key in this.state)) {
        console.warn(`[GameState] Unknown field: ${key}`);
        continue;
      }

      this.state[key] = value;
      this.dirty = true;
    }
  }

  /**
   * ✅ Add clue z auto-indexing
   */
  addClue(clue) {
    if (!clue?.id) {
      console.warn('[GameState] Clue must have id');
      return;
    }

    // ✅ Check duplikat
    if (this.state._clueIndex[clue.id] !== undefined) {
      return;  // Already exists
    }

    const index = this.state.cluesCollected.length;
    this.state.cluesCollected.push(clue);
    this.state._clueIndex[clue.id] = index;
    this.dirty = true;
  }

  /**
   * ✅ Get clue by ID (O(1))
   */
  getClue(clueId) {
    const index = this.state._clueIndex[clueId];
    return index !== undefined ? this.state.cluesCollected[index] : null;
  }

  /**
   * ✅ Remove clue by ID
   */
  removeClue(clueId) {
    const index = this.state._clueIndex[clueId];
    if (index === undefined) return;

    this.state.cluesCollected.splice(index, 1);
    delete this.state._clueIndex[clueId];

    // ✅ Re-index all clues after removal
    for (let i = index; i < this.state.cluesCollected.length; i++) {
      this.state._clueIndex[this.state.cluesCollected[i].id] = i;
    }

    this.dirty = true;
  }

  /**
   * ✅ Same pattern dla encounters
   */
  addEncounter(encounter) {
    if (!encounter?.id) return;
    if (this.state._encounterIndex[encounter.id] !== undefined) return;

    const index = this.state.visitedEncounters.length;
    this.state.visitedEncounters.push(encounter);
    this.state._encounterIndex[encounter.id] = index;
    this.dirty = true;
  }

  getEncounter(encounterId) {
    const index = this.state._encounterIndex[encounterId];
    return index !== undefined ? this.state.visitedEncounters[index] : null;
  }

  /**
   * ✅ Add city
   */
  addCity(city) {
    if (!city?.id) return;
    if (this.state._cityIndex[city.id] !== undefined) return;

    const index = this.state.visitedCities.length;
    this.state.visitedCities.push(city);
    this.state._cityIndex[city.id] = index;
    this.dirty = true;
  }

  getCity(cityId) {
    const index = this.state._cityIndex[cityId];
    return index !== undefined ? this.state.visitedCities[index] : null;
  }

  /**
   * ✅ Log energy change (z limitowaniem)
   */
  addEnergyLog(entry) {
    this.state.energyLog.push(entry);
    this._rotateHistoryArrays();
  }

  /**
   * ✅ Log money change (z limitowaniem)
   */
  addMoneyLog(entry) {
    this.state.moneyLog.push(entry);
    this._rotateHistoryArrays();
  }

  /**
   * ✅ Log travel (z limitowaniem)
   */
  addTravel(travel) {
    this.state.travelHistory.push(travel);
    this._rotateHistoryArrays();
  }

  /**
   * ✅ Log hidden object attempt
   */
  addHiddenObjectAttempt(attempt) {
    this.state.hiddenObjectHistory.push(attempt);
    this._rotateHistoryArrays();
  }

  /**
   * ✅ Rotate history arrays — keep only last N entries
   */
  _rotateHistoryArrays() {
    const arrays = ['energyLog', 'moneyLog', 'travelHistory', 'hiddenObjectHistory'];

    for (const arrayName of arrays) {
      if (this.state[arrayName].length > this.historyLimit) {
        this.state[arrayName] = this.state[arrayName].slice(-this.historyLimit);
      }
    }
  }

  /**
   * ✅ Garbage collect old memory
   */
  garbageCollectMemory() {
    // Keep only most recent 500 encounter memories
    const keys = Object.keys(this.state.encounterMemory);
    if (keys.length > this.memoryObjectLimit) {
      const toRemove = keys.length - this.memoryObjectLimit;
      keys.slice(0, toRemove).forEach(key => {
        delete this.state.encounterMemory[key];
      });
    }

    // Same dla cities
    const cityKeys = Object.keys(this.state.cityEncounterState);
    if (cityKeys.length > this.memoryObjectLimit) {
      const toRemove = cityKeys.length - this.memoryObjectLimit;
      cityKeys.slice(0, toRemove).forEach(key => {
        delete this.state.cityEncounterState[key];
      });
    }
  }

  /**
   * ✅ Reset case outcome
   */
  resetCaseOutcome() {
    this.updateState({
      finalArrestResult: null,
      finalArrestSuspectId: null,
      caseResolved: false,
      caseFailed: false,
      arrestWarrantIssued: false,
      warrantSuspectName: null,
      warrantSuspectId: null,
      gameOverReason: ''
    });
  }

  /**
   * ✅ Reset reconstructed heist
   */
  resetReconstructedHeist() {
    this.state.reconstructedHeist = createDefaultReconstructedHeist();
    this.dirty = true;
  }

  /**
   * ✅ Full reset
   */
  resetFull() {
    this.state = cloneGameData(defaultGameState);
    this.state._createdAt = Date.now();
    this.dirty = true;
  }

  /**
   * ✅ Create save checkpoint
   */
  createCheckpoint() {
    this.saveCheckpoint = cloneGameData(this.state);
    this.state._lastSave = Date.now();
  }

  /**
   * ✅ Restore from checkpoint
   */
  restoreCheckpoint() {
    if (!this.saveCheckpoint) {
      console.warn('[GameState] No checkpoint available');
      return false;
    }

    this.state = cloneGameData(this.saveCheckpoint);
    this.dirty = false;
    return true;
  }

  /**
   * ✅ Validate save (check corruption)
   */
  validateSave(saveData) {
    if (!saveData || typeof saveData !== 'object') {
      return false;
    }

    // ✅ Check version
    if (saveData._version !== GAME_STATE_VERSION) {
      console.warn(`[GameState] Save version mismatch: ${saveData._version} vs ${GAME_STATE_VERSION}`);
      return this._migrateFromOldVersion(saveData);
    }

    // ✅ Check required fields
    const requiredFields = ['playerName', 'difficulty', 'score'];
    for (const field of requiredFields) {
      if (!(field in saveData)) {
        console.warn(`[GameState] Save missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * ✅ Migrate old saves (jeśli struktura się zmieni)
   */
  _migrateFromOldVersion(oldSave) {
    console.log(`[GameState] Migrating from version: ${oldSave._version}`);

    // ✅ Example: Jeśli dodałeś nowe pole w v1.1.0
    if (oldSave._version === '1.0.0') {
      // Dodaj nowe pole z defaultem
      // oldSave.newFieldInV1_1 = defaultGameState.newFieldInV1_1;
    }

    oldSave._version = GAME_STATE_VERSION;
    return true;
  }

  /**
   * ✅ Export dla save (bez prywatnych pól z _)
   */
  exportForSave() {
    const exported = {};

    for (const [key, value] of Object.entries(this.state)) {
      if (!key.startsWith('_')) {
        exported[key] = value;
      }
    }

    return exported;
  }

  /**
   * ✅ Import z save
   */
  importFromSave(saveData) {
    if (!this.validateSave(saveData)) {
      console.error('[GameState] Save validation failed');
      return false;
    }

    this.state = cloneGameData({ ...defaultGameState, ...saveData });
    this.state._version = GAME_STATE_VERSION;
    this.dirty = false;

    return true;
  }

  /**
   * ✅ Debug info
   */
  getDebugInfo() {
    return {
      version: this.state._version,
      lastSave: new Date(this.state._lastSave),
      createdAt: new Date(this.state._createdAt),
      playerName: this.state.playerName,
      score: this.state.score,
      casesSolved: this.state.casesSolved,
      cluesCount: this.state.cluesCollected.length,
      encountersCount: this.state.visitedEncounters.length,
      citiesCount: this.state.visitedCities.length,
      energyLogSize: this.state.energyLog.length,
      moneyLogSize: this.state.moneyLog.length,
      travelHistorySize: this.state.travelHistory.length,
      isDirty: this.dirty,
      hasCheckpoint: this.saveCheckpoint !== null
    };
  }
}

/**
 * ✅ Singleton instance
 */
export const gameState = new GameStateManager();

/**
 * ✅ Expose tylko publiczne metody
 */
export function resetGameState() {
  gameState.resetFull();
}

export function resetCaseOutcomeState() {
  gameState.resetCaseOutcome();
}

export function resetReconstructedHeist() {
  gameState.resetReconstructedHeist();
}

export function cloneDefaultState() {
  return cloneGameData(defaultGameState);
}

/**
 * ✅ Debug mode — read-only w konsoli
 */
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'gameState', {
    get: () => ({
      _message: 'Use window.gameStateManager for read-only access',
      getState: () => gameState.getState(),
      getDebugInfo: () => gameState.getDebugInfo()
    }),
    configurable: false,
    enumerable: true
  });

  window.gameStateManager = gameState;  // ← Rzeczywisty manager
}