import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { hintManager } from '../../managers/HintManager.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { getQuestHint } from './QuestHintSystem.js';

const RECEIPTS_KEY='piQuestHintReceipts';
const COSTS={cut_corners:{energy:5,minutes:10},squad_help:{energy:10,minutes:30}};
const receiptKey=(questId,stage,level)=>JSON.stringify([questId,stage,level]);
const getReceipt=(questId,stage,level)=>gameState[RECEIPTS_KEY]?.[receiptKey(questId,stage,level)]||null;
function displayReceipt(receipt){
 if(!receipt)return null;
 const current=getQuestHint(receipt.questId,receipt.level);
 if(!current||current.stage!==receipt.stage)return {...receipt};
 return {...receipt,originalText:receipt.originalText??receipt.text,text:current.text,
  presentationUpdated:current.text!==receipt.text};
}
export function getQuestHintOffer(questId){
 const quest=gameState.piQuests?.quests?.[questId];
 if(!quest||quest.status!=='active')return null;
 const initial=getQuestHint(questId,0);if(!initial)return null;
 const receipts=[0,1,2].map(level=>getReceipt(questId,initial.stage,level));
 const latest=receipts.filter(Boolean).at(-1)||null;
 const nextLevel=receipts.findIndex(receipt=>!receipt);
 const next=nextLevel>=0?getQuestHint(questId,nextLevel):null;
 return {questId,stage:initial.stage,level:nextLevel,next,latest:displayReceipt(latest),
  complete:nextLevel<0,freeCount:hintManager.getAvailableCount(),
  contextToken:JSON.stringify([initial.stage,initial.context??initial.text])};
}
export function purchaseQuestHint(questId,method,expected,sceneId){
 if(!['free_hint','cut_corners','squad_help'].includes(method))return {success:false,message:__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_8feafafce5142ee76868")};
 const offer=getQuestHintOffer(questId);
 if(!offer||!offer.next||!expected||offer.stage!==expected.stage||offer.level!==expected.level
  ||offer.contextToken!==expected.contextToken){
  return {success:false,stale:true,message:__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_9c5a1a1f90ad8dbd0f1b")};
 }
 const homeTown=sceneId==='DetectiveOfficeScene';
 const energy=homeTown?null:getEnergyManager();
 if(energy&&(energy.isForcedSleepActive()||energy.isManualSleepActive()))return {success:false,message:__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_3a2d1f323cade47daf71")};
 const context={caseId:questId,missionId:null,sceneId,itemId:`pi_hint:${offer.stage}:${offer.level}`};
 let result;
 if(method==='free_hint')result=hintManager.useFreeHint(context);
 else{
  const cost=homeTown?{energy:0,minutes:0}:COSTS[method];
  if(energy){
   if(!energy.canAfford(cost.energy).ok)return {success:false,message:__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_45fde785132338beab65")};
   const payment=energy.consumeCustom(cost.energy,`${__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_3acae76e01bf99e6a53d")}${method}${__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_ba5ec51d07a4ac0e9516")}`,{requireFullAmount:true,activityType:'pi_quest_hint'});
   if(!payment.success)return {success:false,message:payment.message||__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_9abc2c28bbb87607bbd6")};
  }
  result=hintManager.recordPaidHint(method,context,{...cost,cash:0});
 }
 if(!result?.success)return {success:false,message:method===__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_db80476684cadd281425")?__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_acb432e83b7163eea864"):__dialogueText("ui/pi-computer/QuestHintPurchase.js", "t_2655eb63211afcbf35c4")};
 const receipt={questId,stage:offer.stage,level:offer.level,text:offer.next.text,method,
  historyEntryId:result.entry.id,createdAt:result.entry.createdAt};
 gameState.updateState({
  [RECEIPTS_KEY]:{...(gameState[RECEIPTS_KEY]||{}),[receiptKey(questId,receipt.stage,receipt.level)]:receipt},
  piQuestHints:{version:1,quests:{...(gameState.piQuestHints?.quests||{}),[questId]:{stage:receipt.stage,level:receipt.level}}}
 });
 if(!homeTown&&COSTS[method])EventBus.emit('advanceTime',0,COSTS[method].minutes);
 const saved=saveGameState();return {success:true,receipt,saved};
}
