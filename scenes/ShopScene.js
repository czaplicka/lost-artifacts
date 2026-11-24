import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { SHOP_CONFIG } from '../config/shopConfig.js';
import { preloadShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';
import { ShopAmbientAnimations } from './shop/ShopAmbientAnimations.js';
import { LOCAL_DEBUG_ALLOWED, normalizeCityId, QUIPS } from './shop/ShopSceneData.js';
import { shopSceneView } from './shop/ShopSceneView.js';
import { shopSceneStock } from './shop/ShopSceneStock.js';
import { shopSceneSpeech } from './shop/ShopSceneSpeech.js';
import { shopScenePurchase } from './shop/ShopScenePurchase.js';
import { shopSceneDebug } from './shop/ShopSceneDebug.js';

export class ShopScene extends BaseScene {
  constructor() { super({ key: 'ShopScene' }); }

  init(data = {}) {
    this.returnTo = data.returnScene || data.returnTo || 'CrimeCityScene';
    this.cityId = normalizeCityId(data.cityId || gameState.crimeCityId || gameState.currentMission?.city);
    this.debugMode = false; this.selectedIndex = 0; this.debugText = null;
    this.buying = false; this.exiting = false; this.stockEntries = []; this.hotspots = [];
    this.allProducts = SHOP_CONFIG.hotspots.map(cfg => ({ ...cfg, item: { ...cfg.item } }));
    this.products = this.pickTodaysProducts(this.allProducts);
    this.stockPage = 0; this.hudPanelOpen = false; this.shopHud = null;
    this.shopRunToken = {};
    this.shopDialogue = null; this.shopAmbientAnimations = null; this.greetingTimer = null; this.bubbleFadeTimer = null;

    // UI (nowe)
    this.stockRows = [];
    this.boardContainer = null;
    this.tag = null; this.tagCfg = null;
    this.toast = null; this.toastTimer = null;
    this.bubble = null; this.bubbleTimer = null; this.idleTimer = null; this.lastQuip = null;
    this.cashPlate = null; this.cashText = null; this.moneyText = null;
    this.cashState = { display: null, tween: null };
    this.shopSign = null; this.exitButton = null; this.registerZone = null;
  }

  preload() {
    preloadShopPurchaseAudio(this);
    if (!this.textures.exists('shop_bg')) this.load.image('shop_bg', 'assets/local/shop.webp');
  }

  create() {
    super.create();
    const { width, height } = this.scale, runToken = this.shopRunToken;

    // Tło używane przez ShopAmbientAnimations — zachowaj klucz 'shop_bg'.
    const background = this.add.image(width / 2, height / 2, 'shop_bg').setDisplaySize(width, height);
    this.createAtmosphere(width, height);

    this.hotspots = this.products.map((cfg, index) => this.createHotspot(cfg, index));
    this.createRegisterZone();
    this.createSign();
    this.createCashPlate();
    this.createTagCard();
    this.boardContainer = this.add.container(0, 0).setDepth(90);
    this.createStockBoard();
    this.createExitButton();

    if (LOCAL_DEBUG_ALLOWED) this.debugText = this.add.text(16, height - 130, '', {
      ...this.style(13), wordWrap: { width: Math.max(100, width - 32) } }).setDepth(400).setVisible(false);

    const keyboard = this.input.keyboard;
    const escapeHandler = event => this.onEscape(event), debugHandler = event => this.onDebugKey(event);
    keyboard?.on('keydown-ESC', escapeHandler); if (LOCAL_DEBUG_ALLOWED) keyboard?.on('keydown', debugHandler);
    const moneyHandler = () => this.refreshMoneyHUD();
    window.addEventListener('lost-artifacts:money-changed', moneyHandler);
    const hoverHandler = time => this.updateHover(time);
    this.events.on('update', hoverHandler);
    const panelHandler = state => {
      this.hudPanelOpen = Boolean(state?.gameplaySceneKey === 'ShopScene' && state.anyPanelOpen);
      if (this.hudPanelOpen) { this.destroyBubble(); this.hideTooltip(); if (this.debugMode) this.setDebugMode(false); this.clearHotspotHighlights(); }
    };
    const cleanup = () => {
      this.events.off('shutdown', cleanup); this.events.off('destroy', cleanup);
      this.greetingTimer?.remove(false); this.greetingTimer = null;
      this.destroyBubble(); this.destroyToast();
      this.shopAmbientAnimations?.destroy(); this.shopAmbientAnimations = null;
      keyboard?.off('keydown-ESC', escapeHandler); if (LOCAL_DEBUG_ALLOWED) keyboard?.off('keydown', debugHandler);
      window.removeEventListener('lost-artifacts:money-changed', moneyHandler);
      this.events.off('update', hoverHandler);
      this.cashState.tween?.stop?.(); this.cashState.tween = null;
      this.toastTimer?.remove(false); this.bubbleTimer?.remove(false); this.idleTimer?.remove(false);
      this.toastTimer = this.bubbleTimer = this.idleTimer = null;
      this.shopHud?.events.off('panelStateChanged', panelHandler); this.shopHud = null;
      if (this.shopRunToken === runToken) this.shopRunToken = null;
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);

    this.refreshMoneyHUD(true);
    this.greetingTimer = this.time.delayedCall(800, () => {
      if (this.shopRunToken !== runToken) return;
      this.greetingTimer = null;
      this.sayQuip(QUIPS.greeting);
    });
    void this.setupShopHud(runToken, panelHandler);
    if (background?.active) this.shopAmbientAnimations = new ShopAmbientAnimations(this, background);
    else console.warn('[ShopAmbientAnimations] shop_bg image not found.');
  }

  async setupShopHud(runToken, panelHandler) {
    try {
      const hud = await this.restorePlayerHud();
      if (this.shopRunToken !== runToken || this._cleanupDone || !this.sys.isActive() || this.exiting || !hud) return;
      this.shopHud = hud; hud.events.on('panelStateChanged', panelHandler); hud.closeAllUIPanels();
      hud.setCurrentGameplayScene('ShopScene'); hud.refreshUI?.(); hud.showHud();
      this.hudPanelOpen = hud.isAnyPanelOpen();
      if (this.hudPanelOpen) { this.destroyBubble(); this.setDebugMode(false); this.hideTooltip(); this.clearHotspotHighlights(); }
    } catch (error) { console.error('[ShopScene] HUD setup failed:', error); }
  }

  exitShop() {
    if (this.exiting || this.buying || this.hudPanelOpen) return;
    this.setDebugMode(false); this.exiting = true; this.hideTooltip(); this.clearHotspotHighlights();
    this.destroyBubble(); this.destroyToast(); this.shopHud?.closeAllUIPanels();
    const target = this.returnTo;
    if (this.scene.isPaused(target)) { this.scene.resume(target); this.scene.stop(); }
    else if (this.scene.isSleeping(target)) { this.scene.wake(target); this.scene.stop(); }
    else if (this.scene.isActive(target)) { this.shopHud?.setCurrentGameplayScene(target); this.scene.bringToTop(target); this.scene.stop(); }
    else this.scene.start(target);
  }

}

Object.assign(ShopScene.prototype, shopSceneView, shopSceneStock, shopSceneSpeech, shopScenePurchase, shopSceneDebug);
