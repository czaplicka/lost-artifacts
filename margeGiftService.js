import { MainStoryManager } from './managers/MainStoryManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { ItemsLoader } from './ItemsLoader.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { evaluateMargeGift } from './margeGiftModel.js';
export const margeGiftData=await loadJson('./assets/data/margeGift.json',import.meta.url);
await ItemsLoader.load();
const F=margeGiftData.flags;
const DEFINITIONS=margeGiftData.gifts.map(config=>{
  const item=ItemsLoader.get(config.category,config.key);
  if(!item?.id)throw new Error(`Missing gift: ${config.category}.${config.key}`);
  return{...config,id:item.id,name:item.name};
});
let giving=false;
export function getMargeGiftDefinitions(){return DEFINITIONS.map(entry=>({...entry,acceptance:[...entry.acceptance]}));}
export function getMargeGiftState(){
  const birthdayKnown=MainStoryManager.hasFlag(F.birthday),giftGiven=MainStoryManager.hasFlag(F.giftGiven);
  const helpCompleted=MainStoryManager.hasFlag(F.helpCompleted),completedMissions=getCompletedAgencyCaseCount();
  const ready=birthdayKnown&&completedMissions>=margeGiftData.minimumCompletedMissions;
  return{birthdayKnown,giftGiven,helpCompleted,completedMissions,minimumCompletedMissions:margeGiftData.minimumCompletedMissions,ready,canGive:ready&&!giftGiven,canDiscuss:ready&&giftGiven&&!helpCompleted};
}
export function getOwnedMargeGifts(){return DEFINITIONS.filter(def=>inventoryManager.hasItem(def.id)).map(def=>({...def,quantity:inventoryManager.getItem(def.id).quantity}));}
export function giveMargeGift(itemId){
  if(giving)return{success:false,reason:'busy'};
  const state=getMargeGiftState(),verdict=evaluateMargeGift(state,itemId,DEFINITIONS.map(item=>item.id),getOwnedMargeGifts().map(item=>item.id));
  if(!verdict.ok)return{success:false,...verdict};giving=true;
  try{
    const item=inventoryManager.getItem(itemId);if(!item)return{success:false,reason:'missing_item'};
    const receipt={itemId:item.id,itemName:item.name,quantity:1,givenAt:new Date().toISOString()};
    if(!inventoryManager.removeQuantity(itemId,1))return{success:false,reason:'remove_failed'};
    MainStoryManager.setSideClue('marge_birthday_gift_receipt',receipt);MainStoryManager.setFlag(F.giftGiven,true);
    return{success:true,receipt,saved:saveGameState()};
  }finally{giving=false;}
}
export function completeMargeInsuranceHelp(){
  const state=getMargeGiftState();if(!state.ready||!state.giftGiven)return{success:false,reason:'unavailable'};
  if(state.helpCompleted)return{success:true,alreadyCompleted:true};
  MainStoryManager.setFlag(F.helpCompleted,true);MainStoryManager.setFlag(F.commissionerKnown,true);MainStoryManager.setFlag(F.supervisorLead,true);
  MainStoryManager.setSideClue('commissioner_identity',{name:'Gordon',role:'agency_supervisor',source:'Marge Gunderson'});
  const previous=MainStoryManager.getSideClue('holly_chapter_progress');
  if(!(Number(previous?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
    ...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),version:1,chapter:2,chapterOneCompleted:true,objective:'ask_gordon_about_operation_authorization'
  });
  return{success:true,saved:saveGameState()};
}
