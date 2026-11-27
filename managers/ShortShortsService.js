import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { piInventoryManager } from './PIInventoryManager.js';
import { getCurrentTownId } from './RoadTripManager.js';
import { settlePICaseRewards } from './PICaseRewards.js';
import { applyPIIntegrityDecision } from './PICaseStanding.js';
import { CASE_ID, LIFT_ID, createCaseState, transition, getObjectives } from './ShortShortsModel.js';
import { validateShortShortsFrame, reviewShortShortsEvidence } from './ShortShortsCapturePolicy.js';
import { SHORT_SHORTS_CONFIG as CONFIG } from '../config/ShortShortsConfig.js';

const quest = () => gameState.piQuests?.quests?.[CASE_ID];
const reject = reason => ({ ok: false, reason });
export function readShortShorts() {
  const q = quest();
  return q ? structuredClone(q.metadata?.shortShorts || createCaseState()) : null;
}
export function readShortShortsEvidence() { return structuredClone(quest()?.metadata?.shortShortsEvidence || {}); }
function commit(q, state, evidence) {
  gameState.piQuests = { ...gameState.piQuests, quests: { ...gameState.piQuests.quests, [CASE_ID]: {
    ...q, metadata: { ...(q.metadata || {}), shortShorts: state, shortShortsEvidence: evidence },
    objectives: getObjectives(state, q.objectives)
  } } };
  let saved = true;
  try { requestAutosave(); } catch (error) { saved = false; console.error('[ShortShorts] Autosave request failed:', error); }
  return { ok: true, state, ...(!saved ? { warning: 'Progress changed in memory, but autosave could not be requested. Save manually.' } : {}) };
}
export function dispatchShortShorts(action, context = {}) {
  const q = quest();
  if (!q) return reject('An accepted Who Wears Short Shorts? contract is required.');
  const current = readShortShorts();
  const finishing = action?.type === 'READ_REPLY';
  if (finishing && q.status === 'completed' && current.stage === 'closed') return { ok: true, state: current, alreadyCompleted: true };
  if (!(q.status === 'active' || (finishing && q.status === 'settling'))) return reject('An active contract is required.');
  const evidence = readShortShortsEvidence();
  if (action?.type === 'CHOOSE_ENDING' || finishing) {
    const review = reviewShortShortsEvidence(current, evidence, CONFIG.rendererVersion);
    if (!review.ok) return reject('Photographic evidence is incomplete:\n' + review.issues.join('\n'));
  }
  const retry = finishing && current.stage === 'closed' && current.replyRead;
  const result = retry ? { ok: true, state: current } : transition(current, action, context);
  if (!result.ok) return result;
  if (action.type === 'REST' && !result.state.liftPhoto) delete evidence[LIFT_ID];
  const committed = commit(q, result.state, evidence);
  if (!finishing) return committed;
  try {
    applyPIIntegrityDecision({ caseId: CASE_ID, decisionId: 'ending', effect: result.state.ending === 'deliver' ? 'honest_report' : 'concealed_findings' });
  } catch (error) { console.error('[ShortShorts] Integrity decision failed:', error); }
  const settlement = settlePICaseRewards(CASE_ID, result.state.ending);
  if (!settlement.ok) return { ...committed, ok: false, reason: settlement.message || 'Payment could not be completed. Press the button again.' };
  return { ...committed, settlement };
}
export function captureShortShortsEvidence(frame) {
  const q = quest();
  if (q?.status !== 'active') return reject('No active contract.');
  if (getCurrentTownId() !== CONFIG.townId) return reject('Travel to the observation town first.');
  if (!piInventoryManager.hasItem('camera')) return reject('Bring your PI camera.');
  const s = readShortShorts();
  if (s?.stage !== 'observation') return reject('There is nothing to photograph now.');
  const checked = validateShortShortsFrame(s.phase, frame);
  if (!checked.ok) return checked;
  const key = checked.kind === 'lift' ? 'liftPhoto' : 'facePhoto';
  if (s[key]) return reject('That photograph is already recorded.');
  const id = 'short_shorts_' + checked.kind;
  const result = transition(s, { type: checked.action, photo: { evidenceId: id, kind: checked.kind, validated: true } }, { hasCamera: true });
  if (!result.ok) return result;
  const evidence = readShortShortsEvidence();
  evidence[id] = { id, kind: checked.kind, beat: s.phase, frame: { ...frame }, event: s.event, rendererVersion: CONFIG.rendererVersion };
  commit(q, result.state, evidence);
  return { ok: true, state: result.state, evidenceId: id };
}
