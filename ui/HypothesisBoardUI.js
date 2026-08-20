import { SlotView } from './SlotView.js';

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
    this.slotLabels = Array.isArray(slotLabels)
      ? slotLabels
      : [];

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
    this.innerPanel = null;

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
    this.isDestroyed = false;
    this.handleResizeBound = null;
  }

  create() {
    if (this.isDestroyed) return;

    const { width, height } = this.scene.scale;

    /*
     * Ważne:
     * overlay blokuje kliknięcia w scenę pod spodem,
     * ale ma niższy depth niż cały panel.
     */
    this.overlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.88)
      .setOrigin(0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width - 36,
        height - 36,
        0x16110d,
        0.99
      )
      .setStrokeStyle(4, 0xd4af37, 0.9)
      .setDepth(3001);

    this.innerPanel = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width - 58,
        height - 58,
        0x2a1d13,
        0.35
      )
      .setStrokeStyle(1, 0x947036, 0.45)
      .setDepth(3002);

    this.titleText = this.scene.add
      .text(width / 2, 0, 'RECONSTRUCT THE HEIST', {
        fontFamily: 'Special Elite',
        fontSize: '38px',
        color: '#f7f1dc',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.subtitleText = this.scene.add
      .text(
        width / 2,
        0,
        '1. Select a clue.   2. Select the question it answers.   3. Check your theory.',
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
        fontSize: '22px',
        color: '#ffd966',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.createSlots();
    this.createCardGrid();
    this.createButtons();

    this.legendText = this.scene.add
      .text(
        width / 2,
        0,
        'Green: exact answer   •   Yellow: correct clue, wrong question   •   Red: wrong clue',
        {
          fontFamily: 'Special Elite',
          fontSize: '16px',
          color: '#cbb98e',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(3010);

    this.feedbackText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#ffd966',
        align: 'center',
        lineSpacing: 6,
        wordWrap: {
          width: 700,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(3010);

    this.bindResize();
    this.applyLayout();
    this.refresh();
  }

  createSlots() {
    const activeSlotCount =
      this.state?.activeSlotCount || 3;

    for (let index = 0; index < activeSlotCount; index++) {
      const slotView = new SlotView(this.scene, index, {
        label:
          this.slotLabels[index] ||
          `QUESTION ${index + 1}`,

        onClick: slotIndex => {
          if (this.state?.uiLocked) return;
          this.onSlotTap?.(slotIndex);
        },

        onRemove: slotIndex => {
          if (this.state?.uiLocked) return;
          this.onSlotRemove?.(slotIndex);
        }
      });

      this.slotViews.push(slotView);
    }
  }

  createCardGrid() {
    this.cards.forEach((card, index) => {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3007);

      const bg = this.scene.add
        .rectangle(0, 0, 260, 110, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x725022, 0.95);

      const border = this.scene.add
        .rectangle(0, 0, 248, 98)
        .setStrokeStyle(1, 0xb98945, 0.7);

      const title = this.scene.add
        .text(0, -16, card.item || `CLUE ${index + 1}`, {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#3d2409',
          align: 'center',
          wordWrap: {
            width: 210,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      const skill = this.scene.add
        .text(0, 34, this.buildSkillPreview(card.skills), {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#6a4009',
          backgroundColor: '#f8edcf',
          padding: {
            left: 7,
            right: 7,
            top: 3,
            bottom: 3
          }
        })
        .setOrigin(0.5);

      const selectedStamp = this.scene.add
        .text(0, -43, 'SELECTED', {
          fontFamily: 'PressStart2P',
          fontSize: '10px',
          color: '#2e1b00',
          backgroundColor: '#ffd966',
          padding: {
            left: 5,
            right: 5,
            top: 4,
            bottom: 4
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const usedStamp = this.scene.add
        .text(0, 0, 'USED', {
          fontFamily: 'PressStart2P',
          fontSize: '15px',
          color: '#f1e1b4',
          backgroundColor: '#3d3025',
          padding: {
            left: 8,
            right: 8,
            top: 7,
            bottom: 7
          }
        })
        .setOrigin(0.5)
        .setVisible(false);

      const hitArea = this.scene.add
        .zone(0, 0, 260, 110)
        .setInteractive({
          useHandCursor: true
        });

      container.add([
        bg,
        border,
        title,
        skill,
        selectedStamp,
        usedStamp,
        hitArea
      ]);

      hitArea.on('pointerover', () => {
        if (this.isCardUsed(index)) return;

        bg.setFillStyle(0xfff0c9, 1);
        bg.setStrokeStyle(3, 0xd4af37, 1);
      });

      hitArea.on('pointerout', () => {
        if (this.isCardUsed(index)) return;

        this.applyCardStyle(
          index,
          false
        );
      });

      hitArea.on('pointerdown', () => {
        if (this.state?.uiLocked) return;
        if (this.isCardUsed(index)) return;

        container.setScale(0.96);
      });

      hitArea.on('pointerup', () => {
        container.setScale(1);

        if (this.state?.uiLocked) return;
        if (this.isCardUsed(index)) return;

        this.onCardTap?.(index);
      });

      this.cardViews.push({
        index,
        card,
        container,
        bg,
        border,
        title,
        skill,
        selectedStamp,
        usedStamp,
        hitArea
      });
    });
  }

  createButtons() {
    this.closeButton = this.createButton(
      '[ CLOSE ]',
      '#d8d0c0'
    );

    this.confirmButton = this.createButton(
      '[ CHECK THEORY ]',
      '#ffd966'
    );

    this.closeButton.on('pointerup', () => {
      this.onClose?.();
    });

    this.confirmButton.on('pointerup', () => {
      if (this.state?.uiLocked) return;

      if (!this.state?.isTimelineComplete()) {
        this.showFeedback(
          `Answer all ${this.state?.activeSlotCount || 3} questions first.`,
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
        fontSize: '24px',
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
      .setInteractive({
        useHandCursor: true
      });

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
      width < 900 ||
      height < 760;

    const activeSlotCount =
      this.state?.activeSlotCount || 3;

    const panelMargin = compact ? 16 : 34;

    const panelWidth =
      width - panelMargin * 2;

    const panelHeight =
      height - panelMargin * 2;

    const panelTop =
      height / 2 - panelHeight / 2;

    const panelBottom =
      height / 2 + panelHeight / 2;

    const titleY =
      panelTop + (compact ? 30 : 44);

    const subtitleY =
      titleY + (compact ? 38 : 48);

    const attemptsY =
      subtitleY + (compact ? 48 : 58);

    /*
     * Trzy sloty w poziomie tylko na desktopie.
     * Na telefonie oraz małym ekranie układają się pionowo.
     */
    const verticalSlots = width < 860;

    const slotWidth = verticalSlots
      ? Math.min(panelWidth - 52, 620)
      : Math.min(
        360,
        (panelWidth - 100) / activeSlotCount
      );

    const slotHeight =
      compact ? 98 : 126;

    const slotGap =
      verticalSlots
        ? (compact ? 18 : 24)
        : 24;

    const slotStartY =
      attemptsY + (compact ? 76 : 96);

    const slotPositions = [];

    if (verticalSlots) {
      for (let index = 0; index < activeSlotCount; index++) {
        const y =
          slotStartY +
          index * (slotHeight + slotGap);

        slotPositions.push({
          x: width / 2,
          y,
          labelY: y - slotHeight / 2 - 20
        });
      }
    } else {
      const totalWidth =
        activeSlotCount * slotWidth +
        (activeSlotCount - 1) * slotGap;

      const startX =
        width / 2 -
        totalWidth / 2 +
        slotWidth / 2;

      for (let index = 0; index < activeSlotCount; index++) {
        slotPositions.push({
          x:
            startX +
            index * (slotWidth + slotGap),
          y: slotStartY,
          labelY:
            slotStartY -
            slotHeight / 2 -
            24
        });
      }
    }

    const lastSlot =
      slotPositions[slotPositions.length - 1];

    const cardGridTop =
      verticalSlots
        ? lastSlot.y + slotHeight / 2 + 72
        : slotStartY + slotHeight / 2 + 82;

    /*
     * Zawsze 3 kolumny na dużym ekranie.
     * 2 na średnim, 1 na bardzo wąskim.
     */
    let columns = 3;

    if (width < 470) {
      columns = 1;
    } else if (width < 700) {
      columns = 2;
    }

    const cardGapX =
      compact ? 12 : 18;

    const cardGapY =
      compact ? 12 : 16;

    const cardWidth = Math.min(
      compact ? 220 : 260,
      (
        panelWidth -
        36 -
        (columns - 1) * cardGapX
      ) / columns
    );

    const cardHeight =
      compact ? 84 : 110;

    const totalGridWidth =
      columns * cardWidth +
      (columns - 1) * cardGapX;

    const cardStartX =
      width / 2 -
      totalGridWidth / 2 +
      cardWidth / 2;

    const cardPositions = this.cards.map((_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      return {
        x:
          cardStartX +
          column * (cardWidth + cardGapX),

        y:
          cardGridTop +
          row * (cardHeight + cardGapY)
      };
    });

    const rowCount = Math.max(
      1,
      Math.ceil(this.cards.length / columns)
    );

    const cardsBottom =
      cardGridTop +
      (rowCount - 1) *
      (cardHeight + cardGapY) +
      cardHeight / 2;

    const buttonsY = Math.min(
      panelBottom - (compact ? 36 : 48),
      cardsBottom + (compact ? 56 : 72)
    );

    const feedbackY =
      buttonsY - (compact ? 58 : 70);

    const legendY =
      feedbackY - (compact ? 42 : 50);

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

      buttonsY,
      feedbackY,
      legendY,

      wrapSlot: Math.max(
        150,
        slotWidth - 44
      ),

      wrapFeedback: Math.max(
        250,
        panelWidth - 80
      ),

      closeX: width / 2 - (compact ? 108 : 150),
      confirmX: width / 2 + (compact ? 108 : 150)
    };
  }

  applyLayout() {
    if (this.isDestroyed || !this.overlay) return;

    this.layout = this.getLayout();

    const L = this.layout;

    this.overlay
      .setSize(L.width, L.height)
      .setPosition(0, 0);

    this.panel
      .setPosition(
        L.width / 2,
        L.height / 2
      )
      .setSize(
        L.panelWidth,
        L.panelHeight
      );

    this.innerPanel
      .setPosition(
        L.width / 2,
        L.height / 2
      )
      .setSize(
        L.panelWidth - 18,
        L.panelHeight - 18
      );

    this.titleText
      .setPosition(L.width / 2, L.titleY)
      .setFontSize(
        L.compact ? '26px' : '38px'
      );

    this.subtitleText
      .setPosition(
        L.width / 2,
        L.subtitleY
      )
      .setFontSize(
        L.compact ? '14px' : '19px'
      )
      .setWordWrapWidth(
        L.wrapFeedback,
        true
      );

    this.attemptsText
      .setPosition(
        L.width / 2,
        L.attemptsY
      )
      .setFontSize(
        L.compact ? '17px' : '22px'
      );

    this.slotViews.forEach(
      (slotView, index) => {
        slotView.updateLayout(
          L.slotPositions[index],
          {
            ...L,
            isMobile: L.compact
          }
        );
      }
    );

    this.cardViews.forEach((view, index) => {
      const position =
        L.cardPositions[index];

      if (!position) return;

      view.container.setPosition(
        position.x,
        position.y
      );

      view.bg.setSize(
        L.cardWidth,
        L.cardHeight
      );

      view.border.setSize(
        Math.max(30, L.cardWidth - 12),
        Math.max(30, L.cardHeight - 12)
      );

      view.hitArea.setSize(
        L.cardWidth,
        L.cardHeight
      );

      const compactCard =
        L.compact ||
        L.cardWidth < 190;

      view.title
        .setFontSize(
          compactCard ? '14px' : '18px'
        )
        .setWordWrapWidth(
          Math.max(
            90,
            L.cardWidth - 20
          ),
          true
        )
        .setPosition(
          0,
          compactCard ? -10 : -16
        );

      view.skill
        .setFontSize(
          compactCard ? '10px' : '12px'
        )
        .setPosition(
          0,
          compactCard
            ? L.cardHeight / 2 - 16
            : 34
        );
    });

    this.legendText
      .setPosition(
        L.width / 2,
        L.legendY
      )
      .setFontSize(
        L.compact ? '12px' : '16px'
      )
      .setWordWrapWidth(
        L.wrapFeedback,
        true
      );

    this.feedbackText
      .setPosition(
        L.width / 2,
        L.feedbackY
      )
      .setFontSize(
        L.compact ? '15px' : '20px'
      )
      .setWordWrapWidth(
        L.wrapFeedback,
        true
      );

    this.closeButton
      .setPosition(
        L.closeX,
        L.buttonsY
      )
      .setFontSize(
        L.compact ? '17px' : '24px'
      );

    this.confirmButton
      .setPosition(
        L.confirmX,
        L.buttonsY
      )
      .setFontSize(
        L.compact ? '17px' : '24px'
      );
  }

  refresh() {
    if (this.isDestroyed) return;

    this.refreshSlots();
    this.refreshCards();
    this.refreshAttempts();
    this.refreshConfirmButton();
  }

  refreshSlots() {
    this.slotViews.forEach((slotView, index) => {
      const card =
        this.state?.getPlacedCard(index);

      const isSelected =
        this.state?.selectedSlotIndex === index &&
        this.state?.isSlotEmpty(index);

      const isLocked =
        this.state?.isSlotLocked(index);

      const status = isLocked
        ? 'locked'
        : (
          this.state?.slotFeedback?.[index] ||
          'neutral'
        );

      const sentence = card && !isLocked
        ? this.getSlotSentence(card, index)
        : null;

      slotView.refresh(
        card,
        status,
        isSelected,
        sentence
      );
    });
  }

  refreshCards() {
    this.cardViews.forEach(view => {
      const used = this.isCardUsed(view.index);

      const selected =
        this.state?.selectedCardIndex ===
        view.index;

      view.usedStamp.setVisible(used);
      view.selectedStamp.setVisible(
        selected && !used
      );

      view.hitArea.setVisible(!used);

      if (used) {
        view.hitArea.disableInteractive();

        view.container.setAlpha(0.44);
        view.bg.setFillStyle(0xa79776, 1);
        view.bg.setStrokeStyle(
          2,
          0x685a47,
          0.8
        );

        return;
      }

      view.container.setAlpha(1);

      view.hitArea.setInteractive({
        useHandCursor: true
      });

      this.applyCardStyle(
        view.index,
        selected
      );
    });
  }

  applyCardStyle(index, selected = false) {
    const view = this.cardViews[index];

    if (!view) return;

    if (selected) {
      view.bg.setFillStyle(0xffedb1, 1);
      view.bg.setStrokeStyle(
        4,
        0xd4af37,
        1
      );

      view.border.setStrokeStyle(
        2,
        0xfff0a6,
        1
      );

      return;
    }

    view.bg.setFillStyle(0xf1e2bf, 1);
    view.bg.setStrokeStyle(
      3,
      0x725022,
      0.95
    );

    view.border.setStrokeStyle(
      1,
      0xb98945,
      0.7
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

  refreshAttempts() {
    const attempts =
      this.state?.attemptsLeft ?? 0;

    this.attemptsText.setText(
      `ATTEMPTS LEFT: ${attempts}`
    );
  }

  refreshConfirmButton() {
    const complete =
      this.state?.isTimelineComplete() &&
      !this.state?.uiLocked;

    this.confirmButton.setColor(
      complete ? '#ffd966' : '#747474'
    );

    this.confirmButton.setBackgroundColor(
      complete ? '#513c12' : '#2d2822'
    );

    this.confirmButton.setAlpha(
      complete ? 1 : 0.72
    );
  }

  getSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    if (this.buildSlotSentence) {
      return this.buildSlotSentence(
        card,
        slotIndex
      );
    }

    return card.item || '[ clue ]';
  }

  buildSkillPreview(skills = []) {
    if (
      !Array.isArray(skills) ||
      skills.length === 0
    ) {
      return 'UNKNOWN METHOD';
    }

    return String(skills[0])
      .replaceAll('_', ' ')
      .toUpperCase();
  }

  showFeedback(
    text,
    color = '#ffd966'
  ) {
    if (!this.feedbackText || this.isDestroyed) {
      return;
    }

    this.feedbackText
      .setText(text)
      .setColor(color)
      .setAlpha(1);

    this.scene.tweens.killTweensOf(
      this.feedbackText
    );

    this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 0.92,
      duration: 120,
      ease: 'Linear'
    });
  }

  showGreenNarrative(
    slotIndex,
    text,
    delay = 0
  ) {
    if (!text || this.isDestroyed) return;

    this.scene.time.delayedCall(
      delay,
      () => {
        if (this.isDestroyed) return;

        this.slotViews[slotIndex]
          ?.showNarrative(text);
      }
    );
  }

  flashSlot(slotIndex) {
    this.slotViews[slotIndex]?.flash();
  }

  bindResize() {
    this.handleResizeBound = () => {
      if (this.isDestroyed) return;

      this.applyLayout();
      this.refresh();
    };

    this.scene.scale.on(
      'resize',
      this.handleResizeBound,
      this
    );
  }

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    if (this.handleResizeBound) {
      this.scene.scale.off(
        'resize',
        this.handleResizeBound,
        this
      );
    }

    this.slotViews.forEach(slotView => {
      slotView?.destroy?.();
    });

    this.cardViews.forEach(view => {
      [
        view.hitArea,
        view.bg,
        view.border,
        view.title,
        view.skill,
        view.selectedStamp,
        view.usedStamp,
        view.container
      ].forEach(item => {
        item?.removeAllListeners?.();
        item?.destroy?.();
      });
    });

    [
      this.overlay,
      this.panel,
      this.innerPanel,
      this.titleText,
      this.subtitleText,
      this.attemptsText,
      this.legendText,
      this.feedbackText,
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
    this.handleResizeBound = null;
  }
}