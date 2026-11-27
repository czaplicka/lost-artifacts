import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { CASE_ID, createCaseState, transition, getObjectives, buildReport } from './TableForThreeModel.js';
import { reviewTableForThreeReport } from './TableForThreeReportPolicy.js';
import { settlePICaseRewards } from './PICaseRewards.js';
import { TABLE_FOR_THREE_RESTAURANT_CONFIG as CONFIG } from '../config/TableForThreeRestaurantConfig.js';

export function readTableForThree() {
  const quest = gameState.piQuests?.quests?.[CASE_ID];
  if (!quest) return null;
  return structuredClone(quest.metadata?.tableForThree || createCaseState());
}
function reject(reason) { return { ok: false, reason }; }
function commit(quest, state, patch = {}) {
  gameState.piQuests = { ...gameState.piQuests, quests: {
    ...gameState.piQuests.quests, [CASE_ID]: {
      ...quest, ...patch, metadata: {
        ...(quest.metadata || {}), ...(patch.metadata || {}), tableForThree: state
      }, objectives: getObjectives(state)
    }
  }};
  let autosaveRequested = true;
  try { requestAutosave(); }
  catch (error) {
    autosaveRequested = false;
    console.error('[TableForThree] Autosave request failed:', error);
  }
  return { ok: true, state, autosaveRequested,
    ...(!autosaveRequested ? { warning: 'Progress changed in memory, but autosave could not be requested. Save the game manually.' } : {}) };
}
export function dispatchTableForThree(action, validatedContext = {}) {
  const quest = gameState.piQuests?.quests?.[CASE_ID];
  if (!quest) return reject('An active Table for Three contract is required.');
  const current = readTableForThree();
  const finishing = action?.type === 'READ_CLIENT_REPLY';
  // Cases closed earlier in the unpaid development build stay closed and are not paid retroactively.
  if (finishing && quest.status === 'completed' && current?.stage === 'closed' && current.clientReplyRead) {
    return { ok: true, state: current, alreadyCompleted: true };
  }
  const allowed = quest.status === 'active' || (finishing && quest.status === 'settling');
  if (!allowed) return reject('An active Table for Three contract is required.');
  const submitting = action?.type === 'SUBMIT_REPORT';
  let review;
  if (submitting || finishing) {
    review = reviewTableForThreeReport(current, quest.metadata?.tableForThreeEvidence, CONFIG.rendererVersion);
    if (!review.ok) return reject('Report evidence is incomplete:\n' + review.issues.join('\n'));
  }
  if (submitting && action.discloseIntervention !== true) return reject('The report must disclose the planted ring.');
  if (submitting && current.reportSubmitted) return { ok: true, state: current, alreadySubmitted: true };
  if (finishing && (!current.reportSubmitted || !quest.resolution?.report)) return reject('Send the complete report before acknowledging the reply.');
  if (finishing) {
    const report = quest.resolution.report;
    const ids = review.records.map(record => record.id);
    if (report.caseId !== CASE_ID || !Array.isArray(report.evidenceIds) ||
        report.evidenceIds.length !== ids.length || report.evidenceIds.some((id, index) => id !== ids[index])) {
      return reject('The submitted report does not reference the three validated photographs.');
    }
  }
  // After the reply is read, a failed payment can be retried: the case state is already closed.
  const legacyClosed = finishing && current.stage === 'closed' && current.clientReplyRead;
  const result = legacyClosed ? { ok: true, state: current } : transition(current, action, validatedContext);
  if (!result.ok) return result;
  let patch = {};
  if (submitting) patch.resolution = {
    ...(quest.resolution || {}), report: buildReport(result.state),
    reportEvidence: review.records, reportSubmittedAt: new Date().toISOString()
  };
  if (finishing) patch = {
    resolution: { ...(quest.resolution || {}),
      reportEvidence: quest.resolution?.reportEvidence || review.records }
  };
  const committed = commit(quest, result.state, patch);
  if (!finishing) return committed;
  const settlement = settlePICaseRewards(CASE_ID);
  if (!settlement.ok) {
    return { ...committed, ok: false, reason: settlement.message || 'Payment could not be completed. Press the button again.' };
  }
  return { ...committed, settlement };
}
