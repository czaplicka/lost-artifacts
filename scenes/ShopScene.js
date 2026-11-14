import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from '../managers/MoneyManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { SHOP_CONFIG } from '../config/shopConfig.js';
import { preloadShopPurchaseAudio, playShopPurchaseAudio } from './shop/ShopPurchaseAudio.js';

const LOCAL_DEBUG_ALLOWED = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

// ---------------------------------------------------------------------------
// Motyw wizualny: "sklep na rogu" - tablica kredowa, mosiądz, papierowe metki
// ---------------------------------------------------------------------------
const FONT = {
  body: __dialogueText("scenes/ShopScene.js", "t_749639cb7eb80c7ff9a7"),
  pixel: __dialogueText("scenes/ShopScene.js", "t_8579050150a2d7c2e239")
};
const COLOR = {
  gold: 0xd4af37, goldLight: 0xf0d48a,
  brass: 0x8b6b2f, brassLight: 0xa07a34, brassDark: 0x5c4620,
  plate: 0x1a1511, leather: 0x15110d,
  paper: 0xf6e8c0, paperDark: 0xe3cf98, paperEdge: 0x9a8a68,
  ink: 0x2b2118, inkSoft: 0x6b5a3e,
  red: 0xd9382f, green: 0x2f7d32,
  wood: 0x6a4524, woodDark: 0x3b2512,
  chalkBoard: 0x1d2a22, tape: 0xffd23f
};
const TAG_W = 330;
const BOARD_W = 340;

const FALLBACK_DESCRIPTIONS = [
  __dialogueText("scenes/ShopScene.js", "t_ad0f99cd817309441569"), __dialogueText("scenes/ShopScene.js", "t_53ae76ab9ef175440b0c"),
  __dialogueText("scenes/ShopScene.js", "t_69da7d419e1da6b267ef"), __dialogueText("scenes/ShopScene.js", "t_c452b2af04255141f9de"),
  __dialogueText("scenes/ShopScene.js", "t_88b6159e7c7e7e37cbda"), __dialogueText("scenes/ShopScene.js", "t_2d10d19a15a1079a287f"),
  __dialogueText("scenes/ShopScene.js", "t_d8f859abc0c683dc8a21"), __dialogueText("scenes/ShopScene.js", "t_8a4465bb0df7da04f92c")
];

// Tabliczka nad wejściem - każde miasto ma swój sklep
const SHOP_SIGNS = {
  paris: { name: __dialogueText("scenes/ShopScene.js", "t_6c3ac0ecef8df5e2ff30"), tagline: __dialogueText("scenes/ShopScene.js", "t_e08461ec55073f42aebc") },
  london: { name: __dialogueText("scenes/ShopScene.js", "t_440f67e1067a5bb92126"), tagline: __dialogueText("scenes/ShopScene.js", "t_8fd7bf54f8507ef0163a") },
  berlin: { name: __dialogueText("scenes/ShopScene.js", "t_de0c756c230831bc144d"), tagline: __dialogueText("scenes/ShopScene.js", "t_250ce213fd35de7688a2") },
  new_york_city: { name: __dialogueText("scenes/ShopScene.js", "t_96586e642fe4cea1372a"), tagline: __dialogueText("scenes/ShopScene.js", "t_3b39e65f18365652de49") },
  warsaw: { name: __dialogueText("scenes/ShopScene.js", "t_e1e82209c5162d5c7f05"), tagline: __dialogueText("scenes/ShopScene.js", "t_9ce4068989b496cd5720") },
  new_delhi: { name: __dialogueText("scenes/ShopScene.js", "t_6f51e3d61d75a47d54cc"), tagline: __dialogueText("scenes/ShopScene.js", "t_c87e290f9ebc8893da8f") },
  kotte: { name: __dialogueText("scenes/ShopScene.js", "t_d29f3c16f46aa5e0595f"), tagline: __dialogueText("scenes/ShopScene.js", "t_871adae484b59817c3c6") },
  toronto: { name: __dialogueText("scenes/ShopScene.js", "t_2915f7a490b12a5be102"), tagline: __dialogueText("scenes/ShopScene.js", "t_ac42f9cbd0efa10a23dc") },
  nairobi: { name: __dialogueText("scenes/ShopScene.js", "t_daca4943715bca2560e9"), tagline: __dialogueText("scenes/ShopScene.js", "t_1478c6781de043d763c2") },
  islamabad: { name: __dialogueText("scenes/ShopScene.js", "t_788885121a37ca23814c"), tagline: __dialogueText("scenes/ShopScene.js", "t_e487351a6a07ae54c5af") },
  tokyo: { name: __dialogueText("scenes/ShopScene.js", "t_42e33fe7307ebd258f53"), tagline: __dialogueText("scenes/ShopScene.js", "t_82a4ebe1626c86a538a7") },
  default: { name: __dialogueText("scenes/ShopScene.js", "t_61867ba9e08d52f0e4b1"), tagline: __dialogueText("scenes/ShopScene.js", "t_8643a0ed593938a85110") }
};

// Kasa "gada" - humor sklepikarza
const QUIPS = {
  greeting: [
    __dialogueText("scenes/ShopScene.js", "t_501af287e338700375c1"),
    __dialogueText("scenes/ShopScene.js", "t_d28307ffabcf3d018dfa"),
    __dialogueText("scenes/ShopScene.js", "t_277334c4aaabe4dc0d57"),
    __dialogueText("scenes/ShopScene.js", "t_fdecdf91979ecde415db")
  ],
  purchase: [
    __dialogueText("scenes/ShopScene.js", "t_04870a6d7b2677466e05"),
    __dialogueText("scenes/ShopScene.js", "t_d0a2772ec5a70a65b6a6"),
    __dialogueText("scenes/ShopScene.js", "t_b95d5344ca04a6e5ed8e"),
    __dialogueText("scenes/ShopScene.js", "t_96a927fe63bc4d9eb656"),
    __dialogueText("scenes/ShopScene.js", "t_a3ae335ba6330855450e")
  ],
  broke: [
    __dialogueText("scenes/ShopScene.js", "t_b554fb8a0b2759020d24"),
    __dialogueText("scenes/ShopScene.js", "t_34febbce13d38b023eea"),
    __dialogueText("scenes/ShopScene.js", "t_d00f1b7f7d1b19bc8b59"),
    __dialogueText("scenes/ShopScene.js", "t_b89bd38dd68fa995a62e")
  ],
  owned: [
    __dialogueText("scenes/ShopScene.js", "t_beba3e41616cd5ee1a4b"),
    __dialogueText("scenes/ShopScene.js", "t_7b340694fc51707b62f4")
  ],
  full: [
    __dialogueText("scenes/ShopScene.js", "t_3b4f9c536cbf494ab278"),
    __dialogueText("scenes/ShopScene.js", "t_f5a11762f87958eb1c49")
  ],
  idle: [
    __dialogueText("scenes/ShopScene.js", "t_13ccc14eef7d4be9229d"),
    __dialogueText("scenes/ShopScene.js", "t_c744f3d9479f1232f2ca"),
    __dialogueText("scenes/ShopScene.js", "t_0ef2e5a16ac11f25f91d"),
    __dialogueText("scenes/ShopScene.js", "t_53480d547e40b9e1bddd"),
    __dialogueText("scenes/ShopScene.js", "t_3b39e65f18365652de49"),
    __dialogueText("scenes/ShopScene.js", "t_5e8dddc2b1261f4c9678")
  ]
};

const CITY_ALIASES = { new_york: 'new_york_city', new_york_city: 'new_york_city',
  new_delhi: 'new_delhi', new_dehli: 'new_delhi', kotte: 'kotte', sri_jayawardenepura_kotte: 'kotte' };
function normalizeCityId(value) {
  if (!value) return 'paris';
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  return CITY_ALIASES[normalized] || normalized;
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

  getShopDay() {
    const day = Number(gameState.currentDay || gameState.day || 1); return Number.isFinite(day) ? day : 1;
  }

  pickTodaysProducts(all) {
    const inCity = all.filter(cfg => !Array.isArray(cfg.cities) || !cfg.cities.length || cfg.cities.map(normalizeCityId).includes(this.cityId));
    const permanent = inCity.filter(cfg => cfg.type !== 'rotating'), pool = inCity.filter(cfg => cfg.type === 'rotating');
    const count = Math.min(pool.length, SHOP_CONFIG.rotatingCount ?? 3);
    const rand = seededRandom(hashString(`${this.cityId}|day${this.getShopDay()}`));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const todays = new Set(shuffled.slice(0, count));
    return all.filter(cfg => permanent.includes(cfg) || todays.has(cfg));
  }

  preload() {
    preloadShopPurchaseAudio(this);
    if (!this.textures.exists('shop_bg')) this.load.image('shop_bg', 'assets/local/shop.webp');
  }

  // ===========================================================================
  // CREATE
  // ===========================================================================
  create() {
    super.create();
    const { width, height } = this.scale, runToken = this.shopRunToken;

    // UWAGA: ShopSceneWithAnimations szuka obrazu o kluczu 'shop_bg' - nie zmieniać.
    this.add.image(width / 2, height / 2, 'shop_bg').setDisplaySize(width, height);
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
      if (this.hudPanelOpen) { this.hideTooltip(); if (this.debugMode) this.setDebugMode(false); this.clearHotspotHighlights(); }
    };
    this.events.once('shutdown', () => {
      keyboard?.off('keydown-ESC', escapeHandler); if (LOCAL_DEBUG_ALLOWED) keyboard?.off('keydown', debugHandler);
      window.removeEventListener('lost-artifacts:money-changed', moneyHandler);
      this.events.off('update', hoverHandler);
      this.cashState.tween?.stop?.(); this.cashState.tween = null;
      this.toastTimer?.remove(false); this.bubbleTimer?.remove(false); this.idleTimer?.remove(false);
      this.toastTimer = this.bubbleTimer = this.idleTimer = null;
      this.shopHud?.events.off('panelStateChanged', panelHandler); this.shopHud = null;
      if (this.shopRunToken === runToken) this.shopRunToken = null;
    });

    this.refreshMoneyHUD(true);
    this.time.delayedCall(800, () => this.sayQuip(QUIPS.greeting));
    void this.setupShopHud(runToken, panelHandler);
  }

  async setupShopHud(runToken, panelHandler) {
    try {
      const hud = await this.restorePlayerHud();
      if (this.shopRunToken !== runToken || this._cleanupDone || !this.sys.isActive() || this.exiting || !hud) return;
      this.shopHud = hud; hud.events.on('panelStateChanged', panelHandler); hud.closeAllUIPanels();
      hud.setCurrentGameplayScene('ShopScene'); hud.refreshUI?.(); hud.showHud();
      this.hudPanelOpen = hud.isAnyPanelOpen();
      if (this.hudPanelOpen) { this.setDebugMode(false); this.hideTooltip(); this.clearHotspotHighlights(); }
    } catch (error) { console.error('[ShopScene] HUD setup failed:', error); }
  }

  style(size = 16) {
    return { fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color: '#fff1ce',
      backgroundColor: '#191b16', padding: { x: 8, y: 6 } };
  }

  // ===========================================================================
  // ATMOSFERA (winieta)
  // ===========================================================================
  ensureVignetteTexture() {
    const key = 'shop_vignette';
    if (this.textures.exists(key)) return key;
    const w = 960, h = 540;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return null;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(w / 2, h * 0.5, h * 0.36, w / 2, h * 0.5, w * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, __dialogueText("scenes/ShopScene.js", "t_dc2a487fcb980b483813"));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    tex.refresh();
    return key;
  }

  createAtmosphere(width, height) {
    const key = this.ensureVignetteTexture();
    if (!key) return;
    this.vignette = this.add.image(width / 2, height / 2, key).setDisplaySize(width, height).setDepth(4);
  }

  // ===========================================================================
  // TABLICZKA SKLEPU
  // ===========================================================================
  createSign() {
    const sign = SHOP_SIGNS[this.cityId] || SHOP_SIGNS.default;
    const W = 470, H = 66, TOP = 14;
    const container = this.add.container(Math.round(this.scale.width * 0.335), 0).setDepth(60);
    const g = this.add.graphics();
    g.lineStyle(3, COLOR.brassDark, 1);
    g.lineBetween(-W / 2 + 40, 0, -W / 2 + 40, TOP + 2);
    g.lineBetween(W / 2 - 40, 0, W / 2 - 40, TOP + 2);
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-W / 2 + 4, TOP + 5, W, H, 6);
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(-W / 2, TOP, W, H, 6);
    g.fillStyle(COLOR.brass, 1); g.fillRoundedRect(-W / 2 + 3, TOP + 3, W - 6, H - 6, 4);
    g.fillStyle(COLOR.plate, 1); g.fillRoundedRect(-W / 2 + 7, TOP + 7, W - 14, H - 14, 3);
    g.fillStyle(COLOR.goldLight, 1);
    for (const [cx, cy] of [[-W / 2 + 12, TOP + 12], [W / 2 - 12, TOP + 12], [-W / 2 + 12, TOP + H - 12], [W / 2 - 12, TOP + H - 12]]) g.fillCircle(cx, cy, 2.5);

    const name = this.add.text(0, TOP + H * 0.37, sign.name, { fontFamily: FONT.pixel, fontSize: '15px', color: '#d4af37' }).setOrigin(0.5);
    let size = 15; while (name.width > W - 70 && size > 9) { size--; name.setFontSize(size); }
    name.setShadow(0, 0, '#d4af37', 6, false, true);
    const tagline = this.add.text(0, TOP + H * 0.74, sign.tagline, { fontFamily: FONT.body, fontSize: '14px', color: '#f8e7b9' }).setOrigin(0.5);

    container.add([g, name, tagline]);
    this.shopSign = container;
    this.tweens.add({ targets: container, angle: { from: -0.5, to: 0.5 }, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // ===========================================================================
  // KASA - wyświetlacz gotówki
  // ===========================================================================
  createCashPlate() {
    const W = 250, H = 38, x = 16, y = 12;
    const c = this.add.container(x, y).setDepth(100);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(3, 4, W, H, 6);
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.brass, 1); g.fillRoundedRect(2, 2, W - 4, H - 4, 5);
    g.fillStyle(0x0d0a07, 1); g.fillRoundedRect(6, 6, W - 12, H - 12, 3);
    g.lineStyle(1, COLOR.goldLight, 0.25); g.strokeRoundedRect(6, 6, W - 12, H - 12, 3);
    const label = this.add.text(16, H / 2, __dialogueText("scenes/ShopScene.js", "t_49ee8852597743dd1c84"), { fontFamily: FONT.pixel, fontSize: '9px', color: '#a07a34' }).setOrigin(0, 0.5);
    this.cashText = this.add.text(W - 16, H / 2 + 1, __dialogueText("scenes/ShopScene.js", "t_ce66470e18f3579ac766"), { fontFamily: FONT.pixel, fontSize: '16px', color: '#ffd966' }).setOrigin(1, 0.5);
    this.cashText.setShadow(0, 0, '#ff9d1a', 8, false, true);
    this.moneyText = this.cashText;
    c.add([g, label, this.cashText]);
    this.cashPlate = c;
  }

  setCashDisplay(cash, animate) {
    const st = this.cashState, text = this.cashText;
    if (!text?.active) return;
    const from = st.display;
    st.tween?.stop?.(); st.tween = null;
    if (!animate || from === null || from === cash) {
      st.display = cash; text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`); text.setColor('#ffd966'); return;
    }
    const counter = { v: from };
    text.setColor(cash < from ? '#ff7a6b' : '#9dff7a');
    st.tween = this.tweens.add({
      targets: counter, v: cash, duration: 450, ease: 'Cubic.easeOut',
      onUpdate: () => { if (text.active) { st.display = Math.round(counter.v); text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${st.display}`); } },
      onComplete: () => { st.display = cash; if (text.active) { text.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cash}`); text.setColor('#ffd966'); } st.tween = null; }
    });
  }

  shakeCash() {
    const plate = this.cashPlate;
    if (!plate?.active) return;
    this.tweens.killTweensOf(plate); plate.setX(16);
    this.tweens.add({ targets: plate, x: { from: 11, to: 21 }, duration: 45, yoyo: true, repeat: 3,
      onComplete: () => { if (plate.active) plate.setX(16); } });
  }

  // ===========================================================================
  // PRZYCISK EXIT
  // ===========================================================================
  createExitButton() {
    const { width } = this.scale;
    if (this.textures.exists('btnExit')) {
      const btn = this.add.image(0, 0, 'btnExit').setScale(0.5).setOrigin(0.5).setDepth(100).setInteractive({ useHandCursor: true });
      btn.setPosition(width - 20 - btn.displayWidth / 2, 16 + btn.displayHeight / 2);
      btn.on('pointerover', () => { if (!this.hudPanelOpen) btn.setScale(0.6); });
      btn.on('pointerout', () => btn.setScale(0.5)); btn.on('pointerdown', () => this.exitShop()); this.exitButton = btn;
    } else {
      console.warn('[ShopScene] Texture "btnExit" missing, using brass fallback.');
      this.exitButton = this.createBrassButton(width - 20 - 70, 16 + 20, 140, 40, 'EXIT', () => this.exitShop());
    }
  }

  createBrassButton(cx, cy, w, h, label, onClick) {
    const c = this.add.container(cx, cy).setDepth(100);
    const g = this.add.graphics();
    const text = this.add.text(0, 1, label, { fontFamily: FONT.pixel, fontSize: '12px', color: '#d4af37' }).setOrigin(0.5);
    const draw = hover => {
      g.clear();
      g.fillStyle(0x000000, 0.35); g.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 6);
      g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
      g.fillStyle(hover ? COLOR.brassLight : COLOR.brass, 1); g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 5);
      g.fillStyle(hover ? 0x2a2014 : COLOR.plate, 1); g.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 3);
    };
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { if (this.hudPanelOpen) return; draw(true); text.setColor('#f0d48a'); });
    hit.on('pointerout', () => { draw(false); text.setColor('#d4af37'); });
    hit.on('pointerdown', () => onClick());
    draw(false); c.add([g, text, hit]);
    return c;
  }

  // ===========================================================================
  // OPIS / METKA PRODUKTU (papierowa kartka z taśmą)
  // ===========================================================================
  getDescription(cfg) {
    const own = cfg.description || cfg.item?.description; if (own) return own;
    const key = String(cfg.id || cfg.item?.id || cfg.label || '');
    return FALLBACK_DESCRIPTIONS[hashString(key) % FALLBACK_DESCRIPTIONS.length];
  }

  getBuyState(cfg) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    const itemId = cfg.item?.id;
    const existing = itemId ? inventoryManager.getItem(itemId) : null;
    if (existing && !(existing.stackable === true && cfg.item.stackable === true)) {
      return { code: 'owned', text: __dialogueText("scenes/ShopScene.js", "t_eba22ef0538e930d5a33"), color: '#8b6b2f' };
    }
    const capacity = inventoryManager.getCapacity();
    if (!existing && capacity.current >= capacity.max) return { code: 'full', text: __dialogueText("scenes/ShopScene.js", "t_96f11bab701ebcef79d7"), color: '#9a2b2b' };
    if (cash < cfg.price) return { code: 'broke', text: __dialogueText("scenes/ShopScene.js", "t_28d559a6d838d6c3ddbd"), color: '#9a2b2b' };
    return { code: __dialogueText("scenes/ShopScene.js", "t_2689367b205c16ce32ed"), text: __dialogueText("scenes/ShopScene.js", "t_bc0a0f99833b76770deb"), color: '#2f7d32' };
  }

  createTagCard() {
    const container = this.add.container(0, 0).setDepth(300).setVisible(false);
    const gfx = this.add.graphics();
    const tape = this.add.rectangle(TAG_W / 2, 0, 74, 18, COLOR.tape, 0.85).setAngle(-3);
    const title = this.add.text(18, 20, '', { fontFamily: FONT.body, fontSize: '20px', color: '#2b2118', wordWrap: { width: TAG_W - 36 } });
    const desc = this.add.text(18, 0, '', { fontFamily: FONT.body, fontSize: '15px', color: '#6b5a3e', wordWrap: { width: TAG_W - 36 }, lineSpacing: 3 });
    const status = this.add.text(18, 0, '', { fontFamily: FONT.pixel, fontSize: '9px', color: '#2f7d32' }).setOrigin(0, 0.5);
    const priceText = this.add.text(0, 0, '', { fontFamily: FONT.pixel, fontSize: '13px', color: '#2b2118' }).setOrigin(0.5);
    container.add([gfx, tape, title, desc, status, priceText]);
    this.tag = { container, gfx, tape, title, desc, status, priceText, h: 0 };
  }

  renderTag(cfg) {
    const t = this.tag; if (!t) return;
    this.tagCfg = cfg;
    const state = this.getBuyState(cfg), W = TAG_W;
    t.title.setText(cfg.label);
    t.desc.setText(this.getDescription(cfg)).setY(t.title.y + t.title.height + 16);
    const footerY = t.desc.y + t.desc.height + 14, H = Math.round(footerY + 46);
    const dividerY = t.title.y + t.title.height + 7;

    const g = t.gfx; g.clear();
    g.fillStyle(0x000000, 0.35); g.fillRoundedRect(5, 7, W, H, 6);
    g.fillStyle(COLOR.paper, 1); g.fillRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.paperDark, 1); g.fillRoundedRect(0, footerY - 6, W, H - footerY + 6, { tl: 0, tr: 0, bl: 6, br: 6 });
    g.lineStyle(2, COLOR.paperEdge, 1); g.strokeRoundedRect(0, 0, W, H, 6);
    g.fillStyle(COLOR.inkSoft, 0.5);
    for (let dx = 18; dx < W - 24; dx += 10) g.fillRect(dx, dividerY, 5, 2);

    t.status.setPosition(18, footerY + 18).setText(state.text).setColor(state.color);
    t.priceText.setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${cfg.price}`);
    const pw = t.priceText.width + 24, ph = 30, px = W - 16 - pw, py = footerY + 18 - ph / 2;
    g.fillStyle(COLOR.brassDark, 1); g.fillRoundedRect(px, py + 2, pw, ph, 8);
    g.fillStyle(COLOR.gold, 1); g.fillRoundedRect(px, py, pw, ph, 8);
    g.lineStyle(1, COLOR.goldLight, 0.9); g.strokeRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 6);
    t.priceText.setPosition(px + pw / 2, py + ph / 2 + 1);
    t.h = H;
  }

  showTooltip(cfg, x, y, originY = 1, altY = y + 40) {
    if (!this.tag || this.hudPanelOpen || this.exiting || this.debugMode) return;
    this.renderTag(cfg);
    const { width, height } = this.scale, t = this.tag;
    const tx = Phaser.Math.Clamp(x - TAG_W / 2, 8, width - TAG_W - 8);
    let ty = originY === 1 ? y - t.h : y;
    if (originY === 1 && ty < 8) ty = altY;
    ty = Phaser.Math.Clamp(ty, 8, height - t.h - 8);
    t.container.setPosition(Math.round(tx), Math.round(ty));
    if (!t.container.visible) {
      this.tweens.killTweensOf(t.container);
      t.container.setAlpha(0).setVisible(true);
      this.tweens.add({ targets: t.container, alpha: 1, duration: 120 });
    }
  }

  hideTooltip() {
    const t = this.tag; this.tagCfg = null;
    if (!t?.container?.active) return;
    this.tweens.killTweensOf(t.container);
    t.container.setVisible(false).setAlpha(1);
  }

  // ===========================================================================
  // TABLICA KREDOWA "TODAY'S STOCK"
  // ===========================================================================
  createStockBoard() {
    this.hideTooltip();
    this.boardContainer.removeAll(true); this.stockEntries = []; this.stockRows = [];
    const { x, y } = SHOP_CONFIG.stockBoard;
    const W = BOARD_W, ROW = 34, HEAD = 62;
    const perPage = Math.max(1, Math.floor((this.scale.height - y - 230) / ROW));
    const pages = Math.max(1, Math.ceil(this.products.length / perPage));
    this.stockPage = Math.min(this.stockPage, pages - 1);
    const visible = this.products.slice(this.stockPage * perPage, (this.stockPage + 1) * perPage);
    const footerH = pages > 1 ? 70 : 46;
    const H = HEAD + visible.length * ROW + footerH;
    const bc = this.boardContainer;

    // blokada klików pod tablicą
    bc.add(this.add.zone(x + W / 2, y + H / 2, W, H).setInteractive());

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.38); g.fillRoundedRect(x + 5, y + 7, W, H, 8);
    g.fillStyle(COLOR.woodDark, 1); g.fillRoundedRect(x, y, W, H, 8);
    g.fillStyle(COLOR.wood, 1); g.fillRoundedRect(x + 3, y + 3, W - 6, H - 6, 6);
    g.fillStyle(COLOR.chalkBoard, 1); g.fillRoundedRect(x + 10, y + 10, W - 20, H - 20, 3);
    g.lineStyle(1, 0xffffff, 0.08); g.strokeRoundedRect(x + 10, y + 10, W - 20, H - 20, 3);
    const rand = seededRandom(hashString(`board|${this.cityId}`));
    for (let i = 0; i < 10; i++) {
      g.fillStyle(0xffffff, 0.02 + rand() * 0.025);
      g.fillEllipse(x + 30 + rand() * (W - 60), y + 20 + rand() * (H - 40), 60 + rand() * 90, 14 + rand() * 22);
    }
    // kredowa linia pod tytułem
    g.fillStyle(0xf2ecd8, 0.45);
    for (let dx = x + 22; dx < x + W - 28; dx += 10) g.fillRect(dx, y + 44, 6, 2);
    // półeczka na kredę
    g.fillStyle(COLOR.woodDark, 1); g.fillRoundedRect(x + W * 0.2, y + H - 2, W * 0.6, 9, 3);
    g.fillStyle(0xf2ecd8, 1); g.fillRect(x + W * 0.3, y + H - 5, 20, 5);
    g.fillStyle(0xe8a0a0, 1); g.fillRect(x + W * 0.3 + 28, y + H - 5, 14, 5);
    bc.add(g);

    const title = this.add.text(x + W / 2, y + 26, __dialogueText("scenes/ShopScene.js", "t_30a77c462c50bccd4cdd"), { fontFamily: FONT.pixel, fontSize: '14px', color: '#d4af37' }).setOrigin(0.5);
    title.setShadow(0, 0, '#d4af37', 5, false, true);
    bc.add(title);

    visible.forEach((cfg, i) => {
      const rowY = y + HEAD + i * ROW;
      const hl = this.add.rectangle(x + 16, rowY, W - 32, ROW - 4, 0xffffff, 0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      const dots = this.add.graphics();
      const label = this.add.text(x + 24, rowY + ROW / 2 - 2, cfg.label, { fontFamily: FONT.body, fontSize: '17px', color: '#f2ecd8' }).setOrigin(0, 0.5);
      let size = 17; const maxW = W - 24 * 2 - 74;
      while (label.width > maxW && size > 11) { size--; label.setFontSize(size); }
      const price = this.add.text(x + W - 24, rowY + ROW / 2 - 2, '', { fontFamily: FONT.body, fontSize: '17px', color: '#ffd966' }).setOrigin(1, 0.5);
      const row = { cfg, hl, dots, label, price, rowY };

      hl.on('pointerover', () => {
        if (this.hudPanelOpen || this.exiting || this.debugMode) return;
        this.setRowHover(row, true); this.setHotspotHover(cfg, true);
        this.showTooltip(cfg, x + W + 12 + TAG_W / 2, rowY, 0);
      });
      hl.on('pointerout', () => { this.setRowHover(row, false); this.setHotspotHover(cfg, false); this.hideTooltip(); });
      hl.on('pointerdown', () => this.buyItem(cfg));

      bc.add([hl, dots, label, price]);
      this.stockRows.push(row); this.stockEntries.push({ cfg, entry: label });
      this.applyRowState(row);
    });

    const footY = y + HEAD + visible.length * ROW + 10;
    bc.add(this.add.text(x + W / 2, footY + 8, __dialogueText("scenes/ShopScene.js", "t_f6cd33ba79d1ec991230"), { fontFamily: FONT.body, fontSize: '12px', color: '#9aa594' }).setOrigin(0.5));

    if (pages > 1) {
      bc.add(this.add.text(x + W / 2, footY + 38, `${this.stockPage + 1}${__dialogueText("scenes/ShopScene.js", "t_8a5edab282632443219e")}${pages}`, { fontFamily: FONT.pixel, fontSize: '10px', color: '#f2ecd8' }).setOrigin(0.5));
      for (const [label, bx, delta] of [['<', x + 40, -1], ['>', x + W - 40, 1]]) {
        const rect = this.add.rectangle(bx, footY + 38, 36, 24, 0x000000, 0.25).setStrokeStyle(1, 0xf2ecd8, 0.5).setInteractive({ useHandCursor: true });
        const txt = this.add.text(bx, footY + 38, label, { fontFamily: FONT.pixel, fontSize: '12px', color: '#f2ecd8' }).setOrigin(0.5);
        rect.on('pointerover', () => rect.setFillStyle(0xffffff, 0.15));
        rect.on('pointerout', () => rect.setFillStyle(0x000000, 0.25));
        rect.on('pointerdown', () => {
          if (this.hudPanelOpen || this.exiting) return;
          this.hideTooltip(); this.stockPage = (this.stockPage + delta + pages) % pages;
          this.createStockBoard(); this.refreshMoneyHUD();
        });
        bc.add([rect, txt]);
      }
    }
  }

  setRowHover(row, on) {
    if (row?.hl?.active) row.hl.setFillStyle(0xffffff, on ? 0.09 : 0);
  }

  setBoardRowHover(cfg, on) {
    const row = this.stockRows.find(r => r.cfg === cfg);
    if (row) this.setRowHover(row, on);
  }

  setHotspotHover(cfg, on) {
    const hs = this.hotspots.find(h => h.cfg === cfg);
    if (!hs) return;
    hs.hovered = on; this.drawHotspot(hs);
  }

  applyRowState(row) {
    if (!row?.label?.active || !row.price?.active) return;
    const state = this.getBuyState(row.cfg);
    const dim = state.code !== __dialogueText("scenes/ShopScene.js", "t_2689367b205c16ce32ed");
    row.label.setColor(dim ? '#7f8a7c' : '#f2ecd8');
    if (state.code === 'owned') {
      row.price.setFontFamily(FONT.pixel).setFontSize(9).setColor(__dialogueText("scenes/ShopScene.js", "t_3e460c859a6d70ad8b91")).setText(__dialogueText("scenes/ShopScene.js", "t_93fc6ec560dce84a1f6e"));
    } else {
      row.price.setFontFamily(FONT.body).setFontSize(17).setColor(dim ? __dialogueText("scenes/ShopScene.js", "t_e1b35464c2979a104b9a") : __dialogueText("scenes/ShopScene.js", "t_5bed14c43b7bdc7e0093")).setText(`${__dialogueText("scenes/ShopScene.js", "t_09fc96082d34c2dfc129")}${row.cfg.price}`);
    }
    // kropki prowadzące między nazwą a ceną
    const d = row.dots; d.clear();
    const left = row.label.x + row.label.width + 8, right = row.price.x - row.price.width - 8;
    if (right - left > 14) {
      d.fillStyle(0xf2ecd8, 0.3);
      for (let dx = left; dx < right; dx += 6) d.fillRect(dx, row.rowY + 24, 2, 2);
    }
  }

  updateStockRows() { this.stockRows.forEach(row => this.applyRowState(row)); }

  // ===========================================================================
  // HOTSPOTY
  // ===========================================================================
  createHotspot(cfg, index) {
    const zone = this.add.zone(cfg.x, cfg.y, cfg.w, cfg.h).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    const highlight = this.add.graphics().setDepth(11).setVisible(false);
    const label = LOCAL_DEBUG_ALLOWED ? this.add.text(0, 0, cfg.label, this.style(16)).setOrigin(0.5, 1).setDepth(20).setVisible(false) : null;
    const hs = { cfg, zone, highlight, label, index, hovered: false, stamp: null };
    zone.on('pointerover', () => {
      if (this.debugMode || this.hudPanelOpen || this.exiting) return;
      hs.hovered = true; this.drawHotspot(hs); this.setBoardRowHover(cfg, true);
      this.showTooltip(cfg, cfg.x, cfg.y - cfg.h / 2 - 8, 1, cfg.y + cfg.h / 2 + 8);
    });
    zone.on('pointerout', () => {
      hs.hovered = false; this.setBoardRowHover(cfg, false);
      if (!this.debugMode) { this.drawHotspot(hs); this.hideTooltip(); }
    });
    zone.on('pointerdown', () => {
      if (this.hudPanelOpen || this.exiting) return;
      if (this.debugMode && LOCAL_DEBUG_ALLOWED) { this.selectedIndex = index; this.updateDebug(); } else this.buyItem(cfg);
    });
    if (LOCAL_DEBUG_ALLOWED) zone.on('drag', (pointer, x, y) => {
      if (!this.debugMode || this.hudPanelOpen || this.exiting) return;
      cfg.x = Math.round(x); cfg.y = Math.round(y); this.selectedIndex = index; this.syncHotspot(hs); this.updateDebug();
    });
    this.syncHotspot(hs); return hs;
  }

  syncHotspot(hs) {
    const { cfg, zone, label, stamp } = hs;
    zone.setPosition(cfg.x, cfg.y); zone.setSize(cfg.w, cfg.h); zone.input.hitArea.setTo(0, 0, cfg.w, cfg.h);
    label?.setPosition(cfg.x, cfg.y - cfg.h / 2 - 8);
    stamp?.setPosition(cfg.x, cfg.y + cfg.h / 2 - 16);
    this.drawHotspot(hs);
  }

  drawHotspot(hs, time = this.time?.now ?? 0) {
    const { cfg, highlight, label, index } = hs, debugging = LOCAL_DEBUG_ALLOWED && this.debugMode;
    const hovering = Boolean(hs.hovered && !debugging && !this.hudPanelOpen && !this.exiting);
    highlight.clear();
    if (debugging) {
      highlight.fillStyle(0x00ff88, 0.2); highlight.fillRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h);
      highlight.lineStyle(2, index === this.selectedIndex ? 0xff44ff : 0x00ff88, 1);
      highlight.strokeRect(cfg.x - cfg.w / 2, cfg.y - cfg.h / 2, cfg.w, cfg.h);
    } else if (hovering) {
      this.drawHoverFrame(highlight, cfg, time);
    }
    highlight.setVisible(debugging || hovering); label?.setVisible(debugging);
  }

  // złote narożniki + delikatna poświata (pulsują)
  drawHoverFrame(g, cfg, time) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 170), pad = 5;
    const l = cfg.x - cfg.w / 2 - pad, t = cfg.y - cfg.h / 2 - pad, r = cfg.x + cfg.w / 2 + pad, b = cfg.y + cfg.h / 2 + pad;
    const len = Math.min(24, (r - l) / 3, (b - t) / 3);
    g.fillStyle(COLOR.gold, 0.05 + 0.06 * pulse); g.fillRoundedRect(l, t, r - l, b - t, 6);
    g.lineStyle(3, COLOR.goldLight, 0.65 + 0.35 * pulse);
    g.lineBetween(l, t, l + len, t); g.lineBetween(l, t, l, t + len);
    g.lineBetween(r, t, r - len, t); g.lineBetween(r, t, r, t + len);
    g.lineBetween(l, b, l + len, b); g.lineBetween(l, b, l, b - len);
    g.lineBetween(r, b, r - len, b); g.lineBetween(r, b, r, b - len);
  }

  updateHover(time) {
    if (this.debugMode || this.exiting || !this.hotspots?.length) return;
    for (const hs of this.hotspots) if (hs.hovered && hs.highlight?.active) this.drawHotspot(hs, time);
  }

  clearHotspotHighlights() {
    this.hotspots.forEach(hs => { hs.hovered = false; this.drawHotspot(hs); });
    this.stockRows.forEach(row => this.setRowHover(row, false));
  }

  // pieczątka "SOLD" na przedmiotach, które już mamy
  refreshOwnedStamps() {
    for (const hs of this.hotspots) {
      const owned = this.getBuyState(hs.cfg).code === 'owned';
      if (owned && !hs.stamp) hs.stamp = this.createStamp(hs);
      else if (!owned && hs.stamp) { hs.stamp.destroy(); hs.stamp = null; }
    }
  }

  createStamp(hs) {
    const { cfg } = hs;
    const c = this.add.container(cfg.x, cfg.y + cfg.h / 2 - 16).setDepth(12).setAngle(-9).setAlpha(0.9);
    const t = this.add.text(0, 1, __dialogueText("scenes/ShopScene.js", "t_68c47195c04106b62b6d"), { fontFamily: FONT.pixel, fontSize: '11px', color: '#ff5a4d' }).setOrigin(0.5);
    const r = this.add.rectangle(0, 0, t.width + 18, t.height + 14, COLOR.leather, 0.65).setStrokeStyle(2, COLOR.red, 1);
    c.add([r, t]);
    return c;
  }

  // ===========================================================================
  // KASA - gadająca (easter egg + humor)
  // ===========================================================================
  createRegisterZone() {
    const zone = this.add.zone(392, 615, 205, 200).setOrigin(0.5).setDepth(9).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (this.debugMode || this.hudPanelOpen || this.exiting) return;
      this.sayQuip(QUIPS.idle);
    });
    this.registerZone = zone;
  }

  sayQuip(list) {
    if (!list?.length || this.exiting || this._cleanupDone || !this.sys?.isActive()) return;
    let text, guard = 0;
    do { text = list[Math.floor(Math.random() * list.length)]; guard++; } while (list.length > 1 && text === this.lastQuip && guard < 6);
    this.lastQuip = text;
    this.showBubble(text);
    this.scheduleIdleQuip();
  }

  scheduleIdleQuip() {
    this.idleTimer?.remove(false);
    this.idleTimer = this.time.delayedCall(Phaser.Math.Between(14000, 22000), () => {
      if (this.exiting || this._cleanupDone) return;
      if (this.hudPanelOpen || this.debugMode) { this.scheduleIdleQuip(); return; }
      this.sayQuip(QUIPS.idle);
    });
  }

  showBubble(text) {
    this.destroyBubble();
    const ax = 392, ay = 500;
    const label = this.add.text(0, 0, text, { fontFamily: FONT.body, fontSize: '16px', color: '#2b2118', wordWrap: { width: 270 }, align: 'center' }).setOrigin(0.5);
    const w = Math.round(label.width + 34), h = Math.round(label.height + 22), cy = -(h / 2 + 16);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3); g.fillRoundedRect(-w / 2 + 3, cy - h / 2 + 4, w, h, 10);
    g.fillStyle(0xfff6dc, 1); g.fillRoundedRect(-w / 2, cy - h / 2, w, h, 10);
    g.fillTriangle(-10, cy + h / 2 - 1, 10, cy + h / 2 - 1, 0, 0);
    g.lineStyle(2, COLOR.ink, 1); g.strokeRoundedRect(-w / 2, cy - h / 2, w, h, 10);
    g.lineBetween(-10, cy + h / 2, 0, 0); g.lineBetween(10, cy + h / 2, 0, 0);
    g.fillStyle(0xfff6dc, 1); g.fillRect(-9, cy + h / 2 - 3, 18, 4);
    label.setPosition(0, cy);
    const c = this.add.container(ax, ay, [g, label]).setDepth(200).setScale(0.6).setAlpha(0);
    this.bubble = c;
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });
    this.bubbleTimer = this.time.delayedCall(3600 + text.length * 25, () => this.hideBubble(c));
  }

  hideBubble(c = this.bubble) {
    if (!c?.active || c !== this.bubble) return;
    this.tweens.add({ targets: c, alpha: 0, scale: 0.8, duration: 180,
      onComplete: () => { if (c.active) c.destroy(); if (this.bubble === c) this.bubble = null; } });
  }

  destroyBubble() {
    this.bubbleTimer?.remove(false); this.bubbleTimer = null;
    if (this.bubble?.active) { this.tweens.killTweensOf(this.bubble); this.bubble.destroy(); }
    this.bubble = null;
  }

  // ===========================================================================
  // PARAGON (toast)
  // ===========================================================================
  showFeedback(text, kind = 'info', sub = null) {
    this.destroyToast();
    if (!this.sys?.isActive()) return;
    const { width } = this.scale;
    const W = 470, PAD = 18, TEXT_X = -W / 2 + PAD + 46;
    const accent = kind === 'success' ? COLOR.green : kind === 'error' ? COLOR.red : COLOR.brass;
    const accentHex = kind === 'success' ? '#2f7d32' : kind === 'error' ? '#9a2b2b' : '#8b6b2f';
    const head = this.add.text(TEXT_X, 14, kind === __dialogueText("scenes/ShopScene.js", "t_aee408847d35e44e9943") ? __dialogueText("scenes/ShopScene.js", "t_4b304cbbb823bedd4f85") : kind === __dialogueText("scenes/ShopScene.js", "t_ca00fccfb408989eddc4") ? __dialogueText("scenes/ShopScene.js", "t_efac12f92667900c0d3a") : __dialogueText("scenes/ShopScene.js", "t_dfb14fbb9e7d095209ec"),
      { fontFamily: FONT.pixel, fontSize: '9px', color: accentHex });
    const msg = this.add.text(TEXT_X, 32, text, { fontFamily: FONT.body, fontSize: '18px', color: '#2b2118', wordWrap: { width: W - PAD * 2 - 52 } });
    const subText = sub ? this.add.text(W / 2 - PAD, 32 + msg.height + 8, sub, { fontFamily: FONT.pixel, fontSize: '12px', color: accentHex }).setOrigin(1, 0) : null;
    const H = Math.round(32 + msg.height + (sub ? 30 : 10) + 14), TEETH = 7, STEP = 14;

    const g = this.add.graphics();
    const pts = [{ x: -W / 2, y: 0 }, { x: W / 2, y: 0 }, { x: W / 2, y: H - TEETH }];
    const n = Math.floor(W / STEP);
    for (let i = 0; i <= n; i++) pts.push({ x: W / 2 - i * STEP, y: i % 2 === 0 ? H : H - TEETH });
    pts.push({ x: -W / 2, y: H - TEETH });
    g.fillStyle(0x000000, 0.3); g.fillPoints(pts.map(p => ({ x: p.x + 4, y: p.y + 6 })), true);
    g.fillStyle(COLOR.paper, 1); g.fillPoints(pts, true);
    g.fillStyle(accent, 1); g.fillRect(-W / 2, 0, 6, H - TEETH);
    // ikona
    const ix = -W / 2 + PAD + 20, iy = (H - TEETH) / 2;
    g.fillStyle(accent, 1); g.fillCircle(ix, iy, 15);
    g.lineStyle(3, 0xffffff, 1);
    if (kind === 'success') { g.lineBetween(ix - 7, iy, ix - 2, iy + 6); g.lineBetween(ix - 2, iy + 6, ix + 8, iy - 6); }
    else if (kind === 'error') { g.lineBetween(ix - 6, iy - 6, ix + 6, iy + 6); g.lineBetween(ix + 6, iy - 6, ix - 6, iy + 6); }
    else { g.lineBetween(ix, iy - 7, ix, iy + 2); g.fillStyle(0xffffff, 1); g.fillCircle(ix, iy + 7, 2); }

    const c = this.add.container(width / 2, -H - 20, [g, head, msg]).setDepth(250).setAngle(Phaser.Math.FloatBetween(-1.1, 1.1));
    if (subText) c.add(subText);
    this.toast = c;
    this.tweens.add({ targets: c, y: 92, duration: 260, ease: 'Back.easeOut' });
    this.toastTimer = this.time.delayedCall(3500, () => {
      if (!c.active || this.toast !== c) return;
      this.tweens.add({ targets: c, y: -H - 20, alpha: 0, duration: 240, ease: 'Cubic.easeIn',
        onComplete: () => { if (c.active) c.destroy(); if (this.toast === c) this.toast = null; } });
    });
  }

  destroyToast() {
    this.toastTimer?.remove(false); this.toastTimer = null;
    if (this.toast?.active) { this.tweens.killTweensOf(this.toast); this.toast.destroy(); }
    this.toast = null;
  }

  // ===========================================================================
  // EFEKTY ZAKUPU
  // ===========================================================================
  purchaseEffects(cfg) {
    if (!this.sys?.isActive()) return;
    const x = cfg.x, y = cfg.y;
    const floater = this.add.text(x, y - cfg.h / 2, `${__dialogueText("scenes/ShopScene.js", "t_95f2bcb8660f18a2da71")}${cfg.price}`, { fontFamily: FONT.pixel, fontSize: '16px', color: '#ffd966',
      stroke: __dialogueText("scenes/ShopScene.js", "t_235a6458fcc0b8e2e639"), strokeThickness: 4 }).setOrigin(0.5).setDepth(260);
    this.tweens.add({ targets: floater, y: floater.y - 80, alpha: 0, duration: 1100, ease: 'Cubic.easeOut',
      onComplete: () => { if (floater.active) floater.destroy(); } });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4, dist = 50 + Math.random() * 60;
      const p = this.add.circle(x, y, 3 + Math.random() * 3, i % 2 ? COLOR.gold : COLOR.goldLight).setDepth(260);
      this.tweens.add({ targets: p, x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist - 20, alpha: 0, scale: 0.2,
        duration: 600 + Math.random() * 300, ease: 'Cubic.easeOut', onComplete: () => { if (p.active) p.destroy(); } });
    }
  }

  // ===========================================================================
  // DEBUG (bez zmian funkcjonalnych)
  // ===========================================================================
  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED) return;
    this.debugMode = Boolean(enabled); this.hideTooltip();
    this.hotspots.forEach(hs => { hs.hovered = false; this.input.setDraggable(hs.zone, this.debugMode); }); this.updateDebug();
  }
  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;
    this.hotspots.forEach(hs => this.drawHotspot(hs)); const cfg = this.hotspots[this.selectedIndex]?.cfg;
    this.debugText?.setVisible(this.debugMode).setText(this.debugMode ? [
      `${__dialogueText("scenes/ShopScene.js", "t_cb40a67f6cdee4b5ad52")}${cfg?.id || __dialogueText("scenes/ShopScene.js", "t_a7b605aae185f602d654")}${__dialogueText("scenes/ShopScene.js", "t_1bcb682bca445116a9df")}${this.cityId}${__dialogueText("scenes/ShopScene.js", "t_643654cebb2e43070c60")}${this.getShopDay()}`,
      `${__dialogueText("scenes/ShopScene.js", "t_51e33c7c7efbc350d26f")}${cfg?.x}${__dialogueText("scenes/ShopScene.js", "t_8278a5c11d3d9380f821")}${cfg?.y}${__dialogueText("scenes/ShopScene.js", "t_1b89a9604b178452218e")}${cfg?.w}${__dialogueText("scenes/ShopScene.js", "t_3f4674b8e35cc249a199")}${cfg?.h}`,
      __dialogueText("scenes/ShopScene.js", "t_ab723c339f7fee296c8c"),
      __dialogueText("scenes/ShopScene.js", "t_8a8e5fa4a5df6de70337"), __dialogueText("scenes/ShopScene.js", "t_03f07483af5fb2894ac7")
    ].join(__dialogueText("scenes/ShopScene.js", "t_01ba4719c80b6fe911b0")) : '');
  }
  isEditableTarget(event) {
    const target = event.target;
    return Boolean(target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName));
  }
  onEscape(event) { if (this.isEditableTarget(event) || this.hudPanelOpen) return; this.exitShop(); }
  onDebugKey(event) {
    if (!LOCAL_DEBUG_ALLOWED || this.isEditableTarget(event) || this.hudPanelOpen || this.exiting || event.ctrlKey || event.metaKey) return;
    if (event.code === 'KeyD') { if (!event.repeat) this.setDebugMode(!this.debugMode); return; }
    if (!this.debugMode) return;
    if (event.code === 'KeyC') { if (!event.repeat) this.printConfig(); return; }
    if (!this.hotspots.length) return;
    if (event.code === __dialogueText("scenes/ShopScene.js", "t_90ddf1963abb36c9921c")) {
      event.preventDefault(); const delta = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + delta + this.hotspots.length) % this.hotspots.length; this.updateDebug(); return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault(); const hs = this.hotspots[this.selectedIndex], cfg = hs.cfg, step = event.altKey ? 1 : 5;
    const horizontal = event.code === 'ArrowLeft' || event.code === 'ArrowRight';
    const direction = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 1;
    const key = event.shiftKey ? (horizontal ? 'w' : 'h') : (horizontal ? 'x' : 'y');
    cfg[key] += direction * step; cfg.w = Math.max(10, cfg.w); cfg.h = Math.max(10, cfg.h);
    this.syncHotspot(hs); this.updateDebug();
  }
  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;
    console.log('COPY INTO config/shopConfig.js -> hotspots:'); console.log(JSON.stringify(this.allProducts, null, 2));
  }

  // ===========================================================================
  // ZAKUP
  // ===========================================================================
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
  }

  refreshMoneyHUD(initial = false) {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
    this.setCashDisplay(cash, !initial);
    this.updateStockRows();
    this.refreshOwnedStamps();
    if (this.tagCfg && this.tag?.container?.visible) this.renderTag(this.tagCfg);
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