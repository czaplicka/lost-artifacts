import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { SPY_SHOP_CONFIG } from '../config/spyShopConfig.js';
import { SPY_SHOP_STOCK } from '../config/spyShopStock.js';
import { moneyManager, MONEY_SOURCE } from '../managers/MoneyManager.js';
import { spyShopPurchaseService } from '../managers/SpyShopPurchaseService.js';
import { SpyShopHudBridge } from '../ui/SpyShopHudBridge.js';
import { preloadShopPurchaseAudio, playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';

const KEY = 'SpyShopScene';
const CATALOG_KEY = 'piSpyShopItemCatalog';
const INSTRUCTION = __dialogueText("scenes/SpyShopScene.js", "t_974b14128b6171e451fb");
const HOVER_HINTS = {
  exit: __dialogueText("scenes/SpyShopScene.js", "t_9e5243412dab95bfc80c"),
  talk: __dialogueText("scenes/SpyShopScene.js", "t_e88308e8f22668fc629e"),
  browse: __dialogueText("scenes/SpyShopScene.js", "t_b637cfd251db6a898777")
};

// ---------------------------------------------------------------------------
// Motyw wizualny "spy / grid": terminal, siatka, celownik, akta (zielony fosfor + złoto)
// ---------------------------------------------------------------------------
const FONT = {
  body: __dialogueText("scenes/SpyShopScene.js", "t_749639cb7eb80c7ff9a7"),
  pixel: __dialogueText("scenes/SpyShopScene.js", "t_8579050150a2d7c2e239")
};
const C = {
  ink: 0x050b09, panel: 0x0b1713, panelHi: 0x132a22, panelSel: 0x1b3a2f,
  line: 0x2f8f6b, lineDim: 0x174836, glow: 0x85d4a4,
  gold: 0xd4af37, goldLight: 0xf0d48a, amber: 0xffc66d,
  red: 0xd9382f
};
const T = {
  text: __dialogueText("scenes/SpyShopScene.js", "t_a6738021d76713b60162"), dim: '#7fa898', glow: '#85d4a4', gold: '#d4af37',
  amber: '#ffc66d', red: '#ff7a6b', ink: '#050b09'
};

function gridLines(g, x, y, w, h, step, color, alpha) {
  g.lineStyle(1, color, alpha);
  for (let gx = x + step; gx < x + w; gx += step) g.lineBetween(gx, y, gx, y + h);
  for (let gy = y + step; gy < y + h; gy += step) g.lineBetween(x, gy, x + w, gy);
}
function brackets(g, x, y, w, h, len, color, alpha = 1, width = 2) {
  g.lineStyle(width, color, alpha);
  const r = x + w, b = y + h;
  g.lineBetween(x, y, x + len, y); g.lineBetween(x, y, x, y + len);
  g.lineBetween(r, y, r - len, y); g.lineBetween(r, y, r, y + len);
  g.lineBetween(x, b, x + len, b); g.lineBetween(x, b, x, b - len);
  g.lineBetween(r, b, r - len, b); g.lineBetween(r, b, r, b - len);
}
function termBox(g, x, y, w, h, { fill = C.panel, fillAlpha = 0.96, stroke = C.line, strokeAlpha = 1, shadow = true } = {}) {
  if (shadow) { g.fillStyle(0x000000, 0.4); g.fillRect(x + 5, y + 6, w, h); }
  g.fillStyle(fill, fillAlpha); g.fillRect(x, y, w, h);
  g.lineStyle(2, stroke, strokeAlpha); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export class SpyShopScene extends BaseScene {
  constructor() { super({ key: KEY }); }

  init() {
    this.disposed = false; this.navigating = false; this.buying = false; this.runToken = Symbol(KEY);
    this.hotspotDefs = SPY_SHOP_CONFIG.hotspots.map(h => ({ ...h })); this.hotspots = [];
    this.panel = null; this.panelBody = null; this.panelType = null; this.confirmation = null; this.confirmedProduct = null;
    this.feedbackTimer = null; this.debugMode = false; this.selectedIndex = 0; this.selectedProductIndex = 0;
    this.statusMessage = ''; this.balanceElapsed = 0; this.lastDisplayedCash = null; this.topHud = null;

    // UI (nowe)
    this.statusKind = 'info'; this.win = null; this.cardCenter = null;
    this.commLine = ''; this.typeEvent = null; this.convoEvent = null; this.convo = null;
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
    this.hotspots = this.hotspotDefs.map((h, i) => this.createHotspot(h, i));
    const { width, height } = this.scale;
    this.createHeader(); this.createCommBar();
    this.debugText = this.add.text(24, height - 220, '', this.style(20)).setDepth(120);
    const exitBtn = this.makeButton(null, 0, 170, __dialogueText("scenes/SpyShopScene.js", "t_33495d1a11f67c8c7282"), () => void this.exitShop(), 13);
    exitBtn.setX(width - 24 - exitBtn.btnWidth);
    this.trackInputEvent(this.input, 'drag', this.onHotspotDrag);
    if (this.input.keyboard) this.trackInputEvent(this.input.keyboard, 'keydown', this.onKey);
    this.events.once('shutdown', this.disposeShop, this); this.refreshHotspots(); this.refreshMoney();
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
    this.add.text(w * 0.81, h * 0.29, __dialogueText("scenes/SpyShopScene.js", "t_6bdf75e63e8e4b99322a"), this.style(23)).setOrigin(0.5);
    this.add.text(w * 0.81, h * 0.46, __dialogueText("scenes/SpyShopScene.js", "t_00939134a7f108eb3ea1"), this.style(23)).setOrigin(0.5);
    this.add.text(w * 0.81, h * 0.63, __dialogueText("scenes/SpyShopScene.js", "t_6c5e4231b328d4d5a693"), this.style(23)).setOrigin(0.5);
    this.add.text(w / 2, h * 0.87, __dialogueText("scenes/SpyShopScene.js", "t_cf6e0ebef12b8befcbcd"), this.style(18)).setOrigin(0.5);
  }

  createAtmosphere() {
    const key = 'spyshop_vignette', { width, height } = this.scale;
    if (!this.textures.exists(key)) {
      const w = 960, h = 540, tex = this.textures.createCanvas(key, w, h);
      if (!tex) return;
      const ctx = tex.getContext();
      const grad = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.38, w / 2, h * 0.5, w * 0.62);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, __dialogueText("scenes/SpyShopScene.js", "t_796be9e1ba2ee61a5d51"));
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); tex.refresh();
    }
    this.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(4);
  }

  // ===========================================================================
  // NAGŁÓWEK + PASEK GOTÓWKI + PASEK KOMUNIKATÓW
  // ===========================================================================
  createHeader() {
    const x = 24, y = 170, W = 430, H = 92;
    const c = this.add.container(x, y).setDepth(100), g = this.add.graphics();
    termBox(g, 0, 0, W, H);
    gridLines(g, 0, 0, W, H, 23, C.line, 0.08);
    g.fillStyle(C.gold, 1); g.fillRect(0, 0, 6, H);
    brackets(g, 10, 8, W - 20, H - 16, 12, C.glow, 0.55, 2);
    const title = this.add.text(26, 24, SPY_SHOP_CONFIG.title, { fontFamily: FONT.pixel, fontSize: '15px', color: T.gold });
    title.setShadow(0, 0, T.gold, 5, false, true);
    const sub = this.add.text(26, 52, SPY_SHOP_CONFIG.subtitle, { fontFamily: FONT.body, fontSize: '15px', color: T.dim, wordWrap: { width: W - 60 } });
    const led = this.add.circle(W - 24, 22, 4, C.glow, 1);
    this.tweens.add({ targets: led, alpha: { from: 1, to: 0.15 }, duration: 900, yoyo: true, repeat: -1 });
    c.add([g, title, sub, led]); this.header = c;

    // zapasowy wyświetlacz gotówki (chowany, gdy działa HUD z góry)
    const cash = this.add.container(x, y + H + 10).setDepth(100), cg = this.add.graphics();
    termBox(cg, 0, 0, W, 40);
    cg.fillStyle(C.amber, 1); cg.fillRect(0, 0, 6, 40);
    const label = this.add.text(24, 21, __dialogueText("scenes/SpyShopScene.js", "t_cd3b3c6f9d48cbd42ddd"), { fontFamily: FONT.pixel, fontSize: '9px', color: T.dim }).setOrigin(0, 0.5);
    this.moneyText = this.add.text(W - 20, 22, __dialogueText("scenes/SpyShopScene.js", "t_ce66470e18f3579ac766"), { fontFamily: FONT.pixel, fontSize: '16px', color: T.amber }).setOrigin(1, 0.5);
    this.moneyText.setShadow(0, 0, T.amber, 6, false, true);
    cash.add([cg, label, this.moneyText]); this.cashBar = cash;
  }

  createCommBar() {
    const { width, height } = this.scale, x = 24, W = width - 48, H = 58, y = height - 84;
    const c = this.add.container(x, y).setDepth(110), g = this.add.graphics();
    termBox(g, 0, 0, W, H, { fillAlpha: 0.94 });
    gridLines(g, 6, 0, W - 6, H, 29, C.line, 0.07);
    g.fillStyle(C.gold, 1); g.fillRect(0, 0, 6, H);
    const prompt = this.add.text(26, H / 2 + 1, __dialogueText("scenes/SpyShopScene.js", "t_62b67e1f685b7fef5110"), { fontFamily: FONT.pixel, fontSize: '16px', color: T.amber }).setOrigin(0, 0.5);
    this.feedback = this.add.text(58, H / 2, '', { fontFamily: FONT.body, fontSize: '22px', color: T.text, wordWrap: { width: W - 110 } }).setOrigin(0, 0.5);
    this.cursor = this.add.rectangle(58, H / 2, 12, 22, C.glow, 0.9).setOrigin(0, 0.5);
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
  canInteract() { return !this.disposed && !this._cleanupDone && !this.navigating && !this.buying && !this.panel; }

  createHotspot(cfg, index) {
    const rect = this.add.rectangle(0, 0, 1, 1, 0xffd27d, 0).setDepth(10).setInteractive({ useHandCursor: true });
    const label = this.add.text(0, 0, `${__dialogueText("scenes/SpyShopScene.js", "t_ec4f8e3d1f7cafbdb86e")}${String(cfg.label).toUpperCase()}`, { fontFamily: FONT.pixel, fontSize: '12px', color: T.glow,
      backgroundColor: T.ink, padding: { x: 10, y: 8 } }).setDepth(30).setOrigin(0.5, 1).setVisible(false);
    const frame = this.add.graphics().setDepth(11).setVisible(false);
    const hotspot = { cfg, rect, label, frame, hovered: false }; rect.setData('hotspotIndex', index);
    rect.on('pointerover', () => {
      if (!this.canInteract() || this.debugMode) return;
      hotspot.hovered = true; label.setVisible(true);
      if (!this.feedbackTimer) this.typeText(HOVER_HINTS[cfg.action] || INSTRUCTION);
    });
    rect.on('pointerout', () => {
      if (this.debugMode) return;
      hotspot.hovered = false; label.setVisible(false); frame.clear().setVisible(false);
      if (!this.feedbackTimer) this.typeText(INSTRUCTION);
    });
    rect.on('pointerdown', () => {
      if (!this.canInteract()) return;
      if (this.debugMode) { this.selectedIndex = index; this.refreshHotspots(); return; }
      if (cfg.action === 'exit') void this.exitShop();
      if (cfg.action === 'talk') this.openConversation();
      if (cfg.action === 'browse') this.openCatalogue();
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
    g.fillStyle(C.glow, 0.04 + 0.04 * pulse); g.fillRect(l, t, w, h);
    const sy = t + ((time / 9) % h);                       // linia skanująca
    g.fillStyle(C.glow, 0.1); g.fillRect(l, Math.max(t, sy - 10), w, Math.min(10, sy - t));
    g.fillStyle(C.glow, 0.45); g.fillRect(l, sy, w, 2);
    brackets(g, l - 4, t - 4, w + 8, h + 8, Math.min(36, w / 3, h / 3), C.glow, 0.7 + 0.3 * pulse, 3);
    g.lineStyle(2, C.glow, 0.5);                           // znaczniki na środkach boków
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
    this.debugText?.setText(this.debugMode && !this.panel && cfg ? [
      `${__dialogueText("scenes/SpyShopScene.js", "t_deb9999885f0d88d5926")}${cfg.id}${__dialogueText("scenes/SpyShopScene.js", "t_01c59aaed25f30342584")}${cfg.x.toFixed(3)}${__dialogueText("scenes/SpyShopScene.js", "t_8278a5c11d3d9380f821")}${cfg.y.toFixed(3)}${__dialogueText("scenes/SpyShopScene.js", "t_1b89a9604b178452218e")}${cfg.w.toFixed(3)}${__dialogueText("scenes/SpyShopScene.js", "t_3f4674b8e35cc249a199")}${cfg.h.toFixed(3)}`,
      __dialogueText("scenes/SpyShopScene.js", "t_f7371edff8b7159ace9e"), __dialogueText("scenes/SpyShopScene.js", "t_458f8836a23129874150")
    ].join(__dialogueText("scenes/SpyShopScene.js", "t_01ba4719c80b6fe911b0")) : '');
  }

  onHotspotDrag(_pointer, object, x, y) {
    if (!this.canInteract() || !this.debugMode) return;
    const index = object.getData('hotspotIndex'); if (!Number.isInteger(index)) return;
    this.selectedIndex = index; const hot = this.hotspots[index];
    hot.cfg.x = Math.max(0, Math.min(1, x / this.scale.width)); hot.cfg.y = Math.max(0, Math.min(1, y / this.scale.height));
    this.syncHotspot(hot); this.refreshHotspots();
  }

  onKey(event) {
    const target = event.target;
    if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || this.disposed || this.navigating || this.buying) return;
    if (event.code === __dialogueText("scenes/SpyShopScene.js", "t_037c968467aa3fd7c059")) {
      event.preventDefault();
      if (this.confirmation) this.closeConfirmation(); else if (this.panel) this.closePanel();
      else if (this.debugMode) { this.debugMode = false; this.refreshHotspots(); } else void this.exitShop(); return;
    }
    if (this.panel) { this.onPanelKey(event); return; }
    if (event.code === 'KeyD') { if (!event.repeat) { this.debugMode = !this.debugMode; this.refreshHotspots(); } return; }
    if (!this.debugMode || !this.hotspots.length) return;
    if (event.code === __dialogueText("scenes/SpyShopScene.js", "t_90ddf1963abb36c9921c")) {
      event.preventDefault(); this.selectedIndex = (this.selectedIndex + (event.shiftKey ? -1 : 1) + this.hotspots.length) % this.hotspots.length;
    } else if (event.code === 'KeyC') {
      console.log('SPY_SHOP_CONFIG.hotspots =', JSON.stringify(this.hotspotDefs, null, 2)); this.say(__dialogueText("scenes/SpyShopScene.js", "t_aa538dbe205dd1955c2a"));
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      event.preventDefault(); const hot = this.hotspots[this.selectedIndex];
      const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code), direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
      const field = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y'), size = horizontal ? this.scale.width : this.scale.height;
      hot.cfg[field] = Math.max(event.shiftKey ? 20 / size : 0, Math.min(1, hot.cfg[field] + direction * (event.altKey ? 1 : 5) / size)); this.syncHotspot(hot);
    } this.refreshHotspots();
  }

  // klawiatura w panelach: strzałki + Enter w katalogu, 1-4 w rozmowie, Enter w potwierdzeniu
  onPanelKey(event) {
    if (this.confirmation) {
      if ((event.code === __dialogueText("scenes/SpyShopScene.js", "t_dc8659db6d416dc32fca") || event.code === 'NumpadEnter') && !event.repeat) { event.preventDefault(); this.confirmPurchase(); }
      return;
    }
    if (this.panelType === 'catalogue') {
      const n = this.getProducts().length; if (!n) return;
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault(); this.renderCatalogue((this.selectedProductIndex + (event.code === 'ArrowUp' ? -1 : 1) + n) % n);
      } else if ((event.code === __dialogueText("scenes/SpyShopScene.js", "t_dc8659db6d416dc32fca") || event.code === 'NumpadEnter') && !event.repeat) {
        event.preventDefault(); this.requestPurchase(this.selectedProductIndex);
      }
    } else if (this.panelType === 'conversation') {
      const m = /^(Digit|Numpad)([1-9])$/.exec(event.code);
      if (m) this.askShopkeeper(Number(m[2]) - 1);
    }
  }

  // ===========================================================================
  // KOMPONENTY UI: przycisk, wiersz, pieczątka
  // ===========================================================================
  makeButton(parent, x, y, text, callback, size = 13, role = 'normal') {
    const c = this.add.container(x, y);
    const t = this.add.text(0, 0, text, { fontFamily: FONT.pixel, fontSize: `${size}px`, color: T.glow }).setOrigin(0, 0.5);
    const padX = 20, padY = 14, w = Math.round(t.width + padX * 2), h = Math.round(t.height + padY * 2);
    t.setPosition(padX, h / 2 + 1);
    const g = this.add.graphics();
    const draw = hover => {
      if (!g.active) return;
      g.clear(); g.fillStyle(0x000000, 0.4); g.fillRect(3, 4, w, h);
      g.fillStyle(hover ? C.panelSel : C.panel, 1); g.fillRect(0, 0, w, h);
      g.lineStyle(2, hover ? C.amber : C.line, 1); g.strokeRect(1, 1, w - 2, h - 2);
      g.fillStyle(hover ? C.amber : C.glow, 1); g.fillRect(0, 0, 5, h);
    };
    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(true); if (t.active) t.setColor(T.amber); });
    hit.on('pointerout', () => { draw(false); if (t.active) t.setColor(T.glow); });
    hit.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation(); if (this.disposed || this.navigating || this.buying) return;
      if (this.confirmation && role !== 'confirmation') return; callback();
    });
    draw(false); c.add([g, t, hit]); c.btnWidth = w; c.btnHeight = h;
    if (parent) parent.add(c); else c.setDepth(500);
    return c;
  }

  makeRow(parent, x, y, w, h, opts, onClick) {
    const { num = '', label = '', right = '', rightColor = T.amber, dim = false, selected: initial = false } = opts;
    const c = this.add.container(x, y), g = this.add.graphics();
    let selected = initial, hover = false;
    const numText = this.add.text(16, h / 2 + 1, num, { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }).setOrigin(0, 0.5);
    const lab = this.add.text(62, h / 2, label, { fontFamily: FONT.body, fontSize: '22px', color: T.text }).setOrigin(0, 0.5);
    const rt = right ? this.add.text(w - 18, h / 2 + 1, right, { fontFamily: FONT.pixel, fontSize: '12px', color: rightColor }).setOrigin(1, 0.5) : null;
    const maxW = w - 62 - (rt ? rt.width + 36 : 18);
    let size = 22; while (lab.width > maxW && size > 12) { size--; lab.setFontSize(size); }
    const draw = () => {
      if (!g.active) return;
      g.clear(); g.fillStyle(selected ? C.panelSel : hover ? C.panelHi : C.panel, 0.96); g.fillRect(0, 0, w, h);
      g.fillStyle(selected ? C.amber : C.line, selected ? 1 : 0.6); g.fillRect(0, 0, 4, h);
      g.lineStyle(1, selected ? C.amber : C.lineDim, selected ? 0.9 : 0.8); g.strokeRect(0.5, 0.5, w - 1, h - 1);
      numText.setColor(selected ? T.amber : T.dim); lab.setColor(selected ? '#ffffff' : (dim ? T.dim : T.text));
    };
    const hit = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { hover = true; draw(); });
    hit.on('pointerout', () => { hover = false; draw(); });
    hit.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation();
      if (this.disposed || this.navigating || this.buying || this.confirmation) return; onClick();
    });
    draw(); c.add([g, numText, lab]); if (rt) c.add(rt); c.add(hit);
    c.setSelected = value => { selected = value; draw(); };
    if (parent) parent.add(c); return c;
  }

  makeStamp(text, colorInt, hex, size = 14) {
    const c = this.add.container(0, 0), t = this.add.text(0, 1, text, { fontFamily: FONT.pixel, fontSize: `${size}px`, color: hex }).setOrigin(0.5);
    const w = t.width + 30, h = t.height + 22, g = this.add.graphics();
    g.fillStyle(C.ink, 0.6); g.fillRect(-w / 2, -h / 2, w, h);
    g.lineStyle(3, colorInt, 1); g.strokeRect(-w / 2, -h / 2, w, h);
    g.lineStyle(1, colorInt, 0.7); g.strokeRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10);
    c.add([g, t]); return c;
  }

  slamStamp(text, x, y) {
    if (!this.panel) return;
    const s = this.makeStamp(text, C.glow, T.glow, 28).setPosition(x, y).setAngle(-10).setScale(2.6).setAlpha(0);
    this.panel.add(s);
    this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: 180, ease: 'Cubic.easeIn', onComplete: () => {
      if (!s.active) return; this.cameras.main.shake(110, 0.0025);
      this.time.delayedCall(900, () => {
        if (s.active) this.tweens.add({ targets: s, alpha: 0, duration: 300, onComplete: () => { if (s.active) s.destroy(); } });
      });
    } });
  }

  // ===========================================================================
  // PANEL (okno terminala)
  // ===========================================================================
  openPanel(title, type) {
    if (!this.canInteract() || this.debugMode) return false;
    const { width: w, height: h } = this.scale;
    const X = Math.round(w * 0.06), Y = Math.round(h * 0.09), W = Math.round(w * 0.88), H = Math.round(h * 0.82);
    this.panelType = type; this.win = { x: X, y: Y, w: W, h: H };
    this.panel = this.add.container(0, 0).setDepth(600);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x02070a, 0.84).setInteractive();
    const g = this.add.graphics();
    gridLines(g, 0, 0, w, h, 48, C.line, 0.05);
    termBox(g, X, Y, W, H, { fill: C.ink, fillAlpha: 0.97 });
    gridLines(g, X, Y, W, H, 40, C.line, 0.06);
    g.fillStyle(C.panelHi, 1); g.fillRect(X + 2, Y + 2, W - 4, 50);
    g.fillStyle(C.gold, 1); g.fillRect(X + 2, Y + 2, 6, 50);
    g.lineStyle(1, C.line, 0.8); g.lineBetween(X + 2, Y + 52, X + W - 2, Y + 52);
    [C.red, C.amber, C.glow].forEach((color, i) => { g.fillStyle(color, 0.9); g.fillCircle(X + W - 190 + i * 22, Y + 27, 5); });
    brackets(g, X - 6, Y - 6, W + 12, H + 12, 28, C.gold, 0.9, 3);
    const titleText = this.add.text(X + 30, Y + 27, title, { fontFamily: FONT.pixel, fontSize: '16px', color: T.gold }).setOrigin(0, 0.5);
    titleText.setShadow(0, 0, T.gold, 5, false, true);
    this.panel.add([dim, g, titleText]);
    const close = this.makeButton(this.panel, 0, Y + 4, 'CLOSE', () => this.closePanel(), 12);
    close.setX(X + W - 14 - close.btnWidth);
    this.panelBody = this.add.container(0, 0); this.panel.add(this.panelBody);

    this.panel.setAlpha(0); this.tweens.add({ targets: this.panel, alpha: 1, duration: 160 });
    const sweep = this.add.rectangle(X + W / 2, Y, W, 3, C.glow, 0.7); this.panel.add(sweep);
    this.tweens.add({ targets: sweep, y: Y + H, alpha: 0, duration: 450, ease: 'Sine.easeIn', onComplete: () => { if (sweep.active) sweep.destroy(); } });
    this.refreshHotspots(); return true;
  }

  closePanel() {
    if (this.buying || this.confirmation) return;
    this.convoEvent?.remove(false); this.convoEvent = null; this.convo = null;
    const panel = this.panel; this.panel = null; this.panelBody = null; this.panelType = null; this.win = null; this.cardCenter = null;
    panel?.destroy(); this.refreshHotspots();
  }

  // ===========================================================================
  // ROZMOWA Z SPRZEDAWCĄ - "łącze na żywo"
  // ===========================================================================
  addPortrait(parent, x, y, w, h) {
    const cfg = SPY_SHOP_CONFIG, base = this.add.graphics();
    base.fillStyle(0x030806, 1); base.fillRect(x, y, w, h); parent.add(base);
    if (cfg.backgroundUrl && this.textures.exists(cfg.backgroundKey)) {
      // kadr z tła: twarz i tors sprzedawcy
      const src = this.textures.get(cfg.backgroundKey).getSourceImage(), tw = src.width, th = src.height;
      const fx = 0.50, fy = 0.21, fw = 0.19, fh = 0.39;
      const cropW = fw * tw, cropH = cropW * (h / w), cx = (fx + fw / 2) * tw, cy = (fy + fh / 2) * th, scale = w / cropW;
      const img = this.add.image(x + w / 2, y + h / 2, cfg.backgroundKey).setOrigin(cx / tw, cy / th).setScale(scale)
        .setCrop(cx - cropW / 2, cy - cropH / 2, cropW, cropH);
      parent.add(img);
    } else {
      parent.add(this.add.text(x + w / 2, y + h / 2, __dialogueText("scenes/SpyShopScene.js", "t_100c8b920fb71263437c"), { fontFamily: FONT.pixel, fontSize: '14px', color: T.dim }).setOrigin(0.5));
    }
    const ov = this.add.graphics();
    ov.fillStyle(C.glow, 0.07); ov.fillRect(x, y, w, h);
    ov.lineStyle(1, 0x000000, 0.22);
    for (let ly = y; ly < y + h; ly += 4) ov.lineBetween(x, ly, x + w, ly);
    ov.fillStyle(C.ink, 0.85); ov.fillRect(x, y + h - 34, w, 34);
    ov.lineStyle(2, C.line, 1); ov.strokeRect(x + 1, y + 1, w - 2, h - 2);
    brackets(ov, x + 8, y + 8, w - 16, h - 16, 22, C.glow, 0.8, 2);
    const rec = this.add.circle(x + 24, y + h - 17, 5, C.red, 1);
    this.tweens.add({ targets: rec, alpha: { from: 1, to: 0.2 }, duration: 600, yoyo: true, repeat: -1 });
    const tag = this.add.text(x + 40, y + h - 16, __dialogueText("scenes/SpyShopScene.js", "t_23ea26f71574c663e1cc"), { fontFamily: FONT.pixel, fontSize: '10px', color: T.glow }).setOrigin(0, 0.5);
    parent.add([ov, rec, tag]);
  }

  openConversation() {
    if (!this.openPanel(__dialogueText("scenes/SpyShopScene.js", "t_c99b53eb79cfda68a1ed"), 'conversation')) return;
    const { x, y, w, h } = this.win, body = this.panelBody;
    this.addPortrait(body, x + 40, y + 84, 340, 420);
    const rx = x + 420, rw = w - 420 - 40;
    body.add(this.add.text(rx, y + 76, __dialogueText("scenes/SpyShopScene.js", "t_455265bf5ba793e13d6b"), { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }));
    const g = this.add.graphics();
    termBox(g, rx, y + 102, rw, 232, { fill: C.panelHi, fillAlpha: 0.9 });
    gridLines(g, rx, y + 102, rw, 232, 32, C.line, 0.07);
    brackets(g, rx + 8, y + 110, rw - 16, 216, 18, C.glow, 0.6, 2);
    const answer = this.add.text(rx + 30, y + 130, '', { fontFamily: FONT.body, fontSize: '28px', color: T.text, wordWrap: { width: rw - 60 }, lineSpacing: 8 });
    body.add([g, answer]);
    body.add(this.add.text(rx, y + 362, __dialogueText("scenes/SpyShopScene.js", "t_71ab523848f27765c3cb"), { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }));
    const rows = SPY_SHOP_CONFIG.dialogue.map((line, i) =>
      this.makeRow(body, rx, y + 392 + i * 64, rw, 54, { num: String(i + 1).padStart(2, '0'), label: line.question }, () => this.askShopkeeper(i)));
    body.add(this.add.text(x + 40, y + h - 32, __dialogueText("scenes/SpyShopScene.js", "t_9be10b283dad1783a4c9"), { fontFamily: FONT.pixel, fontSize: '9px', color: T.dim }));
    this.convo = { answer, rows };
    this.typeAnswer(__dialogueText("scenes/SpyShopScene.js", "t_d8c647ff54d101c0a001"));
  }

  askShopkeeper(i) {
    const line = SPY_SHOP_CONFIG.dialogue[i];
    if (!line || !this.convo || this.panelType !== 'conversation') return;
    this.convo.rows.forEach((row, j) => row.setSelected(j === i));
    this.typeAnswer(line.answer);
  }

  typeAnswer(str) {
    const convo = this.convo; if (!convo) return;
    this.convoEvent?.remove(false); let n = 0; convo.answer.setText('');
    this.convoEvent = this.time.addEvent({ delay: 16, loop: true, callback: () => {
      if (this.disposed || this.convo !== convo || !convo.answer?.active) { this.convoEvent?.remove(false); this.convoEvent = null; return; }
      n = Math.min(str.length, n + 2); convo.answer.setText(str.slice(0, n));
      if (n >= str.length) { this.convoEvent?.remove(false); this.convoEvent = null; }
    } });
  }

  // ===========================================================================
  // KATALOG - lista + "teczka" z opisem
  // ===========================================================================
  getProducts() {
    const catalog = this.cache.json.get(CATALOG_KEY);
    return SPY_SHOP_STOCK.map(ref => ({ ...ref, item: catalog?.[ref.category]?.[ref.key] ?? null }));
  }

  openCatalogue() {
    if (!this.openPanel(__dialogueText("scenes/SpyShopScene.js", "t_614655e739e8da2089fc"), 'catalogue')) return;
    this.statusMessage = ''; this.statusKind = 'info'; this.renderCatalogue(this.selectedProductIndex);
  }

  renderCatalogue(selected = 0) {
    if (this.disposed || !this.panelBody || this.panelType !== 'catalogue' || !this.win) return;
    const body = this.panelBody; body.removeAll(true);
    const { x, y, w, h } = this.win, products = this.getProducts();
    this.selectedProductIndex = Math.max(0, Math.min(selected, products.length - 1));
    const sel = this.selectedProductIndex, cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    const lx = x + 36, lw = 660, top = y + 90;

    body.add(this.add.text(lx, y + 68, `${__dialogueText("scenes/SpyShopScene.js", "t_55e140774122eda1cc02")}${products.length}${__dialogueText("scenes/SpyShopScene.js", "t_cfae0d4248f7142f7b17")}`, { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }));
    products.forEach((product, i) => {
      const st = spyShopPurchaseService.inspect(product), name = product.item?.name ?? `${__dialogueText("scenes/SpyShopScene.js", "t_859bb20bb8d5093a89a8")}${product.key}`;
      const owned = st.reason === 'owned', blocked = !st.ok && !owned;
      this.makeRow(body, lx, top + i * 68, lw, 62, {
        num: String(i + 1).padStart(2, '0'), label: name, dim: blocked || owned,
        right: owned ? 'OWNED' : `$${product.price}`, rightColor: owned ? T.glow : (blocked ? T.red : T.amber), selected: i === sel
      }, () => this.renderCatalogue(i));
    });

    // --- teczka z opisem ---
    const product = products[sel], item = product?.item, st = spyShopPurchaseService.inspect(product);
    const dx = lx + lw + 40, dw = w - (dx - x) - 36, dy = top, ch = 500;
    this.cardCenter = { x: dx + dw / 2, y: dy + ch / 2 };
    const dg = this.add.graphics();
    termBox(dg, dx, dy, dw, ch);
    gridLines(dg, dx, dy, dw, ch, 34, C.line, 0.07);
    brackets(dg, dx + 8, dy + 8, dw - 16, ch - 16, 18, C.glow, 0.65, 2);
    body.add(dg);
    body.add(this.add.text(dx + 28, dy + 24, `${__dialogueText("scenes/SpyShopScene.js", "t_4b4b14f7cecbb211abeb")}${String(sel + 1).padStart(2, __dialogueText("scenes/SpyShopScene.js", "t_5feceb66ffc86f38d952"))}`, { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }));
    const nameText = this.add.text(dx + 28, dy + 52, item ? item.name : `${__dialogueText("scenes/SpyShopScene.js", "t_859bb20bb8d5093a89a8")}${product?.key}`,
      { fontFamily: FONT.pixel, fontSize: '20px', color: T.gold, wordWrap: { width: dw - 260 }, lineSpacing: 8 });
    const divY = Math.round(dy + 52 + nameText.height + 16);
    dg.fillStyle(C.line, 0.6); for (let ddx = dx + 28; ddx < dx + dw - 28; ddx += 10) dg.fillRect(ddx, divY, 6, 2);
    const description = item ? item.description : `${__dialogueText("scenes/SpyShopScene.js", "t_694a130a7f40d5de9a1f")}${product?.category}${__dialogueText("scenes/SpyShopScene.js", "t_cdb4ee2aea69cc6a8333")}${product?.key}${__dialogueText("scenes/SpyShopScene.js", "t_b6651100a7cb8f85b07d")}`;
    body.add([nameText, this.add.text(dx + 28, divY + 18, description || '', { fontFamily: FONT.body, fontSize: '24px', color: T.text, wordWrap: { width: dw - 56 }, lineSpacing: 7 })]);

    // pieczątka statusu
    const stampDef = st.ok ? [__dialogueText("scenes/SpyShopScene.js", "t_c0325f265f3071cef583"), C.glow, T.glow] : st.reason === 'owned' ? ['ACQUIRED', C.glow, T.glow]
      : st.reason === 'funds' ? [__dialogueText("scenes/SpyShopScene.js", "t_4a402985b4638946fb89"), C.red, T.red] : st.reason === 'full' ? [__dialogueText("scenes/SpyShopScene.js", "t_96f11bab701ebcef79d7"), C.red, T.red] : ['N/A', C.red, T.red];
    const stamp = this.makeStamp(stampDef[0], stampDef[1], stampDef[2], 14).setPosition(dx + dw - 150, dy + 86).setAngle(-8).setAlpha(0.92);
    body.add(stamp);

    // cena i saldo po zakupie
    body.add(this.add.text(dx + 28, dy + ch - 86, __dialogueText("scenes/SpyShopScene.js", "t_13024046cbcaedb79964"), { fontFamily: FONT.pixel, fontSize: '9px', color: T.dim }));
    const price = this.add.text(dx + 28, dy + ch - 64, `${__dialogueText("scenes/SpyShopScene.js", "t_09fc96082d34c2dfc129")}${product?.price ?? 0}`, { fontFamily: FONT.pixel, fontSize: '28px', color: T.amber });
    price.setShadow(0, 0, T.amber, 6, false, true); body.add(price);
    if (product && Number.isInteger(product.price)) {
      const line = st.reason === 'funds' ? `${__dialogueText("scenes/SpyShopScene.js", "t_21658fbfd163d15ec106")}${product.price - cash}` : (st.ok ? `${__dialogueText("scenes/SpyShopScene.js", "t_7449dd0aa78a2a7abdd1")}${cash - product.price}` : '');
      if (line) body.add(this.add.text(dx + dw - 28, dy + ch - 50, line, { fontFamily: FONT.body, fontSize: '21px', color: st.ok ? T.dim : T.red }).setOrigin(1, 0.5));
    }

    // przycisk zakupu
    if (st.ok) this.makeButton(body, dx, dy + ch + 24, `${__dialogueText("scenes/SpyShopScene.js", "t_d0224318aff7acb851c8")}${product.price}`, () => this.requestPurchase(this.selectedProductIndex), 16);
    else body.add(this.add.text(dx, dy + ch + 36, st.reason === __dialogueText("scenes/SpyShopScene.js", "t_f5e6d024c05c9cc2746a") ? __dialogueText("scenes/SpyShopScene.js", "t_31ae6f8b7fe89fa9a7ca") : st.message,
      { fontFamily: FONT.body, fontSize: '22px', color: T.dim, wordWrap: { width: dw } }));

    // stopka: gotówka + komunikat
    const fy = y + h - 120, fw = w - 72, fg = this.add.graphics();
    termBox(fg, x + 36, fy, fw, 70, { fillAlpha: 0.95 });
    fg.fillStyle(C.amber, 1); fg.fillRect(x + 36, fy, 6, 70);
    fg.lineStyle(1, C.line, 0.7); fg.lineBetween(x + 340, fy + 10, x + 340, fy + 60);
    body.add(fg);
    body.add(this.add.text(x + 62, fy + 18, __dialogueText("scenes/SpyShopScene.js", "t_cd3b3c6f9d48cbd42ddd"), { fontFamily: FONT.pixel, fontSize: '9px', color: T.dim }));
    const cashText = this.add.text(x + 62, fy + 36, `${__dialogueText("scenes/SpyShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`, { fontFamily: FONT.pixel, fontSize: '20px', color: T.amber });
    cashText.setShadow(0, 0, T.amber, 6, false, true); body.add(cashText);
    const msgColor = this.statusKind === __dialogueText("scenes/SpyShopScene.js", "t_2689367b205c16ce32ed") ? T.glow : this.statusKind === 'warn' ? T.red : T.text;
    body.add(this.add.text(x + 366, fy + 35, this.statusMessage || __dialogueText("scenes/SpyShopScene.js", "t_98e42ebcb7ab6de0d8bb"),
      { fontFamily: FONT.body, fontSize: '21px', color: msgColor, wordWrap: { width: fw - 350 } }).setOrigin(0, 0.5));
    body.add(this.add.text(x + 36, y + h - 32, __dialogueText("scenes/SpyShopScene.js", "t_b14898537fe3cff15f02"), { fontFamily: FONT.pixel, fontSize: '9px', color: T.dim }));
  }

  // ===========================================================================
  // ZAKUP - potwierdzenie transakcji
  // ===========================================================================
  requestPurchase(index) {
    if (this.disposed || this.navigating || this.buying || this.confirmation || this.panelType !== 'catalogue') return;
    const product = this.getProducts()[index], state = spyShopPurchaseService.inspect(product);
    if (!state.ok) { this.statusMessage = state.message; this.statusKind = 'warn'; this.renderCatalogue(index); return; }
    this.confirmedProduct = { index, id: product.item.id, price: product.price };
    const { width: w, height: h } = this.scale, W = 780, H = 410, X = Math.round((w - W) / 2), Y = Math.round((h - H) / 2);
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.confirmation = this.add.container(0, 0).setDepth(1000);
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.8).setInteractive();
    const g = this.add.graphics();
    termBox(g, X, Y, W, H, { fill: C.ink, fillAlpha: 0.98, stroke: C.gold });
    gridLines(g, X, Y, W, H, 36, C.line, 0.06);
    g.fillStyle(C.panelHi, 1); g.fillRect(X + 2, Y + 2, W - 4, 46);
    g.fillStyle(C.gold, 1); g.fillRect(X + 2, Y + 2, 6, 46);
    brackets(g, X - 6, Y - 6, W + 12, H + 12, 24, C.gold, 0.9, 3);
    const rows = [['PRICE', `$${product.price}`, T.amber], [__dialogueText("scenes/SpyShopScene.js", "t_fa341ee8b70f4533a42c"), `$${cash}`, T.text], [__dialogueText("scenes/SpyShopScene.js", "t_4ffdb881b7ba4fc58c94"), `$${cash - product.price}`, T.glow]];
    rows.forEach((_r, i) => { g.lineStyle(1, C.line, 0.5); g.lineBetween(X + 36, Y + 168 + i * 40, X + W - 36, Y + 168 + i * 40); });
    this.confirmation.add([dim, g]);
    this.confirmation.add(this.add.text(X + 28, Y + 25, __dialogueText("scenes/SpyShopScene.js", "t_f26ec08f12b64c97ef60"), { fontFamily: FONT.pixel, fontSize: '14px', color: T.gold }).setOrigin(0, 0.5));
    this.confirmation.add(this.add.text(X + 36, Y + 72, product.item.name, { fontFamily: FONT.pixel, fontSize: '18px', color: T.amber, wordWrap: { width: W - 72 }, lineSpacing: 6 }));
    rows.forEach(([label, value, color], i) => {
      const ry = Y + 148 + i * 40;
      this.confirmation.add(this.add.text(X + 36, ry, label, { fontFamily: FONT.pixel, fontSize: '10px', color: T.dim }).setOrigin(0, 0.5));
      this.confirmation.add(this.add.text(X + W - 36, ry, value, { fontFamily: FONT.pixel, fontSize: '16px', color }).setOrigin(1, 0.5));
    });
    this.confirmation.add(this.add.text(X + 36, Y + 280, __dialogueText("scenes/SpyShopScene.js", "t_d2cf21dda510399614c5"),
      { fontFamily: FONT.body, fontSize: '18px', color: T.dim, wordWrap: { width: W - 72 } }));
    this.makeButton(this.confirmation, X + 36, Y + H - 78, __dialogueText("scenes/SpyShopScene.js", "t_c664455563c43f218148"), () => this.confirmPurchase(), 14, 'confirmation');
    this.makeButton(this.confirmation, X + 36 + 330, Y + H - 78, __dialogueText("scenes/SpyShopScene.js", "t_3a6b27a5ce03e93b02ea"), () => this.closeConfirmation(), 14, 'confirmation');
  }

  closeConfirmation() {
    if (this.buying) return;
    this.confirmation?.destroy(); this.confirmation = null; this.confirmedProduct = null;
  }

  confirmPurchase() {
    if (!this.confirmation || !this.confirmedProduct || this.buying || this.disposed || this.navigating) return;
    const quote = { ...this.confirmedProduct }, product = this.getProducts()[quote.index];
    if (product?.item?.id !== quote.id || product.price !== quote.price) {
      this.closeConfirmation(); this.statusMessage = __dialogueText("scenes/SpyShopScene.js", "t_01c4cfeb813faa5dbd9f"); this.statusKind = 'warn';
      this.renderCatalogue(quote.index); return;
    }
    this.buying = true;
    let result;
    try { result = spyShopPurchaseService.buy(product); }
    catch (error) {
      console.error('[SpyShopScene] Purchase UI failed:', error);
      result = { message: __dialogueText("scenes/SpyShopScene.js", "t_d7cd2abb430b5ca648bf") };
    } finally { this.buying = false; }
    this.closeConfirmation(); if (this.disposed) return;
    if (result.ok === true) playShopPurchaseAudio(this);
    this.statusMessage = result.message; this.statusKind = result.ok === true ? __dialogueText("scenes/SpyShopScene.js", "t_2689367b205c16ce32ed") : 'warn';
    this.refreshMoney(); this.renderCatalogue(quote.index);
    if (result.ok === true && this.cardCenter) this.slamStamp('PAID', this.cardCenter.x, this.cardCenter.y);
  }

  refreshMoney() {
    if (this.disposed) return;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH); this.lastDisplayedCash = cash;
    this.moneyText?.setText(`${__dialogueText("scenes/SpyShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`); this.topHud?.refreshMoney();
  }

  update(time, delta) {
    if (this.disposed) return;
    for (const hot of this.hotspots) if (hot.hovered) this.drawHotspotFrame(hot, time);
    if (this.navigating || this.buying) return;
    this.balanceElapsed += delta; if (this.balanceElapsed < 500) return; this.balanceElapsed = 0;
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    if (cash !== this.lastDisplayedCash) {
      this.refreshMoney(); if (this.panelType === 'catalogue' && !this.confirmation) this.renderCatalogue(this.selectedProductIndex);
    }
  }

  async exitShop() {
    if (this.disposed || this.navigating || this.panel || this.buying || this.confirmation) return false;
    this.navigating = true; const token = this.runToken; this.refreshHotspots();
    const moved = await this.goto('HomeCityScene', { entryPoint: 'spy-shop', fromScene: KEY, gameState });
    if (this.disposed || this.runToken !== token) return moved !== false;
    this.navigating = false; this.refreshHotspots();
    if (moved === false) this.say(__dialogueText("scenes/SpyShopScene.js", "t_cd113bd0b51d4c8d24f3")); return moved !== false;
  }

  disposeShop() {
    if (this.disposed) return;
    this.disposed = true; this.runToken = null; this.topHud?.destroy(); this.topHud = null;
    this.feedbackTimer?.remove(false); this.feedbackTimer = null;
    this.typeEvent?.remove(false); this.typeEvent = null;
    this.convoEvent?.remove(false); this.convoEvent = null; this.convo = null;
    this.confirmation?.destroy(); this.confirmation = null; this.confirmedProduct = null;
    this.panel?.destroy(); this.panel = null; this.panelBody = null; this.panelType = null; this.win = null;
    this.hotspots = []; this.header = null; this.cashBar = null; this.comm = null; this.cursor = null;
    this.feedback = null; this.moneyText = null;
  }
}