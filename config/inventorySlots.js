// Inventory slot shop settings. Change prices and sizes here only.
// Slots bought with medals: offers are bought in this order, one after another.
export const MEDAL_SLOT_OFFERS = Object.freeze([
  Object.freeze({ medals: 3, slots: 2 }),
  Object.freeze({ medals: 5, slots: 2 }),
  Object.freeze({ medals: 7, slots: 2 }),
  Object.freeze({ medals: 9, slots: 2 })
]);

// Slots bought with euro: can be bought many times, up to EURO_SLOTS_MAX in total.
export const EURO_SLOT_PACKS = Object.freeze([
  Object.freeze({ id: 'inventory_slots_1', productId: 'inventory_slots_1', slots: 1, priceEur: '0.99' }),
  Object.freeze({ id: 'inventory_slots_4', productId: 'inventory_slots_4', slots: 4, priceEur: '2.99' })
]);
export const EURO_SLOTS_MAX = 16;

// Set to true when PayPal checkout is connected (see startEuroPurchase in managers/InventorySlotsService.js).
export const EURO_CHECKOUT_ENABLED = false;

export const SLOT_GRANTS_TABLE = 'store_inventory_slot_grants';
