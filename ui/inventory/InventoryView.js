// ui/inventory/InventoryView.js

export class InventoryView {
  constructor(scene, actions) {
    this.scene = scene;
    this.actions = actions;

    this.isVisible = false;

    this.slotSize = 70;
    this.slotPadding = 8;
    this.cols = 4;
    this.rows = 3;

    this.width =
      (this.slotSize + this.slotPadding) * this.cols + 40;

    this.height =
      (this.slotSize + this.slotPadding) * this.rows + 135;

    this.colors = {
      background: '#1a1a2e',
      border: '#d4af37',
      text: '#eaeaea',
      hover: '#f4b860',
      selected: '#ffd700',
      slot: '#2a2a3e',
      shadow: '#000000',
      use: '#7CFC8A'
    };

    // Przycisk otwierający inventory znajduje się w PlayerMenuUI.
    this.button = null;

    this._destroyed = false;
    this._usable = false;
  }

  create() {
    this.createTextures();

    const image = (key, depth) =>
      this.scene.add
        .image(0, 0, key)
        .setOrigin(0, 0)
        .setDepth(depth)
        .setScrollFactor(0);

    const text = (
      value,
      size,
      color = this.colors.text,
      pixel = false
    ) =>
      this.scene.add
        .text(0, 0, value, {
          fontFamily: pixel ? 'PressStart2P' : 'SpecialElite',
          fontSize: size,
          color
        })
        .setDepth(1001)
        .setScrollFactor(0);

    this.panel = image('inventoryPanel', 1000)
      .setOrigin(1, 0)
      .setInteractive();

    this.panel.on('pointerdown', (pointer, x, y, event) => {
      event?.stopPropagation();
    });

    this.container = this.scene.add
      .container(0, 0)
      .setDepth(1001)
      .setScrollFactor(0);

    this.titleText = text(
      'INVENTORY',
      '16px',
      this.colors.border,
      true
    );

    this.counterText = text('', '12px').setOrigin(1, 0);

    this.closeButton = text(
      '[X]',
      '12px',
      this.colors.border,
      true
    )
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.closeButton.on(
      'pointerup',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.actions.close();
      }
    );

    this.selectedLabel = text(
      '',
      '10px',
      this.colors.selected
    );

    this.selectedLabel.setWordWrapWidth(this.width - 100);

    this.useButton = text(
      '[USE]',
      '10px',
      this.colors.use,
      true
    )
      .setOrigin(1, 0)
      .setDepth(1002)
      .setInteractive({ useHandCursor: true });

    this.useButton.on(
      'pointerup',
      (pointer, x, y, event) => {
        event?.stopPropagation();
        this.actions.use();
      }
    );

    this.useButton.on('pointerover', () => {
      this.useButton.setColor(this.colors.hover);
    });

    this.useButton.on('pointerout', () => {
      this.useButton.setColor(this.colors.use);
    });

    this.tooltip = text('', '10px');
    this.tooltip.setWordWrapWidth(this.width - 40);

    // Nie tworzymy osobnej ikony inventory poza dolnym menu.
    this.layout();
    this.setPanelVisible(false);
  }

  createTextures() {
    const make = (key, width, height, draw) => {
      if (this.scene.textures.exists(key)) return;

      const graphics = this.scene.make.graphics({
        x: 0,
        y: 0,
        add: false
      });

      draw(graphics);
      graphics.generateTexture(key, width, height);
      graphics.destroy();
    };

    make(
      'inventoryPanel',
      this.width,
      this.height,
      graphics => {
        graphics
          .fillStyle(0x1a1a2e, 0.95)
          .fillRect(0, 0, this.width, this.height);

        graphics
          .lineStyle(3, 0xd4af37)
          .strokeRect(0, 0, this.width, this.height);
      }
    );

    for (const selected of [false, true]) {
      make(
        selected ? 'inventorySlotSelected' : 'inventorySlot',
        this.slotSize,
        this.slotSize,
        graphics => {
          graphics
            .fillStyle(0x2a2a3e, selected ? 0.95 : 0.7)
            .fillRect(0, 0, this.slotSize, this.slotSize);

          graphics
            .lineStyle(
              selected ? 3 : 2,
              selected ? 0xffd700 : 0xd4af37
            )
            .strokeRect(
              1,
              1,
              this.slotSize - 2,
              this.slotSize - 2
            );
        }
      );
    }

    make('itemQtyBadge', 20, 20, graphics => {
      graphics
        .fillStyle(0xd4af37, 0.9)
        .fillCircle(10, 10, 10);
    });
  }

  layout() {
    if (this._destroyed) return;

    const { width, height } = this.scene.scale;

    const scale = Math.min(
      1,
      Math.max(0.1, (width - 24) / this.width),
      Math.max(0.1, (height - 84) / this.height)
    );

    const panelX = width - 20;

    const panelY = Math.min(
      60,
      Math.max(12, height - this.height * scale - 12)
    );

    const left = panelX - this.width * scale;

    const at = (object, x, y) => {
      object
        .setPosition(
          left + x * scale,
          panelY + y * scale
        )
        .setScale(scale);
    };

    this.panel.setPosition(panelX, panelY).setScale(scale);

    at(this.container, 20, 50);
    at(this.titleText, 20, 15);
    at(this.counterText, this.width - 52, 15);
    at(this.closeButton, this.width - 18, 15);
    at(this.selectedLabel, 20, this.height - 53);
    at(this.useButton, this.width - 18, this.height - 55);
    at(this.tooltip, 20, this.height - 34);

    this.panelX = panelX;
    this.panelY = panelY;

    this.panelRect = new Phaser.Geom.Rectangle(
      left,
      panelY,
      this.width * scale,
      this.height * scale
    );
  }

  targets() {
    return [
      this.panel,
      this.container,
      this.titleText,
      this.counterText,
      this.closeButton,
      this.selectedLabel,
      this.useButton,
      this.tooltip
    ].filter(Boolean);
  }

  setPanelVisible(visible) {
    for (const object of this.targets()) {
      object.setVisible(visible);
    }

    this.useButton.setVisible(visible && this._usable);
  }

  show(immediate = false) {
    if (this._destroyed) return;

    this.isVisible = true;

    const targets = this.targets();

    this.scene.tweens.killTweensOf(targets);

    this.layout();
    this.setPanelVisible(true);

    for (const object of targets) {
      object.setAlpha(immediate ? 1 : 0);
    }

    if (!immediate) {
      this.scene.tweens.add({
        targets,
        alpha: 1,
        duration: 200,
        ease: 'Quad.easeOut'
      });
    }
  }

  hide(immediate = false) {
    if (this._destroyed) return;

    this.isVisible = false;
    this.hideTooltip();

    const targets = this.targets();

    this.scene.tweens.killTweensOf(targets);
    this.setPanelVisible(false);

    for (const object of targets) {
      object.setAlpha(0);
    }
  }

  render(items, capacity, selectedItem, usable) {
    if (this._destroyed || !this.container?.active) return;

    this._usable = Boolean(usable);

    this.container.removeAll(true);

    for (let index = 0; index < capacity.max; index += 1) {
      const x =
        (index % this.cols) *
        (this.slotSize + this.slotPadding);

      const y =
        Math.floor(index / this.cols) *
        (this.slotSize + this.slotPadding);

      const item = items[index];
      const selected = item && selectedItem?.id === item.id;

      const slot = this.scene.add
        .image(
          x,
          y,
          selected
            ? 'inventorySlotSelected'
            : 'inventorySlot'
        )
        .setOrigin(0);

      this.container.add(slot);

      if (item) {
        this.renderItem(slot, item, x, y, selected);
      }
    }

    this.counterText.setText(
      `${capacity.current}/${capacity.max}`
    );

    this.selectedLabel.setText(
      selectedItem ? `USING: ${selectedItem.name}` : ''
    );

    this.useButton.setVisible(
      this.isVisible && this._usable
    );
  }

  renderItem(slot, item, x, y, selected) {
    const centerX = x + this.slotSize / 2;

    const icon = this.scene.add
      .text(centerX, y + 20, item.icon || '📦', {
        fontSize: '32px'
      })
      .setOrigin(0.5);

    const name = item.name.length > 10
      ? `${item.name.slice(0, 9)}…`
      : item.name;

    const label = this.scene.add
      .text(centerX, y + 50, name, {
        fontFamily: 'SpecialElite',
        fontSize: '9px',
        color: this.colors.text,
        align: 'center'
      })
      .setOrigin(0.5);

    const over = () => {
      if (
        !this.isVisible
        || this.actions.isDragging()
      ) {
        return;
      }

      icon.setTint(0xf4b860);
      this.actions.tooltip(item);
    };

    const out = () => {
      if (selected) {
        icon.setTint(0xffd700);
      } else {
        icon.clearTint();
      }

      this.hideTooltip();
    };

    if (selected) {
      icon.setTint(0xffd700);
    }

    for (const object of [slot, icon, label]) {
      object.setInteractive({ useHandCursor: true });

      object.on('pointerover', over);
      object.on('pointerout', out);

      object.on(
        'pointerdown',
        (pointer, localX, localY, event) => {
          event?.stopPropagation();
          this.actions.press(item, pointer);
        }
      );
    }

    this.container.add([icon, label]);

    if (item.quantity > 1) {
      const badgeX = x + this.slotSize - 10;
      const badgeY = y + this.slotSize - 10;

      const badge = this.scene.add.image(
        badgeX,
        badgeY,
        'itemQtyBadge'
      );

      const quantityText = this.scene.add
        .text(
          badgeX,
          badgeY,
          String(item.quantity),
          {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: '#000000'
          }
        )
        .setOrigin(0.5);

      this.container.add([badge, quantityText]);
    }
  }

  showTooltip(item, usable) {
    if (
      this._destroyed
      || !this.isVisible
      || !item
    ) {
      return;
    }

    let type = (item.type || 'misc').toUpperCase();

    if (
      usable
      && item.metadata?.effect?.energy != null
    ) {
      type +=
        ` · +${item.metadata.effect.energy} ENERGY`;
    }

    this.tooltip.setText(
      `${item.name}\n${type}\n${item.description || ''}`
    );
  }

  hideTooltip() {
    this.tooltip?.setText('');
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    this.scene.tweens.killTweensOf(this.targets());

    this.container?.destroy(true);

    for (const object of [
      this.panel,
      this.titleText,
      this.counterText,
      this.closeButton,
      this.selectedLabel,
      this.useButton,
      this.tooltip
    ]) {
      object?.destroy();
    }

    this.button = null;
    this.actions = null;
    this.scene = null;
  }
}