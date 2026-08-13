import { gameState, saveGameState } from '../GameData.js';
import { getScoreManager } from '../gameSetup.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../EnergyManager.js';
import { HypothesisEvaluator } from '../HypothesisEvaluator.js';
import { SlotView } from '../SlotView.js';
import {
  applyHypothesisSkills,
  getSuspectCaseSummary
} from '../suspectUtils.js';

export class HypothesisScene extends BaseScene {
  constructor() {
    super('HypothesisScene');

    this.sourceScene = 'CityScene';
    this.cityId = null;
    this.sceneId = null;

    this.overlay = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.feedbackText = null;
    this.attemptsText = null;
    this.legendText = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];

    this.placedCards = [null, null, null];
    this.slotFeedback = ['neutral', 'neutral', 'neutral'];
    this.attemptsLeft = 3;
    this.lockedSlots = new Set();

    this.correctCards = [];
    this.distractorCards = [];

    this._resizeBound = false;
    this.layout = null;

    this.isMobileUI = false;
    this.selectedSlotIndex = null;
    this.uiLocked = false;

    this.handleResizeBound = null;
    this.scoreManager = null;
    this.activeSlotCount = 3;
    this.slotLabels = [...HypothesisEvaluator.SLOT_LABELS];
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.cityId = data.cityId || gameState.currentCityId || gameState.crimeCityId || gameState.reconstructedHeist?.cityId || null;
    this.sceneId = data.sceneId || gameState.reconstructedHeist?.sceneId || null;
    this.activeSlotCount = Number.isInteger(data.activeSlotCount) ? Phaser.Math.Clamp(data.activeSlotCount, 1, 3) : 3;
    this.slotLabels = Array.isArray(data.slotLabels) && data.slotLabels.length >= this.activeSlotCount
      ? data.slotLabels.slice(0, this.activeSlotCount)
      : [...HypothesisEvaluator.SLOT_LABELS].slice(0, this.activeSlotCount);

    this.overlay = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.feedbackText = null;
    this.attemptsText = null;
    this.legendText = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];

    this.placedCards = new Array(this.activeSlotCount).fill(null);
    this.slotFeedback = new Array(this.activeSlotCount).fill('neutral');
    this.attemptsLeft = 3;
    this.lockedSlots = new Set();

    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {};
    }
    gameState.reconstructedHeist.playerAttemptsLeft = 3;

    this.correctCards = [];
    this.distractorCards = [];
    this.layout = null;

    this.isMobileUI = false;
    this.selectedSlotIndex = null;
    this.uiLocked = false;

    this.handleResizeBound = null;
    this.scoreManager = getScoreManager();
  }

  create() {
    super.create();
    this.prepareCards();
    this.energyManager = getEnergyManager();

    this.isMobileUI = !!this.sys.game.device.input.touch || this.scale.width <= 900;

    const { width, height } = this.scale;

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.82)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.add.rectangle(width / 2, height / 2, width * 0.92, height * 0.88, 0x17130f, 0.98)
      .setStrokeStyle(4, 0xd4af37, 0.85)
      .setDepth(3001);

    this.titleText = this.add.text(width / 2, 0, 'Reconstruct the heist', {
      fontFamily: 'Special Elite',
      fontSize: '40px',
      color: '#f6f1df',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.subtitleText = this.add.text(width / 2, 0,
      'Tap a card, then tap a panel. Tap X to remove. You have 3 attempts.', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#e8d7a8',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5, 0).setDepth(3002);

    this.attemptsText = this.add.text(width / 2, 0, `Attempts left: ${this.attemptsLeft}`, {
      fontFamily: 'Special Elite',
      fontSize: '24px',
      color: '#ffd966',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.createSlots();
    this.createCardTray();
    this.createButtons();

    this.legendText = this.add.text(width / 2, 0,
      'Green = locked in, yellow = right card wrong step, red = not part of the heist', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#ccb98c',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.feedbackText = this.add.text(width / 2, 0, '', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#ffd966',
      align: 'center',
      wordWrap: { width: 600, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(3002);

    this.bindResize();
    this.applyResponsiveLayout();
    this.refreshUI();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  prepareCards() {
    const { correctCards, distractorCards, availableCards } = HypothesisEvaluator.prepareCards(
      gameState.reconstructedHeist,
      this.sceneId,
      this.cityId
    );

    this.correctCards = correctCards;
    this.distractorCards = distractorCards;
    this.availableCards = availableCards;
  }

  getLayout() {
    const { width, height } = this.scale;
    const isMobile = this.isMobileUI || width <= 900;

    const panelWidth = isMobile ? Math.min(width - 40, 900) : Math.min(width - 200, 1600);
    const panelHeight = isMobile ? Math.min(height - 60, 900) : Math.min(height - 300, 720);

    const panelX = width / 2;
    const panelY = height / 2;
    const panelTop = panelY - panelHeight / 2;
    const panelBottom = panelY + panelHeight / 2;

    const titleY = panelTop + (isMobile ? 40 : 60);
    const subtitleY = titleY + (isMobile ? 50 : 60);
    const attemptsY = subtitleY + (isMobile ? 70 : 60);

    const slotWidth = isMobile ? Math.min(panelWidth - 64, 320) : 420;
    const slotHeight = isMobile ? 110 : 150;

    const slotGap = isMobile ? 40 : 60;
    const totalSlotWidth = this.activeSlotCount * slotWidth + (this.activeSlotCount - 1) * slotGap;
    const slotStartX = width / 2 - totalSlotWidth / 2 + slotWidth / 2;
    const slotsBaseY = attemptsY + (isMobile ? 120 : 140);

    const slotPositions = [];
    for (let i = 0; i < this.activeSlotCount; i++) {
      slotPositions.push({
        x: slotStartX + i * (slotWidth + slotGap),
        y: slotsBaseY,
        labelY: slotsBaseY - (isMobile ? 60 : 80)
      });
    }

    const gridTopY = slotsBaseY + (isMobile ? 150 : 180);
    const cardWidth = isMobile ? Math.min((panelWidth - 80) / 3, 220) : 260;
    const cardHeight = isMobile ? 90 : 130;

    const cols = 3;
    const gridGapX = isMobile ? 12 : 18;
    const gridGapY = isMobile ? 14 : 18;
    const totalGridWidth = cols * cardWidth + (cols - 1) * gridGapX;
    const gridStartX = width / 2 - totalGridWidth / 2 + cardWidth / 2;

    const trayPositions = this.availableCards.map((_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        x: gridStartX + col * (cardWidth + gridGapX),
        y: gridTopY + row * (cardHeight + gridGapY)
      };
    });

    const buttonsY = panelBottom - (isMobile ? 70 : 80);
    const buttonGap = isMobile ? 160 : 220;
    const legendY = buttonsY - 50;
    const feedbackY = buttonsY + 40;

    return {
      width, height, isMobile,
      panelWidth, panelHeight, panelX, panelY, panelTop, panelBottom,
      titleY, subtitleY, attemptsY, gridTopY, buttonsY, legendY, feedbackY,
      slotWidth, slotHeight, slotPositions,
      cardWidth, cardHeight, trayPositions,
      wrapTitle: Math.max(540, panelWidth - 200),
      wrapSubtitle: Math.max(540, panelWidth - 260),
      wrapFeedback: Math.max(540, panelWidth - 260),
      wrapSlot: Math.max(260, slotWidth - 48),
      wrapCardTitle: isMobile ? Math.max(120, cardWidth - 86) : Math.max(170, cardWidth - 100),
      buttonCloseX: width / 2 - buttonGap / 2,
      buttonConfirmX: width / 2 + buttonGap / 2,
      buttonCloseY: buttonsY,
      buttonConfirmY: buttonsY
    };
  }

  applyResponsiveLayout() {
    this.layout = this.getLayout();
    const L = this.layout;

    this.overlay.setSize(L.width, L.height).setPosition(0, 0);
    this.panel.setPosition(L.panelX, L.panelY).setSize(L.panelWidth, L.panelHeight);

    this.titleText.setPosition(L.width / 2, L.titleY);
    this.titleText.setFontSize(L.isMobile ? '30px' : '40px');
    this.titleText.setWordWrapWidth(L.wrapTitle, true);

    this.subtitleText.setPosition(L.width / 2, L.subtitleY);
    this.subtitleText.setFontSize(L.isMobile ? '18px' : '22px');
    this.subtitleText.setWordWrapWidth(L.wrapSubtitle, true);

    this.attemptsText.setPosition(L.width / 2, L.attemptsY);
    this.attemptsText.setFontSize(L.isMobile ? '20px' : '24px');

    this.legendText.setPosition(L.width / 2, L.legendY);
    this.legendText.setFontSize(L.isMobile ? '15px' : '18px');
    this.legendText.setWordWrapWidth(L.wrapFeedback, true);

    this.feedbackText.setPosition(L.width / 2, L.feedbackY);
    this.feedbackText.setFontSize(L.isMobile ? '18px' : '22px');
    this.feedbackText.setWordWrapWidth(L.wrapFeedback, true);

    this.slotViews.forEach((slotView, index) => {
      const pos = L.slotPositions[index];
      slotView.updateLayout(pos, L);
    });

    this.cardViews.forEach((view, index) => {
      const pos = L.trayPositions[index];
      const card = this.availableCards[index];
      if (!pos || !card) return;

      view.bg.setSize(L.cardWidth, L.cardHeight);
      view.bg.input.hitArea.setTo(
        -L.cardWidth / 2,
        -L.cardHeight / 2,
        L.cardWidth,
        L.cardHeight
      );

      if (L.isMobile) {
        view.title.setPosition(-L.cardWidth / 2 + 12, -10).setOrigin(0, 0.5);
        view.title.setAlign('left');
        view.title.setFontSize('16px');
        view.title.setWordWrapWidth(L.wrapCardTitle, true);

        view.tag.setPosition(-L.cardWidth / 2 + 12, 26).setOrigin(0, 0.5);
        view.tag.setFontSize('11px');
        view.tag.setText(this.buildSkillPreview(card.skills));
      } else {
        view.title.setPosition(0, -18).setOrigin(0.5);
        view.title.setAlign('center');
        view.title.setFontSize('18px');
        view.title.setWordWrapWidth(L.wrapCardTitle, true);

        view.tag.setPosition(0, 34).setOrigin(0.5);
        view.tag.setFontSize('13px');
        view.tag.setText(this.buildSkillPreview(card.skills));
      }

      if (view.currentSlot === null) {
        view.homeX = pos.x;
        view.homeY = pos.y;
        this.setCardPosition(view, pos.x, pos.y);
      } else {
        const slot = this.slotViews[view.currentSlot];
        if (slot) this.setCardPosition(view, slot.box.x, slot.box.y);
      }
    });

    this.closeButton.setPosition(L.buttonCloseX, L.buttonCloseY);
    this.closeButton.setFontSize(L.isMobile ? '22px' : '28px');

    this.confirmButton.setPosition(L.buttonConfirmX, L.buttonConfirmY);
    this.confirmButton.setFontSize(L.isMobile ? '22px' : '28px');
  }

  createSlots() {
    for (let i = 0; i < this.activeSlotCount; i++) {
      const slotView = new SlotView(this, i, {
        label: this.slotLabels[i] || `STEP ${i + 1}`,
        onClick: (index) => this.handleSlotClick(index),
        onRemove: (index) => this.handleSlotRemove(index)
      });

      this.slotViews.push(slotView);
      this.dropZones.push(slotView.dropZone);
    }
  }

  createCardTray() {
    this.availableCards.forEach((card, index) => {
      const container = this.add.container(0, 0).setDepth(3004);

      const bg = this.add.rectangle(0, 0, 260, 130, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x7a5c2e, 0.85)
        .setInteractive(new Phaser.Geom.Rectangle(-130, -65, 260, 130), Phaser.Geom.Rectangle.Contains);

      const title = this.add.text(0, -18, card.item, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#3c2200',
        align: 'center',
        wordWrap: { width: 170, useAdvancedWrap: true }
      }).setOrigin(0.5);

      const tag = this.add.text(0, 34, this.buildSkillPreview(card.skills), {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#6b3f00',
        backgroundColor: '#f7ecd3',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      }).setOrigin(0.5);

      container.add([bg, title, tag]);

      container.cardIndex = index;
      container.homeX = 0;
      container.homeY = 0;
      container.currentSlot = null;

      bg.on('pointerdown', () => {
        if (this.uiLocked) return;
        this.tweens.killTweensOf(container);
        container.setScale(0.96);
      });

      bg.on('pointerup', () => {
        if (this.uiLocked) return;
        container.setScale(1);
        this.handleCardTap(index);
      });

      bg.on('pointerout', () => {
        container.setScale(1);
      });

      this.cardViews.push({
        bg, title, tag, container,
        currentSlot: null,
        homeX: 0, homeY: 0
      });
    });
  }

  createButtons() {
    this.closeButton = this.add.text(0, 0, '[ CLOSE ]', {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#d0d0d0',
      backgroundColor: '#222222',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(3003).setInteractive({ useHandCursor: true });

    this.confirmButton = this.add.text(0, 0, '[ CHECK ]', {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#ffd966',
      backgroundColor: '#222222',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    }).setOrigin(0.5).setDepth(3003).setInteractive({ useHandCursor: true });

    this.closeButton.on('pointerup', () => this.closeScene());
    this.confirmButton.on('pointerup', () => {
      if (!this.isTimelineComplete()) {
        this.showFeedback(`Place ${this.activeSlotCount} cards first.`, '#ff9f80');
        return;
      }
      this.confirmTheory();
    });
  }

  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound = true;
    this.handleResizeBound = this.handleResize.bind(this);
    this.scale.on('resize', this.handleResizeBound, this);
  }

  handleResize() {
    this.isMobileUI = !!this.sys.game.device.input.touch || this.scale.width <= 900;
    this.applyResponsiveLayout();
    this.refreshUI();
  }

  buildSkillPreview(skills = []) {
    if (!Array.isArray(skills) || skills.length === 0) return 'No skill';
    return String(skills[0]);
  }

  getCardView(cardIndex) {
    return this.cardViews[cardIndex] || null;
  }

  setCardPosition(cardView, x, y) {
    if (!cardView || !this.layout) return;
    cardView.container.setPosition(x, y);
    cardView.bg.setPosition(0, 0);

    const titleX = cardView.title.originX === 0 ? -this.layout.cardWidth / 2 + 12 : 0;
    const titleY = this.layout.isMobile ? -10 : -18;
    const tagX = this.layout.isMobile ? -this.layout.cardWidth / 2 + 12 : 0;
    const tagY = this.layout.isMobile ? 26 : 34;

    cardView.title.setPosition(titleX, titleY);
    cardView.tag.setPosition(tagX, tagY);
  }

  setCardPositionByIndex(cardIndex, x, y) {
    const cardView = this.getCardView(cardIndex);
    if (!cardView) return;
    this.setCardPosition(cardView, x, y);
  }

  handleCardTap(cardIndex) {
    if (this.uiLocked) return;
    const card = this.availableCards[cardIndex];
    if (!card) return;

    const currentSlot = this.placedCards.indexOf(cardIndex);
    if (currentSlot !== -1 && this.lockedSlots.has(currentSlot)) {
      this.showFeedback('This step is confirmed. The clue fits.', '#7CFC00');
      return;
    }

    const alreadyPlaced = this.placedCards.includes(cardIndex);
    if (alreadyPlaced) {
      this.showFeedback('This card is already in the timeline. Tap its step to remove it.', '#ffb347');
      return;
    }

    let targetSlot = this.selectedSlotIndex;

    if (targetSlot === null || targetSlot === undefined) {
      targetSlot = this.placedCards.findIndex(v => v === null);
    }

    if (targetSlot === -1 || targetSlot === null || targetSlot === undefined) {
      this.showFeedback('All steps are full. Tap X on a step to remove a card.', '#ffb347');
      return;
    }

    if (this.lockedSlots.has(targetSlot)) {
      const emptySlot = this.placedCards.findIndex((v, i) => v === null && !this.lockedSlots.has(i));
      if (emptySlot !== -1) {
        targetSlot = emptySlot;
      } else {
        this.showFeedback('That step is locked. Find another empty slot.', '#ffb347');
        return;
      }
    }

    if (this.placedCards[targetSlot] !== null) {
      const emptySlot = this.placedCards.findIndex((v, i) => v === null && !this.lockedSlots.has(i));
      if (emptySlot !== -1) {
        targetSlot = emptySlot;
      } else {
        this.showFeedback('Selected step is occupied. Remove that card first.', '#ffb347');
        return;
      }
    }

    this.selectedSlotIndex = null;
    this.placeCardInSlotByIndex(cardIndex, targetSlot);
  }

  handleSlotClick(slotIndex) {
    if (this.uiLocked || this.lockedSlots.has(slotIndex)) return;
    const cardIndex = this.placedCards[slotIndex];

    if (cardIndex === null || cardIndex === undefined) {
      this.selectedSlotIndex = this.selectedSlotIndex === slotIndex ? null : slotIndex;
      this.refreshUI();
      this.showFeedback(
        this.selectedSlotIndex === null ? 'Step selection cleared.' : `${this.slotLabels[slotIndex]} selected. Now tap a clue card.`,
        this.selectedSlotIndex === null ? '#ccb98c' : '#ffd966'
      );
      return;
    }

    this.handleSlotRemove(slotIndex);
  }

  handleSlotRemove(slotIndex) {
    if (this.uiLocked || this.lockedSlots.has(slotIndex)) return;
    const cardIndex = this.placedCards[slotIndex];
    if (cardIndex === null || cardIndex === undefined) {
      this.showFeedback('Nothing to remove there.', '#ffb347');
      return;
    }

    this.returnCardHomeByIndex(cardIndex, true);

    const slotView = this.slotViews[slotIndex];
    if (slotView) slotView.flash();

    this.selectedSlotIndex = null;
    this.refreshUI();
    this.showFeedback(`Card removed from ${this.slotLabels[slotIndex]}.`, '#f0ddb0');
  }

  placeCardInSlotByIndex(cardIndex, slotIndex) {
    if (this.lockedSlots.has(slotIndex)) return;

    const draggedCard = this.getCardView(cardIndex);
    if (!draggedCard) return;

    const fromSlot = draggedCard.currentSlot;
    const targetCardIndex = this.placedCards[slotIndex];
    const targetCard = targetCardIndex !== null ? this.getCardView(targetCardIndex) : null;

    if (fromSlot === slotIndex) {
      const slot = this.slotViews[slotIndex];
      if (slot) this.setCardPosition(draggedCard, slot.box.x, slot.box.y);
      return;
    }

    if (targetCard && fromSlot !== null && !this.lockedSlots.has(fromSlot)) {
      this.placedCards[fromSlot] = targetCardIndex;
      targetCard.currentSlot = fromSlot;
      targetCard.container.currentSlot = fromSlot;
      const oldSlot = this.slotViews[fromSlot];
      if (oldSlot) this.setCardPosition(targetCard, oldSlot.box.x, oldSlot.box.y);
    } else if (targetCard && fromSlot === null) {
      targetCard.currentSlot = null;
      targetCard.container.currentSlot = null;
      this.setCardPosition(targetCard, targetCard.homeX, targetCard.homeY);
    }

    if (fromSlot !== null && !this.lockedSlots.has(fromSlot) && this.placedCards[fromSlot] === cardIndex) {
      this.placedCards[fromSlot] = null;
    }

    this.placedCards[slotIndex] = cardIndex;
    draggedCard.currentSlot = slotIndex;
    draggedCard.container.currentSlot = slotIndex;

    const slot = this.slotViews[slotIndex];
    if (slot) this.setCardPosition(draggedCard, slot.box.x, slot.box.y);

    this.slotFeedback = this.slotFeedback.map((_, i) =>
      this.lockedSlots.has(i) ? 'green' : 'neutral'
    );
    this.refreshUI();
  }

  returnCardHomeByIndex(cardIndex, animate = true) {
    const cardView = this.getCardView(cardIndex);
    if (!cardView) return;

    if (cardView.currentSlot !== null && this.lockedSlots.has(cardView.currentSlot)) return;

    if (cardView.currentSlot !== null && this.placedCards[cardView.currentSlot] === cardIndex) {
      this.placedCards[cardView.currentSlot] = null;
      this.slotFeedback[cardView.currentSlot] = 'neutral';
    }

    cardView.currentSlot = null;
    cardView.container.currentSlot = null;

    if (animate) {
      this.tweens.add({
        targets: cardView.container,
        x: cardView.homeX,
        y: cardView.homeY,
        duration: 220,
        ease: 'Quad.easeOut'
      });
    } else {
      this.setCardPosition(cardView, cardView.homeX, cardView.homeY);
    }

    this.refreshUI();
  }

  refreshUI() {
    this.refreshSlots();
    this.refreshCards();
    this.refreshConfirmButton();

    if (this.attemptsText) {
      this.attemptsText.setText(`Attempts left: ${this.attemptsLeft}`);
    }
  }

  refreshSlots() {
    this.slotViews.forEach((slotView, index) => {
      const cardIndex = this.placedCards[index];
      const card = cardIndex !== null ? this.availableCards[cardIndex] : null;
      const isSelected = this.selectedSlotIndex === index && cardIndex === null;
      const isLocked = this.lockedSlots.has(index);
      const status = isLocked ? 'locked' : this.slotFeedback[index];

      slotView.refresh(card, status, isSelected);
    });
  }

  refreshCards() {
    this.cardViews.forEach((view, index) => {
      const isPlaced = this.placedCards.includes(index);
      const currentSlot = this.placedCards.indexOf(index);
      const isLocked = currentSlot !== -1 && this.lockedSlots.has(currentSlot);

      if (isPlaced) {
        view.bg.setAlpha(isLocked ? 0.25 : 0.35);
        view.title.setAlpha(isLocked ? 0.25 : 0.35);
        view.tag.setAlpha(isLocked ? 0.25 : 0.35);
        view.bg.setStrokeStyle(2, 0x9a9a9a, 0.3);
      } else {
        view.bg.setAlpha(1);
        view.title.setAlpha(1);
        view.tag.setAlpha(1);
        view.bg.setStrokeStyle(3, 0x7a5c2e, 0.85);
      }
    });
  }

  refreshConfirmButton() {
    if (!this.confirmButton) return;
    this.confirmButton.setColor(this.isTimelineComplete() ? '#ffd966' : '#666666');
  }

  isTimelineComplete() {
    return this.placedCards.every(cardIndex => cardIndex !== null);
  }

  confirmTheory() {
    const orderedCards = this.placedCards
      .map(cardIndex => this.availableCards[cardIndex])
      .filter(Boolean);

    const feedback = HypothesisEvaluator.evaluateGuess(orderedCards, this.activeSlotCount);

    this.slotFeedback = feedback;
    this.selectedSlotIndex = null;

    let newGreenCount = 0;
    feedback.forEach((status, i) => {
      if (status === 'green' && !this.lockedSlots.has(i)) {
        this.lockedSlots.add(i);
        newGreenCount++;

        const card = orderedCards[i];
        if (card?.heistExplanation) {
          this.time.delayedCall(newGreenCount * 500, () => {
            this.slotViews[i]?.showNarrative(card.heistExplanation);
          });
        }
      }
    });

    this.refreshSlots();

    const result = this.energyManager.consumeActivity('minigame_mastermind');

    if (result.energyReachedZero) {
      this.scene.stop();
      return;
    }

    const evaluation = HypothesisEvaluator.determineResult(feedback, this.attemptsLeft - 1);

    if (!evaluation.isFinal) {
      this.attemptsLeft -= 1;
      if (gameState.reconstructedHeist) {
        gameState.reconstructedHeist.playerAttemptsLeft = this.attemptsLeft;
      }

      let msg = evaluation.message;
      const redHerringCard = orderedCards.find((card, i) =>
        feedback[i] === 'red' && card?.isRedHerring
      );
      if (redHerringCard) {
        const funnyLine = HypothesisEvaluator.getFunnyLine(redHerringCard);
        msg += `\n\n${funnyLine}`;
      }

      this.refreshUI();
      this.showFeedback(msg, evaluation.color);
      return;
    }

    if (evaluation.resultLabel !== 'exact') {
      this.attemptsLeft -= 1;
    }

    this.finalizeTheory(orderedCards, evaluation.resultLabel, evaluation.score, evaluation.message, evaluation.color);
  }

  finalizeTheory(orderedCards, resultLabel, score, message, color) {
    const orderedSentences = orderedCards.map(card => card.item);
    const orderedItems = orderedCards.map(card => ({
      id: card.id,
      item: card.item,
      text: card.item,
      skills: Array.isArray(card.skills) ? [...card.skills] : [],
      isCorrect: !!card.isCorrect,
      correctOrder: card.correctOrder,
      heistExplanation: card.heistExplanation || '',
      trueExplanation: card.trueExplanation || ''
    }));

    const finalText = orderedSentences.join(' → ');
    const uniqueSkills = HypothesisEvaluator.collectUniqueSkills(orderedCards);
    const narrativeLines = HypothesisEvaluator.buildNarrative(orderedCards);

    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {};
    }

gameState.reconstructedHeist.playerOrderedCards = orderedItems;
gameState.reconstructedHeist.playerOrderedSentences = orderedSentences;
gameState.reconstructedHeist.playerFinalText = finalText;
gameState.reconstructedHeist.playerSkills = uniqueSkills;
gameState.reconstructedHeist.playerTheoryScore = score;
gameState.reconstructedHeist.playerTheoryResult = resultLabel;
gameState.reconstructedHeist.playerSlotFeedback = [...this.slotFeedback];
gameState.reconstructedHeist.playerAttemptsLeft = this.attemptsLeft;
gameState.reconstructedHeist.playerNarrative = narrativeLines;

/*
 * These are the actual three skills generated for the thief.
 * Do not use collectUniqueSkills(orderedCards) for elimination:
 * one object may have many broad tags such as Analysis or Investigation.
 */
const confirmedSkills = Array.isArray(
  gameState.hypothesisEvidence?.requiredSkills
)
  ? [...gameState.hypothesisEvidence.requiredSkills]
  : [];

/*
 * A correct reconstruction reveals the thief's method.
 * It does not automatically eliminate suspects unless the Crime Lab
 * has already applied its first hard filter.
 */
gameState.reconstructedHeist.confirmedSkills = [];
gameState.reconstructedHeist.hypothesisConfirmed = false;
gameState.reconstructedHeist.hypothesisSuspectFilterResult = null;

if (resultLabel === 'exact') {
  if (confirmedSkills.length !== 3) {
    console.error(
      '[HypothesisScene] Exact theory completed, but requiredSkills are missing.',
      {
        hypothesisEvidence: gameState.hypothesisEvidence,
        reconstructedHeist: gameState.reconstructedHeist
      }
    );
  } else {
    gameState.reconstructedHeist.confirmedSkills = confirmedSkills;
    gameState.reconstructedHeist.hypothesisConfirmed = true;
    gameState.reconstructedHeist.hypothesisCompletedAt = Date.now();

    /*
     * Correct order:
     * 1. Crime Lab eliminates 4–6 people.
     * 2. Hypothesis removes 2–3 more from those remaining.
     *
     * If Crime Lab was completed earlier, apply the skill filter now.
     * If not, we save the confirmed skills and CrimeLabScene applies
     * the pending skill filter immediately after its identity filter.
     */
    if (gameState.csiLabCompleted) {
      const suspectFilterResult = applyHypothesisSkills(confirmedSkills);

      gameState.reconstructedHeist.hypothesisSuspectFilterResult = {
        ...suspectFilterResult,
        appliedAt: Date.now()
      };

      gameState.suspectCaseSummary = getSuspectCaseSummary();

      console.log('[HypothesisScene] Skill filter applied.', {
        confirmedSkills,
        excludedSuspectIds: suspectFilterResult.excludedSuspectIds,
        remainingSuspects: suspectFilterResult.remainingSuspects
      });
    } else {
      console.log(
        '[HypothesisScene] Correct skills saved. Skill filter will run after Crime Lab.',
        {
          confirmedSkills
        }
      );
    }
  }
}

this.appendTheoryToNotes(
  finalText,
  resultLabel === 'exact' ? confirmedSkills : uniqueSkills,
  resultLabel,
  narrativeLines
);

this.storeTheorySkills(
  resultLabel === 'exact' ? confirmedSkills : uniqueSkills
);

    if (this.scoreManager && typeof this.scoreManager.addScoreEvent === 'function') {
      this.scoreManager.addScoreEvent(score, `Heist theory: ${resultLabel}`);
      gameState.score = this.scoreManager.getSessionPoints();
    } else {
      gameState.score = Math.max(0, (gameState.score || 0) + score);
    }

    saveGameState();
    this.uiLocked = true;

    if (resultLabel === 'exact' && narrativeLines.length > 0) {
      this.showFeedback(message, color);
      this.time.delayedCall(900, () => {
        this.launchResultCommentScene();
      });
    } else {
      this.showFeedback(`${message} +${score} score`, color);
      this.time.delayedCall(900, () => {
        this.launchResultCommentScene();
      });
    }
  }

  appendTheoryToNotes(finalText, uniqueSkills, resultLabel, narrativeLines = []) {
    const headerMap = {
      exact: 'Heist reconstruction:',
      partial: 'Partial heist theory:',
      weak: 'Uncertain heist theory:'
    };

    const header = headerMap[resultLabel] || 'Heist hypothesis:';
    const skillLine = uniqueSkills.length > 0 ? `\nLikely skills: ${uniqueSkills.join(', ')}.` : '';
    const storyLine = narrativeLines.length > 0
      ? `\n\n${narrativeLines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`
      : '';
    const noteBlock = `${header}${storyLine}${skillLine}`;

    const existingNotes = typeof gameState.playerNotes === 'string' ? gameState.playerNotes : '';

    if (!existingNotes.includes(finalText)) {
      gameState.playerNotes = existingNotes ? `${existingNotes}\n\n${noteBlock}` : noteBlock;
    }
  }

  storeTheorySkills(uniqueSkills) {
    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    uniqueSkills.forEach(skill => {
      const alreadyExists = gameState.cluesCollected.some(
        clue =>
          clue?.type === 'suspect' &&
          clue?.category === 'skills' &&
          String(clue?.value).toLowerCase() === skill.toLowerCase()
      );

      if (!alreadyExists) {
        gameState.cluesCollected.push({
          type: 'suspect',
          category: 'skills',
          value: skill,
          source: 'heist_hypothesis',
          cityId: this.cityId,
          text: `Skill: ${skill}`
        });
      }
    });
  }

  showFeedback(text, color = '#ffd966') {
    if (!this.feedbackText) return;

    this.feedbackText.setText(text);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0.92,
      duration: 120,
      ease: 'Linear'
    });
  }

  restoreSourceScene() {
    const source = this.sourceScene || 'CityScene';

    if (this.scene.isSleeping(source)) {
      this.scene.wake(source);
    }

    if (this.scene.isPaused(source)) {
      this.scene.resume(source);
    }

    const sourceSceneRef = this.scene.get(source);
    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true;
      sourceSceneRef.input.setTopOnly(true);
    }
  }

  launchResultCommentScene() {
    saveGameState();

    const source = this.sourceScene || 'CityScene';

    if (this.scene.isSleeping(source)) {
      this.scene.wake(source);
    }

    if (this.scene.isActive(source) && !this.scene.isPaused(source)) {
      this.scene.pause(source);
    }

    this.scene.launch('TheoryResultCallScene', {
      sourceScene: source,
      mode: 'hq',
      result: gameState.reconstructedHeist?.playerTheoryResult || 'weak'
    });

    this.scene.stop();
  }

  closeScene() {
    saveGameState();
    this.restoreSourceScene();
    this.scene.stop();
  }

  onShutdown() {
    if (this.handleResizeBound) this.scale.off('resize', this.handleResizeBound);

    this.cardViews.forEach(view => {
      [view.bg, view.title, view.tag, view.container].forEach(item => {
        if (item?.removeAllListeners) item.removeAllListeners();
        if (item?.destroy) item.destroy();
      });
    });

    this.slotViews.forEach(v => v.destroy?.());

    [
      this.overlay, this.panel, this.titleText, this.subtitleText,
      this.feedbackText, this.attemptsText, this.legendText,
      this.closeButton, this.confirmButton
    ].forEach(item => {
      if (item?.removeAllListeners) item.removeAllListeners();
      if (item?.destroy) item.destroy();
    });

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];
    this.placedCards = new Array(this.activeSlotCount).fill(null);
    this.slotFeedback = new Array(this.activeSlotCount).fill('neutral');
    this.lockedSlots = new Set();
    this.selectedSlotIndex = null;
    this._resizeBound = false;
    this.uiLocked = false;
  }
}