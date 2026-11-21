import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { createDefaultReconstructedHeist } from './defaultState.js';
import { GAME_VERSION } from '../config/gameVersion.js';
import {
  BLOCKED_KEYS, MANAGER_KEYS, RUNTIME_KEYS, hasOwn, isPlainObject,
  isValidId, getEntryId, getIndexKey, cloneGameData, deepFreeze
} from './dataUtils.js';
import {
  INDEXED_COLLECTIONS, MANAGED_COLLECTION_KEYS, MANAGED_PRIVATE_KEYS,
  rebuildCollectionIndex, rebuildStateIndexes
} from './indexedCollections.js';
import { createInitialState, unwrapImportedState, normalizeImportedState } from './importExport.js';

function parseVersion(value) {
  if (typeof value !== 'string') return null;
  const match = /^(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.exec(value.trim());
  if (!match) return null;
  const core = [match[1], match[2] || '0', match[3] || '0'];
  const prerelease = match[4] ? match[4].split('.') : [];
  if (prerelease.some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === '0')) return null;
  return { core, prerelease };
}

function compareNumericParts(first, second) {
  if (first.length !== second.length) return first.length < second.length ? -1 : 1;
  return first === second ? 0 : first < second ? -1 : 1;
}

function compareVersions(first, second) {
  for (let i = 0; i < 3; i++) {
    const result = compareNumericParts(first.core[i], second.core[i]);
    if (result) return result;
  }
  const a = first.prerelease, b = second.prerelease;
  if (!a.length || !b.length) return a.length === b.length ? 0 : !a.length ? 1 : -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    if (a[i] === b[i]) continue;
    const aNumeric = /^\d+$/.test(a[i]), bNumeric = /^\d+$/.test(b[i]);
    if (aNumeric && bNumeric) return compareNumericParts(a[i], b[i]);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

const sameId = (first, second) =>
  isValidId(first) && isValidId(second) && String(first) === String(second);

export class GameStateManager {
  constructor() {
    this.state = createInitialState();
    this.saveCheckpoint = null;
    this.historyLimit = 100;
    this.memoryObjectLimit = 500;

    // Keep ordinary objects and arrays: no deep proxies in saved data.
    // A clean baseline also detects mutations made through old references.
    let explicitlyDirty = false;
    let cleanSignature = this._getDirtySignature();
    Object.defineProperty(this, 'dirty', {
      configurable: true,
      enumerable: true,
      get: () => {
        if (explicitlyDirty) return true;
        try {
          if (this._getDirtySignature() !== cleanSignature) explicitlyDirty = true;
        } catch {
          explicitlyDirty = true;
        }
        return explicitlyDirty;
      },
      set: value => {
        if (value) {
          explicitlyDirty = true;
          return;
        }
        try {
          cleanSignature = this._getDirtySignature();
          explicitlyDirty = false;
        } catch {
          explicitlyDirty = true;
        }
      }
    });
  }

  _getDirtySignature() {
    const data = this._exportData();
    // Exporting a save updates metadata, not gameplay progress.
    delete data._lastSave;
    return JSON.stringify(data);
  }

  getState() { return deepFreeze(this._exportData()); }
  getSnapshot() { return this.getState(); }

  _exportData() {
    const exported = {};
    for (const [key, value] of Object.entries(this.state)) {
      if (MANAGED_PRIVATE_KEYS.has(key) || BLOCKED_KEYS.has(key) ||
          RUNTIME_KEYS.has(key) || MANAGER_KEYS.has(key)) continue;
      const cloned = cloneGameData(value);
      if (cloned !== undefined) exported[key] = cloned;
    }
    return exported;
  }

  updateState(updates) {
    if (!isPlainObject(updates)) {
      console.warn('[GameState] updateState expects a plain object.');
      return false;
    }
    let changed = false;
    for (const [key, value] of Object.entries(updates)) {
      if (BLOCKED_KEYS.has(key) || MANAGER_KEYS.has(key) || key.startsWith('_') || key in GameStateManager.prototype) {
        console.warn(`[GameState] Cannot update reserved field "${key}".`);
        continue;
      }
      if (MANAGED_COLLECTION_KEYS.has(key)) {
        changed = this.replaceIndexedCollection(key, value) || changed;
        continue;
      }
      // Runtime managers retain identity; serialized game data does not.
      const cloned = RUNTIME_KEYS.has(key) ? value : cloneGameData(value);
      if (cloned === undefined && value !== undefined) {
        console.warn(`[GameState] Cannot clone field "${key}".`);
        continue;
      }
      this.state[key] = cloned;
      changed = true;
    }
    if (changed) this.dirty = true;
    return changed;
  }

  replaceIndexedCollection(collectionKey, entries) {
    if (!MANAGED_COLLECTION_KEYS.has(collectionKey)) {
      console.warn(`[GameState] Unknown indexed collection "${collectionKey}".`);
      return false;
    }
    if (!Array.isArray(entries)) {
      console.warn(`[GameState] "${collectionKey}" must be an array.`);
      return false;
    }
    // Rebuilding with clone=true copies both the array and its entries.
    this.state[collectionKey] = entries;
    rebuildCollectionIndex(this.state, collectionKey, true);
    this.dirty = true;
    return true;
  }

  rebuildIndexes() { rebuildStateIndexes(this.state); this.dirty = true; }

  _getIndexedEntry(collectionKey, id) {
    const config = INDEXED_COLLECTIONS[collectionKey];
    if (!config || !isValidId(id)) return null;
    const collection = this.state[collectionKey];
    if (!Array.isArray(collection)) return null;
    const lookup = getIndexKey(id), index = this.state[config.indexKey];
    const indexIsObject = isPlainObject(index);
    if (indexIsObject && hasOwn(index, lookup)) {
      const entry = collection[index[lookup]];
      if (getEntryId(entry) === id) return entry;
    }
    const needsRebuild = !indexIsObject || Object.keys(index).length !== collection.length || hasOwn(index, lookup);
    // Equal lengths do not prove the index is current: callers may replace an
    // entry or change its ID through an existing array/object reference.
    if (!needsRebuild && !collection.some(entry => getEntryId(entry) === id)) return null;
    rebuildCollectionIndex(this.state, collectionKey);
    const repairedIndex = this.state[config.indexKey];
    if (!hasOwn(repairedIndex, lookup)) return null;
    return this.state[collectionKey][repairedIndex[lookup]];
  }

  _addIndexedEntry(collectionKey, entry) {
    const id = getEntryId(entry);
    if (id === null) {
      console.warn(`[GameState] ${INDEXED_COLLECTIONS[collectionKey]?.label || 'Entry'} must have a valid id.`);
      return false;
    }
    if (this._getIndexedEntry(collectionKey, id) !== null) return false;
    const cloned = cloneGameData(entry);
    if (cloned === undefined) return false;
    const config = INDEXED_COLLECTIONS[collectionKey], collection = this.state[collectionKey];
    this.state[config.indexKey][getIndexKey(id)] = collection.length;
    collection.push(cloned);
    this.dirty = true;
    return true;
  }

  _removeIndexedEntry(collectionKey, id) {
    if (this._getIndexedEntry(collectionKey, id) === null) return false;
    const config = INDEXED_COLLECTIONS[collectionKey];
    const position = this.state[config.indexKey][getIndexKey(id)];
    this.state[collectionKey].splice(position, 1);
    rebuildCollectionIndex(this.state, collectionKey);
    this.dirty = true;
    return true;
  }

  addClue(clue) { return this._addIndexedEntry('cluesCollected', clue); }
  getClue(id) {
    const entry = this._getIndexedEntry('cluesCollected', id);
    return entry !== null ? deepFreeze(cloneGameData(entry)) : null;
  }
  hasClue(id) { return this._getIndexedEntry('cluesCollected', id) !== null; }
  removeClue(id) { return this._removeIndexedEntry('cluesCollected', id); }
  clearClues() { return this.replaceIndexedCollection('cluesCollected', []); }

  addEncounter(encounter) { return this._addIndexedEntry('visitedEncounters', encounter); }
  getEncounter(id) {
    const entry = this._getIndexedEntry('visitedEncounters', id);
    return entry !== null ? deepFreeze(cloneGameData(entry)) : null;
  }
  hasEncounter(id) { return this._getIndexedEntry('visitedEncounters', id) !== null; }
  removeEncounter(id) { return this._removeIndexedEntry('visitedEncounters', id); }
  clearEncounters() { return this.replaceIndexedCollection('visitedEncounters', []); }

  addCity(city) { return this._addIndexedEntry('visitedCities', city); }
  getCity(id) {
    const entry = this._getIndexedEntry('visitedCities', id);
    return entry !== null ? deepFreeze(cloneGameData(entry)) : null;
  }
  hasCity(id) { return this._getIndexedEntry('visitedCities', id) !== null; }
  removeCity(id) { return this._removeIndexedEntry('visitedCities', id); }
  clearCities() { return this.replaceIndexedCollection('visitedCities', []); }

  recoverArtifact(recoveryData = {}) {
    if (!isPlainObject(recoveryData)) return false;
    const missionId = this._resolveMissionId(recoveryData.missionId);
    const artifact = recoveryData.artifact;
    if (!isValidId(missionId) || !isValidId(artifact?.id)) {
      console.warn('[GameState] Recovery requires missionId and artifact.id.');
      return false;
    }
    // One recovery per mission, not one recovery per catalogue artifact.
    const alreadyRecovered = this.state.recoveredArtifacts.some(entry => entry && sameId(entry.missionId, missionId));
    if (alreadyRecovered) {
      console.warn('[GameState] Artifact recovery already recorded for mission:', missionId);
      return false;
    }
    const artifactCopy = cloneGameData(artifact);
    if (!isPlainObject(artifactCopy)) return false;
    const recoveredAt = recoveryData.recoveredAt || artifact.recoveredAt || new Date().toISOString();
    const recoveredFrom = recoveryData.recoveredFrom || artifact.recoveredFrom || 'suspect_apartment';
    const recoveredLocation = recoveryData.recoveredLocation || artifact.recoveredLocation ||
      __dialogueText('gameState/GameStateManager.js', 't_02c9e55c29cb6cb663ef');
    const recoveredArtifact = {
      ...artifactCopy, recovered: true, recoveredAt, recoveredFrom, recoveredLocation,
      condition: recoveryData.condition || artifact.condition || 'intact'
    };
    const collectionEntry = {
      id: `recovered_${missionId}_${artifact.id}`,
      missionId, artifactId: recoveredArtifact.id,
      artifact: recoveredArtifact.label || recoveredArtifact.name || __dialogueText('gameState/GameStateManager.js', 't_c80fe8f99c19b2f38fb1'),
      city: recoveredArtifact.city || this.state.crimeCityId || this.state.currentCityId || __dialogueText('gameState/GameStateManager.js', 't_d17ede01fdcbb432de5d'),
      country: recoveredArtifact.country || __dialogueText('gameState/GameStateManager.js', 't_2ee34ccaadf588da063b'),
      description: recoveredArtifact.description || __dialogueText('gameState/GameStateManager.js', 't_f686401abb4ea517b728'),
      significance: recoveredArtifact.significance || __dialogueText('gameState/GameStateManager.js', 't_a2543b32d3fdcbf0d403'),
      artifactKey: recoveredArtifact.artifactKey || recoveredArtifact.id,
      condition: recoveredArtifact.condition, recoveredAt, recoveredFrom, recoveredLocation
    };
    this.state.currentArtifact = cloneGameData(recoveredArtifact);
    this.state.artifactRecovery = {
      missionId, artifactId: recoveredArtifact.id, recovered: true,
      recoveredAt, recoveredFrom, recoveredLocation, condition: recoveredArtifact.condition
    };
    if (this.state.currentMission) {
      this.state.currentMission = {
        ...this.state.currentMission, artifact: cloneGameData(recoveredArtifact), artifactRecovered: true
      };
    }
    this.state.recoveredArtifacts.push(collectionEntry);
    this.dirty = true;
    return true;
  }

  _resolveMissionId(missionId = null) {
    return missionId ?? this.state.currentMission?.id ?? this.state.currentMission?.missionId ?? null;
  }

  hasRecoveredArtifact(missionId = null) {
    const target = this._resolveMissionId(missionId);
    return isValidId(target) && this.state.recoveredArtifacts.some(entry => entry && sameId(entry.missionId, target));
  }

  getRecoveredArtifact(missionId = null) {
    const target = this._resolveMissionId(missionId);
    if (!isValidId(target)) return null;
    const entry = this.state.recoveredArtifacts.find(item => item && sameId(item.missionId, target));
    return entry ? deepFreeze(cloneGameData(entry)) : null;
  }

  addEnergyLog(entry) {
    this.state.energyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays(); this.dirty = true;
  }
  addMoneyLog(entry) {
    this.state.moneyLog.push(cloneGameData(entry));
    this._rotateHistoryArrays(); this.dirty = true;
  }
  addTravel(entry) {
    this.state.travelHistory.push(cloneGameData(entry));
    this._rotateHistoryArrays(); this.dirty = true;
  }
  addHiddenObjectAttempt(entry) {
    this.state.hiddenObjectHistory.push(cloneGameData(entry));
    this._rotateHistoryArrays(); this.dirty = true;
  }

  _rotateHistoryArrays() {
    const limit = Math.max(1, Math.floor(this.historyLimit) || 100);
    for (const key of ['energyLog', 'moneyLog', 'travelHistory', 'hiddenObjectHistory']) {
      if (!Array.isArray(this.state[key])) this.state[key] = [];
      if (this.state[key].length > limit) this.state[key] = this.state[key].slice(-limit);
    }
  }

  garbageCollectMemory() {
    let changed = false;
    const limit = Math.max(1, Math.floor(this.memoryObjectLimit) || 500);
    for (const field of ['encounterMemory', 'cityEncounterState']) {
      if (!isPlainObject(this.state[field])) { this.state[field] = {}; changed = true; }
      // Current encounter IDs are composite strings, not array-index keys.
      // This remains insertion-order trimming, not an LRU cache.
      const keys = Object.keys(this.state[field]), excess = keys.length - limit;
      if (excess > 0) {
        for (const key of keys.slice(0, excess)) delete this.state[field][key];
        changed = true;
      }
    }
    if (changed) this.dirty = true;
    return changed;
  }

  resetCaseOutcome() {
    return this.updateState({
      finalArrestResult: null, finalArrestSuspectId: null,
      caseResolved: false, caseFailed: false,
      arrestWarrantIssued: false, warrantSuspectName: null, warrantSuspectId: null,
      gameOverReason: '', chaseState: null, courtState: null
    });
  }
  resetReconstructedHeist() { this.state.reconstructedHeist = createDefaultReconstructedHeist(); this.dirty = true; }
  resetFull() { this.state = createInitialState(); this.dirty = true; this.saveCheckpoint = null; }

  createCheckpoint() {
    this.state._lastSave = Date.now();
    this.saveCheckpoint = this._exportData();
    this.dirty = false;
    return true;
  }

  restoreCheckpoint() {
    if (!this.saveCheckpoint) { console.warn('[GameState] No checkpoint available.'); return false; }
    return this.importFromSave(this.saveCheckpoint, { preserveCheckpoint: true });
  }

  validateSave(saveData) {
    if (!isPlainObject(saveData)) return false;
    if (typeof saveData.playerName !== 'string' || typeof saveData.difficulty !== 'string' || !Number.isFinite(saveData.score)) {
      console.warn('[GameState] Save requires playerName, difficulty and numeric score.');
      return false;
    }
    if (saveData._version == null || saveData._version === '') return true;
    const savedVersion = parseVersion(saveData._version), currentVersion = parseVersion(GAME_VERSION);
    if (!savedVersion || !currentVersion) {
      console.warn('[GameState] Invalid state version:', saveData._version);
      return false;
    }
    if (compareVersions(savedVersion, currentVersion) > 0) {
      console.warn(`[GameState] Save version ${saveData._version} is newer than this game (${GAME_VERSION}).`);
      return false;
    }
    return true;
  }

  exportForSave() {
    this.state._lastSave = Date.now();
    return {
      ...this._exportData(), _version: GAME_VERSION,
      _lastSave: this.state._lastSave, _createdAt: this.state._createdAt
    };
  }

  importFromSave(saveData, options = {}) {
    try {
      // Only an explicit restoration of the current checkpoint may retain it.
      const preserveCheckpoint = options?.preserveCheckpoint === true &&
        saveData === this.saveCheckpoint;
      const source = unwrapImportedState(saveData);
      if (!source) return false;
      const imported = cloneGameData(source);
      if (!this.validateSave(imported)) return false;
      // Existing normalizers/migrations run before committing the state.
      // Preserve courtState and chaseState throughout this path.
      const nextState = normalizeImportedState(imported);
      this.state = nextState;
      this.dirty = false;
      // Do not discard a valid checkpoint when validation/migration fails.
      if (!preserveCheckpoint) this.saveCheckpoint = null;
      return true;
    } catch (error) {
      console.error('[GameState] Save import failed:', error);
      return false;
    }
  }

  getDebugInfo() {
    return {
      version: this.state._version,
      lastSave: this.state._lastSave ? new Date(this.state._lastSave) : null,
      createdAt: this.state._createdAt ? new Date(this.state._createdAt) : null,
      playerName: this.state.playerName, score: this.state.score, casesSolved: this.state.casesSolved,
      cluesCount: this.state.cluesCollected.length, clueIndexSize: Object.keys(this.state._clueIndex).length,
      encountersCount: this.state.visitedEncounters.length, encounterIndexSize: Object.keys(this.state._encounterIndex).length,
      citiesCount: this.state.visitedCities.length, cityIndexSize: Object.keys(this.state._cityIndex).length,
      energyLogSize: this.state.energyLog.length, moneyLogSize: this.state.moneyLog.length,
      travelHistorySize: this.state.travelHistory.length, isDirty: this.dirty,
      hasCheckpoint: this.saveCheckpoint !== null
    };
  }
}