import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { SPY_SHOP_STOCK } from '../config/spyShopStock.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { spyShopPurchaseService } from '../managers/SpyShopPurchaseService.js';
import { SpyShopHudBridge } from '../ui/SpyShopHudBridge.js';

const KEY = 'SpyShopScene';
const CATALOG_KEY = 'piSpyShopItemCatalog';
const INSTRUCTION = 'Select the shopkeeper, display cabinet, or exit.';

export class SpyShopScene extends BaseScene {
  constructor() { super({ key: KEY }); }
  init() {
    this.disposed = false;
    this.navigating = false;
    this.buying = false;
    this.runToken = Symbol(KEY);
    this.hotspotDefs = SPY_SHOP_CONFIG.hotspots.map(h => ({ ...h }));
    this.hotspots = [];
    this.panel = null;
    this.panelBody = null;
    this.panelType = null;
    this.confirmation = null;
    this.confirmedProduct = null;
    this.feedbackTimer = null;
    this.debugMode = false;
    this.selectedIndex = 0;
    this.selectedProductIndex = 0;
    this.statusMessage = '';
    this.balanceElapsed = 0;
    this.lastDisplayedCash = null;
    this.topHud = null;
  }
  preload() {
    const cfg = SPY_SHOP_CONFIG;
    if (cfg.backgroundUrl && !this.textures.exists(cfg.backgroundKey)) this.load.image(cfg.backgroundKey, cfg.backgroundUrl);
    if (this.cache.json.exists(CATALOG_KEY)) this.cache.json.remove(CATALOG_KEY);
    this.load.json(CATALOG_KEY, 'assets/data/ItemsCatalog.json');
  }
  create() {
    super.create();
    this.registry.set('currentSceneKey', KEY);
    // Only the bottom gameplay menu is disabled. UIScene is the top HTML HUD.
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.();
    this.stopSceneIfActive('PlayerHudScene');
    const news = this.getRegisteredScene('NewsHud');
    if (news) {
      news.setHudVisible?.(false); news.closeMenu?.(true);
      this.sleepSceneIfActive('NewsHud'); this.scene.setVisible(false, 'NewsHud');
    }
    this.drawBackground();
    this.hotspots = this.hotspotDefs.map((h, i) => this.createHotspot(h, i));
    const { width, height } = this.scale;
    this.add.text(24, 170, SPY_SHOP_CONFIG.title, this.style(28)).setDepth(100);
    this.add.text(24, 220, SPY_SHOP_CONFIG.subtitle, this.style(21)).setDepth(100);
    // Fallback balance remains available if the HTML HUD fails to load.
    this.moneyText = this.add.text(24, 268, '', this.style(23)).setDepth(100);
    this.feedback = this.add.text(24, height - 90, INSTRUCTION, {
      ...this.style(24), wordWrap: { width: width - 80 }
    }).setDepth(110);
    this.debugText = this.add.text(24, height - 220, '', this.style(20)).setDepth(120);
    this.makeButton(null, width - 230, 170, 'Exit to street', () => void this.exitShop(), 22);
    this.trackInputEvent(this.input, 'drag', this.onHotspotDrag);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.events.once('shutdown', this.disposeShop, this);
    this.refreshHotspots(); this.refreshMoney();
    this.topHud = new SpyShopHudBridge(this);
    void this.setupTopHud();
  }
  async setupTopHud() {
    const token = this.runToken;
    try {
      const ready = await this.topHud.start();
      if (this.disposed || this.runToken !== token || this.navigating) return;
      if (ready) {
        this.moneyText?.setVisible(false);
        this.refreshMoney();
      } else console.warn('[SpyShopScene] Top HUD unavailable; using fallback balance.');
    } catch (error) {
      if (!this.disposed && this.runToken === token) console.error('[SpyShopScene] Top HUD setup failed:', error);
    }
  }
  style(size = 24) {
    return { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color: '#f5e5be',
      backgroundColor: '#25271f', padding: { x: 12, y: 9 } };
  }
  drawBackground() {
    const { width: w, height: h } = this.scale;
    const cfg = SPY_SHOP_CONFIG;
    if (cfg.backgroundUrl && this.textures.exists(cfg.backgroundKey)) {
      this.add.image(w / 2, h / 2, cfg.backgroundKey).setDisplaySize(w, h); return;
    }
    const g = this.add.graphics();
    g.fillStyle(0x535c43).fillRect(0, 0, w, h);
    g.fillStyle(0x817051).fillRect(0, h * 0.72, w, h * 0.28);
    g.lineStyle(3, 0x635039, 0.6);
    for (let x = 0; x < w; x += w / 12) g.lineBetween(x, h * 0.72, x, h);
    g.fillStyle(0x40372b).fillRect(w * 0.055, h * 0.17, w * 0.17, h * 0.62);
    g.fillStyle(0x81938b).fillRect(w * 0.075, h * 0.21, w * 0.13, h * 0.33);
    g.fillStyle(0xc6a967).fillCircle(w * 0.20, h * 0.61, 8);
    g.fillStyle(0x342f27).fillRect(w * 0.31, h * 0.23, w * 0.31, h * 0.32);
    for (let i = 0; i < 3; i++) {
      g.fillStyle(0x8b7552).fillRect(w * 0.31, h * (0.23 + i * 0.13), w * 0.31, 10);
      for (let j = 0; j < 5; j++) g.fillStyle(0x5c6557).fillRect(w * (0.33 + j * 0.055), h * (0.26 + i * 0.13), w * 0.04, h * 0.06);
    }
    g.fillStyle(0xb8ac87).fillRoundedRect(w * 0.445, h * 0.39, w * 0.08, h * 0.20, 12);
    g.fillStyle(0xdec09e).fillCircle(w * 0.485, h * 0.355, h * 0.045);
    g.lineStyle(4, 0x3e3c33).strokeCircle(w * 0.474, h * 0.35, 11).strokeCircle(w * 0.497, h * 0.35, 11);
    g.fillStyle(0x77573d).fillRect(w * 0.28, h * 0.56, w * 0.36, h * 0.24);
    g.fillStyle(0xad895c).fillRect(w * 0.27, h * 0.55, w * 0.38, h * 0.035);
    g.fillStyle(0x383c34).fillRect(w * 0.69, h * 0.19, w * 0.24, h * 0.58);
    g.fillStyle(0x779081, 0.5).fillRect(w * 0.705, h * 0.21, w * 0.21, h * 0.53);
    for (let i = 0; i < 3; i++) g.fillStyle(0xbdad80).fillRect(w * 0.70, h * (0.37 + i * 0.17), w * 0.22, 9);
    this.add.text(w * 0.81, h * 0.29, 'CAMERA   PHONE', this.style(23)).setOrigin(0.5);
    this.add.text(w * 0.81, h * 0.46, 'DUCK   GADGET', this.style(23)).setOrigin(0.5);
    this.add.text(w * 0.81, h * 0.63, 'BADGE   MAGAZINE', this.style(23)).setOrigin(0.5);
    this.add.text(w / 2, h * 0.87, 'Temporary background — no image required.', this.style(18)).setOrigin(0.5);
  }
  canInteract() { return !this.disposed && !this._cleanupDone && !this.navigating && !this.buying && !this.panel; }
  createHotspot(cfg, index) {
    const rect = this.add.rectangle(0, 0, 1, 1, 0xffd27d, 0).setDepth(10).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, cfg.label, this.style(24)).setDepth(30).setOrigin(0.5, 1).setVisible(false);
    const hotspot = { cfg, rect, label };
    rect.setData('hotspotIndex', index);
    rect.on('pointerover', () => {
      if (!this.canInteract() || this.debugMode) return;
      rect.setFillStyle(0xffd27d, 0.12); label.setVisible(true);
    });
    rect.on('pointerout', () => { if (!this.debugMode) { rect.setFillStyle(0xffd27d, 0); label.setVisible(false); } });
    rect.on('pointerdown', () => {
      if (!this.canInteract()) return;
      if (this.debugMode) { this.selectedIndex = index; this.refreshHotspots(); return; }
      if (cfg.action === 'exit') void this.exitShop();
      if (cfg.action === 'talk') this.openConversation();
      if (cfg.action === 'browse') this.openCatalogue();
    });
    this.syncHotspot(hotspot); return hotspot;
  }
  syncHotspot({ cfg, rect, label }) {
    const { width: w, height: h } = this.scale;
    const rw = Math.max(20, cfg.w * w), rh = Math.max(20, cfg.h * h);
    rect.setPosition(cfg.x * w, cfg.y * h).setSize(rw, rh);
    rect.input?.hitArea?.setTo(0, 0, rw, rh);
    label.setPosition(cfg.x * w, Math.max(140, cfg.y * h - rh / 2 - 6));
  }
  refreshHotspots() {
    if (this.disposed) return;
    const enabled = this.canInteract();
    for (const [i, hot] of this.hotspots.entries()) {
      if (hot.rect.input) hot.rect.input.enabled = enabled;
      this.input.setDraggable(hot.rect, enabled && this.debugMode);
      hot.rect.setFillStyle(0xffd27d, enabled && this.debugMode ? 0.2 : 0)
        .setStrokeStyle(enabled && this.debugMode ? 3 : 0, i === this.selectedIndex ? 0xff77c8 : 0xffd27d);
      hot.label.setVisible(enabled && this.debugMode);
    }
    const cfg = this.hotspotDefs[this.selectedIndex];
    this.debugText?.setText(this.debugMode && !this.panel && cfg ? [
      `DEBUG: ${cfg.id} | x:${cfg.x.toFixed(3)} y:${cfg.y.toFixed(3)} w:${cfg.w.toFixed(3)} h:${cfg.h.toFixed(3)}`,
      'Drag / arrows: move | Shift + arrows: resize | Alt: 1px',
      'Tab: next | C: export | D / Escape: close'
    ].join('\n') : '');
  }
  onHotspotDrag(_pointer, object, x, y) {
    if (!this.canInteract() || !this.debugMode) return;
    const index = object.getData('hotspotIndex');
    if (!Number.isInteger(index)) return;
    this.selectedIndex = index;
    const hot = this.hotspots[index];
    hot.cfg.x = Math.max(0, Math.min(1, x / this.scale.width));
    hot.cfg.y = Math.max(0, Math.min(1, y / this.scale.height));
    this.syncHotspot(hot); this.refreshHotspots();
  }
  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || this.disposed || this.navigating || this.buying) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.confirmation) this.closeConfirmation();
      else if (this.panel) this.closePanel();
      else if (this.debugMode) { this.debugMode = false; this.refreshHotspots(); }
      else void this.exitShop();
      return;
    }
    if (this.panel) return;
    if (event.code === 'KeyD') {
      if (!event.repeat) { this.debugMode = !this.debugMode; this.refreshHotspots(); }
      return;
    }
    if (!this.debugMode || !this.hotspots.length) return;
    if (event.code === 'Tab') {
      event.preventDefault();
      this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.hotspots.length) % this.hotspots.length;
    } else if (event.code === 'KeyC') {
      console.log('SPY_SHOP_CONFIG.hotspots =', JSON.stringify(this.hotspotDefs, null, 2));
      this.say('Hotspot configuration exported to the console.');
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault();
      const hot = this.hotspots[this.selectedIndex];
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code);
      const direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
      const field = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
      const size = horizontal ? this.scale.width : this.scale.height;
      hot.cfg[field] = Math.max(event.shiftKey ? 20 / size : 0, Math.min(1, hot.cfg[field] + direction * (event.altKey ? 1 : 5) / size));
      this.syncHotspot(hot);
    }
    this.refreshHotspots();
  }
  makeButton(parent, x, y, text, callback, size = 24, role = 'normal') {
    const button = this.add.text(x, y, text, this.style(size)).setDepth(500).setInteractive({ useHandCursor: true });
    if (parent) parent.add(button);
    button.on('pointerover', () => button.setColor('#ffdb86'));
    button.on('pointerout', () => button.setColor('#f5e5be'));
    button.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation();
      if (this.disposed || this.navigating || this.buying) return;
      if (this.confirmation && role !== 'confirmation') return;
      callback();
    });
    return button;
  }
  openPanel(title, type) {
    if (!this.canInteract() || this.debugMode) return false;
    const { width: w, height: h } = this.scale;
    this.panelType = type;
    this.panel = this.add.container(0, 0).setDepth(600);
    this.panel.add(this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.76).setInteractive());
    this.panel.add(this.add.rectangle(w / 2, h / 2, w * 0.88, h * 0.82, 0x25271f).setStrokeStyle(3, 0xb8a06d));
    this.panel.add(this.add.text(w * 0.09, h * 0.13, title, this.style(30)));
    this.makeButton(this.panel, w * 0.82, h * 0.13, 'Close', () => this.closePanel());
    this.panelBody = this.add.container(0, 0); this.panel.add(this.panelBody);
    this.refreshHotspots(); return true;
  }
  closePanel() {
    if (this.buying || this.confirmation) return;
    const panel = this.panel;
    this.panel = null; this.panelBody = null; this.panelType = null;
    panel?.destroy(); this.refreshHotspots();
  }
  openConversation() {
    if (!this.openPanel('SHOPKEEPER', 'conversation')) return;
    const { width: w, height: h } = this.scale;
    const answer = this.add.text(w * 0.11, h * 0.25, 'Welcome. If anyone asks, you bought batteries.', {
      ...this.style(28), wordWrap: { width: w * 0.73 }
    });
    this.panelBody.add(answer);
    SPY_SHOP_CONFIG.dialogue.forEach((line, i) => {
      this.makeButton(this.panelBody, w * 0.11, h * (0.48 + i * 0.075), line.question, () => answer.setText(line.answer), 25);
    });
  }
  getProducts() {
    const catalog = this.cache.json.get(CATALOG_KEY);
    return SPY_SHOP_STOCK.map(ref => ({ ...ref, item: catalog?.[ref.category]?.[ref.key] ?? null }));
  }
  openCatalogue() {
    if (!this.openPanel('EQUIPMENT CATALOGUE', 'catalogue')) return;
    this.statusMessage = ''; this.renderCatalogue(this.selectedProductIndex);
  }
  renderCatalogue(selected = 0) {
    if (this.disposed || !this.panelBody || this.panelType !== 'catalogue') return;
    this.panelBody.removeAll(true);
    const { width: w, height: h } = this.scale;
    const products = this.getProducts();
    this.selectedProductIndex = Math.max(0, Math.min(selected, products.length - 1));
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.panelBody.add(this.add.text(w * 0.10, h * 0.21, `Private cash: $${cash}`, this.style(24)));
    products.forEach((product, i) => {
      const state = spyShopPurchaseService.inspect(product);
      const name = product.item?.name ?? `Missing: ${product.key}`;
      const owned = state.reason === 'owned' ? ' [Owned]' : '';
      const button = this.makeButton(this.panelBody, w * 0.10, h * (0.29 + i * 0.061),
        `${name} — $${product.price}${owned}`, () => this.renderCatalogue(i), 24);
      if (i === this.selectedProductIndex) button.setColor('#ffdb86');
    });
    const product = products[this.selectedProductIndex];
    const item = product?.item;
    const state = spyShopPurchaseService.inspect(product);
    const description = item ? `${item.name}\n\n${item.description}\n\nPrice: $${product.price}`
      : `Missing catalogue entry:\n${product?.category}.${product?.key}\n\nInstall the supplied ItemsCatalog.json.`;
    this.panelBody.add(this.add.text(w * 0.50, h * 0.27, description, {
      ...this.style(25), wordWrap: { width: w * 0.33 }, lineSpacing: 7
    }));
    this.panelBody.add(this.add.text(w * 0.50, h * 0.60, state.message, {
      ...this.style(22), wordWrap: { width: w * 0.33 }
    }));
    if (state.ok) {
      this.makeButton(this.panelBody, w * 0.50, h * 0.70, `Buy for $${product.price}`, () => this.requestPurchase(this.selectedProductIndex), 27);
    } else {
      this.panelBody.add(this.add.text(w * 0.50, h * 0.70,
        state.reason === 'owned' ? 'Owned' : 'Purchase unavailable', { ...this.style(25), color: '#aaa590' }));
    }
    this.panelBody.add(this.add.text(w * 0.10, h * 0.81, this.statusMessage || 'Private purchases. Mark Agency does not pay for these.', {
      ...this.style(21), wordWrap: { width: w * 0.72 }
    }));
  }
  requestPurchase(index) {
    if (this.disposed || this.navigating || this.buying || this.confirmation || this.panelType !== 'catalogue') return;
    const product = this.getProducts()[index];
    const state = spyShopPurchaseService.inspect(product);
    if (!state.ok) { this.statusMessage = state.message; this.renderCatalogue(index); return; }
    this.confirmedProduct = { index, id: product.item.id, price: product.price };
    const { width: w, height: h } = this.scale;
    this.confirmation = this.add.container(0, 0).setDepth(1000);
    this.confirmation.add(this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8).setInteractive());
    this.confirmation.add(this.add.rectangle(w / 2, h / 2, w * 0.58, h * 0.38, 0x25271f).setStrokeStyle(3, 0xb8a06d));
    this.confirmation.add(this.add.text(w * 0.24, h * 0.35,
      `Buy ${product.item.name} for $${product.price}?\n\nThis uses your private cash.`, {
        ...this.style(28), wordWrap: { width: w * 0.50 }, lineSpacing: 8
      }));
    this.makeButton(this.confirmation, w * 0.29, h * 0.57, 'Confirm purchase', () => this.confirmPurchase(), 26, 'confirmation');
    this.makeButton(this.confirmation, w * 0.60, h * 0.57, 'Cancel', () => this.closeConfirmation(), 26, 'confirmation');
  }
  closeConfirmation() {
    if (this.buying) return;
    this.confirmation?.destroy(); this.confirmation = null; this.confirmedProduct = null;
  }
  confirmPurchase() {
    if (!this.confirmation || !this.confirmedProduct || this.buying || this.disposed || this.navigating) return;
    const quote = { ...this.confirmedProduct };
    const product = this.getProducts()[quote.index];
    if (product?.item?.id !== quote.id || product.price !== quote.price) {
      this.closeConfirmation(); this.statusMessage = 'The offer changed. Please check the price again.';
      this.renderCatalogue(quote.index); return;
    }
    this.buying = true;
    let result;
    try { result = spyShopPurchaseService.buy(product); }
    catch (error) {
      console.error('[SpyShopScene] Purchase UI failed:', error);
      result = { message: 'Purchase error. Check your balance before trying again.' };
    } finally { this.buying = false; }
    this.closeConfirmation();
    if (this.disposed) return;
    this.statusMessage = result.message;
    this.refreshMoney(); this.renderCatalogue(quote.index);
  }
  refreshMoney() {
    if (this.disposed) return;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.lastDisplayedCash = cash;
    this.moneyText?.setText(`Private cash: $${cash}`);
    this.topHud?.refreshMoney();
  }
  update(_time, delta) {
    if (this.disposed || this.navigating || this.buying) return;
    this.balanceElapsed += delta;
    if (this.balanceElapsed < 500) return;
    this.balanceElapsed = 0;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (cash !== this.lastDisplayedCash) {
      this.refreshMoney();
      if (this.panelType === 'catalogue' && !this.confirmation) this.renderCatalogue(this.selectedProductIndex);
    }
  }
  say(text) {
    if (this.disposed || !this.feedback?.active) return;
    this.feedbackTimer?.remove(false); this.feedback.setText(text);
    this.feedbackTimer = this.time.delayedCall(4000, () => {
      if (!this.disposed && this.feedback?.active) this.feedback.setText(INSTRUCTION);
      this.feedbackTimer = null;
    });
  }
  async exitShop() {
    if (this.disposed || this.navigating || this.panel || this.buying || this.confirmation) return false;
    this.navigating = true;
    const token = this.runToken; this.refreshHotspots();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'spy-shop', fromScene: KEY, gameState });
    if (this.disposed || this.runToken !== token) return moved !== false;
    this.navigating = false; this.refreshHotspots();
    if (moved === false) this.say('The street could not be opened. Please try again.');
    return moved !== false;
  }
  disposeShop() {
    if (this.disposed) return;
    this.disposed = true; this.runToken = null;
    this.topHud?.destroy(); this.topHud = null;
    this.feedbackTimer?.remove(false); this.feedbackTimer = null;
    this.confirmation?.destroy(); this.confirmation = null; this.confirmedProduct = null;
    this.panel?.destroy(); this.panel = null; this.panelBody = null; this.panelType = null;
    this.hotspots = [];
  }
}
