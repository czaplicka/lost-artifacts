import { gameState, saveGameState } from '../GameData.js';
import { getScoreManager } from '../gameSetup.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../EnergyManager.js';

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
    this.mobileHintText = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];

    this.placedCards = [null, null, null];
    this.slotFeedback = ['neutral', 'neutral', 'neutral'];
    this.attemptsLeft = 3;

    this.correctCards = [];
    this.distractorCards = [];

    this._listenersBound = false;
    this._resizeBound = false;
    this.layout = null;

    this.isDraggingCard = false;
    this.isMobileUI = false;
    this.selectedSlotIndex = null;
    this.uiLocked = false;

    this.handleDragStartBound = null;
    this.handleDragBound = null;
    this.handleDropBound = null;
    this.handleDragEndBound = null;
    this.handleResizeBound = null;

    this.scoreManager = null;
    this.activeSlotCount = 3;
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.cityId = data.cityId || gameState.currentCityId || gameState.crimeCityId || gameState.reconstructedHeist?.cityId || null;
    this.sceneId = data.sceneId || gameState.reconstructedHeist?.sceneId || null;
    this.activeSlotCount = Number.isInteger(data.activeSlotCount) ? Phaser.Math.Clamp(data.activeSlotCount, 1, 3) : 3;

    this.overlay = null;
    this.panel = null;
    this.titleText = null;
    this.subtitleText = null;
    this.feedbackText = null;
    this.attemptsText = null;
    this.legendText = null;
    this.mobileHintText = null;

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];

    this.placedCards = new Array(this.activeSlotCount).fill(null);
    this.slotFeedback = new Array(this.activeSlotCount).fill('neutral');

    this.attemptsLeft = 3;
    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {};
    }
    gameState.reconstructedHeist.playerAttemptsLeft = 3;

    this.correctCards = [];
    this.distractorCards = [];
    this.layout = null;

    this.isDraggingCard = false;
    this.isMobileUI = false;
    this.selectedSlotIndex = null;
    this.uiLocked = false;

    this.handleDragStartBound = null;
    this.handleDragBound = null;
    this.handleDropBound = null;
    this.handleDragEndBound = null;
    this.handleResizeBound = null;

    this.scoreManager = getScoreManager();
  }

  create() {
        super.create();
    this.prepareCards();
this.energyManager = getEnergyManager();
    this.input.dragDistanceThreshold = 14;
    this.input.dragTimeThreshold = 120;

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

    const subtitle = this.isMobileUI
      ? 'Tap clue cards to place them. Tap X to remove a card. You have 3 attempts.'
      : 'Drag 3 clue cards into the timeline. You have 3 attempts.';

    this.subtitleText = this.add.text(width / 2, 0, subtitle, {
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

    this.mobileHintText = this.add.text(width / 2, 0, 'Tap card to auto-place. Tap X to remove.', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#f0ddb0',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002).setVisible(this.isMobileUI);

    this.legendText = this.add.text(width / 2, 0, 'Green = exact, yellow = misplaced, red = absent', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#ccb98c',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.feedbackText = this.add.text(width / 2, 0, '', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#ffd966',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.bindDragEvents();
    this.bindResize();
    this.applyResponsiveLayout();
    this.refreshUI();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
  }

  prepareCards() {
    const reconstruction = gameState.reconstructedHeist;
    const allCards = Array.isArray(reconstruction?.allCards) ? reconstruction.allCards : [];

    let sourceCards = allCards
      .filter(card => !this.sceneId || card.scene === this.sceneId)
      .filter(card => !this.cityId || card.cityId === this.cityId);

    if (sourceCards.length === 0) sourceCards = allCards;

    const uniqueCards = [];
    const seen = new Set();

    sourceCards.forEach((card, index) => {
      const key = `${card.id || card.item || index}_${card.scene || ''}_${card.cityId || ''}`;
      if (seen.has(key)) return;
      seen.add(key);

      uniqueCards.push({
        id: card.id || `card_${index}`,
        item: card.item || `Clue ${index + 1}`,
        text: card.text || card.item || `Clue ${index + 1}`,
        skills: Array.isArray(card.skills) ? [...card.skills] : [],
        scene: card.scene || this.sceneId,
        cityId: card.cityId || this.cityId,
        correctOrder: Number.isInteger(card.correctOrder) ? card.correctOrder : -1,
        isCorrect: !!card.isCorrect,
        clueType: card.clueType || 'soft_clue',
        heistExplanation: card.heistExplanation || '',
        trueExplanation: card.trueExplanation || '',
        isRedHerring: !!card.isRedHerring
      });
    });

    this.correctCards = uniqueCards.filter(card => card.isCorrect).sort((a, b) => a.correctOrder - b.correctOrder).slice(0, 3);
    this.distractorCards = uniqueCards.filter(card => !card.isCorrect).slice(0, 3);

    this.availableCards = Phaser.Utils.Array.Shuffle([
      ...this.correctCards.slice(0, 3),
      ...this.distractorCards.slice(0, 3)
    ]);

    while (this.availableCards.length < 6) {
      const missing = uniqueCards.find(card => !this.availableCards.some(existing => existing.id === card.id));
      if (!missing) break;
      this.availableCards.push({ ...missing });
    }

    this.availableCards = Phaser.Utils.Array.Shuffle(this.availableCards.slice(0, 6));
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
    const totalSlotWidth = 3 * slotWidth + 2 * slotGap;
    const slotStartX = width / 2 - totalSlotWidth / 2 + slotWidth / 2;
    const slotsBaseY = attemptsY + (isMobile ? 120 : 140);

    const slotPositions = [
      { x: slotStartX, y: slotsBaseY, labelY: slotsBaseY - (isMobile ? 60 : 80) },
      { x: slotStartX + slotWidth + slotGap, y: slotsBaseY, labelY: slotsBaseY - (isMobile ? 60 : 80) },
      { x: slotStartX + 2 * (slotWidth + slotGap), y: slotsBaseY, labelY: slotsBaseY - (isMobile ? 60 : 80) }
    ];

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
      width,
      height,
      isMobile,
      panelWidth,
      panelHeight,
      panelX,
      panelY,
      panelTop,
      panelBottom,
      titleY,
      subtitleY,
      attemptsY,
      gridTopY,
      buttonsY,
      legendY,
      feedbackY,
      slotWidth,
      slotHeight,
      slotPositions,
      cardWidth,
      cardHeight,
      trayPositions,
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

    if (this.mobileHintText) {
      this.mobileHintText.setVisible(this.isMobileUI);
      this.mobileHintText.setPosition(L.width / 2, L.gridTopY - 42);
      this.mobileHintText.setFontSize(L.isMobile ? '16px' : '18px');
    }

    this.legendText.setPosition(L.width / 2, L.legendY);
    this.legendText.setFontSize(L.isMobile ? '15px' : '18px');
    this.legendText.setWordWrapWidth(L.wrapFeedback, true);

    this.feedbackText.setPosition(L.width / 2, L.feedbackY);
    this.feedbackText.setFontSize(L.isMobile ? '18px' : '22px');
    this.feedbackText.setWordWrapWidth(L.wrapFeedback, true);

    this.slotViews.forEach((slotView, index) => {
      const pos = L.slotPositions[index];
      if (!pos) return;

      slotView.label.setPosition(pos.x, pos.labelY);
      slotView.label.setFontSize(L.isMobile ? '12px' : '14px');
      slotView.label.setWordWrapWidth(L.wrapSlot, true);

      slotView.box.setPosition(pos.x, pos.y);
      slotView.box.setSize(L.slotWidth, L.slotHeight);
      slotView.box.input.hitArea.setTo(
        -L.slotWidth / 2,
        -L.slotHeight / 2,
        L.slotWidth,
        L.slotHeight
      );

      slotView.dropZone.setPosition(pos.x, pos.y);
      slotView.dropZone.setSize(L.slotWidth, L.slotHeight);
      slotView.dropZone.setRectangleDropZone(L.slotWidth, L.slotHeight);

      slotView.text.setPosition(pos.x, pos.y);
      slotView.text.setFontSize(L.isMobile ? '20px' : '24px');
      slotView.text.setWordWrapWidth(L.wrapSlot, true);

      if (slotView.removeButton) {
        slotView.removeButton.setPosition(pos.x + L.slotWidth / 2 - 24, pos.y - L.slotHeight / 2 + 20);
        slotView.removeButton.setFontSize(L.isMobile ? '14px' : '16px');
      }
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
    for (let i = 0; i < this.activeSlotCount; i += 1) {
      const label = this.add.text(0, 0, `STEP ${i + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#f0ddb0'
      }).setOrigin(0.5).setDepth(3002);

      const box = this.add.rectangle(0, 0, 420, 150, 0x241c16, 0.98)
        .setStrokeStyle(3, 0xc8a75a, 0.8)
        .setDepth(3002)
        .setInteractive(new Phaser.Geom.Rectangle(-210, -75, 420, 150), Phaser.Geom.Rectangle.Contains);

      const dropZone = this.add.zone(0, 0, 420, 150)
        .setRectangleDropZone(420, 150)
        .setData('slotIndex', i)
        .setDepth(3003);

      const text = this.add.text(0, 0, '[ empty ]', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#8d8577',
        align: 'center',
        wordWrap: { width: 300, useAdvancedWrap: true },
        lineSpacing: 4
      }).setOrigin(0.5).setDepth(3003);

      const removeButton = this.add.text(0, 0, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#7a1f1f',
        padding: { left: 7, right: 7, top: 5, bottom: 5 }
      }).setOrigin(0.5).setDepth(3004).setInteractive({ useHandCursor: true });

      removeButton.on('pointerup', () => this.handleSlotRemove(i));
      box.on('pointerup', () => this.handleSlotClick(i));

      this.slotViews.push({ label, box, text, dropZone, removeButton });
      this.dropZones.push(dropZone);
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

      if (!this.isMobileUI) {
        this.input.setDraggable(bg);
      }

      bg.cardIndex = index;
      bg.parentCardContainer = container;
      bg.pointerDownX = 0;
      bg.pointerDownY = 0;
      bg.pointerDownTime = 0;
      bg.dragStarted = false;
      bg.justDragged = false;

      container.cardIndex = index;
      container.homeX = 0;
      container.homeY = 0;
      container.currentSlot = null;

      bg.on('pointerdown', pointer => {
        if (this.isMobileUI || this.uiLocked) return;
        bg.pointerDownX = pointer.x;
        bg.pointerDownY = pointer.y;
        bg.pointerDownTime = this.time.now;
        bg.dragStarted = false;
        bg.justDragged = false;
        this.tweens.killTweensOf(container);
        container.setScale(0.98);
      });

      bg.on('pointerup', pointer => {
        if (this.uiLocked) return;

        if (this.isMobileUI) {
          this.handleCardTap(index);
          return;
        }

        container.setScale(1);

        const movedDistance = Phaser.Math.Distance.Between(
          bg.pointerDownX,
          bg.pointerDownY,
          pointer.x,
          pointer.y
        );

        const heldFor = this.time.now - bg.pointerDownTime;
        const isTap = !bg.dragStarted && !bg.justDragged && movedDistance < 10 && heldFor < 320;

        if (isTap) {
          this.handleCardClick(index);
        }
      });

      bg.on('pointerout', () => {
        if (!bg.dragStarted) {
          container.setScale(1);
        }
      });

      this.cardViews.push({
        bg,
        title,
        tag,
        container,
        currentSlot: null,
        homeX: 0,
        homeY: 0
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
    if (this.mobileHintText) this.mobileHintText.setVisible(this.isMobileUI);
    this.applyResponsiveLayout();
    this.refreshUI();
  }

  bindDragEvents() {
    if (this._listenersBound) return;
    this._listenersBound = true;

    this.handleDragStartBound = (pointer, gameObject) => {
      if (this.isMobileUI || this.uiLocked) return;
      const container = gameObject.parentCardContainer;
      this.isDraggingCard = true;
      gameObject.dragStarted = true;
      gameObject.justDragged = false;
      container.setScale(1);
      container.setDepth(3100);
      this.tweens.killTweensOf(container);
    };

    this.handleDragBound = (pointer, gameObject, dragX, dragY) => {
      if (this.isMobileUI || this.uiLocked) return;
      const container = gameObject.parentCardContainer;
      gameObject.justDragged = true;
      this.setCardPositionByIndex(container.cardIndex, dragX, dragY);
    };

    this.handleDropBound = (pointer, gameObject, dropZone) => {
      if (this.isMobileUI || this.uiLocked) return;
      const container = gameObject.parentCardContainer;
      const slotIndex = dropZone.getData('slotIndex');
      this.placeCardInSlotByIndex(container.cardIndex, slotIndex);
    };

    this.handleDragEndBound = (pointer, gameObject, dropped) => {
      if (this.isMobileUI || this.uiLocked) return;
      const container = gameObject.parentCardContainer;
      this.isDraggingCard = false;
      container.setScale(1);
      if (!dropped) this.returnCardHomeByIndex(container.cardIndex);
      this.time.delayedCall(100, () => {
        gameObject.justDragged = false;
        gameObject.dragStarted = false;
        container.setDepth(3004);
      });
    };

    this.input.on('dragstart', this.handleDragStartBound);
    this.input.on('drag', this.handleDragBound);
    this.input.on('drop', this.handleDropBound);
    this.input.on('dragend', this.handleDragEndBound);
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

  flashSlot(slotIndex) {
    const slotView = this.slotViews[slotIndex];
    if (!slotView?.box) return;
    const box = slotView.box;
    const originalLineWidth = box.lineWidth || 3;
    this.tweens.killTweensOf(box);
    box.setStrokeStyle(5, 0xfff2a8, 1);
    this.tweens.add({
      targets: box,
      alpha: { from: 1, to: 0.86 },
      yoyo: true,
      duration: 90,
      repeat: 1,
      onComplete: () => {
        box.setAlpha(1);
        this.refreshSlots();
        if (box.active) box.setLineWidth?.(originalLineWidth);
      }
    });
  }

  handleCardTap(cardIndex) {
    if (this.uiLocked) return;
    const card = this.availableCards[cardIndex];
    if (!card) return;

    const alreadyPlaced = this.placedCards.includes(cardIndex);
    if (alreadyPlaced) {
      this.showFeedback('This card is already in the timeline. Tap its step to remove it.', '#ffb347');
      return;
    }

    let targetSlot = this.selectedSlotIndex;

    if (targetSlot === null || targetSlot === undefined) {
      targetSlot = this.placedCards.findIndex(v => v === null);
      if (targetSlot !== -1) {
        this.selectedSlotIndex = targetSlot;
        this.refreshUI();
      }
    }

    if (targetSlot === -1 || targetSlot === null || targetSlot === undefined) {
      this.showFeedback('All steps are full. Tap X on a step to remove a card.', '#ffb347');
      return;
    }

    if (this.placedCards[targetSlot] !== null) {
      const emptySlot = this.placedCards.findIndex(v => v === null);
      if (emptySlot !== -1) {
        targetSlot = emptySlot;
        this.selectedSlotIndex = emptySlot;
        this.refreshUI();
      } else {
        this.showFeedback('Selected step is occupied. Remove that card first.', '#ffb347');
        return;
      }
    }

    this.placeCardInSlotByIndex(cardIndex, targetSlot);
    this.selectedSlotIndex = null;
    this.refreshUI();
  }

  handleCardClick(cardIndex) {
    if (this.uiLocked) return;
    const card = this.availableCards[cardIndex];
    if (!card) return;

    const alreadyPlaced = this.placedCards.includes(cardIndex);
    if (alreadyPlaced) {
      this.showFeedback('This card is already in the timeline.', '#ffb347');
      return;
    }

    const emptySlot = this.placedCards.findIndex(v => v === null);
    if (emptySlot === -1) {
      this.showFeedback('All slots are full. Use X to remove one.', '#ffb347');
      return;
    }

    this.placeCardInSlotByIndex(cardIndex, emptySlot);
  }

  handleSlotClick(slotIndex) {
    if (this.uiLocked) return;
    const cardIndex = this.placedCards[slotIndex];

    if (cardIndex === null) {
      this.selectedSlotIndex = this.selectedSlotIndex === slotIndex ? null : slotIndex;
      this.refreshUI();
      this.showFeedback(this.selectedSlotIndex === null ? 'Step selection cleared.' : `Step ${slotIndex + 1} selected. Now tap a clue card.`, this.selectedSlotIndex === null ? '#ccb98c' : '#ffd966');
      return;
    }

    this.handleSlotRemove(slotIndex);
  }

  handleSlotRemove(slotIndex) {
    if (this.uiLocked) return;
    const cardIndex = this.placedCards[slotIndex];
    if (cardIndex === null) {
      this.showFeedback('Nothing to remove there.', '#ffb347');
      return;
    }

    this.returnCardHomeByIndex(cardIndex, true);
    this.flashSlot(slotIndex);
    this.selectedSlotIndex = null;
    this.refreshUI();
    this.showFeedback(`Card removed from step ${slotIndex + 1}.`, '#f0ddb0');
  }

  placeCardInSlotByIndex(cardIndex, slotIndex) {
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

    if (targetCard && fromSlot !== null) {
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

    if (fromSlot !== null && this.placedCards[fromSlot] === cardIndex) {
      this.placedCards[fromSlot] = null;
    }

    this.placedCards[slotIndex] = cardIndex;
    draggedCard.currentSlot = slotIndex;
    draggedCard.container.currentSlot = slotIndex;

    const slot = this.slotViews[slotIndex];
    if (slot) this.setCardPosition(draggedCard, slot.box.x, slot.box.y);

    this.slotFeedback = new Array(this.activeSlotCount).fill('neutral');
    this.refreshUI();
  }

  returnCardHomeByIndex(cardIndex, animate = true) {
    const cardView = this.getCardView(cardIndex);
    if (!cardView) return;

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
    const colorMap = {
      neutral: { fill: 0x241c16, stroke: 0xc8a75a, text: '#8d8577', width: 3 },
      selected: { fill: 0x2c2614, stroke: 0xffd966, text: '#f7f1dc', width: 4 },
      green: { fill: 0x24331f, stroke: 0x3ddb6b, text: '#f7f1dc', width: 3 },
      yellow: { fill: 0x3a3216, stroke: 0xf1c232, text: '#f7f1dc', width: 3 },
      red: { fill: 0x331d1d, stroke: 0xe06666, text: '#f7f1dc', width: 3 }
    };

    this.slotViews.forEach((slotView, index) => {
      const cardIndex = this.placedCards[index];
      const isSelected = this.isMobileUI && this.selectedSlotIndex === index && cardIndex === null;
      const status = isSelected ? 'selected' : (this.slotFeedback[index] || 'neutral');
      const colors = colorMap[status] || colorMap.neutral;

      slotView.box.setFillStyle(colors.fill, 0.98);
      slotView.box.setStrokeStyle(colors.width, colors.stroke, 0.95);

      if (slotView.removeButton) {
        const active = cardIndex !== null;
        slotView.removeButton.setAlpha(active ? 1 : 0.22);
        slotView.removeButton.setVisible(true);
        slotView.removeButton.setText('X');
      }

      if (cardIndex === null) {
        slotView.text.setText(isSelected ? '[ selected ]' : '[ empty ]');
        slotView.text.setColor(colors.text);
        return;
      }

      const card = this.availableCards[cardIndex];
      slotView.text.setText(card?.item || '[ clue ]');
      slotView.text.setColor(colors.text);
    });
  }

  refreshCards() {
    this.cardViews.forEach((view, index) => {
      const isPlaced = this.placedCards.includes(index);

      if (isPlaced) {
        view.bg.setAlpha(0.35);
        view.title.setAlpha(0.35);
        view.tag.setAlpha(0.35);
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

  evaluateGuess(orderedCards) {
    const result = new Array(this.activeSlotCount).fill('red');
    const solutionUsed = new Array(this.activeSlotCount).fill(false);
    const guessUsed = new Array(this.activeSlotCount).fill(false);

    for (let i = 0; i < this.activeSlotCount; i += 1) {
      const card = orderedCards[i];
      if (card?.isCorrect && card.correctOrder === i) {
        result[i] = 'green';
        solutionUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    for (let i = 0; i < this.activeSlotCount; i += 1) {
      if (guessUsed[i]) continue;
      const card = orderedCards[i];
      if (!card?.isCorrect) continue;

      for (let j = 0; j < this.activeSlotCount; j += 1) {
        if (solutionUsed[j]) continue;
        if (card.correctOrder === j) {
          result[i] = 'yellow';
          solutionUsed[j] = true;
          guessUsed[i] = true;
          break;
        }
      }
    }

    return result;
  }

  confirmTheory() {
    const orderedCards = this.placedCards.map(cardIndex => this.availableCards[cardIndex]).filter(Boolean);
    const feedback = this.evaluateGuess(orderedCards);
    this.slotFeedback = feedback;
    this.selectedSlotIndex = null;
    this.refreshSlots();
const result = this.energyManager.consumeActivity('minigame_mastermind');
console.log(`🧩 ${result.label}`);

if (result.energyReachedZero) {
  this.scene.stop();
  return;
}
    const allGreen = feedback.every(v => v === 'green');

    if (allGreen) {
      this.finalizeTheory(orderedCards, 'exact', 60, 'Excellent reconstruction. You nailed the sequence.', '#7CFC00');
      return;
    }

    this.attemptsLeft -= 1;
    if (gameState.reconstructedHeist) {
      gameState.reconstructedHeist.playerAttemptsLeft = this.attemptsLeft;
    }
    this.refreshUI();

    if (this.attemptsLeft > 0) {
      this.showFeedback('Not quite. Adjust the timeline and try again.', '#ffd966');
      return;
    }

    const greenCount = feedback.filter(v => v === 'green').length;
    const yellowCount = feedback.filter(v => v === 'yellow').length;

    if (greenCount + yellowCount >= 2) {
      this.finalizeTheory(orderedCards, 'partial', 25, 'Promising lead. Part of the sequence fits.', '#ffcf66');
    } else {
      this.finalizeTheory(orderedCards, 'weak', 10, 'Theory recorded, but the sequence still needs work.', '#ff9f80');
    }
  }

  finalizeTheory(orderedCards, resultLabel, score, message, color) {
    const orderedSentences = orderedCards.map(card => card.item);
    const orderedItems = orderedCards.map(card => ({
      id: card.id,
      item: card.item,
      text: card.item,
      skills: Array.isArray(card.skills) ? [...card.skills] : [],
      isCorrect: !!card.isCorrect,
      correctOrder: card.correctOrder
    }));

    const finalText = orderedSentences.join(' → ');
    const uniqueSkills = this.collectUniqueSkills(orderedCards);

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

    this.appendTheoryToNotes(finalText, uniqueSkills, resultLabel);
    this.storeTheorySkills(uniqueSkills);

if (
  this.scoreManager &&
  typeof this.scoreManager.addScoreEvent === 'function'
) {
  this.scoreManager.addScoreEvent(
    score,
    `Heist theory: ${resultLabel}`
  );

  gameState.score = this.scoreManager.getSessionPoints();
} else {
  gameState.score = Math.max(
    0,
    (gameState.score || 0) + score
  );
}

    saveGameState();
    this.showFeedback(`${message} +${score} score`, color);
    this.uiLocked = true;

    this.time.delayedCall(900, () => {
      this.launchResultCommentScene();
    });
  }

  collectUniqueSkills(cards) {
    const uniqueSkills = [];

    cards.forEach(card => {
      const skills = Array.isArray(card.skills) ? card.skills : [];
      skills.forEach(skill => {
        const normalized = String(skill).trim();
        if (!normalized) return;
        const exists = uniqueSkills.some(existing => existing.toLowerCase() === normalized.toLowerCase());
        if (!exists) uniqueSkills.push(normalized);
      });
    });

    return uniqueSkills;
  }

  appendTheoryToNotes(finalText, uniqueSkills, resultLabel) {
    const headerMap = {
      exact: 'Heist hypothesis:',
      close: 'Working hypothesis:',
      partial: 'Partial heist theory:',
      weak: 'Uncertain heist theory:'
    };

    const header = headerMap[resultLabel] || 'Heist hypothesis:';
    const skillLine = uniqueSkills.length > 0 ? `\nLikely skills: ${uniqueSkills.join(', ')}.` : '';
    const noteBlock = `${header}\n${finalText}${skillLine}`;
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
    if (this.handleDragStartBound) this.input.off('dragstart', this.handleDragStartBound);
    if (this.handleDragBound) this.input.off('drag', this.handleDragBound);
    if (this.handleDropBound) this.input.off('drop', this.handleDropBound);
    if (this.handleDragEndBound) this.input.off('dragend', this.handleDragEndBound);
    if (this.handleResizeBound) this.scale.off('resize', this.handleResizeBound, this);

    this.cardViews.forEach(view => {
      [view.bg, view.title, view.tag, view.container].forEach(item => {
        if (item?.removeAllListeners) item.removeAllListeners();
        if (item?.destroy) item.destroy();
      });
    });

    this.slotViews.forEach(v => {
      [v.label, v.box, v.text, v.dropZone, v.removeButton].forEach(item => {
        if (item?.removeAllListeners) item.removeAllListeners();
        if (item?.destroy) item.destroy();
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
      this.mobileHintText,
      this.closeButton,
      this.confirmButton
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
    this.selectedSlotIndex = null;
    this._listenersBound = false;
    this._resizeBound = false;
    this.isDraggingCard = false;
    this.uiLocked = false;
  }
}