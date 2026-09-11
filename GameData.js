/**
 * GameData.js
 *
 * Centralny manager stanu gry.
 *
 * Zasady:
 * - this.state jest prywatnym stanem roboczym managera.
 * - getState() ZAWSZE zwraca read-only snapshot, nigdy referencję do this.state.
 * - cluesCollected, visitedEncounters i visitedCities zmieniamy wyłącznie
 *   metodami add/remove managera.
 * - _clueIndex, _encounterIndex i _cityIndex są cachem pochodnym:
 *   nie zapisujemy ich do save'a i zawsze odbudowujemy po imporcie.
 */

const GAME_STATE_VERSION = '1.0.0';

const INDEXED_COLLECTIONS = {
  cluesCollected: {
    indexKey: '_clueIndex',
    label: 'clue'
  },
  visitedEncounters: {
    indexKey: '_encounterIndex',
    label: 'encounter'
  },
  visitedCities: {
    indexKey: '_cityIndex',
    label: 'city'
  }
};

const MANAGED_COLLECTION_KEYS = new Set(Object.keys(INDEXED_COLLECTIONS));

const MANAGED_PRIVATE_KEYS = new Set(
  Object.values(INDEXED_COLLECTIONS).map(config => config.indexKey)
);

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
  // Metadata
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
  passport: null,

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

  // Kolekcje indeksowane.
  // Tablice są źródłem prawdy, indeksy są cachem odbudowywanym automatycznie.
  cluesCollected: [],
  _clueIndex: {},

  visitedEncounters: [],
  _encounterIndex: {},

  visitedCities: [],
  _cityIndex: {},

  playerNotes: '',
  encounterMemory: {},
  cityEncounterState: {},

  storyPhoneCallTriggered: false,
  pendingPhoneCall: false,
  pendingPhoneCallCityId: null,

  hiddenObjectHistory: [],
  reconstructedHeist: createDefaultReconstructedHeist()
};

/**
 * Głębokie klonowanie danych stanu.
 * structuredClone obsługuje zwykłe obiekty, tablice, Map/Set itd.
 * Fallback jest wystarczający dla danych serializowalnych save'a.
 */
function cloneGameData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return deepClone(value);
}

function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return seen.get(value);
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    const clonedArray = [];
    seen.set(value, clonedArray);

    for (const item of value) {
      clonedArray.push(deepClone(item, seen));
    }

    return clonedArray;
  }

  const clonedObject = {};
  seen.set(value, clonedObject);

  for (const [key, item] of Object.entries(value)) {
    clonedObject[key] = deepClone(item, seen);
  }

  return clonedObject;
}

/**
 * Zamraża snapshot rekurencyjnie.
 *
 * Object.freeze() nie jest pełnym systemem bezpieczeństwa, ale w module ES
 * bardzo skutecznie łapie przypadkowe .push(), .splice() i przypisania,
 * zanim uszkodzą stan gry.
 */
function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }

  return Object.freeze(value);
}

/**
 * Tworzy świeży stan startowy wraz z indeksami pochodnymi.
 */
function createInitialState() {
  const state = cloneGameData(defaultGameState);
  state._createdAt = Date.now();
  rebuildStateIndexes(state);
  return state;
}

/**
 * Odbudowuje indeks konkretnej kolekcji.
 *
 * Jeśli save zawiera duplikaty ID, zachowujemy pierwsze wystąpienie.
 * To jest celowe: addClue/addCity/addEncounter również nie dopuszczają
 * duplikatów, a przy uszkodzonym save nie chcemy zmieniać kolejności danych.
 */
function rebuildCollectionIndex(state, collectionKey) {
  const config = INDEXED_COLLECTIONS[collectionKey];

  if (!config) {
    console.warn(`[GameState] No index configuration for: ${collectionKey}`);
    return;
  }

  const collection = Array.isArray(state[collectionKey])
    ? state[collectionKey]
    : [];

  state[collectionKey] = collection;

  const index = {};

  collection.forEach((entry, position) => {
    const id = entry?.id;

    if (!id) {
      console.warn(
        `[GameState] Ignoring ${config.label} without id at ${collectionKey}[${position}]`
      );
      return;
    }

    if (index[id] !== undefined) {
      console.warn(
        `[GameState] Duplicate ${config.label} id "${id}" in ${collectionKey}; keeping first occurrence`
      );
      return;
    }

    index[id] = position;
  });

  state[config.indexKey] = index;
}

/**
 * Indeksy są danymi pochodnymi, więc ten helper jest jedynym miejscem,
 * które je kompletnie odtwarza.
 */
function rebuildStateIndexes(state) {
  for (const collectionKey of Object.keys(INDEXED_COLLECTIONS)) {
    rebuildCollectionIndex(state, collectionKey);
  }
}

/**
 * Normalizuje importowany stan:
 * - przywraca brakujące pola z defaultów,
 * - nie ufa prywatnym indeksom z save'a,
 * - gwarantuje poprawne typy kolekcji indeksowanych.
 */
function normalizeImportedState(saveData) {
  const state = cloneGameData({
    ...defaultGameState,
    ...saveData
  });

  state.reconstructedHeist = {
    ...createDefaultReconstructedHeist(),
    ...(saveData?.reconstructedHeist || {})
  };

  for (const collectionKey of MANAGED_COLLECTION_KEYS) {
    if (!Array.isArray(state[collectionKey])) {
      console.warn(
        `[GameState] Invalid ${collectionKey} in save; restoring an empty array`
      );
      state[collectionKey] = [];
    }
  }

  state._version = GAME_STATE_VERSION;
  rebuildStateIndexes(state);

  return state;
}

/**
 * GAME STATE MANAGER
 */
class GameStateManager {
  constructor() {
    this.state = createInitialState();
    this.dirty = false;
    this.saveCheckpoint = null;
    this.historyLimit = 100;
    this.memoryObjectLimit = 500;
  }

  /**
   * Read-only snapshot.
   *
   * WAŻNE:
   * Nie zwracamy this.state, ponieważ wtedy ten kod psujełby indeks:
   *
   * gameState.getState().cluesCollected.push(newClue);
   *
   * Otrzymany snapshot można bezpiecznie czytać, ale jego mutacja rzuci
   * błąd w strict mode albo po prostu nie zmieni danych managera.
   */
  getState() {
    return deepFreeze(cloneGameData(this.state));
  }

  /**
   * Opcjonalny alias, który lepiej komunikuje przeznaczenie API w scenach.
   */
  getSnapshot() {
    return this.getState();
  }

  /**
   * Centralna aktualizacja prostych pól stanu.
   *
   * Kolekcje indeksowane mają własne metody API, żeby cache indeksów
   * pozostawał zawsze spójny.
   */
  updateState(updates) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      console.warn('[GameState] updateState expects a plain object');
      return false;
    }

    let changed = false;

    for (const [key, value] of Object.entries(updates)) {
      if (MANAGED_PRIVATE_KEYS.has(key)) {
        console.warn(
          `[GameState] "${key}" is a derived index and cannot be set manually`
        );
        continue;
      }

      if (key.startsWith('_')) {
        console.warn(`[GameState] Attempt to set private field: ${key}`);
        continue;
      }

      if (!(key in this.state)) {
        console.warn(`[GameState] Unknown field: ${key}`);
        continue;
      }

      if (MANAGED_COLLECTION_KEYS.has(key)) {
        console.warn(
          `[GameState] "${key}" is a managed collection. Use its add/remove/replace API instead.`
        );
        continue;
      }

      this.state[key] = value;
      changed = true;
    }

    if (changed) {
      this.dirty = true;
    }

    return changed;
  }

  /**
   * Wymiana całej kolekcji jest dopuszczalna tylko przez jawne API,
   * np. przy restarcie konkretnego etapu lub kompatybilności scen.
   */
  replaceIndexedCollection(collectionKey, entries) {
    if (!INDEXED_COLLECTIONS[collectionKey]) {
      console.warn(`[GameState] Unknown indexed collection: ${collectionKey}`);
      return false;
    }

    if (!Array.isArray(entries)) {
      console.warn(
        `[GameState] replaceIndexedCollection expects an array for ${collectionKey}`
      );
      return false;
    }

    this.state[collectionKey] = cloneGameData(entries);
    rebuildCollectionIndex(this.state, collectionKey);
    this.dirty = true;

    return true;
  }

  /**
   * Publiczna naprawa indeksów.
   *
   * Przydaje się jako bezpiecznik podczas developmentu albo po ręcznej
   * migracji danych. W prawidłowym kodzie gry nie powinna być potrzebna,
   * bo publiczne API nie pozwala uszkodzić indeksów.
   */
  rebuildIndexes() {
    rebuildStateIndexes(this.state);
    this.dirty = true;
  }

  /**
   * Weryfikuje, czy mapowanie ID -> pozycja nadal wskazuje poprawny obiekt.
   * Jeśli nie, naprawia tylko wymagany indeks i próbuje raz jeszcze.
   */
  _getIndexedEntry(collectionKey, id) {
    const config = INDEXED_COLLECTIONS[collectionKey];

    if (!config || !id) {
      return null;
    }

    const collection = this.state[collectionKey];
    const index = this.state[config.indexKey];
    const position = index?.[id];

    if (
      position !== undefined &&
      collection[position] &&
      collection[position].id === id
    ) {
      return collection[position];
    }

    rebuildCollectionIndex(this.state, collectionKey);

    const repairedPosition = this.state[config.indexKey][id];

    return repairedPosition !== undefined
      ? this.state[collectionKey][repairedPosition]
      : null;
  }

  /**
   * Dodaje element do indeksowanej kolekcji.
   */
  _addIndexedEntry(collectionKey, entry) {
    const config = INDEXED_COLLECTIONS[collectionKey];

    if (!config || !entry?.id) {
      console.warn(
        `[GameState] ${config?.label || 'Indexed entry'} must have a non-empty id`
      );
      return false;
    }

    const existing = this._getIndexedEntry(collectionKey, entry.id);

    if (existing) {
      return false;
    }

    const collection = this.state[collectionKey];
    const position = collection.length;

    collection.push(cloneGameData(entry));
    this.state[config.indexKey][entry.id] = position;
    this.dirty = true;

    return true;
  }

  /**
   * Usuwa element z indeksowanej kolekcji.
   */
  _removeIndexedEntry(collectionKey, id) {
    const config = INDEXED_COLLECTIONS[collectionKey];

    if (!config || !id) {
      return false;
    }

    const entry = this._getIndexedEntry(collectionKey, id);

    if (!entry) {
      return false;
    }

    const index = this.state[config.indexKey][id];
    this.state[collectionKey].splice(index, 1);

    rebuildCollectionIndex(this.state, collectionKey);
    this.dirty = true;

    return true;
  }

  /**
   * Clues
   */
  addClue(clue) {
    return this._addIndexedEntry('cluesCollected', clue);
  }

  getClue(clueId) {
    const clue = this._getIndexedEntry('cluesCollected', clueId);
    return clue ? deepFreeze(cloneGameData(clue)) : null;
  }

  hasClue(clueId) {
    return this._getIndexedEntry('cluesCollected', clueId) !== null;
  }

  removeClue(clueId) {
    return this._removeIndexedEntry('cluesCollected', clueId);
  }

  clearClues() {
    return this.replaceIndexedCollection('cluesCollected', []);
  }

  /**
   * Encounters
   */
  addEncounter(encounter) {
    return this._addIndexedEntry('visitedEncounters', encounter);
  }

  getEncounter(encounterId) {
    const encounter = this._getIndexedEntry(
      'visitedEncounters',
      encounterId
    );

    return encounter ? deepFreeze(cloneGameData(encounter)) : null;
  }

  hasEncounter(encounterId) {
    return this._getIndexedEntry('visitedEncounters', encounterId) !== null;
  }

  removeEncounter(encounterId) {
    return this._removeIndexedEntry('visitedEncounters', encounterId);
  }

  clearEncounters() {
    return this.replaceIndexedCollection('visitedEncounters', []);
  }

  /**
   * Cities
   */
  addCity(city) {
    return this._addIndexedEntry('visitedCities', city);
  }

  getCity(cityId) {
    const city = this._getIndexedEntry('visitedCities', cityId);
    return city ? deepFreeze(cloneGameData(city)) : null;
  }

  hasCity(cityId) {
    return this._getIndexedEntry('visitedCities', cityId) !== null;
  }

  removeCity(cityId) {
    return this._removeIndexedEntry('visitedCities', cityId);
  }

  clearCities() {
    return this.replaceIndexedCollection('visitedCities', []);
  }

  /**
   * Historia energii
   */
  addEnergyLog(entry) {
    this.state.energyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  /**
   * Historia pieniędzy
   */
  addMoneyLog(entry) {
    this.state.moneyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  /**
   * Historia podróży
   */
  addTravel(travel) {
    this.state.travelHistory.push(cloneGameData(travel));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  /**
   * Historia prób hidden-object
   */
  addHiddenObjectAttempt(attempt) {
    this.state.hiddenObjectHistory.push(cloneGameData(attempt));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  /**
   * Zachowuje wyłącznie ostatnie N wpisów historii.
   */
  _rotateHistoryArrays() {
    const arrays = [
      'energyLog',
      'moneyLog',
      'travelHistory',
      'hiddenObjectHistory'
    ];

    for (const arrayName of arrays) {
      if (this.state[arrayName].length > this.historyLimit) {
        this.state[arrayName] = this.state[arrayName].slice(
          -this.historyLimit
        );
      }
    }
  }

  /**
   * Usuwa stare wpisy pamięci encounterów i miast.
   */
  garbageCollectMemory() {
    let changed = false;

    const encounterKeys = Object.keys(this.state.encounterMemory);

    if (encounterKeys.length > this.memoryObjectLimit) {
      const countToRemove = encounterKeys.length - this.memoryObjectLimit;

      encounterKeys.slice(0, countToRemove).forEach(key => {
        delete this.state.encounterMemory[key];
      });

      changed = true;
    }

    const cityKeys = Object.keys(this.state.cityEncounterState);

    if (cityKeys.length > this.memoryObjectLimit) {
      const countToRemove = cityKeys.length - this.memoryObjectLimit;

      cityKeys.slice(0, countToRemove).forEach(key => {
        delete this.state.cityEncounterState[key];
      });

      changed = true;
    }

    if (changed) {
      this.dirty = true;
    }

    return changed;
  }

  /**
   * Reset wyniku sprawy.
   */
  resetCaseOutcome() {
    return this.updateState({
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
   * Reset minigry reconstruction.
   */
  resetReconstructedHeist() {
    this.state.reconstructedHeist = createDefaultReconstructedHeist();
    this.dirty = true;
  }

  /**
   * Pełny reset gry.
   */
  resetFull() {
    this.state = createInitialState();
    this.dirty = true;
    this.saveCheckpoint = null;
  }

  /**
   * Tworzy checkpoint wewnętrznego stanu.
   * Kopiujemy pełny stan łącznie z indeksami, ale przy odtworzeniu i tak
   * odtwarzamy cache indeksów z tablic.
   */
  createCheckpoint() {
    this.state._lastSave = Date.now();
    this.saveCheckpoint = cloneGameData(this.state);
    this.dirty = false;
  }

  /**
   * Przywraca checkpoint.
   */
  restoreCheckpoint() {
    if (!this.saveCheckpoint) {
      console.warn('[GameState] No checkpoint available');
      return false;
    }

    this.state = normalizeImportedState(this.saveCheckpoint);
    this.dirty = false;

    return true;
  }

  /**
   * Walidacja zapisu.
   */
  validateSave(saveData) {
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
      return false;
    }

    if (saveData._version && saveData._version !== GAME_STATE_VERSION) {
      console.warn(
        `[GameState] Save version mismatch: ${saveData._version} vs ${GAME_STATE_VERSION}`
      );

      return this._migrateFromOldVersion(saveData);
    }

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
   * Miejsce na przyszłe migracje.
   */
  _migrateFromOldVersion(oldSave) {
    console.log(`[GameState] Migrating from version: ${oldSave._version}`);

    /*
    Przykład:
    if (oldSave._version === '1.0.0') {
      oldSave.someNewField = defaultGameState.someNewField;
    }
    */

    oldSave._version = GAME_STATE_VERSION;
    return true;
  }

  /**
   * Eksport save'a.
   *
   * Prywatne pola zaczynające się od "_" nie są zapisywane.
   * Dotyczy to również cache indeksów, które zostaną odtworzone przy imporcie.
   */
  exportForSave() {
    this.state._lastSave = Date.now();

    const exported = {};

    for (const [key, value] of Object.entries(this.state)) {
      if (!key.startsWith('_')) {
        exported[key] = cloneGameData(value);
      }
    }

    return {
      _version: GAME_STATE_VERSION,
      _lastSave: this.state._lastSave,
      _createdAt: this.state._createdAt,
      ...exported
    };
  }

  /**
   * Import save'a.
   *
   * Nie importujemy starych _clueIndex / _cityIndex / _encounterIndex:
   * są one pochodne i zawsze wyliczane od nowa z tablic.
   */
  importFromSave(saveData) {
    const importedData = cloneGameData(saveData);

    if (!this.validateSave(importedData)) {
      console.error('[GameState] Save validation failed');
      return false;
    }

    this.state = normalizeImportedState(importedData);
    this.dirty = false;

    return true;
  }

  /**
   * Informacje debugowe bez wystawiania referencji do stanu.
   */
  getDebugInfo() {
    return {
      version: this.state._version,
      lastSave: this.state._lastSave
        ? new Date(this.state._lastSave)
        : null,
      createdAt: this.state._createdAt
        ? new Date(this.state._createdAt)
        : null,
      playerName: this.state.playerName,
      score: this.state.score,
      casesSolved: this.state.casesSolved,
      cluesCount: this.state.cluesCollected.length,
      clueIndexSize: Object.keys(this.state._clueIndex).length,
      encountersCount: this.state.visitedEncounters.length,
      encounterIndexSize: Object.keys(this.state._encounterIndex).length,
      citiesCount: this.state.visitedCities.length,
      cityIndexSize: Object.keys(this.state._cityIndex).length,
      energyLogSize: this.state.energyLog.length,
      moneyLogSize: this.state.moneyLog.length,
      travelHistorySize: this.state.travelHistory.length,
      isDirty: this.dirty,
      hasCheckpoint: this.saveCheckpoint !== null
    };
  }
}

export const gameState = new GameStateManager();

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
 * Debug API.
 *
 * Nie wystawiamy gameStateManager jako pełnego managera, bo umożliwiałoby to:
 * window.gameStateManager.state.cluesCollected.push(...)
 *
 * Zamiast tego konsola ma wyłącznie snapshot i statystyki.
 */
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'gameState', {
    get: () =>
      Object.freeze({
        _message:
          'Read-only debug API. Use imported gameState methods in game code.',
        getState: () => gameState.getState(),
        getDebugInfo: () => gameState.getDebugInfo()
      }),
    configurable: false,
    enumerable: true
  });
}