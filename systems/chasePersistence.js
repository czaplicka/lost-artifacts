import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { validChase } from './chaseLogic.js';

export const ESCAPE_MESSAGE = 'You lost the suspect during the pursuit. The thief escaped with the artefact. Your shoes have declined to comment.';
const prefix = 'lost-artefacts:chase-checkpoint:v2:';
export function currentChase() {
  const record = gameState.chaseState;
  return validChase(record, gameState.currentCaseId, gameState._createdAt) ? record : null;
}
export function persistChase(record) {
  if (!validChase(record, gameState.currentCaseId, gameState._createdAt)) return false;
  record.updatedAt = Date.now();
  gameState.chaseState = structuredClone(record);
  if (record.phase === 'escaped') {
    gameState.finalArrestSuspectId = record.suspectId;
    gameState.finalArrestResult = 'FAILURE';
    gameState.caseFailed = true;
    gameState.caseResolved = false;
    gameState.isGameActive = false;
    gameState.gameOverReason = ESCAPE_MESSAGE;
  }
  if (record.phase === 'caught') gameState.finalArrestSuspectId = record.suspectId;
  saveGameState();
  try {
    const slot = record.slotKey || saveManager.getLastUsedSlot();
    const data = saveManager.getState();
    localStorage.setItem(prefix + slot, JSON.stringify({ version: 2, caseId: record.caseId, campaignId: record.campaignId, updatedAt: record.updatedAt, data }));
    return true;
  } catch (error) {
    console.warn('[Chase] Checkpoint could not be written:', error);
    return false;
  }
}
export function restoreLocalChaseCheckpoint(slotKey) {
  try {
    const payload = JSON.parse(localStorage.getItem(prefix + slotKey) || 'null');
    if (!payload || payload.version !== 2 || !payload.data
      || String(payload.caseId) !== String(gameState.currentCaseId)
      || payload.campaignId !== gameState._createdAt
      || !validChase(payload.data.chaseState, payload.caseId, payload.campaignId)) return false;
    const loaded = currentChase();
    if (loaded && (loaded.updatedAt || 0) > (payload.updatedAt || 0)) return false;
    saveManager.applyState(payload.data);
    saveManager.restoreEnergyManager(payload.data);
    return true;
  } catch (error) {
    console.warn('[Chase] Could not restore checkpoint:', error);
    return false;
  }
}
export function terminalData(record) {
  return { title: 'THIEF ESCAPED', reasonCode: 'chase_escape', caseId: record.caseId, suspectId: record.suspectId, message: ESCAPE_MESSAGE };
}
export function settleChase(sceneKey) {
  const record = currentChase();
  if (!record || !['caught','escaped','review','settled'].includes(record.phase)) return;
  record.phase = 'settled';
  record.terminalScene = sceneKey;
  persistChase(record);
}

// A dedicated checkpoint remains available even if no hotel/office slot was created.
export function latestLocalChaseCheckpoint() {
  const candidates = [];
  for (const slot of ['slot_1','slot_2','slot_3']) {
    try {
      const payload = JSON.parse(localStorage.getItem(prefix + slot) || 'null');
      if (payload?.version === 2 && payload.data
        && validChase(payload.data.chaseState, payload.data.currentCaseId, payload.data._createdAt)
        && payload.data.chaseState.phase !== 'settled') candidates.push(payload);
    } catch { /* A damaged checkpoint must not prevent entering the game. */ }
  }
  return candidates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
}
export function restoreExplicitChaseCheckpoint(payload) {
  if (!payload?.data || !validChase(payload.data.chaseState, payload.data.currentCaseId, payload.data._createdAt)) return false;
  try {
    saveManager.applyState(payload.data);
    saveManager.restoreEnergyManager(payload.data);
    return true;
  } catch (error) {
    console.warn('[Chase] Explicit checkpoint restore failed:', error);
    return false;
  }
}
