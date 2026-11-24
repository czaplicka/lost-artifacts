import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { LOCAL_DEBUG_ALLOWED, FONT, COLOR, TAG_W, BOARD_W, FALLBACK_DESCRIPTIONS, SHOP_SIGNS, QUIPS, normalizeCityId, hashString, seededRandom } from './ShopSceneData.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../../managers/MoneyManager.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { playShopPurchaseAudio } from './ShopPurchaseAudio.js';

export const shopScenePurchase = {
  buyItem(cfg) {
    if (this.debugMode || this.buying || this.exiting || this.hudPanelOpen) return;
    if (!Number.isInteger(cfg.price) || cfg.price <= 0 || !cfg.item?.id || !cfg.item?.name) {
      console.error('[ShopScene] Invalid product:', cfg); this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_ec162ef5a87ef540a17b"), 'error'); return;
    }
    const existing = inventoryManager.getItem(cfg.item.id);
    if (existing && !(existing.stackable === true && cfg.item.stackable === true)) {
      this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_5fd0f778b1950dd2dbe4"), 'info'); this.sayQuip(QUIPS.owned); return;
    }
    const capacity = inventoryManager.getCapacity();
    if (!existing && capacity.current >= capacity.max) {
      this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_c85655f5cad69897b5a8"), 'error'); this.sayQuip(QUIPS.full); return;
    }
    this.buying = true;
    try {
      const purchase = moneyManager.spend(cfg.price, { source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM,
        description: `${__dialogueText("scenes/ShopScene.js", "t_455577d7df89bb1ecc38")}${cfg.label}`, metadata: { itemId: cfg.item.id } });
      if (!purchase.ok) {
        this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_453074a21dbb89c3d1c7"), 'error'); this.shakeCash(); this.sayQuip(QUIPS.broke); return;
      }
      const added = inventoryManager.addItem({ ...cfg.item });
      if (!added) {
        moneyManager.refund(purchase.transaction.amount, { source: MONEY_SOURCE.CASH, description: `${__dialogueText("scenes/ShopScene.js", "t_5e60331cd53980cc4feb")}${cfg.label}`,
          metadata: { itemId: cfg.item.id, purchaseId: purchase.transaction.id } });
        this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_9f920d41e8abfeb7faf7"), 'error'); return;
      }
      playShopPurchaseAudio(this);
      const saved = saveGameState();
      if (saved) this.showFeedback(`${__dialogueText("scenes/ShopScene.js", "t_e86efd9beafd0e66f6b1")}${cfg.item.name}`, 'success', `-$${cfg.price}`);
      else this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_4c9048acda1215d6cfea"), 'info', `-$${cfg.price}`);
      this.purchaseEffects(cfg); this.sayQuip(QUIPS.purchase);
    } catch (error) {
      console.error('[ShopScene] Purchase failed:', error); this.showFeedback(__dialogueText("scenes/ShopScene.js", "t_c278c390dde548123f84"), 'error');
    } finally { this.buying = false; this.refreshMoneyHUD(); }
  },
  refreshMoneyHUD(initial = false) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.setCashDisplay(cash, !initial);
    this.updateStockRows();
    this.refreshOwnedStamps();
    if (this.tagCfg && this.tag?.container?.visible) this.renderTag(this.tagCfg);
  }
};
