export class SlotView {
  constructor(scene, index, { label, onClick, onRemove }) {
    this.scene = scene;
    this.index = index;
    this.onClick = onClick;
    this.onRemove = onRemove;
    this._labelText = label || `STEP ${index + 1}`;
    this._narrativeActive = false;
    this._typewriterEvent = null;

    this.label = null;
    this.box = null;
    this.dropZone = null;
    this.text = null;
    this.removeButton = null;

    this.create();
  }

  create() {
    const { scene, index } = this;

    this.label = scene.add.text(0, 0, this._labelText, {
      fontFamily: 'PressStart2P',
      fontSize: '14px',
      color: '#f0ddb0'
    }).setOrigin(0.5).setDepth(3002);

    this.box = scene.add.rectangle(0, 0, 420, 150, 0x241c16, 0.98)
      .setStrokeStyle(3, 0xc8a75a, 0.8)
      .setDepth(3002)
      .setInteractive(new Phaser.Geom.Rectangle(-210, -75, 420, 150), Phaser.Geom.Rectangle.Contains);

    this.dropZone = scene.add.zone(0, 0, 420, 150)
      .setRectangleDropZone(420, 150)
      .setData('slotIndex', index)
      .setDepth(3003);

    this.text = scene.add.text(0, 0, '[ empty ]', {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: '#8d8577',
      align: 'center',
      wordWrap: { width: 300, useAdvancedWrap: true },
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(3003);

    this.removeButton = scene.add.text(0, 0, 'X', {
      fontFamily: 'PressStart2P',
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#7a1f1f',
      padding: { left: 7, right: 7, top: 5, bottom: 5 }
    }).setOrigin(0.5).setDepth(3004).setInteractive({ useHandCursor: true });

    this.removeButton.on('pointerup', () => {
      if (typeof this.onRemove === 'function') this.onRemove(this.index);
    });

    this.box.on('pointerup', () => {
      if (typeof this.onClick === 'function') this.onClick(this.index);
    });
  }

  updateLayout(pos, L) {
    if (!pos) return;

    this.label.setPosition(pos.x, pos.labelY);
    this.label.setFontSize(L.isMobile ? '12px' : '14px');
    this.label.setWordWrapWidth(L.wrapSlot, true);

    this.box.setPosition(pos.x, pos.y);
    this.box.setSize(L.slotWidth, L.slotHeight);
    this.box.input.hitArea.setTo(
      -L.slotWidth / 2,
      -L.slotHeight / 2,
      L.slotWidth,
      L.slotHeight
    );

    this.dropZone.setPosition(pos.x, pos.y);
    this.dropZone.setSize(L.slotWidth, L.slotHeight);
    this.dropZone.setRectangleDropZone(L.slotWidth, L.slotHeight);

    this.text.setPosition(pos.x, pos.y);
    this.text.setFontSize(this._narrativeActive ? (L.isMobile ? '15px' : '17px') : (L.isMobile ? '20px' : '24px'));
    this.text.setWordWrapWidth(L.wrapSlot, true);

    if (this.removeButton) {
      this.removeButton.setPosition(pos.x + L.slotWidth / 2 - 24, pos.y - L.slotHeight / 2 + 20);
      this.removeButton.setFontSize(L.isMobile ? '14px' : '16px');
    }
  }

  refresh(card, status = 'neutral', isSelected = false) {
    const colorMap = {
      neutral:   { fill: 0x241c16, stroke: 0xc8a75a, text: '#8d8577', width: 3 },
      selected:  { fill: 0x2c2614, stroke: 0xffd966, text: '#f7f1dc', width: 4 },
      green:     { fill: 0x1a2e14, stroke: 0x3ddb6b, text: '#a8e6a8', width: 3 },
      locked:    { fill: 0x1a2e14, stroke: 0x3ddb6b, text: '#a8e6a8', width: 4 },
      yellow:    { fill: 0x3a3216, stroke: 0xf1c232, text: '#f7f1dc', width: 3 },
      red:       { fill: 0x331d1d, stroke: 0xe06666, text: '#f7f1dc', width: 3 }
    };

    const effectiveStatus = isSelected ? 'selected' : (status || 'neutral');
    const colors = colorMap[effectiveStatus] || colorMap.neutral;

    this.box.setFillStyle(colors.fill, 0.98);
    this.box.setStrokeStyle(colors.width, colors.stroke, 0.95);

    const hasCard = card !== null && card !== undefined;
    this.removeButton.setAlpha(hasCard && !this._narrativeActive ? 1 : 0.22);
    this.removeButton.setVisible(!this._narrativeActive);

    if (!hasCard) {
      this._narrativeActive = false;
      this.text.setText(isSelected ? '[ selected ]' : '[ empty ]');
      this.text.setColor(colors.text);
    } else if (!this._narrativeActive) {
      this.text.setText(card.item || '[ clue ]');
      this.text.setColor(colors.text);
    }
  }

  showNarrative(text) {
    if (this._typewriterEvent) this._typewriterEvent.remove();

    this._narrativeActive = true;
    this.removeButton.setVisible(false);
    this.removeButton.setAlpha(0);

    const layout = this.scene?.scale;
    if (layout) {
      const isMobile = layout.width <= 900;
      this.text.setFontSize(isMobile ? '15px' : '17px');
    }

    this.text.setColor('#a8e6a8');
    this.text.setText('');

    let i = 0;
    this._typewriterEvent = this.scene.time.addEvent({
      delay: 22,
      repeat: text.length - 1,
      callback: () => {
        i++;
        this.text.setText(text.slice(0, i));
      }
    });
  }

  flash() {
    const box = this.box;
    const originalLineWidth = box.lineWidth || 3;
    this.scene.tweens.killTweensOf(box);
    box.setStrokeStyle(5, 0xfff2a8, 1);

    this.scene.tweens.add({
      targets: box,
      alpha: { from: 1, to: 0.86 },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        box.setAlpha(1);
        if (box.active) box.setLineWidth?.(originalLineWidth);
      }
    });
  }

  destroy() {
    if (this._typewriterEvent) this._typewriterEvent.remove();

    [this.label, this.box, this.text, this.dropZone, this.removeButton].forEach(item => {
      if (item?.removeAllListeners) item.removeAllListeners();
      if (item?.destroy) item.destroy();
    });
  }
}