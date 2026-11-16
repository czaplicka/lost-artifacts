import { gameState } from '../GameData.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { getCaseClockStatus, syncMissionDeadline, refreshCaseDeadline } from '../CaseTimeHelper.js';
import { WATSON_SUPPORT, watsonCaseKey, getWatsonSupportReceipt } from './WatsonSupportModel.js';
let busy = false;
export function getWatsonSupportStatus(state = gameState) {
  const caseKey = watsonCaseKey(state);
  const result = reason => ({ ok: reason === 'available', reason, caseKey, ...WATSON_SUPPORT });
  if (!caseKey) return result('no_case');
  if (state.caseFailed || state.caseResolved) return result('case_closed');
  if (getWatsonSupportReceipt(state)) return result('already_used');
  if (busy) return result('busy');
  const clock = getCaseClockStatus(state);
  if (!clock.valid || clock.escapeDeadline == null) return result('invalid_clock');
  if (clock.totalExpired || clock.remainingSeconds <= 0) return result('expired');
  if (!clock.escapeActive) return result('not_pursuing');
  if (!state.arrestWarrantIssued || state.warrantSuspectId == null || String(state.warrantSuspectId).trim() === '') return result('no_warrant');
  // A receipt must never be silently replaced if a saved entry is damaged.
  if (state.caseData?.watsonPoliceSupport?.[caseKey] != null) return result('invalid_receipt');
  return result('available');
}
export function purchaseWatsonSupport(expectedCaseKey) {
  const state = gameState;
  const status = getWatsonSupportStatus(state);
  if (!status.ok) return status;
  if (!expectedCaseKey || expectedCaseKey !== status.caseKey) return { ok: false, reason: 'case_changed' };
  if (!moneyManager.canAfford(WATSON_SUPPORT.cost, MONEY_SOURCE.AGENCY)) return { ok: false, reason: 'insufficient_funds' };
  busy = true;
  const fields = ['caseData','agencyBudget','cash','agencyDebt','moneyLog','currentMission','investigationDeadline','escapeDeadline'];
  let previous;
  let committed = false;
  try {
    previous = Object.fromEntries(fields.map(key => [key, structuredClone(state[key])]));
    const before = getCaseClockStatus(state);
    const receipt = {
      version: 1, used: true, caseKey: status.caseKey, ...WATSON_SUPPORT,
      source: 'agency', baseEscapeDeadline: before.escapeDeadline,
      warrantSuspectId: state.warrantSuspectId, purchasedAtGameMinute: before.now
    };
    state.caseData = { ...(state.caseData || {}), watsonPoliceSupport: {
      ...(state.caseData?.watsonPoliceSupport || {}), [status.caseKey]: receipt
    } };
    syncMissionDeadline(state);
    const payment = moneyManager.spend(WATSON_SUPPORT.cost, {
      source: MONEY_SOURCE.AGENCY, category: ECONOMY_CATEGORY.PHONE,
      description: 'Watson: police checks (+6 hours)', missionId: state.currentMission.id,
      metadata: { watsonPoliceSupport: true, caseKey: status.caseKey, bonusMinutes: WATSON_SUPPORT.bonusMinutes }
    });
    if (!payment.ok) throw new Error('payment_failed');
    requestAutosave();
    if (flushAutosave() !== true) throw new Error('save_failed');
    committed = true;
    try { refreshCaseDeadline(state); } catch (error) { console.error('[WatsonSupport] HUD refresh failed:', error); }
    return { ok: true, reason: 'purchased', ...WATSON_SUPPORT };
  } catch (error) {
    if (!committed && previous) {
      if (typeof state.updateState === 'function') state.updateState(previous);
      else Object.assign(state, previous);
      try { requestAutosave(); flushAutosave(); } catch (rollbackError) { console.error('[WatsonSupport] Rollback save failed:', rollbackError); }
      try {
        refreshCaseDeadline(state);
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lost-artifacts:money-changed', { detail: {
            reason: 'watson_support_rollback', transaction: null,
            state: { cash: state.cash, agencyBudget: state.agencyBudget, agencyDebt: state.agencyDebt }
          } }));
        }
      } catch (_) { /* The state rollback is already complete. */ }
    }
    console.error('[WatsonSupport] Purchase failed:', error);
    return { ok: false, reason: error.message === 'payment_failed' ? 'insufficient_funds' : 'save_failed' };
  } finally { busy = false; }
}
