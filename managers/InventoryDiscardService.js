import { inventoryManager } from './InventoryManager.js';
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';

export function createDiscardRequest(item) {
  if (!item || !item.id) return null;
  return Object.freeze({
    itemId:item.id, itemReference:item, name:String(item.name || 'Unknown item'),
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
    message:`Discarded ${removedQuantity} × ${request.name}. The bin declines to comment.`+
      (saved ? '' : ' Warning: the save failed. This change may not persist after reloading.')};
}
