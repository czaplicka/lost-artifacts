import { gameState, saveGameState } from '../GameData.js';

export default class HypothesisScene extends Phaser.Scene {
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
    this.attemptsLeft = 2;

    this.correctCards = [];
    this.distractorCards = [];

    this._listenersBound = false;
    this._resizeBound = false;
    this.layout = null;
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';
    this.cityId = data.cityId || gameState.currentCityId || null;
    this.sceneId = data.sceneId || gameState.reconstructedHeist?.sceneId || null;

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
    this.attemptsLeft = 2;

    this.correctCards = [];
    this.distractorCards = [];
    this.layout = null;
  }

  create() {
    this.prepareCards();

    const { width, height } = this.scale;

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.82)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.add.rectangle(width / 2, height / 2, width * 0.9, height * 0.88, 0x17130f, 0.98)
      .setStrokeStyle(4, 0xd4af37, 0.85)
      .setDepth(3001);

    this.titleText = this.add.text(width / 2, 0, 'Reconstruct the heist', {
      fontFamily: 'Special Elite',
      fontSize: '40px',
      color: '#f6f1df',
      align: 'center'
    }).setOrigin(0.5).setDepth(3002);

    this.subtitleText = this.add.text(width / 2, 0, 'Drag 3 clue cards into the timeline. You have 2 attempts.', {
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

  getLayout() {
    const { width, height } = this.scale;
    const isMobile = width <= 900;
    const panelWidth = Math.min(width - 36, isMobile ? 680 : 1400);
    const panelHeight = Math.min(height - 30, isMobile ? Math.max(920, height - 24) : 820);
    const panelX = width / 2;
    const panelY = height / 2;

    const titleY = panelY - panelHeight / 2 + (isMobile ? 36 : 42);
    const subtitleY = titleY + (isMobile ? 40 : 48);
    // FIX: więcej miejsca dla attemptsText — oddalone od subtitleY i od slotsY
    const attemptsY = subtitleY + (isMobile ? 52 : 52);
    const slotsY = attemptsY + (isMobile ? 110 : 100);
    const trayY = slotsY + (isMobile ? 240 : 250);
    const buttonsY = panelY + panelHeight / 2 - (isMobile ? 92 : 96);
    const legendY = buttonsY - 54;
    const feedbackY = buttonsY + 54;

    const slotWidth = isMobile ? Math.min(panelWidth - 44, 260) : 340;
    const slotHeight = isMobile ? 112 : 152;
    const slotGap = isMobile ? 128 : 420;

    const slotPositions = isMobile
      ? [slotsY - 130, slotsY, slotsY + 130].map((y) => ({ x: width / 2, y, labelY: y - 78 }))
      : [width / 2 - slotGap, width / 2, width / 2 + slotGap].map((x) => ({ x, y: slotsY, labelY: slotsY - 98 }));

    const cardWidth = isMobile ? Math.min(panelWidth - 44, 300) : 228;
    const cardHeight = isMobile ? 86 : 132;
    const cardGapX = isMobile ? 0 : 252;
    const cardGapY = isMobile ? 102 : 0;

    // FIX: trayStartX dla 5 kart (nie tylko 5, dynamicznie)
    const numCards = this.availableCards.length; // powinno być 5
    const trayStartX = isMobile ? width / 2 : width / 2 - Math.floor(numCards / 2) * cardGapX;

    const trayPositions = this.availableCards.map((_, index) => {
      if (isMobile) {
        return { x: trayStartX, y: trayY + index * cardGapY };
      }
      return { x: trayStartX + index * cardGapX, y: trayY };
    });

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
      slotsY,
      trayY,
      buttonsY,
      legendY,
      feedbackY,
      slotWidth,
      slotHeight,
      slotPositions,
      cardWidth,
      cardHeight,
      trayPositions,
      wrapTitle: Math.max(220, panelWidth - 60),
      wrapSubtitle: Math.max(220, panelWidth - 80),
      wrapFeedback: Math.max(220, panelWidth - 80),
      wrapSlot: Math.max(160, slotWidth - 42),
      wrapCardTitle: isMobile ? Math.max(130, cardWidth * 0.5) : 150,
      buttonCloseX: isMobile ? width / 2 : width / 2 - 210,
      buttonConfirmX: isMobile ? width / 2 : width / 2 + 220,
      buttonCloseY: isMobile ? buttonsY - 44 : buttonsY,
      buttonConfirmY: isMobile ? buttonsY + 16 : buttonsY
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
      slotView.label.setPosition(pos.x, pos.labelY);
      slotView.label.setFontSize(L.isMobile ? '12px' : '14px');

      slotView.box.setPosition(pos.x, pos.y);
      slotView.box.setSize(L.slotWidth, L.slotHeight);

      slotView.dropZone.setPosition(pos.x, pos.y);
      slotView.dropZone.input.hitArea.setSize(L.slotWidth, L.slotHeight);
      slotView.dropZone.setRectangleDropZone(L.slotWidth, L.slotHeight);

      slotView.text.setPosition(pos.x, pos.y);
      slotView.text.setFontSize(L.isMobile ? '20px' : '24px');
      slotView.text.setWordWrapWidth(L.wrapSlot, true);
    });

    this.cardViews.forEach((view, index) => {
      const pos = L.trayPositions[index];
      const card = this.availableCards[index];

      // FIX: odświeżamy interaktywny hitArea karty po zmianie rozmiaru
      view.bg.setSize(L.cardWidth, L.cardHeight);
      // Zamiast ręcznie ustawiać hitArea, używamy setInteractive() które odświeży automatycznie
      view.bg.setInteractive({ useHandCursor: true });
      this.input.setDraggable(view.bg);

      if (L.isMobile) {
        view.title.setPosition(pos.x - L.cardWidth / 2 + 16, pos.y).setOrigin(0, 0.5);
        view.title.setAlign('left');
        view.title.setFontSize('18px');
        view.title.setWordWrapWidth(L.wrapCardTitle, true);

        view.tag.setPosition(pos.x + L.cardWidth / 2 - 14, pos.y).setOrigin(1, 0.5);
        view.tag.setFontSize('13px');
        view.tag.setText(this.buildSkillPreview(card.skills));
      } else {
        view.title.setPosition(pos.x, pos.y - 18).setOrigin(0.5);
        view.title.setAlign('center');
        view.title.setFontSize('18px');
        view.title.setWordWrapWidth(L.wrapCardTitle, true);

        view.tag.setPosition(pos.x, pos.y + 34).setOrigin(0.5);
        view.tag.setFontSize('13px');
        view.tag.setText(this.buildSkillPreview(card.skills));
      }

      if (view.currentSlot === null) {
        this.setCardPosition(view, pos.x, pos.y);
        view.homeX = pos.x;
        view.homeY = pos.y;
      } else {
        const slot = this.slotViews[view.currentSlot];
        if (slot) {
          this.setCardPosition(view, slot.box.x, slot.box.y);
        }
      }
    });

    this.closeButton.setPosition(L.buttonCloseX, L.buttonCloseY);
    this.closeButton.setFontSize(L.isMobile ? '24px' : '28px');

    this.confirmButton.setPosition(L.buttonConfirmX, L.buttonConfirmY);
    this.confirmButton.setFontSize(L.isMobile ? '24px' : '28px');
  }

  // FIX: prepareCards teraz bierze WSZYSTKIE przedmioty z hiddenObjectHistory jako karty
  // Jeśli history ma >=5 przedmiotów: 3 correct (np. oznaczone isClue) + 2 distractory
  // Jeśli mniej: fallback
  prepareCards() {
    const history = Array.isArray(gameState.hiddenObjectHistory) ? gameState.hiddenObjectHistory : [];

    // Filtrowanie po sceneId i cityId
    const sceneItems = history.filter(item => {
      const matchScene = !this.sceneId || item.scene === this.sceneId;
      const matchCity = !this.cityId || item.cityId === this.cityId;
      return matchScene && matchCity;
    });

    // Deduplikacja
    const uniqueItems = [];
    const seen = new Set();
    sceneItems.forEach(item => {
      const key = `${item.id}_${item.scene}_${item.cityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    // Correct cards: oznaczone isClue=true, albo pierwsze 3 z historii
    const clueItems = uniqueItems.filter(item => item.isClue === true);
    const correctSource = clueItems.length >= 3 ? clueItems.slice(0, 3) : uniqueItems.slice(0, 3);

    this.correctCards = correctSource.map((item, index) => ({
      id: item.id || `clue_${index}`,
      item: item.item || item.name || `Clue ${index + 1}`,
      text: item.item || item.name || `Clue ${index + 1}`,
      skills: Array.isArray(item.skills) ? [...item.skills] : [],
      scene: item.scene || this.sceneId,
      cityId: item.cityId || this.cityId,
      correctOrder: index,
      isCorrect: true
    }));

    // Fallback jeśli za mało
    if (this.correctCards.length < 3) {
      const fallbackCards = this.buildFallbackCards();
      while (this.correctCards.length < 3 && fallbackCards.length > 0) {
        const next = fallbackCards.shift();
        this.correctCards.push({
          ...next,
          correctOrder: this.correctCards.length,
          isCorrect: true
        });
      }
    }

    // Distractor cards: pozostałe przedmioty z historii (nie użyte jako correct)
    const usedIds = new Set(this.correctCards.map(c => c.id));
    const remainingItems = uniqueItems.filter(item => !usedIds.has(item.id));

    this.distractorCards = [];
    remainingItems.slice(0, 3).forEach((item, index) => {
      this.distractorCards.push({
        id: `${item.id}_distractor`,
        item: item.item || item.name || 'False lead',
        text: item.item || item.name || 'False lead',
        skills: Array.isArray(item.skills) ? [...item.skills] : [],
        scene: item.scene || this.sceneId,
        cityId: item.cityId || this.cityId,
        correctOrder: -1,
        isCorrect: false
      });
    });

    // Uzupełnij do min 2 dystraktorów fallbackiem
    if (this.distractorCards.length < 2) {
      const distFallback = this.buildDistractorFallback();
      while (this.distractorCards.length < 2 && distFallback.length > 0) {
        this.distractorCards.push(distFallback.shift());
      }
    }

    // Łącznie: 3 correct + 2-3 distractor = 5-6 kart (jak w game design)
    this.availableCards = Phaser.Utils.Array.Shuffle([
      ...this.correctCards,
      ...this.distractorCards.slice(0, 3)
    ]);
  }

  buildFallbackCards() {
    return [
      {
        id: 'fallback_route',
        item: 'Route sketch',
        text: 'Route sketch',
        skills: ['Tactical planning'],
        scene: this.sceneId,
        cityId: this.cityId
      },
      {
        id: 'fallback_tools',
        item: 'Tool marks',
        text: 'Tool marks',
        skills: ['Engineering'],
        scene: this.sceneId,
        cityId: this.cityId
      },
      {
        id: 'fallback_exit',
        item: 'Exit pattern',
        text: 'Exit pattern',
        skills: ['Problem-solving'],
        scene: this.sceneId,
        cityId: this.cityId
      }
    ];
  }

  buildDistractorFallback() {
    return [
      {
        id: 'distractor_guard_note',
        item: 'Guard note',
        text: 'Guard note',
        skills: ['Observation'],
        scene: this.sceneId,
        cityId: this.cityId,
        correctOrder: -1,
        isCorrect: false
      },
      {
        id: 'distractor_wrong_turn',
        item: 'Bad route',
        text: 'Bad route',
        skills: ['Misdirection'],
        scene: this.sceneId,
        cityId: this.cityId,
        correctOrder: -1,
        isCorrect: false
      }
    ];
  }

  // Zachowane dla kompatybilności wstecznej
  buildDistractorCards(uniqueItems) {
    const usedIds = new Set(this.correctCards.map(card => card.id));
    const distractors = [];
    uniqueItems.forEach((item) => {
      if (usedIds.has(item.id)) return;
      distractors.push({
        id: `${item.id}_distractor`,
        item: item.item || 'False lead',
        text: item.item || 'False lead',
        skills: Array.isArray(item.skills) ? [...item.skills] : [],
        scene: item.scene || this.sceneId,
        cityId: item.cityId || this.cityId,
        correctOrder: -1,
        isCorrect: false
      });
    });
    if (distractors.length < 2) {
      const fallback = this.buildDistractorFallback();
      while (distractors.length < 2 && fallback.length > 0) distractors.push(fallback.shift());
    }
    return distractors.slice(0, 2);
  }

  createSlots() {
    for (let i = 0; i < 3; i += 1) {
      const label = this.add.text(0, 0, `STEP ${i + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#f0ddb0'
      }).setOrigin(0.5).setDepth(3002);

      const box = this.add.rectangle(0, 0, 340, 152, 0x241c16, 0.98)
        .setStrokeStyle(3, 0xc8a75a, 0.8)
        .setDepth(3002);

      const dropZone = this.add.zone(0, 0, 340, 152)
        .setRectangleDropZone(340, 152)
        .setData('slotIndex', i)
        .setDepth(3003);

      const text = this.add.text(0, 0, '[ empty ]', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#8d8577',
        align: 'center',
        wordWrap: { width: 280, useAdvancedWrap: true },
        lineSpacing: 4
      }).setOrigin(0.5).setDepth(3003);

      box.setInteractive({ useHandCursor: true });
      box.on('pointerdown', () => {
        this.handleSlotClick(i);
      });

      this.slotViews.push({ label, box, text, dropZone });
      this.dropZones.push(dropZone);
    }
  }

  createCardTray() {
    this.availableCards.forEach((card, index) => {
      // FIX: używamy setInteractive() bez niestandardowego hitArea
      // Phaser będzie automatycznie śledzić rozmiar prostokąta
      const bg = this.add.rectangle(0, 0, 228, 132, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x7a5c2e, 0.85)
        .setDepth(3004)
        .setInteractive({ useHandCursor: true });

      this.input.setDraggable(bg);

      const title = this.add.text(0, -18, card.item, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#3c2200',
        align: 'center',
        wordWrap: { width: 150, useAdvancedWrap: true }
      }).setOrigin(0.5).setDepth(3005);

      const tag = this.add.text(0, 34, this.buildSkillPreview(card.skills), {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#6b3f00',
        backgroundColor: '#f7ecd3',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      }).setOrigin(0.5).setDepth(3005);

      bg.cardIndex = index;
      bg.homeX = 0;
      bg.homeY = 0;
      bg.currentSlot = null;
      bg.linkedTitle = title;
      bg.linkedTag = tag;

      bg.on('pointerdown', () => this.handleCardClick(index));

      this.cardViews.push({
        bg,
        title,
        tag,
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

    this.closeButton.on('pointerdown', () => {
      this.closeScene();
    });

    this.confirmButton.on('pointerdown', () => {
      if (!this.isTimelineComplete()) {
        this.showFeedback('Place 3 cards first.', '#ff9f80');
        return;
      }
      this.confirmTheory();
    });
  }

  bindResize() {
    if (this._resizeBound) return;
    this._resizeBound = true;
    this.scale.on('resize', this.handleResize, this);
  }

  handleResize() {
    this.applyResponsiveLayout();
    this.refreshUI();
  }

  bindDragEvents() {
    if (this._listenersBound) return;
    this._listenersBound = true;

    this.input.on('dragstart', (pointer, gameObject) => {
      if (gameObject.cardIndex === undefined) return;
      gameObject.setDepth(3100);
      if (gameObject.linkedTitle) gameObject.linkedTitle.setDepth(3101);
      if (gameObject.linkedTag) gameObject.linkedTag.setDepth(3101);
      this.tweens.killTweensOf(gameObject);
    });

    this.input.on('drag', (pointer, gameObject) => {
      if (gameObject.cardIndex === undefined) return;
      this.setCardPositionByIndex(gameObject.cardIndex, pointer.x, pointer.y);
    });

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (gameObject.cardIndex === undefined) return;
      const slotIndex = dropZone.getData('slotIndex');
      if (slotIndex === undefined || slotIndex === null) return;
      this.placeCardInSlotByIndex(gameObject.cardIndex, slotIndex);
    });

    this.input.on('dragend', (pointer, gameObject, dropped) => {
      if (gameObject.cardIndex === undefined) return;
      if (!dropped) {
        this.returnCardHomeByIndex(gameObject.cardIndex);
      }
      // FIX: po drag przywracamy głębokość
      const cardView = this.getCardView(gameObject.cardIndex);
      if (cardView) {
        cardView.bg.setDepth(3004);
        cardView.title.setDepth(3005);
        cardView.tag.setDepth(3005);
      }
    });
  }

  buildSkillPreview(skills = []) {
    if (!Array.isArray(skills) || skills.length === 0) {
      return 'No skill';
    }
    return String(skills[0]);
  }

  getCardView(cardIndex) {
    return this.cardViews[cardIndex] || null;
  }

  setCardPosition(cardView, x, y) {
    if (!cardView || !this.layout) return;
    cardView.bg.setPosition(x, y);
    cardView.title.setPosition(
      cardView.title.originX === 0 ? x - this.layout.cardWidth / 2 + 16 : x,
      y + (this.layout.isMobile ? 0 : -18)
    );
    cardView.tag.setPosition(
      this.layout.isMobile ? x + this.layout.cardWidth / 2 - 14 : x,
      y + (this.layout.isMobile ? 0 : 34)
    );
  }

  setCardPositionByIndex(cardIndex, x, y) {
    const cardView = this.getCardView(cardIndex);
    if (!cardView) return;
    this.setCardPosition(cardView, x, y);
  }

  handleCardClick(cardIndex) {
    const card = this.availableCards[cardIndex];
    if (!card) return;

    const alreadyPlaced = this.placedCards.includes(cardIndex);
    if (alreadyPlaced) {
      this.showFeedback('This card is already in the timeline.', '#ffb347');
      return;
    }

    const emptySlot = this.placedCards.findIndex(v => v === null);
    if (emptySlot === -1) {
      this.showFeedback('All slots are full. Remove one first.', '#ffb347');
      return;
    }

    this.placeCardInSlotByIndex(cardIndex, emptySlot);
  }

  handleSlotClick(slotIndex) {
    const cardIndex = this.placedCards[slotIndex];
    if (cardIndex === null) {
      this.showFeedback('Drop a card here.', '#ffb347');
      return;
    }
    this.returnCardHomeByIndex(cardIndex);
  }

  placeCardInSlotByIndex(cardIndex, slotIndex) {
    const draggedCard = this.getCardView(cardIndex);
    if (!draggedCard) return;

    const fromSlot = draggedCard.currentSlot;
    const targetCardIndex = this.placedCards[slotIndex];
    const targetCard = targetCardIndex !== null ? this.getCardView(targetCardIndex) : null;

    if (fromSlot === slotIndex) {
      const slot = this.slotViews[slotIndex];
      if (slot) {
        this.setCardPosition(draggedCard, slot.box.x, slot.box.y);
      }
      return;
    }

    if (targetCard && fromSlot !== null) {
      this.placedCards[fromSlot] = targetCardIndex;
      targetCard.currentSlot = fromSlot;
      targetCard.bg.currentSlot = fromSlot;

      const oldSlot = this.slotViews[fromSlot];
      if (oldSlot) {
        this.setCardPosition(targetCard, oldSlot.box.x, oldSlot.box.y);
      }
    } else if (targetCard && fromSlot === null) {
      targetCard.currentSlot = null;
      targetCard.bg.currentSlot = null;
      this.setCardPosition(targetCard, targetCard.homeX, targetCard.homeY);
    }

    if (fromSlot !== null && this.placedCards[fromSlot] === cardIndex) {
      this.placedCards[fromSlot] = null;
      this.slotFeedback[fromSlot] = 'neutral';
    }

    this.placedCards[slotIndex] = cardIndex;
    draggedCard.currentSlot = slotIndex;
    draggedCard.bg.currentSlot = slotIndex;

    const slot = this.slotViews[slotIndex];
    if (slot) {
      this.setCardPosition(draggedCard, slot.box.x, slot.box.y);
    }

    this.slotFeedback[slotIndex] = 'neutral';
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
    cardView.bg.currentSlot = null;

    if (animate && this.layout) {
      this.tweens.add({
        targets: [cardView.bg, cardView.title, cardView.tag],
        x: {
          getEnd: (target) => {
            if (target === cardView.bg) return cardView.homeX;
            if (target === cardView.title) return cardView.title.originX === 0 ? cardView.homeX - this.layout.cardWidth / 2 + 16 : cardView.homeX;
            return this.layout.isMobile ? cardView.homeX + this.layout.cardWidth / 2 - 14 : cardView.homeX;
          }
        },
        y: {
          getEnd: (target) => {
            if (target === cardView.bg) return cardView.homeY;
            if (target === cardView.title) return cardView.homeY + (this.layout.isMobile ? 0 : -18);
            return cardView.homeY + (this.layout.isMobile ? 0 : 34);
          }
        },
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
    this.attemptsText?.setText(`Attempts left: ${this.attemptsLeft}`);
  }

  refreshSlots() {
    const colorMap = {
      neutral: { fill: 0x241c16, stroke: 0xc8a75a, text: '#8d8577' },
      green: { fill: 0x24331f, stroke: 0x3ddb6b, text: '#f7f1dc' },
      yellow: { fill: 0x3a3216, stroke: 0xf1c232, text: '#f7f1dc' },
      red: { fill: 0x331d1d, stroke: 0xe06666, text: '#f7f1dc' }
    };

    this.slotViews.forEach((slotView, index) => {
      const cardIndex = this.placedCards[index];
      const status = this.slotFeedback[index] || 'neutral';
      const colors = colorMap[status] || colorMap.neutral;

      slotView.box.setFillStyle(colors.fill, 0.98);
      slotView.box.setStrokeStyle(3, colors.stroke, 0.95);

      if (cardIndex === null) {
        slotView.text.setText('[ empty ]');
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
    const result = ['red', 'red', 'red'];
    const solutionUsed = [false, false, false];
    const guessUsed = [false, false, false];

    for (let i = 0; i < 3; i += 1) {
      const card = orderedCards[i];
      if (card?.isCorrect && card.correctOrder === i) {
        result[i] = 'green';
        solutionUsed[i] = true;
        guessUsed[i] = true;
      }
    }

    for (let i = 0; i < 3; i += 1) {
      if (guessUsed[i]) continue;
      const card = orderedCards[i];
      if (!card?.isCorrect) continue;

      for (let j = 0; j < 3; j += 1) {
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
    const orderedCards = this.placedCards
      .map(cardIndex => this.availableCards[cardIndex])
      .filter(Boolean);

    const feedback = this.evaluateGuess(orderedCards);
    this.slotFeedback = feedback;
    this.refreshSlots();

    const allGreen = feedback.every(v => v === 'green');

    if (allGreen) {
      this.finalizeTheory(orderedCards, 'exact', 60, 'Excellent reconstruction. You nailed the sequence.', '#7CFC00');
      return;
    }

    this.attemptsLeft -= 1;
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

    gameState.score = (gameState.score || 0) + score;
    saveGameState();

    this.showFeedback(`${message} +${score} score`, color);

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
        if (!exists) {
          uniqueSkills.push(normalized);
        }
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

  launchResultCommentScene() {
    saveGameState();

    if (this.sourceScene && this.scene.isSleeping(this.sourceScene)) {
      this.scene.wake(this.sourceScene);
    }

    if (this.sourceScene && this.scene.isActive(this.sourceScene)) {
      this.scene.pause(this.sourceScene);
    }

    this.scene.launch('TheoryResultCallScene', {
      sourceScene: this.sourceScene,
      mode: 'hq',
      result: gameState.reconstructedHeist?.playerTheoryResult || 'weak'
    });

    this.scene.stop();
  }

  closeScene() {
    saveGameState();

    if (this.sourceScene && this.scene.isSleeping(this.sourceScene)) {
      this.scene.wake(this.sourceScene);
    }

    if (this.sourceScene && this.scene.isPaused(this.sourceScene)) {
      this.scene.resume(this.sourceScene);
    }

    this.scene.stop();
  }

  onShutdown() {
    this.input.off('dragstart');
    this.input.off('drag');
    this.input.off('drop');
    this.input.off('dragend');
    this.scale.off('resize', this.handleResize, this);

    this.cardViews.forEach(view => {
      [view.bg, view.title, view.tag].forEach(item => {
        if (item?.removeAllListeners) item.removeAllListeners();
        if (item?.destroy) item.destroy();
      });
    });

    [
      ...this.slotViews.flatMap(v => [v.label, v.box, v.text, v.dropZone]),
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
      if (item?.removeAllListeners) item.removeAllListeners();
      if (item?.destroy) item.destroy();
    });

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];
    this.dropZones = [];
    this.placedCards = [null, null, null];
    this.slotFeedback = ['neutral', 'neutral', 'neutral'];
    this._listenersBound = false;
    this._resizeBound = false;
  }
}