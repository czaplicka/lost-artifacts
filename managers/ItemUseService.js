import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// managers/ItemUseService.js
import { inventoryManager } from './InventoryManager.js';
import { getEnergyManager } from './EnergyManager.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { isAgencyFieldManual } from './AgencyManualService.js';
import { openAgencyFieldManual } from '../ui/AgencyManualReader.js';
import { APARTMENT_OBJECTS_POOL,RED_HERRING_CONTENTS,ESCAPE_CLUES,
  ESCAPE_COMBINATION_ITEMS,COMBINE_RULES,APARTMENT_ADDITIONAL_ITEMS } from '../scenes/apartament/ApartmentObjectsPool.js';
await ItemsLoader.load();
const WASTE_WARNING_RATIO=0.5,CONFIRM_WINDOW_MS=4000;
let pendingConfirm=null;
const apartmentDefinitions=new Map();
for(const entry of [
  ...Object.values(APARTMENT_OBJECTS_POOL).flatMap(object=>object.possibleContents||[]),
  ...RED_HERRING_CONTENTS,...Object.values(ESCAPE_CLUES),...Object.values(ESCAPE_COMBINATION_ITEMS),
  ...Object.values(COMBINE_RULES).map(rule=>rule.produces),...Object.values(APARTMENT_ADDITIONAL_ITEMS)
])if(entry?.id)apartmentDefinitions.set(String(entry.id),entry);
function getDefinition(item){
  const apartment=item?.metadata?.apartment;
  if(apartment){const originalId=apartment.originalId??apartment.item?.id;return originalId==null?null:apartmentDefinitions.get(String(originalId))||null;}
  for(const category of Object.values(ItemsLoader.catalog||{})){
    const definition=Object.values(category).find(entry=>entry?.id===item?.id);if(definition)return definition;
  }return null;
}
function getUseMessage(item){
  return[item?.metadata?.useMessage,item?.metadata?.apartment?.item?.metadata?.useMessage,getDefinition(item)?.metadata?.useMessage]
    .find(text=>typeof text==='string'&&text.trim())?.trim()||'';
}
function clearPending(){pendingConfirm=null;}
function isPendingFor(itemId){return Boolean(pendingConfirm&&pendingConfirm.itemId===itemId&&Date.now()-pendingConfirm.timestamp<=CONFIRM_WINDOW_MS);}
function restoresEnergy(item){const amount=Number(item?.metadata?.effect?.energy);return Boolean(item?.metadata?.consumable&&Number.isFinite(amount)&&amount>0);}
export function canUseItem(item){return item?.id!==undefined&&item?.id!==null;}
export function useItem(itemId){
  const item=inventoryManager.getItem(itemId);
  if(!item){clearPending();return{ok:false,message:__dialogueText("managers/ItemUseService.js", "t_59a6634734decdf37cd3")};}
  if(isAgencyFieldManual(item)){clearPending();return openAgencyFieldManual('overview');}
  if(!restoresEnergy(item)){
    clearPending();return{ok:true,commentOnly:true,consumed:false,message:getUseMessage(item)||__dialogueText("managers/ItemUseService.js", "t_b1d92e4be293e453a705")};
  }
  const energy=getEnergyManager(),current=energy.getCurrentEnergy(),max=energy.getMaxEnergy();
  if(current>=max){clearPending();return{ok:false,message:__dialogueText("managers/ItemUseService.js", "t_5698ae79ed0a927de2cf")};}
  const amount=Number(item.metadata.effect.energy),missing=max-current,wasted=Math.max(0,amount-missing);
  if(missing<amount*WASTE_WARNING_RATIO&&!isPendingFor(item.id)){
    pendingConfirm={itemId:item.id,timestamp:Date.now()};
    return{ok:false,needsConfirm:true,message:`${__dialogueText("managers/ItemUseService.js", "t_7c2da26ef6e0645bc44a")}${item.name}${__dialogueText("managers/ItemUseService.js", "t_f945d121b12cd6023f31")}${amount}${__dialogueText("managers/ItemUseService.js", "t_8ed2a60d6d192b7e05e3")}${missing}${__dialogueText("managers/ItemUseService.js", "t_8dccf256f6d5783e62bb")}${wasted}${__dialogueText("managers/ItemUseService.js", "t_5f154cd9c9f88c86d002")}`};
  }
  clearPending();
  const result=energy.recoverCustom(amount,`${item.name}: +${amount}`,{recoveryType:'item',recoverySubtype:item.id});
  if(!result.success)return{ok:false,message:result.message||__dialogueText("managers/ItemUseService.js", "t_12d359c2c0f9b59f7b52")};
  inventoryManager.removeQuantity(item.id,1);
  return{ok:true,consumed:true,recovered:result.amount,message:`${getUseMessage(item)||`${__dialogueText("managers/ItemUseService.js", "t_ecfc418002201cc73aef")}${item.name}${__dialogueText("managers/ItemUseService.js", "t_cdb4ee2aea69cc6a8333")}`}${__dialogueText("managers/ItemUseService.js", "t_2df029fdd16bf06b092d")}${result.amount}${__dialogueText("managers/ItemUseService.js", "t_f8a3165a4e2294ccb509")}`};
}
