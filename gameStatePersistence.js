import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { createCaseDirectorFromState } from './restoreCaseDirector.js';


const SAVE_KEY = 'detectiveSaveData';
const AUTOSAVE_DELAY_MS = 500;
let persistenceBusy = false;
let storageAvailable = null;
let automaticSaveBlocked = false;
let autosaveTimer = null;
let autosavePending = false;


function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function canUseLocalStorage() {
  if (storageAvailable !== null) return storageAvailable;
  const key = `__detective_storage_test_${Date.now()}_${Math.random()}`;
  try {
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;
    console.warn('[Persistence] localStorage unavailable:', error);
  }
  return storageAvailable;
}
function getSavedField(data, key) {
  if (Object.prototype.hasOwnProperty.call(data, key)) return data[key];
  if (isPlainObject(data.state)) return data.state[key];
  return undefined;
}
function syncCaseTemplate() {
  const director = gameState.caseDirector;
  if (typeof director?.serialize !== 'function') return;
  const template = director.serialize();
  if (template != null) gameState.caseTemplate = structuredClone(template);
}
function cancelPendingAutosave() {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  autosavePending = false;
}
export function saveGameState() {
  if (persistenceBusy || automaticSaveBlocked || !canUseLocalStorage()) return false;
  persistenceBusy = true;
  try {
    gameState.mainStory = MainStoryManager.serialize();
    gameState.inventory = inventoryManager.exportState();
    syncCaseTemplate();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(gameState.exportForSave()));
    return true;
  } catch (error) {
    console.error('[Persistence] Failed to save game:', error);
    return false;
  } finally { persistenceBusy = false; }
}
export function requestAutosave() {
  if (automaticSaveBlocked) return;
  autosavePending = true;
  if (autosaveTimer !== null) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    if (!autosavePending) return;
    autosavePending = false;
    saveGameState();
  }, AUTOSAVE_DELAY_MS);
}
export function flushAutosave() {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
  if (!autosavePending) return false;
  autosavePending = false;
  return saveGameState();
}
export function loadGameState() {
  if (persistenceBusy || !canUseLocalStorage()) return false;
  cancelPendingAutosave();
  persistenceBusy = true;
  let previous = null;
  let stateImported = false;
  let storyAttempted = false;
  let inventoryAttempted = false;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) { automaticSaveBlocked = false; return false; }
    const data = JSON.parse(raw);
    if (!isPlainObject(data)) throw new Error('Autosave must be a plain object.');
    previous = {
      state: gameState.getState(), story: MainStoryManager.serialize(),
      inventory: inventoryManager.exportState(), dirty: gameState.dirty,
      checkpoint: gameState.saveCheckpoint, director: gameState.caseDirector
    };
    if (!gameState.importFromSave(data)) throw new Error('Game state rejected.');
    stateImported = true;
    gameState.caseDirector = createCaseDirectorFromState(gameState.state);
    storyAttempted = true;
    const story = getSavedField(data, 'mainStory');
    if (story == null) MainStoryManager.resetProgress({ silent: true });
    else if (MainStoryManager.deserialize(story) !== true) throw new Error('Story rejected.');
    inventoryAttempted = true;
    const inventory = getSavedField(data, 'inventory');
    if (!inventoryManager.importState(inventory === undefined ? { version: 1, items: [] } : inventory)) {
      throw new Error('Inventory rejected.');
    }
    gameState.mainStory = MainStoryManager.serialize();
    gameState.inventory = inventoryManager.exportState();
    gameState.dirty = false;
    gameState.saveCheckpoint = null;
    automaticSaveBlocked = false;
    return true;
  } catch (error) {
    automaticSaveBlocked = true;
    if (previous) {
      if (stateImported) {
        try {
          if (!gameState.importFromSave(previous.state)) throw new Error('State rollback rejected.');
          gameState.caseDirector = previous.director;
          gameState.saveCheckpoint = previous.checkpoint;
          gameState.dirty = previous.dirty;
        } catch (rollbackError) { console.error('[Persistence] State rollback failed:', rollbackError); }
      }
      if (storyAttempted) {
        try {
          if (previous.story == null) MainStoryManager.resetProgress({ silent: true });
          else if (MainStoryManager.deserialize(previous.story) !== true) throw new Error('Story rollback rejected.');
        } catch (rollbackError) { console.error('[Persistence] Story rollback failed:', rollbackError); }
      }
      if (inventoryAttempted) {
        try {
          if (!inventoryManager.importState(previous.inventory)) throw new Error('Inventory rollback rejected.');
        } catch (rollbackError) { console.error('[Persistence] Inventory rollback failed:', rollbackError); }
      }
    }
    console.error('[Persistence] Load failed. Autosave unchanged; automatic saving blocked.', error);
    return false;
  } finally { persistenceBusy = false; }
}
export function clearSavedGame() {
  if (persistenceBusy) return false;
  cancelPendingAutosave();
  persistenceBusy = true;
  try {
    MainStoryManager.resetProgress({ silent: true });
    gameState.mainStory = MainStoryManager.serialize();
    if (!canUseLocalStorage()) return false;
    window.localStorage.removeItem(SAVE_KEY);
    automaticSaveBlocked = false;
    return true;
  } catch (error) {
    console.error('[Persistence] Failed to clear autosave:', error);
    return false;
  } finally { persistenceBusy = false; }
}
function saveAfterMainStoryChange() {
  if (persistenceBusy) return;
  gameState.mainStory = MainStoryManager.serialize();
  if (gameState.isGameActive && !automaticSaveBlocked) requestAutosave();
}
for (const event of ['mainStory:stageAdvanced', 'mainStory:flagSet', 'mainStory:sideClueSet', 'mainStory:reset']) {
  EventBus.on(event, saveAfterMainStoryChange);
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAutosave();
  });
}