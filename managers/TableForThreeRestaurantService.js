import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { piInventoryManager } from './PIInventoryManager.js';
import { CASE_ID, RING_ID, transition, getObjectives } from './TableForThreeModel.js';
import { readTableForThree, dispatchTableForThree } from './TableForThreeService.js';
import { getCurrentTownId } from './RoadTripManager.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { TABLE_FOR_THREE_RESTAURANT_CONFIG as C } from '../config/TableForThreeRestaurantConfig.js';
import { validateRestaurantFrame } from './TableForThreeCapturePolicy.js';
import { TableForThreeRingTransaction } from './TableForThreeRingTransaction.js';

const quest=()=>gameState.piQuests?.quests?.[CASE_ID];
function update(patch){
  const q=quest();if(!q)throw new Error('Missing Table for Three contract.');
  gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[CASE_ID]:{...q,...patch}}};requestAutosave();
}
function meta(patch){update({metadata:{...(quest()?.metadata||{}),...patch}});}
export function readRestaurantEvidence(){return structuredClone(quest()?.metadata?.tableForThreeEvidence||{});}
export function captureRestaurantEvidence(beat,frame){
  if(quest()?.status!=='active')return {ok:false,reason:'No active contract.'};
  if(getCurrentTownId()!==L.restaurant.townId)return {ok:false,reason:'Travel to the restaurant first.'};
  if(!piInventoryManager.hasItem('camera'))return {ok:false,reason:'Bring your PI camera.'};
  const checked=validateRestaurantFrame(beat,frame);if(!checked.ok)return checked;
  const s=readTableForThree();
  const key=checked.kind==='romance'?'romancePhoto':checked.kind==='ring'?'ringPhoto':'facePhoto';
  if(s?.[key])return {ok:false,reason:'That photograph is already recorded.'};
  const id='table_for_three_'+checked.kind;
  const result=transition(s,{type:checked.action,photo:{evidenceId:id,kind:checked.kind,validated:true}},{hasCamera:true,sceneBeat:beat});
  if(!result.ok)return result;
  const evidence=readRestaurantEvidence();
  evidence[id]={id,kind:checked.kind,beat,frame:{...frame},rendererVersion:C.rendererVersion};
  update({objectives:getObjectives(result.state),metadata:{...(quest().metadata||{}),tableForThree:result.state,tableForThreeEvidence:evidence}});
  return {ok:true,state:result.state,evidenceId:id};
}
export const TABLE_FOR_THREE_RING={id:RING_ID,name:C.ringName,icon:'RING',type:'quest',quantity:1,stackable:false,
  description:C.ringDescription,metadata:{caseId:CASE_ID,purchasedFrom:'pawn-shop'}};
const buyer=new TableForThreeRingTransaction({
  state:readTableForThree,inventory:piInventoryManager,
  journal:()=>quest()?.metadata?.tableForThreeRingPurchase,
  writeJournal:value=>meta({tableForThreeRingPurchase:value}),
  makeId:()=>globalThis.crypto?.randomUUID?.()||`tft-ring-${Date.now()}-${Math.random()}`,
  findPayment:id=>(Array.isArray(gameState.moneyLog)?gameState.moneyLog:[]).find(e=>e.type==='expense'&&e.metadata?.tableForThreeRingPurchaseId===id),
  spend:(price,id)=>moneyManager.spend(price,{source:MONEY_SOURCE.CASH,category:ECONOMY_CATEGORY.ITEM,missionId:CASE_ID,description:'Proposal ring — Ziggy’s Pawn',metadata:{itemId:RING_ID,tableForThreeRingPurchaseId:id}}),
  commitPurchase:()=>dispatchTableForThree({type:'BUY_RING'},{ringPurchaseCommitted:true,hasRing:piInventoryManager.hasItem(RING_ID)})
});
export function buyTableForThreeRing(){
  if(quest()?.status!=='active'||getCurrentTownId()!==L.company.townId)return {ok:false,message:'Buy the ring at Ziggy’s Pawn in Home Town.'};
  return buyer.buy(C.ringPrice,TABLE_FOR_THREE_RING);
}
export function giveTableForThreeRing(table){
  const s=readTableForThree();
  if(quest()?.status!=='active'||getCurrentTownId()!==L.restaurant.townId)return {ok:false,reason:'Visit the restaurant kitchen first.'};
  if(table!==6)return {ok:false,reason:'That is not the table you observed. The ring stays in your inventory.'};
  if(s?.ringHandedOver)return {ok:true};
  if(s?.stage!=='kitchen'||!s.ringPurchased)return {ok:false,reason:'Buy the ring first.'};
  let transfer=quest().metadata?.tableForThreeRingTransfer;
  const item=piInventoryManager.getItem(RING_ID);
  if(!item&&!transfer)return {ok:false,reason:'The ring is not in your PI inventory.'};
  if(!transfer){transfer={status:'pending',item:structuredClone(item)};meta({tableForThreeRingTransfer:transfer});}
  if(piInventoryManager.hasItem(RING_ID)){
    try{piInventoryManager.removeItem(RING_ID);}catch(error){if(piInventoryManager.hasItem(RING_ID))return {ok:false,reason:error.message};}
    if(piInventoryManager.hasItem(RING_ID))return {ok:false,reason:'The ring could not be transferred.'};
  }
  const result=dispatchTableForThree({type:'GIVE_RING_TO_KITCHEN',table:6},{ringRemovedFromInventory:true});
  if(result.ok)meta({tableForThreeRingTransfer:{...transfer,status:'delivered'}});
  return result;
}
export function closeTableForThreeDevelopmentCase(){
  const s=readTableForThree();
  if(s?.stage!=='closed')return {ok:false,reason:'Read the client’s final reply first.'};
  update({status:'completed',completedAt:new Date().toISOString(),metadata:{...(quest().metadata||{}),developmentCompleted:true,noRewardGranted:true}});
  return {ok:true};
}
