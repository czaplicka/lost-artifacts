import { INVENTORY_SHOPS } from './InventoryShops.js';
import { PI_LOCKPICK_PRODUCT } from './piLockpickProduct.js';

const configured = INVENTORY_SHOPS.spy;
const products = configured.filter(product => product.enabled !== false).map(product => ({ ...product }));
// An explicit configuration, including enabled:false, takes precedence.
const alreadyConfigured = configured.some(product => product.category === 'equipment' && product.key === 'lockpick');
export const SPY_SHOP_STOCK = alreadyConfigured ? products : [...products, { ...PI_LOCKPICK_PRODUCT }];
