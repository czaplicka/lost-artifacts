import { APPROACHES, RECOVERY_APPROACHES } from './AlibiCooperationConfig.js';
import { getCooperationState, getWitnessPersonality } from './AlibiCooperationState.js';
import { getRapport, addEntry, spendMinutes } from './AlibiCooperationRuntime.js';
import { voiceLine, detectiveLine } from './AlibiDialogue.js';
import { getInterviewView } from './AlibiInterviewView.js';
export function applyApproach(
  caseKey,
  encounterId,
  approachId
) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  if (
    state.pendingChallenge ||
    state.usedApproaches.includes(approachId)
  ) {
    return null;
  }

  const profile = getWitnessPersonality(
    caseKey,
    encounterId
  );

  if (approachId === 'corroborate') {
    if (!getInterviewView(caseKey, encounterId).canCorroborate) {
      return null;
    }

    state.usedApproaches.push(approachId);
    state.level = Math.min(3, state.level + 1);

    return addEntry(
      state,
      'approach:corroborate',
      detectiveLine(caseKey, state, 'corroborate'),
      savedLine(
        caseKey,
        state,
        'witness:corroborate',
        [
          'All right. Let us compare what was observed, not what everyone has decided it means.',
          'We can compare the accounts. Please keep each person responsible for their own words.',
          'Yes. Put the statements beside one another and ask about the differences.',
          'I can discuss my account alongside theirs. I cannot answer on their behalf.',
          'A comparison is reasonable. Do not turn two accounts into one before checking them.',
          'Let us look at the statements separately first. Agreement should not be something we manufacture.'
        ]
      ),
      'Cooperation +1. No new facts have been added automatically.'
    );
  }

  if (!APPROACHES.some(entry => entry.id === approachId)) {
    return null;
  }

  const previous = state.level;

  let change = 0;
  let kind = 'neutral';

  if (approachId === profile.likes) {
    change = 1;
    kind = 'positive';

    if (
      getRapport() >= 3 &&
      !state.positiveBonusUsed
    ) {
      change = 2;
      state.positiveBonusUsed = true;
    }
  } else if (approachId === profile.dislikes) {
    change = -1;
    kind = 'negative';

    if (
      getRapport() >= 4 &&
      !state.protectionUsed
    ) {
      change = 0;
      state.protectionUsed = true;
    }
  }

  state.level = Math.max(
    0,
    Math.min(3, state.level + change)
  );

  state.usedApproaches.push(approachId);

  const answer = voiceLine(
    caseKey,
    state,
    kind,
    `approach:${approachId}:${kind}`
  );

  const delta = state.level - previous;

  return addEntry(
    state,
    `approach:${approachId}`,
    detectiveLine(
      caseKey,
      state,
      approachId,
      `approach:${approachId}`
    ),
    answer,
    `Cooperation ${delta >= 0 ? '+' : ''}${delta}.`
  );
}

export function repairCooperation(
  caseKey,
  encounterId,
  approachId
) {
  const approach = RECOVERY_APPROACHES.find(
    entry => entry.id === approachId
  );

  if (!approach) return null;

  const state = getCooperationState(
    caseKey,
    encounterId
  );

  if (
    state.pendingChallenge ||
    !state.usedApproaches.length ||
    state.level >= 3
  ) {
    return null;
  }

  const profile = getWitnessPersonality(
    caseKey,
    encounterId
  );

  spendMinutes(5);

  state.repairAttempts =
    (state.repairAttempts || 0) + 1;

  const slot = `repair:${state.repairAttempts}`;

  const question = detectiveLine(
    caseKey,
    state,
    approachId,
    slot
  );

  if (approachId !== profile.repair) {
    state.level = Math.max(0, state.level - 1);

    return addEntry(
      state,
      slot,
      question,
      voiceLine(
        caseKey,
        state,
        'repairMiss',
        `${slot}:miss`
      ),
      '5 minutes spent. Cooperation -1 (minimum 0).'
    );
  }

  const before = state.level;

  // Naprawa nie podnosi współpracy do poziomu 3.
  state.level = Math.max(2, state.level);

  const delta = state.level - before;

  return addEntry(
    state,
    slot,
    question,
    voiceLine(
      caseKey,
      state,
      'repair',
      `${slot}:success`
    ),
    `5 minutes spent. Cooperation ${delta >= 0 ? '+' : ''}${delta}. ` +
    'Ask for details to record them.'
  );
}
