import { requestAutosave } from '../../gameStatePersistence.js';
import { getCooperationState } from './State.js';
import { getInterviewView } from './View.js';
import { addEntry, spendMinutes } from './Runtime.js';
import { getEvidenceCatalog, validateEvidenceSelection } from './EvidenceModel.js';
import { CONTRADICTION_TYPES } from './EvidenceRules.js';
import { challengeWitness as beginThread, followUpChallenge as continueThread } from './Challenges.js';

export function challengeWitness(caseKey,encounterId,selection) {
 const view=getInterviewView(caseKey,encounterId),state=view.state;
 if(!view.canChallenge||state.pendingChallenge||state.revisedStatement)return null;
 if(typeof selection==='string')selection=state.confrontations?.[selection]?.evidenceProof;
 if(!selection||typeof selection!=='object')return null;
 const result=validateEvidenceSelection(caseKey,encounterId,selection);
 if(!result.valid) {
  const {claims,evidence}=getEvidenceCatalog(caseKey,encounterId);
  const target=claims.find(c=>c.id===selection.targetId),source=evidence.find(c=>c.id===selection.evidenceId);
  if(!target||!source||!CONTRADICTION_TYPES.some(t=>t.id===selection.type))return null;
  spendMinutes(5);
  return addEntry(state,`evidence:rejected:${state.transcript.length}`,
   `I dispute: "${target.text}"\nCompared with ${source.role}: "${source.text}"\nIssue: ${CONTRADICTION_TYPES.find(t=>t.id===selection.type).label}.`,
   'That comparison does not establish the contradiction you are claiming.',
   '5 minutes spent. No correction recorded. Cooperation unchanged.');
 }
 const existing=state.confrontations?.[result.topic];
 const previous=existing?.evidenceProof;
 if(existing&&(!previous || previous.targetId!==result.proof.targetId ||
    previous.evidenceId!==result.proof.evidenceId || previous.type!==result.proof.type)) {
  existing.stage=0;existing.resolved=false;
 }
 const entry=beginThread(caseKey,encounterId,result.topic);
 if(!entry)return null;
 state.confrontations[result.topic].evidenceProof=result.proof;
 entry.detective=`I dispute: "${result.proof.targetText}"\nCompared with ${result.proof.evidenceRole}: "${result.proof.evidenceText}"\nIssue: ${CONTRADICTION_TYPES.find(t=>t.id===result.proof.type).label}.`;
 entry.note='The comparison is on record. Read the witness response before choosing your follow-up.';
 requestAutosave();
 return entry;
}
export function followUpChallenge(caseKey,encounterId,mode) {
 const state=getCooperationState(caseKey,encounterId),topic=state.pendingChallenge;
 if(!topic)return null;
 const proof=state.confrontations?.[topic]?.evidenceProof;
 if(state.level<2||!validateEvidenceSelection(caseKey,encounterId,proof).valid) {
  state.pendingChallenge=null;
  return addEntry(state,`evidence:unavailable:${state.transcript.length}`,'Let us stop this comparison.',
   'We need enough cooperation and the recorded accounts before continuing.',
   'Comparison paused. No correction recorded; no time charged.');
 }
 return continueThread(caseKey,encounterId,mode);
}
