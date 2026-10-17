import { RouteManager } from './managers/RouteManager.js';

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

const COLLECTION_KEYS = Object.keys(INDEXED_COLLECTIONS);
const MANAGED_COLLECTION_KEYS = new Set(COLLECTION_KEYS);

const MANAGED_PRIVATE_KEYS = new Set(
  Object.values(INDEXED_COLLECTIONS).map(
    config => config.indexKey
  )
);

const MANAGER_KEYS = new Set([
  'state',
  'dirty',
  'saveCheckpoint',
  'historyLimit',
  'memoryObjectLimit'
]);

const BLOCKED_KEYS = new Set([
  '__proto__',
  'prototype',
  'constructor'
]);

const RUNTIME_KEYS = new Set([
  'caseDirector'
]);

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
  _version: GAME_STATE_VERSION,
  _lastSave: null,
  _createdAt: null,

  currentThiefId: null,
  currentThief: null,
  currentArtifact: null,

  artifactRecovery: {
    missionId: null,
    artifactId: null,
    recovered: false,
    recoveredAt: null,
    recoveredFrom: null,
    recoveredLocation: null,
    condition: null
  },

  recoveredArtifacts: [],

  currentCity: null,
  currentCityId: null,
  currentMission: null,
  currentCityData: null,
  currentEncounterId: null,
  currentCaseId: null,

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

  investigationPhaseActive: true,
  investigationStartTime: null,
  investigationDeadline: null,

  escapePhaseActive: false,
  escapeStartTime: null,
  escapeDeadline: null,
  timeWastedOnMistakes: 0,

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
  reconstructedHeist: createDefaultReconstructedHeist(),

  unifiedTravelManagerState: null,
  crimeCityProgress: {},
  crimeCityCurrentNodes: {},

  caseDirector: null,
  caseTemplate: null,

  caseData: {
    motiveId: null,
    correctMotiveAnswerId: null,
    motiveStagesDone: [],
    motiveBoardUnlocked: false,
    crimeWindow: null
  },

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

  suspectExclusionState: {},
  suspectGridInput: null,
  alibiInvestigation: null,

  crimeCityEncounterState: {},
  alibiAccusations: {},

  selectedThiefProfile: null,
  selectedThief: null,
  thief: null,

  realThiefSuspectId: null,
  trueThiefCaseSuspectId: null,
  forensicTwinSuspectId: null,
  forensicSurvivorIds: [],
  selectedSuspectId: null,

  mainStory: null
};

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function isValidId(id) {
  return (
    (typeof id === 'string' && id.trim().length > 0) ||
    (typeof id === 'number' && Number.isFinite(id))
  );
}

function getEntryId(entry) {
  const id =
    entry !== null && typeof entry === 'object'
      ? entry.id
      : entry;

  return isValidId(id) ? id : null;
}

function getIndexKey(id) {
  return `${typeof id}:${String(id)}`;
}

/**
 * Kopia danych do snapshotu lub zapisu.
 *
 * Nie przenosi funkcji, cykli ani dowolnych instancji klas.
 * RouteManager ma jawny kontrakt serializacji.
 */
function cloneGameData(value, ancestors = new WeakSet()) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    typeof value === 'bigint'
  ) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime())
      ? value.toISOString()
      : null;
  }

  if (value instanceof RouteManager) {
    return cloneGameData(value.serialize(), ancestors);
  }

  if (
    typeof value !== 'object' ||
    ancestors.has(value)
  ) {
    return undefined;
  }

  if (
    !Array.isArray(value) &&
    !isPlainObject(value)
  ) {
    return undefined;
  }

  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map(item => {
        const cloned = cloneGameData(item, ancestors);
        return cloned === undefined ? null : cloned;
      });
    }

    const result = {};

    for (const [key, item] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key)) {
        continue;
      }

      const cloned = cloneGameData(item, ancestors);

      if (cloned !== undefined) {
        result[key] = cloned;
      }
    }

    return result;
  } finally {
    ancestors.delete(value);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (
    value === null ||
    typeof value !== 'object' ||
    seen.has(value)
  ) {
    return value;
  }

  seen.add(value);

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key], seen);
  }

  return Object.freeze(value);
}

/**
 * Zachowuje format poprawnych wpisów:
 * obiekt pozostaje obiektem, starszy identyfikator pozostaje ID.
 *
 * Usuwa wpisy bez ID i powtórzenia tego samego ID.
 */
function normalizeCollection(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const result = [];
  const ids = new Set();

  for (const entry of entries) {
    const id = getEntryId(entry);

    if (id === null) {
      continue;
    }

    const key = getIndexKey(id);

    if (ids.has(key)) {
      continue;
    }

    const cloned = cloneGameData(entry);

    if (cloned === undefined) {
      continue;
    }

    ids.add(key);
    result.push(cloned);
  }

  return result;
}

function rebuildCollectionIndex(state, collectionKey) {
  const config = INDEXED_COLLECTIONS[collectionKey];

  if (!config) {
    return;
  }

  const collection = normalizeCollection(
    state[collectionKey]
  );

  const index = {};

  collection.forEach((entry, position) => {
    index[getIndexKey(getEntryId(entry))] = position;
  });

  state[collectionKey] = collection;
  state[config.indexKey] = index;
}

function rebuildStateIndexes(state) {
  for (const collectionKey of COLLECTION_KEYS) {
    rebuildCollectionIndex(state, collectionKey);
  }
}

function createInitialState() {
  const state = cloneGameData(defaultGameState);

  state._createdAt = Date.now();
  rebuildStateIndexes(state);

  return state;
}

/**
 * Starszy zapis mógł mieć dane jednocześnie w "state"
 * oraz bezpośrednio na najwyższym poziomie.
 *
 * Najwyższy poziom ma pierwszeństwo, zgodnie z dotychczasowym setupem.
 */
function unwrapImportedState(saveData) {
  if (!isPlainObject(saveData)) {
    return null;
  }

  const nested = isPlainObject(saveData.state)
    ? saveData.state
    : {};

  const result = {};

  for (const source of [nested, saveData]) {
    for (const [key, value] of Object.entries(source)) {
      if (
        MANAGER_KEYS.has(key) ||
        MANAGED_PRIVATE_KEYS.has(key) ||
        BLOCKED_KEYS.has(key) ||
        RUNTIME_KEYS.has(key)
      ) {
        continue;
      }

      result[key] = value;
    }
  }

  return result;
}

function restoreRouteManager(serialized) {
  if (!isPlainObject(serialized)) {
    return null;
  }

  const manager = new RouteManager(
    serialized.route,
    serialized.crimeCityId
  );

  manager.restore(serialized);
  return manager;
}

function normalizeImportedState(saveData) {
  const defaults = cloneGameData(defaultGameState);
  const source = cloneGameData(saveData);

  const state = {
    ...defaults,
    ...source
  };

  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (Array.isArray(defaultValue)) {
      if (!Array.isArray(state[key])) {
        state[key] = cloneGameData(defaultValue);
      }

      continue;
    }

    if (isPlainObject(defaultValue)) {
      state[key] = isPlainObject(source[key])
        ? {
            ...cloneGameData(defaultValue),
            ...source[key]
          }
        : cloneGameData(defaultValue);
    }
  }

  state.reconstructedHeist = {
    ...createDefaultReconstructedHeist(),
    ...(isPlainObject(source.reconstructedHeist)
      ? source.reconstructedHeist
      : {})
  };

  state.caseDirector = null;

  state.routeManager = restoreRouteManager(
    source.routeManager
  );

  state._version = GAME_STATE_VERSION;

  if (!Number.isFinite(state._createdAt)) {
    state._createdAt = Date.now();
  }

  rebuildStateIndexes(state);

  return state;
}

class GameStateManager {
  constructor() {
    this.state = createInitialState();
    this.dirty = false;
    this.saveCheckpoint = null;
    this.historyLimit = 100;
    this.memoryObjectLimit = 500;
  }

  getState() {
    return deepFreeze(this._exportData());
  }

  getSnapshot() {
    return this.getState();
  }

  _exportData() {
    const exported = {};

    for (const [key, value] of Object.entries(this.state)) {
      if (
        MANAGED_PRIVATE_KEYS.has(key) ||
        BLOCKED_KEYS.has(key) ||
        RUNTIME_KEYS.has(key) ||
        MANAGER_KEYS.has(key)
      ) {
        continue;
      }

      const cloned = cloneGameData(value);

      if (cloned !== undefined) {
        exported[key] = cloned;
      }
    }

    return exported;
  }

  updateState(updates) {
    if (!isPlainObject(updates)) {
      console.warn(
        '[GameState] updateState expects a plain object.'
      );

      return false;
    }

    let changed = false;

    for (const [key, value] of Object.entries(updates)) {
      if (
        BLOCKED_KEYS.has(key) ||
        MANAGER_KEYS.has(key) ||
        key.startsWith('_') ||
        key in GameStateManager.prototype
      ) {
        console.warn(
          `[GameState] Cannot update reserved field "${key}".`
        );

        continue;
      }

      if (MANAGED_COLLECTION_KEYS.has(key)) {
        changed =
          this.replaceIndexedCollection(key, value) ||
          changed;

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

  replaceIndexedCollection(collectionKey, entries) {
    if (!MANAGED_COLLECTION_KEYS.has(collectionKey)) {
      console.warn(
        `[GameState] Unknown indexed collection "${collectionKey}".`
      );

      return false;
    }

    if (!Array.isArray(entries)) {
      console.warn(
        `[GameState] "${collectionKey}" must be an array.`
      );

      return false;
    }

    this.state[collectionKey] = entries;
    rebuildCollectionIndex(this.state, collectionKey);
    this.dirty = true;

    return true;
  }

  rebuildIndexes() {
    rebuildStateIndexes(this.state);
    this.dirty = true;
  }

  _getIndexedEntry(collectionKey, id) {
    const config = INDEXED_COLLECTIONS[collectionKey];

    if (!config || !isValidId(id)) {
      return null;
    }

    const collection = this.state[collectionKey];
    const index = this.state[config.indexKey];
    const lookup = getIndexKey(id);

    if (!Array.isArray(collection)) {
      return null;
    }

    // Brak ID w poprawnym indeksie to zwykły brak wpisu.
    if (!index || !hasOwn(index, lookup)) {
      return null;
    }

    const position = index[lookup];
    const entry = collection[position];

    if (getEntryId(entry) === id) {
      return entry;
    }

    // Naprawa tylko wtedy, gdy istniejące wskazanie jest nieaktualne.
    rebuildCollectionIndex(this.state, collectionKey);

    const repairedIndex = this.state[config.indexKey];

    if (!hasOwn(repairedIndex, lookup)) {
      return null;
    }

    return this.state[collectionKey][repairedIndex[lookup]];
  }

  _addIndexedEntry(collectionKey, entry) {
    const id = getEntryId(entry);

    if (id === null) {
      console.warn(
        `[GameState] ${INDEXED_COLLECTIONS[collectionKey]?.label || 'Entry'} ` +
        'must have a valid id.'
      );

      return false;
    }

    if (this._getIndexedEntry(collectionKey, id) !== null) {
      return false;
    }

    const cloned = cloneGameData(entry);

    if (cloned === undefined) {
      return false;
    }

    const config = INDEXED_COLLECTIONS[collectionKey];
    const collection = this.state[collectionKey];

    this.state[config.indexKey][getIndexKey(id)] =
      collection.length;

    collection.push(cloned);
    this.dirty = true;

    return true;
  }

  _removeIndexedEntry(collectionKey, id) {
    if (this._getIndexedEntry(collectionKey, id) === null) {
      return false;
    }

    const config = INDEXED_COLLECTIONS[collectionKey];
    const position =
      this.state[config.indexKey][getIndexKey(id)];

    this.state[collectionKey].splice(position, 1);
    rebuildCollectionIndex(this.state, collectionKey);

    this.dirty = true;
    return true;
  }

  addClue(clue) {
    return this._addIndexedEntry('cluesCollected', clue);
  }

  getClue(id) {
    const entry = this._getIndexedEntry(
      'cluesCollected',
      id
    );

    return entry !== null
      ? deepFreeze(cloneGameData(entry))
      : null;
  }

  hasClue(id) {
    return this._getIndexedEntry(
      'cluesCollected',
      id
    ) !== null;
  }

  removeClue(id) {
    return this._removeIndexedEntry('cluesCollected', id);
  }

  clearClues() {
    return this.replaceIndexedCollection(
      'cluesCollected',
      []
    );
  }

  addEncounter(encounter) {
    return this._addIndexedEntry(
      'visitedEncounters',
      encounter
    );
  }

  getEncounter(id) {
    const entry = this._getIndexedEntry(
      'visitedEncounters',
      id
    );

    return entry !== null
      ? deepFreeze(cloneGameData(entry))
      : null;
  }

  hasEncounter(id) {
    return this._getIndexedEntry(
      'visitedEncounters',
      id
    ) !== null;
  }

  removeEncounter(id) {
    return this._removeIndexedEntry(
      'visitedEncounters',
      id
    );
  }

  clearEncounters() {
    return this.replaceIndexedCollection(
      'visitedEncounters',
      []
    );
  }

  addCity(city) {
    return this._addIndexedEntry('visitedCities', city);
  }

  getCity(id) {
    const entry = this._getIndexedEntry(
      'visitedCities',
      id
    );

    return entry !== null
      ? deepFreeze(cloneGameData(entry))
      : null;
  }

  hasCity(id) {
    return this._getIndexedEntry(
      'visitedCities',
      id
    ) !== null;
  }

  removeCity(id) {
    return this._removeIndexedEntry('visitedCities', id);
  }

  clearCities() {
    return this.replaceIndexedCollection(
      'visitedCities',
      []
    );
  }

  recoverArtifact(recoveryData = {}) {
    const missionId =
      recoveryData.missionId ||
      this.state.currentMission?.id ||
      this.state.currentMission?.missionId ||
      null;

    const artifact = recoveryData.artifact;

    if (!missionId || !artifact?.id) {
      console.warn(
        '[GameState] Recovery requires missionId and artifact.id.'
      );

      return false;
    }

    const alreadyRecovered =
      this.state.recoveredArtifacts.some(entry =>
        entry.missionId === missionId ||
        entry.artifactId === artifact.id
      );

    if (alreadyRecovered) {
      return false;
    }

    const recoveredAt =
      recoveryData.recoveredAt ||
      artifact.recoveredAt ||
      new Date().toISOString();

    const recoveredFrom =
      recoveryData.recoveredFrom ||
      artifact.recoveredFrom ||
      'suspect_apartment';

    const recoveredLocation =
      recoveryData.recoveredLocation ||
      artifact.recoveredLocation ||
      'Suspect Apartment';

    const recoveredArtifact = {
      ...cloneGameData(artifact),
      recovered: true,
      recoveredAt,
      recoveredFrom,
      recoveredLocation,

      condition:
        recoveryData.condition ||
        artifact.condition ||
        'intact'
    };

    const collectionEntry = {
      id: `recovered_${missionId}_${artifact.id}`,
      missionId,
      artifactId: recoveredArtifact.id,

      artifact:
        recoveredArtifact.label ||
        recoveredArtifact.name ||
        'Recovered Artefact',

      city:
        recoveredArtifact.city ||
        this.state.crimeCityId ||
        this.state.currentCityId ||
        'Unknown City',

      country:
        recoveredArtifact.country ||
        'Unknown Country',

      description:
        recoveredArtifact.description ||
        'A stolen artefact recovered during the investigation.',

      significance:
        recoveredArtifact.significance ||
        'Recovered from the suspect apartment.',

      artifactKey:
        recoveredArtifact.artifactKey ||
        recoveredArtifact.id,

      condition: recoveredArtifact.condition,
      recoveredAt,
      recoveredFrom,
      recoveredLocation
    };

    this.state.currentArtifact =
      cloneGameData(recoveredArtifact);

    this.state.artifactRecovery = {
      missionId,
      artifactId: recoveredArtifact.id,
      recovered: true,
      recoveredAt,
      recoveredFrom,
      recoveredLocation,
      condition: recoveredArtifact.condition
    };

    if (this.state.currentMission) {
      this.state.currentMission = {
        ...this.state.currentMission,
        artifact: cloneGameData(recoveredArtifact),
        artifactRecovered: true
      };
    }

    this.state.recoveredArtifacts.push(collectionEntry);
    this.dirty = true;

    return true;
  }

  _resolveMissionId(missionId = null) {
    return (
      missionId ||
      this.state.currentMission?.id ||
      this.state.currentMission?.missionId ||
      null
    );
  }

  hasRecoveredArtifact(missionId = null) {
    const target = this._resolveMissionId(missionId);

    return Boolean(
      target &&
      this.state.recoveredArtifacts.some(
        entry => entry.missionId === target
      )
    );
  }

  getRecoveredArtifact(missionId = null) {
    const target = this._resolveMissionId(missionId);

    if (!target) {
      return null;
    }

    const entry = this.state.recoveredArtifacts.find(
      item => item.missionId === target
    );

    return entry
      ? deepFreeze(cloneGameData(entry))
      : null;
  }

  addEnergyLog(entry) {
    this.state.energyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  addMoneyLog(entry) {
    this.state.moneyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  addTravel(entry) {
    this.state.travelHistory.push(cloneGameData(entry));
    this._rotateHistoryArrays();
    this.dirty = true;
  }

  addHiddenObjectAttempt(entry) {
    this.state.hiddenObjectHistory.push(
      cloneGameData(entry)
    );

    this._rotateHistoryArrays();
    this.dirty = true;
  }

  _rotateHistoryArrays() {
    const limit = Math.max(
      1,
      Math.floor(this.historyLimit) || 100
    );

    for (const key of [
      'energyLog',
      'moneyLog',
      'travelHistory',
      'hiddenObjectHistory'
    ]) {
      if (!Array.isArray(this.state[key])) {
        this.state[key] = [];
      }

      if (this.state[key].length > limit) {
        this.state[key] = this.state[key].slice(-limit);
      }
    }
  }

  garbageCollectMemory() {
    let changed = false;

    const limit = Math.max(
      1,
      Math.floor(this.memoryObjectLimit) || 500
    );

    for (const field of [
      'encounterMemory',
      'cityEncounterState'
    ]) {
      if (!isPlainObject(this.state[field])) {
        this.state[field] = {};
        changed = true;
      }

      const keys = Object.keys(this.state[field]);
      const excess = keys.length - limit;

      if (excess > 0) {
        for (const key of keys.slice(0, excess)) {
          delete this.state[field][key];
        }

        changed = true;
      }
    }

    if (changed) {
      this.dirty = true;
    }

    return changed;
  }

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

  resetReconstructedHeist() {
    this.state.reconstructedHeist =
      createDefaultReconstructedHeist();

    this.dirty = true;
  }

  resetFull() {
    this.state = createInitialState();
    this.dirty = true;
    this.saveCheckpoint = null;
  }

  createCheckpoint() {
    this.state._lastSave = Date.now();
    this.saveCheckpoint = this._exportData();
    this.dirty = false;

    return true;
  }

  restoreCheckpoint() {
    if (!this.saveCheckpoint) {
      console.warn('[GameState] No checkpoint available.');
      return false;
    }

    return this.importFromSave(this.saveCheckpoint);
  }

  validateSave(saveData) {
    if (!isPlainObject(saveData)) {
      return false;
    }

    if (
      typeof saveData.playerName !== 'string' ||
      typeof saveData.difficulty !== 'string' ||
      !Number.isFinite(saveData.score)
    ) {
      console.warn(
        '[GameState] Save requires playerName, difficulty and numeric score.'
      );

      return false;
    }

    if (
      saveData._version &&
      saveData._version !== GAME_STATE_VERSION
    ) {
      console.warn(
        `[GameState] Unsupported state version: ${saveData._version}.`
      );

      return false;
    }

    return true;
  }

  exportForSave() {
    this.state._lastSave = Date.now();

    return {
      ...this._exportData(),
      _version: GAME_STATE_VERSION,
      _lastSave: this.state._lastSave,
      _createdAt: this.state._createdAt
    };
  }

  importFromSave(saveData) {
    try {
      const source = unwrapImportedState(saveData);

      if (!source) {
        return false;
      }

      const imported = cloneGameData(source);

      if (!this.validateSave(imported)) {
        return false;
      }

      // Przygotowujemy cały nowy stan przed podmianą.
      const nextState = normalizeImportedState(imported);

      this.state = nextState;
      this.dirty = false;

      return true;
    } catch (error) {
      console.error(
        '[GameState] Save import failed:',
        error
      );

      return false;
    }
  }

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
      clueIndexSize: Object.keys(
        this.state._clueIndex
      ).length,

      encountersCount: this.state.visitedEncounters.length,
      encounterIndexSize: Object.keys(
        this.state._encounterIndex
      ).length,

      citiesCount: this.state.visitedCities.length,
      cityIndexSize: Object.keys(
        this.state._cityIndex
      ).length,

      energyLogSize: this.state.energyLog.length,
      moneyLogSize: this.state.moneyLog.length,
      travelHistorySize: this.state.travelHistory.length,

      isDirty: this.dirty,
      hasCheckpoint: this.saveCheckpoint !== null
    };
  }
}

const manager = new GameStateManager();
const boundMethods = new Map();

/**
 * Warstwa zgodności ze scenami:
 *
 * gameState.score = 100
 * Object.assign(gameState, {...})
 * gameState.addClue(...)
 *
 * Wszystkie dane trafiają do manager.state.
 */
export const gameState = new Proxy(manager, {
  get(target, key) {
    if (hasOwn(target, key)) {
      return Reflect.get(target, key, target);
    }

    const prototypeValue = Reflect.get(
      GameStateManager.prototype,
      key,
      target
    );

    if (typeof prototypeValue === 'function') {
      if (!boundMethods.has(key)) {
        boundMethods.set(
          key,
          prototypeValue.bind(target)
        );
      }

      return boundMethods.get(key);
    }

    return Reflect.get(target.state, key);
  },

  set(target, key, value) {
    if (typeof key === 'symbol') {
      return false;
    }

    if (
      BLOCKED_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      throw new TypeError(
        `[GameState] Cannot overwrite manager API "${key}".`
      );
    }

    if (MANAGER_KEYS.has(key)) {
      if (
        key === 'state' &&
        !isPlainObject(value)
      ) {
        throw new TypeError(
          '[GameState] state must be a plain object.'
        );
      }

      return Reflect.set(target, key, value, target);
    }

    if (MANAGED_PRIVATE_KEYS.has(key)) {
      throw new TypeError(
        `[GameState] "${key}" is a derived index.`
      );
    }

    if (MANAGED_COLLECTION_KEYS.has(key)) {
      if (!target.replaceIndexedCollection(key, value)) {
        throw new TypeError(
          `[GameState] "${key}" must be an array.`
        );
      }

      return true;
    }

    target.state[key] = value;
    target.dirty = true;

    return true;
  },

  has(target, key) {
    return (
      Reflect.has(target, key) ||
      Reflect.has(target.state, key)
    );
  },

  ownKeys(target) {
    return [
      ...new Set([
        ...Reflect.ownKeys(target),
        ...Reflect.ownKeys(target.state)
      ])
    ];
  },

  getOwnPropertyDescriptor(target, key) {
    const own = Reflect.getOwnPropertyDescriptor(
      target,
      key
    );

    if (own) {
      return own;
    }

    if (hasOwn(target.state, key)) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: target.state[key]
      };
    }

    return undefined;
  },

  /**
   * Zgodność z installRestoredFieldAccessors()
   * z poprzedniej wersji saveGameService.js.
   *
   * Proxy już przekierowuje te pola, więc nie instalujemy
   * kolejnego zestawu getterów i setterów na managerze.
   */
  defineProperty(target, key, descriptor) {
    if (
      typeof key !== 'string' ||
      BLOCKED_KEYS.has(key) ||
      MANAGER_KEYS.has(key) ||
      MANAGED_PRIVATE_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      return false;
    }

    if (descriptor.configurable === false) {
      return false;
    }

    if (
      typeof descriptor.get === 'function' ||
      typeof descriptor.set === 'function'
    ) {
      return (
        hasOwn(target.state, key) &&
        descriptor.configurable === true
      );
    }

    if (hasOwn(descriptor, 'value')) {
      if (MANAGED_COLLECTION_KEYS.has(key)) {
        return target.replaceIndexedCollection(
          key,
          descriptor.value
        );
      }

      target.state[key] = descriptor.value;
      target.dirty = true;
    }

    return true;
  },

  deleteProperty(target, key) {
    if (
      MANAGER_KEYS.has(key) ||
      MANAGED_PRIVATE_KEYS.has(key) ||
      BLOCKED_KEYS.has(key) ||
      key in GameStateManager.prototype
    ) {
      return false;
    }

    if (MANAGED_COLLECTION_KEYS.has(key)) {
      return target.replaceIndexedCollection(key, []);
    }

    if (hasOwn(target.state, key)) {
      delete target.state[key];
      target.dirty = true;
    }

    return true;
  }
});

export function resetGameState() {
  manager.resetFull();
}

export function resetCaseOutcomeState() {
  return manager.resetCaseOutcome();
}

export function resetReconstructedHeist() {
  manager.resetReconstructedHeist();
}

export function cloneDefaultState() {
  return cloneGameData(defaultGameState);
}

if (typeof window !== 'undefined') {
  const debugApi = Object.freeze({
    _message:
      'Read-only debug API. Use imported gameState in game code.',

    getState: () => manager.getState(),
    getDebugInfo: () => manager.getDebugInfo()
  });

  const descriptor = Object.getOwnPropertyDescriptor(
    window,
    'gameState'
  );

  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(window, 'gameState', {
      get: () => debugApi,
      configurable: false,
      enumerable: true
    });
  }
}