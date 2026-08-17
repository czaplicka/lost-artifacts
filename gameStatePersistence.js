import { gameState, resetGameState } from './GameData.js';
import { sanitizeSaveData } from './gameStateSanitizers.js';

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
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping save.');
    return false;
  }

  try {
    localStorage.setItem('detectiveSaveData', JSON.stringify(gameState));
    console.log('Gra zapisana automatycznie.');
    return true;
  } catch (error) {
    console.error('Błąd zapisu do localStorage:', error);
    return false;
  }
}

export function loadGameState() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping load.');
    return false;
  }

  try {
    const savedData = localStorage.getItem('detectiveSaveData');
    if (!savedData) return false;
    Object.assign(gameState, sanitizeSaveData(JSON.parse(savedData)));
    console.log('Wczytano zapis gry.');
    return true;
  } catch (error) {
    console.error('Błąd odczytu z localStorage:', error);
    resetGameState();
    return false;
  }
}

export function clearSavedGame() {
  if (!canUseLocalStorage()) {
    console.warn('localStorage unavailable, skipping clear.');
    return false;
  }

  try {
    localStorage.removeItem('detectiveSaveData');
    console.log('Zapis gry usunięty.');
    return true;
  } catch (error) {
    console.error('Błąd usuwania zapisu z localStorage:', error);
    return false;
  }
}