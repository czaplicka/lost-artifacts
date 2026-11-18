import { getAlibiKnowledge } from '../AlibiKnowledge.js';
import { findData } from './AlibiCooperationRuntime.js';
import { getScenarioRule, getFalseAlibiPattern } from './AlibiScenarioChallenges.js';

export const EVIDENCE_REASONS = Object.freeze([
  { id: 'time', label: 'Time or date' },
  { id: 'place', label: 'Physical location' },
  { id: 'identity', label: 'Which person was there' },
  { id: 'attendance', label: 'A record is not proof of attendance' }
]);

function record(caseKey, witness) {
  if (!getAlibiKnowledge(caseKey, witness.npcId).details) return null;
  const quote = String(witness.statement || '').trim();
  return quote ? { id: witness.npcId, name: witness.role || 'Witness', quote } : null;
}

// Public records contain only statements already obtained by the player.
export function getEvidenceOptions(caseKey, encounterId) {
  const { subject, witness } = findData(caseKey, encounterId);
  return {
    statement: record(caseKey, witness),
    evidence: subject.witnesses.filter(w => w.npcId !== witness.npcId)
      .map(w => record(caseKey, w)).filter(Boolean),
    reasons: EVIDENCE_REASONS.map(r => ({ ...r }))
  };
}

export function checkEvidence(caseKey, encounterId, selection) {
  const { subject, witness } = findData(caseKey, encounterId);
  const options = getEvidenceOptions(caseKey, encounterId);
  if (!selection || typeof selection !== 'object') return null;
  const target = options.statement;
  const evidence = options.evidence.find(e => e.id === selection.evidenceId);
  const reason = EVIDENCE_REASONS.find(r => r.id === selection.reason);
  if (!target || target.id !== selection.statementId || !evidence || !reason) return null;
  const rule = getScenarioRule(subject);
  // Both other accounts independently corroborate these authored scenarios.
  const supported = witness.isLiar === true && !!rule && rule.reason === reason.id;
  return { supported, topic: rule?.topic || 'duration', reason: reason.id,
    pattern: getFalseAlibiPattern(subject), statement: target, evidence };
}

export function evidenceStillValid(caseKey, encounterId, bundle) {
  if (!bundle) return false;
  const result = checkEvidence(caseKey, encounterId, {
    statementId: bundle.statement.id, evidenceId: bundle.evidence.id, reason: bundle.reason
  });
  return !!result?.supported && result.topic === bundle.topic &&
    result.statement.quote === bundle.statement.quote && result.evidence.quote === bundle.evidence.quote;
}

export const RETRACTION_DETAILS = Object.freeze({
  0: 'I cannot claim they were at my apartment with me.',
  1: 'I cannot claim we were inside that room together.',
  2: 'I withdraw my claim that they stayed without leaving through that period.',
  3: 'I cannot claim they had already arrived before the theft.',
  4: 'I used the wrong day. That attendance slip does not establish a meeting on the theft day.',
  5: 'The visit ended earlier than I claimed. It does not cover the theft.',
  6: 'A booking was not proof they attended. I cannot place them there in person.',
  7: 'The access-card record was not proof its owner entered. It was used by someone else.',
  8: 'That was a recording from the previous day, not a live feed of the theft day.',
  9: 'We spoke by telephone, not face to face. I cannot claim they were physically in the room.',
  10: 'The name on the receipt did not identify the customer who paid in person.',
  11: 'The finish time on that copy had been changed. I cannot use it to claim they stayed that late.'
});
