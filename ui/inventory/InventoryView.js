// ui/inventory/InventoryView.js
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
      background: '#1a1a2e', border: '#d4af37', text: '#f2eadc',
      muted: '#bcaeaa', hover: '#f4b860', selected: '#ffd700',
      slot: '#2a2a3e', shadow: '#000000', use: '#7cfc8a'
    };
    this._destroyed = false;
    this._usable = false;
    this._selectedItem = null;
    this._items = [];
    this._capacity = { current: 0, max: 12 };
    this._page = 0;
    this.panelRect = null;
    this._windowPress = null;
    this._savedPosition = null;
  }

  create() {
    const text = (value, size, color = this.colors.text, pixel = false) =>
      this.scene.add.text(0, 0, value, {
        fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
        fontSize: `${size}px`, color
      }).setScrollFactor(0);
    const stop = (pointer, x, y, event) => event?.stopPropagation();
    this.root = this.scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    this.panel = this.scene.add.rectangle(0, 0, this.width, this.height, 0x1a1a2e, .99)
      .setOrigin(0).setStrokeStyle(3, 0xd4af37).setInteractive();
    this.panel.on('pointerdown', stop);
    this.panel.on('pointerup', stop);
    this.container = this.scene.add.container(24, 82);
    this.header = this.scene.add.rectangle(0, 0, this.width - 78, 64, 0x262338, 1)
      .setOrigin(0).setInteractive({ cursor: 'grab' });
    this.header.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
      if (!this.isVisible || pointer.event?.button > 0 || this.actions.isDragging()) return;
      this._windowPress = {
        id: pointer.id, nativeId: pointer.event?.pointerId,
        x: pointer.x, y: pointer.y, left: this.root.x, top: this.root.y
      };
      this.header.input.cursor = 'grabbing';
    });
    this.header.on('pointerup', stop);
    this.titleText = text('INVENTORY', 20, this.colors.border, true).setPosition(24, 24);
    this.counterText = text('', 20).setOrigin(1, 0).setPosition(this.width - 92, 24);
    this.closeButton = text('[X]', 18, this.colors.border, true)
      .setOrigin(1, 0).setPosition(this.width - 24, 24).setInteractive({ useHandCursor: true });
    this.closeButton.on('pointerdown', stop);
    this.closeButton.on('pointerup', (p, x, y, e) => { e?.stopPropagation(); this.actions.close(); });
    this.divider = this.scene.add.rectangle(24, 64, this.width - 48, 2, 0xd4af37, .6).setOrigin(0);
    this.detailsDivider = this.scene.add.rectangle(516, 82, 2, 348, 0xd4af37, .35).setOrigin(0);
    this.selectedLabel = text('SELECT AN ITEM', 22, this.colors.selected).setPosition(540, 86).setWordWrapWidth(254);
    this.tooltip = text('', 18).setPosition(540, 158).setWordWrapWidth(254);
    this.hintText = text('', 16, this.colors.muted).setPosition(540, 330).setWordWrapWidth(254);
    this.useButtonBg = this.scene.add.rectangle(540, 408, 254, 56, 0x353541)
      .setOrigin(0).setStrokeStyle(2, 0xd4af37).setInteractive({ useHandCursor: true });
    this.useButton = text('USE', 18, this.colors.use, true).setOrigin(.5).setPosition(667, 436);
    this.useButtonBg.on('pointerup', (p, x, y, e) => {
      e?.stopPropagation();
      if (this._usable) this.actions.use();
    });
    this.useButtonBg.on('pointerover', () => { if (this._usable) this.useButtonBg.setFillStyle(0x456b42); });
    this.useButtonBg.on('pointerout', () => this.updateUseButton());
    this.previousButton = text('<', 20, this.colors.border, true).setPosition(24, 464).setInteractive({ useHandCursor: true });
    this.pageText = text('', 18, this.colors.muted).setOrigin(.5, 0).setPosition(260, 465);
    this.nextButton = text('>', 20, this.colors.border, true).setOrigin(1, 0).setPosition(508, 464).setInteractive({ useHandCursor: true });
    this.previousButton.on('pointerup', (p, x, y, e) => { e?.stopPropagation(); this.changePage(-1); });
    this.nextButton.on('pointerup', (p, x, y, e) => { e?.stopPropagation(); this.changePage(1); });
    this.root.add([
      this.panel, this.header, this.divider, this.detailsDivider, this.container,
      this.titleText, this.counterText, this.closeButton, this.selectedLabel,
      this.tooltip, this.hintText, this.useButtonBg, this.useButton,
      this.previousButton, this.pageText, this.nextButton
    ]);
    this._onWindowMove = pointer => this.moveWindow(pointer);
    this._onWindowUp = pointer => {
      if (pointer && this._windowPress && pointer.id !== this._windowPress.id) return;
      this.endWindowMove();
    };
    this._onNativeMove = event => {
      const pointer = this.windowPointer(event);
      if (pointer) this.moveWindow(pointer);
    };
    this._onNativeUp = event => {
      const pointer = this.windowPointer(event);
      if (pointer) { this.moveWindow(pointer); this.endWindowMove(); }
    };
    this._onNativeCancel = event => {
      if (this.windowPointer(event)) this.endWindowMove();
    };
    this._onBlur = () => this.endWindowMove();
    this.scene.input.on('pointermove', this._onWindowMove);
    this.scene.input.on('pointerup', this._onWindowUp);
    this.scene.input.on('pointerupoutside', this._onWindowUp);
    window.addEventListener('pointermove', this._onNativeMove);
    window.addEventListener('pointerup', this._onNativeUp);
    window.addEventListener('pointercancel', this._onNativeCancel);
    window.addEventListener('blur', this._onBlur);
    this.layout();
    this.updateDetails();
    this.setPanelVisible(false);
  }

  windowPointer(event) {
    const press = this._windowPress;
    if (!press || this._destroyed) return null;
    if (press.nativeId != null && event.pointerId !== press.nativeId) return null;
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      id: press.id,
      x: (event.clientX - rect.left) * this.scene.scale.width / rect.width,
      y: (event.clientY - rect.top) * this.scene.scale.height / rect.height
    };
  }

  moveWindow(pointer) {
    const press = this._windowPress;
    if (!press || press.id !== pointer.id || !this.isVisible) return;
    this.positionWindow(press.left + pointer.x - press.x, press.top + pointer.y - press.y);
    this._savedPosition = { x: this.root.x, y: this.root.y };
  }

  endWindowMove() {
    this._windowPress = null;
    if (this.header?.input) this.header.input.cursor = 'grab';
  }

  positionWindow(x, y) {
    const { width, height } = this.scene.scale;
    const w = this.width * this.root.scaleX;
    const h = this.height * this.root.scaleY;
    const left = Phaser.Math.Clamp(x, 0, Math.max(0, width - w));
    const top = Phaser.Math.Clamp(y, 0, Math.max(0, height - h));
    this.root.setPosition(left, top);
    this.panelX = left + w;
    this.panelY = top;
    if (!this.panelRect) this.panelRect = new Phaser.Geom.Rectangle();
    this.panelRect.setTo(left, top, w, h);
  }

  layout() {
    if (this._destroyed || !this.root) return;
    this.endWindowMove();
    const { width, height } = this.scene.scale;
    const scale = Math.max(.01, Math.min(1.2, (width - 32) / this.width, (height - 100) / this.height));
    this.root.setScale(scale);
    this.positionWindow(
      this._savedPosition?.x ?? (width - this.width * scale) / 2,
      this._savedPosition?.y ?? Math.max(12, (height - this.height * scale) / 2 - 12)
    );
    if (this._savedPosition) this._savedPosition = { x: this.root.x, y: this.root.y };
  }

  targets() { return this.root ? [this.root] : []; }
  setPanelVisible(visible) { this.root?.setVisible(visible); }
  show(immediate = false) {
    if (this._destroyed) return;
    this.isVisible = true;
    this.layout();
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true).setAlpha(immediate ? 1 : 0);
    if (!immediate) this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 150, ease: 'Quad.easeOut' });
  }
  hide() {
    if (this._destroyed) return;
    this.endWindowMove();
    this.isVisible = false;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(false).setAlpha(0);
  }

  render(items, capacity, selectedItem, usable) {
    if (this._destroyed || !this.container?.active) return;
    this._items = Array.isArray(items) ? items : [];
    this._capacity = { current: Number(capacity?.current) || 0, max: Math.max(0, Number(capacity?.max) || 0) };
    this._selectedItem = selectedItem || null;
    this._usable = Boolean(usable);
    const pages = this.getPageCount();
    this._page = Phaser.Math.Clamp(this._page, 0, pages - 1);
    this.renderSlots();
    this.counterText.setText(`${this._capacity.current} / ${this._capacity.max}`);
    this.pageText.setText(`${this._page + 1} / ${pages}`);
    this.previousButton.setAlpha(this._page > 0 ? 1 : .3);
    this.nextButton.setAlpha(this._page < pages - 1 ? 1 : .3);
    this.updateDetails();
    this.updateUseButton();
  }
  getPageCount() { return Math.max(1, Math.ceil(Math.max(this._capacity.max, this._items.length) / (this.cols * this.rows))); }
  changePage(direction) {
    if (!this.isVisible || this.actions.isDragging() || this._windowPress) return;
    const next = Phaser.Math.Clamp(this._page + direction, 0, this.getPageCount() - 1);
    if (next === this._page) return;
    this._page = next;
    this.render(this._items, this._capacity, this._selectedItem, this._usable);
  }
  renderSlots() {
    this.container.removeAll(true);
    const pageSize = this.cols * this.rows;
    const first = this._page * pageSize;
    const total = Math.max(this._capacity.max, this._items.length);
    for (let index = 0; index < pageSize && first + index < total; index++) {
      const x = index % this.cols * (this.slotSize + this.slotPadding);
      const y = Math.floor(index / this.cols) * (this.slotSize + this.slotPadding);
      const item = this._items[first + index];
      const selected = Boolean(item && this._selectedItem?.id === item.id);
      const slot = this.scene.add.rectangle(x, y, this.slotSize, this.slotSize, selected ? 0x403929 : 0x2a2a3e)
        .setOrigin(0).setStrokeStyle(selected ? 3 : 2, selected ? 0xffd700 : 0x7e6839);
      this.container.add(slot);
      if (item) this.renderItem(slot, item, x, y, selected);
    }
  }
  renderItem(slot, item, x, y, selected) {
    const centerX = x + this.slotSize / 2;
    const icon = this.scene.add.text(centerX, y + 35, item.icon || '📦', { fontSize: '42px' }).setOrigin(.5);
    const fullName = String(item.name || 'Unknown item');
    const label = this.scene.add.text(centerX, y + 70,
      fullName.length > 23 ? `${fullName.slice(0, 22)}…` : fullName, {
        fontFamily: 'SpecialElite', fontSize: '15px', color: this.colors.text,
        align: 'center', wordWrap: { width: this.slotSize - 10 }
      }).setOrigin(.5, 0);
    if (selected) icon.setTint(0xffd700);
    for (const object of [slot, icon, label]) {
      object.setInteractive({ useHandCursor: true });
      object.on('pointerover', () => {
        if (!this.isVisible || this.actions.isDragging() || this._windowPress) return;
        slot.setFillStyle(0x403746);
        this.actions.tooltip(item);
      });
      object.on('pointerout', () => {
        slot.setFillStyle(selected ? 0x403929 : 0x2a2a3e);
        this.hideTooltip();
      });
      object.on('pointerdown', (pointer, lx, ly, event) => {
        event?.stopPropagation();
        if (this.isVisible && !this._windowPress) this.actions.press(item, pointer);
      });
    }
    this.container.add([icon, label]);
    if (item.quantity > 1) {
      const badgeX = x + this.slotSize - 14, badgeY = y + 14;
      this.container.add([
        this.scene.add.circle(badgeX, badgeY, 13, 0xd4af37),
        this.scene.add.text(badgeX, badgeY, String(item.quantity), {
          fontFamily: 'SpecialElite', fontSize: '17px', color: '#17131c'
        }).setOrigin(.5)
      ]);
    }
  }
  updateUseButton() {
    if (!this.useButton || !this.useButtonBg) return;
    this.useButton.setText('USE').setColor(this._usable ? this.colors.use : '#96909b');
    this.useButtonBg.setFillStyle(this._usable ? 0x315534 : 0x353541)
      .setStrokeStyle(2, this._usable ? 0x7cfc8a : 0x6a6070);
    if (this.useButtonBg.input) this.useButtonBg.input.cursor = this._usable ? 'pointer' : 'default';
  }
  updateDetails(item = this._selectedItem, usable = this._usable) {
    if (!this.selectedLabel || !this.tooltip) return;
    if (!item) {
      this.selectedLabel.setText('SELECT AN ITEM');
      this.tooltip.setText('Your pockets. Slightly more organised than your life.');
      this.hintText.setText('Drag the header to move this window.\nDrag an item onto a scene object to use it there.');
      return;
    }
    this.selectedLabel.setText(String(item.name || 'Unknown item'));
    let type = String(item.type || 'misc').toUpperCase();
    if (usable && item.metadata?.effect?.energy != null) type += `\n+${item.metadata.effect.energy} ENERGY`;
    const description = String(item.description || 'No description. Suspicious.');
    this.tooltip.setText(`${type}\n\n${description.length > 210 ? `${description.slice(0, 209)}…` : description}`);
    const consumable = item.metadata?.consumable && Number(item.metadata?.effect?.energy) > 0;
    this.hintText.setText(consumable
      ? 'Click USE to consume the selected item.'
      : 'USE: inspect.\nDrag onto a target to hand it over.');
  }
  showTooltip(item, usable) {
    if (!this._destroyed && this.isVisible && item) this.updateDetails(item, Boolean(usable));
  }
  hideTooltip() { if (!this._destroyed) this.updateDetails(); }
  destroy() {
    if (this._destroyed) return;
    this.endWindowMove();
    this._destroyed = true;
    this.isVisible = false;
    this.scene?.input?.off('pointermove', this._onWindowMove);
    this.scene?.input?.off('pointerup', this._onWindowUp);
    this.scene?.input?.off('pointerupoutside', this._onWindowUp);
    window.removeEventListener('pointermove', this._onNativeMove);
    window.removeEventListener('pointerup', this._onNativeUp);
    window.removeEventListener('pointercancel', this._onNativeCancel);
    window.removeEventListener('blur', this._onBlur);
    if (this.root) {
      this.scene?.tweens?.killTweensOf(this.root);
      this.root.destroy(true);
    }
    this.root = this.container = this.panel = this.header = this.button = this.panelRect = null;
    this.actions = this.scene = null;
  }
}
