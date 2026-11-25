import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import {moneyManager,ECONOMY_CATEGORY} from './MoneyManager.js';
import {progressionManager} from './ProgressionManager.js';
export const OPEN_SKIES_CASH_REWARD=200;
export const OPEN_SKIES_XP_REWARD_ID='pi_case_medium';
const CASE='pi_open_skies',ID='pi_open_skies:located:reward:v1';
const XP_EVENT=JSON.stringify(['reward',OPEN_SKIES_XP_REWARD_ID,CASE]);
let busy=false;
const clone=x=>JSON.parse(JSON.stringify(x));
const quest=()=>gameState.piQuests?.quests?.[CASE];
const resolution=()=>quest()?.metadata?.openSkies?.resolution;
function eligible(){const q=quest(),r=resolution();return q?.metadata?.contentId==='open_skies'&&r?.version===1&&r.location?.town==='Collioure'&&r.location?.landmark==='Notre-Dame-des-Anges'&&['active','completed'].includes(q.status);}
function payment(){return (gameState.moneyLog||[]).find(t=>t.type==='income'&&t.source==='cash'&&t.missionId===CASE&&t.metadata?.piSettlementId===ID);}
function save(){try{requestAutosave();}catch(e){console.error('[OpenSkiesReward] Autosave request failed:',e);}}
function put(settlement,completed=false){
 const root=gameState.piQuests,q=quest(),r=resolution();
 const next={...q,reward:OPEN_SKIES_CASH_REWARD,metadata:{...q.metadata,openSkies:{...q.metadata.openSkies,resolution:{...r,
  phase:completed?'completed':'settling',reward:OPEN_SKIES_CASH_REWARD,xp:settlement.xpGranted??r.xp??0,settlement}}}};
 if(completed){next.status='completed';next.completedAt=q.completedAt||new Date().toISOString();next.completedGameDate=r.completedGameDate;
  next.objectives=(q.objectives||[]).map(o=>['collect_package','locate_president','submit_location'].includes(o.id)?{...o,completed:true}:o);
  next.resolution={...q.resolution,endingId:'located_collioure',summary:r.summary,reward:OPEN_SKIES_CASH_REWARD,paid:true,settlementId:ID,
   actualCashPaid:settlement.actualCashPaid,xp:{eventId:XP_EVENT,rewardId:OPEN_SKIES_XP_REWARD_ID,scopeId:CASE,applied:true,granted:settlement.xpGranted}};
 }
 gameState.piQuests={...root,quests:{...root.quests,[CASE]:next}};save();
}
export function getOpenSkiesRewardStatus(){
 const s=resolution()?.settlement;
 return {eligible:eligible(),phase:s?.phase||'ready',cashBase:OPEN_SKIES_CASH_REWARD,xpBase:100,
  cashPaid:s?.cashPaid===true,xpApplied:s?.xpApplied===true,actualCashPaid:s?.actualCashPaid??null,xpGranted:s?.xpGranted??null,
  cashUncertain:s?.cashUncertain===true,lastError:s?.lastError||null};
}
function xpAmount(){const h=gameState.progressionState?.history;return Array.isArray(h)?h.find(x=>x.eventId===XP_EVENT)?.amount??null:null;}
export function settleOpenSkiesReward(){
 if(busy)return {ok:false,message:'Reward settlement is already in progress.'};
 if(!eligible())return {ok:false,message:'A supported location report must be accepted first.'};
 const prior=resolution().settlement;
 if(prior&&prior.version!==1)return {ok:false,message:'Unsupported reward settlement version. No reward was issued.'};
 if(prior?.phase==='completed')return {ok:true,alreadySettled:true,message:'Reward already received. No additional payment or XP was granted.'};
 if(![0,OPEN_SKIES_CASH_REWARD].includes(quest().reward))return {ok:false,message:'Contract amount differs from the approved $200. No settlement was started.'};
 busy=true;
 let s=prior?clone(prior):{version:1,id:ID,phase:'settling',cashBase:OPEN_SKIES_CASH_REWARD,xpRewardId:OPEN_SKIES_XP_REWARD_ID,
  cashPaid:false,xpApplied:false,actualCashPaid:null,xpGranted:null,cashUncertain:false,lastError:null};
 try{
  if(s.id!==ID)throw new Error('Unexpected settlement identity.');
  s.phase='settling';s.lastError=null;put(s);
  let transaction=payment();
  if(transaction){s.cashPaid=true;s.cashUncertain=false;s.actualCashPaid=transaction.amount;put(s);}
  if(!s.cashPaid){
   if(s.cashUncertain)throw new Error('A previous cash change has no matching transaction. Automatic retry is blocked to prevent duplicate payment.');
   const before=moneyManager.getState();
   try{moneyManager.addCash(OPEN_SKIES_CASH_REWARD,{category:ECONOMY_CATEGORY.SIDE_CASE,description:'Open Skies — location report',missionId:CASE,
    metadata:{questId:CASE,piJobCompletion:true,piSettlementId:ID,openSkiesSettlementId:ID}});}
   catch(e){transaction=payment();if(!transaction){
     s.cashUncertain=gameState.cash!==before.cash;put(s);throw e;
    }console.error('[OpenSkiesReward] Payment notification failed after recorded payment:',e);
   }
   transaction=payment();
   if(!transaction){s.cashUncertain=true;put(s);throw new Error('Payment returned without an identifiable transaction.');}
   s.cashPaid=true;s.actualCashPaid=transaction.amount;s.cashUncertain=false;put(s);
  }
  if(progressionManager.hasReward(XP_EVENT)){s.xpApplied=true;s.xpGranted=xpAmount()??s.xpGranted;put(s);}
  else{
   if(s.xpApplied)throw new Error('Recorded XP marker is missing from progression state; automatic re-award is blocked.');
   let result;
   try{result=progressionManager.grantReward(OPEN_SKIES_XP_REWARD_ID,CASE,'Open Skies — location report');}
   catch(e){if(!progressionManager.hasReward(XP_EVENT))throw e;console.error('[OpenSkiesReward] XP notification failed after recorded award:',e);}
   if(!progressionManager.hasReward(XP_EVENT))throw new Error(`XP award was not recorded: ${result?.reason||'unknown error'}.`);
   s.xpApplied=true;s.xpGranted=xpAmount()??result?.grantedXP??s.xpGranted;put(s);
  }
  s.phase='completed';s.lastError=null;put(s,true);
  return {ok:true,cashPaid:s.actualCashPaid,xpGranted:s.xpGranted,message:`Reward received: $${s.actualCashPaid??OPEN_SKIES_CASH_REWARD}; ${s.xpGranted===null?'XP already recorded':s.xpGranted+' XP'}.`};
 }catch(e){
  s.lastError=e.message||String(e);put(s);console.error('[OpenSkiesReward] Settlement paused:',e);
  return {ok:false,message:s.cashUncertain?'Payment needs recovery: its transaction could not be verified. Automatic repayment is blocked.':'Reward settlement was interrupted. Retry from the report; recorded rewards will not be issued twice.'};
 }finally{busy=false;}
}
