import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    description: __dialogueText("managers/PostalCaseSupport.js", "t_dce73df4168457da66ea"), metadata: {settlementId: CASE + ':reward:v1'}});
  new ScoreManager().addScoreEvent(100, __dialogueText("managers/PostalCaseSupport.js", "t_dce73df4168457da66ea"), {applyMultiplier: false});
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
  if (r.stage === 'new') return {view: 'room', id: 'postman', text: __dialogueText("managers/PostalCaseSupport.js", "t_118798b1e0cb70312a97")};
  if (r.stage === 'investigating') {
    for (const id of ['envelope', 'card', 'notice']) {
      if (r.clues.includes(id)) continue;
      const doc = POSTAL_DOCUMENTS[id];
      const spot = doc.spots.find(p => !(s.evidenceViews?.[id] || []).includes(p.id));
      return {view: 'document', documentId: id, id: spot?.id,
        text: `${__dialogueText("managers/PostalCaseSupport.js", "t_137aaa51a676ee7ed407")}${spot?.label || __dialogueText("managers/PostalCaseSupport.js", "t_854ed679cbbc28e29248")}${__dialogueText("managers/PostalCaseSupport.js", "t_0f580db40fe255332f11")}${doc.title}${__dialogueText("managers/PostalCaseSupport.js", "t_cdb4ee2aea69cc6a8333")}`};
    }
    return {view: 'room', id: 'postman', text: __dialogueText("managers/PostalCaseSupport.js", "t_d0a3b473ee60c7418194")};
  }
  if (r.stage === 'identified') return {view: 'restante', id: 'writing', text: __dialogueText("managers/PostalCaseSupport.js", "t_64f193f9b9e717b9d3a3")};
  if (r.stage === 'waiting') {
    if (s.visits <= (s.restante.clockwork?.leftVisit ?? s.visits)) return {view: 'room', text: __dialogueText("managers/PostalCaseSupport.js", "t_ef68dcfb3cd5f0540ee8")};
    return {view: 'restante', id: 'clockwork', text: __dialogueText("managers/PostalCaseSupport.js", "t_e5c4a6f6ca60abf97556")};
  }
  if (r.stage === 'reply') return {view: 'document', documentId: 'reply', id: 'message', text: __dialogueText("managers/PostalCaseSupport.js", "t_a89d8112418d3f5ae692")};
  return null;
}
export function postalHintUsed(method) {
  return hintManager.getHistory(CASE).some(e => e.sceneId === 'PostOfficeScene' && e.method === method);
}
export function usePostalHint(method) {
  const target = nextPostalHint();
  if (!target) return {success: false, text: __dialogueText("managers/PostalCaseSupport.js", "t_3f993e19cb8d49a65b0f")};
  if (!['free_hint', 'squad_help', 'cut_corners'].includes(method)) return {success: false, text: __dialogueText("managers/PostalCaseSupport.js", "t_b1859155e67639e3020b")};
  if (method !== 'free_hint' && postalHintUsed(method)) return {success: false, text: __dialogueText("managers/PostalCaseSupport.js", "t_98cd64ba9f557c8e268a")};
  const context = {caseId: CASE, missionId: CASE, sceneId: 'PostOfficeScene', itemId: target.documentId || target.id || 'next_step'};
  const result = method === 'free_hint' ? hintManager.useFreeHint(context)
    : hintManager.recordPaidHint(method, context, {energy: 0, minutes: 0, cash: 0});
  return result.success ? {...result, target, text: target.text}
    : {...result, text: __dialogueText("managers/PostalCaseSupport.js", "t_215f35ba21eaf7119b23")};
}

import {isDeadMailPreviewEnabled,getDeadMailProgress,DEAD_MAIL_PREVIEW_CASE} from './DeadMailManager.js';
import {registerPICase,addPIEvidence} from './PIInvestigationManager.js';
export function canDiscussPostalDeadMail(){return isDeadMailPreviewEnabled();}
export function discussPostalDeadMail(id){
  if(!canDiscussPostalDeadMail())return __dialogueText("managers/PostalCaseSupport.js", "t_f4ef461477f5684ab95b");
  const p=getDeadMailProgress();
  if(p.clues.length<3)return __dialogueText("managers/PostalCaseSupport.js", "t_817159e2d01f086e1224");
  const entries={
    photo:[__dialogueText("managers/PostalCaseSupport.js", "t_e2f10087eb02afc209ad"),__dialogueText("managers/PostalCaseSupport.js", "t_9e14d9af9285f5ff0a62")],
    route:[__dialogueText("managers/PostalCaseSupport.js", "t_930da03b7edef6bc653a"),__dialogueText("managers/PostalCaseSupport.js", "t_ad32a42a873a7f43d64e")],
    gate:[__dialogueText("managers/PostalCaseSupport.js", "t_198eb291f96bc0da57e7"),__dialogueText("managers/PostalCaseSupport.js", "t_9fe9969d0812f23760d2")]
  };
  if(!entries[id])return __dialogueText("managers/PostalCaseSupport.js", "t_520e101ebba574e430c1");
  const [label,text]=entries[id];
  registerPICase({id:DEAD_MAIL_PREVIEW_CASE,kind:'side',requiresBoard:true,title:__dialogueText("managers/PostalCaseSupport.js", "t_16abdc3e0b396e03e229")});
  addPIEvidence(DEAD_MAIL_PREVIEW_CASE,{id:'postal-dead-'+id,label,text,metaText:__dialogueText("managers/PostalCaseSupport.js", "t_bf90c07b7526b278c9c8"),color:'blue',pinned:true});
  const s=Postal.postalState();if(!s.dead.includes(id)){gameState.postOffice={...s,dead:[...s.dead,id]};requestAutosave();}
  return text;
}
