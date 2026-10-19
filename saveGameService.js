import { supabase } from './supabase-client.js';
import { gameState } from './GameData.js';
import { createSaveManager } from './managers/SaveManager.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { createCaseDirectorFromState } from './restoreCaseDirector.js';

const GAME_VERSION = '0.10.0';
function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function getSavedField(data, key) {
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  if (isPlainObject(data.state)) return data.state[key];
  return undefined;
}
function buildStateForSave() {
  gameState.mainStory = MainStoryManager.serialize();
  gameState.inventory = inventoryManager.exportState();
  const director = gameState.caseDirector;
  if (typeof director?.serialize === 'function') {
    const template = director.serialize();
    if (template != null) gameState.caseTemplate = structuredClone(template);
  }
  return gameState.exportForSave();
}
function replaceGameState(savedState) {
  if (!isPlainObject(savedState)) throw new Error('[saveGameService] Save must be a plain object.');
  const previous = {
    state: gameState.getState(), story: MainStoryManager.serialize(),
    inventory: inventoryManager.exportState(), dirty: gameState.dirty,
    checkpoint: gameState.saveCheckpoint, director: gameState.caseDirector
  };
  let stateImported = false;
  let storyAttempted = false;
  let inventoryAttempted = false;
  try {
    if (!gameState.importFromSave(savedState)) throw new Error('Game state rejected.');
    stateImported = true;
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
    gameState.dirty = false;
    gameState.saveCheckpoint = null;
    return gameState;
  } catch (error) {
    if (stateImported) {
      try {
        if (!gameState.importFromSave(previous.state)) throw new Error('State rollback rejected.');
        gameState.caseDirector = previous.director;
        gameState.saveCheckpoint = previous.checkpoint;
        gameState.dirty = previous.dirty;
      } catch (rollbackError) { console.error('[saveGameService] State rollback failed:', rollbackError); }
    }
    if (storyAttempted) {
      try {
        if (previous.story == null) MainStoryManager.resetProgress({ silent: true });
        else if (MainStoryManager.deserialize(previous.story) !== true) throw new Error('Story rollback rejected.');
      } catch (rollbackError) { console.error('[saveGameService] Story rollback failed:', rollbackError); }
    }
    if (inventoryAttempted) {
      try {
        if (!inventoryManager.importState(previous.inventory)) throw new Error('Inventory rollback rejected.');
      } catch (rollbackError) { console.error('[saveGameService] Inventory rollback failed:', rollbackError); }
    }
    throw new Error('[saveGameService] Could not restore save: ' + (error?.message || String(error)));
  }
}
export const saveManager = createSaveManager({
  supabase, gameVersion: GAME_VERSION,
  getState: buildStateForSave, applyState: replaceGameState
});