import {ItemsLoader} from '../ItemsLoader.js';
import {INVENTORY_SHOPS} from './InventoryShops.js';
await ItemsLoader.load();
function fromCatalog(category,key){const entry=ItemsLoader.get(category,key);if(!entry)throw Error(`[shopConfig] Missing ${category}.${key} in ItemsCatalog.json`);return {...entry,quantity:1,metadata:structuredClone(entry.metadata||{})};}
export const SHOP_CONFIG={...INVENTORY_SHOPS.city,hotspots:INVENTORY_SHOPS.city.hotspots.filter(v=>v.enabled!==false).map(({category,key,...offer})=>({...offer,item:fromCatalog(category,key)}))};
