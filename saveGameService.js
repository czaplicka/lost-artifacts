import { supabase } from './supabase-client.js';
import { gameState } from './GameData.js';
import { createSaveManager } from './managers/SaveManager.js';
import { MainStoryManager } from './managers/MainStoryManager.js';

import {
  createCaseDirectorFromState
} from './restoreCaseDirector.js';

const GAME_VERSION = '0.10.0';

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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(
    object,
    key
  );
}

function getSavedMainStory(savedState) {
  if (hasOwn(savedState, 'mainStory')) {
    return savedState.mainStory;
  }

  if (
    isPlainObject(savedState.state) &&
    hasOwn(savedState.state, 'mainStory')
  ) {
    return savedState.state.mainStory;
  }

  return undefined;
}

function buildStateForSave() {
  gameState.mainStory =
    MainStoryManager.serialize();

  // Zachowujemy aktualny szablon używany przez dyrektora.
  const director = gameState.caseDirector;

  if (
    director &&
    typeof director.serialize === 'function'
  ) {
    const template = director.serialize();

    if (template !== null && template !== undefined) {
      gameState.caseTemplate =
        structuredClone(template);
    }
  }

  return gameState.exportForSave();
}

function replaceGameState(savedState) {
  if (!isPlainObject(savedState)) {
    throw new Error(
      '[saveGameService] Save data must be a plain object.'
    );
  }

  const savedMainStory =
    getSavedMainStory(savedState);

  const previousState = gameState.getState();
  const previousMainStory =
    MainStoryManager.serialize();

  const previousDirty = gameState.dirty;
  const previousCheckpoint =
    gameState.saveCheckpoint;
  const previousCaseDirector =
    gameState.caseDirector;

  let stateImported = false;
  let storyRestoreAttempted = false;

  try {
    if (!gameState.importFromSave(savedState)) {
      throw new Error(
        'GameStateManager rejected the saved state.'
      );
    }

    stateImported = true;

    // Korzystamy ze stanu po normalizacji starszego zapisu.
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

    return gameState;
  } catch (error) {
    if (stateImported) {
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
          '[saveGameService] Game state rollback failed:',
          rollbackError
        );
      }
    }

    if (storyRestoreAttempted) {
      try {
        const restored =
          MainStoryManager.deserialize(
            previousMainStory
          );

        if (restored !== true) {
          throw new Error(
            'Previous main story was rejected.'
          );
        }
      } catch (rollbackError) {
        console.error(
          '[saveGameService] Main story rollback failed:',
          rollbackError
        );
      }
    }

    throw new Error(
      '[saveGameService] Could not restore the save: ' +
      (
        typeof error?.message === 'string'
          ? error.message
          : String(error)
      )
    );
  }
}

export const saveManager = createSaveManager({
  supabase,
  gameVersion: GAME_VERSION,
  getState: buildStateForSave,
  applyState: replaceGameState
});