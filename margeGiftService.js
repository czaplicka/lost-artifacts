import { MainStoryManager } from './managers/MainStoryManager.js';
import { inventoryManager } from './managers/InventoryManager.js';
import { ItemsLoader } from './ItemsLoader.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { evaluateMargeGift } from './margeGiftModel.js';
import { MARGE_DISCLOSURE_KEY, validateMargeDisclosureData, readMargeDisclosure, prepareMargeDisclosure, margeGordonContext } from './margeDisclosureModel.js';
export const margeGiftData=await loadJson('./assets/data/margeGift.json',import.meta.url);
export const margeDisclosureData=validateMargeDisclosureData(await loadJson('./assets/data/margeDisclosure.json',import.meta.url));
await ItemsLoader.load();
const F=margeGiftData.flags;
const DEFINITIONS=margeGiftData.gifts.map(config=>{
  const item=ItemsLoader.get(config.category,config.key);
  if(!item?.id)throw new Error(`Missing gift: ${config.category}.${config.key}`);
  return{...config,id:item.id,name:item.name};
});
let giving=false,completing=false;
function safeSave(){try{return saveGameState()===true;}catch(error){console.error('[Marge] Saving failed:',error);return false;}}
function putClue(key,value){
  try{MainStoryManager.setSideClue(key,value);}
  catch(error){
    if(JSON.stringify(MainStoryManager.getSideClue(key))!==JSON.stringify(value))throw error;
    console.error('[Marge] Clue committed but a notification listener failed:',error);
  }
}
function putFlag(key){
  try{MainStoryManager.setFlag(key,true);}
  catch(error){if(!MainStoryManager.hasFlag(key))throw error;console.error('[Marge] Flag committed but a notification listener failed:',error);}
}
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
    putClue('marge_birthday_gift_receipt',receipt);putFlag(F.giftGiven);
    return{success:true,receipt,saved:safeSave()};
  }finally{giving=false;}
}
export function getMargeDisclosure(){return readMargeDisclosure(MainStoryManager.getSideClue(MARGE_DISCLOSURE_KEY));}
export function getMargeGordonContext(){return margeGordonContext(MainStoryManager.getSideClue(MARGE_DISCLOSURE_KEY),{legacyCompleted:MainStoryManager.hasFlag(F.helpCompleted)});}
function applyMargeLead(record){
  putClue('commissioner_identity',record?.commonClue??margeDisclosureData.commonClue);
  const previous=MainStoryManager.getSideClue('holly_chapter_progress');
  if(!(Number(previous?.chapter)>2))putClue('holly_chapter_progress',{
    ...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),version:1,chapter:2,chapterOneCompleted:true,objective:'ask_gordon_about_operation_authorization'
  });
  putFlag(F.commissionerKnown);putFlag(F.supervisorLead);putFlag(F.helpCompleted);
}
export function completeMargeInsuranceHelp(choiceId){
  if(completing)return{success:false,reason:'busy'};
  const result=prepareMargeDisclosure(margeDisclosureData,getMargeGiftState(),MainStoryManager.getSideClue(MARGE_DISCLOSURE_KEY),choiceId);
  if(!result.success)return result;
  if(result.legacy)return{success:true,alreadyCompleted:true,legacy:true,saved:safeSave()};
  completing=true;
  try{
    if(!result.alreadyCompleted)putClue(MARGE_DISCLOSURE_KEY,result.record);
    applyMargeLead(result.record);
    return{success:true,alreadyCompleted:result.alreadyCompleted,disclosure:getMargeDisclosure(),saved:safeSave()};
  }finally{completing=false;}
}
