import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { SPY_SHOP_STOCK } from '../config/spyShopStock.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { spyShopPurchaseService } from '../managers/SpyShopPurchaseService.js';
import { SpyShopHudBridge } from '../ui/SpyShopHudBridge.js';
import { LocationDialoguePanel, LOCATION_PANEL } from '../ui/LocationDialoguePanel.js';
import { preloadShopPurchaseAudio, playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';

const KEY = 'SpyShopScene';
const CATALOG_KEY = 'piSpyShopItemCatalog';
const INSTRUCTION = 'Point at the shopkeeper, an item in the display case, or the door.';
const HOVER_HINTS = {
  exit: 'The street. The bell on the door will report you.',
  talk: 'The shopkeeper. Sells electronics, answers questions, forgets faces.',
  browse: 'Display case. Everything is behind glass for a reason.'
};
const GREETING = 'Welcome. If anyone asks, you bought batteries.';

// Współrzędne produktów w gablocie (znormalizowane, środek + rozmiar).
// Dopasuj w trybie debug (klawisz D); eksport (C) wypisuje gotowy obiekt do configu:
// SPY_SHOP_CONFIG.itemHotspots = { camera: {x,y,w,h}, ... }
const DEFAULT_ITEM_HOTSPOTS = {
  camera:           { x: 0.814, y: 0.317, w: 0.125, h: 0.150 },
  mobilePhone:      { x: 0.930, y: 0.300, w: 0.060, h: 0.186 },
  rubberDuck:       { x: 0.804, y: 0.552, w: 0.135, h: 0.177 },
  coolSpyGadget:    { x: 0.924, y: 0.538, w: 0.060, h: 0.228 },
  piBadge:          { x: 0.782, y: 0.781, w: 0.090, h: 0.166 },
  detectiveMonthly: { x: 0.889, y: 0.792, w: 0.100, h: 0.193 }
};

const FONT = {
  body: 'SpecialElite, "Courier New", monospace',
  pixel: 'PressStart2P, "Courier New", monospace'
};
const GOLD = 0xd4af37, GOLD_DIM = 0x8a6d1f, BROWN = 0x201409, PHOSPHOR = 0x85d4a4;
const P = LOCATION_PANEL;

function brackets(g, x, y, w, h, len, color, alpha = 1, width = 2) {
  g.lineStyle(width, color, alpha);
  const r = x + w, b = y + h;
  g.lineBetween(x, y, x + len, y); g.lineBetween(x, y, x, y + len);
  g.lineBetween(r, y, r - len, y); g.lineBetween(r, y, r, y + len);
  g.lineBetween(x, b, x + len, b); g.lineBetween(x, b, x, b - len);
  g.lineBetween(r, b, r - len, b); g.lineBetween(r, b, r, b - len);
}

// złota podwójna ramka jak w panelu rozmów
function goldPlate(g, x, y, w, h, alpha = 0.92) {
  g.fillStyle(0x000000, 0.35); g.fillRect(x + 4, y + 5, w, h);
  g.fillStyle(BROWN, alpha); g.fillRect(x, y, w, h);
  g.lineStyle(3, GOLD, 1); g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  g.lineStyle(1, GOLD_DIM, 0.9); g.strokeRect(x + 6, y + 6, w - 12, h - 12);
}

export class SpyShopScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  init() {
    this.disposed = false; this.navigating = false; this.buying = false; this.runToken = Symbol(KEY);
    this.hotspotDefs = SPY_SHOP_CONFIG.hotspots.map(h => ({ ...h })); this.hotspots = [];
    // Pola zgodne z SpyShopAnimations (animacje tła mają działać także przy otwartym dialogu):
    this.panel = null; this.confirmation = null; this.confirmedProduct = null;
    this.feedbackTimer = null; this.debugMode = false; this.selectedIndex = 0;
    this.balanceElapsed = 0; this.lastDisplayedCash = null; this.topHud = null;

    this.dialogue = null; this.dialogueMode = null; this.pendingPurchase = null;
    this.currentProductIndex = 0; this.askedTopics = new Set(); this.stamps = new Map();
    this.commLine = ''; this.typeEvent = null;
    this.header = null; this.cashBar = null; this.comm = null; this.cursor = null;
    this.feedback = null; this.moneyText = null; this.debugText = null;
  }

  preload() {
    preloadShopPurchaseAudio(this);
    const cfg = SPY_SHOP_CONFIG;
    if (cfg.backgroundUrl && !this.textures.exists(cfg.backgroundKey)) this.load.image(cfg.backgroundKey, cfg.backgroundUrl);
    if (this.cache.json.exists(CATALOG_KEY)) this.cache.json.remove(CATALOG_KEY);
    this.load.json(CATALOG_KEY, 'assets/data/ItemsCatalog.json');
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================
  create() {
    super.create(); this.registry.set('currentSceneKey', KEY);
    this.getRegisteredScene('PlayerHudScene')?.closeAllUIPanels?.(); this.stopSceneIfActive('PlayerHudScene');
    const news = this.getRegisteredScene('NewsHud');
    if (news) { news.setHudVisible?.(false); news.closeMenu?.(true); this.sleepSceneIfActive('NewsHud'); this.scene.setVisible(false, 'NewsHud'); }

    // UWAGA: SpyShopSceneWithAnimations szuka obrazu tła po SPY_SHOP_CONFIG.backgroundKey.
    this.drawBackground(); this.createAtmosphere();
    this.hotspotDefs = [...this.hotspotDefs, ...this.buildItemHotspotDefs()];
    this.hotspots = this.hotspotDefs.map((h, i) => this.createHotspot(h, i));
    const { width, height } = this.scale;
    this.createHeader(); this.createCommBar();
    this.debugText = this.add.text(24, height - 330, '', this.style(20)).setDepth(120);
    const exitBtn = this.makeButton(null, 0, 170, 'EXIT TO STREET', () => void this.exitShop(), 13);
    exitBtn.setX(width - 24 - exitBtn.btnWidth);
    this.trackInputEvent(this.input, 'drag', this.onHotspotDrag);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.events.once('shutdown', this.disposeShop, this); this.refreshHotspots(); this.refreshMoney();
    this.refreshOwnedStamps(); this.updateItemLabels();
    this.typeText(INSTRUCTION);
    this.topHud = new SpyShopHudBridge(this); void this.setupTopHud();
  }

  async setupTopHud() {
    const token = this.runToken;
    try {
      const ready = await this.topHud.start();
      if (this.disposed || this.runToken !== token || this.navigating) return;
      if (ready) { this.cashBar?.setVisible(false); this.refreshMoney(); }
      else console.warn('[SpyShopScene] Top HUD unavailable; using fallback balance.');
    } catch (error) {
      if (!this.disposed && this.runToken === token) console.error('[SpyShopScene] Top HUD setup failed:', error);
    }
  }

  style(size = 24) {
    return { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color: '#f5e5be',
      backgroundColor: '#25271f', padding: { x: 12, y: 9 } };
  }

  // ===========================================================================
  // TŁO (bez zmian) + winieta
  // ===========================================================================
  drawBackground() {
    const { width: w, height: h } = this.scale, cfg = SPY_SHOP_CONFIG;
    if (cfg.backgroundUrl && this.textures.exists(cfg.backgroundKey)) {
      this.add.image(w / 2, h / 2, cfg.backgroundKey).setDisplaySize(w, h); return;
    }
    const g = this.add.graphics();
    g.fillStyle(0x535c43).fillRect(0, 0, w, h); g.fillStyle(0x817051).fillRect(0, h * 0.72, w, h * 0.28);
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

  createAtmosphere() {
    const key = 'spyshop_vignette', { width, height } = this.scale;
    if (!this.textures.exists(key)) {
      const w = 960, h = 540, tex = this.textures.createCanvas(key, w, h);
      if (!tex) return;
      const ctx = tex.getContext();
      const grad = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.38, w / 2, h * 0.5, w * 0.62);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(8,6,2,0.55)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); tex.refresh();
    }
    this.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(4);
  }

  // ===========================================================================
  // PRODUKTY
  // ===========================================================================
  getProducts() {
    const catalog = this.cache.json.get(CATALOG_KEY);
    return SPY_SHOP_STOCK.map(ref => ({ ...ref, item: catalog?.[ref.category]?.[ref.key] ?? null }));
  }

  itemSpots() { return SPY_SHOP_CONFIG.itemHotspots ?? DEFAULT_ITEM_HOTSPOTS; }

  buildItemHotspotDefs() {
    const spots = this.itemSpots();
    return this.getProducts().flatMap((product, index) => {
      const spot = spots[product.key];
      if (!spot) return [];
      return [{ id: `item-${product.key}`, label: product.item?.name ?? product.key, action: 'item',
        productKey: product.key, productIndex: index, ...spot }];
    });
  }

  // ===========================================================================
  // NAGŁÓWEK, PASEK GOTÓWKI, PASEK KOMUNIKATÓW (styl paneli z LocationScene)
  // ===========================================================================
  createHeader() {
    const x = 24, y = 170, W = 430, H = 92;
    const c = this.add.container(x, y).setDepth(100), g = this.add.graphics();
    goldPlate(g, 0, 0, W, H);
    const title = this.add.text(26, 24, SPY_SHOP_CONFIG.title, { fontFamily: FONT.pixel, fontSize: '15px', color: '#d4af37' });
    const sub = this.add.text(26, 52, SPY_SHOP_CONFIG.subtitle, { fontFamily: FONT.body, fontSize: '16px', color: P.TEXT, wordWrap: { width: W - 60 } });
    const led = this.add.circle(W - 26, 24, 4, PHOSPHOR, 1);
    this.tweens.add({ targets: led, alpha: { from: 1, to: 0.15 }, duration: 900, yoyo: true, repeat: -1 });
    c.add([g, title, sub, led]); this.header = c;

    // zapasowy wyświetlacz gotówki (chowany, gdy działa górny HUD)
    const cash = this.add.container(x, y + H + 10).setDepth(100), cg = this.add.graphics();
    goldPlate(cg, 0, 0, W, 42);
    const label = this.add.text(24, 22, 'PRIVATE CASH', { fontFamily: FONT.pixel, fontSize: '9px', color: P.TOPIC_USED }).setOrigin(0, 0.5);
    this.moneyText = this.add.text(W - 22, 23, '$0', { fontFamily: FONT.pixel, fontSize: '16px', color: P.AMBER }).setOrigin(1, 0.5);
    cash.add([cg, label, this.moneyText]); this.cashBar = cash;
  }

  createCommBar() {
    const { width, height } = this.scale, x = 24, W = width - 48, H = 58, y = height - 84;
    const c = this.add.container(x, y).setDepth(110), g = this.add.graphics();
    goldPlate(g, 0, 0, W, H);
    const prompt = this.add.text(28, H / 2 + 1, '>', { fontFamily: FONT.pixel, fontSize: '16px', color: P.AMBER }).setOrigin(0, 0.5);
    this.feedback = this.add.text(58, H / 2, '', { fontFamily: FONT.body, fontSize: '22px', color: P.TEXT, wordWrap: { width: W - 110 } }).setOrigin(0, 0.5);
    this.cursor = this.add.rectangle(58, H / 2, 12, 22, PHOSPHOR, 0.9).setOrigin(0, 0.5);
    this.tweens.add({ targets: this.cursor, alpha: { from: 0.9, to: 0.1 }, duration: 420, yoyo: true, repeat: -1 });
    c.add([g, prompt, this.feedback, this.cursor]); this.comm = c;
  }

  placeCursor() {
    if (this.cursor?.active && this.feedback?.active) this.cursor.setX(this.feedback.x + this.feedback.width + 6);
  }

  typeText(str) {
    if (this.disposed || !this.feedback?.active || str === this.commLine) return;
    this.commLine = str; this.typeEvent?.remove(false);
    const t = this.feedback; let n = 0; t.setText(''); this.placeCursor();
    this.typeEvent = this.time.addEvent({ delay: 14, loop: true, callback: () => {
      if (this.disposed || !t.active) { this.typeEvent?.remove(false); this.typeEvent = null; return; }
      n = Math.min(str.length, n + 2); t.setText(str.slice(0, n)); this.placeCursor();
      if (n >= str.length) { this.typeEvent?.remove(false); this.typeEvent = null; }
    } });
  }

  say(text) {
    if (this.disposed || !this.feedback?.active) return;
    this.feedbackTimer?.remove(false); this.typeText(text);
    this.feedbackTimer = this.time.delayedCall(4000, () => {
      this.feedbackTimer = null;
      if (!this.disposed && this.feedback?.active) this.typeText(INSTRUCTION);
    });
  }

  // ===========================================================================
  // HOTSPOTY - celownik z linią skanującą
  // ===========================================================================
  canInteract() { return !this.disposed && !this._cleanupDone && !this.navigating && !this.buying; }

  itemHint(cfg) {
    const product = this.getProducts()[cfg.productIndex], item = product?.item;
    if (!item) return INSTRUCTION;
    const first = String(item.description || '').split(/(?<=[.!?])\s/)[0];
    return `${item.name}, $${product.price}. ${first}`.slice(0, 150);
  }

  hotspotLabel(cfg) {
    if (cfg.action !== 'item') return `> ${String(cfg.label).toUpperCase()}`;
    const product = this.getProducts()[cfg.productIndex];
    const owned = product && spyShopPurchaseService.inspect(product).reason === 'owned';
    return `> ${String(cfg.label).toUpperCase()}  ${owned ? 'OWNED' : `$${product?.price ?? '?'}`}`;
  }

  updateItemLabels() {
    for (const hot of this.hotspots) if (hot.cfg.action === 'item') hot.label.setText(this.hotspotLabel(hot.cfg));
  }

  createHotspot(cfg, index) {
    const isItem = cfg.action === 'item';
    const rect = this.add.rectangle(0, 0, 1, 1, 0xffd27d, 0).setDepth(isItem ? 12 : 10).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, this.hotspotLabel(cfg), { fontFamily: FONT.pixel, fontSize: '12px', color: '#ffd86b',
      backgroundColor: '#201409', padding: { x: 10, y: 8 } }).setDepth(30).setOrigin(0.5, 1).setVisible(false);
    const frame = this.add.graphics().setDepth(13).setVisible(false);
    const hotspot = { cfg, rect, label, frame, hovered: false }; rect.setData('hotspotIndex', index);
    rect.on('pointerover', () => {
      if (!this.canInteract() || this.debugMode) return;
      hotspot.hovered = true; label.setVisible(true);
      if (!this.feedbackTimer) this.typeText(isItem ? this.itemHint(cfg) : (HOVER_HINTS[cfg.action] || INSTRUCTION));
    });
    rect.on('pointerout', () => {
      if (this.debugMode) return;
      hotspot.hovered = false; label.setVisible(false); frame.clear().setVisible(false);
      if (!this.feedbackTimer) this.typeText(INSTRUCTION);
    });
    rect.on('pointerdown', () => {
      if (!this.canInteract()) return;
      if (this.debugMode) { this.selectedIndex = index; this.refreshHotspots(); return; }
      if (cfg.action === 'exit') { if (this.dialogue) this.closeDialogue(); else void this.exitShop(); }
      if (cfg.action === 'talk') this.openShopkeeper();
      if (cfg.action === 'browse') this.showItem(this.currentProductIndex, { intro: true });
      if (cfg.action === 'item') this.showItem(cfg.productIndex);
    }); this.syncHotspot(hotspot); return hotspot;
  }

  syncHotspot({ cfg, rect, label }) {
    const { width: w, height: h } = this.scale;
    const rw = Math.max(20, cfg.w * w), rh = Math.max(20, cfg.h * h);
    rect.setPosition(cfg.x * w, cfg.y * h).setSize(rw, rh); rect.input?.hitArea?.setTo(0, 0, rw, rh);
    label.setPosition(cfg.x * w, Math.max(150, cfg.y * h - rh / 2 - 6));
  }

  drawHotspotFrame(hot, time) {
    const g = hot.frame; if (!g?.active) return;
    g.clear();
    const show = hot.hovered && this.canInteract() && !this.debugMode;
    g.setVisible(show); if (!show) return;
    const r = hot.rect, w = r.width, h = r.height, l = r.x - w / 2, t = r.y - h / 2, rr = l + w, b = t + h;
    const pulse = 0.5 + 0.5 * Math.sin(time / 150);
    g.fillStyle(PHOSPHOR, 0.04 + 0.04 * pulse); g.fillRect(l, t, w, h);
    const sy = t + ((time / 9) % h);                       // linia skanująca
    g.fillStyle(PHOSPHOR, 0.1); g.fillRect(l, Math.max(t, sy - 10), w, Math.min(10, sy - t));
    g.fillStyle(PHOSPHOR, 0.45); g.fillRect(l, sy, w, 2);
    brackets(g, l - 4, t - 4, w + 8, h + 8, Math.min(36, w / 3, h / 3), PHOSPHOR, 0.7 + 0.3 * pulse, 3);
    g.lineStyle(2, PHOSPHOR, 0.5);
    g.lineBetween(r.x - 8, t - 4, r.x + 8, t - 4); g.lineBetween(r.x - 8, b + 4, r.x + 8, b + 4);
    g.lineBetween(l - 4, r.y - 8, l - 4, r.y + 8); g.lineBetween(rr + 4, r.y - 8, rr + 4, r.y + 8);
  }

  refreshHotspots() {
    if (this.disposed) return;
    const enabled = this.canInteract();
    for (const [i, hot] of this.hotspots.entries()) {
      if (hot.rect.input) hot.rect.input.enabled = enabled;
      this.input.setDraggable(hot.rect, enabled && this.debugMode);
      hot.rect.setFillStyle(0xffd27d, enabled && this.debugMode ? 0.2 : 0)
        .setStrokeStyle(enabled && this.debugMode ? 3 : 0, i === this.selectedIndex ? 0xff77c8 : 0xffd27d);
      if (!enabled) hot.hovered = false;
      hot.label.setVisible(enabled && this.debugMode);
      if (!enabled || this.debugMode) hot.frame.clear().setVisible(false);
    }
    const cfg = this.hotspotDefs[this.selectedIndex];
    this.debugText?.setText(this.debugMode && cfg ? [
      `DEBUG: ${cfg.id} | x:${cfg.x.toFixed(3)} y:${cfg.y.toFixed(3)} w:${cfg.w.toFixed(3)} h:${cfg.h.toFixed(3)}`,
      'Drag / arrows: move | Shift + arrows: resize | Alt: 1px', 'Tab: next | C: export | D / Escape: close'
    ].join('\n') : '');
  }

  onHotspotDrag(_pointer, object, x, y) {
    if (!this.canInteract() || !this.debugMode) return;
    const index = object.getData('hotspotIndex'); if (!Number.isInteger(index)) return;
    this.selectedIndex = index; const hot = this.hotspots[index];
    hot.cfg.x = Math.max(0, Math.min(1, x / this.scale.width)); hot.cfg.y = Math.max(0, Math.min(1, y / this.scale.height));
    this.syncHotspot(hot); this.refreshHotspots();
  }

  exportHotspots() {
    const round = value => Math.round(value * 1000) / 1000;
    const base = this.hotspotDefs.filter(h => h.action !== 'item');
    const items = {};
    for (const h of this.hotspotDefs) if (h.action === 'item') items[h.productKey] = { x: round(h.x), y: round(h.y), w: round(h.w), h: round(h.h) };
    console.log('SPY_SHOP_CONFIG.hotspots =', JSON.stringify(base, null, 2));
    console.log('SPY_SHOP_CONFIG.itemHotspots =', JSON.stringify(items, null, 2));
    this.say('Hotspot configuration exported to the console.');
  }

  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || this.disposed || this.navigating || this.buying) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      if (this.pendingPurchase) this.showItem(this.pendingPurchase.index);
      else if (this.dialogue) this.closeDialogue();
      else if (this.debugMode) { this.debugMode = false; this.refreshHotspots(); } else void this.exitShop();
      return;
    }
    if (this.dialogue && !this.debugMode) { this.onDialogueKey(event); return; }
    if (event.code === 'KeyD') { if (!event.repeat) { this.debugMode = !this.debugMode; this.refreshHotspots(); } return; }
    if (!this.debugMode || !this.hotspots.length) return;
    if (event.code === 'Tab') {
      event.preventDefault(); this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.hotspots.length) % this.hotspots.length;
    } else if (event.code === 'KeyC') {
      if (!event.repeat) this.exportHotspots();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault(); const hot = this.hotspots[this.selectedIndex];
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code), direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
      const field = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y'), size = horizontal ? this.scale.width : this.scale.height;
      hot.cfg[field] = Math.max(event.shiftKey ? 20 / size : 0, Math.min(1, hot.cfg[field] + direction * (event.altKey ? 1 : 5) / size)); this.syncHotspot(hot);
    } this.refreshHotspots();
  }

  // klawisze w dialogu: 1-9 = tematy, strzałki = poprzedni/następny przedmiot
  onDialogueKey(event) {
    const m = /^(Digit|Numpad)([1-9])$/.exec(event.code);
    if (m) { event.preventDefault(); this.dialogue?.triggerTopic(Number(m[2]) - 1); return; }
    if (this.dialogueMode === 'item' && !this.pendingPurchase && (event.code === 'ArrowLeft' || event.code === 'ArrowRight')) {
      event.preventDefault(); this.showItem(this.currentProductIndex + (event.code === 'ArrowLeft' ? -1 : 1));
    }
  }

  // ===========================================================================
  // PRZYCISK (EXIT) - styl panelu z LocationScene
  // ===========================================================================
  makeButton(parent, x, y, text, callback, size = 13, role = 'normal') {
    const c = this.add.container(x, y);
    const t = this.add.text(0, 0, text, { fontFamily: FONT.pixel, fontSize: `${size}px`, color: '#d4af37' }).setOrigin(0, 0.5);
    const padX = 22, padY = 14, w = Math.round(t.width + padX * 2), h = Math.round(t.height + padY * 2);
    t.setPosition(padX, h / 2 + 1);
    const g = this.add.graphics();
    const draw = hover => {
      if (!g.active) return;
      g.clear(); goldPlate(g, 0, 0, w, h, hover ? 1 : 0.92);
      if (hover) { g.fillStyle(GOLD, 0.12); g.fillRect(3, 3, w - 6, h - 6); }
    };
    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(true); if (t.active) t.setColor('#ffffff'); });
    hit.on('pointerout', () => { draw(false); if (t.active) t.setColor('#d4af37'); });
    hit.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation(); if (this.disposed || this.navigating || this.buying) return; callback();
    });
    draw(false); c.add([g, t, hit]); c.btnWidth = w; c.btnHeight = h;
    if (parent) parent.add(c); else c.setDepth(500);
    return c;
  }

  // ===========================================================================
  // DIALOG (jeden panel dla rozmowy i prezentacji towaru - jak w LocationScene)
  // ===========================================================================
  ensureDialogue() {
    if (this.dialogue?.isOpen) return this.dialogue;
    this.dialogue = new LocationDialoguePanel(this, {
      depth: 700, menuWidth: 340, leaveLabel: 'Step back', onLeave: () => this.closeDialogue()
    });
    this.comm?.setVisible(false);
    return this.dialogue;
  }

  closeDialogue() {
    if (this.buying) return;
    this.dialogue?.destroy(); this.dialogue = null;
    this.dialogueMode = null; this.pendingPurchase = null;
    this.comm?.setVisible(true); this.commLine = ''; this.typeText(INSTRUCTION);
    this.refreshHotspots();
  }

  shopkeeperName() {
    return this.hotspotDefs.find(h => h.id === 'shopkeeper')?.label ?? 'Shopkeeper';
  }

  // --- rozmowa ---------------------------------------------------------------
  openShopkeeper(text = GREETING) {
    if (!this.canInteract()) return;
    const d = this.ensureDialogue();
    this.dialogueMode = 'shopkeeper'; this.pendingPurchase = null;
    const key = SPY_SHOP_CONFIG.backgroundKey;
    d.setSpeaker({
      name: this.shopkeeperName(),
      portrait: this.textures.exists(key)
        ? { kind: 'crop', key, cx: 0.592, cy: 0.375, sideFrac: 0.276 }
        : { kind: 'emoji', text: '?' }
    });
    d.setStamp(null);
    d.setText(text);
    this.buildShopkeeperTopics();
  }

  buildShopkeeperTopics() {
    const d = this.dialogue; if (!d?.isOpen) return;
    const topics = SPY_SHOP_CONFIG.dialogue.map((line, i) => ({
      id: `q${i}`, label: line.question, state: this.askedTopics.has(`q${i}`) ? 'used' : 'normal',
      onSelect: () => this.askQuestion(i)
    }));
    topics.push({ id: 'gear', label: 'Show me the gear', state: 'accent', onSelect: () => this.showItem(this.currentProductIndex, { intro: true }) });
    d.setTopics(topics);
  }

  askQuestion(i) {
    const line = SPY_SHOP_CONFIG.dialogue[i], d = this.dialogue;
    if (!line || !d?.isOpen || this.dialogueMode !== 'shopkeeper') return;
    this.askedTopics.add(`q${i}`); d.setText(line.answer); this.buildShopkeeperTopics();
  }

  // --- prezentacja towaru ----------------------------------------------------
  itemPortrait(product) {
    const key = SPY_SHOP_CONFIG.backgroundKey;
    const spot = this.hotspotDefs.find(h => h.productKey === product.key);
    if (spot && this.textures.exists(key)) {
      const frame = this.textures.getFrame(key);
      const ratio = (frame.realWidth || frame.width) / (frame.realHeight || frame.height);
      return { kind: 'crop', key, cx: spot.x, cy: spot.y, sideFrac: Math.max(spot.w * ratio, spot.h) * 1.35 };
    }
    return { kind: 'emoji', text: product.item?.icon || '?' };
  }

  itemFooter(product, state) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (state.reason === 'owned') return { text: `$${product.price}  -  ALREADY YOURS`, color: P.GREEN };
    if (state.ok) return { text: `$${product.price}  -  CASH $${cash}`, color: P.AMBER };
    return { text: `$${product.price}  -  ${state.reason === 'funds' ? `SHORT BY $${product.price - cash}` : state.reason === 'full' ? 'POCKETS FULL' : 'UNAVAILABLE'}`, color: P.RED };
  }

  buyLabel(product, state) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (state.ok) return `Buy it  ($${product.price})`;
    if (state.reason === 'owned') return 'Buy it  (already yours)';
    if (state.reason === 'funds') return `Buy it  (short $${product.price - cash})`;
    if (state.reason === 'full') return 'Buy it  (pockets full)';
    return 'Buy it  (unavailable)';
  }

  showItem(index, { text = null, intro = false } = {}) {
    if (!this.canInteract()) return;
    const products = this.getProducts(); if (!products.length) return;
    const idx = ((index % products.length) + products.length) % products.length;
    const product = products[idx], item = product.item, state = spyShopPurchaseService.inspect(product);
    this.currentProductIndex = idx; this.pendingPurchase = null; this.dialogueMode = 'item';
    const d = this.ensureDialogue();
    d.setSpeaker({ name: item?.name ?? `Missing: ${product.key}`, portrait: this.itemPortrait(product) });
    d.setStamp(state.reason === 'owned' ? 'OWNED' : null);
    const description = item ? item.description : `Missing catalogue entry: ${product.category}.${product.key}`;
    const lead = intro ? 'Take a look. The glass is clean, the prices are not.\n\n' : '';
    const footer = this.itemFooter(product, state);
    d.setText(text ?? `${lead}${description}`, { footer: footer.text, footerColor: footer.color });
    this.buildItemTopics(idx);
  }

  buildItemTopics(idx) {
    const d = this.dialogue; if (!d?.isOpen) return;
    const product = this.getProducts()[idx], state = spyShopPurchaseService.inspect(product);
    d.setTopics([
      { id: 'buy', label: this.buyLabel(product, state), state: state.ok ? 'accent' : 'disabled', onSelect: () => this.askBuy(idx) },
      { id: 'test', label: 'Test drive', state: this.askedTopics.has(`t:${product.key}`) ? 'used' : 'normal', onSelect: () => this.testDrive(idx) },
      { id: 'next', label: 'Next item', state: 'normal', onSelect: () => this.showItem(idx + 1) },
      { id: 'prev', label: 'Previous item', state: 'normal', onSelect: () => this.showItem(idx - 1) },
      { id: 'talk', label: 'Talk to the shopkeeper', state: 'normal', onSelect: () => this.openShopkeeper('Anything else? Besides discounts.') }
    ]);
  }

  // odświeża tylko stopkę i menu (np. gdy zmieni się saldo), bez ponownego pisania tekstu
  refreshItemUi() {
    const d = this.dialogue;
    if (!d?.isOpen || this.dialogueMode !== 'item' || this.pendingPurchase) return;
    const product = this.getProducts()[this.currentProductIndex]; if (!product) return;
    const state = spyShopPurchaseService.inspect(product), footer = this.itemFooter(product, state);
    d.setFooter(footer.text, footer.color); this.buildItemTopics(this.currentProductIndex);
  }

  testDrive(idx) {
    const product = this.getProducts()[idx], d = this.dialogue;
    if (!product?.item || !d?.isOpen) return;
    const quip = product.item.metadata?.useMessage ?? 'You fiddle with it. Nothing explodes. A good start.';
    this.askedTopics.add(`t:${product.key}`);
    const state = spyShopPurchaseService.inspect(product), footer = this.itemFooter(product, state);
    d.setText(quip, { footer: footer.text, footerColor: footer.color }); this.buildItemTopics(idx);
  }

  // --- zakup (potwierdzenie w tym samym panelu) -----------------------------
  askBuy(idx) {
    const product = this.getProducts()[idx], d = this.dialogue;
    if (!product || !d?.isOpen || this.buying) return;
    const state = spyShopPurchaseService.inspect(product), footer = this.itemFooter(product, state);
    if (!state.ok) { d.setText(state.message, { footer: footer.text, footerColor: footer.color }); return; }
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.pendingPurchase = { index: idx, id: product.item.id, price: product.price };
    d.setText(`${product.item.name}: $${product.price}. Private cash only. Mark Agency does not reimburse. We checked.`,
      { footer: `BALANCE AFTER: $${cash - product.price}`, footerColor: P.AMBER });
    d.setTopics([
      { id: 'yes', label: 'Yes. Take my money.', state: 'accent', onSelect: () => this.confirmPurchase() },
      { id: 'no', label: 'Let me think about it.', state: 'normal', onSelect: () => this.showItem(idx) }
    ]);
  }

  confirmPurchase() {
    if (!this.pendingPurchase || this.buying || this.disposed || this.navigating || !this.dialogue?.isOpen) return;
    const quote = { ...this.pendingPurchase }, product = this.getProducts()[quote.index];
    if (product?.item?.id !== quote.id || product.price !== quote.price) {
      this.showItem(quote.index, { text: 'The offer changed. Please check the price again.' }); return;
    }
    this.buying = true;
    let result;
    try { result = spyShopPurchaseService.buy(product); }
    catch (error) {
      console.error('[SpyShopScene] Purchase UI failed:', error);
      result = { message: 'Purchase error. Check your balance before trying again.' };
    } finally { this.buying = false; }
    if (this.disposed) return;
    this.pendingPurchase = null;
    if (result.ok === true) playShopPurchaseAudio(this);
    this.refreshMoney(); this.refreshOwnedStamps(); this.updateItemLabels();
    this.showItem(quote.index, { text: result.message });
    if (result.ok === true) {
      this.dialogue?.setStamp('PAID', { slam: true });
      const spot = this.hotspotDefs.find(h => h.productKey === product.key);
      if (spot) this.purchaseSparks(spot.x * this.scale.width, spot.y * this.scale.height);
    }
  }

  // stempel "SOLD" na kupionych przedmiotach w gablocie
  refreshOwnedStamps() {
    if (this.disposed) return;
    const products = this.getProducts();
    for (const hot of this.hotspots) {
      if (hot.cfg.action !== 'item') continue;
      const owned = spyShopPurchaseService.inspect(products[hot.cfg.productIndex]).reason === 'owned';
      const existing = this.stamps.get(hot.cfg.id);
      if (owned && !existing) this.stamps.set(hot.cfg.id, this.makeSoldStamp(hot));
      else if (!owned && existing) { existing.destroy(); this.stamps.delete(hot.cfg.id); }
    }
  }

  makeSoldStamp(hot) {
    const t = this.add.text(0, 1, 'SOLD', { fontFamily: FONT.pixel, fontSize: '10px', color: '#ff5a4d' }).setOrigin(0.5);
    const w = t.width + 14, h = t.height + 12, g = this.add.graphics();
    g.fillStyle(0x0b0805, 0.7); g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(2, 0xd9382f, 1); g.strokeRect(-w / 2, -h / 2, w, h);
    return this.add.container(hot.rect.x, hot.rect.y, [g, t]).setDepth(14).setAngle(-9).setAlpha(0.9);
  }

  purchaseSparks(x, y) {
    if (this.disposed) return;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 50 + Math.random() * 60;
      const p = this.add.circle(x, y, 3 + Math.random() * 3, i % 2 ? GOLD : 0xf0d48a).setDepth(260);
      this.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist - 20, alpha: 0, scale: 0.2,
        duration: 600 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => { if (p.active) p.destroy(); } });
    }
  }

  // ===========================================================================
  // SALDO, PĘTLA, WYJŚCIE
  // ===========================================================================
  refreshMoney() {
    if (this.disposed) return;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH); this.lastDisplayedCash = cash;
    this.moneyText?.setText(`$${cash}`); this.topHud?.refreshMoney();
  }

  update(time, delta) {
    if (this.disposed) return;
    for (const hot of this.hotspots) if (hot.hovered) this.drawHotspotFrame(hot, time);
    if (this.navigating || this.buying) return;
    this.balanceElapsed += delta; if (this.balanceElapsed < 500) return; this.balanceElapsed = 0;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (cash !== this.lastDisplayedCash) {
      this.refreshMoney(); this.refreshOwnedStamps(); this.updateItemLabels(); this.refreshItemUi();
    }
  }

  async exitShop() {
    if (this.disposed || this.navigating || this.buying) return false;
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueMode = null; this.pendingPurchase = null;
    this.navigating = true; const token = this.runToken; this.refreshHotspots();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'spy-shop', fromScene: KEY, gameState });
    if (this.disposed || this.runToken !== token) return moved !== false;
    this.navigating = false; this.comm?.setVisible(true); this.refreshHotspots();
    if (moved === false) this.say('The street could not be opened. Please try again.'); return moved !== false;
  }

  disposeShop() {
    if (this.disposed) return;
    this.disposed = true; this.runToken = null; this.topHud?.destroy(); this.topHud = null;
    this.feedbackTimer?.remove(false); this.feedbackTimer = null;
    this.typeEvent?.remove(false); this.typeEvent = null;
    this.dialogue?.destroy(); this.dialogue = null; this.dialogueMode = null; this.pendingPurchase = null;
    this.stamps.clear(); this.panel = null; this.confirmation = null; this.confirmedProduct = null;
    this.hotspots = []; this.header = null; this.cashBar = null; this.comm = null; this.cursor = null;
    this.feedback = null; this.moneyText = null;
  }
}