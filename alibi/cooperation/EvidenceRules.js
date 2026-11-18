export const EVIDENCE_RULE_VERSION = 1;
export const CONTRADICTION_TYPES = Object.freeze([
 {id:'time', label:'Time / date'},
 {id:'place', label:'Place / physical presence'},
 {id:'person', label:'Person / identity'},
 {id:'basis', label:'Basis of the claim'}
]);
// Hand-authored links for the existing personal-alibi generator. No keyword guessing.
export const RULES = Object.freeze([
 {topic:'host', targets:[0,1], types:['place']},
 {topic:'room', targets:[0], types:['place']},
 {topic:'departure', targets:[0,1], types:['time'], sources:{1:[1]}},
 {topic:'arrival', targets:[0], types:['time']},
 {topic:'date', targets:[1], types:['time']},
 {topic:'duration', targets:[0], types:['time']},
 {topic:'arrival', targets:[0,1], types:['basis','place']},
 {topic:'host', targets:[0,1], types:['person','basis'], sources:{0:[2]}},
 {topic:'date', targets:[1], types:['time','basis']},
 {topic:'room', targets:[0,1], types:['place','basis']},
 {topic:'host', targets:[0,1], types:['person','basis'], sources:{0:[2]}},
 {topic:'departure', targets:[0,1], types:['time','basis']}
]);
export function falsePattern(subject) {
 const m=String(subject?.scenarioId||'').match(/^personal_.+_false_(0|[1-9]|10|11)$/);
 return m ? Number(m[1]) : null;
}
export function migrateEvidenceChallenges(state, subject, witness) {
 if(state.evidenceRulesVersion===EVIDENCE_RULE_VERSION) return false;
 // Keep previous corrections. Unproven old threads need a pair of recorded statements now.
 for(const thread of Object.values(state.confrontations||{})) {
  if(!thread || thread.evidenceProof?.version===EVIDENCE_RULE_VERSION) continue;
  if(!state.revisedStatement) { thread.resolved=false; thread.stage=0; }
 }
 if(state.pendingChallenge && !state.confrontations?.[state.pendingChallenge]?.evidenceProof) state.pendingChallenge=null;
 state.evidenceRulesVersion=EVIDENCE_RULE_VERSION;
 return true;
}
