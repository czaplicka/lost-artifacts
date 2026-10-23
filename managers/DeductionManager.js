import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';

export const DEDUCTION_CHANGED = 'deduction:changed';
const clone = value => JSON.parse(JSON.stringify(value));
const integer = value => Number.isFinite(Number(value))
  ? Math.max(0, Math.floor(Number(value))) : 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' ? value.trim() : '';

function selectionKey(value) {
  function normalize(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number' && Number.isFinite(item)) return item;
    if (Array.isArray(item)) return item.map(normalize);
    if (object(item)) return Object.fromEntries(
      Object.keys(item).sort().map(key => [key, normalize(item[key])])
    );
    throw new TypeError('Invalid deduction selection.');
  }
  return JSON.stringify(normalize(value));
}

class DeductionManager {
  getEffectiveDeduction() {
    const stats = getEffectiveStats({
      profile: gameState.detectiveProfile || 'analyst',
      stats: gameState.detectiveStats || {}
    });
    return integer(stats.deduction);
  }

  getAllowance() {
    return Math.max(0, this.getEffectiveDeduction() - 2);
  }

  getCaseKey() {
    const mission = gameState.currentMission || {};
    const caseId = gameState.currentCaseId ?? mission.caseId ?? mission.id ?? mission.missionId ?? null;
    const start = gameState.investigationStartTime ?? null;
    if (caseId === null && start === null) return null;
    return JSON.stringify([
      caseId, start, gameState.crimeCityId ?? null, mission.artifactKey ?? null
    ]);
  }

  readState() {
    const cases = gameState.deductionState?.cases;
    return {
      version: 1,
      cases: Array.isArray(cases) ? clone(cases).filter(entry =>
        object(entry) && typeof entry.caseKey === 'string' && Array.isArray(entry.checks)
      ) : []
    };
  }

  getChecks(state, caseKey) {
    return state.cases.find(entry => entry.caseKey === caseKey)?.checks || [];
  }

  getSummary() {
    const caseKey = this.getCaseKey();
    const deduction = this.getEffectiveDeduction();
    const allowance = this.getAllowance();
    const used = caseKey === null ? 0 : this.getChecks(this.readState(), caseKey).length;
    return {
      caseKey, deduction, required: 3, unlocked: deduction >= 3,
      activeCase: caseKey !== null, allowance, used,
      available: Math.max(0, allowance - used)
    };
  }

  prepareRequest({ sceneId, targetId, selection } = {}) {
    const caseKey = this.getCaseKey();
    if (!caseKey) return { success: false, reason: 'no_active_case' };
    if (!text(sceneId) || !text(targetId) || selection === undefined) {
      return { success: false, reason: 'invalid_request' };
    }
    try {
      const key = selectionKey(selection);
      return {
        success: true, caseKey, sceneId: text(sceneId), targetId: text(targetId),
        selectionKey: key, checkKey: JSON.stringify([text(sceneId), text(targetId), key])
      };
    } catch {
      return { success: false, reason: 'invalid_selection' };
    }
  }

  getPreviousCheck(request) {
    const prepared = this.prepareRequest(request);
    if (!prepared.success) return null;
    const previous = this.getChecks(this.readState(), prepared.caseKey)
      .find(entry => entry.checkKey === prepared.checkKey);
    return previous ? clone(previous) : null;
  }

  check(request = {}) {
    const summary = this.getSummary();
    if (!summary.unlocked) return { success: false, reason: 'deduction_too_low', ...summary };
    const prepared = this.prepareRequest(request);
    if (!prepared.success) return prepared;
    const previous = this.getPreviousCheck(request);
    if (previous) return {
      success: true, cached: true, charged: false, entry: previous, ...summary
    };
    if (summary.available < 1) return { success: false, reason: 'no_checks_left', ...summary };
    if (typeof request.evaluate !== 'function') return { success: false, reason: 'missing_evaluator' };
    let result;
    try { result = request.evaluate(); }
    catch (error) {
      console.error('[DeductionManager] Evaluation failed:', error);
      return { success: false, reason: 'evaluation_failed' };
    }
    if (!object(result) || !['supported', 'contradicted', 'inconclusive'].includes(result.status)
      || !text(result.message)) return { success: false, reason: 'invalid_result' };
    if (this.getCaseKey() !== prepared.caseKey) return { success: false, reason: 'case_changed' };
    const state = this.readState();
    let current = state.cases.find(entry => entry.caseKey === prepared.caseKey);
    if (!current) {
      current = { caseKey: prepared.caseKey, checks: [] };
      state.cases.push(current);
    }
    const entry = {
      checkKey: prepared.checkKey, sceneId: prepared.sceneId,
      targetId: prepared.targetId, selectionKey: prepared.selectionKey,
      result: { status: result.status, message: result.message.trim() },
      createdAt: new Date().toISOString()
    };
    current.checks.push(entry);
    gameState.updateState({ deductionState: state });
    const saved = saveGameState();
    const updated = this.getSummary();
    EventBus.emit(DEDUCTION_CHANGED, updated);
    return { success: true, cached: false, charged: true, saved, entry: clone(entry), ...updated };
  }

  getHistory() {
    const key = this.getCaseKey();
    return key ? clone(this.getChecks(this.readState(), key)) : [];
  }
}

export const deductionManager = new DeductionManager();
export default deductionManager;
