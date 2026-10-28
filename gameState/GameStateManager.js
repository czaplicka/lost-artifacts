import {
  createDefaultReconstructedHeist
} from './defaultState.js';

import {
  GAME_VERSION
} from '../config/gameVersion.js';

import {
  BLOCKED_KEYS,
  MANAGER_KEYS,
  RUNTIME_KEYS,
  hasOwn,
  isPlainObject,
  isValidId,
  getEntryId,
  getIndexKey,
  cloneGameData,
  deepFreeze
} from './dataUtils.js';

import {
  INDEXED_COLLECTIONS,
  MANAGED_COLLECTION_KEYS,
  MANAGED_PRIVATE_KEYS,
  rebuildCollectionIndex,
  rebuildStateIndexes
} from './indexedCollections.js';

import {
  createInitialState,
  unwrapImportedState,
  normalizeImportedState
} from './importExport.js';

export class GameStateManager {
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

    rebuildCollectionIndex(
      this.state,
      collectionKey,
      true
    );

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

    if (!Array.isArray(collection)) {
      return null;
    }

    const lookup = getIndexKey(id);
    const index = this.state[config.indexKey];
    const indexIsObject = isPlainObject(index);

    if (indexIsObject && hasOwn(index, lookup)) {
      const entry = collection[index[lookup]];

      if (getEntryId(entry) === id) {
        return entry;
      }
    }

    // Odbudowujemy indeks tylko wtedy, gdy może być nieaktualny.
    const needsRebuild =
      !indexIsObject ||
      Object.keys(index).length !== collection.length ||
      hasOwn(index, lookup);

    if (!needsRebuild) {
      return null;
    }

    rebuildCollectionIndex(
      this.state,
      collectionKey
    );

    const repairedIndex =
      this.state[config.indexKey];

    if (!hasOwn(repairedIndex, lookup)) {
      return null;
    }

    return this.state[collectionKey][
      repairedIndex[lookup]
    ];
  }

  _addIndexedEntry(collectionKey, entry) {
    const id = getEntryId(entry);

    if (id === null) {
      console.warn(
        `[GameState] ${
          INDEXED_COLLECTIONS[collectionKey]?.label ||
          'Entry'
        } must have a valid id.`
      );

      return false;
    }

    if (
      this._getIndexedEntry(collectionKey, id) !== null
    ) {
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
    if (
      this._getIndexedEntry(collectionKey, id) === null
    ) {
      return false;
    }

    const config = INDEXED_COLLECTIONS[collectionKey];

    const position =
      this.state[config.indexKey][getIndexKey(id)];

    this.state[collectionKey].splice(position, 1);

    rebuildCollectionIndex(
      this.state,
      collectionKey
    );

    this.dirty = true;

    return true;
  }

  addClue(clue) {
    return this._addIndexedEntry(
      'cluesCollected',
      clue
    );
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
    return this._removeIndexedEntry(
      'cluesCollected',
      id
    );
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
    return this._addIndexedEntry(
      'visitedCities',
      city
    );
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
    return this._removeIndexedEntry(
      'visitedCities',
      id
    );
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

    this.state.recoveredArtifacts.push(
      collectionEntry
    );

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
    const target = this._resolveMissionId(
      missionId
    );

    return Boolean(
      target &&
      this.state.recoveredArtifacts.some(
        entry => entry.missionId === target
      )
    );
  }

  getRecoveredArtifact(missionId = null) {
    const target = this._resolveMissionId(
      missionId
    );

    if (!target) {
      return null;
    }

    const entry =
      this.state.recoveredArtifacts.find(
        item => item.missionId === target
      );

    return entry
      ? deepFreeze(cloneGameData(entry))
      : null;
  }

  addEnergyLog(entry) {
    this.state.energyLog.push(
      cloneGameData(entry)
    );

    this._rotateHistoryArrays();
    this.dirty = true;
  }

  addMoneyLog(entry) {
    this.state.moneyLog.push(
      cloneGameData(entry)
    );

    this._rotateHistoryArrays();
    this.dirty = true;
  }

  addTravel(entry) {
    this.state.travelHistory.push(
      cloneGameData(entry)
    );

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
        this.state[key] =
          this.state[key].slice(-limit);
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

      const keys = Object.keys(
        this.state[field]
      );

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
    // Reset wyniku i etapów końcowych przy nowej sprawie.
    // Historia przewinień pozostaje zachowana.
    return this.updateState({
      finalArrestResult: null,
      finalArrestSuspectId: null,

      caseResolved: false,
      caseFailed: false,

      arrestWarrantIssued: false,
      warrantSuspectName: null,
      warrantSuspectId: null,

      gameOverReason: '',

      chaseState: null,
      courtState: null
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
      console.warn(
        '[GameState] No checkpoint available.'
      );

      return false;
    }

    return this.importFromSave(
      this.saveCheckpoint
    );
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
      saveData._version !== GAME_VERSION
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
      _version: GAME_VERSION,
      _lastSave: this.state._lastSave,
      _createdAt: this.state._createdAt
    };
  }

  importFromSave(saveData) {
    try {
      const source =
        unwrapImportedState(saveData);

      if (!source) {
        return false;
      }

      // Klonujemy dane przed walidacją i normalizacją.
      const imported = cloneGameData(source);

      if (!this.validateSave(imported)) {
        return false;
      }

      // Nie resetujemy courtState ani chaseState:
      // wczytanie ma zachować postęp rozgrywki.
      const nextState =
        normalizeImportedState(imported);

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

      cluesCount:
        this.state.cluesCollected.length,

      clueIndexSize: Object.keys(
        this.state._clueIndex
      ).length,

      encountersCount:
        this.state.visitedEncounters.length,

      encounterIndexSize: Object.keys(
        this.state._encounterIndex
      ).length,

      citiesCount:
        this.state.visitedCities.length,

      cityIndexSize: Object.keys(
        this.state._cityIndex
      ).length,

      energyLogSize:
        this.state.energyLog.length,

      moneyLogSize:
        this.state.moneyLog.length,

      travelHistorySize:
        this.state.travelHistory.length,

      isDirty: this.dirty,

      hasCheckpoint:
        this.saveCheckpoint !== null
    };
  }
}