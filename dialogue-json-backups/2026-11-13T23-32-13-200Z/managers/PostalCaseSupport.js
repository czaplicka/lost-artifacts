import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { hintManager } from './HintManager.js';
import { moneyManager } from './MoneyManager.js';
import { getReputation, REPUTATION_CHANGED } from './ReputationManager.js';
import { ScoreManager } from './ScoreManager.js';
import { ACHIEVEMENTS, checkAndAwardAchievements } from './AchievementManager.js';
import * as Postal from './PostOfficeManager.js';
import { POSTAL_DOCUMENTS } from '../config/postOfficeEvidenceConfig.js';

const CASE = Postal.RETURN_CASE;
export function installPostalAchievement() { return ACHIEVEMENTS.postal_delivered_eventually; }
function integrityOnce(id, delta) {
  const before = getReputation();
  if (before.appliedEventIds.includes(id)) return;
  const after = {...before, integrity: Math.max(-100, Math.min(100, before.integrity + delta)),
    appliedEventIds: [...before.appliedEventIds, id]};
  gameState.reputationState = after;
  EventBus.emit(REPUTATION_CHANGED, {type: 'postal_privacy', eventId: id, before, after,
    context: {caseId: CASE, sceneId: 'PostOfficeScene', moralDelta: delta}});
}
export function settlePostalCase() {
  installPostalAchievement();
  const s = Postal.postalState(), r = s.returnCase;
  if (r.stage !== 'completed') return false;
  // This persistent side-case receipt survives resets of the agency score ledger.
  if (r.rewardVersion === 1) { checkAndAwardAchievements(); return false; }
  gameState.postOffice = {...s, returnCase: {...r, rewardVersion: 1,
    rewardCash: 80, rewardPoints: 100, rewardAt: new Date().toISOString()}};
  moneyManager.addCash(80, {category: 'side_case', missionId: CASE,
    description: 'Return to Sender completed', metadata: {settlementId: CASE + ':reward:v1'}});
  new ScoreManager().addScoreEvent(100, 'Return to Sender completed', {applyMultiplier: false});
  integrityOnce(CASE + ':privacy:v1', r.ending === 'private' ? 2 : -2);
  checkAndAwardAchievements();
  requestAutosave();
  return true;
}
export function finishPostalCase(choice) {
  const message = Postal.completeReturnCase(choice);
  settlePostalCase();
  return message;
}
export function nextPostalHint() {
  const s = Postal.postalState(), r = s.returnCase;
  if (r.stage === 'new') return {view: 'room', id: 'postman', text: 'Speak to the postman about the returning letter and accept the case.'};
  if (r.stage === 'investigating') {
    for (const id of ['envelope', 'card', 'notice']) {
      if (r.clues.includes(id)) continue;
      const doc = POSTAL_DOCUMENTS[id];
      const spot = doc.spots.find(p => !(s.evidenceViews?.[id] || []).includes(p.id));
      return {view: 'document', documentId: id, id: spot?.id,
        text: `Inspect ${spot?.label || 'the remaining details'} on ${doc.title}.`};
    }
    return {view: 'room', id: 'postman', text: 'Compare the names on the public notice with the original recipient. Tell the postman who the letter belongs to.'};
  }
  if (r.stage === 'identified') return {view: 'restante', id: 'writing', text: 'Leave a message for CLOCKWORK at the writing desk. Think of the hand of a clock that counts seconds.'};
  if (r.stage === 'waiting') {
    if (s.visits <= (s.restante.clockwork?.leftVisit ?? s.visits)) return {view: 'room', text: 'Leave the post office and return. The reply arrives on your next visit.'};
    return {view: 'restante', id: 'clockwork', text: 'Check the CLOCKWORK collection slot for a reply.'};
  }
  if (r.stage === 'reply') return {view: 'document', documentId: 'reply', id: 'message', text: 'Read Ellis’s reply, then speak to the postman to decide what to tell the sender.'};
  return null;
}
export function postalHintUsed(method) {
  return hintManager.getHistory(CASE).some(e => e.sceneId === 'PostOfficeScene' && e.method === method);
}
export function usePostalHint(method) {
  const target = nextPostalHint();
  if (!target) return {success: false, text: 'This case is already closed.'};
  if (!['free_hint', 'squad_help', 'cut_corners'].includes(method)) return {success: false, text: 'Unknown hint method.'};
  if (method !== 'free_hint' && postalHintUsed(method)) return {success: false, text: 'This method has already been used for this case.'};
  const context = {caseId: CASE, missionId: CASE, sceneId: 'PostOfficeScene', itemId: target.documentId || target.id || 'next_step'};
  const result = method === 'free_hint' ? hintManager.useFreeHint(context)
    : hintManager.recordPaidHint(method, context, {energy: 0, minutes: 0, cash: 0});
  return result.success ? {...result, target, text: target.text}
    : {...result, text: 'No free hints available.'};
}

import {isDeadMailPreviewEnabled,getDeadMailProgress,DEAD_MAIL_PREVIEW_CASE} from './DeadMailManager.js';
import {registerPICase,addPIEvidence} from './PIInvestigationManager.js';
export function canDiscussPostalDeadMail(){return isDeadMailPreviewEnabled();}
export function discussPostalDeadMail(id){
  if(!canDiscussPostalDeadMail())return 'Bring me a case to discuss first.';
  const p=getDeadMailProgress();
  if(p.clues.length<3)return 'Inspect Florence’s delivery photograph and collect its three details first. I cannot identify a delivery from a description of a feeling.';
  const entries={
    photo:['Courier label','The delivery label in Florence’s photograph belongs to a private courier, not the town postal service. The local post office cannot authenticate that courier’s delivery status.'],
    route:['Not the postal round','The postman says he did not deliver the photographed parcel. His route does not include private-courier deliveries. This does not identify who did deliver it.'],
    gate:['An instruction, not a signature','SERVICE GATE B is a delivery instruction, not the name or signature of a recipient. A photograph of a parcel at a location does not establish who collected it.']
  };
  if(!entries[id])return 'Which delivery are we discussing?';
  const [label,text]=entries[id];
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:'Dead Mail'});
  addPIEvidence(DEAD_MAIL_PREVIEW_CASE,{id:'postal-dead-'+id,label,text,metaText:'Post Office',color:'blue',pinned:true});
  const s=Postal.postalState();if(!s.dead.includes(id)){gameState.postOffice={...s,dead:[...s.dead,id]};requestAutosave();}
  return text;
}
