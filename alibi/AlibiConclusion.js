import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { getMissionCaseKey } from '../crimeCaseKey.js';
import { saveGameState } from '../gameStatePersistence.js';
import { progressionManager } from '../managers/ProgressionManager.js';
import { allWitnessesVisited, NO_ALIBI_LIAR } from './AlibiEncounterSetup.js';
import { getStoredAlibiSubject, validAlibiTimeline, orderedAlibiTimeline, assessAlibiConclusion } from './AlibiConclusionEvidence.js';
export { getAlibiEvidenceDossier, getAlibiCourtRecord } from './AlibiConclusionEvidence.js';

const FINAL = new Set(['confirmed', 'contradicted']);
let filingBusy = false;
let recoveryRequired = false;
EventBus.on('gameState:restored', () => { recoveryRequired = false; });

function isActiveCase(caseKey) {
  if (typeof caseKey !== 'string' && typeof caseKey !== 'number') return false;
  if (typeof caseKey === 'number' && !Number.isFinite(caseKey)) return false;
  return String(caseKey) === getMissionCaseKey(gameState);
}
function context(caseKey, suspectId) {
  return { data: getStoredAlibiSubject(caseKey, suspectId),
    suspect: getCaseSuspects(gameState).find(s => s.id === suspectId) };
}
function publicResult(filed) {
  return { status: filed.status, choice: filed.choice,
    timelineIds: Array.isArray(filed.timelineIds) ? [...filed.timelineIds] : [], locked: true,
    evidenceStatus: filed.evidenceStatus || 'legacy_unverified' };
}
function lookupFiledConclusion(caseKey, suspectId) {
  const { data, suspect } = context(caseKey, suspectId), filed = data?.playerConclusion;
  if (filed?.locked === true && FINAL.has(filed.status)) return publicResult(filed);
  // Legacy suspect status has no independent case tag: use it only for the active case.
  if (isActiveCase(caseKey) && FINAL.has(suspect?.deductionState?.alibiStatus)) {
    return { status: suspect.deductionState.alibiStatus, locked: true,
      choice: gameState.alibiAccusations?.[caseKey]?.[suspectId] || null,
      timelineIds: [], evidenceStatus: 'legacy_unverified' };
  }
  return null;
}
export function getFiledAlibiConclusion(caseKey, suspectId) {
  if (filingBusy || recoveryRequired) return null;
  return lookupFiledConclusion(caseKey, suspectId);
}

function grantCompletion(caseKey) {
  const subjects = gameState.caseData?.alibiCases?.[caseKey]?.suspects;
  if (!Array.isArray(subjects) || !subjects.length ||
    new Set(subjects.map(s => s.suspectId)).size !== subjects.length ||
    subjects.some(s => typeof s.suspectId !== 'string' || !s.suspectId.trim() ||
      !allWitnessesVisited(caseKey, s.suspectId) || !s.playerConclusion?.locked ||
      !FINAL.has(s.playerConclusion.status) || !validAlibiTimeline(s, s.playerConclusion.timelineIds))) {
    return { success: false, reason: 'alibi_stage_not_finished' };
  }
  if (!['string', 'number'].includes(typeof caseKey) || (typeof caseKey === 'number' && !Number.isFinite(caseKey))) {
    return { success: false, reason: 'missing_case_key' };
  }
  const scope = String(caseKey).trim();
  if (!scope || ['default_case', 'unknown_mission'].includes(scope) || scope.length > 400) {
    return { success: false, reason: 'missing_case_key' };
  }
  return progressionManager.grantReward('alibi_completed', scope, 'Alibi investigation completed');
}

function completionAndSave(caseKey) {
  let previousProgression;
  try { previousProgression = structuredClone(gameState.progressionState); }
  catch (error) {
    console.error('[AlibiConclusion] XP snapshot failed:', error);
    return { xpResult: { success: false, reason: 'progression_error' }, rewardSaved: false };
  }
  let xpResult;
  try { xpResult = grantCompletion(caseKey); }
  catch (error) {
    console.error('[AlibiConclusion] XP failed:', error);
    try { gameState.progressionState = previousProgression; }
    catch (rollbackError) {
      recoveryRequired = true;
      console.error('[AlibiConclusion] XP recovery failed:', rollbackError);
    }
    return { xpResult: { success: false, reason: 'progression_error' }, rewardSaved: false };
  }
  if (xpResult?.reason === 'alibi_stage_not_finished') return { xpResult, rewardSaved: true };
  if (xpResult?.success !== true && xpResult?.reason !== 'already_granted') return { xpResult, rewardSaved: false };
  // Also save an already-granted in-memory reward: its earlier save may have failed.
  try { return { xpResult, rewardSaved: saveGameState() === true }; }
  catch (error) {
    console.error('[AlibiConclusion] Reward save failed:', error);
    return { xpResult, rewardSaved: false };
  }
}

function restoreClaim(data, suspect, backup) {
  const errors = [];
  for (const restore of [
    () => { if (backup.filed === undefined) delete data.playerConclusion; else data.playerConclusion = backup.filed; },
    () => { if (backup.deduction === undefined) delete suspect.deductionState; else suspect.deductionState = backup.deduction; },
    () => { gameState.alibiAccusations = backup.accusations; }
  ]) {
    try { restore(); } catch (error) { errors.push(error); }
  }
  if (errors.length) {
    recoveryRequired = true;
    console.error('[AlibiConclusion] Claim recovery failed:', errors);
  }
}

function fileConclusion(caseKey, suspectId, timelineIds, choice, options) {
  const previous = lookupFiledConclusion(caseKey, suspectId);
  if (previous) return { accepted: true, alreadyFiled: true, ...previous, ...completionAndSave(caseKey) };
  const { data, suspect } = context(caseKey, suspectId);
  if (!data || !suspect || !Array.isArray(data.witnesses) || data.witnesses.length !== 3 ||
    new Set(data.witnesses.map(w => w?.npcId)).size !== 3 || !allWitnessesVisited(caseKey, suspectId)) {
    return { accepted: false, message: 'Record all three witness visits before filing.' };
  }
  if (!validAlibiTimeline(data, timelineIds)) return { accepted: false, message: "Place each of this subject's three cards exactly once." };
  if (choice !== NO_ALIBI_LIAR && !data.witnesses.some(w => w.npcId === choice)) {
    return { accepted: false, message: 'Select a witness or the no-liar conclusion.' };
  }
  const assessment = assessAlibiConclusion(caseKey, suspectId, timelineIds, choice, options);
  if (!assessment.documented && options.allowRisky !== true) {
    return { accepted: false, requiresRiskConfirmation: true,
      message: 'This conclusion is not fully documented. Confirm explicitly to file it as a risky claim.',
      riskReasons: [...assessment.reasons] };
  }
  const status = choice === NO_ALIBI_LIAR ? 'confirmed' : 'contradicted';
  const timelineCorrect = orderedAlibiTimeline(data, timelineIds);
  const conclusionCorrect = choice === NO_ALIBI_LIAR ? data.alibiType === 'confirmed'
    : data.witnesses.some(w => w.npcId === choice && w.isLiar === true);
  const filed = {
    version: 2, locked: true, status, choice, timelineIds: [...timelineIds], filedAt: new Date().toISOString(),
    evidenceStatus: assessment.documented ? 'documented' : 'risky',
    evidence: {
      sources: structuredClone(assessment.sources), comparison: structuredClone(assessment.comparison),
      confirmation: structuredClone(assessment.confirmation), retraction: assessment.retraction || null,
      crimeWindow: structuredClone(data.crimeWindow), riskAccepted: !assessment.documented,
      riskReasons: [...assessment.reasons],
      timeline: timelineIds.map(id => {
        const card = data.boardCards.find(c => c.id === id), witness = data.witnesses.find(w => w.timelineCard?.id === id);
        const known = assessment.sources.some(r => r.npcId === witness?.npcId);
        return { id, role: card.role || witness?.role || 'Witness',
          minute: known && Number.isInteger(card.minute) ? card.minute : null, detailsKnown: known };
      })
    },
    evaluation: { timelineCorrect, conclusionCorrect,
      evidenceSupported: assessment.documented && timelineCorrect && conclusionCorrect,
      correct: timelineCorrect && conclusionCorrect }
  };
  const backup = {
    filed: structuredClone(data.playerConclusion), accusations: structuredClone(gameState.alibiAccusations),
    deduction: structuredClone(suspect.deductionState)
  };
  try {
    data.playerConclusion = filed;
    gameState.alibiAccusations ??= {}; gameState.alibiAccusations[caseKey] ??= {};
    gameState.alibiAccusations[caseKey][suspectId] = choice;
    suspect.deductionState ??= {};
    suspect.deductionState.alibiStatus = status;
    suspect.deductionState.alibiEvidenceStatus = filed.evidenceStatus;
    if (saveGameState() !== true) throw new Error('Save was not confirmed.');
  } catch (error) {
    restoreClaim(data, suspect, backup);
    console.error('[AlibiConclusion] Filing save failed:', error);
    return { accepted: false, message: recoveryRequired
      ? 'Alibi recovery was incomplete. Reload a known-good save before continuing.'
      : 'The conclusion could not be saved. Please try again.' };
  }
  return { accepted: true, alreadyFiled: false, ...publicResult(filed), ...completionAndSave(caseKey) };
}

export function fileAlibiConclusion(caseKey, suspectId, timelineIds, choice, options = {}) {
  if (filingBusy) return { accepted: false, message: 'An alibi filing is already in progress.' };
  if (recoveryRequired) return { accepted: false, message: 'Alibi recovery was incomplete. Reload a known-good save before continuing.' };
  options = options && typeof options === 'object' ? options : {};
  filingBusy = true;
  try { return fileConclusion(caseKey, suspectId, timelineIds, choice, options); }
  catch (error) {
    console.error('[AlibiConclusion] Could not prepare filing:', error);
    return { accepted: false, message: 'The conclusion could not be prepared. Reopen the investigation and try again.' };
  } finally { filingBusy = false; }
}
