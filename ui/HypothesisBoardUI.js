export class HypothesisBoardUI {
  constructor(scene, {
    state,
    cards = [],
    slotLabels = [],
    buildSlotSentence = null,
    onCardTap = null,
    onSlotTap = null,
    onSlotRemove = null,
    onConfirm = null,
    onClose = null
  } = {}) {
    this.scene = scene;
    this.state = state;
    this.cards = Array.isArray(cards) ? cards : [];
    this.slotLabels = Array.isArray(slotLabels) ? slotLabels : [];

    this.buildSlotSentence =
      typeof buildSlotSentence === 'function'
        ? buildSlotSentence
        : null;

    this.onCardTap =
      typeof onCardTap === 'function'
        ? onCardTap
        : null;

    this.onSlotTap =
      typeof onSlotTap === 'function'
        ? onSlotTap
        : null;

    this.onSlotRemove =
      typeof onSlotRemove === 'function'
        ? onSlotRemove
        : null;

    this.onConfirm =
      typeof onConfirm === 'function'
        ? onConfirm
        : null;

    this.onClose =
      typeof onClose === 'function'
        ? onClose
        : null;

    this.overlay = null;
    this.panel = null;

    this.titleText = null;
    this.subtitleText = null;
    this.attemptsText = null;
    this.legendText = null;
    this.feedbackText = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.slotViews = [];
    this.cardViews = [];

    this.layout = null;
    this.resizeHandler = null;
    this.isDestroyed = false;
  }

  create() {
    if (this.isDestroyed) {
      return;
    }

    const { width, height } = this.scene.scale;

    /*
     * Blokuje kliknięcia w scenę pod spodem.
     * Wszystkie elementy minigry mają większy depth.
     */
    this.overlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.86)
      .setOrigin(0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width - 36,
        height - 36,
        0x17120e,
        0.99
      )
      .setStrokeStyle(4, 0xd4af37, 0.9)
      .setDepth(3001);

    this.titleText = this.scene.add
      .text(width / 2, 0, 'RECONSTRUCT THE HEIST', {
        fontFamily: 'Special Elite',
        fontSize: '36px',
        color: '#f7f1dc',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.subtitleText = this.scene.add
      .text(
        width / 2,
        0,
        'Select one clue below, then select the question it answers.',
        {
          fontFamily: 'Special Elite',
          fontSize: '19px',
          color: '#e8d7a8',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(3010);

    this.attemptsText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '21px',
        color: '#ffd966',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.createQuestionSlots();
    this.createEvidenceCards();
    this.createButtons();

    this.legendText = this.scene.add
      .text(
        width / 2,
        0,
        'GREEN: correct  •  YELLOW: correct clue, wrong question  •  RED: wrong clue',
        {
          fontFamily: 'Special Elite',
          fontSize: '15px',
          color: '#cbb98e',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(3010);

    this.feedbackText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '19px',
        color: '#ffd966',
        align: 'center',
        wordWrap: {
          width: 700,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.resizeHandler = () => {
      if (this.isDestroyed) {
        return;
      }

      this.applyLayout();
      this.refresh();
    };

    this.scene.scale.on(
      'resize',
      this.resizeHandler,
      this
    );

    this.applyLayout();
    this.refresh();
  }

  createQuestionSlots() {
    const count = this.state?.activeSlotCount || 3;

    for (let index = 0; index < count; index++) {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3013);

      const box = this.scene.add
        .rectangle(0, 0, 380, 132, 0x241c16, 1)
        .setStrokeStyle(3, 0xc8a75a, 0.9)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, 0, this.slotLabels[index] || `QUESTION ${index + 1}`, {
          fontFamily: 'PressStart2P',
          fontSize: '11px',
          color: '#f0ddb0',
          align: 'center',
          wordWrap: {
            width: 340,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      const answerText = this.scene.add
        .text(0, 2, '[ empty ]', {
          fontFamily: 'Special Elite',
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

      const removeButton = this.scene.add
        .text(0, 0, 'REMOVE', {
          fontFamily: 'PressStart2P',
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

        this.onSlotRemove?.(index);
      });

      container.add([
        box,
        label,
        answerText,
        removeButton
      ]);

      this.slotViews.push({
        index,
        container,
        box,
        label,
        answerText,
        removeButton
      });
    }
  }

  createEvidenceCards() {
    this.cards.forEach((card, index) => {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3012);

      const box = this.scene.add
        .rectangle(0, 0, 230, 102, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x725022, 0.95)
        .setInteractive({ useHandCursor: true });

      const cardTitle = this.scene.add
        .text(0, 0, card.item || `CLUE ${index + 1}`, {
          fontFamily: 'Special Elite',
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
        .text(0, -39, 'SELECTED', {
          fontFamily: 'PressStart2P',
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
          fontFamily: 'PressStart2P',
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

      box.on('pointerdown', () => {
        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        container.setScale(0.96);
      });

      box.on('pointerup', () => {
        container.setScale(1);

        if (this.state?.uiLocked || this.isCardUsed(index)) {
          return;
        }

        this.onCardTap?.(index);
      });

      box.on('pointerout', () => {
        container.setScale(1);
      });

      container.add([
        box,
        cardTitle,
        selectedMark,
        usedMark
      ]);

      this.cardViews.push({
        index,
        container,
        box,
        cardTitle,
        selectedMark,
        usedMark
      });
    });
  }

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

      this.onConfirm?.();
    });
  }

  createButton(text, color) {
    const button = this.scene.add
      .text(0, 0, text, {
        fontFamily: 'Special Elite',
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
      button.setScale(1.04);
    });

    button.on('pointerout', () => {
      button.setScale(1);
    });

    return button;
  }

  getLayout() {
    const { width, height } = this.scene.scale;

    const compact =
      height < 780 ||
      width < 1100;

    const panelMarginX = compact ? 18 : 38;
    const panelMarginY = compact ? 14 : 30;

    const panelWidth = width - panelMarginX * 2;
    const panelHeight = height - panelMarginY * 2;
    const panelTop = panelMarginY;
    const panelBottom = height - panelMarginY;

    const titleY = panelTop + (compact ? 30 : 44);
    const subtitleY = titleY + (compact ? 36 : 48);
    const attemptsY = subtitleY + (compact ? 40 : 54);

    /*
     * Wyraźna przerwa między ATTEMPTS LEFT a pytaniami.
     */
    const slotsY = attemptsY + (compact ? 118 : 148);

    const slotGap = compact ? 18 : 30;

    const slotWidth = Math.min(
      compact ? 270 : 380,
      (panelWidth - 80 - slotGap * 2) / 3
    );

    const slotHeight = compact ? 94 : 132;

    const slotStartX =
      width / 2 -
      (slotWidth * 3 + slotGap * 2) / 2 +
      slotWidth / 2;

    const slotPositions = Array.from(
      { length: 3 },
      (_, index) => ({
        x: slotStartX + index * (slotWidth + slotGap),
        y: slotsY
      })
    );

    /*
     * ZAWSZE:
     * 0, 1, 2 = pierwszy rząd
     * 3, 4, 5 = drugi rząd
     */
    const cardColumns = 3;
    const cardRows = 2;

    const cardsTopY =
      slotsY +
      slotHeight / 2 +
      (compact ? 72 : 92);

    const cardGapX = compact ? 14 : 22;
    const cardGapY = compact ? 14 : 18;

    const cardWidth = Math.min(
      compact ? 190 : 230,
      (
        panelWidth -
        90 -
        cardGapX * (cardColumns - 1)
      ) / cardColumns
    );

    const cardHeight = compact ? 78 : 102;

    const cardStartX =
      width / 2 -
      (
        cardWidth * cardColumns +
        cardGapX * (cardColumns - 1)
      ) / 2 +
      cardWidth / 2;

    const cardPositions = this.cards.map((_, index) => {
      const column = index % cardColumns;
      const row = Math.floor(index / cardColumns);

      return {
        x: cardStartX + column * (cardWidth + cardGapX),
        y: cardsTopY + row * (cardHeight + cardGapY)
      };
    });

    const cardsBottomY =
      cardsTopY +
      (cardRows - 1) * (cardHeight + cardGapY) +
      cardHeight / 2;

    const legendY = cardsBottomY + (compact ? 36 : 44);
    const feedbackY = legendY + (compact ? 30 : 38);

    const buttonsY = Math.min(
      panelBottom - (compact ? 34 : 44),
      feedbackY + (compact ? 46 : 58)
    );

    return {
      width,
      height,
      compact,

      panelWidth,
      panelHeight,

      titleY,
      subtitleY,
      attemptsY,

      slotWidth,
      slotHeight,
      slotPositions,

      cardWidth,
      cardHeight,
      cardPositions,

      legendY,
      feedbackY,
      buttonsY,

      closeX: width / 2 - (compact ? 112 : 155),
      confirmX: width / 2 + (compact ? 112 : 155),

      slotWrapWidth: Math.max(135, slotWidth - 30),
      feedbackWrapWidth: Math.max(320, panelWidth - 90)
    };
  }

  applyLayout() {
    if (!this.overlay || this.isDestroyed) {
      return;
    }

    this.layout = this.getLayout();

    const L = this.layout;

    this.overlay
      .setSize(L.width, L.height)
      .setPosition(0, 0);

    this.panel
      .setPosition(L.width / 2, L.height / 2)
      .setSize(L.panelWidth, L.panelHeight);

    this.titleText
      .setPosition(L.width / 2, L.titleY)
      .setFontSize(L.compact ? '26px' : '36px');

    this.subtitleText
      .setPosition(L.width / 2, L.subtitleY)
      .setFontSize(L.compact ? '14px' : '19px')
      .setWordWrapWidth(L.feedbackWrapWidth, true);

    this.attemptsText
      .setPosition(L.width / 2, L.attemptsY)
      .setFontSize(L.compact ? '16px' : '21px');

    this.slotViews.forEach((view, index) => {
      const position = L.slotPositions[index];

      if (!position) {
        return;
      }

      view.container.setPosition(position.x, position.y);

      view.box.setSize(
        L.slotWidth,
        L.slotHeight
      );

      /*
       * Etykieta jest nad ramką pytania,
       * a nie wewnątrz niej.
       */
      view.label
        .setPosition(0, -L.slotHeight / 2 - 22)
        .setFontSize(L.compact ? '8px' : '11px')
        .setWordWrapWidth(L.slotWrapWidth, true);

      view.answerText
        .setPosition(0, 2)
        .setFontSize(L.compact ? '15px' : '20px')
        .setWordWrapWidth(L.slotWrapWidth, true);

      view.removeButton
        .setPosition(
          L.slotWidth / 2 - 35,
          -L.slotHeight / 2 + 17
        )
        .setFontSize(L.compact ? '7px' : '9px');
    });

    this.cardViews.forEach((view, index) => {
      const position = L.cardPositions[index];

      if (!position) {
        return;
      }

      view.container.setPosition(position.x, position.y);

      view.box.setSize(
        L.cardWidth,
        L.cardHeight
      );

      view.cardTitle
        .setFontSize(L.compact ? '14px' : '18px')
        .setWordWrapWidth(
          Math.max(110, L.cardWidth - 20),
          true
        );
    });

    this.legendText
      .setPosition(L.width / 2, L.legendY)
      .setFontSize(L.compact ? '11px' : '15px')
      .setWordWrapWidth(L.feedbackWrapWidth, true);

    this.feedbackText
      .setPosition(L.width / 2, L.feedbackY)
      .setFontSize(L.compact ? '14px' : '19px')
      .setWordWrapWidth(L.feedbackWrapWidth, true);

    this.closeButton
      .setPosition(L.closeX, L.buttonsY)
      .setFontSize(L.compact ? '17px' : '23px');

    this.confirmButton
      .setPosition(L.confirmX, L.buttonsY)
      .setFontSize(L.compact ? '17px' : '23px');
  }

  refresh() {
    if (this.isDestroyed) {
      return;
    }

    this.refreshSlots();
    this.refreshCards();
    this.refreshAttempts();
    this.refreshConfirmButton();
  }

  refreshSlots() {
    this.slotViews.forEach((view, slotIndex) => {
      /*
       * Wszystkie zmienne muszą powstać PRZED
       * pierwszym użyciem isSelected / isLocked.
       */
      const card = this.state?.getPlacedCard(slotIndex);

      const isSelected =
        this.state?.selectedSlotIndex === slotIndex;

      const isLocked =
        this.state?.isSlotLocked(slotIndex);

      const feedback =
        this.state?.slotFeedback?.[slotIndex] ||
        'neutral';

      const colors = {
        neutral: {
          fill: 0x241c16,
          stroke: 0xc8a75a,
          text: '#8d8577'
        },

        selected: {
          fill: 0x3a3017,
          stroke: 0xffd966,
          text: '#fff0bf'
        },

        green: {
          fill: 0x193019,
          stroke: 0x44d66a,
          text: '#b9efb9'
        },

        yellow: {
          fill: 0x3d3216,
          stroke: 0xf1c232,
          text: '#fff0bf'
        },

        red: {
          fill: 0x3a1d1d,
          stroke: 0xe06666,
          text: '#fff0bf'
        }
      };

      let visual = colors[feedback] || colors.neutral;

      if (isSelected && !card) {
        visual = colors.selected;
      }

      if (isLocked) {
        visual = colors.green;
      }

      view.box.setFillStyle(visual.fill, 1);
      view.box.setStrokeStyle(
        isSelected ? 4 : 3,
        visual.stroke,
        1
      );

      if (!card) {
        view.answerText.setText(
          isSelected
            ? '[ now select a clue ]'
            : '[ empty ]'
        );

        view.answerText.setColor(visual.text);
        view.removeButton.setVisible(false);

        return;
      }

      /*
       * To jest moment, kiedy tekst wybranej wskazówki
       * trafia do kwadratu pytania.
       */
      view.answerText.setText(
        this.getSlotSentence(card, slotIndex)
      );

      view.answerText.setColor(visual.text);

      view.removeButton.setVisible(
        !isLocked &&
        !this.state?.uiLocked
      );
    });
  }

  refreshCards() {
    this.cardViews.forEach(view => {
      const used = this.isCardUsed(view.index);

      const selected =
        this.state?.selectedCardIndex === view.index;

      view.usedMark.setVisible(used);
      view.selectedMark.setVisible(selected && !used);

      if (used) {
        view.container.setAlpha(0.38);

        view.box.setFillStyle(0x95866d, 1);
        view.box.setStrokeStyle(
          2,
          0x6c5e4c,
          0.7
        );

        view.box.disableInteractive();

        return;
      }

      view.container.setAlpha(1);

      view.box.setInteractive({
        useHandCursor: true
      });

      if (selected) {
        view.box.setFillStyle(0xffedb1, 1);
        view.box.setStrokeStyle(
          4,
          0xd4af37,
          1
        );
      } else {
        view.box.setFillStyle(0xf1e2bf, 1);
        view.box.setStrokeStyle(
          3,
          0x725022,
          0.95
        );
      }
    });
  }

  refreshAttempts() {
    const attempts =
      this.state?.attemptsLeft ?? 0;

    this.attemptsText.setText(
      `ATTEMPTS LEFT: ${attempts}`
    );
  }

  refreshConfirmButton() {
    const isComplete =
      this.state?.isTimelineComplete() &&
      !this.state?.uiLocked;

    this.confirmButton.setColor(
      isComplete ? '#ffd966' : '#777777'
    );

    this.confirmButton.setBackgroundColor(
      isComplete ? '#513c12' : '#2d2822'
    );

    this.confirmButton.setAlpha(
      isComplete ? 1 : 0.72
    );
  }

  isCardUsed(cardIndex) {
    const slotIndex =
      this.state?.getCardSlot(cardIndex);

    return (
      slotIndex !== -1 &&
      slotIndex !== null &&
      slotIndex !== undefined
    );
  }

  getSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    /*
     * To usuwa drugi błąd z Twojego pliku:
     * `return sentence || ...`, gdy sentence nie istnieje.
     */
    const sentence = this.buildSlotSentence?.(
      card,
      slotIndex
    );

    return (
      sentence ||
      card.item ||
      '[ clue ]'
    );
  }

  showFeedback(text, color = '#ffd966') {
    if (!this.feedbackText || this.isDestroyed) {
      return;
    }

    this.feedbackText
      .setText(text)
      .setColor(color)
      .setAlpha(1);
  }

  showGreenNarrative(slotIndex, text, delay = 0) {
    if (!text || this.isDestroyed) {
      return;
    }

    this.scene.time.delayedCall(delay, () => {
      if (this.isDestroyed) {
        return;
      }

      const view = this.slotViews[slotIndex];

      if (!view) {
        return;
      }

      view.answerText.setText(text);
      view.answerText.setColor('#b9efb9');
    });
  }

  flashSlot(slotIndex) {
    const view = this.slotViews[slotIndex];

    if (!view?.box) {
      return;
    }

    this.scene.tweens.killTweensOf(view.box);

    this.scene.tweens.add({
      targets: view.box,
      alpha: {
        from: 1,
        to: 0.7
      },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        if (view.box?.active) {
          view.box.setAlpha(1);
        }
      }
    });
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    if (this.resizeHandler) {
      this.scene.scale.off(
        'resize',
        this.resizeHandler,
        this
      );
    }

    this.slotViews.forEach(view => {
      [
        view.box,
        view.label,
        view.answerText,
        view.removeButton,
        view.container
      ].forEach(item => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    });

    this.cardViews.forEach(view => {
      [
        view.box,
        view.cardTitle,
        view.selectedMark,
        view.usedMark,
        view.container
      ].forEach(item => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    });

    [
      this.overlay,
      this.panel,
      this.titleText,
      this.subtitleText,
      this.attemptsText,
      this.feedbackText,
      this.legendText,
      this.closeButton,
      this.confirmButton
    ].forEach(item => {
      item?.removeAllListeners?.();
      item?.destroy?.();
    });

    this.slotViews = [];
    this.cardViews = [];
    this.cards = [];
    this.layout = null;
    this.resizeHandler = null;
  }
}