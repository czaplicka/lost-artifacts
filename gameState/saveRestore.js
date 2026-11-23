// Shared autosave/slot restoration. This module never accesses localStorage.
import { gameState } from '../GameData.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { getEnergyManager, energyRestoreData } from '../managers/EnergyManager.js';
import { createCaseDirectorFromState } from '../restoreCaseDirector.js';

let restoring = false;
export function isStateRestoreInProgress() { return restoring; }

export function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
export function getSavedField(data, key) {
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  return isPlainObject(data.state) ? data.state[key] : undefined;
}

function requireTransactionalEnergy(energy) {
  if (typeof energy?.serialize !== 'function' ||
      typeof energy?.restore !== 'function' ||
      typeof energy?.resumeRestoredEffects !== 'function') {
    throw new Error(
      'Install the updated EnergyManager.js with deferred restore effects before loading saves.'
    );
  }
}

export function exportCurrentGameState() {
  if (restoring) throw new Error('Cannot export during game-state restoration.');
  const energy = getEnergyManager();
  gameState.updateState(energy.serialize());
  gameState.mainStory = MainStoryManager.serialize();
  gameState.inventory = inventoryManager.exportState();
  const director = gameState.caseDirector;
  if (typeof director?.serialize === 'function') {
    const template = director.serialize();
    if (template != null) gameState.caseTemplate = structuredClone(template);
  }
  return gameState.exportForSave();
}

export function restoreSavedGameState(savedState) {
  if (!isPlainObject(savedState)) throw new TypeError('Save must be a plain object.');
  if (restoring) throw new Error('Game-state restoration is already in progress.');
  const energy = getEnergyManager();
  requireTransactionalEnergy(energy);
  const previous = {
    state: structuredClone(gameState.getState()),
    story: structuredClone(MainStoryManager.serialize()),
    inventory: structuredClone(inventoryManager.exportState()),
    energy: structuredClone(energy.serialize()),
    dirty: gameState.dirty,
    checkpoint: gameState.saveCheckpoint,
    director: gameState.caseDirector
  };
  let stateAttempted = false;
  let storyAttempted = false;
  let inventoryAttempted = false;
  let energyAttempted = false;
  restoring = true;
  try {
    stateAttempted = true;
    if (!gameState.importFromSave(savedState)) throw new Error('Game state rejected.');
    gameState.caseDirector = createCaseDirectorFromState(gameState.state);
    storyAttempted = true;
    const story = getSavedField(savedState, 'mainStory');
    if (story == null) MainStoryManager.resetProgress({ silent: true });
    else if (MainStoryManager.deserialize(story) !== true) throw new Error('Story rejected.');
    inventoryAttempted = true;
    const inventory = getSavedField(savedState, 'inventory');
    if (!inventoryManager.importState(inventory === undefined ? { version: 1, items: [] } : inventory)) {
      throw new Error('Inventory rejected.');
    }
    gameState.mainStory = MainStoryManager.serialize();
    gameState.inventory = inventoryManager.exportState();
    energyAttempted = true;
    // EnergyManager owns the only field list and the shared restore-data export.
    // Called AFTER import: omitted values come from the normalized loaded state.
    energy.restore(energyRestoreData(savedState), { resumeEffects: false });
    gameState.dirty = false;
    gameState.saveCheckpoint = null;
    // Schedules UI/time effects for the next task, not inside this transaction.
    energy.resumeRestoredEffects();
    return gameState;
  } catch (cause) {
    const rollbackErrors = [];
    const rollback = (part, operation) => {
      try { operation(); return true; }
      catch (error) {
        rollbackErrors.push({ part, message: error?.message || String(error) });
        console.error('[SaveRestore] Rollback failed:', part, error);
        return false;
      }
    };
    let stateRolledBack = false;
    if (stateAttempted) stateRolledBack = rollback('state', () => {
      if (!gameState.importFromSave(previous.state)) throw new Error('State rollback rejected.');
      gameState.caseDirector = previous.director;
    });
    if (storyAttempted) rollback('story', () => {
      if (previous.story == null) MainStoryManager.resetProgress({ silent: true });
      else if (MainStoryManager.deserialize(previous.story) !== true) throw new Error('Story rollback rejected.');
    });
    if (inventoryAttempted) rollback('inventory', () => {
      if (!inventoryManager.importState(previous.inventory)) throw new Error('Inventory rollback rejected.');
    });
    let energyRolledBack = false;
    if (energyAttempted) energyRolledBack = rollback('energy', () => {
      energy.restore(previous.energy, { resumeEffects: false });
    });
    if (stateRolledBack) rollback('metadata', () => {
      gameState.saveCheckpoint = previous.checkpoint;
      gameState.dirty = previous.dirty;
    });
    if (energyRolledBack && rollbackErrors.length === 0) {
      rollback('energy-runtime', () => energy.resumeRestoredEffects());
    }
    const error = new Error('Could not restore save: ' + (cause?.message || String(cause)));
    error.cause = cause;
    error.rollbackErrors = rollbackErrors;
    throw error;
  } finally { restoring = false; }
}
