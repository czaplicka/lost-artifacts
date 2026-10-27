import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { inventoryManager } from './InventoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';

export class SpyShopPurchaseService {
  constructor({ money = moneyManager, inventory = inventoryManager, save = saveGameState } = {}) {
    this.money = money;
    this.inventory = inventory;
    this.save = save;
    this.busy = false;
  }

  inspect(product) {
    if (!product?.item?.id || !product.item.name || !Number.isInteger(product.price) || product.price <= 0) {
      return { ok: false, reason: 'unavailable', message: 'This item is not ready for sale.' };
    }
    if (this.inventory.hasItem(product.item.id)) {
      return { ok: false, reason: 'owned', message: 'You already own this item.' };
    }
    const capacity = this.inventory.getCapacity();
    if (capacity.current >= capacity.max) {
      return { ok: false, reason: 'full', message: 'Inventory full. Even detectives need pockets.' };
    }
    const cash = this.money.getBalance(MONEY_SOURCE.CASH);
    if (cash < product.price) {
      return { ok: false, reason: 'funds', message: `Not enough cash. You need $${product.price - cash} more.` };
    }
    return { ok: true, reason: 'ready', message: 'Pay with your private cash.' };
  }

  buy(product) {
    if (this.busy) return { ok: false, reason: 'busy', message: 'Please wait for the current purchase.' };
    this.busy = true;
    let purchase = null;
    let purchaseId = null;
    let committed = false;
    try {
      const state = this.inspect(product);
      if (!state.ok) return state;
      const item = this.inventory.normalizeItem({
        ...product.item, quantity: 1, stackable: false,
        metadata: {
          ...(product.item.metadata || {}),
          purchasedFrom: 'spy-shop', purchasePrice: product.price
        }
      });
      if (!item) return { ok: false, reason: 'invalid', message: 'Invalid catalogue entry. Nothing was charged.' };
      purchaseId = `spy-shop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      purchase = this.money.spend(product.price, {
        source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM,
        missionId: null,
        description: `Spy Shop: ${item.name}`,
        metadata: { itemId: item.id, shopId: 'spy-shop', shopPurchaseId: purchaseId }
      });
      if (!purchase.ok) return { ok: false, reason: 'funds', message: 'Not enough cash. Nothing was purchased.' };
      const added = this.inventory.addItem(item);
      if (!added) return this.refundFailedPurchase(purchase.transaction, item.id);
      committed = true;
      return this.finish(item, product.price);
    } catch (error) {
      console.error('[SpyShopPurchaseService] Purchase failed:', error);
      // Inventory events run after insertion. A throwing listener must not create a free item.
      if (committed || (purchase?.ok && this.inventory.hasItem(product.item.id))) {
        return this.finish(product.item, product.price, true);
      }
      // Money events can throw after the expense has already been recorded.
      const transaction = purchase?.transaction || (purchaseId
        ? this.money.getRecentTransactions(100).find(t =>
          t.type === 'expense' && t.metadata?.shopPurchaseId === purchaseId)
        : null);
      if (transaction) return this.refundFailedPurchase(transaction, product?.item?.id);
      return { ok: false, reason: 'error', message: 'Purchase failed. Check the console before trying again.' };
    } finally { this.busy = false; }
  }

  finish(item, price, eventWarning = false) {
    let saved = false;
    try { saved = this.save() === true; }
    catch (error) { console.error('[SpyShopPurchaseService] Save failed:', error); }
    return {
      ok: true, saved, itemId: item.id,
      message: `Bought: ${item.name} (-$${price}).` +
        (!saved ? ' Autosave failed; save your game before leaving.' : '') +
        (eventWarning ? ' A UI listener failed; see console.' : '')
    };
  }

  refundFailedPurchase(transaction, itemId) {
    try {
      this.money.refund(transaction.amount, {
        source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.REFUND, missionId: null,
        description: 'Spy Shop: unsuccessful purchase refunded',
        metadata: { itemId: itemId ?? null, purchaseId: transaction.id, shopId: 'spy-shop' }
      });
      try { this.save(); } catch (error) { console.error('[SpyShopPurchaseService] Refund save failed:', error); }
      return { ok: false, reason: 'refunded', message: 'Item could not be added. Payment refunded.' };
    } catch (error) {
      console.error('[SpyShopPurchaseService] Refund failed:', error);
      return { ok: false, reason: 'refund_error', message: 'Purchase error. Check your cash and the console before trying again.' };
    }
  }
}

export const spyShopPurchaseService = new SpyShopPurchaseService();
