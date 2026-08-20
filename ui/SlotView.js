export class SlotView {
  constructor(scene, index, {
    label,
    onClick,
    onRemove
  } = {}) {
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

    /*
     * Wartości są wyższe niż:
     * - overlay: 3000
     * - panel: 3002–3003
     * - clue cards: 3006
     *
     * Dzięki temu slot, jego tekst i X zawsze są nad kartą.
     */
    this.label = scene.add
      .text(0, 0, this._labelText, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#f0ddb0',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.box = scene.add
      .rectangle(0, 0, 420, 150, 0x241c16, 0.98)
      .setStrokeStyle(3, 0xc8a75a, 0.9)
      .setDepth(3011)
      .setInteractive(
        new Phaser.Geom.Rectangle(-210, -75, 420, 150),
        Phaser.Geom.Rectangle.Contains
      );

    /*
     * Drop zone zostaje pod tekstem i X.
     * Obecnie interakcja jest klikana, ale zostawiamy ją
     * na przyszłe drag & drop.
     */
    this.dropZone = scene.add
      .zone(0, 0, 420, 150)
      .setRectangleDropZone(420, 150)
      .setData('slotIndex', index)
      .setDepth(3012);

    this.text = scene.add
      .text(0, 0, '[ empty ]', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#8d8577',
        align: 'center',
        wordWrap: {
          width: 300,
          useAdvancedWrap: true
        },
        lineSpacing: 4
      })
      .setOrigin(0.5)
      .setDepth(3013);

    this.removeButton = scene.add
      .text(0, 0, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '15px',
        color: '#ffffff',
        backgroundColor: '#7a1f1f',
        padding: {
          left: 8,
          right: 8,
          top: 7,
          bottom: 7
        }
      })
      .setOrigin(0.5)
      .setDepth(3015)
      .setInteractive({ useHandCursor: true });

    this.removeButton.on('pointerover', () => {
      this.removeButton.setBackgroundColor('#a52a2a');
      this.removeButton.setScale(1.08);
    });

    this.removeButton.on('pointerout', () => {
      this.removeButton.setBackgroundColor('#7a1f1f');
      this.removeButton.setScale(1);
    });

    this.removeButton.on('pointerup', pointer => {
      pointer.event?.stopPropagation?.();

      if (typeof this.onRemove === 'function') {
        this.onRemove(this.index);
      }
    });

    this.box.on('pointerup', () => {
      if (typeof this.onClick === 'function') {
        this.onClick(this.index);
      }
    });
  }

  updateLayout(pos, L) {
    if (!pos || !L) return;

    const isCompact =
      L.isCompact ||
      L.isMobile ||
      L.width <= 760;

    this.label
      .setPosition(pos.x, pos.labelY)
      .setFontSize(isCompact ? '10px' : '14px')
      .setWordWrapWidth(L.wrapSlot, true);

    this.box
      .setPosition(pos.x, pos.y)
      .setSize(L.slotWidth, L.slotHeight);

    if (this.box.input?.hitArea?.setTo) {
      this.box.input.hitArea.setTo(
        -L.slotWidth / 2,
        -L.slotHeight / 2,
        L.slotWidth,
        L.slotHeight
      );
    }

    this.dropZone
      .setPosition(pos.x, pos.y)
      .setSize(L.slotWidth, L.slotHeight)
      .setRectangleDropZone(
        L.slotWidth,
        L.slotHeight
      );

    this.text
      .setPosition(pos.x, pos.y)
      .setFontSize(
        this._narrativeActive
          ? (isCompact ? '13px' : '17px')
          : (isCompact ? '17px' : '24px')
      )
      .setWordWrapWidth(
        Math.max(150, L.wrapSlot - 26),
        true
      );

    this.removeButton
      .setPosition(
        pos.x + L.slotWidth / 2 - (isCompact ? 22 : 26),
        pos.y - L.slotHeight / 2 + (isCompact ? 19 : 23)
      )
      .setFontSize(isCompact ? '11px' : '15px');
  }

  refresh(
    card,
    status = 'neutral',
    isSelected = false,
    sentence = null
  ) {
    const colorMap = {
      neutral: {
        fill: 0x241c16,
        stroke: 0xc8a75a,
        text: '#8d8577',
        width: 3
      },

      selected: {
        fill: 0x2c2614,
        stroke: 0xffd966,
        text: '#f7f1dc',
        width: 4
      },

      green: {
        fill: 0x1a2e14,
        stroke: 0x3ddb6b,
        text: '#a8e6a8',
        width: 3
      },

      locked: {
        fill: 0x1a2e14,
        stroke: 0x3ddb6b,
        text: '#a8e6a8',
        width: 4
      },

      yellow: {
        fill: 0x3a3216,
        stroke: 0xf1c232,
        text: '#f7f1dc',
        width: 3
      },

      red: {
        fill: 0x331d1d,
        stroke: 0xe06666,
        text: '#f7f1dc',
        width: 3
      }
    };

    const effectiveStatus = isSelected
      ? 'selected'
      : (status || 'neutral');

    const colors =
      colorMap[effectiveStatus] ||
      colorMap.neutral;

    this.box.setFillStyle(colors.fill, 0.98);
    this.box.setStrokeStyle(
      colors.width,
      colors.stroke,
      0.95
    );

    const hasCard =
      card !== null &&
      card !== undefined;

    this.removeButton.setVisible(
      hasCard &&
      !this._narrativeActive
    );

    this.removeButton.setAlpha(
      hasCard &&
      !this._narrativeActive
        ? 1
        : 0
    );

    if (!hasCard) {
      this._narrativeActive = false;

      this.text.setText(
        isSelected
          ? '[ selected — choose a clue ]'
          : '[ empty ]'
      );

      this.text.setColor(colors.text);
      return;
    }

    if (!this._narrativeActive) {
      this.text.setText(
        sentence ||
        card.item ||
        '[ clue ]'
      );

      this.text.setColor(colors.text);
    }
  }

  showNarrative(text) {
    this._typewriterEvent?.remove();

    this._narrativeActive = true;

    this.removeButton.setVisible(false);
    this.removeButton.setAlpha(0);

    const isMobile =
      this.scene?.scale?.width <= 900;

    this.text.setFontSize(
      isMobile
        ? '14px'
        : '17px'
    );

    this.text.setColor('#a8e6a8');
    this.text.setText('');

    const safeText = String(text || '');

    if (!safeText) return;

    let index = 0;

    this._typewriterEvent =
      this.scene.time.addEvent({
        delay: 18,
        repeat: safeText.length - 1,
        callback: () => {
          index += 1;
          this.text.setText(
            safeText.slice(0, index)
          );
        }
      });
  }

  flash() {
    if (!this.box?.active) return;

    const box = this.box;
    const originalAlpha = box.alpha;

    this.scene.tweens.killTweensOf(box);

    box.setStrokeStyle(5, 0xfff2a8, 1);

    this.scene.tweens.add({
      targets: box,
      alpha: {
        from: 1,
        to: 0.78
      },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        if (!box.active) return;

        box.setAlpha(originalAlpha);
      }
    });
  }

  destroy() {
    this._typewriterEvent?.remove();

    [
      this.label,
      this.box,
      this.text,
      this.dropZone,
      this.removeButton
    ].forEach(item => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });

    this.label = null;
    this.box = null;
    this.text = null;
    this.dropZone = null;
    this.removeButton = null;
  }
}