import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  piInventoryManager as inventoryManager
} from './PIInventoryManager.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

export class SpyShopPurchaseService {
  constructor({
    money = moneyManager,
    inventory = inventoryManager,
    save = saveGameState
  } = {}) {
    this.money = money;
    this.inventory = inventory;
    this.save = save;
    this.busy = false;
  }

  inspect(product) {
    if (
      !product?.item?.id ||
      !product.item.name ||
      !Number.isInteger(product.price) ||
      product.price <= 0
    ) {
      return {
        ok: false,
        reason: 'unavailable',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_ec162ef5a87ef540a17b")
      };
    }

    if (this.inventory.hasItem(product.item.id)) {
      return {
        ok: false,
        reason: 'owned',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_5fd0f778b1950dd2dbe4")
      };
    }

    const capacity = this.inventory.getCapacity();

    if (capacity.current >= capacity.max) {
      return {
        ok: false,
        reason: 'full',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_c85655f5cad69897b5a8")
      };
    }

    const cash = this.money.getBalance(
      MONEY_SOURCE.CASH
    );

    if (cash < product.price) {
      return {
        ok: false,
        reason: 'funds',
        message: `${__dialogueText("managers/SpyShopPurchaseService.js", "t_5d8ec5e2603b9d7f534f")}${product.price - cash}${__dialogueText("managers/SpyShopPurchaseService.js", "t_6b8d42aa37473c51f642")}`
      };
    }

    return {
      ok: true,
      reason: 'ready',
      message: __dialogueText("managers/SpyShopPurchaseService.js", "t_610871ae8a045143a63b")
    };
  }

  buy(product) {
    if (this.busy) {
      return {
        ok: false,
        reason: 'busy',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_f404204666e85e7f6014")
      };
    }

    this.busy = true;

    let purchase = null;
    let purchaseId = null;
    let committed = false;

    try {
      const state = this.inspect(product);

      if (!state.ok) return state;

      const item = this.inventory.normalizeItem({
        ...product.item,
        quantity: 1,
        stackable: false,
        metadata: {
          ...(product.item.metadata || {}),
          purchasedFrom: 'spy-shop',
          purchasePrice: product.price
        }
      });

      if (!item) {
        return {
          ok: false,
          reason: 'invalid',
          message: __dialogueText("managers/SpyShopPurchaseService.js", "t_1a5044253d1081d1919b")
        };
      }

      purchaseId =
        `spy-shop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      purchase = this.money.spend(
        product.price,
        {
          source: MONEY_SOURCE.CASH,
          category: ECONOMY_CATEGORY.ITEM,
          missionId: null,
          description: `${__dialogueText("managers/SpyShopPurchaseService.js", "t_d80dea523831ad8182bb")}${item.name}`,
          metadata: {
            itemId: item.id,
            shopId: 'spy-shop',
            shopPurchaseId: purchaseId
          }
        }
      );

      if (!purchase.ok) {
        return {
          ok: false,
          reason: 'funds',
          message: __dialogueText("managers/SpyShopPurchaseService.js", "t_60c88bbf1ebbc0149a2f")
        };
      }

      const added = this.inventory.addItem(item);

      if (!added) {
        return this.refundFailedPurchase(
          purchase.transaction,
          item.id
        );
      }

      committed = true;

      return this.finish(item, product.price);
    } catch (error) {
      console.error(
        '[SpyShopPurchaseService] Purchase failed:',
        error
      );

      if (
        committed ||
        (
          purchase?.ok &&
          this.inventory.hasItem(product.item.id)
        )
      ) {
        return this.finish(
          product.item,
          product.price,
          true
        );
      }

      const transaction =
        purchase?.transaction ||
        (
          purchaseId
            ? this.money.getRecentTransactions(100)
              .find(entry =>
                entry.type === 'expense' &&
                entry.metadata?.shopPurchaseId === purchaseId
              )
            : null
        );

      if (transaction) {
        return this.refundFailedPurchase(
          transaction,
          product?.item?.id
        );
      }

      return {
        ok: false,
        reason: 'error',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_b528c70447a94f8ea09c")
      };
    } finally {
      this.busy = false;
    }
  }

  finish(item, price, eventWarning = false) {
    let saved = false;

    try {
      saved = this.save() === true;
    } catch (error) {
      console.error(
        '[SpyShopPurchaseService] Save failed:',
        error
      );
    }

    return {
      ok: true,
      saved,
      itemId: item.id,
      message:
        `${__dialogueText("managers/SpyShopPurchaseService.js", "t_e86efd9beafd0e66f6b1")}${item.name}${__dialogueText("managers/SpyShopPurchaseService.js", "t_f017fb75a0a8e11ec47c")}${price}${__dialogueText("managers/SpyShopPurchaseService.js", "t_c4b2896a2081395e2823")}` +
        (
          !saved
            ? __dialogueText("managers/SpyShopPurchaseService.js", "t_d9e651cc403c50f9feed")
            : ''
        ) +
        (
          eventWarning
            ? __dialogueText("managers/SpyShopPurchaseService.js", "t_4887b3434a5f58c6ff83")
            : ''
        )
    };
  }

  refundFailedPurchase(transaction, itemId) {
    try {
      this.money.refund(
        transaction.amount,
        {
          source: MONEY_SOURCE.CASH,
          category: ECONOMY_CATEGORY.REFUND,
          missionId: null,
          description: __dialogueText("managers/SpyShopPurchaseService.js", "t_46ee19c192e6573e988a"),
          metadata: {
            itemId: itemId ?? null,
            purchaseId: transaction.id,
            shopId: 'spy-shop'
          }
        }
      );

      try {
        this.save();
      } catch (error) {
        console.error(
          '[SpyShopPurchaseService] Refund save failed:',
          error
        );
      }

      return {
        ok: false,
        reason: 'refunded',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_9f920d41e8abfeb7faf7")
      };
    } catch (error) {
      console.error(
        '[SpyShopPurchaseService] Refund failed:',
        error
      );

      return {
        ok: false,
        reason: 'refund_error',
        message: __dialogueText("managers/SpyShopPurchaseService.js", "t_7d26734f8194716679d3")
      };
    }
  }
}

export const spyShopPurchaseService =
  new SpyShopPurchaseService();