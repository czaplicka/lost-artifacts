import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';
import { MainStoryManager } from './managers/MainStoryManager.js';

import {
  createCaseDirectorFromState
} from './restoreCaseDirector.js';

const SAVE_KEY = 'detectiveSaveData';

let persistenceBusy = false;
let storageAvailable = null;
let automaticSaveBlocked = false;

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== 'object'
  ) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function canUseLocalStorage() {
  if (storageAvailable !== null) {
    return storageAvailable;
  }

  const testKey =
    `__detective_storage_test_${Date.now()}_${Math.random()}`;

  try {
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);

    storageAvailable = true;
  } catch (error) {
    storageAvailable = false;

    console.warn(
      '[Persistence] localStorage is unavailable:',
      error
    );
  }

  return storageAvailable;
}

function getSavedMainStory(savedData) {
  if (
    Object.prototype.hasOwnProperty.call(
      savedData,
      'mainStory'
    )
  ) {
    return savedData.mainStory;
  }

  if (
    isPlainObject(savedData.state) &&
    Object.prototype.hasOwnProperty.call(
      savedData.state,
      'mainStory'
    )
  ) {
    return savedData.state.mainStory;
  }

  return undefined;
}

function syncCaseTemplate() {
  const director = gameState.caseDirector;

  if (
    !director ||
    typeof director.serialize !== 'function'
  ) {
    return;
  }

  const template = director.serialize();

  if (template !== null && template !== undefined) {
    gameState.caseTemplate =
      structuredClone(template);
  }
}

export function saveGameState() {
  if (persistenceBusy || automaticSaveBlocked) {
    return false;
  }

  if (!canUseLocalStorage()) {
    return false;
  }

  persistenceBusy = true;

  try {
    gameState.mainStory =
      MainStoryManager.serialize();

    syncCaseTemplate();

    const saveData = gameState.exportForSave();

    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify(saveData)
    );

    return true;
  } catch (error) {
    console.error(
      '[Persistence] Failed to save game:',
      error
    );

    return false;
  } finally {
    persistenceBusy = false;
  }
}

export function loadGameState() {
  if (persistenceBusy || !canUseLocalStorage()) {
    return false;
  }

  persistenceBusy = true;

  let previousState = null;
  let previousMainStory;
  let previousDirty = false;
  let previousCheckpoint = null;
  let previousCaseDirector = null;

  let stateImported = false;
  let storyRestoreAttempted = false;

  try {
    const raw =
      window.localStorage.getItem(SAVE_KEY);

    if (!raw) {
      automaticSaveBlocked = false;
      return false;
    }

    const savedData = JSON.parse(raw);

    if (!isPlainObject(savedData)) {
      throw new Error(
        'Autosave must contain a plain object.'
      );
    }

    const savedMainStory =
      getSavedMainStory(savedData);

    previousState = gameState.getState();
    previousMainStory =
      MainStoryManager.serialize();

    previousDirty = gameState.dirty;
    previousCheckpoint =
      gameState.saveCheckpoint;
    previousCaseDirector =
      gameState.caseDirector;

    if (!gameState.importFromSave(savedData)) {
      throw new Error(
        'GameStateManager rejected the autosave.'
      );
    }

    stateImported = true;

    gameState.caseDirector =
      createCaseDirectorFromState(gameState.state);

    storyRestoreAttempted = true;

    if (
      savedMainStory === undefined ||
      savedMainStory === null
    ) {
      MainStoryManager.resetProgress({
        silent: true
      });
    } else {
      const restored =
        MainStoryManager.deserialize(savedMainStory);

      if (restored !== true) {
        throw new Error(
          'MainStoryManager rejected the saved story.'
        );
      }
    }

    gameState.mainStory =
      MainStoryManager.serialize();

    gameState.dirty = false;
    gameState.saveCheckpoint = null;

    automaticSaveBlocked = false;

    return true;
  } catch (error) {
    automaticSaveBlocked = true;

    if (stateImported && previousState) {
      try {
        const restored =
          gameState.importFromSave(previousState);

        if (!restored) {
          throw new Error(
            'Previous game state was rejected.'
          );
        }

        gameState.caseDirector =
          previousCaseDirector;

        gameState.saveCheckpoint =
          previousCheckpoint;

        gameState.dirty = previousDirty;
      } catch (rollbackError) {
        console.error(
          '[Persistence] Game state rollback failed:',
          rollbackError
        );
      }
    }

    if (storyRestoreAttempted) {
      try {
        if (
          previousMainStory !== undefined &&
          previousMainStory !== null
        ) {
          const restored =
            MainStoryManager.deserialize(
              previousMainStory
            );

          if (restored !== true) {
            throw new Error(
              'Previous main story was rejected.'
            );
          }
        } else {
          MainStoryManager.resetProgress({
            silent: true
          });
        }
      } catch (rollbackError) {
        console.error(
          '[Persistence] Main story rollback failed:',
          rollbackError
        );
      }
    }

    console.error(
      '[Persistence] Failed to load game. ' +
      'The stored autosave was left unchanged. ' +
      'Automatic saving is blocked until a successful load ' +
      'or an explicit clearSavedGame().',
      error
    );

    return false;
  } finally {
    persistenceBusy = false;
  }
}

export function clearSavedGame() {
  if (persistenceBusy) {
    return false;
  }

  persistenceBusy = true;

  try {
    MainStoryManager.resetProgress({
      silent: true
    });

    gameState.mainStory =
      MainStoryManager.serialize();

    if (!canUseLocalStorage()) {
      return false;
    }

    window.localStorage.removeItem(SAVE_KEY);

    automaticSaveBlocked = false;

    return true;
  } catch (error) {
    console.error(
      '[Persistence] Failed to clear autosave:',
      error
    );

    return false;
  } finally {
    persistenceBusy = false;
  }
}

function saveAfterMainStoryChange() {
  if (persistenceBusy) {
    return;
  }

  gameState.mainStory =
    MainStoryManager.serialize();

  if (
    gameState.isGameActive &&
    !automaticSaveBlocked
  ) {
    saveGameState();
  }
}

EventBus.on(
  'mainStory:stageAdvanced',
  saveAfterMainStoryChange
);

EventBus.on(
  'mainStory:flagSet',
  saveAfterMainStoryChange
);

EventBus.on(
  'mainStory:sideClueSet',
  saveAfterMainStoryChange
);

EventBus.on(
  'mainStory:reset',
  saveAfterMainStoryChange
);