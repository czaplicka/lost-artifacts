import { gameState } from '../GameData.js';

// Alibi save data consists of plain records, arrays and primitive values.
export function cloneAlibiData(value) {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  const seen = new WeakMap();
  const copy = item => {
    if (item === null || typeof item !== 'object') {
      if (typeof item === 'function' || typeof item === 'symbol') throw new TypeError('Unsupported alibi save value.');
      return item;
    }
    if (seen.has(item)) return seen.get(item);
    const proto = Object.getPrototypeOf(item);
    if (!Array.isArray(item) && proto !== Object.prototype && proto !== null) {
      throw new TypeError('Alibi save data must contain plain records and arrays.');
    }
    const next = Array.isArray(item) ? new Array(item.length) : Object.create(proto);
    seen.set(item, next);
    for (const key of Object.keys(item)) Object.defineProperty(next, key, {
      value: copy(item[key]), configurable: true, enumerable: true, writable: true
    });
    return next;
  };
  return copy(value);
}
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
  if (getAlibiKnowledge(caseKey, witness.npcId, state).details) return cloneAlibiData(card);
  return { id: card.id, role: card.role || witness.role || 'Witness', roleId: card.roleId || witness.roleId,
    label: ALIBI_MISSING_DETAIL, minute: null, detailsLocked: true };
}
export function allAlibiDetailsKnown(caseKey, suspectId, state = gameState) {
  const subject = state.caseData?.alibiCases?.[caseKey]?.suspects?.find(s => s.suspectId === suspectId);
  return subject?.witnesses?.length === 3 && subject.witnesses.every(w => getAlibiKnowledge(caseKey, w.npcId, state).details);
}
