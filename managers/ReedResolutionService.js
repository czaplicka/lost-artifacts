import { gameState } from '../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from './MoneyManager.js';
import { requestAutosave, saveGameState } from '../gameStatePersistence.js';
import { getGameTimeManager } from './GameTimeManager.js';
import { applyReputationEvent, getReputation } from './ReputationManager.js';

let busy=false;
const clone=v=>JSON.parse(JSON.stringify(v));
const KEY='reedResolution';
const INTEGRITY_RULES=Object.freeze({truth:'honest_pi_report',withhold:'concealed_pi_findings'});
export function getReedResolution(){return gameState[KEY]||null;}
export function validateReedFinale(c){
  if(c?.version!==1||c.questId!=='pi_two_glasses'||c.searchCaseId!=='miramar_demo'||!Array.isArray(c.endings)||!c.endings.length||!Array.isArray(c.requiredFlags)||!Array.isArray(c.requiredObjectives))throw Error('Invalid Reed finale');
  const ids=new Set();
  for(const e of c.endings){
    if(!/^[a-z0-9_-]+$/.test(e.id)||ids.has(e.id)||!['label','title','report','reply','replySubject','summary'].every(k=>typeof e[k]==='string'&&e[k].length))throw Error('Invalid Reed ending');
    if(!INTEGRITY_RULES[e.id]||(e.reputationEvent!==undefined&&e.reputationEvent!==INTEGRITY_RULES[e.id]))throw Error('Invalid Reed integrity event');
    ids.add(e.id);
  }return c;
}
export function canPrepareReedReport(c){
  const q=gameState.piQuests?.quests?.[c.questId],r=getReedResolution();
  if(r?.phase==='completed')return false;
  if(r?.phase==='settling')return Boolean(q);
  if(q?.status!=='active'||gameState.reedContact?.status!=='completed')return false;
  const flags=gameState.piPhoneInvestigations?.cases?.[c.searchCaseId]?.flags||[];
  return c.requiredFlags.every(f=>flags.includes(f))&&c.requiredObjectives.every(id=>q.objectives?.some(o=>o.id===id&&o.completed));
}
function hasSettlementPayment(id){return (gameState.moneyLog||[]).some(t=>t.type==='income'&&t.source==='cash'&&t.metadata?.reedSettlementId===id);}
// Also migrates an already-completed report from the previous package, exactly once.
export function syncReedReportIntegrity(){
  const r=getReedResolution();
  if(!r||!r.settlementId||r.paid!==true||!['settling','completed'].includes(r.phase)||!INTEGRITY_RULES[r.endingId])return {applied:false,reason:'not_ready'};
  const type=INTEGRITY_RULES[r.endingId],eventId=`${r.settlementId}:integrity`;
  if(r.integrity?.eventId===eventId&&getReputation().appliedEventIds.includes(eventId))return {applied:false,reason:'already_applied'};
  const before=getReputation();
  let result;
  try{result=applyReputationEvent(type,{eventId,headline:null,context:{questId:r.questId,endingId:r.endingId,settlementId:r.settlementId}});}
  catch(error){
    // A HUD listener may throw after the manager has already committed its state.
    if(!getReputation().appliedEventIds.includes(eventId))throw error;
    console.error('[ReedResolutionService] Reputation notification failed:',error);
    result={applied:true,state:getReputation()};
  }
  const current=getReedResolution();
  gameState[KEY]={...current,integrity:{eventId,type,applied:true,
    actualDelta:result.applied?getReputation().integrity-before.integrity:(current.integrity?.actualDelta??null)}};
  requestAutosave();return result;
}
export function finishReedReport(c,endingId){
  if(busy)return {ok:false,message:'The report is being processed.'};
  validateReedFinale(c);
  const q=gameState.piQuests?.quests?.[c.questId],existing=getReedResolution();
  if(existing?.phase==='completed'||(q?.status==='completed'&&existing?.phase!=='settling')){
    syncReedReportIntegrity();return {ok:false,message:'This case has already been closed.'};
  }
  if(!q||!canPrepareReedReport(c))return {ok:false,message:'The investigation is not ready to close.'};
  const ending=c.endings.find(e=>e.id===endingId);
  if(!ending)return {ok:false,message:'Choose a valid report.'};
  if(existing?.phase==='settling'&&existing.endingId!==endingId)return {ok:false,message:'The selected report is already being settled.'};
  const reward=existing?.phase==='settling'?existing.reward:q.reward;
  if(!Number.isInteger(reward)||reward<0)return {ok:false,message:'The contract fee is invalid.'};
  busy=true;
  try{
    const now=getGameTimeManager().getState();
    const pending=existing?.phase==='settling'?clone(existing):{version:1,phase:'settling',questId:c.questId,endingId,
      settlementId:`${c.questId}:${q.acceptedAt||'legacy-contract'}`,reward,paid:false,
      report:ending.report,response:ending.reply,responseSubject:ending.replySubject,summary:ending.summary,
      consequences:clone(ending.consequences||{}),gameTime:clone(now)};
    gameState[KEY]=pending;
    if(!pending.paid&&!hasSettlementPayment(pending.settlementId)&&reward>0){
      const before=moneyManager.getState();
      try{moneyManager.addCash(reward,{category:ECONOMY_CATEGORY.SIDE_CASE,description:'PI case completed: Two Glasses',missionId:c.questId,
        metadata:{reedSettlementId:pending.settlementId,questId:c.questId,endingId}});}
      catch(error){
        gameState.cash=before.cash;gameState.moneyLog=clone(before.moneyLog);gameState[KEY]={...pending,lastError:'Payment could not be completed.'};requestAutosave();
        console.error('[ReedResolutionService] Payment failed:',error);return {ok:false,message:'Payment failed. The report can be processed again.'};
      }
    }
    gameState[KEY]={...pending,paid:true};
    try{syncReedReportIntegrity();}
    catch(error){
      console.error('[ReedResolutionService] Integrity could not be settled:',error);requestAutosave();
      return {ok:false,message:'Payment recorded. Finish settlement again to record integrity; payment will not repeat.'};
    }
    const paid=getReedResolution(),current=gameState.piQuests.quests[c.questId];
    gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[c.questId]:{
      ...current,status:'completed',objectives:current.objectives.map(o=>o.id==='report_findings'?{...o,completed:true}:o),
      resolution:{endingId,summary:paid.summary,consequences:clone(paid.consequences),reward,paid:true,settlementId:paid.settlementId,integrity:clone(paid.integrity)},completedAt:new Date().toISOString()
    }}};
    const investigations=gameState.piInvestigations,investigation=investigations?.cases?.[c.questId];
    if(investigation){
      const board=clone(investigation.board),note={id:'reed_final_report',type:'note',label:'Final report',text:paid.report,
        metaText:`Case closed — ${ending.title}`,color:'yellow',x:120,y:380,discovered:true,createdByPlayer:false,editableByPlayer:false};
      board.items=[...(board.items||[]).filter(i=>i.id!==note.id),note];
      gameState.piInvestigations={...investigations,cases:{...investigations.cases,[c.questId]:{...investigation,status:'completed',resolution:clone(paid.consequences),board}}};
    }
    if(gameState.reedContact)gameState.reedContact={...gameState.reedContact,status:'completed',caseClosed:true,nextAttemptAt:null};
    gameState[KEY]={...paid,phase:'completed',completedGameTime:clone(now)};requestAutosave();
    let saved=false;try{saved=saveGameState()===true;}catch(error){console.error('[ReedResolutionService] Save failed:',error);}
    return {ok:true,saved,reward,message:saved?`Case closed. Contract fee: $${reward}.`:'Case closed, but saving failed. Save your game before leaving.'};
  }finally{busy=false;}
}
