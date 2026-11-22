import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { manuallyClearSuspect } from '../ui/suspectUtils.js';

// Preserve existing save keys. Migration to a shared resolver is a separate change.
export function getCaseKey(gameState, cityId) {
  const mission = gameState.currentMission || {};
  return String(mission.id || mission.caseId || `${cityId}_${mission.artifact || 'default'}`);
}

// The caller snapshots state and restores it if this operation or its save fails.
export function applyGridExclusions({ gameState, cityId, suspectIds, unlikelyById }) {
  if (!Array.isArray(suspectIds) || !unlikelyById || typeof unlikelyById !== 'object') {
    throw new TypeError('The grid exclusion data is invalid.');
  }
  const suspects = gameState.caseSuspects || [];
  const requested = [...new Set(suspectIds)].filter(id => unlikelyById[id] === true);
  for (const id of requested) {
    if (typeof id !== 'string' || !id.trim() || !suspects.some(suspect => suspect?.id === id)) {
      throw new Error('A marked suspect no longer belongs to this case. Reopen the evidence grid.');
    }
  }
  const clearedIds = [];
  for (const id of requested) {
    const suspect = suspects.find(item => item?.id === id);
    if (suspect.deductionState?.eliminated !== true) {
      const result = manuallyClearSuspect(id, {
        source: 'evidence_grid',
        label: __dialogueText('suspectsBoard/applyGridExclusions.js', 't_5d4bae213174c822c942'),
        note: __dialogueText('suspectsBoard/applyGridExclusions.js', 't_606930a198d78a990b08'),
        type: 'manual_forensic_review'
      });
      const updated = gameState.caseSuspects.find(item => item?.id === id);
      if (result?.success !== true || updated?.deductionState?.eliminated !== true) {
        throw new Error('A suspect could not be excluded. The shortlist was not confirmed.');
      }
    }
    clearedIds.push(id);
  }
  const caseKey = getCaseKey(gameState, cityId), previous = gameState.suspectExclusionState || {};
  gameState.suspectExclusionState = {
    ...previous, [caseKey]: { ...(previous[caseKey] || {}), finished: true,
      finishedAt: Date.now(), manualExclusionIds: clearedIds }
  };
  return clearedIds;
}
