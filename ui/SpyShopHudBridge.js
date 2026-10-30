// ui/SpyShopHudBridge.js
// Keeps the existing HTML top HUD alive; never launches PlayerHudScene.
export class SpyShopHudBridge {
  constructor(scene) {
    this.scene = scene;
    this.hud = null;
    this.disposed = false;
    this.cancelWait = null;
  }

  isOwnerAlive() {
    return !this.disposed && !this.scene.disposed && !this.scene._cleanupDone &&
      !this.scene.navigating && this.scene.sys.isActive();
  }

  isReady(hud) {
    return Boolean(hud && !hud._isDestroyed && hud.dom?.container &&
      hud.domAbortController && typeof hud.moneyChangeHandler === 'function');
  }

  async start() {
    const hud = await this.scene.ensureOverlayScene('UIScene');
    if (!hud || !this.isOwnerAlive()) return false;
    const ready = await this.waitForReady(hud);
    if (!ready || !this.isOwnerAlive()) return false;
    this.hud = hud;
    this.scene.scene.setVisible(true, 'UIScene');
    this.scene.bringSceneToTopIfActive('UIScene');
    hud.showHUD();
    hud.refreshMoneyHud();
    return true;
  }

  waitForReady(hud) {
    if (this.isReady(hud)) return Promise.resolve(true);
    return new Promise(resolve => {
      let finished = false;
      let timeout = null;
      const events = this.scene.game.events;
      const finish = value => {
        if (finished) return;
        finished = true;
        events.off('poststep', check);
        if (timeout !== null) clearTimeout(timeout);
        this.cancelWait = null;
        resolve(value);
      };
      const check = () => {
        if (!this.isOwnerAlive()) finish(false);
        else if (this.isReady(hud)) finish(true);
      };
      this.cancelWait = () => finish(false);
      events.on('poststep', check);
      timeout = setTimeout(() => finish(false), 8000);
      check();
    });
  }

  refreshMoney() {
    if (this.isOwnerAlive() && this.isReady(this.hud)) this.hud.refreshMoneyHud();
  }

  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelWait?.();
    // HTML survives a scene stop, so hide it explicitly while leaving the shop.
    if (this.isReady(this.hud)) this.hud.hideHUD();
    this.hud = null;
  }
}
