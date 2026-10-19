import { BaseScene } from './BaseScene.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { SHOP_CONFIG } from '../config/shopConfig.js';

export class ShopScene extends BaseScene {
  constructor() { super({ key: 'ShopScene' }); }
  init(data = {}) {
    this.returnTo = data.returnScene || data.returnTo || 'CrimeCityScene';
    this.debugMode = false;
    this.selectedIndex = 0;
    this.buying = false;
    this.exiting = false;
    this.stockEntries = [];
    this.hotspots = [];
    this.products = SHOP_CONFIG.hotspots.map(cfg => ({ ...cfg, item: { ...cfg.item } }));
    this.stockPage = 0;
    this.hudPanelOpen = false;
    this.shopHud = null;
    this.feedback = null;
  }
  preload() {
    if (!this.textures.exists('shop_bg')) this.load.image('shop_bg', 'assets/local/shop.jpg');
  }
  create() {
    super.create();
    const { width, height } = this.scale;
    this.add.image(width / 2, height / 2, 'shop_bg').setDisplaySize(width, height);
    this.moneyText = this.add.text(16, 16, '', this.style(16)).setDepth(100);
    this.hotspots = this.products.map((cfg, index) => this.createHotspot(cfg, index));
    this.boardContainer = this.add.container(0, 0).setDepth(90);
    this.createStockBoard();
    this.add.text(width - 20, 16, '[EXIT]', this.style(16)).setOrigin(1, 0)
      .setDepth(100).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.exitShop());
    this.debugText = this.add.text(16, height - 130, '', this.style(13)).setDepth(200);
    const keyboard = this.input.keyboard;
    this.keyHandler = event => this.onKey(event);
    keyboard?.on('keydown', this.keyHandler);
    this.moneyHandler = () => this.refreshMoneyHUD();
    window.addEventListener('lost-artifacts:money-changed', this.moneyHandler);
    this.panelHandler = state => {
      this.hudPanelOpen = Boolean(state?.gameplaySceneKey === 'ShopScene' && state.anyPanelOpen);
    };
    this.events.once('shutdown', () => {
      keyboard?.off('keydown', this.keyHandler);
      window.removeEventListener('lost-artifacts:money-changed', this.moneyHandler);
      this.shopHud?.events.off('panelStateChanged', this.panelHandler);
      this.shopHud = null;
    });
    this.refreshMoneyHUD();
    void this.setupShopHud();
  }
  async setupShopHud() {
    try {
      const hud = await this.restorePlayerHud();
      if (this._cleanupDone || !this.sys.isActive() || this.exiting || !hud) return;
      this.shopHud = hud;
      hud.events.on('panelStateChanged', this.panelHandler);
      hud.closeAllUIPanels();
      hud.setCurrentGameplayScene('ShopScene');
      hud.refreshUI?.();
      hud.showHud();
      this.hudPanelOpen = hud.isAnyPanelOpen();
    } catch (error) { console.error('[ShopScene] HUD setup failed:', error); }
  }
  style(size = 16) {
    return { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`,
      color: '#fff1ce', backgroundColor: '#191b16', padding: { x: 8, y: 6 } };
  }
  createStockBoard() {
    this.boardContainer.removeAll(true);
    this.stockEntries = [];
    const { x, y } = SHOP_CONFIG.stockBoard;
    const perPage = Math.max(1, Math.floor((this.scale.height - y - 200) / 30));
    const pages = Math.max(1, Math.ceil(this.products.length / perPage));
    this.stockPage = Math.min(this.stockPage, pages - 1);
    const visible = this.products.slice(this.stockPage * perPage, (this.stockPage + 1) * perPage);
    const panelHeight = 100 + visible.length * 30;
    const board = this.add.rectangle(x, y, 280, panelHeight, 0x191b16, 0.96)
      .setOrigin(0).setStrokeStyle(2, 0x8a7a4d).setInteractive();
    this.boardContainer.add(board);
    this.boardContainer.add(this.add.text(x + 12, y + 10, "TODAY'S STOCK", this.style(17)));
    visible.forEach((cfg, i) => {
      const entry = this.add.text(x + 12, y + 43 + i * 30,
        `${cfg.label} — $${cfg.price}`, this.style(16)).setInteractive({ useHandCursor: true });
      entry.on('pointerdown', () => this.buyItem(cfg));
      this.boardContainer.add(entry);
      this.stockEntries.push({ cfg, entry });
    });
    const footerY = y + panelHeight - 42;
    this.boardContainer.add(this.add.text(x + 75, footerY, `${this.stockPage + 1}/${pages}`, this.style(14)));
    for (const [label, offset, delta] of [['<', 12, -1], ['>', 235, 1]]) {
      const button = this.add.text(x + offset, footerY, label, this.style(16))
        .setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => {
        if (this.hudPanelOpen) return;
        this.stockPage = (this.stockPage + delta + pages) % pages;
        this.createStockBoard();
        this.refreshMoneyHUD();
      });
      this.boardContainer.add(button);
    }
  }
  createHotspot(cfg, index) {
    const rect = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0xffd166, 0)
      .setDepth(10).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, '', this.style(16)).setOrigin(0.5, 1)
      .setDepth(20).setVisible(false);
    const hs = { cfg, rect, label };
    rect.on('pointerover', () => {
      if (this.debugMode || this.hudPanelOpen) return;
      rect.setFillStyle(0xffd166, 0.18);
      label.setText(`${cfg.label} — $${cfg.price}`).setVisible(true);
    });
    rect.on('pointerout', () => {
      if (this.debugMode) return;
      rect.setFillStyle(0xffd166, 0);
      label.setVisible(false);
    });
    rect.on('pointerdown', () => {
      if (this.hudPanelOpen) return;
      if (this.debugMode) { this.selectedIndex = index; this.updateDebug(); }
      else this.buyItem(cfg);
    });
    this.input.setDraggable(rect, false);
    rect.on('drag', (pointer, x, y) => {
      if (!this.debugMode || this.hudPanelOpen) return;
      cfg.x = Math.round(x); cfg.y = Math.round(y);
      this.syncHotspot(hs);
      this.updateDebug();
    });
    this.syncHotspot(hs);
    return hs;
  }
  syncHotspot({ cfg, rect, label }) {
    rect.setPosition(cfg.x, cfg.y).setSize(cfg.w, cfg.h);
    rect.input.hitArea.setTo(0, 0, cfg.w, cfg.h);
    label.setPosition(cfg.x, cfg.y - cfg.h / 2 - 8);
  }
  buyItem(cfg) {
    if (this.debugMode || this.buying || this.exiting || this.hudPanelOpen) return;
    if (!Number.isInteger(cfg.price) || cfg.price <= 0 || !cfg.item?.id || !cfg.item?.name) {
      console.error('[ShopScene] Invalid product:', cfg);
      this.showFeedback('This item is not ready for sale.'); return;
    }
    const existing = inventoryManager.getItem(cfg.item.id);
    if (existing && !(existing.stackable === true && cfg.item.stackable === true)) {
      this.showFeedback('You already own this item.'); return;
    }
    const capacity = inventoryManager.getCapacity();
    if (!existing && capacity.current >= capacity.max) {
      this.showFeedback('Inventory full. Even detectives need pockets.'); return;
    }
    this.buying = true;
    try {
      const purchase = moneyManager.spend(cfg.price, {
        source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.ITEM,
        description: `Shop: ${cfg.label}`, metadata: { itemId: cfg.item.id }
      });
      if (!purchase.ok) { this.showFeedback('Not enough money!'); return; }
      const added = inventoryManager.addItem({ ...cfg.item });
      if (!added) {
        moneyManager.refund(cfg.price, {
          source: MONEY_SOURCE.CASH, description: `Shop refund: ${cfg.label}`,
          metadata: { itemId: cfg.item.id, purchaseId: purchase.transaction.id }
        });
        this.showFeedback('Item could not be added. Payment refunded.'); return;
      }
      const saved = saveGameState();
      this.showFeedback(saved ? `Bought: ${cfg.item.name} (-$${cfg.price})`
        : 'Bought, but autosave failed. Save your game before leaving.');
    } catch (error) {
      console.error('[ShopScene] Purchase failed:', error);
      this.showFeedback('Purchase error. Check the console before trying again.');
    } finally {
      this.buying = false;
      this.refreshMoneyHUD();
    }
  }
  refreshMoneyHUD() {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.moneyText?.setText(`Cash: $${cash}`);
    this.stockEntries.forEach(({ cfg, entry }) => entry.setColor(cash >= cfg.price ? '#fff1ce' : '#858575'));
  }
  showFeedback(text) {
    this.feedback?.destroy();
    const message = this.add.text(this.scale.width / 2, 65, text, {
      ...this.style(18), wordWrap: { width: Math.max(100, this.scale.width - 60) }, align: 'center'
    }).setOrigin(0.5, 0).setDepth(250);
    this.feedback = message;
    this.time.delayedCall(3500, () => { if (message.active) message.destroy(); });
  }
  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
    if (this.hudPanelOpen) return;
    if (event.code === 'Escape') { this.exitShop(); return; }
    if (event.code === 'KeyD') { this.debugMode = !this.debugMode; this.updateDebug(); return; }
    if (!this.debugMode || !this.hotspots.length) return;
    if (event.code === 'KeyC') { this.printConfig(); return; }
    if (event.code === 'Tab') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.hotspots.length;
      this.updateDebug(); return;
    }
    if (!event.code.startsWith('Arrow')) return;
    event.preventDefault();
    const hs = this.hotspots[this.selectedIndex];
    const cfg = hs.cfg;
    const step = event.altKey ? 1 : 5;
    const horizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
    const direction = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    cfg[key] += direction * step;
    cfg.w = Math.max(10, cfg.w); cfg.h = Math.max(10, cfg.h);
    this.syncHotspot(hs);
    this.updateDebug();
  }
  updateDebug() {
    this.hotspots.forEach((hs, i) => {
      hs.rect.setFillStyle(0x00ff88, this.debugMode ? 0.2 : 0);
      hs.rect.setStrokeStyle(this.debugMode ? 2 : 0, i === this.selectedIndex ? 0xff44ff : 0x00ff88);
      this.input.setDraggable(hs.rect, this.debugMode);
      hs.label.setText(hs.cfg.label).setVisible(this.debugMode);
    });
    const cfg = this.hotspots[this.selectedIndex]?.cfg;
    this.debugText.setText(this.debugMode
      ? `DEBUG: ${cfg?.id || 'no items'} | x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}\nArrows: move | Shift: resize | Alt: 1px | Tab: next | C: export\nPurchases disabled. D: close debug.` : '');
  }
  printConfig() {
    console.log('COPY INTO config/shopConfig.js -> hotspots:');
    console.log(JSON.stringify(this.products, null, 2));
  }
  exitShop() {
    if (this.exiting || this.buying || this.hudPanelOpen) return;
    this.exiting = true;
    this.shopHud?.closeAllUIPanels();
    const target = this.returnTo;
    if (this.scene.isPaused(target)) { this.scene.resume(target); this.scene.stop(); }
    else if (this.scene.isSleeping(target)) { this.scene.wake(target); this.scene.stop(); }
    else if (this.scene.isActive(target)) {
      this.shopHud?.setCurrentGameplayScene(target);
      this.scene.bringToTop(target); this.scene.stop();
    } else this.scene.start(target);
  }
}