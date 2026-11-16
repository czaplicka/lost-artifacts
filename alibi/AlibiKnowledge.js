import { gameState } from '../GameData.js';

export const ALIBI_BASIC = 'The witness acknowledges knowing the person, but has not given a detailed account.';
export const ALIBI_UNKNOWN = 'No statement obtained. Speak to the witness first.';
export const ALIBI_MISSING_DETAIL = 'Details not obtained. Improve cooperation and ask for a detailed account.';

export function findAlibiEncounter(caseKey, npcId, state = gameState) {
  return (state.crimeCityEncounterState?.[caseKey] || []).find(e => e.alibiWitness === true && e.npcId === npcId) || null;
}
export function getAlibiKnowledge(caseKey, npcId, state = gameState) {
  const encounter = findAlibiEncounter(caseKey, npcId, state);
  const cooperation = state.caseData?.alibiCases?.[caseKey]?.cooperation?.[encounter?.id];
  if (cooperation?.disclosureVersion === 1) {
    return { basic: cooperation.asked?.includes('statement') === true, details: cooperation.detailsUnlocked === true };
  }
  // Old statement answers contained the full account. Do not take already learned facts away.
  const legacy = cooperation?.asked?.includes('statement') === true ||
    (encounter?.interviewed === true && encounter?.dialogueCompleted === true);
  return { basic: legacy, details: legacy };
}
export function publicAlibiStatement(caseKey, witness, state = gameState) {
  const known = getAlibiKnowledge(caseKey, witness.npcId, state);
  return known.details ? String(witness.statement || '') : known.basic ? ALIBI_BASIC : ALIBI_UNKNOWN;
}
export function publicAlibiCard(caseKey, witness, card = witness.timelineCard, state = gameState) {
  if (!card) return null;
  if (getAlibiKnowledge(caseKey, witness.npcId, state).details) return structuredClone(card);
  return { id: card.id, role: card.role || witness.role || 'Witness', roleId: card.roleId || witness.roleId,
    label: ALIBI_MISSING_DETAIL, minute: null, detailsLocked: true };
}
export function allAlibiDetailsKnown(caseKey, suspectId, state = gameState) {
  const subject = state.caseData?.alibiCases?.[caseKey]?.suspects?.find(s => s.suspectId === suspectId);
  return subject?.witnesses?.length === 3 && subject.witnesses.every(w => getAlibiKnowledge(caseKey, w.npcId, state).details);
}
