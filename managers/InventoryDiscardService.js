import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { inventoryManager } from './InventoryManager.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

export function createDiscardRequest(item) {
  if (!item || !item.id) return null;
  return Object.freeze({
    itemId:item.id, itemReference:item, name:String(item.name || __dialogueText("managers/InventoryDiscardService.js", "t_e6b8f377328b3d42997c")),
    quantity:Math.max(1,Math.floor(Number(item.quantity)||1)),
    stackable:item.stackable===true
  });
}

export function discardInventoryItem(request,mode='all',{
  manager=inventoryManager,state=gameState,save=saveGameState
}={}) {
  if (!request || !['one','all'].includes(mode)) return {success:false,reason:'invalid_request'};
  const item=manager.getItem(request.itemId);
  if (!item) return {success:false,reason:'missing_item'};
  if (item!==request.itemReference || item.quantity!==request.quantity
    || (item.stackable===true)!==request.stackable) return {success:false,reason:'item_changed'};
  const removedQuantity=mode==='one' && request.stackable ? 1 : request.quantity;
  // All types are intentionally permitted, including evidence and quest objects.
  const removed=mode==='one' && request.stackable
    ? manager.removeQuantity(request.itemId,1) : manager.removeItem(request.itemId);
  if (!removed) return {success:false,reason:'remove_failed'};
  let saved=false,error=null;
  try {
    const inventory=manager.exportState();
    if (typeof state.updateState==='function') state.updateState({inventory});
    else state.inventory=inventory;
    saved=save()===true;
  } catch(cause) {error=cause;}
  return {success:true,saved,error,itemId:request.itemId,name:request.name,removedQuantity,
    message:`${__dialogueText("managers/InventoryDiscardService.js", "t_28df2dbf6ea00f5007ed")}${removedQuantity}${__dialogueText("managers/InventoryDiscardService.js", "t_20dd86b388675a4b16ca")}${request.name}${__dialogueText("managers/InventoryDiscardService.js", "t_f92772fd261b3efe4e1b")}`+
      (saved ? '' : __dialogueText("managers/InventoryDiscardService.js", "t_8c8688337f7445310003"))};
}
