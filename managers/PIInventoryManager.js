import '../ui/inventory/InventoryGraphics.js';
import {gameState} from '../GameData.js';
import {EventBus} from '../EventBus.js';
import {inventoryManager} from './InventoryManager.js';
import {requestAutosave} from '../gameStatePersistence.js';
const LIMIT=12,VERSION=1;
export class PIInventoryManager {
 constructor({state=gameState,bus=EventBus,save=requestAutosave,normalize=item=>inventoryManager.normalizeItem(item)}={}){this.state=state;this.bus=bus;this.save=save;this.normalize=normalize;this.selectedItemId=null;this.stateIdentity=null;}
 syncContext(){const identity=this.state.state??this.state;if(this.stateIdentity!==identity){this.stateIdentity=identity;this.selectedItemId=null;}}
 read(){this.syncContext();const raw=this.state.piInventory;if(raw==null)return{version:VERSION,items:[]};if(raw.version!==VERSION||!Array.isArray(raw.items))throw Error('[PIInventory] Invalid save. No items were overwritten.');const ids=new Set(),items=raw.items.map(item=>{const clean=this.normalize(item);if(!clean||ids.has(clean.id))throw Error('[PIInventory] Invalid or duplicate item in save.');ids.add(clean.id);return clean;});return{version:VERSION,items};}
 commit(items){this.state.piInventory={version:VERSION,items};this.save();this.bus.emit('piInventory:updated');}
 normalizeItem(item){return this.normalize(item);}
 getAllItems(){return this.read().items;}
 getAllItemsCopy(){return this.getAllItems();}
 getItem(id){return this.getAllItems().find(item=>item.id===String(id))??null;}
 hasItem(id){return Boolean(this.getItem(id));}
 getItemCount(){return this.getAllItems().length;}
 getItemsByType(type){return this.getAllItems().filter(item=>item.type===type);}
 getCapacity(){return{current:this.getItemCount(),max:LIMIT};}
 addItem(raw){const item=this.normalize(raw);if(!item)return false;const items=this.getAllItems(),existing=items.find(entry=>entry.id===item.id);if(existing){if(!existing.stackable||!item.stackable)return false;if(existing.quantity+item.quantity>999)return false;existing.quantity+=item.quantity;}else{if(items.length>=LIMIT){this.bus.emit('piInventory:full',{attemptedItem:item,capacity:this.getCapacity()});return false;}items.push(item);}this.commit(items);this.bus.emit('piInventory:itemAdded',item);return true;}
 removeItem(id){const items=this.getAllItems(),index=items.findIndex(item=>item.id===String(id));if(index<0)return false;const [removed]=items.splice(index,1);if(this.selectedItemId===removed.id)this.selectedItemId=null;this.commit(items);this.bus.emit('piInventory:itemRemoved',removed);return true;}
 removeQuantity(id,amount=1){const quantity=Number(amount);if(!Number.isSafeInteger(quantity)||quantity<1)return false;const items=this.getAllItems(),item=items.find(entry=>entry.id===String(id));if(!item||quantity>item.quantity)return false;if(!item.stackable||quantity===item.quantity)return this.removeItem(id);item.quantity-=quantity;this.commit(items);return true;}
 selectItem(id){const item=this.getItem(id);if(!item)return false;this.selectedItemId=item.id;this.bus.emit('piInventory:selectionChanged',item);return true;}
 clearSelection(){this.selectedItemId=null;this.bus.emit('piInventory:selectionChanged',null);return true;}
 getSelectedItem(){this.syncContext();return this.selectedItemId?this.getItem(this.selectedItemId):null;}
 clearAll(){this.clearSelection();this.commit([]);}
 exportState(){return this.read();}
 importState(raw){if(!raw||raw.version!==VERSION||!Array.isArray(raw.items))return false;const items=[],ids=new Set();for(const rawItem of raw.items){const item=this.normalize(rawItem);if(!item||ids.has(item.id))return false;ids.add(item.id);items.push(item);}this.clearSelection();this.commit(items);return true;}
}
export const piInventoryManager=new PIInventoryManager();
