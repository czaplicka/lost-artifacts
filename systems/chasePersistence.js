import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { exportCurrentGameState, restoreSavedGameState, isStateRestoreInProgress } from '../gameState/saveRestore.js';
import { validChase } from './chaseLogic.js';

const text = key => __dialogueText('systems/chasePersistence.js', key);
export const ESCAPE_MESSAGE = text('t_a2bc479ee3e8e28e1477') + text('t_43f53aaf73c4646e302f') + text('t_7a0c635c047a521cb2f7');
const CHASE_FAILURES = Object.freeze({
  chase_escape: { title: text('t_2de8c6bcc823fd89a58b'), message: ESCAPE_MESSAGE },
  missing_warrant: { title: text('t_aaa83133a177ce1167f4'), message: text('t_067aafd9c04e9f46e3cb') + text('t_cb6583a584a88af4dabb') },
  warrant_mismatch: { title: text('t_aaa83133a177ce1167f4'), message: text('t_46f168d72b464e8f0c2f') + text('t_cb6583a584a88af4dabb') }
});
const COURT_RELEASE_MESSAGE = text('t_0de1a1cfb8e07c468593') + text('t_d15995e1076bbe82188b');
const PREFIX = 'lost-artefacts:chase-checkpoint:v2:';
const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3'];
const sameId = (a, b) => a != null && b != null && String(a) === String(b);
let writing = false;
let recoveryRequired = false;
let persistenceStatus = { mainSaved: false, checkpointSaved: false, rollbackSucceeded: null, reason: 'idle', warning: null };

export function getChasePersistenceStatus() { return { ...persistenceStatus }; }
function status(update) {
  persistenceStatus = { mainSaved: false, checkpointSaved: false, rollbackSucceeded: null, reason: null, warning: null, ...update };
}
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function stableProgressionId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const id = String(value).trim();
  return !id || id.length > 400 || id === 'default_case' || id === 'unknown_mission' ? null : id;
}
function checkpointSlot(record) {
  if (SLOT_KEYS.includes(record?.slotKey)) return record.slotKey;
  const lastUsedSlot = saveManager.getLastUsedSlot();
  return SLOT_KEYS.includes(lastUsedSlot) ? lastUsedSlot : 'slot_1';
}
function validCheckpoint(payload) {
  try {
    if (!isObject(payload) || payload.version !== 2 || !isObject(payload.data) ||
      !Number.isFinite(payload.updatedAt) || payload.updatedAt < 0 ||
      !sameId(payload.caseId, payload.data.currentCaseId) || payload.campaignId !== payload.data._createdAt) return false;
    return validChase(payload.data.chaseState, payload.caseId, payload.campaignId);
  } catch { return false; }
}
function notifyRestore(event, detail) {
  try { EventBus.emit(event, detail); }
  catch (error) { console.error('[Chase] Notification failed:', event, error); }
}
function applyCheckpoint(payload) {
  if (writing || isStateRestoreInProgress()) return false;
  const data = structuredClone(payload.data);
  try { restoreSavedGameState(data); }
  catch (error) {
    notifyRestore('gameState:restoreFailed', { source: 'chase-checkpoint', slotKey: payload.data.chaseState?.slotKey ?? null, error });
    throw error;
  }
  recoveryRequired = false;
  notifyRestore('gameState:restored', {
    source: 'chase-checkpoint', slotKey: payload.data.chaseState?.slotKey ?? null, caseId: payload.caseId
  });
  return true;
}
EventBus.on('gameState:restored', () => { recoveryRequired = false; });

export function currentChase() {
  const record = gameState.chaseState;
  return validChase(record, gameState.currentCaseId, gameState._createdAt) ? record : null;
}
export function chaseFailureCode(record) {
  if (!record) return null;
  if (Object.prototype.hasOwnProperty.call(CHASE_FAILURES, record.failureCode)) return record.failureCode;
  return record.phase === 'escaped' ? 'chase_escape' : null;
}
function grantNewArrestXP(record, previousRecord) {
  if (record.phase !== 'review' || record.failureCode || record.arrestOutcome?.code !== 'arrested' ||
    record.arrestOutcome?.arrested !== true || record.terminalScene !== 'CourtScene') return { success: false, reason: 'arrest_not_completed' };
  const previouslyArrested = previousRecord && sameId(previousRecord.caseId, record.caseId) &&
    previousRecord.campaignId === record.campaignId && sameId(previousRecord.suspectId, record.suspectId) &&
    previousRecord.arrestOutcome?.code === 'arrested' && previousRecord.arrestOutcome?.arrested === true;
  if (previouslyArrested) return { success: false, reason: 'arrest_already_recorded' };
  if (record.distance !== 0 || !gameState.arrestWarrantIssued || !sameId(gameState.warrantSuspectId, record.suspectId)) return { success: false, reason: 'invalid_arrest' };
  const thiefId = gameState.trueThiefCaseSuspectId || gameState.realThiefSuspectId;
  if (!sameId(record.suspectId, thiefId)) return { success: false, reason: 'not_the_case_thief' };
  const caseId = stableProgressionId(record.caseId);
  if (!caseId) {
    console.warn('[Chase] Arrest XP skipped: no stable case ID.');
    return { success: false, reason: 'missing_case_id' };
  }
  // A thrown progression error aborts this attempt rather than committing an arrest without its XP.
  return progressionManager.grantReward('correct_arrest', caseId, text('t_a5b21b2626588c5f7e67'));
}
function rollbackChase(snapshot, metadata) {
  try {
    restoreSavedGameState(snapshot);
    gameState.caseDirector = metadata.director;
    gameState.dirty = metadata.dirty;
    gameState.saveCheckpoint = metadata.checkpoint;
    try { notifyRestore('progression:changed', progressionManager.getSummary()); }
    catch (error) { console.warn('[Chase] Could not refresh progression UI:', error); }
    return true;
  } catch (cause) {
    recoveryRequired = true;
    const error = new Error('The previous chase state could not be restored. Load a known-good save.');
    error.cause = cause;
    error.rollbackErrors = [ ...(cause?.rollbackErrors || []), { part: 'chase-persistence', message: cause?.message || String(cause) } ];
    notifyRestore('gameState:restoreFailed', { source: 'chase-persistence', error });
    console.error('[Chase] Rollback failed:', error);
    return false;
  }
}
export function persistChase(record) {
  if (writing) return false;
  if (recoveryRequired || isStateRestoreInProgress()) {
    status({ reason: recoveryRequired ? 'recovery_required' : 'restore_in_progress' }); return false;
  }
  writing = true;
  let snapshot = null, metadata = null, changed = false, mainSaved = false;
  try {
    if (!validChase(record, gameState.currentCaseId, gameState._createdAt)) {
      status({ reason: 'invalid_record' }); return false;
    }
    const staged = structuredClone(record), previousRecord = structuredClone(gameState.chaseState);
    const slot = checkpointSlot(staged), failureCode = chaseFailureCode(staged);
    metadata = { director: gameState.caseDirector, dirty: gameState.dirty, checkpoint: gameState.saveCheckpoint };
    snapshot = structuredClone(exportCurrentGameState());
    staged.slotKey = slot;
    // A failed secondary write must not let an older checkpoint beat the main save on equal timestamps.
    const previousTime = Number.isFinite(previousRecord?.updatedAt) ? previousRecord.updatedAt : -1;
    staged.updatedAt = Math.max(Date.now(), previousTime + 1);
    changed = true;
    if (failureCode) {
      staged.failureCode = failureCode; staged.terminalScene = 'GameOverScene';
      gameState.finalArrestSuspectId = staged.suspectId; gameState.finalArrestResult = 'FAILURE';
      gameState.caseFailed = true; gameState.caseResolved = false; gameState.isGameActive = false;
      gameState.gameOverReason = CHASE_FAILURES[failureCode].message;
    } else if (staged.phase === 'caught') gameState.finalArrestSuspectId = staged.suspectId;
    gameState.chaseState = structuredClone(staged);
    if (!failureCode && staged.phase === 'review' && staged.arrestOutcome?.code === 'arrested' && staged.arrestOutcome?.arrested === true) {
      grantNewArrestXP(staged, previousRecord);
    }
    mainSaved = saveGameState() === true;
    if (!mainSaved) throw Error('The main chase save was not confirmed.');
    // The main save is authoritative. Failure of the extra copy is a warning, not a failed commit.
    try {
      const data = exportCurrentGameState();
      const payload = { version: 2, caseId: staged.caseId, campaignId: staged.campaignId, updatedAt: staged.updatedAt, data };
      if (!validCheckpoint(payload)) throw Error('Generated checkpoint is invalid.');
      const raw = JSON.stringify(payload), key = PREFIX + slot;
      localStorage.setItem(key, raw);
      if (localStorage.getItem(key) !== raw) throw Error('Checkpoint verification failed.');
      status({ mainSaved: true, checkpointSaved: true, reason: 'saved' });
    } catch (error) {
      console.warn('[Chase] Main save retained; extra checkpoint unavailable:', error);
      status({ mainSaved: true, checkpointSaved: false, reason: 'checkpoint_unavailable', warning: error?.message || String(error) });
    }
    return true;
  } catch (error) {
    console.warn('[Chase] Save failed:', error);
    const restored = changed && snapshot ? rollbackChase(snapshot, metadata) : null;
    status({ mainSaved, rollbackSucceeded: restored,
      reason: restored === false ? 'recovery_required' : 'main_save_failed', warning: error?.message || String(error) });
    return false;
  } finally { writing = false; }
}
export function restoreLocalChaseCheckpoint(slotKey) {
  if (!SLOT_KEYS.includes(slotKey) || writing || isStateRestoreInProgress()) return false;
  try {
    const payload = JSON.parse(localStorage.getItem(PREFIX + slotKey) || 'null');
    if (!validCheckpoint(payload)) return false;
    if (!sameId(payload.caseId, gameState.currentCaseId) || payload.campaignId !== gameState._createdAt) return false;
    const loaded = currentChase();
    if (loaded && Number.isFinite(loaded.updatedAt) && loaded.updatedAt > payload.updatedAt) return false;
    return applyCheckpoint(payload);
  } catch (error) { console.warn('[Chase] Could not restore checkpoint:', error); return false; }
}
export function terminalData(record) {
  const court = gameState.courtState;
  const releasedByCourt = record && court && sameId(court.caseId, record.caseId) && court.campaignId === record.campaignId &&
    sameId(court.suspectId, record.suspectId) && court.phase === 'verdict' && court.verdict === 'released' && court.resultCommitted === true;
  if (releasedByCourt) return { title: text('t_92624f92e0a888fb966d'), reasonCode: 'court_release', caseId: record.caseId, suspectId: record.suspectId, message: COURT_RELEASE_MESSAGE };
  const reasonCode = chaseFailureCode(record);
  if (reasonCode) { const failure = CHASE_FAILURES[reasonCode]; return { title: failure.title, reasonCode, caseId: record.caseId, suspectId: record.suspectId, message: failure.message }; }
  return { title: text('t_12a3b87da732b611ab19'), reasonCode: 'mission_failed', caseId: record?.caseId ?? gameState.currentCaseId,
    suspectId: record?.suspectId ?? gameState.finalArrestSuspectId, message: gameState.gameOverReason || text('t_42393c93e18b35d98e47') };
}
export function settleChase(sceneKey) {
  const record = currentChase();
  if (!record || !['caught', 'escaped', 'review', 'settled'].includes(record.phase)) return false;
  const settled = structuredClone(record); settled.phase = 'settled'; settled.terminalScene = sceneKey;
  return persistChase(settled);
}
export function latestLocalChaseCheckpoint() {
  const candidates = [];
  for (const slot of SLOT_KEYS) {
    try {
      const payload = JSON.parse(localStorage.getItem(PREFIX + slot) || 'null');
      if (!validCheckpoint(payload) || payload.data.chaseState.phase === 'settled') continue;
      candidates.push(payload);
    } catch { /* One damaged slot must not hide the other slots. */ }
  }
  candidates.sort((a, b) => b.updatedAt - a.updatedAt);
  return candidates[0] || null;
}
export function restoreExplicitChaseCheckpoint(payload) {
  if (writing || isStateRestoreInProgress()) return false;
  try { if (!validCheckpoint(payload)) return false; return applyCheckpoint(payload); }
  catch (error) { console.warn('[Chase] Explicit checkpoint restore failed:', error); return false; }
}
