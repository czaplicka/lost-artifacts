// suspectsBoard/applyGridExclusions.js

import { manuallyClearSuspect } from '../ui/suspectUtils.js';

export function getCaseKey(gameState, cityId) {
  const mission = gameState.currentMission || {};

  return String(
    mission.id ||
      mission.caseId ||
      `${cityId}_${mission.artifact || 'default'}`
  );
}

/**
 * Zamienia oznaczenia UNLIKELY z Evidence Grid na prawdziwe wykluczenia
 * (deductionState.eliminated) i zamyka etap wykluczania dla sprawy.
 */
export function applyGridExclusions({
  gameState,
  cityId,
  suspectIds,
  unlikelyById
}) {
  const suspects = gameState.caseSuspects || [];
  const clearedIds = [];

  suspectIds.forEach((id) => {
    if (unlikelyById[id] !== true) {
      return;
    }

    const suspect = suspects.find((item) => item?.id === id);

    if (!suspect) {
      return;
    }

    if (suspect.deductionState?.eliminated === true) {
      clearedIds.push(id);
      return;
    }

    const result = manuallyClearSuspect(id, {
      source: 'evidence_grid',
      label: 'Evidence Grid exclusion',
      note: 'Marked as unlikely on the Evidence Grid.',
      type: 'manual_forensic_review'
    });

    if (result?.success) {
      clearedIds.push(id);
    } else {
      console.warn(
        '[applyGridExclusions] Could not clear suspect:',
        id,
        result
      );
    }
  });

  gameState.suspectExclusionState ??= {};

  const caseKey = getCaseKey(gameState, cityId);

  gameState.suspectExclusionState[caseKey] = {
    ...(gameState.suspectExclusionState[caseKey] || {}),
    finished: true,
    finishedAt: Date.now(),
    manualExclusionIds: clearedIds
  };

  return clearedIds;
}