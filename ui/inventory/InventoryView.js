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
      background: '#1a1a2e',
      border: '#d4af37',
      text: '#f2eadc',
      muted: '#bcaeaa',
      hover: '#f4b860',
      selected: '#ffd700',
      slot: '#2a2a3e',
      shadow: '#000000',
      use: '#7cfc8a'
    };

    this._destroyed = false;
    this._usable = false;
    this._selectedItem = null;
    this._items = [];
    this._capacity = { current: 0, max: 12 };
    this._page = 0;

    this.panelRect = null;
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
      color
    }).setScrollFactor(0);

    this.root = this.scene.add.container(0, 0)
      .setDepth(1000)
      .setScrollFactor(0);

    this.panel = this.scene.add.rectangle(
      0,
      0,
      this.width,
      this.height,
      0x1a1a2e,
      0.99
    )
      .setOrigin(0)
      .setStrokeStyle(3, 0xd4af37)
      .setInteractive();

    for (const eventName of ['pointerdown', 'pointerup']) {
      this.panel.on(eventName, (pointer, x, y, event) => {
        event?.stopPropagation();
      });
    }

    this.container = this.scene.add.container(24, 82);

    this.titleText = text(
      'INVENTORY',
      20,
      this.colors.border,
      true
    ).setPosition(24, 24);

    this.counterText = text('', 20)
      .setOrigin(1, 0)
      .setPosition(this.width - 92, 24);

    this.closeButton = text(
      '[X]',
      18,
      this.colors.border,
      true
    )
      .setOrigin(1, 0)
      .setPosition(this.width - 24, 24)
      .setInteractive({ useHandCursor: true });

    this.closeButton.on('pointerup', (pointer, x, y, event) => {
      event?.stopPropagation();
      this.actions.close();
    });

    this.divider = this.scene.add.rectangle(
      24,
      64,
      this.width - 48,
      2,
      0xd4af37,
      0.6
    ).setOrigin(0);

    this.detailsDivider = this.scene.add.rectangle(
      516,
      82,
      2,
      348,
      0xd4af37,
      0.35
    ).setOrigin(0);

    this.selectedLabel = text(
      'SELECT AN ITEM',
      22,
      this.colors.selected
    )
      .setPosition(540, 86)
      .setWordWrapWidth(254);

    this.tooltip = text('', 18)
      .setPosition(540, 158)
      .setWordWrapWidth(254);

    this.hintText = text('', 16, this.colors.muted)
      .setPosition(540, 330)
      .setWordWrapWidth(254);

    this.useButtonBg = this.scene.add.rectangle(
      540,
      408,
      254,
      56,
      0x353541,
      1
    )
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
      .setPosition(667, 436);

    this.useButtonBg.on(
      'pointerup',
      (pointer, x, y, event) => {
        event?.stopPropagation();

        if (this._usable) {
          this.actions.use();
        }
      }
    );

    this.useButtonBg.on('pointerover', () => {
      if (this._usable) {
        this.useButtonBg.setFillStyle(0x456b42);
      }
    });

    this.useButtonBg.on('pointerout', () => {
      this.updateUseButton();
    });

    this.previousButton = text(
      '<',
      20,
      this.colors.border,
      true
    )
      .setPosition(24, 464)
      .setInteractive({ useHandCursor: true });

    this.pageText = text('', 18, this.colors.muted)
      .setOrigin(0.5, 0)
      .setPosition(260, 465);

    this.nextButton = text(
      '>',
      20,
      this.colors.border,
      true
    )
      .setOrigin(1, 0)
      .setPosition(508, 464)
      .setInteractive({ useHandCursor: true });

    this.previousButton.on(
      'pointerup',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.changePage(-1);
      }
    );

    this.nextButton.on(
      'pointerup',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.changePage(1);
      }
    );

    this.root.add([
      this.panel,
      this.divider,
      this.detailsDivider,
      this.container,
      this.titleText,
      this.counterText,
      this.closeButton,
      this.selectedLabel,
      this.tooltip,
      this.hintText,
      this.useButtonBg,
      this.useButton,
      this.previousButton,
      this.pageText,
      this.nextButton
    ]);

    this.layout();
    this.updateDetails();
    this.setPanelVisible(false);
  }

  layout() {
    if (this._destroyed || !this.root) return;

    const { width, height } = this.scene.scale;

    const scale = Math.max(
      0.01,
      Math.min(
        1.2,
        (width - 32) / this.width,
        (height - 100) / this.height
      )
    );

    const left = (width - this.width * scale) / 2;
    const top = Math.max(
      12,
      (height - this.height * scale) / 2 - 12
    );

    this.root.setPosition(left, top).setScale(scale);

    this.panelX = left + this.width * scale;
    this.panelY = top;

    this.panelRect = new Phaser.Geom.Rectangle(
      left,
      top,
      this.width * scale,
      this.height * scale
    );
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

    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(true).setAlpha(immediate ? 1 : 0);

    if (!immediate) {
      this.scene.tweens.add({
        targets: this.root,
        alpha: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    }
  }

  hide() {
    if (this._destroyed) return;

    this.isVisible = false;
    this.scene.tweens.killTweensOf(this.root);
    this.root.setVisible(false).setAlpha(0);
  }

  render(items, capacity, selectedItem, usable) {
    if (this._destroyed || !this.container?.active) return;

    this._items = Array.isArray(items) ? items : [];
    this._capacity = {
      current: Number(capacity?.current) || 0,
      max: Math.max(0, Number(capacity?.max) || 0)
    };

    this._selectedItem = selectedItem || null;
    this._usable = Boolean(usable);

    const pages = this.getPageCount();
    this._page = Phaser.Math.Clamp(this._page, 0, pages - 1);

    this.renderSlots();

    this.counterText.setText(
      `${this._capacity.current} / ${this._capacity.max}`
    );

    this.pageText.setText(`${this._page + 1} / ${pages}`);

    this.previousButton.setAlpha(this._page > 0 ? 1 : 0.3);
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
        Math.max(this._capacity.max, this._items.length)
        / (this.cols * this.rows)
      )
    );
  }

  changePage(direction) {
    if (!this.isVisible || this.actions.isDragging()) return;

    const nextPage = Phaser.Math.Clamp(
      this._page + direction,
      0,
      this.getPageCount() - 1
    );

    if (nextPage === this._page) return;

    this._page = nextPage;

    this.render(
      this._items,
      this._capacity,
      this._selectedItem,
      this._usable
    );
  }

  renderSlots() {
    this.container.removeAll(true);

    const pageSize = this.cols * this.rows;
    const firstIndex = this._page * pageSize;

    const totalSlots = Math.max(
      this._capacity.max,
      this._items.length
    );

    for (let index = 0; index < pageSize; index += 1) {
      const itemIndex = firstIndex + index;

      if (itemIndex >= totalSlots) break;

      const x = (index % this.cols)
        * (this.slotSize + this.slotPadding);

      const y = Math.floor(index / this.cols)
        * (this.slotSize + this.slotPadding);

      const item = this._items[itemIndex];
      const selected = Boolean(
        item && this._selectedItem?.id === item.id
      );

      const slot = this.scene.add.rectangle(
        x,
        y,
        this.slotSize,
        this.slotSize,
        selected ? 0x403929 : 0x2a2a3e,
        1
      )
        .setOrigin(0)
        .setStrokeStyle(
          selected ? 3 : 2,
          selected ? 0xffd700 : 0x7e6839
        );

      this.container.add(slot);

      if (item) {
        this.renderItem(slot, item, x, y, selected);
      }
    }
  }

  renderItem(slot, item, x, y, selected) {
    const centerX = x + this.slotSize / 2;

    const icon = this.scene.add.text(
      centerX,
      y + 35,
      item.icon || '📦',
      { fontSize: '42px' }
    ).setOrigin(0.5);

    const fullName = String(item.name || 'Unknown item');

    const shortName = fullName.length > 23
      ? `${fullName.slice(0, 22)}…`
      : fullName;

    const label = this.scene.add.text(
      centerX,
      y + 70,
      shortName,
      {
        fontFamily: 'SpecialElite',
        fontSize: '15px',
        color: this.colors.text,
        align: 'center',
        wordWrap: { width: this.slotSize - 10 }
      }
    ).setOrigin(0.5, 0);

    if (selected) {
      icon.setTint(0xffd700);
    }

    const over = () => {
      if (!this.isVisible || this.actions.isDragging()) return;

      slot.setFillStyle(0x403746);
      this.actions.tooltip(item);
    };

    const out = () => {
      slot.setFillStyle(selected ? 0x403929 : 0x2a2a3e);
      this.hideTooltip();
    };

    for (const object of [slot, icon, label]) {
      object.setInteractive({ useHandCursor: true });

      object.on('pointerover', over);
      object.on('pointerout', out);

      object.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();

          if (this.isVisible) {
            this.actions.press(item, pointer);
          }
        }
      );
    }

    this.container.add([icon, label]);

    if (item.quantity > 1) {
      const badgeX = x + this.slotSize - 14;
      const badgeY = y + 14;

      const badge = this.scene.add.circle(
        badgeX,
        badgeY,
        13,
        0xd4af37
      );

      const quantityText = this.scene.add.text(
        badgeX,
        badgeY,
        String(item.quantity),
        {
          fontFamily: 'SpecialElite',
          fontSize: '17px',
          color: '#17131c'
        }
      ).setOrigin(0.5);

      this.container.add([badge, quantityText]);
    }
  }

  updateUseButton() {
    if (!this.useButton || !this.useButtonBg) return;

    this.useButton.setText('USE');
    this.useButton.setColor(
      this._usable ? this.colors.use : '#96909b'
    );

    this.useButtonBg.setFillStyle(
      this._usable ? 0x315534 : 0x353541
    );

    this.useButtonBg.setStrokeStyle(
      2,
      this._usable ? 0x7cfc8a : 0x6a6070
    );

    if (this.useButtonBg.input) {
      this.useButtonBg.input.cursor = this._usable
        ? 'pointer'
        : 'default';
    }
  }

  updateDetails(item = this._selectedItem, usable = this._usable) {
    if (!this.selectedLabel || !this.tooltip) return;

    if (!item) {
      this.selectedLabel.setText('SELECT AN ITEM');
      this.tooltip.setText(
        'Your pockets. Slightly more organised than your life.'
      );
      this.hintText.setText(
        'Select an item to inspect it.\n'
        + 'Drag an item onto a scene object to use it there.'
      );
      return;
    }

    this.selectedLabel.setText(
      String(item.name || 'Unknown item')
    );

    let type = String(item.type || 'misc').toUpperCase();

    if (usable && item.metadata?.effect?.energy != null) {
      type += `\n+${item.metadata.effect.energy} ENERGY`;
    }

    const description = String(
      item.description || 'No description. Suspicious.'
    );

    const preview = description.length > 210
      ? `${description.slice(0, 209)}…`
      : description;

    this.tooltip.setText(`${type}\n\n${preview}`);

    this.hintText.setText(
      usable
        ? 'Click USE to consume the selected item.'
        : 'To use this on something, drag it onto the target.'
    );
  }

  showTooltip(item, usable) {
    if (this._destroyed || !this.isVisible || !item) return;
    this.updateDetails(item, Boolean(usable));
  }

  hideTooltip() {
    if (this._destroyed) return;
    this.updateDetails();
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;
    this.isVisible = false;

    if (this.root) {
      this.scene?.tweens?.killTweensOf(this.root);
      this.root.destroy(true);
    }

    this.root = null;
    this.container = null;
    this.panel = null;
    this.button = null;
    this.panelRect = null;
    this.actions = null;
    this.scene = null;
  }
}