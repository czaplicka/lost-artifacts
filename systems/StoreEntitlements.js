import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { thiefdokuService } from './thiefdoku/ThiefdokuService.js';


const KEY = 'storeEntitlements';

// Jedyne miejsce z cenami. Medal = 1 rozwiązana codzienna zagadka Thiefdoku.
export const STORE_PRODUCTS = Object.freeze({
  dead_mail: {
    id: 'dead_mail',
    name: 'Dead Mail',
    priceEur: 9.99,
    priceMedals: 120
  }
});


function read() {
  const saved = gameState[KEY];
  return { version: 1, owned: {}, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function hasEntitlement(productId) {
  return Boolean(read().owned?.[productId]);
}

// source: 'medals' albo 'paypal' (po podpięciu serwera).
export function grantEntitlement(productId, source) {
  if (!STORE_PRODUCTS[productId]) return false;
  const state = read();
  if (state.owned?.[productId]) return true;
  gameState[KEY] = {
    ...state,
    owned: { ...state.owned, [productId]: { source, at: new Date().toISOString() } }
  };
  requestAutosave();
  EventBus.emit('storeEntitlementsChanged', { productId });
  return true;
}

export function buyWithMedals(productId) {
  const product = STORE_PRODUCTS[productId];
  if (!product) return { ok: false, message: 'This item is not for sale.' };
  if (hasEntitlement(productId)) return { ok: false, message: 'You already own this.' };

  const medals = thiefdokuService.getMedals();
  if (medals < product.priceMedals) {
    return {
      ok: false,
      message: `Not enough medals: ${product.priceMedals} needed, you have ${medals}.`
    };
  }

  const spent = thiefdokuService.spendMedals(product.priceMedals);
  if (!spent.ok) return { ok: false, message: spent.message };

  grantEntitlement(productId, 'medals');
  return {
    ok: true,
    message: `Purchased: ${product.name}. Medals left: ${spent.balance}.`
  };
}