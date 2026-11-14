import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
// ui/inventory/InventoryView.js

const CATEGORIES = {
  clue:     { color: 0x6fb7e9, css: '#6fb7e9' },
  evidence: { color: 0xe0654f, css: '#e0654f' },
  key:      { color: 0xe6c65c, css: '#e6c65c' },
  document: { color: 0xcdb892, css: '#cdb892' },
  misc:     { color: 0x9a95ad, css: '#9a95ad' },
};

const SUBTITLES = [
  __dialogueText("ui/inventory/InventoryView.js", "t_b44eace2b7cddc9c7a1d"),
  __dialogueText("ui/inventory/InventoryView.js", "t_8a1293495363b68f4012"),
  __dialogueText("ui/inventory/InventoryView.js", "t_db6fa91db027edfb14db"),
  __dialogueText("ui/inventory/InventoryView.js", "t_8250d439b31f92cfe5cd"),
  __dialogueText("ui/inventory/InventoryView.js", "t_cef2f3cea9a8b0a39269"),
  __dialogueText("ui/inventory/InventoryView.js", "t_f78b2c6b3fee55ffb127"),
  __dialogueText("ui/inventory/InventoryView.js", "t_cee91d984b416a586b31"),
];

const EMPTY_BODIES = [
  __dialogueText("ui/inventory/InventoryView.js", "t_0049c324ef2edff52c9b"),
  __dialogueText("ui/inventory/InventoryView.js", "t_73f597447800cdf54c9e"),
  __dialogueText("ui/inventory/InventoryView.js", "t_0274da1d1162df0f7757"),
  __dialogueText("ui/inventory/InventoryView.js", "t_c03da458f00c25527914"),
];

function categoryOf(item) {
  const type = String(item?.type || item?.category || 'misc').toLowerCase();

  for (const key of Object.keys(CATEGORIES)) {
    if (type.startsWith(key)) return CATEGORIES[key];
  }

  return CATEGORIES.misc;
}

function capacityStyle(ratio) {
  if (ratio >= 1) return { color: 0xe0654f, css: '#e0654f' };
  if (ratio >= 0.75) return { color: 0xe6c65c, css: '#e6c65c' };
  return { color: 0x7cfc8a, css: '#7cfc8a' };
}

export class InventoryView {
  constructor(scene, actions) {
    this.scene = scene;
    this.actions = actions;

    this.isVisible = false;
    this.button = null;

    this.cols = 4;
    this.rows = 3;
    this.slotSize = 112;
    this.slotPadding = 12;

    this.width = 820;
    this.height = 510;

    this.colors = {
      background: '#15111c',
      border: '#d4af37',
      text: __dialogueText("ui/inventory/InventoryView.js", "t_b90dac070a3829650376"),
      muted: '#bcaeaa',
      hover: '#f4b860',
      selected: '#ffd700',
      slot: '#242036',
      shadow: '#000000',
      use: '#7cfc8a',
      paper: '#e6d5a8',
      ink: '#2b1d12',
      inkMuted: '#6b5638',
    };

    this._destroyed = false;
    this._usable = false;
    this._selectedItem = null;
    this._items = [];

    this._capacity = {
      current: 0,
      max: 12,
    };

    this._page = 0;
    this.panelRect = null;
    this._windowPress = null;
    this._savedPosition = null;
    this._glowTween = null;

    this._detailKey = null;
    this._detailPages = [''];
    this._detailPage = 0;
    this._emptyBody = Phaser.Utils.Array.GetRandom(EMPTY_BODIES);

    // Karta z opisem (pergamin po prawej)
    this.cardX = 528;
    this.cardY = 76;
    this.cardW = 268;
    this.cardH = 262;

    this.detailsX = 540;
    this.detailsWidth = 244;
    this.detailsBottom = 330;
  }

  create() {
    const text = (
      value,
      size,
      color = this.colors.text,
      pixel = false
    ) => this.scene.add.text(0, 0, value, {
      fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
      fontSize: `${size}px`,
      color,
    }).setScrollFactor(0);

    const stop = (pointer, x, y, event) => {
      event?.stopPropagation();
    };

    this.root = this.scene.add
      .container(0, 0)
      .setDepth(1000)
      .setScrollFactor(0);

    // Baza panelu: zachowuje obrys i blokuje klikanie "przez" okno.
    this.panel = this.scene.add
      .rectangle(0, 0, this.width, this.height, 0x15111c, 1)
      .setOrigin(0)
      .setStrokeStyle(3, 0xd4af37)
      .setInteractive();

    this.panel.on('pointerdown', stop);
    this.panel.on('pointerup', stop);

    // Dekoracje (tlo, naglowek, ramki, pergamin)
    this.frame = this.scene.add.graphics();
    this.drawFrame();

    this.container = this.scene.add.container(24, 82);

    // Pasek naglowka = uchwyt do przesuwania okna (niewidoczny, ale klikalny)
    this.header = this.scene.add
      .rectangle(0, 0, this.width - 78, 64, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ cursor: 'grab' });

    this.header.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();

      if (
        !this.isVisible ||
        pointer.event?.button > 0 ||
        this.actions.isDragging()
      ) {
        return;
      }

      this._windowPress = {
        id: pointer.id,
        nativeId: pointer.event?.pointerId,
        x: pointer.x,
        y: pointer.y,
        left: this.root.x,
        top: this.root.y,
      };

      this.header.input.cursor = 'grabbing';
    });

    this.header.on('pointerup', stop);

    this.titleText = text(
      'INVENTORY',
      20,
      this.colors.border,
      true
    )
      .setPosition(24, 13)
      .setShadow(3, 3, '#000000', 0, false, true);

    this.subtitleText = text(
      Phaser.Utils.Array.GetRandom(SUBTITLES),
      14,
      this.colors.muted
    ).setPosition(24, 41);

    this.counterText = text('', 20)
      .setOrigin(1, 0)
      .setPosition(this.width - 64, 14);

    this.capGfx = this.scene.add.graphics();

    this.closeButton = text(
      'X',
      16,
      this.colors.text,
      true
    )
      .setOrigin(1, 0)
      .setPosition(this.width - 18, 16)
      .setPadding(10, 8, 10, 8)
      .setBackgroundColor('#5a2222')
      .setInteractive({ useHandCursor: true });

    this.closeButton.on('pointerdown', stop);

    this.closeButton.on('pointerover', () => {
      this.closeButton.setBackgroundColor('#8a2e2e');
    });

    this.closeButton.on('pointerout', () => {
      this.closeButton.setBackgroundColor('#5a2222');
    });

    this.closeButton.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();
      this.actions.close();
    });

    // --- Karta ze szczegolami przedmiotu ---
    this.selectedLabel = text(
      __dialogueText("ui/inventory/InventoryView.js", "t_1918f428b8ad0f9eecbb"),
      22,
      this.colors.ink
    )
      .setPosition(this.detailsX, 88)
      .setWordWrapWidth(this.detailsWidth, true);

    this.typeChip = text('', 10, '#17110a', true)
      .setPadding(6, 5, 6, 5)
      .setVisible(false);

    this.tooltip = text('', 18, this.colors.ink)
      .setPosition(this.detailsX, 150)
      .setWordWrapWidth(this.detailsWidth, true)
      .setLineSpacing(3);

    this.detailsPrevious = text(
      __dialogueText("ui/inventory/InventoryView.js", "t_86af811671fe29fad1d2"),
      14,
      this.colors.border
    )
      .setPosition(this.cardX, 346)
      .setInteractive({ useHandCursor: true });

    this.detailsPageText = text(
      '',
      14,
      this.colors.muted
    )
      .setOrigin(0.5, 0)
      .setPosition(this.cardX + this.cardW / 2, 346);

    this.detailsNext = text(
      __dialogueText("ui/inventory/InventoryView.js", "t_58b85f2ea88bf1a9ba16"),
      14,
      this.colors.border
    )
      .setOrigin(1, 0)
      .setPosition(this.cardX + this.cardW, 346)
      .setInteractive({ useHandCursor: true });

    this.detailsPrevious.on('pointerdown', stop);
    this.detailsNext.on('pointerdown', stop);

    this.detailsPrevious.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();
      this.changeDetailsPage(-1);
    });

    this.detailsNext.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();
      this.changeDetailsPage(1);
    });

    this.hintText = text('', 14, this.colors.muted)
      .setPosition(this.cardX, 372)
      .setWordWrapWidth(this.cardW, true);

    this.useButtonBg = this.scene.add
      .rectangle(this.cardX, 410, this.cardW, 54, 0x353541)
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37)
      .setInteractive({ useHandCursor: true });

    this.useButton = text(
      'USE',
      18,
      this.colors.use,
      true
    )
      .setOrigin(0.5)
      .setPosition(this.cardX + this.cardW / 2, 437)
      .setShadow(2, 2, '#000000', 0, false, true);

    this.useButtonBg.on('pointerdown', stop);

    this.useButtonBg.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();

      if (this._usable) {
        this.actions.use();
      }
    });

    this.useButtonBg.on('pointerover', () => {
      if (this._usable) {
        this.useButtonBg.setFillStyle(0x456b42);
      }
    });

    this.useButtonBg.on('pointerout', () => {
      this.updateUseButton();
    });

    // --- Paginacja siatki ---
    const pageButton = label => text(label, 20, this.colors.border, true)
      .setPadding(10, 6, 10, 6)
      .setBackgroundColor('#2c2439')
      .setInteractive({ useHandCursor: true });

    this.previousButton = pageButton('<').setPosition(24, 460);

    this.pageText = text('', 18, this.colors.muted)
      .setOrigin(0.5, 0)
      .setPosition(266, 468);

    this.nextButton = pageButton('>')
      .setOrigin(1, 0)
      .setPosition(508, 460);

    for (const button of [this.previousButton, this.nextButton]) {
      button.on('pointerdown', stop);

      button.on('pointerover', () => {
        button.setColor(this.colors.selected);
      });

      button.on('pointerout', () => {
        button.setColor(this.colors.border);
      });
    }

    this.previousButton.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();
      this.changePage(-1);
    });

    this.nextButton.on('pointerup', (p, x, y, event) => {
      event?.stopPropagation();
      this.changePage(1);
    });

    this.root.add([
      this.panel,
      this.frame,
      this.header,
      this.container,
      this.titleText,
      this.subtitleText,
      this.capGfx,
      this.counterText,
      this.closeButton,
      this.selectedLabel,
      this.typeChip,
      this.tooltip,
      this.detailsPrevious,
      this.detailsPageText,
      this.detailsNext,
      this.hintText,
      this.useButtonBg,
      this.useButton,
      this.previousButton,
      this.pageText,
      this.nextButton,
    ]);

    this._onWindowMove = pointer => {
      this.moveWindow(pointer);
    };

    this._onWindowUp = pointer => {
      if (
        pointer &&
        this._windowPress &&
        pointer.id !== this._windowPress.id
      ) {
        return;
      }

      this.endWindowMove();
    };

    this._onNativeMove = event => {
      const pointer = this.windowPointer(event);

      if (pointer) {
        this.moveWindow(pointer);
      }
    };

    this._onNativeUp = event => {
      const pointer = this.windowPointer(event);

      if (pointer) {
        this.moveWindow(pointer);
        this.endWindowMove();
      }
    };

    this._onNativeCancel = event => {
      if (this.windowPointer(event)) {
        this.endWindowMove();
      }
    };

    this._onBlur = () => {
      this.endWindowMove();
    };

    this.scene.input.on('pointermove', this._onWindowMove);
    this.scene.input.on('pointerup', this._onWindowUp);
    this.scene.input.on('pointerupoutside', this._onWindowUp);

    window.addEventListener('pointermove', this._onNativeMove);
    window.addEventListener('pointerup', this._onNativeUp);
    window.addEventListener('pointercancel', this._onNativeCancel);
    window.addEventListener('blur', this._onBlur);

    this.layout();
    this.updateCapacity();
    this.updateDetails();
    this.setPanelVisible(false);
  }

  // ---------------------------------------------------------------------------
  // Rysowanie ramki, tla i pergaminu
  // ---------------------------------------------------------------------------

  drawFrame() {
    const g = this.frame;
    const W = this.width;
    const H = this.height;
    const Color = Phaser.Display.Color;

    g.clear();

    // Tlo: pionowy gradient zlozony z pasow (dziala tez w Canvas)
    const top = Color.ValueToColor(0x241d31);
    const bottom = Color.ValueToColor(0x120e19);
    const bands = 20;
    const bandH = (H - 4) / bands;

    for (let i = 0; i < bands; i++) {
      const c = Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);

      g.fillStyle(Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(2, 2 + i * bandH, W - 4, Math.ceil(bandH) + 1);
    }

    // Naglowek
    g.fillStyle(0x2c2439, 1);
    g.fillRect(2, 2, W - 4, 62);

    g.lineStyle(1, 0xd4af37, 0.08);
    for (let x = 30; x <= W - 4; x += 14) {
      g.lineBetween(x, 2, x - 24, 64);
    }

    g.fillStyle(0xd4af37, 0.9);
    g.fillRect(2, 64, W - 4, 2);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(2, 66, W - 4, 3);

    // Taca pod siatke
    g.fillStyle(0x0e0b13, 0.75);
    g.fillRect(14, 72, 504, 382);
    g.lineStyle(2, 0x4a3d22, 1);
    g.strokeRect(14, 72, 504, 382);

    // Karta-pergamin: cien, papier, krawedz
    const { cardX, cardY, cardW, cardH } = this;

    g.fillStyle(0x000000, 0.45);
    g.fillRect(cardX + 4, cardY + 5, cardW, cardH);

    g.fillStyle(0xe6d5a8, 1);
    g.fillRect(cardX, cardY, cardW, cardH);

    g.fillStyle(0xd8c690, 1);
    g.fillRect(cardX, cardY, cardW, 5);

    g.lineStyle(1, 0x8a7340, 1);
    g.strokeRect(cardX, cardY, cardW, cardH);

    g.lineStyle(1, 0x8a7340, 0.35);
    g.strokeRect(cardX + 5, cardY + 9, cardW - 10, cardH - 14);

    // Zagiety rog
    const cx = cardX + cardW;
    const cy = cardY + cardH;
    const fold = 20;

    g.fillStyle(0x15111c, 1);
    g.fillTriangle(cx, cy, cx, cy - fold, cx - fold, cy);
    g.fillStyle(0xbfa874, 1);
    g.fillTriangle(cx - fold, cy - fold, cx, cy - fold, cx - fold, cy);

    // Spinacz
    g.lineStyle(2, 0xa7adb5, 1);
    g.strokeRoundedRect(cx - 40, cardY - 8, 13, 36, 6);
    g.strokeRoundedRect(cx - 37, cardY - 1, 7, 26, 3);

    // Zlote narozniki
    const L = 20;
    g.lineStyle(3, 0xd4af37, 1);

    g.beginPath();
    g.moveTo(6, 6 + L); g.lineTo(6, 6); g.lineTo(6 + L, 6);
    g.strokePath();

    g.beginPath();
    g.moveTo(W - 6 - L, 6); g.lineTo(W - 6, 6); g.lineTo(W - 6, 6 + L);
    g.strokePath();

    g.beginPath();
    g.moveTo(6, H - 6 - L); g.lineTo(6, H - 6); g.lineTo(6 + L, H - 6);
    g.strokePath();

    g.beginPath();
    g.moveTo(W - 6 - L, H - 6); g.lineTo(W - 6, H - 6); g.lineTo(W - 6, H - 6 - L);
    g.strokePath();

    // Nity
    g.fillStyle(0xd4af37, 1);
    for (const [x, y] of [[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]]) {
      g.fillCircle(x, y, 2.5);
    }

    // Cienka wewnetrzna ramka
    g.lineStyle(1, 0xd4af37, 0.2);
    g.strokeRect(9, 9, W - 18, H - 18);
  }

  updateCapacity() {
    if (!this.capGfx || !this.counterText) return;

    const { current, max } = this._capacity;
    const ratio = max > 0 ? Math.min(1, current / max) : 0;
    const style = capacityStyle(ratio);

    const barW = 150;
    const barH = 8;
    const barX = this.width - 64 - barW;
    const barY = 46;

    this.counterText
      .setText(`${current}${__dialogueText("ui/inventory/InventoryView.js", "t_005e1574a2b5c8163046")}${max}`)
      .setColor(style.css);

    this.capGfx.clear();
    this.capGfx.fillStyle(0x0d0b13, 1);
    this.capGfx.fillRect(barX, barY, barW, barH);
    this.capGfx.fillStyle(style.color, 1);
    this.capGfx.fillRect(barX, barY, Math.round(barW * ratio), barH);
    this.capGfx.lineStyle(1, 0x5a4a28, 1);
    this.capGfx.strokeRect(barX, barY, barW, barH);
  }

  // ---------------------------------------------------------------------------
  // Przesuwanie okna
  // ---------------------------------------------------------------------------

  windowPointer(event) {
    const press = this._windowPress;

    if (!press || this._destroyed) return null;

    if (
      press.nativeId != null &&
      event.pointerId !== press.nativeId
    ) {
      return null;
    }

    const rect = this.scene.game.canvas.getBoundingClientRect();

    if (!rect.width || !rect.height) return null;

    return {
      id: press.id,
      x:
        (event.clientX - rect.left) *
        this.scene.scale.width /
        rect.width,
      y:
        (event.clientY - rect.top) *
        this.scene.scale.height /
        rect.height,
    };
  }

  moveWindow(pointer) {
    const press = this._windowPress;

    if (
      !press ||
      press.id !== pointer.id ||
      !this.isVisible
    ) {
      return;
    }

    this.positionWindow(
      press.left + pointer.x - press.x,
      press.top + pointer.y - press.y
    );

    this._savedPosition = {
      x: this.root.x,
      y: this.root.y,
    };
  }

  endWindowMove() {
    this._windowPress = null;

    if (this.header?.input) {
      this.header.input.cursor = 'grab';
    }
  }

  positionWindow(x, y) {
    const { width, height } = this.scene.scale;

    const w = this.width * this.root.scaleX;
    const h = this.height * this.root.scaleY;

    const left = Phaser.Math.Clamp(
      x,
      0,
      Math.max(0, width - w)
    );

    const top = Phaser.Math.Clamp(
      y,
      0,
      Math.max(0, height - h)
    );

    this.root.setPosition(left, top);

    this.panelX = left + w;
    this.panelY = top;

    if (!this.panelRect) {
      this.panelRect = new Phaser.Geom.Rectangle();
    }

    this.panelRect.setTo(left, top, w, h);
  }

  layout() {
    if (this._destroyed || !this.root) return;

    this.endWindowMove();

    const { width, height } = this.scene.scale;

    const scale = Math.max(
      0.01,
      Math.min(
        1.2,
        (width - 32) / this.width,
        (height - 100) / this.height
      )
    );

    this.root.setScale(scale);

    this.positionWindow(
      this._savedPosition?.x ??
        (width - this.width * scale) / 2,

      this._savedPosition?.y ??
        Math.max(
          12,
          (height - this.height * scale) / 2 - 12
        )
    );

    if (this._savedPosition) {
      this._savedPosition = {
        x: this.root.x,
        y: this.root.y,
      };
    }
  }

  targets() {
    return this.root ? [this.root] : [];
  }

  setPanelVisible(visible) {
    this.root?.setVisible(visible);
  }

  show(immediate = false) {
    if (this._destroyed) return;

    this.isVisible = true;
    this.layout();

    // Nowy zart i nowy opis pustego ekwipunku przy kazdym otwarciu
    this.subtitleText?.setText(Phaser.Utils.Array.GetRandom(SUBTITLES));
    this._emptyBody = Phaser.Utils.Array.GetRandom(EMPTY_BODIES);
    this._detailKey = null;
    this.updateDetails();

    this._glowTween?.resume();

    this.scene.tweens.killTweensOf(this.root);

    this.root
      .setVisible(true)
      .setAlpha(immediate ? 1 : 0);

    if (!immediate) {
      this.scene.tweens.add({
        targets: this.root,
        alpha: 1,
        duration: 150,
        ease: 'Quad.easeOut',
      });
    }
  }

  hide() {
    if (this._destroyed) return;

    this.endWindowMove();
    this.isVisible = false;

    this._glowTween?.pause();

    this.scene.tweens.killTweensOf(this.root);

    this.root
      .setVisible(false)
      .setAlpha(0);
  }

  // ---------------------------------------------------------------------------
  // Siatka przedmiotow
  // ---------------------------------------------------------------------------

  render(items, capacity, selectedItem, usable) {
    if (
      this._destroyed ||
      !this.container?.active
    ) {
      return;
    }

    this._items = Array.isArray(items) ? items : [];

    this._capacity = {
      current: Number(capacity?.current) || 0,
      max: Math.max(0, Number(capacity?.max) || 0),
    };

    this._selectedItem = selectedItem || null;
    this._usable = Boolean(usable);

    const pages = this.getPageCount();

    this._page = Phaser.Math.Clamp(
      this._page,
      0,
      pages - 1
    );

    this.renderSlots();
    this.updateCapacity();

    this.pageText.setText(
      `${this._page + 1}${__dialogueText("ui/inventory/InventoryView.js", "t_005e1574a2b5c8163046")}${pages}`
    );

    this.previousButton.setAlpha(
      this._page > 0 ? 1 : 0.3
    );

    this.nextButton.setAlpha(
      this._page < pages - 1 ? 1 : 0.3
    );

    this.updateDetails();
    this.updateUseButton();
  }

  getPageCount() {
    return Math.max(
      1,
      Math.ceil(
        Math.max(
          this._capacity.max,
          this._items.length
        ) / (this.cols * this.rows)
      )
    );
  }

  changePage(direction) {
    if (
      !this.isVisible ||
      this.actions.isDragging() ||
      this._windowPress
    ) {
      return;
    }

    const next = Phaser.Math.Clamp(
      this._page + direction,
      0,
      this.getPageCount() - 1
    );

    if (next === this._page) return;

    this._page = next;

    this.render(
      this._items,
      this._capacity,
      this._selectedItem,
      this._usable
    );
  }

  renderSlots() {
    // Tween musi zniknac PRZED zniszczeniem obiektow, ktore animuje.
    this._glowTween?.remove();
    this._glowTween = null;

    this.container.removeAll(true);

    const S = this.slotSize;
    const pageSize = this.cols * this.rows;
    const first = this._page * pageSize;

    const total = Math.max(
      this._capacity.max,
      this._items.length
    );

    const gfx = this.scene.add.graphics();
    this.container.add(gfx);

    const overlays = [];

    for (
      let index = 0;
      index < pageSize && first + index < total;
      index++
    ) {
      const x = (index % this.cols) * (S + this.slotPadding);
      const y = Math.floor(index / this.cols) * (S + this.slotPadding);

      const item = this._items[first + index];

      const selected = Boolean(
        item &&
        this._selectedItem?.id === item.id
      );

      this.drawSlot(gfx, x, y, item, selected);

      if (item) {
        overlays.push({ x, y, item, selected });
      }
    }

    for (const { x, y, item, selected } of overlays) {
      this.renderItem(x, y, item, selected);
    }

    if (this._items.length === 0 && this._page === 0) {
      const plaque = this.scene.add
        .text(
          (this.cols * (S + this.slotPadding) - this.slotPadding) / 2,
          (this.rows * (S + this.slotPadding) - this.slotPadding) / 2,
          __dialogueText("ui/inventory/InventoryView.js", "t_69639c105fb56dc0eb57"),
          {
            fontFamily: 'SpecialElite',
            fontSize: '22px',
            color: this.colors.muted,
            align: 'center',
            backgroundColor: '#0e0b13',
            padding: { x: 18, y: 12 },
          }
        )
        .setOrigin(0.5);

      this.container.add(plaque);
    }
  }

  drawSlot(g, x, y, item, selected) {
    const S = this.slotSize;
    const cx = x + S / 2;

    // Tlo komorki
    g.fillStyle(
      selected ? 0x3a3020 : item ? 0x242036 : 0x161320,
      1
    );
    g.fillRect(x, y, S, S);

    g.fillStyle(0x000000, 0.25);
    g.fillRect(x, y, S, 6);

    // Efekt wcisniecia (ciemna gora/lewo, jasny dol/prawo)
    g.lineStyle(2, 0x000000, 0.5);
    g.lineBetween(x + 1, y + 1, x + S - 1, y + 1);
    g.lineBetween(x + 1, y + 1, x + 1, y + S - 1);

    g.lineStyle(2, 0xffffff, 0.07);
    g.lineBetween(x + S - 1, y + 1, x + S - 1, y + S - 1);
    g.lineBetween(x + 1, y + S - 1, x + S - 1, y + S - 1);

    // Ramka
    g.lineStyle(
      selected ? 3 : 2,
      selected ? 0xffd700 : item ? 0x8a7340 : 0x3b3250,
      1
    );
    g.strokeRect(x, y, S, S);

    if (item) {
      const cat = categoryOf(item);

      // Pasek kategorii
      g.fillStyle(cat.color, 0.9);
      g.fillRect(x + 3, y + S - 7, S - 6, 4);

      // Podkladka pod ikone
      g.fillStyle(0x0d0b13, 0.85);
      g.fillCircle(cx, y + 34, 27);

      g.lineStyle(2, cat.color, 0.55);
      g.strokeCircle(cx, y + 34, 27);
    } else {
      // Pusta komorka: maly romb
      const cy = y + S / 2;

      g.fillStyle(0x2a2540, 1);
      g.fillTriangle(cx, cy - 8, cx + 8, cy, cx, cy + 8);
      g.fillTriangle(cx, cy - 8, cx - 8, cy, cx, cy + 8);
    }
  }

  fitText(object, value, {
    width,
    height,
    maxSize,
    minSize,
  }) {
    object
      .setScale(1)
      .setFontSize(maxSize)
      .setWordWrapWidth(width, true)
      .setText(value);

    for (
      let size = maxSize;
      size > minSize &&
      (
        object.height > height ||
        object.width > width
      );
    ) {
      size -= 1;
      object.setFontSize(size);
    }

    // Zachowaj caly tytul nawet przy bardzo dlugich nazwach.
    if (
      object.height > height ||
      object.width > width
    ) {
      const scale = Math.min(
        1,
        width / Math.max(1, object.width),
        height / Math.max(1, object.height)
      );

      object.setScale(scale);
    }
  }

  renderItem(x, y, item, selected) {
    const S = this.slotSize;
    const cx = x + S / 2;

    // Poswiata zaznaczonego przedmiotu
    if (selected) {
      const glow = this.scene.add
        .rectangle(x - 3, y - 3, S + 6, S + 6)
        .setOrigin(0)
        .setStrokeStyle(3, 0xffd700, 0.9);

      this.container.add(glow);

      this._glowTween = this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.3, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      if (!this.isVisible) this._glowTween.pause();
    }

    const icon = this.scene.add
      .text(
        cx,
        y + 34,
        item.icon || __dialogueText("ui/inventory/InventoryView.js", "t_e68ebc94437caf84f78c"),
        { fontSize: '32px' }
      )
      .setOrigin(0.5)
      .setScale(selected ? 1.1 : 1);

    const fullName = String(
      item.name ||
      item.label ||
      __dialogueText("ui/inventory/InventoryView.js", "t_e6b8f377328b3d42997c")
    );

    const label = this.scene.add
      .text(
        cx,
        y + 66,
        '',
        {
          fontFamily: 'SpecialElite',
          fontSize: '14px',
          color: selected ? this.colors.selected : this.colors.text,
          align: 'center',
        }
      )
      .setOrigin(0.5, 0);

    this.fitText(label, fullName, {
      width: S - 12,
      height: 36,
      maxSize: 14,
      minSize: 9,
    });

    const highlight = this.scene.add
      .rectangle(x, y, S, S)
      .setOrigin(0)
      .setStrokeStyle(2, 0xf4b860, 1)
      .setVisible(false);

    this.container.add([icon, label, highlight]);

    if (item.quantity > 1) {
      const badgeX = x + S - 16;
      const badgeY = y + 16;

      this.container.add([
        this.scene.add
          .circle(badgeX, badgeY, 13, 0xd4af37)
          .setStrokeStyle(2, 0x17131c),

        this.scene.add
          .text(
            badgeX,
            badgeY,
            String(item.quantity),
            {
              fontFamily: 'SpecialElite',
              fontSize: '16px',
              color: '#17131c',
            }
          )
          .setOrigin(0.5),
      ]);
    }

    // Jedna wspolna strefa klikania na komorke (na wierzchu)
    const zone = this.scene.add
      .zone(cx, y + S / 2, S, S)
      .setInteractive({ useHandCursor: true });

    this.container.add(zone);

    zone.on('pointerover', () => {
      if (
        !this.isVisible ||
        this.actions.isDragging() ||
        this._windowPress
      ) {
        return;
      }

      highlight.setVisible(true);
      this.actions.tooltip(item);
    });

    zone.on('pointerout', () => {
      highlight.setVisible(false);
      this.hideTooltip();
    });

    zone.on(
      'pointerdown',
      (pointer, lx, ly, event) => {
        event?.stopPropagation();

        if (
          this.isVisible &&
          !this._windowPress
        ) {
          this.actions.press(item, pointer);
        }
      }
    );
  }

  updateUseButton() {
    if (
      !this.useButton ||
      !this.useButtonBg
    ) {
      return;
    }

    this.useButton
      .setText(__dialogueText("ui/inventory/InventoryView.js", "t_b3c2ed23b44e753d6bfc"))
      .setColor(
        this._usable
          ? this.colors.use
          : '#96909b'
      );

    this.useButtonBg
      .setFillStyle(
        this._usable
          ? 0x315534
          : 0x353541
      )
      .setStrokeStyle(
        2,
        this._usable
          ? 0x7cfc8a
          : 0x6a6070
      );

    if (this.useButtonBg.input) {
      this.useButtonBg.input.cursor = this._usable
        ? 'pointer'
        : 'default';
    }
  }

  // ---------------------------------------------------------------------------
  // Karta ze szczegolami
  // ---------------------------------------------------------------------------

  buildDescriptionPages(value, maxHeight) {
    this.tooltip
      .setScale(1)
      .setFontSize(18)
      .setWordWrapWidth(this.detailsWidth, true);

    const wrappedLines = this.tooltip.getWrappedText(
      String(value)
    );

    const pages = [];
    let currentLines = [];

    for (const line of wrappedLines) {
      const candidate = [...currentLines, line];

      this.tooltip.setText(
        candidate.join(__dialogueText("ui/inventory/InventoryView.js", "t_01ba4719c80b6fe911b0"))
      );

      if (
        currentLines.length > 0 &&
        this.tooltip.height > maxHeight
      ) {
        pages.push(currentLines.join('\n'));
        currentLines = [line];
      } else {
        currentLines = candidate;
      }
    }

    if (currentLines.length || !pages.length) {
      pages.push(currentLines.join('\n'));
    }

    return pages;
  }

  updateDetails(
    item = this._selectedItem,
    usable = this._usable
  ) {
    if (
      !this.selectedLabel ||
      !this.tooltip
    ) {
      return;
    }

    const name = item
      ? String(
          item.name ||
          item.label ||
          __dialogueText("ui/inventory/InventoryView.js", "t_e6b8f377328b3d42997c")
        )
      : __dialogueText("ui/inventory/InventoryView.js", "t_1918f428b8ad0f9eecbb");

    const typeLabel = item
      ? String(item.type || 'misc').toUpperCase()
      : '';

    const energy = item?.metadata?.effect?.energy;

    let body;
    let hint;

    if (!item) {
      body = this._emptyBody;

      hint =
        __dialogueText("ui/inventory/InventoryView.js", "t_d53abaec836bcb812269") +
        __dialogueText("ui/inventory/InventoryView.js", "t_a582ebf1b19759d33889");
    } else {
      const description = String(
        item.description ||
        __dialogueText("ui/inventory/InventoryView.js", "t_e7ce3caa8807249ee38d")
      );

      body = usable && energy != null
        ? `${__dialogueText("ui/inventory/InventoryView.js", "t_a318c24216defe206fee")}${energy}${__dialogueText("ui/inventory/InventoryView.js", "t_5e7904907fc498b5defc")}${description}`
        : description;

      const consumable = Boolean(
        item.metadata?.consumable &&
        Number(energy) > 0
      );

      hint = consumable
        ? __dialogueText("ui/inventory/InventoryView.js", "t_3ecec55959a10de27555")
        : __dialogueText("ui/inventory/InventoryView.js", "t_0a9115387dbb6648595c");
    }

    const key = JSON.stringify([
      item?.id ?? null,
      name,
      typeLabel,
      body,
      hint,
    ]);

    if (key === this._detailKey) {
      this.renderDetailsPage();
      return;
    }

    this._detailKey = key;
    this._detailPage = 0;

    this.selectedLabel
      .setColor(this.colors.ink)
      .setPosition(this.detailsX, 88);

    this.fitText(
      this.selectedLabel,
      name,
      {
        width: this.detailsWidth,
        height: 64,
        maxSize: 22,
        minSize: 16,
      }
    );

    const titleHeight =
      this.selectedLabel.height *
      this.selectedLabel.scaleY;

    let descriptionY =
      this.selectedLabel.y +
      titleHeight +
      10;

    // Plakietka kategorii (kolor zalezy od typu przedmiotu)
    if (item) {
      this.typeChip
        .setText(typeLabel)
        .setBackgroundColor(categoryOf(item).css)
        .setPosition(this.detailsX, descriptionY)
        .setVisible(true);

      descriptionY += this.typeChip.height + 12;
    } else {
      this.typeChip.setVisible(false);
    }

    this.tooltip.setPosition(
      this.detailsX,
      descriptionY
    );

    const availableHeight = Math.max(
      80,
      this.detailsBottom - descriptionY
    );

    this._detailPages = this.buildDescriptionPages(
      body,
      availableHeight
    );

    this.hintText.setText(hint);

    this.renderDetailsPage();
  }

  renderDetailsPage() {
    if (
      this._destroyed ||
      !this.tooltip
    ) {
      return;
    }

    const count = Math.max(
      1,
      this._detailPages.length
    );

    this._detailPage = Phaser.Math.Clamp(
      this._detailPage,
      0,
      count - 1
    );

    this.tooltip.setText(
      this._detailPages[this._detailPage] || ''
    );

    const multiple = count > 1;

    this.detailsPrevious
      .setVisible(multiple)
      .setAlpha(
        this._detailPage > 0 ? 1 : 0.3
      );

    this.detailsNext
      .setVisible(multiple)
      .setAlpha(
        this._detailPage < count - 1
          ? 1
          : 0.3
      );

    this.detailsPageText
      .setVisible(multiple)
      .setText(
        `${this._detailPage + 1}${__dialogueText("ui/inventory/InventoryView.js", "t_005e1574a2b5c8163046")}${count}`
      );

    if (this.detailsPrevious.input) {
      this.detailsPrevious.input.enabled =
        multiple &&
        this._detailPage > 0;
    }

    if (this.detailsNext.input) {
      this.detailsNext.input.enabled =
        multiple &&
        this._detailPage < count - 1;
    }
  }

  changeDetailsPage(direction) {
    if (
      this._destroyed ||
      !this.isVisible ||
      this._windowPress ||
      this.actions.isDragging()
    ) {
      return;
    }

    const next = Phaser.Math.Clamp(
      this._detailPage + direction,
      0,
      this._detailPages.length - 1
    );

    if (next === this._detailPage) return;

    this._detailPage = next;
    this.renderDetailsPage();
  }

  showTooltip(item, usable) {
    if (
      !this._destroyed &&
      this.isVisible &&
      item
    ) {
      this.updateDetails(
        item,
        Boolean(usable)
      );
    }
  }

  hideTooltip() {
    if (!this._destroyed) {
      this.updateDetails();
    }
  }

  destroy() {
    if (this._destroyed) return;

    this.endWindowMove();

    this._destroyed = true;
    this.isVisible = false;

    this._glowTween?.remove();
    this._glowTween = null;

    this.scene?.input?.off(
      'pointermove',
      this._onWindowMove
    );

    this.scene?.input?.off(
      'pointerup',
      this._onWindowUp
    );

    this.scene?.input?.off(
      'pointerupoutside',
      this._onWindowUp
    );

    window.removeEventListener(
      'pointermove',
      this._onNativeMove
    );

    window.removeEventListener(
      'pointerup',
      this._onNativeUp
    );

    window.removeEventListener(
      'pointercancel',
      this._onNativeCancel
    );

    window.removeEventListener(
      'blur',
      this._onBlur
    );

    if (this.root) {
      this.scene?.tweens?.killTweensOf(
        this.root
      );

      this.root.destroy(true);
    }

    this.root = null;
    this.container = null;
    this.panel = null;
    this.frame = null;
    this.capGfx = null;
    this.header = null;
    this.button = null;
    this.panelRect = null;

    this.titleText = null;
    this.subtitleText = null;
    this.counterText = null;
    this.closeButton = null;
    this.selectedLabel = null;
    this.typeChip = null;
    this.tooltip = null;
    this.hintText = null;
    this.useButton = null;
    this.useButtonBg = null;

    this.detailsPrevious = null;
    this.detailsNext = null;
    this.detailsPageText = null;

    this._detailPages = [];
    this._detailKey = null;

    this.actions = null;
    this.scene = null;
  }
}