import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { supabase } from '../supabase-client.js';
import { thiefdokuService } from './thiefdoku/ThiefdokuService.js';
import { MUSIC_PACKS } from '../config/musicPacks.js';
import { PAYPAL_CONFIG } from '../config/storeConfig.js';

const KEY = 'storeEntitlements';

// Jedyne miejsce z cenami. Medal = 1 rozwiązana codzienna zagadka Thiefdoku.
// paypalProductId = id wiersza w store_sandbox_products (sprawdzane po stronie serwera).
export const STORE_PRODUCTS = Object.freeze({
  dead_mail: Object.freeze({
    id: 'dead_mail',
    name: 'Dead Mail',
    priceEur: 9.99,
    priceMedals: 120,
    paypalProductId: 'dead_mail'
  }),
  music_pack: Object.freeze({
    id: 'music_pack',
    name: 'Noir Music Pack',
    priceEur: 9.99,
    priceMedals: 40,
    paypalProductId: MUSIC_PACKS.noir_pack_1.productId,
    musicPack: 'noir_pack_1'
  })
});

// Zakupy PayPal są zapisane na serwerze (konto gracza), zakupy za medale w zapisie gry.
let serverOwned = new Set();
let refreshTask = null;

function read() {
  const saved = gameState[KEY];
  return { version: 1, owned: {}, ...(saved && typeof saved === 'object' ? saved : {}) };
}

function changed(productId) {
  EventBus.emit('storeEntitlementsChanged', { productId });
}

export function getStoreProduct(productId) {
  return STORE_PRODUCTS[productId] || null;
}

export function hasEntitlement(productId) {
  const product = STORE_PRODUCTS[productId];
  if (!product) return false;
  return Boolean(read().owned?.[productId]) || serverOwned.has(product.paypalProductId);
}

export function ownedMusicPacks() {
  return Object.values(STORE_PRODUCTS)
    .filter(product => product.musicPack && hasEntitlement(product.id))
    .map(product => product.musicPack);
}

// Reads PayPal purchases of the signed-in player. Returns true when they were read.
export function refreshStoreEntitlements() {
  if (refreshTask) return refreshTask;
  refreshTask = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let next = new Set();
      if (sessionData?.session) {
        const { data, error } = await supabase
          .from(PAYPAL_CONFIG.entitlementsTable)
          .select('product_id')
          .eq('user_id', sessionData.session.user.id)
          .is('revoked_at', null);
        if (error) throw new Error(error.message);
        next = new Set((data || []).map(row => row.product_id));
      }
      const same = next.size === serverOwned.size && [...next].every(id => serverOwned.has(id));
      serverOwned = next;
      if (!same) changed(null);
      return true;
    } catch (error) {
      console.warn('[StoreEntitlements] Could not read purchases:', error);
      return false;
    }
  })().finally(() => { refreshTask = null; });
  return refreshTask;
}

// source: 'medals' (zapis gry). Zakupy PayPal przychodzą z serwera przez refreshStoreEntitlements.
function grantLocal(productId, source) {
  const state = read();
  if (state.owned?.[productId]) return;
  gameState[KEY] = {
    ...state,
    owned: { ...state.owned, [productId]: { source, at: new Date().toISOString() } }
  };
  requestAutosave();
  changed(productId);
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

  grantLocal(productId, 'medals');
  return {
    ok: true,
    message: `Purchased: ${product.name}. Medals left: ${spent.balance}.`
  };
}

try {
  supabase.auth.onAuthStateChange(event => {
    if (['INITIAL_SESSION', 'SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
      setTimeout(() => void refreshStoreEntitlements(), 0);
    }
  });
} catch (error) {
  console.warn('[StoreEntitlements] Auth listener unavailable:', error);
}
