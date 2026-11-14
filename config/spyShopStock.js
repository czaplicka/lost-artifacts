import {INVENTORY_SHOPS} from './InventoryShops.js';
export const SPY_SHOP_STOCK=INVENTORY_SHOPS.spy.filter(v=>v.enabled!==false).map(v=>({...v}));
