import { FONT_TEXT, FONT_PIXEL, PIN_COLORS, LEGEND_ITEMS, mulberry32 } from './BoardConstants.js';

export const BoardElements = {
  createQuestionSlots() {
    const count = this.state?.activeSlotCount || 3;

    for (let index = 0; index < count; index++) {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3013);

      const shadow = this.scene.add
        .rectangle(5, 6, 380, 132, 0x000000, 0.4);

      // Pulsująca poświata zaznaczonego pytania
      const glow = this.scene.add
        .rectangle(0, 0, 394, 146, 0x000000, 0)
        .setStrokeStyle(4, 0xffd966, 1)
        .setAlpha(0);

      const box = this.scene.add
        .rectangle(0, 0, 380, 132, 0x241c16, 1)
        .setStrokeStyle(3, 0xc8a75a, 0.9)
        .setInteractive({ useHandCursor: true });

      const decor = this.scene.add.graphics();

      const qMark = this.scene.add
        .text(0, 0, '?', {
          fontFamily: FONT_PIXEL,
          fontSize: '48px',
          color: '#ffffff'
        })
        .setOrigin(0.5)
        .setAlpha(0.07);

      const labelTape = this.scene.add
        .rectangle(0, 0, 200, 30, 0xe8dca0, 0.96)
        .setStrokeStyle(1, 0xb8a678, 1);

      const label = this.scene.add
        .text(0, 0, this.slotLabels[index] || `QUESTION ${index + 1}`, {
          fontFamily: FONT_PIXEL,
          fontSize: '11px',
          color: '#3d2a09',
          align: 'center',
          wordWrap: {
            width: 340,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      const labelPin = this.scene.add.graphics();

      const answerText = this.scene.add
        .text(0, 2, '[ empty ]', {
          fontFamily: FONT_TEXT,
          fontSize: '20px',
          color: '#8d8577',
          align: 'center',
          wordWrap: {
            width: 320,
            useAdvancedWrap: true
          },
          lineSpacing: 5
        })
        .setOrigin(0.5);

      const lockStamp = this.scene.add
        .text(0, 0, 'CONFIRMED', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#6fe08a',
          padding: { left: 5, right: 5, top: 4, bottom: 4 }
        })
        .setOrigin(0.5)
        .setAngle(-8)
        .setAlpha(0.85)
        .setVisible(false);

      const removeButton = this.scene.add
        .text(0, 0, 'REMOVE', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#ffffff',
          backgroundColor: '#7a1f1f',
          padding: {
            left: 7,
            right: 7,
            top: 6,
            bottom: 6
          }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setVisible(false);

      box.on('pointerup', () => {
        if (this.state?.uiLocked) {
          return;
        }

        this.onSlotTap?.(index);
      });

      removeButton.on('pointerup', () => {
        if (this.state?.uiLocked) {
          return;
        }

        this._sfx('paper_rustle', 0.3);
        this.onSlotRemove?.(index);
      });

      container.add([
        shadow,
        glow,
        box,
        decor,
        qMark,
        answerText,
        labelTape,
        label,
        labelPin,
        lockStamp,
        removeButton
      ]);

      this.slotViews.push({
        index,
        container,
        shadow,
        glow,
        box,
        decor,
        qMark,
        labelTape,
        label,
        labelPin,
        answerText,
        lockStamp,
        removeButton,
        glowOn: false
      });
    }
  },

  createEvidenceCards() {
    this.cards.forEach((card, index) => {
      const rng = mulberry32(1000 + index * 17);

      const container = this.scene.add
        .container(0, 0)
        .setDepth(3012);

      const shadow = this.scene.add
        .rectangle(4, 5, 230, 102, 0x000000, 0.4);

      const box = this.scene.add
        .rectangle(0, 0, 230, 102, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x725022, 0.95)
        .setInteractive({ useHandCursor: true });

      const decor = this.scene.add.graphics();
      const pin = this.scene.add.graphics();

      const cardTitle = this.scene.add
        .text(0, 4, card.item || `CLUE ${index + 1}`, {
          fontFamily: FONT_TEXT,
          fontSize: '18px',
          color: '#3d2409',
          align: 'center',
          wordWrap: {
            width: 196,
            useAdvancedWrap: true
          },
          lineSpacing: 4
        })
        .setOrigin(0.5);

      const selectedMark = this.scene.add
        .text(0, 39, 'SELECTED', {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#251700',
          backgroundColor: '#ffd966',
          padding: {
            left: 6,
            right: 6,
            top: 4,
            bottom: 4
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const usedMark = this.scene.add
        .text(0, 0, 'USED', {
          fontFamily: FONT_PIXEL,
          fontSize: '14px',
          color: '#f7e7bd',
          backgroundColor: '#463a30',
          padding: {
            left: 9,
            right: 9,
            top: 7,
            bottom: 7
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const view = {
        index,
        container,
        shadow,
        box,
        decor,
        pin,
        cardTitle,
        selectedMark,
        usedMark,
        baseX: 0,
        baseY: 0,
        baseRot: (rng() - 0.5) * 0.07,
        pinColor: PIN_COLORS[index % PIN_COLORS.length],
        hover: false
      };

      box.on('pointerover', () => {
        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        view.hover = true;
        this._settleCard(view);
      });

      box.on('pointerdown', () => {
        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        this._kill(container);
        container.setScale(0.96);
      });

      box.on('pointerup', () => {
        container.setScale(1);

        if (this.state?.uiLocked || this.isCardUsed(index)) {
          this._settleCard(view);
          return;
        }

        this._sfx('click_sound', 0.3);
        this.onCardTap?.(index);
        this._settleCard(view);
      });

      box.on('pointerout', () => {
        view.hover = false;
        this._settleCard(view);
      });

      container.add([
        shadow,
        box,
        decor,
        cardTitle,
        pin,
        selectedMark,
        usedMark
      ]);

      this.cardViews.push(view);
    });
  },

  createButtons() {
    this.closeButton = this.createButton(
      '[ CLOSE ]',
      '#ded6c2'
    );

    this.confirmButton = this.createButton(
      '[ CHECK THEORY ]',
      '#ffd966'
    );

    this.closeButton.on('pointerup', () => {
      this.onClose?.();
    });

    this.confirmButton.on('pointerup', () => {
      this._tryConfirm();
    });
  },

  _tryConfirm() {
    if (this.state?.uiLocked) {
      return;
    }

    if (!this.state?.isTimelineComplete()) {
      this.showFeedback(
        `Choose answers for all ${this.state?.activeSlotCount || 3} questions first.`,
        '#ff9f80'
      );

      return;
    }

    this._sfx('paper_rustle', 0.4);
    this.onConfirm?.();
  },

  createButton(text, color) {
    const button = this.scene.add
      .text(0, 0, text, {
        fontFamily: FONT_TEXT,
        fontSize: '23px',
        color,
        backgroundColor: '#332519',
        padding: {
          left: 18,
          right: 18,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(3020)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (this._confirmPulseOn && button === this.confirmButton) {
        return;
      }

      button.setScale(1.04);
    });

    button.on('pointerout', () => {
      if (this._confirmPulseOn && button === this.confirmButton) {
        return;
      }

      button.setScale(1);
    });

    return button;
  },

  createLegend() {
    this.legendContainer = this.scene.add
      .container(0, 0)
      .setDepth(3010);

    this.legendItems = LEGEND_ITEMS.map(item => {
      const swatch = this.scene.add.circle(0, 0, 7, item.color, 1)
        .setStrokeStyle(2, 0x000000, 0.6);

      const text = this.scene.add
        .text(0, 0, item.label, {
          fontFamily: FONT_TEXT,
          fontSize: '15px',
          color: '#e0cfa2',
          stroke: '#000000',
          strokeThickness: 3
        })
        .setOrigin(0, 0.5);

      this.legendContainer.add([swatch, text]);
      return { swatch, text };
    });
  }
};
