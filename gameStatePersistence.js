// GameStatePersistence.js

import { gameState, resetGameState } from './GameData.js';
import { sanitizeSaveData } from './gameStateSanitizers.js';
import { EventBus } from './EventBus.js';
import { MainStoryManager } from './managers/MainStoryManager.js';

const SAVE_KEY = 'detectiveSaveData';

let persistenceBusy = false;

function canUseLocalStorage() {
  try {
    const testKey = '__detective_test__';

    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);

    return true;
  } catch (error) {
    return false;
  }
}

export function saveGameState() {
  if (persistenceBusy) return false;

  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping save.');
    return false;
  }

  try {
    const mainStory = MainStoryManager.serialize();

    const saveData = {
      ...gameState,
      mainStory
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));

    // Kopia w gameState dla podglądu i innych systemów zapisu.
    gameState.mainStory = mainStory;

    console.log('Game saved automatically.');
    return true;
  } catch (error) {
    console.error('Failed to save game:', error);
    return false;
  }
}

export function loadGameState() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping load.');
    return false;
  }

  persistenceBusy = true;

  try {
    const savedData = localStorage.getItem(SAVE_KEY);

    if (!savedData) return false;

    const parsedData = JSON.parse(savedData);

    if (
      !parsedData ||
      typeof parsedData !== 'object' ||
      Array.isArray(parsedData)
    ) {
      throw new Error('Invalid game save.');
    }

    const {
      mainStory: savedMainStory,
      ...savedGameState
    } = parsedData;

    const sanitizedData = sanitizeSaveData(savedGameState);

    Object.assign(gameState, sanitizedData);

    MainStoryManager.deserialize(savedMainStory);
    gameState.mainStory = MainStoryManager.serialize();

    console.log('Game loaded.');
    return true;
  } catch (error) {
    console.error('Failed to load game:', error);

    resetGameState();
    MainStoryManager.resetProgress({ silent: true });
    gameState.mainStory = MainStoryManager.serialize();

    return false;
  } finally {
    persistenceBusy = false;
  }
}

export function clearSavedGame() {
  persistenceBusy = true;

  try {
    // setupNewGame() już wywołuje tę funkcję.
    // Dlatego tutaj resetujemy także główne śledztwo.
    MainStoryManager.resetProgress({ silent: true });
    gameState.mainStory = MainStoryManager.serialize();

    if (!canUseLocalStorage()) {
      console.warn('localStorage unavailable, skipping clear.');
      return false;
    }

    localStorage.removeItem(SAVE_KEY);

    console.log('Game save removed. Main story reset.');
    return true;
  } catch (error) {
    console.error('Failed to remove game save:', error);
    return false;
  } finally {
    persistenceBusy = false;
  }
}

function saveAfterMainStoryChange() {
  gameState.mainStory = MainStoryManager.serialize();

  // Nie tworzymy sejwa przed rozpoczęciem rozgrywki.
  if (!persistenceBusy && gameState.isGameActive) {
    saveGameState();
  }
}

EventBus.on('mainStory:stageAdvanced', saveAfterMainStoryChange);
EventBus.on('mainStory:flagSet', saveAfterMainStoryChange);
EventBus.on('mainStory:sideClueSet', saveAfterMainStoryChange);
EventBus.on('mainStory:reset', saveAfterMainStoryChange);