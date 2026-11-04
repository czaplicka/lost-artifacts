import { SpyShopScene as OriginalShopScene } from './SpyShopScene.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { SpyShopAnimations } from './spy-shop/SpyShopAnimations.js';

export class SpyShopScene extends OriginalShopScene {
  drawBackground() {
    super.drawBackground();
    this.animatedShopBackground = [...this.children.list].reverse().find(
      item => item.type === 'Image' && item.texture?.key === SPY_SHOP_CONFIG.backgroundKey
    ) ?? null;
  }

  createHotspot(cfg, index) {
    const hotspot = super.createHotspot(cfg, index);
    // Replace the base hover effect; retain labels, cursor and click actions.
    hotspot.rect.removeAllListeners('pointerover');
    hotspot.rect.on('pointerover', () => {
      if (!this.canInteract() || this.debugMode) return;
      hotspot.label.setVisible(true);
    });
    hotspot.rect.setFillStyle(0xffd27d, 0).setStrokeStyle(0);
    return hotspot;
  }

  refreshHotspots() {
    super.refreshHotspots();
    if (this.disposed) return;
    for (const hotspot of this.hotspots) {
      hotspot.rect.setFillStyle(0xffd27d, 0).setStrokeStyle(0);
    }
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
