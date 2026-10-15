// ============================================================
// scenes/ShopScene.js — sklep spożywczy (główne okno)
// Tło: assets/shop.jpg
// Hotspoty: kawa, pocztówki — kliknięcie = zakup
//   (MoneyManager.spend + InventoryManager.addItem przez BaseScene)
// "TODAY'S STOCK" — klikalna tablica asortymentu,
//   generowana z SHOP_CONFIG (jedno źródło prawdy)
// Debug: klawisz D — dopasowanie hotspotów pod tło
// Wejście z CrimeCityScene.visitShop() (scene.launch, mapa pauzuje)
// ============================================================

import { BaseScene } from './BaseScene.js';
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from '../managers/MoneyManager.js';

// ------------------------------------------------------------
// KONFIGURACJA HOTSPOTÓW — dopasuj w trybie debug (klawisz D),
// potem wciśnij C i wklej wynik z konsoli tutaj.
// x, y = środek prostokąta | w, h = szerokość/wysokość
// Item musi być zgodny z InventoryManager:
// unikalne id; stackable: true pozwala piętrzyć quantity.
// Bedside stock board i etykiety też biorą się z tego configu.
// ------------------------------------------------------------
import { SHOP_CONFIG } from '../config/shopConfig.js';

export class ShopScene extends BaseScene {
  constructor() {
    super({ key: 'ShopScene' });
    this.debugMode = false;
    this.selectedIndex = 0;
    this.stockEntries = [];
  }

  preload() {
    if (!this.textures.exists('shop_bg')) {
      this.load.image('shop_bg', 'assets/shop.jpg');
    }
  }

  init(data = {}) {
    // Scena miasta, do której wracamy (parent jest spauzowany)
    this.returnTo = data.returnScene || data.returnTo || 'CrimeCityScene';
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    // --- Tło dopasowane do okna ---
    const bg = this.add.image(width / 2, height / 2, 'shop_bg');
    bg.setDisplaySize(width, height);

    // --- HUD z gotówką (CASH; HUD gry i tak się odświeża
    //     po evencie lost-artifacts:money-changed z MoneyManager) ---
    this.moneyText = this.add.text(16, 16, '', {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 6 }
    }).setDepth(100);

    // --- Tablica asortymentu (generowana z SHOP_CONFIG) ---
    this.createStockBoard();

    // --- Hotspoty ---
    this.hotspots = SHOP_CONFIG.hotspots.map((cfg, index) =>
      this.createHotspot(cfg, index)
    );

    this.refreshMoneyHUD();

    // --- Wyjście ze sklepu ---
    this.add.text(width - 20, 16, '[EXIT]', {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '14px',
      color: '#ffd166',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 6 }
    })
      .setOrigin(1, 0)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.exitShop());
    this.input.keyboard.on('keydown-ESC', () => this.exitShop());

    // --- Debug ---
    this.input.keyboard.on('keydown-D', () => this.toggleDebug());
    this.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault();
      if (!this.debugMode) return;
      this.selectedIndex = (this.selectedIndex + 1) % this.hotspots.length;
      this.highlightSelected();
    });
    this.input.keyboard.on('keydown-C', () => {
      if (!this.debugMode) return;
      this.printConfig();
    });

    // Strzałki = przesuwanie, Shift+strzałki = skalowanie zaznaczonego hotspotu
    this.input.keyboard.on('keydown', (event) => {
      if (!this.debugMode) return;
      const hs = this.hotspots[this.selectedIndex];
      const step = 5;
      switch (event.code) {
        case 'ArrowLeft':
          event.shiftKey ? hs.resize(-2, 0) : hs.moveBy(-step, 0);
          break;
        case 'ArrowRight':
          event.shiftKey ? hs.resize(2, 0) : hs.moveBy(step, 0);
          break;
        case 'ArrowUp':
          event.shiftKey ? hs.resize(0, -2) : hs.moveBy(0, -step);
          break;
        case 'ArrowDown':
          event.shiftKey ? hs.resize(0, 2) : hs.moveBy(0, step);
          break;
      }
    });
  }

  // ------------------------------------------------------------
  // TABLICA „TODAY'S STOCK" — widoczna lista tego, co jest w
  // sprzedaży. Treść pochodzi wprost z SHOP_CONFIG.hotspots:
  // zmieniasz config -> zmienia się hotspot I wpis na tablicy.
  // Klik na pozycje = ten sam buyItem() co klik hotspotu.
  // ------------------------------------------------------------
  createStockBoard() {
    const { x, y } = SHOP_CONFIG.stockBoard;
    const lineHeight = 26;
    const boardHeight = 34 + SHOP_CONFIG.hotspots.length * lineHeight + 12;
    const boardWidth = 240;

    // Tło tablicy (styl: ścienna melamina/kreda)
    const board = this.add.rectangle(
      x, y, boardWidth, boardHeight, 0x12150f, 0.88
    )
      .setOrigin(0, 0)
      .setDepth(90);
    board.setStrokeStyle(2, 0x8a7a4d);

    // Nagłówek
    this.add.text(x + boardWidth / 2, y + 18, "TODAY'S STOCK", {
      fontFamily: 'SpecialElite, monospace',
      fontSize: '15px',
      color: '#ffd166'
    }).setOrigin(0.5).setDepth(91);

    // Pozycje — przetrzymuj odniesienia, zeby odswiezac dostepnosc
    this.stockEntries = SHOP_CONFIG.hotspots.map((cfg, i) => {
      const entry = this.add.text(
        x + 14,
        y + 36 + i * lineHeight,
        `${cfg.label} . . . $${cfg.price}`,
        {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '15px',
          color: '#e6e1c5'
        }
      )
        .setDepth(91)
        .setInteractive({ useHandCursor: true });

      entry.on('pointerover', () => entry.setColor('#ffff88'));
      entry.on('pointerout', () => this.refreshStockBoard());
      entry.on('pointerdown', () => this.buyItem(cfg));

      return { cfg, entry };
    });

    // Wskazówka, ze kliknięte też kupuje
    this.add.text(
      x + boardWidth / 2,
      y + boardHeight - 10,
      '— tap an item to buy —',
      {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '11px',
        color: '#8a8a7a'
      }
    ).setOrigin(0.5).setDepth(91);
  }

  // Szare, gdy gracza nie stac; normalne kiedy tak
  refreshStockBoard() {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH) ?? 0;
    this.stockEntries.forEach(({ cfg, entry }) => {
      entry.setColor(cash >= cfg.price ? '#e6e1c5' : '#6a6a5a');
    });
  }

  // ------------------------------------------------------------
  // Pojedynczy hotspot (strefa interaktywna + etykieta)
  // ------------------------------------------------------------
  createHotspot(cfg, index) {
    const rect = this.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0x00ff88, 0)
      .setStrokeStyle(0)
      .setInteractive({ useHandCursor: true, draggable: false })
      .setDepth(10);

    const label = this.add.text(cfg.x, cfg.y - cfg.h / 2 - 22, cfg.label, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: '16px',
      color: '#ffff00',
      backgroundColor: '#000000aa',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(11).setVisible(false);

    const hs = {
      cfg, rect, label,
      moveBy: (dx, dy) => {
        rect.x += dx; rect.y += dy;
        label.x = rect.x; label.y = rect.y - rect.height / 2 - 22;
        hs.syncCfg();
      },
      resize: (dw, dh) => {
        rect.width = Math.max(10, rect.width + dw);
        rect.height = Math.max(10, rect.height + dh);
        label.y = rect.y - rect.height / 2 - 22;
        hs.syncCfg();
      },
      syncCfg: () => {
        cfg.x = Math.round(rect.x); cfg.y = Math.round(rect.y);
        cfg.w = Math.round(rect.width); cfg.h = Math.round(rect.height);
      }
    };

    // --- Interakcje ---
    rect.on('pointerover', () => {
      if (this.debugMode) return;
      rect.setFillStyle(0xffff00, 0.15);
      label.setText(`${cfg.label} — $${cfg.price}`).setVisible(true);
    });
    rect.on('pointerout', () => {
      if (this.debugMode) return;
      rect.setFillStyle(0x00ff88, 0);
      label.setVisible(false);
    });
    rect.on('pointerdown', () => {
      if (this.debugMode) {
        this.selectedIndex = index;
        this.highlightSelected();
        return;
      }
      this.buyItem(cfg);
    });

    // Przeciąganie myszką w trybie debug
    this.input.setDraggable(rect);
    rect.on('drag', (pointer, dragX, dragY) => {
      if (!this.debugMode) return;
      rect.x = dragX; rect.y = dragY;
      label.x = rect.x; label.y = rect.y - rect.height / 2 - 22;
      hs.syncCfg();
    });

    return hs;
  }

  // ------------------------------------------------------------
  // ZAKUP: MoneyManager.spend + addInventoryItem (helper BaseScene)
  // ------------------------------------------------------------
  buyItem(cfg) {
    const purchase = moneyManager.spend(cfg.price, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.ITEM,
      label: cfg.label
    });

    if (!purchase) {
      this.showFeedback("Not enough money!", '#ff5555');
      return;
    }

    // InventoryManager odrzuca duplikat non-stackable ID —
    // kawa/pocztówki są stackable, więc rośnie tylko quantity.
    const added = this.addInventoryItem({ ...cfg.item });

    if (added === false) {
      // Pełne inventory — zwrot gotówki, żeby gracz nie stracił kasy
      moneyManager.add?.(cfg.price, {
        source: MONEY_SOURCE.CASH,
        category: 'item',
        label: `Refund: ${cfg.label}`
      });
      this.showFeedback('Inventory full!', '#ff5555');
      return;
    }

    this.showFeedback(`Bought: ${cfg.label} (-$${cfg.price})`, '#7dff7d');
    this.refreshMoneyHUD();
    this.refreshStockBoard();
  }

  // ------------------------------------------------------------
  // UI / feedback
  // ------------------------------------------------------------
  refreshMoneyHUD() {
    const cash = moneyManager.getBalance(MONEY_SOURCE.CASH) ?? 0;
    this.moneyText.setText(`$ ${cash}`);
    this.refreshStockBoard();
  }

  showFeedback(text, color) {
    const msg = this.add.text(this.scale.width / 2, 60, text, {
      fontFamily: 'SpecialElite, monospace',
      fontSize: '22px',
      color,
      backgroundColor: '#000000cc',
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: msg, alpha: 0, y: 40,
      delay: 1400, duration: 500,
      onComplete: () => msg.destroy()
    });
  }

  // ------------------------------------------------------------
  // Wyjście: stop tej sceny, wznowienie mapy miasta
  // (odpowiednik powrotu z ApartmentScene)
  // ------------------------------------------------------------
  exitShop() {
    if (!this.sys.isActive()) return;

    if (this.scene.isSleeping(this.returnTo) || this.scene.isPaused(this.returnTo)) {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    } else {
      this.scene.start(this.returnTo);
    }
  }

  // ------------------------------------------------------------
  // TRYB DEBUG — dopasowanie hotspotów pod shop.jpg
  // ------------------------------------------------------------
  toggleDebug() {
    this.debugMode = !this.debugMode;
    this.hotspots.forEach((hs) => {
      hs.rect.setStrokeStyle(this.debugMode ? 2 : 0, 0x00ff88);
      hs.rect.setFillStyle(0x00ff88, this.debugMode ? 0.25 : 0);
      hs.rect.setDraggable(this.debugMode);
      hs.label.setVisible(this.debugMode).setText(hs.cfg.label);
    });
    if (this.debugMode) this.highlightSelected();
    console.log(`[ShopScene] Debug: ${this.debugMode ? 'ON' : 'OFF'}`);
    console.log('Arrows = move | Shift+arrows = resize | Tab = next hotspot | mouse drag | C = print config');
  }

  highlightSelected() {
    this.hotspots.forEach((hs, i) => {
      hs.rect.setStrokeStyle(2, i === this.selectedIndex ? 0xff44ff : 0x00ff88);
    });
  }

  printConfig() {
    const out = SHOP_CONFIG.hotspots.map(h => ({
      id: h.id, label: h.label,
      x: h.x, y: h.y, w: h.w, h: h.h,
      price: h.price, item: h.item
    }));
    console.log('=== COPY INTO SHOP_CONFIG.hotspots ===');
    console.log(JSON.stringify(out, null, 2));
  }
}