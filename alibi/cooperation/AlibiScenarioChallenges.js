export const FALSE_ALIBI_RULES = Object.freeze({
  0: { topic: 'host', reason: 'place' },
  1: { topic: 'room', reason: 'place' },
  2: { topic: 'departure', reason: 'time' },
  3: { topic: 'arrival', reason: 'time' },
  4: { topic: 'date', reason: 'time' },
  5: { topic: 'duration', reason: 'time' },
  6: { topic: 'arrival', reason: 'attendance' },
  7: { topic: 'host', reason: 'identity' },
  8: { topic: 'date', reason: 'time' },
  9: { topic: 'room', reason: 'place' },
  10: { topic: 'host', reason: 'identity' },
  11: { topic: 'departure', reason: 'time' }
});
export function getFalseAlibiPattern(subject) {
  const match = String(subject?.scenarioId || '').match(/^personal_.+_false_(0|[1-9]|10|11)$/);
  return match ? Number(match[1]) : null;
}
export function getScenarioRule(subject) {
  const pattern = getFalseAlibiPattern(subject);
  return pattern === null ? null : FALSE_ALIBI_RULES[pattern];
}
export function isRelevantChallenge(subject, witness, topic) {
  return witness?.isLiar === true && getScenarioRule(subject)?.topic === topic;
}
export function migrateScenarioChallenges(state, subject, witness) {
  if (state.evidenceRulesVersion === 1) return false;
  if (!state.revisedStatement) {
    // A pre-update, unfinished confrontation must be supported with evidence again.
    state.pendingChallenge = null;
    state.activeEvidence = null;
    for (const thread of Object.values(state.confrontations || {})) {
      thread.resolved = false;
      thread.stage = 0;
    }
  }
  state.evidenceRulesVersion = 1;
  state.challengeRulesVersion = 1;
  return true;
}
