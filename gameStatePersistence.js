import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { captureInvestigationAudit, theoryWorkspaceKey } from './systems/InvestigationAudit.js';
import { exportCurrentGameState, restoreSavedGameState, isStateRestoreInProgress } from './gameState/saveRestore.js';

const SAVE_KEY = 'detectiveSaveData', AUTOSAVE_DELAY_MS = 500;
const WARNING_ID = 'game-persistence-warning';
let persistenceBusy = false, automaticSaveBlocked = false;
let autosaveTimer = null, autosavePending = false;
let autosaveRevision = 0, autosaveWriteInProgress = false;
let failedRaw = null, failedRawKnown = false, rollbackUnsafe = false;
let lastError = null, lastRecoveryKey = null, lastTheorySignature = null;
let domWarningScheduled = false, notifyingAutosaveRestore = false;
const errorText = error => error?.message || String(error);

function emitStatus() {
  try { EventBus.emit('persistence:status', getPersistenceStatus()); }
  catch (error) { console.warn('[Persistence] Status listener failed:', error); }
}
export function getPersistenceStatus() {
  return { busy: persistenceBusy, automaticSaveBlocked, rollbackUnsafe,
    error: lastError, recoveryKey: lastRecoveryKey, autosavePending };
}
function storage() {
  if (typeof window === 'undefined' || !window.localStorage) throw new Error('Browser storage is unavailable.');
  return window.localStorage;
}
function hideWarning() {
  if (typeof document !== 'undefined') document.getElementById(WARNING_ID)?.remove();
}
function showWarning() {
  if (typeof document === 'undefined' || !automaticSaveBlocked) return;
  if (!document.body) {
    if (!domWarningScheduled) {
      domWarningScheduled = true;
      document.addEventListener('DOMContentLoaded', () => { domWarningScheduled = false; showWarning(); }, { once: true });
    }
    return;
  }
  let root = document.getElementById(WARNING_ID);
  if (!root) {
    root = document.createElement('section'); root.id = WARNING_ID;
    root.setAttribute('role', 'alert');
    root.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:14px;background:#37251b;color:#fff1d0;border:2px solid #d4af37;font:16px/1.5 monospace;max-height:45vh;overflow:auto;';
    document.body.appendChild(root);
  }
  root.replaceChildren();
  const message = document.createElement('p');
  message.textContent = rollbackUnsafe
    ? 'Loading failed and recovery was incomplete. Automatic saving is paused. Reload a known-good save before continuing.'
    : 'The autosave could not be loaded. Automatic saving is paused to protect it. Retry loading, or back it up before enabling saving for the current game.';
  const detail = document.createElement('p'); detail.textContent = lastError || '';
  root.append(message, detail);
  const button = (label, action, disabled = false) => {
    const element = document.createElement('button');
    element.type = 'button'; element.textContent = label; element.disabled = disabled;
    element.style.cssText = 'margin:4px;padding:8px 12px;cursor:pointer;font:inherit;';
    element.addEventListener('click', action); root.appendChild(element);
  };
  button('Retry loading autosave', () => { loadGameState(); });
  button('Download unreadable autosave', () => {
    try {
      if (!failedRawKnown || failedRaw === null) throw new Error('No autosave data could be read. Retry loading first.');
      const url = URL.createObjectURL(new Blob([failedRaw], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'unreadable-autosave.json';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { lastError = errorText(error); showWarning(); }
  }, !failedRawKnown || failedRaw === null);
  button('Back up autosave & enable saving', () => { resumeAutomaticSaving(); }, rollbackUnsafe);
}
function blockSaving(error, raw, rawKnown) {
  automaticSaveBlocked = true; failedRaw = raw; failedRawKnown = rawKnown;
  rollbackUnsafe = rollbackUnsafe || Boolean(error?.rollbackErrors?.length);
  lastError = errorText(error); showWarning(); emitStatus();
}
function unblockSaving() {
  automaticSaveBlocked = false; failedRaw = null; failedRawKnown = false;
  rollbackUnsafe = false; lastError = null; hideWarning(); emitStatus();
}
function cancelPendingAutosave() {
  if (autosaveTimer !== null) clearTimeout(autosaveTimer);
  autosaveTimer = null; autosavePending = false; autosaveRevision += 1;
}
function theorySignature() {
  const key = theoryWorkspaceKey(gameState), draft = gameState.caseTheories?.[key];
  const sections = draft ? Object.entries(draft.sections || {}).map(([field, value]) => [field, {
    answerId: value?.answerId ?? '', skillIds: value?.skillIds ?? [], evidenceIds: value?.evidenceIds ?? []
  }]) : null;
  return JSON.stringify([gameState.currentCaseId ?? null, gameState._createdAt ?? null, key, sections]);
}
function captureAudit() {
  try { captureInvestigationAudit(gameState); lastTheorySignature = theorySignature(); }
  catch (error) { console.error('[Persistence] Investigation audit capture failed:', error); }
}
function captureTheoryEdgeIfNeeded() {
  try { if (theorySignature() !== lastTheorySignature) captureAudit(); }
  catch (error) { console.error('[Persistence] Could not inspect theory selection:', error); }
}

// Detailed API. "paused" is a deliberate no-write, not a storage failure.
// Legacy callers retain the original boolean API through saveGameState().
export function saveGameStateResult() {
  if (rollbackUnsafe) return { status: 'unsafe', saved: false, reason: 'rollback_incomplete', error: lastError };
  if (isStateRestoreInProgress()) return { status: 'busy', saved: false, reason: 'restore_in_progress' };
  if (persistenceBusy) return { status: 'busy', saved: false, reason: 'persistence_busy' };
  if (automaticSaveBlocked) return { status: 'paused', saved: false, reason: 'autosave_protected' };
  persistenceBusy = true;
  try {
    captureAudit();
    storage().setItem(SAVE_KEY, JSON.stringify(exportCurrentGameState()));
    lastError = null; hideWarning();
    return { status: 'saved', saved: true };
  } catch (error) {
    console.error('[Persistence] Failed to save game:', error);
    lastError = errorText(error); emitStatus();
    if (typeof document !== 'undefined') {
      let root = document.getElementById(WARNING_ID);
      if (!root && document.body) {
        root = document.createElement('div'); root.id = WARNING_ID; root.setAttribute('role', 'alert');
        root.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:14px;background:#37251b;color:#fff1d0;border:2px solid #d4af37;font:16px/1.5 monospace;';
        document.body.appendChild(root);
      }
      if (root) root.textContent = 'The game could not be saved. Check browser storage and save again. ' + lastError;
    }
    return { status: 'error', saved: false, reason: 'write_failed', error: lastError };
  } finally { persistenceBusy = false; emitStatus(); }
}
export function saveGameState() { return saveGameStateResult().saved; }

function writePendingAutosave() {
  if (!autosavePending || autosaveWriteInProgress) return false;
  const revision = autosaveRevision;
  autosaveWriteInProgress = true;
  try {
    const saved = saveGameState();
    if (saved && revision === autosaveRevision) autosavePending = false;
    emitStatus();
    return saved;
  } finally { autosaveWriteInProgress = false; }
}
export function requestAutosave() {
  if (isStateRestoreInProgress()) return;
  if (!persistenceBusy) captureTheoryEdgeIfNeeded();
  if (automaticSaveBlocked) return;
  autosavePending = true; autosaveRevision += 1;
  if (autosaveTimer !== null) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { autosaveTimer = null; writePendingAutosave(); }, AUTOSAVE_DELAY_MS);
}
export function flushAutosave() {
  if (autosaveTimer !== null) clearTimeout(autosaveTimer);
  autosaveTimer = null;
  return writePendingAutosave();
}
export function loadGameState() {
  if (persistenceBusy || notifyingAutosaveRestore || isStateRestoreInProgress()) return false;
  cancelPendingAutosave(); persistenceBusy = true;
  let raw = null, rawKnown = false;
  try {
    raw = storage().getItem(SAVE_KEY); rawKnown = true;
    if (raw === null) {
      if (rollbackUnsafe) throw new Error('Recovery was incomplete. Load a known-good slot before enabling saving.');
      lastTheorySignature = null; unblockSaving(); return false;
    }
    const data = JSON.parse(raw);
    restoreSavedGameState(data); lastTheorySignature = null; unblockSaving();
  } catch (error) {
    blockSaving(error, raw, rawKnown);
    console.error('[Persistence] Load failed. Autosave unchanged; saving paused pending recovery.', error);
    return false;
  } finally { persistenceBusy = false; emitStatus(); }
  notifyingAutosaveRestore = true;
  try { EventBus.emit('gameState:restored', { source: 'autosave' }); }
  catch (error) { console.error('[Persistence] Autosave restore notification failed:', error); }
  finally { notifyingAutosaveRestore = false; }
  return true;
}
function archiveFailedAutosave() {
  if (!failedRawKnown) throw new Error('Retry loading first: browser storage could not be read.');
  const store = storage();
  if (store.getItem(SAVE_KEY) !== failedRaw) throw new Error('The autosave has changed. Retry loading it before enabling saving.');
  if (failedRaw === null) return null;
  const key = `${SAVE_KEY}:recovery:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  store.setItem(key, failedRaw);
  if (store.getItem(key) !== failedRaw) throw new Error('The backup could not be verified. Automatic saving remains paused.');
  lastRecoveryKey = key; return key;
}
export function resumeAutomaticSaving() {
  if (persistenceBusy || isStateRestoreInProgress()) return false;
  if (!automaticSaveBlocked) return true;
  if (rollbackUnsafe) {
    lastError = 'Recovery was incomplete. Load a known-good slot or retry loading successfully first.';
    showWarning(); emitStatus(); return false;
  }
  try {
    archiveFailedAutosave(); unblockSaving(); lastTheorySignature = null; requestAutosave(); return true;
  } catch (error) { lastError = errorText(error); showWarning(); emitStatus(); return false; }
}
export function clearSavedGame() {
  if (persistenceBusy || isStateRestoreInProgress()) return false;
  cancelPendingAutosave(); persistenceBusy = true;
  try {
    const store = storage();
    if (automaticSaveBlocked) archiveFailedAutosave();
    store.removeItem(SAVE_KEY);
    if (store.getItem(SAVE_KEY) !== null) throw new Error('Autosave deletion could not be verified.');
    MainStoryManager.resetProgress({ silent: true }); gameState.mainStory = MainStoryManager.serialize();
    lastTheorySignature = null; unblockSaving(); return true;
  } catch (error) {
    console.error('[Persistence] Failed to clear autosave:', error);
    lastError = errorText(error); showWarning(); emitStatus(); return false;
  } finally { persistenceBusy = false; emitStatus(); }
}
function afterExternalRestore({ source } = {}) {
  if (source === 'autosave') return;
  cancelPendingAutosave(); lastTheorySignature = null; rollbackUnsafe = false;
  if (automaticSaveBlocked) resumeAutomaticSaving();
}
function saveAfterMainStoryChange() {
  if (persistenceBusy || isStateRestoreInProgress()) return;
  gameState.mainStory = MainStoryManager.serialize();
  if (gameState.isGameActive) requestAutosave();
}
for (const event of ['mainStory:stageAdvanced', 'mainStory:flagSet', 'mainStory:sideClueSet', 'mainStory:reset']) {
  EventBus.on(event, saveAfterMainStoryChange);
}
EventBus.on('gameState:restored', afterExternalRestore);
EventBus.on('gameState:restoreFailed', ({ error } = {}) => {
  if (!error?.rollbackErrors?.length) return;
  cancelPendingAutosave();
  let raw = null, rawKnown = false;
  try { raw = storage().getItem(SAVE_KEY); rawKnown = true; } catch { /* Preserve the save block. */ }
  blockSaving(error, raw, rawKnown);
});
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushAutosave();
});
