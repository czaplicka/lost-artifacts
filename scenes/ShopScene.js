import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from '../managers/MoneyManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { SHOP_CONFIG } from '../config/shopConfig.js';

const LOCAL_DEBUG_ALLOWED = ['127.0.0.1', 'localhost'].includes(
  window.location.hostname
);

const FALLBACK_DESCRIPTIONS = [
  'Who the hell knows what this is for.',
  'The shopkeeper shrugged. That is all we got.',
  'No label, no manual, no refunds.',
  'Probably useful. Probably legal.',
  'It was in a box marked "Misc." Good enough for a detective.',
  'Smells like a clue. Or lunch.',
  'Do not ask where it came from.',
  'Buy first, understand later.'
];

const CITY_ALIASES = {
  new_york: 'new_york_city',
  new_york_city: 'new_york_city',
  new_delhi: 'new_delhi',
  new_dehli: 'new_delhi',
  kotte: 'kotte',
  sri_jayawardenepura_kotte: 'kotte'
};

function normalizeCityId(value) {
  if (!value) return 'paris';

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return CITY_ALIASES[normalized] || normalized;
}

function hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

function seededRandom(seed) {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6D2B79F5) >>> 0;

    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ShopScene extends BaseScene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  init(data = {}) {
    this.returnTo =
      data.returnScene || data.returnTo || 'CrimeCityScene';

    this.cityId = normalizeCityId(
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentMission?.city
    );

    this.debugMode = false;
    this.selectedIndex = 0;
    this.debugText = null;

    this.buying = false;
    this.exiting = false;
    this.stockEntries = [];
    this.hotspots = [];

    this.allProducts = SHOP_CONFIG.hotspots.map(cfg => ({
      ...cfg,
      item: { ...cfg.item }
    }));

    this.products = this.pickTodaysProducts(this.allProducts);

    this.stockPage = 0;
    this.hudPanelOpen = false;
    this.shopHud = null;
    this.feedback = null;
    this.tooltip = null;
    this.shopRunToken = {};
  }

  getShopDay() {
    const day = Number(gameState.currentDay || gameState.day || 1);
    return Number.isFinite(day) ? day : 1;
  }

  pickTodaysProducts(all) {
    const inCity = all.filter(cfg => {
      if (!Array.isArray(cfg.cities) || !cfg.cities.length) {
        return true;
      }

      return cfg.cities.map(normalizeCityId).includes(this.cityId);
    });

    const permanent = inCity.filter(cfg => cfg.type !== 'rotating');
    const pool = inCity.filter(cfg => cfg.type === 'rotating');
    const count = Math.min(pool.length, SHOP_CONFIG.rotatingCount ?? 3);

    const rand = seededRandom(
      hashString(`${this.cityId}|day${this.getShopDay()}`)
    );

    const shuffled = [...pool];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const todays = new Set(shuffled.slice(0, count));

    return all.filter(cfg => permanent.includes(cfg) || todays.has(cfg));
  }

  preload() {
    if (!this.textures.exists('shop_bg')) {
      this.load.image('shop_bg', 'assets/local/shop.jpg');
    }
  }

  create() {
    super.create();

    const { width, height } = this.scale;
    const runToken = this.shopRunToken;

    this.add
      .image(width / 2, height / 2, 'shop_bg')
      .setDisplaySize(width, height);

    this.moneyText = this.add
      .text(16, 16, '', this.style(16))
      .setDepth(100);

    this.hotspots = this.products.map(
      (cfg, index) => this.createHotspot(cfg, index)
    );

    this.boardContainer = this.add.container(0, 0).setDepth(90);
    this.createStockBoard();
    this.createExitButton();

    this.tooltip = this.add.text(0, 0, '', {
      ...this.style(15),
      wordWrap: { width: 280 }
    }).setDepth(300).setVisible(false);

    if (LOCAL_DEBUG_ALLOWED) {
      this.debugText = this.add
        .text(16, height - 130, '', {
          ...this.style(13),
          wordWrap: { width: Math.max(100, width - 32) }
        })
        .setDepth(400)
        .setVisible(false);
    }

    const keyboard = this.input.keyboard;
    const escapeHandler = event => this.onEscape(event);
    const debugHandler = event => this.onDebugKey(event);

    keyboard?.on('keydown-ESC', escapeHandler);

    if (LOCAL_DEBUG_ALLOWED) {
      keyboard?.on('keydown', debugHandler);
    }

    const moneyHandler = () => this.refreshMoneyHUD();

    window.addEventListener(
      'lost-artifacts:money-changed',
      moneyHandler
    );

    const panelHandler = state => {
      this.hudPanelOpen = Boolean(
        state?.gameplaySceneKey === 'ShopScene' &&
        state.anyPanelOpen
      );

      if (this.hudPanelOpen) {
        this.hideTooltip();

        if (this.debugMode) {
          this.setDebugMode(false);
        }

        this.clearHotspotHighlights();
      }
    };

    this.events.once('shutdown', () => {
      keyboard?.off('keydown-ESC', escapeHandler);

      if (LOCAL_DEBUG_ALLOWED) {
        keyboard?.off('keydown', debugHandler);
      }

      window.removeEventListener(
        'lost-artifacts:money-changed',
        moneyHandler
      );

      this.shopHud?.events.off('panelStateChanged', panelHandler);
      this.shopHud = null;

      if (this.shopRunToken === runToken) {
        this.shopRunToken = null;
      }
    });

    this.refreshMoneyHUD();
    void this.setupShopHud(runToken, panelHandler);
  }

  async setupShopHud(runToken, panelHandler) {
    try {
      const hud = await this.restorePlayerHud();

      if (
        this.shopRunToken !== runToken ||
        this._cleanupDone ||
        !this.sys.isActive() ||
        this.exiting ||
        !hud
      ) {
        return;
      }

      this.shopHud = hud;
      hud.events.on('panelStateChanged', panelHandler);
      hud.closeAllUIPanels();
      hud.setCurrentGameplayScene('ShopScene');
      hud.refreshUI?.();
      hud.showHud();

      this.hudPanelOpen = hud.isAnyPanelOpen();

      if (this.hudPanelOpen) {
        this.setDebugMode(false);
        this.hideTooltip();
        this.clearHotspotHighlights();
      }
    } catch (error) {
      console.error('[ShopScene] HUD setup failed:', error);
    }
  }

  style(size = 16) {
    return {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color: '#fff1ce',
      backgroundColor: '#191b16',
      padding: { x: 8, y: 6 }
    };
  }

  createExitButton() {
    const { width } = this.scale;

    if (this.textures.exists('btnExit')) {
      const btn = this.add.image(0, 0, 'btnExit')
        .setScale(0.5)
        .setOrigin(0.5)
        .setDepth(100)
        .setInteractive({ useHandCursor: true });

      btn.setPosition(
        width - 20 - btn.displayWidth / 2,
        16 + btn.displayHeight / 2
      );

      btn.on('pointerover', () => {
        if (!this.hudPanelOpen) btn.setScale(0.6);
      });

      btn.on('pointerout', () => btn.setScale(0.5));
      btn.on('pointerdown', () => this.exitShop());

      this.exitButton = btn;
    } else {
      console.warn(
        '[ShopScene] Texture "btnExit" missing, using text fallback.'
      );

      this.exitButton = this.add
        .text(width - 20, 16, '[EXIT]', this.style(16))
        .setOrigin(1, 0)
        .setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.exitShop());
    }
  }

  getDescription(cfg) {
    const own = cfg.description || cfg.item?.description;
    if (own) return own;

    const key = String(cfg.id || cfg.item?.id || cfg.label || '');

    return FALLBACK_DESCRIPTIONS[
      hashString(key) % FALLBACK_DESCRIPTIONS.length
    ];
  }

  showTooltip(cfg, x, y, originY = 1) {
    if (
      !this.tooltip ||
      this.hudPanelOpen ||
      this.exiting ||
      this.debugMode
    ) {
      return;
    }

    this.tooltip.setText(
      `${cfg.label} — $${cfg.price}\n${this.getDescription(cfg)}`
    );

    this.tooltip.setOrigin(0.5, originY);

    const { width, height } = this.scale;
    const half = this.tooltip.width / 2;
    const tx = Phaser.Math.Clamp(x, half + 4, width - half - 4);

    let ty = y;

    if (originY === 1 && ty - this.tooltip.height < 4) {
      ty = y + 40;
      this.tooltip.setOrigin(0.5, 0);
    }

    if (
      this.tooltip.originY === 0 &&
      ty + this.tooltip.height > height - 4
    ) {
      ty = height - this.tooltip.height - 4;
    }

    this.tooltip.setPosition(tx, ty).setVisible(true);
  }

  hideTooltip() {
    this.tooltip?.setVisible(false);
  }

  clearHotspotHighlights() {
    this.hotspots.forEach(hs => {
      hs.hovered = false;

      if (!this.debugMode) {
        hs.highlight.setVisible(false);
      }
    });
  }

  createStockBoard() {
    this.boardContainer.removeAll(true);
    this.stockEntries = [];

    const { x, y } = SHOP_CONFIG.stockBoard;
    const perPage = Math.max(
      1,
      Math.floor((this.scale.height - y - 200) / 30)
    );

    const pages = Math.max(
      1,
      Math.ceil(this.products.length / perPage)
    );

    this.stockPage = Math.min(this.stockPage, pages - 1);

    const visible = this.products.slice(
      this.stockPage * perPage,
      (this.stockPage + 1) * perPage
    );

    const panelHeight = 100 + visible.length * 30;

    const board = this.add
      .rectangle(x, y, 280, panelHeight, 0x191b16, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8a7a4d)
      .setInteractive();

    this.boardContainer.add(board);
    this.boardContainer.add(
      this.add.text(x + 12, y + 10, "TODAY'S STOCK", this.style(17))
    );

    visible.forEach((cfg, i) => {
      const entryY = y + 43 + i * 30;

      const entry = this.add
        .text(
          x + 12,
          entryY,
          `${cfg.label} — $${cfg.price}`,
          this.style(16)
        )
        .setInteractive({ useHandCursor: true });

      entry.on('pointerdown', () => this.buyItem(cfg));

      entry.on('pointerover', () => {
        this.showTooltip(cfg, x + 140, entryY + 40, 0);
      });

      entry.on('pointerout', () => this.hideTooltip());

      this.boardContainer.add(entry);
      this.stockEntries.push({ cfg, entry });
    });

    const footerY = y + panelHeight - 42;

    this.boardContainer.add(
      this.add.text(
        x + 75,
        footerY,
        `${this.stockPage + 1}/${pages}`,
        this.style(14)
      )
    );

    for (const [label, offset, delta] of [
      ['<', 12, -1],
      ['>', 235, 1]
    ]) {
      const button = this.add
        .text(x + offset, footerY, label, this.style(16))
        .setInteractive({ useHandCursor: true });

      button.on('pointerdown', () => {
        if (this.hudPanelOpen || this.exiting) return;

        this.hideTooltip();
        this.stockPage = (this.stockPage + delta + pages) % pages;
        this.createStockBoard();
        this.refreshMoneyHUD();
      });

      this.boardContainer.add(button);
    }
  }

  createHotspot(cfg, index) {
    const zone = this.add
      .zone(cfg.x, cfg.y, cfg.w, cfg.h)
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    const highlight = this.add.graphics()
      .setDepth(11)
      .setVisible(false);

    const label = LOCAL_DEBUG_ALLOWED
      ? this.add.text(0, 0, cfg.label, this.style(16))
        .setOrigin(0.5, 1)
        .setDepth(20)
        .setVisible(false)
      : null;

    const hs = {
      cfg,
      zone,
      highlight,
      label,
      index,
      hovered: false
    };

    zone.on('pointerover', () => {
      if (this.debugMode || this.hudPanelOpen || this.exiting) return;

      hs.hovered = true;
      this.drawHotspot(hs);

      this.showTooltip(
        cfg,
        cfg.x,
        cfg.y - cfg.h / 2 - 8,
        1
      );
    });

    zone.on('pointerout', () => {
      hs.hovered = false;

      if (!this.debugMode) {
        this.drawHotspot(hs);
        this.hideTooltip();
      }
    });

    zone.on('pointerdown', () => {
      if (this.hudPanelOpen || this.exiting) return;

      if (this.debugMode && LOCAL_DEBUG_ALLOWED) {
        this.selectedIndex = index;
        this.updateDebug();
      } else {
        this.buyItem(cfg);
      }
    });

    if (LOCAL_DEBUG_ALLOWED) {
      zone.on('drag', (pointer, x, y) => {
        if (!this.debugMode || this.hudPanelOpen || this.exiting) {
          return;
        }

        cfg.x = Math.round(x);
        cfg.y = Math.round(y);

        this.selectedIndex = index;
        this.syncHotspot(hs);
        this.updateDebug();
      });
    }

    this.syncHotspot(hs);
    return hs;
  }

  syncHotspot(hs) {
    const { cfg, zone, label } = hs;

    zone.setPosition(cfg.x, cfg.y);
    zone.setSize(cfg.w, cfg.h);

    zone.input.hitArea.setTo(0, 0, cfg.w, cfg.h);

    label?.setPosition(
      cfg.x,
      cfg.y - cfg.h / 2 - 8
    );

    this.drawHotspot(hs);
  }

  drawHotspot(hs) {
    const { cfg, highlight, label, index } = hs;

    const debugging = LOCAL_DEBUG_ALLOWED && this.debugMode;

    highlight.clear();

    if (debugging) {
      highlight.fillStyle(0x00ff88, 0.2);
      highlight.fillRect(
        cfg.x - cfg.w / 2,
        cfg.y - cfg.h / 2,
        cfg.w,
        cfg.h
      );

      highlight.lineStyle(
        2,
        index === this.selectedIndex ? 0xff44ff : 0x00ff88,
        1
      );

      highlight.strokeRect(
        cfg.x - cfg.w / 2,
        cfg.y - cfg.h / 2,
        cfg.w,
        cfg.h
      );
    } else if (hs.hovered && !this.hudPanelOpen && !this.exiting) {
      highlight.fillStyle(0xffd166, 0.18);
      highlight.fillRect(
        cfg.x - cfg.w / 2,
        cfg.y - cfg.h / 2,
        cfg.w,
        cfg.h
      );
    }

    highlight.setVisible(
      debugging ||
      (hs.hovered && !this.hudPanelOpen && !this.exiting)
    );

    label?.setVisible(debugging);
  }

  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED) return;

    this.debugMode = Boolean(enabled);
    this.hideTooltip();

    this.hotspots.forEach(hs => {
      hs.hovered = false;
      this.input.setDraggable(hs.zone, this.debugMode);
    });

    this.updateDebug();
  }

  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;

    this.hotspots.forEach(hs => this.drawHotspot(hs));

    const cfg = this.hotspots[this.selectedIndex]?.cfg;

    this.debugText?.setVisible(this.debugMode).setText(
      this.debugMode
        ? [
          `LOCAL DEBUG: ${cfg?.id || 'no items'} | city:${this.cityId} day:${this.getShopDay()}`,
          `x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}`,
          'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
          'Tab / Shift+Tab: select | C: export | D: close',
          'Purchases disabled.'
        ].join('\n')
        : ''
    );
  }

  isEditableTarget(event) {
    const target = event.target;

    return Boolean(
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)
    );
  }

  onEscape(event) {
    if (this.isEditableTarget(event) || this.hudPanelOpen) return;
    this.exitShop();
  }

  onDebugKey(event) {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      this.isEditableTarget(event) ||
      this.hudPanelOpen ||
      this.exiting ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (event.code === 'KeyD') {
      if (!event.repeat) {
        this.setDebugMode(!this.debugMode);
      }

      return;
    }

    if (!this.debugMode) return;

    if (event.code === 'KeyC') {
      if (!event.repeat) this.printConfig();
      return;
    }

    if (!this.hotspots.length) return;

    if (event.code === 'Tab') {
      event.preventDefault();

      const delta = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex + delta + this.hotspots.length
      ) % this.hotspots.length;

      this.updateDebug();
      return;
    }

    if (![
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown'
    ].includes(event.code)) {
      return;
    }

    event.preventDefault();

    const hs = this.hotspots[this.selectedIndex];
    const cfg = hs.cfg;
    const step = event.altKey ? 1 : 5;

    const horizontal =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight';

    const direction =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowUp'
        ? -1
        : 1;

    const key = event.shiftKey
      ? (horizontal ? 'w' : 'h')
      : (horizontal ? 'x' : 'y');

    cfg[key] += direction * step;
    cfg.w = Math.max(10, cfg.w);
    cfg.h = Math.max(10, cfg.h);

    this.syncHotspot(hs);
    this.updateDebug();
  }

  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;

    console.log('COPY INTO config/shopConfig.js -> hotspots:');
    console.log(JSON.stringify(this.allProducts, null, 2));
  }

  buyItem(cfg) {
    if (
      this.debugMode ||
      this.buying ||
      this.exiting ||
      this.hudPanelOpen
    ) {
      return;
    }

    if (
      !Number.isInteger(cfg.price) ||
      cfg.price <= 0 ||
      !cfg.item?.id ||
      !cfg.item?.name
    ) {
      console.error('[ShopScene] Invalid product:', cfg);
      this.showFeedback('This item is not ready for sale.');
      return;
    }

    const existing = inventoryManager.getItem(cfg.item.id);

    if (
      existing &&
      !(existing.stackable === true && cfg.item.stackable === true)
    ) {
      this.showFeedback('You already own this item.');
      return;
    }

    const capacity = inventoryManager.getCapacity();

    if (!existing && capacity.current >= capacity.max) {
      this.showFeedback('Inventory full. Even detectives need pockets.');
      return;
    }

    this.buying = true;

    try {
      const purchase = moneyManager.spend(cfg.price, {
        source: MONEY_SOURCE.CASH,
        category: ECONOMY_CATEGORY.ITEM,
        description: `Shop: ${cfg.label}`,
        metadata: { itemId: cfg.item.id }
      });

      if (!purchase.ok) {
        this.showFeedback('Not enough money!');
        return;
      }

      const added = inventoryManager.addItem({ ...cfg.item });

      if (!added) {
        moneyManager.refund(purchase.transaction.amount, {
          source: MONEY_SOURCE.CASH,
          description: `Shop refund: ${cfg.label}`,
          metadata: {
            itemId: cfg.item.id,
            purchaseId: purchase.transaction.id
          }
        });

        this.showFeedback('Item could not be added. Payment refunded.');
        return;
      }

      const saved = saveGameState();

      this.showFeedback(
        saved
          ? `Bought: ${cfg.item.name} (-$${cfg.price})`
          : 'Bought, but autosave failed. Save your game before leaving.'
      );
    } catch (error) {
      console.error('[ShopScene] Purchase failed:', error);

      this.showFeedback(
        'Purchase error. Check the console before trying again.'
      );
    } finally {
      this.buying = false;
      this.refreshMoneyHUD();
    }
  }

  refreshMoneyHUD() {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);

    this.moneyText?.setText(`Cash: $${cash}`);

    this.stockEntries.forEach(({ cfg, entry }) => {
      entry.setColor(cash >= cfg.price ? '#fff1ce' : '#858575');
    });
  }

  showFeedback(text) {
    this.feedback?.destroy();

    const message = this.add
      .text(this.scale.width / 2, 65, text, {
        ...this.style(18),
        wordWrap: {
          width: Math.max(100, this.scale.width - 60)
        },
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(250);

    this.feedback = message;

    this.time.delayedCall(3500, () => {
      if (message.active) message.destroy();
      if (this.feedback === message) this.feedback = null;
    });
  }

  exitShop() {
    if (this.exiting || this.buying || this.hudPanelOpen) return;

    this.setDebugMode(false);
    this.exiting = true;
    this.hideTooltip();
    this.clearHotspotHighlights();
    this.shopHud?.closeAllUIPanels();

    const target = this.returnTo;

    if (this.scene.isPaused(target)) {
      this.scene.resume(target);
      this.scene.stop();
    } else if (this.scene.isSleeping(target)) {
      this.scene.wake(target);
      this.scene.stop();
    } else if (this.scene.isActive(target)) {
      this.shopHud?.setCurrentGameplayScene(target);
      this.scene.bringToTop(target);
      this.scene.stop();
    } else {
      this.scene.start(target);
    }
  }
}