import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { SpyShopScene as OriginalShopScene } from './SpyShopScene.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { SpyShopAnimations } from './spy-shop/SpyShopAnimations.js';

// Hover (celownik, linia skanująca, etykieta) obsługuje teraz scena bazowa,
// więc ta klasa dodaje już tylko animacje tła (odbicia, LED, kurz).
export class SpyShopScene extends OriginalShopScene {
  drawBackground() {
    super.drawBackground();
    this.animatedShopBackground = [...this.children.list].reverse().find(
      item => item.type === __dialogueText("scenes/SpyShopSceneWithAnimations.js", "t_1aa4cb0bcca76e92e306") && item.texture?.key === SPY_SHOP_CONFIG.backgroundKey
    ) ?? null;
  }

  create() {
    super.create();
    if (this.animatedShopBackground?.active) {
      this.shopAnimations = new SpyShopAnimations(this, this.animatedShopBackground);
    } else {
      this.shopAnimations = null;
      console.warn('[SpyShopAnimations] Image background unavailable; skipping effects on placeholder.');
    }
  }

  disposeShop() {
    this.shopAnimations?.destroy();
    this.shopAnimations = null;
    this.animatedShopBackground = null;
    super.disposeShop();
  }
}