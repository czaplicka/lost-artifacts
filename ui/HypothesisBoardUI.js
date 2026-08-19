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
    this.slotLabels = Array.isArray(slotLabels) ? slotLabels : [];

    this.buildSlotSentence = typeof buildSlotSentence === 'function'
      ? buildSlotSentence
      : null;

    this.onCardTap = typeof onCardTap === 'function'
      ? onCardTap
      : null;

    this.onSlotTap = typeof onSlotTap === 'function'
      ? onSlotTap
      : null;

    this.onSlotRemove = typeof onSlotRemove === 'function'
      ? onSlotRemove
      : null;

    this.onConfirm = typeof onConfirm === 'function'
      ? onConfirm
      : null;

    this.onClose = typeof onClose === 'function'
      ? onClose
      : null;

    this.overlay = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.feedbackText = null;
    this.attemptsText = null;
    this.legendText = null;
    this.closeButton = null;
    this.confirmButton = null;

    this.slotViews = [];
    this.cardViews = [];

    this.layout = null;
    this.isMobileUI = false;
    this.handleResizeBound = null;
    this.resizeBound = false;
    this.isDestroyed = false;
  }

  create() {
    if (this.isDestroyed) return;

    const { width, height } = this.scene.scale;

    this.isMobileUI =
      !!this.scene.sys.game.device.input.touch ||
      width <= 900;

    this.overlay = this.scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.82)
      .setOrigin(0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.scene.add
      .rectangle(
        width / 2,
        height / 2,
        width * 0.92,
        height * 0.88,
        0x17130f,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37, 0.85)
      .setDepth(3001);

    this.titleText = this.scene.add
      .text(width / 2, 0, 'Reconstruct the heist', {
        fontFamily: 'Special Elite',
        fontSize: '40px',
        color: '#f6f1df',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3002);

    this.subtitleText = this.scene.add
      .text(
        width / 2,
        0,
        'Tap a clue, then tap a question. Tap X to remove. You have 3 attempts.',
        {
          fontFamily: 'Special Elite',
          fontSize: '22px',
          color: '#e8d7a8',
          align: 'center',
          lineSpacing: 6
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(3002);

    this.attemptsText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#ffd966',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(3002);

    this.createSlots();
    this.createCardTray();
    this.createButtons();

    this.legendText = this.scene.add
      .text(
        width / 2,
        0,
        'Green = correct answer, yellow = correct clue for another question, red = does not fit',
        {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#ccb98c',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(3002);

    this.feedbackText = this.scene.add
      .text(width / 2, 0, '', {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#ffd966',
        align: 'center',
        wordWrap: {
          width: 600,
          useAdvancedWrap: true
        }
      })
      .setOrigin(0.5)
      .setDepth(3002);

    this.bindResize();
    this.applyResponsiveLayout();
    this.refresh();
  }

  createSlots() {
    const activeSlotCount = this.state?.activeSlotCount || 3;

    for (let index = 0; index < activeSlotCount; index++) {
      const slotView = new SlotView(this.scene, index, {
        label: this.slotLabels[index] || `QUESTION ${index + 1}`,
        onClick: slotIndex => {
          if (this.state?.uiLocked) return;

          if (this.onSlotTap) {
            this.onSlotTap(slotIndex);
          }
        },
        onRemove: slotIndex => {
          if (this.state?.uiLocked) return;

          if (this.onSlotRemove) {
            this.onSlotRemove(slotIndex);
          }
        }
      });

      this.slotViews.push(slotView);
    }
  }

  createCardTray() {
    this.cards.forEach((card, index) => {
      const container = this.scene.add
        .container(0, 0)
        .setDepth(3004);

      const bg = this.scene.add
        .rectangle(0, 0, 260, 130, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x7a5c2e, 0.85)
        .setInteractive(
          new Phaser.Geom.Rectangle(-130, -65, 260, 130),
          Phaser.Geom.Rectangle.Contains
        );

      const title = this.scene.add
        .text(0, -18, card.item || `Clue ${index + 1}`, {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#3c2200',
          align: 'center',
          wordWrap: {
            width: 170,
            useAdvancedWrap: true
          }
        })
        .setOrigin(0.5);

      const tag = this.scene.add
        .text(0, 34, this.buildSkillPreview(card.skills), {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#6b3f00',
          backgroundColor: '#f7ecd3',
          padding: {
            left: 8,
            right: 8,
            top: 4,
            bottom: 4
          }
        })
        .setOrigin(0.5);

      container.add([bg, title, tag]);

      bg.on('pointerdown', () => {
        if (this.state?.uiLocked) return;

        this.scene.tweens.killTweensOf(container);
        container.setScale(0.96);
      });

      bg.on('pointerup', () => {
        container.setScale(1);

        if (this.state?.uiLocked) return;

        if (this.onCardTap) {
          this.onCardTap(index);
        }
      });

      bg.on('pointerout', () => {
        container.setScale(1);
      });

      this.cardViews.push({
        cardIndex: index,
        container,
        bg,
        title,
        tag,
        homeX: 0,
        homeY: 0,
        currentSlot: null
      });
    });
  }

  createButtons() {
    this.closeButton = this.scene.add
      .text(0, 0, '[ CLOSE ]', {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#d0d0d0',
        backgroundColor: '#222222',
        padding: {
          left: 18,
          right: 18,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(3003)
      .setInteractive({ useHandCursor: true });

    this.confirmButton = this.scene.add
      .text(0, 0, '[ CHECK ]', {
        fontFamily: 'Special Elite',
        fontSize: '28px',
        color: '#ffd966',
        backgroundColor: '#222222',
        padding: {
          left: 18,
          right: 18,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0.5)
      .setDepth(3003)
      .setInteractive({ useHandCursor: true });

    this.closeButton.on('pointerup', () => {
      if (this.onClose) {
        this.onClose();
      }
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

      if (this.onConfirm) {
        this.onConfirm();
      }
    });
  }

  getLayout() {
    const { width, height } = this.scene.scale;

    const isMobile =
      this.isMobileUI ||
      width <= 900;

    const activeSlotCount = this.state?.activeSlotCount || 3;

    const panelWidth = isMobile
      ? Math.min(width - 40, 900)
      : Math.min(width - 200, 1600);

    const panelHeight = isMobile
      ? Math.min(height - 60, 900)
      : Math.min(height - 300, 720);

    const panelX = width / 2;
    const panelY = height / 2;
    const panelTop = panelY - panelHeight / 2;
    const panelBottom = panelY + panelHeight / 2;

    const titleY = panelTop + (isMobile ? 40 : 60);
    const subtitleY = titleY + (isMobile ? 50 : 60);
    const attemptsY = subtitleY + (isMobile ? 70 : 60);

    const slotWidth = isMobile
      ? Math.min(panelWidth - 64, 320)
      : 420;

    const slotHeight = isMobile
      ? 130
      : 170;

    const slotGap = isMobile
      ? 40
      : 60;

    const totalSlotWidth =
      activeSlotCount * slotWidth +
      (activeSlotCount - 1) * slotGap;

    const slotStartX =
      width / 2 -
      totalSlotWidth / 2 +
      slotWidth / 2;

    const slotsBaseY =
      attemptsY +
      (isMobile ? 130 : 150);

    const slotPositions = [];

    for (let index = 0; index < activeSlotCount; index++) {
      slotPositions.push({
        x: slotStartX + index * (slotWidth + slotGap),
        y: slotsBaseY,
        labelY: slotsBaseY - (isMobile ? 70 : 95)
      });
    }

    const gridTopY =
      slotsBaseY +
      (isMobile ? 160 : 190);

    const cardWidth = isMobile
      ? Math.min((panelWidth - 80) / 3, 220)
      : 260;

    const cardHeight = isMobile
      ? 90
      : 130;

    const cols = 3;
    const gridGapX = isMobile ? 12 : 18;
    const gridGapY = isMobile ? 14 : 18;

    const totalGridWidth =
      cols * cardWidth +
      (cols - 1) * gridGapX;

    const gridStartX =
      width / 2 -
      totalGridWidth / 2 +
      cardWidth / 2;

    const trayPositions = this.cards.map((_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      return {
        x: gridStartX + col * (cardWidth + gridGapX),
        y: gridTopY + row * (cardHeight + gridGapY)
      };
    });

    const buttonsY =
      panelBottom -
      (isMobile ? 70 : 80);

    const buttonGap = isMobile ? 160 : 220;

    return {
      width,
      height,
      isMobile,

      panelWidth,
      panelHeight,
      panelX,
      panelY,

      titleY,
      subtitleY,
      attemptsY,

      slotWidth,
      slotHeight,
      slotPositions,

      cardWidth,
      cardHeight,
      trayPositions,

      buttonsY,
      legendY: buttonsY - 50,
      feedbackY: buttonsY + 40,

      wrapTitle: Math.max(540, panelWidth - 200),
      wrapSubtitle: Math.max(540, panelWidth - 260),
      wrapFeedback: Math.max(540, panelWidth - 260),
      wrapSlot: Math.max(260, slotWidth - 48),
      wrapCardTitle: isMobile
        ? Math.max(120, cardWidth - 86)
        : Math.max(170, cardWidth - 100),

      buttonCloseX: width / 2 - buttonGap / 2,
      buttonConfirmX: width / 2 + buttonGap / 2
    };
  }

  applyResponsiveLayout() {
    if (!this.overlay || this.isDestroyed) return;

    this.layout = this.getLayout();

    const L = this.layout;

    this.overlay
      .setSize(L.width, L.height)
      .setPosition(0, 0);

    this.panel
      .setPosition(L.panelX, L.panelY)
      .setSize(L.panelWidth, L.panelHeight);

    this.titleText
      .setPosition(L.width / 2, L.titleY)
      .setFontSize(L.isMobile ? '30px' : '40px')
      .setWordWrapWidth(L.wrapTitle, true);

    this.subtitleText
      .setPosition(L.width / 2, L.subtitleY)
      .setFontSize(L.isMobile ? '18px' : '22px')
      .setWordWrapWidth(L.wrapSubtitle, true);

    this.attemptsText
      .setPosition(L.width / 2, L.attemptsY)
      .setFontSize(L.isMobile ? '20px' : '24px');

    this.legendText
      .setPosition(L.width / 2, L.legendY)
      .setFontSize(L.isMobile ? '15px' : '18px')
      .setWordWrapWidth(L.wrapFeedback, true);

    this.feedbackText
      .setPosition(L.width / 2, L.feedbackY)
      .setFontSize(L.isMobile ? '18px' : '22px')
      .setWordWrapWidth(L.wrapFeedback, true);

    this.slotViews.forEach((slotView, index) => {
      slotView.updateLayout(
        L.slotPositions[index],
        L
      );
    });

    this.cardViews.forEach((view, index) => {
      const position = L.trayPositions[index];
      const card = this.cards[index];

      if (!position || !card) return;

      view.bg.setSize(
        L.cardWidth,
        L.cardHeight
      );

      view.bg.input.hitArea.setTo(
        -L.cardWidth / 2,
        -L.cardHeight / 2,
        L.cardWidth,
        L.cardHeight
      );

      if (L.isMobile) {
        view.title
          .setPosition(-L.cardWidth / 2 + 12, -10)
          .setOrigin(0, 0.5)
          .setAlign('left')
          .setFontSize('16px')
          .setWordWrapWidth(
            L.wrapCardTitle,
            true
          );

        view.tag
          .setPosition(-L.cardWidth / 2 + 12, 26)
          .setOrigin(0, 0.5)
          .setFontSize('11px');
      } else {
        view.title
          .setPosition(0, -18)
          .setOrigin(0.5)
          .setAlign('center')
          .setFontSize('18px')
          .setWordWrapWidth(
            L.wrapCardTitle,
            true
          );

        view.tag
          .setPosition(0, 34)
          .setOrigin(0.5)
          .setFontSize('13px');
      }

      view.tag.setText(
        this.buildSkillPreview(card.skills)
      );

      const slotIndex = this.state?.getCardSlot(index);

      if (
        slotIndex !== undefined &&
        slotIndex !== null &&
        slotIndex !== -1
      ) {
        view.currentSlot = slotIndex;

        const slotView = this.slotViews[slotIndex];

        if (slotView) {
          this.setCardPosition(
            view,
            slotView.box.x,
            slotView.box.y
          );
        }
      } else {
        view.currentSlot = null;
        view.homeX = position.x;
        view.homeY = position.y;

        this.setCardPosition(
          view,
          position.x,
          position.y
        );
      }
    });

    this.closeButton
      .setPosition(
        L.buttonCloseX,
        L.buttonsY
      )
      .setFontSize(
        L.isMobile ? '22px' : '28px'
      );

    this.confirmButton
      .setPosition(
        L.buttonConfirmX,
        L.buttonsY
      )
      .setFontSize(
        L.isMobile ? '22px' : '28px'
      );
  }

  syncCardPositions({
    animate = false,
    duration = 220
  } = {}) {
    if (this.isDestroyed) return;

    this.cardViews.forEach(view => {
      const slotIndex = this.state?.getCardSlot(
        view.cardIndex
      );

      const target = slotIndex !== -1 &&
        slotIndex !== null &&
        slotIndex !== undefined
        ? this.getSlotPosition(slotIndex)
        : {
          x: view.homeX,
          y: view.homeY
        };

      view.currentSlot = slotIndex !== -1
        ? slotIndex
        : null;

      if (!target) return;

      if (animate) {
        this.scene.tweens.killTweensOf(
          view.container
        );

        this.scene.tweens.add({
          targets: view.container,
          x: target.x,
          y: target.y,
          duration,
          ease: 'Quad.easeOut'
        });
      } else {
        this.setCardPosition(
          view,
          target.x,
          target.y
        );
      }
    });
  }

  getSlotPosition(slotIndex) {
    const slotView = this.slotViews[slotIndex];

    if (!slotView?.box) return null;

    return {
      x: slotView.box.x,
      y: slotView.box.y
    };
  }

  setCardPosition(view, x, y) {
    if (!view) return;

    view.container.setPosition(x, y);
    view.bg.setPosition(0, 0);

    const L = this.layout;

    if (!L) return;

    const titleX = view.title.originX === 0
      ? -L.cardWidth / 2 + 12
      : 0;

    const titleY = L.isMobile ? -10 : -18;
    const tagX = L.isMobile
      ? -L.cardWidth / 2 + 12
      : 0;

    const tagY = L.isMobile ? 26 : 34;

    view.title.setPosition(titleX, titleY);
    view.tag.setPosition(tagX, tagY);
  }

  refresh({
    animateCards = false
  } = {}) {
    if (this.isDestroyed) return;

    this.refreshSlots();
    this.refreshCards();
    this.refreshConfirmButton();
    this.updateAttempts();
    this.syncCardPositions({
      animate: animateCards
    });
  }

  refreshSlots() {
    this.slotViews.forEach((slotView, slotIndex) => {
      const card = this.state?.getPlacedCard(
        slotIndex
      );

      const isSelected =
        this.state?.selectedSlotIndex === slotIndex &&
        this.state?.isSlotEmpty(slotIndex);

      const isLocked = this.state?.isSlotLocked(
        slotIndex
      );

      const status = isLocked
        ? 'locked'
        : this.state?.slotFeedback?.[slotIndex] ||
          'neutral';

      const sentence = card && !isLocked
        ? this.getSlotSentence(card, slotIndex)
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
      const currentSlot = this.state?.getCardSlot(
        view.cardIndex
      );

      const isPlaced =
        currentSlot !== -1 &&
        currentSlot !== null &&
        currentSlot !== undefined;

      const isLocked = isPlaced &&
        this.state?.isSlotLocked(currentSlot);

      if (isPlaced) {
        view.bg.setAlpha(isLocked ? 0.25 : 0.35);
        view.title.setAlpha(isLocked ? 0.25 : 0.35);
        view.tag.setAlpha(isLocked ? 0.25 : 0.35);

        view.bg.setStrokeStyle(
          2,
          0x9a9a9a,
          0.3
        );
      } else {
        view.bg.setAlpha(1);
        view.title.setAlpha(1);
        view.tag.setAlpha(1);

        view.bg.setStrokeStyle(
          3,
          0x7a5c2e,
          0.85
        );
      }
    });
  }

  refreshConfirmButton() {
    if (!this.confirmButton) return;

    const complete =
      this.state?.isTimelineComplete() &&
      !this.state?.uiLocked;

    this.confirmButton.setColor(
      complete ? '#ffd966' : '#666666'
    );
  }

  updateAttempts() {
    if (!this.attemptsText) return;

    const attempts =
      this.state?.attemptsLeft ?? 0;

    this.attemptsText.setText(
      `Attempts left: ${attempts}`
    );
  }

  getSlotSentence(card, slotIndex) {
    if (!card) return null;

    if (this.buildSlotSentence) {
      return this.buildSlotSentence(
        card,
        slotIndex
      );
    }

    return card.item || '[ clue ]';
  }

  buildSkillPreview(skills = []) {
    if (!Array.isArray(skills) || skills.length === 0) {
      return 'No skill';
    }

    return String(skills[0]);
  }

  showFeedback(
    text,
    color = '#ffd966'
  ) {
    if (!this.feedbackText || this.isDestroyed) return;

    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);

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

    this.scene.time.delayedCall(delay, () => {
      if (this.isDestroyed) return;

      this.slotViews[slotIndex]?.showNarrative(
        text
      );
    });
  }

  flashSlot(slotIndex) {
    this.slotViews[slotIndex]?.flash();
  }

  bindResize() {
    if (this.resizeBound) return;

    this.resizeBound = true;

    this.handleResizeBound = () => {
      if (this.isDestroyed) return;

      this.isMobileUI =
        !!this.scene.sys.game.device.input.touch ||
        this.scene.scale.width <= 900;

      this.applyResponsiveLayout();
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
        view.bg,
        view.title,
        view.tag,
        view.container
      ].forEach(item => {
        if (item?.removeAllListeners) {
          item.removeAllListeners();
        }

        if (item?.destroy) {
          item.destroy();
        }
      });
    });

    [
      this.overlay,
      this.panel,
      this.titleText,
      this.subtitleText,
      this.feedbackText,
      this.attemptsText,
      this.legendText,
      this.closeButton,
      this.confirmButton
    ].forEach(item => {
      if (item?.removeAllListeners) {
        item.removeAllListeners();
      }

      if (item?.destroy) {
        item.destroy();
      }
    });

    this.slotViews = [];
    this.cardViews = [];
    this.cards = [];
    this.layout = null;
    this.handleResizeBound = null;
    this.resizeBound = false;
  }
}