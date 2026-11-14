import {DEFAULT_INVENTORY_SHOPS} from './InventoryShopModel.js';
const response=await fetch(new URL('../assets/data/inventory-shops.json',import.meta.url));
if(!response.ok&&response.status!==404)throw Error('Inventory shop configuration HTTP '+response.status);
export const INVENTORY_SHOPS=response.status===404?structuredClone(DEFAULT_INVENTORY_SHOPS):await response.json();
if(INVENTORY_SHOPS.version!==1||!Array.isArray(INVENTORY_SHOPS.city?.hotspots)||!Array.isArray(INVENTORY_SHOPS.spy))throw Error('Unsupported inventory shop configuration.');
