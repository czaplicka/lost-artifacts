// Honest Ziggy's Pawn: selling PI inventory items for cash, with pawn tickets
// that let the player buy an item back later (at a "friendship fee").
import { gameState } from '../GameData.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { piInventoryManager } from './PIInventoryManager.js';
import { INVENTORY_SHOPS } from '../config/InventoryShops.js';
import { PI_LOCKPICK_PRODUCT } from '../config/piLockpickProduct.js';
import { saveGameState } from '../gameStatePersistence.js';

export const PAWN_RULES = Object.freeze({
  payoutRate: 0.4,      // Ziggy pays 40% of the shop price...
  buybackRate: 1.35,    // ...and sells it back for 135% of what he paid.
  maxTickets: 8,        // Older tickets expire: Ziggy sells the goods to "a guy".
  // Case material never goes over the counter.
  refusedTypes: ['clue', 'evidence', 'key'],
  refusedIds: ['misc_notebook', 'inflatable_alibi']
});

const STATE_KEY = 'lombardPawn';

function shopPriceIndex(catalog) {
  const index = new Map();
  const add = (category, key, price) => {
    const id = catalog?.[category]?.[key]?.id;
    if (id && Number.isInteger(price) && price > 0) index.set(id, Math.max(index.get(id) ?? 0, price));
  };
  for (const spot of INVENTORY_SHOPS.city?.hotspots ?? []) add(spot.category, spot.key, spot.price);
  for (const product of INVENTORY_SHOPS.spy ?? []) add(product.category, product.key, product.price);
  add(PI_LOCKPICK_PRODUCT.category, PI_LOCKPICK_PRODUCT.key, PI_LOCKPICK_PRODUCT.price);
  return index;
}

function readState() {
  const raw = gameState[STATE_KEY];
  const tickets = Array.isArray(raw?.tickets) ? raw.tickets.filter(t => t?.id && t.item?.id) : [];
  return { version: 1, tickets };
}

function writeState(state) {
  gameState[STATE_KEY] = { version: 1, tickets: state.tickets.map(t => structuredClone(t)) };
  try { saveGameState(); } catch (error) { console.warn('[LombardPawnService] Save failed:', error); }
}

function ticketId() {
  return `pawn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class LombardPawnService {
  constructor({ money = moneyManager, inventory = piInventoryManager } = {}) {
    this.money = money;
    this.inventory = inventory;
    this.busy = false;
    this.catalog = null;
    this.prices = new Map();
  }

  setCatalog(catalog) {
    this.catalog = catalog || null;
    this.prices = shopPriceIndex(this.catalog);
  }

  basePrice(item) {
    const paid = Number(item?.metadata?.purchasePrice);
    if (Number.isInteger(paid) && paid > 0) return paid;
    return this.prices.get(item?.id) ?? null;
  }

  // Quote for one unit of an inventory item.
  appraise(item) {
    if (!item?.id) return { ok: false, reason: 'missing', offer: 0 };
    if (PAWN_RULES.refusedIds.includes(item.id)) return { ok: false, reason: item.id === 'inflatable_alibi' ? 'alibi' : 'personal', offer: 0 };
    if (PAWN_RULES.refusedTypes.includes(item.type) || item.metadata?.caseId || item.metadata?.questItem) {
      return { ok: false, reason: 'case', offer: 0 };
    }
    const base = this.basePrice(item);
    // Unpriced papers are case documents (tickets, letters, keycards...).
    if (!base) return { ok: false, reason: item.type === 'document' ? 'case' : 'worthless', offer: 0 };
    const offer = Math.max(1, Math.floor(base * PAWN_RULES.payoutRate));
    return { ok: true, reason: 'ready', offer, buyback: Math.ceil(offer * PAWN_RULES.buybackRate) };
  }

  // Every inventory item, in inventory order, with Ziggy's quote attached.
  listOffers() {
    return this.inventory.getAllItems().map(item => ({ item, quote: this.appraise(item) }));
  }

  getTickets() { return readState().tickets; }

  sell(itemId) {
    if (this.busy) return { ok: false, reason: 'busy' };
    this.busy = true;
    try {
      const item = this.inventory.getItem(itemId);
      const quote = this.appraise(item);
      if (!quote.ok) return { ok: false, reason: quote.reason };
      const snapshot = structuredClone({ ...item, quantity: 1 });
      const removed = item.stackable && item.quantity > 1
        ? this.inventory.removeQuantity(item.id, 1)
        : this.inventory.removeItem(item.id);
      if (!removed) return { ok: false, reason: 'inventory' };
      const state = readState();
      const ticket = { id: ticketId(), item: snapshot, paid: quote.offer, buyback: quote.buyback, at: Date.now() };
      state.tickets.unshift(ticket);
      const expired = state.tickets.splice(PAWN_RULES.maxTickets);
      writeState(state);
      try {
        this.money.addCash(quote.offer, {
          category: ECONOMY_CATEGORY.ITEM, missionId: null,
          description: `Pawned at Ziggy's: ${snapshot.name}`,
          metadata: { itemId: snapshot.id, shopId: 'pawn-shop', pawnTicketId: ticket.id }
        });
      } catch (error) {
        // Undo: item back, ticket gone.
        console.error('[LombardPawnService] Payout failed:', error);
        this.inventory.addItem(snapshot);
        writeState({ tickets: readState().tickets.filter(t => t.id !== ticket.id).concat(expired) });
        return { ok: false, reason: 'error' };
      }
      return { ok: true, ticket, expired };
    } finally {
      this.busy = false;
    }
  }

  inspectTicket(ticket) {
    if (!ticket) return { ok: false, reason: 'missing' };
    const existing = this.inventory.getItem(ticket.item.id);
    const fitsStack = existing && existing.stackable && ticket.item.stackable;
    if (existing && !fitsStack) return { ok: false, reason: 'owned' };
    const { current, max } = this.inventory.getCapacity();
    if (!existing && current >= max) return { ok: false, reason: 'full' };
    if (this.money.getBalance(MONEY_SOURCE.CASH) < ticket.buyback) return { ok: false, reason: 'funds' };
    return { ok: true, reason: 'ready' };
  }

  redeem(id) {
    if (this.busy) return { ok: false, reason: 'busy' };
    this.busy = true;
    try {
      const ticket = this.getTickets().find(t => t.id === id);
      const state = this.inspectTicket(ticket);
      if (!state.ok) return state;
      const paid = this.money.spend(ticket.buyback, {
        source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM, missionId: null,
        description: `Redeemed at Ziggy's: ${ticket.item.name}`,
        metadata: { itemId: ticket.item.id, shopId: 'pawn-shop', pawnTicketId: ticket.id }
      });
      if (!paid?.ok) return { ok: false, reason: 'funds' };
      if (!this.inventory.addItem(ticket.item)) {
        this.money.refund(paid.transaction?.amount ?? ticket.buyback, {
          source: MONEY_SOURCE.CASH, missionId: null,
          description: `Ziggy's pawn: redemption cancelled (${ticket.item.name})`
        });
        return { ok: false, reason: 'inventory' };
      }
      writeState({ tickets: this.getTickets().filter(t => t.id !== ticket.id) });
      return { ok: true, ticket, cost: paid.transaction?.amount ?? ticket.buyback };
    } finally {
      this.busy = false;
    }
  }
}

export const lombardPawnService = new LombardPawnService();
