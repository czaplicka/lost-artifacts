// Compatibility entry point. Existing scene imports remain valid.
export { COOPERATION_LABELS, APPROACHES, RECOVERY_APPROACHES, CHALLENGES } from './cooperation/AlibiCooperationConfig.js';
export { getRapport } from './cooperation/AlibiCooperationRuntime.js';
export { getCooperationState, getWitnessPersonality } from './cooperation/AlibiCooperationState.js';
export { getInterviewView } from './cooperation/AlibiInterviewView.js';
export { applyApproach, repairCooperation } from './cooperation/AlibiApproaches.js';
export { askWitness } from './cooperation/AlibiQuestions.js';
export { challengeWitness, followUpChallenge } from './cooperation/AlibiChallenges.js';
export { getEvidenceOptions, EVIDENCE_REASONS } from './cooperation/AlibiEvidence.js';
