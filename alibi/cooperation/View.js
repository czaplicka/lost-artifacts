import { getAlibiKnowledge, publicAlibiStatement } from '../AlibiKnowledge.js';
import { getCooperationState, getWitnessPersonality } from './State.js';
import { findData } from './Runtime.js';
export function getInterviewView(caseKey, encounterId) {
  const state = getCooperationState(
    caseKey,
    encounterId
  );

  const {
    encounter,
    subject,
    witness
  } = findData(caseKey, encounterId);

  const others = subject.witnesses.filter(
    entry => entry.npcId !== witness.npcId
  );

  const otherDetails = others.filter(
    entry => getAlibiKnowledge(
      caseKey,
      entry.npcId
    ).details
  ).length;

  return {
    state,
    personality: getWitnessPersonality(
      caseKey,
      encounterId
    ),
    completed:
      encounter.interviewed === true &&
      encounter.dialogueCompleted === true,
    canChallenge:
      state.detailsUnlocked &&
      state.level >= 2 &&
      otherDetails === others.length,
    canCorroborate:
      otherDetails > 0 &&
      !state.usedApproaches.includes('corroborate'),
    originalStatement: publicAlibiStatement(
      caseKey,
      witness
    ),
    revisedStatement: state.revisedStatement,
    detailsKnown: state.detailsUnlocked,
    otherDetails
  };
}
