import { gameState, saveGameState } from './GameData.js';

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

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];

    this.selectedCardIndex = null;
    this.placedCards = [null, null, null];

    this.correctCards = [];
    this.distractorCards = [];
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

    this.closeButton = null;
    this.confirmButton = null;

    this.availableCards = [];
    this.cardViews = [];
    this.slotViews = [];

    this.selectedCardIndex = null;
    this.placedCards = [null, null, null];

    this.correctCards = [];
    this.distractorCards = [];
  }

  create() {
    this.prepareCards();

    const { width, height } = this.scale;

    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.82)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setInteractive();

    this.panel = this.add.rectangle(width / 2, height / 2, 1400, 820, 0x17130f, 0.98)
      .setStrokeStyle(4, 0xd4af37, 0.85)
      .setDepth(3001);

    this.titleText = this.add.text(width / 2, 80, 'Reconstruct the heist', {
      fontFamily: 'Special Elite',
      fontSize: '42px',
      color: '#f6f1df'
    })
      .setOrigin(0.5)
      .setDepth(3002);

    this.subtitleText = this.add.text(
      width / 2,
      130,
      'Build the sequence of the theft by placing 3 clue cards in order.',
      {
        fontFamily: 'Special Elite',
        fontSize: '22px',
        color: '#e8d7a8',
        align: 'center',
        wordWrap: { width: 1000 }
      }
    )
      .setOrigin(0.5)
      .setDepth(3002);

    this.feedbackText = this.add.text(width / 2, 748, '', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#ffd966',
      align: 'center',
      wordWrap: { width: 1000 }
    })
      .setOrigin(0.5)
      .setDepth(3002);

    this.createSlots();
    this.createCardTray();
    this.createButtons();
    this.refreshUI();
  }

  prepareCards() {
    const reconstruction = gameState.reconstructedHeist;
    const history = Array.isArray(gameState.hiddenObjectHistory) ? gameState.hiddenObjectHistory : [];

    let sourceItems = [];

    if (reconstruction?.items && Array.isArray(reconstruction.items) && reconstruction.items.length > 0) {
      sourceItems = reconstruction.items
        .filter(item => !this.sceneId || item.scene === this.sceneId)
        .filter(item => !this.cityId || item.cityId === this.cityId);
    }

    if (sourceItems.length === 0) {
      sourceItems = history
        .filter(item => !this.sceneId || item.scene === this.sceneId)
        .filter(item => !this.cityId || item.cityId === this.cityId);
    }

    const uniqueItems = [];
    const seen = new Set();

    sourceItems.forEach(item => {
      const key = `${item.id}_${item.scene}_${item.cityId}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    const primaryItems = uniqueItems.slice(0, 3);

    this.correctCards = primaryItems.map((item, index) => ({
      id: item.id || `clue_${index}`,
      item: item.item || `Clue ${index + 1}`,
      text:
        item.heistExplanation ||
        item.trueExplanation ||
        `${item.item || 'This clue'} played some part in the theft.`,
      skills: Array.isArray(item.skills) ? [...item.skills] : [],
      scene: item.scene || this.sceneId,
      cityId: item.cityId || this.cityId,
      correctOrder: index,
      isCorrect: true
    }));

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

    this.distractorCards = this.buildDistractorCards(uniqueItems);
    this.availableCards = Phaser.Utils.Array.Shuffle([
      ...this.correctCards,
      ...this.distractorCards
    ]);
  }

  buildFallbackCards() {
    return [
      {
        id: 'fallback_route',
        item: 'Route sketch',
        text: 'The thief first studied the location and picked the safest route through the building.',
        skills: ['Tactical planning', 'Surveillance'],
        scene: this.sceneId,
        cityId: this.cityId
      },
      {
        id: 'fallback_tools',
        item: 'Tool marks',
        text: 'They then used specialized tools and technical know-how to bypass security.',
        skills: ['Engineering', 'Technical knowledge'],
        scene: this.sceneId,
        cityId: this.cityId
      },
      {
        id: 'fallback_exit',
        item: 'Exit pattern',
        text: 'Finally, they left quickly using timing, observation, and problem-solving.',
        skills: ['Problem-solving', 'Investigation'],
        scene: this.sceneId,
        cityId: this.cityId
      }
    ];
  }

  buildDistractorCards(uniqueItems) {
    const distractors = [];
    const usedIds = new Set(this.correctCards.map(card => card.id));

    uniqueItems.forEach((item) => {
      if (usedIds.has(item.id)) return;

      distractors.push({
        id: `${item.id}_distractor`,
        item: item.item || 'False lead',
        text:
          item.trueExplanation ||
          `This clue looked important, but it probably did not shape the heist directly.`,
        skills: Array.isArray(item.skills) ? [...item.skills] : [],
        scene: item.scene || this.sceneId,
        cityId: item.cityId || this.cityId,
        correctOrder: -1,
        isCorrect: false
      });
    });

    if (distractors.length < 2) {
      distractors.push(
        {
          id: 'distractor_guard_note',
          item: 'Guard note',
          text: 'This detail looked suspicious, but it may only describe routine museum confusion.',
          skills: ['Observation'],
          scene: this.sceneId,
          cityId: this.cityId,
          correctOrder: -1,
          isCorrect: false
        },
        {
          id: 'distractor_wrong_turn',
          item: 'Bad route',
          text: 'This path sounds dramatic, but it would have led the thief straight into trouble.',
          skills: ['Misdirection'],
          scene: this.sceneId,
          cityId: this.cityId,
          correctOrder: -1,
          isCorrect: false
        }
      );
    }

    return distractors.slice(0, 2);
  }

  createSlots() {
    const { width } = this.scale;
    const slotY = 255;
    const startX = width / 2 - 420;
    const gap = 420;

    for (let i = 0; i < 3; i += 1) {
      const x = startX + (i * gap);

      const label = this.add.text(x, 180, `STEP ${i + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#f0ddb0'
      })
        .setOrigin(0.5)
        .setDepth(3002);

      const box = this.add.rectangle(x, slotY, 340, 140, 0x241c16, 0.98)
        .setStrokeStyle(3, 0xc8a75a, 0.8)
        .setDepth(3002)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(x, slotY, '[ empty ]', {
        fontFamily: 'Special Elite',
        fontSize: '24px',
        color: '#8d8577',
        align: 'center',
        wordWrap: { width: 280 }
      })
        .setOrigin(0.5)
        .setDepth(3003);

      box.on('pointerdown', () => {
        this.handleSlotClick(i);
      });

      this.slotViews.push({ label, box, text });
    }
  }

  createCardTray() {
    const startX = 180;
    const startY = 470;
    const cardWidth = 230;
    const cardHeight = 190;
    const gap = 250;

    this.availableCards.forEach((card, index) => {
      const x = startX + (index * gap);
      const y = startY;

      const bg = this.add.rectangle(x, y, cardWidth, cardHeight, 0xf1e2bf, 1)
        .setStrokeStyle(3, 0x7a5c2e, 0.85)
        .setDepth(3002)
        .setInteractive({ useHandCursor: true });

      const title = this.add.text(x, y - 58, card.item, {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#3c2200',
        align: 'center',
        wordWrap: { width: 180 }
      })
        .setOrigin(0.5)
        .setDepth(3003);

      const body = this.add.text(x, y + 2, card.text, {
        fontFamily: 'Special Elite',
        fontSize: '16px',
        color: '#151515',
        align: 'center',
        wordWrap: { width: 190 },
        lineSpacing: 4
      })
        .setOrigin(0.5)
        .setDepth(3003);

      const tag = this.add.text(x, y + 74, this.buildSkillPreview(card.skills), {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#6b3f00',
        backgroundColor: '#f7ecd3',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
        .setOrigin(0.5)
        .setDepth(3003);

      bg.on('pointerdown', () => {
        this.handleCardClick(index);
      });

      this.cardViews.push({ bg, title, body, tag });
    });
  }

  createButtons() {
    const { width } = this.scale;

    this.closeButton = this.add.text(width / 2 - 180, 690, '[ CLOSE ]', {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#d0d0d0',
      backgroundColor: '#222222',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    })
      .setOrigin(0.5)
      .setDepth(3003)
      .setInteractive({ useHandCursor: true });

    this.confirmButton = this.add.text(width / 2 + 220, 690, '[ CONFIRM THEORY ]', {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#666666',
      backgroundColor: '#222222',
      padding: { left: 18, right: 18, top: 10, bottom: 10 }
    })
      .setOrigin(0.5)
      .setDepth(3003)
      .setInteractive({ useHandCursor: true });

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

  buildSkillPreview(skills = []) {
    if (!Array.isArray(skills) || skills.length === 0) {
      return 'No skill tag';
    }

    return skills.slice(0, 2).join(' • ');
  }

  handleCardClick(cardIndex) {
    const card = this.availableCards[cardIndex];
    if (!card) return;

    const alreadyPlaced = this.placedCards.includes(cardIndex);
    if (alreadyPlaced) {
      this.showFeedback('This card is already in the timeline.', '#ffb347');
      return;
    }

    this.selectedCardIndex = cardIndex;
    this.refreshCards();
    this.showFeedback('Card selected. Now click a STEP slot above.', '#ffd966');
  }

  handleSlotClick(slotIndex) {
    if (this.selectedCardIndex === null) {
      if (this.placedCards[slotIndex] !== null) {
        this.removeCardFromSlot(slotIndex);
      } else {
        this.showFeedback('Select a card first.', '#ffb347');
      }
      return;
    }

    this.placedCards[slotIndex] = this.selectedCardIndex;
    this.selectedCardIndex = null;

    this.refreshUI();

    if (this.isTimelineComplete()) {
      this.showFeedback('Theory assembled. Confirm when ready.', '#7CFC00');
    } else {
      this.showFeedback('Card placed.', '#ffd966');
    }
  }

  removeCardFromSlot(slotIndex) {
    this.placedCards[slotIndex] = null;
    this.refreshUI();
    this.showFeedback('Card removed from the timeline.', '#ffb347');
  }

  refreshUI() {
    this.refreshSlots();
    this.refreshCards();
    this.refreshConfirmButton();
  }

  refreshSlots() {
    this.slotViews.forEach((slotView, index) => {
      const cardIndex = this.placedCards[index];

      if (cardIndex === null) {
        slotView.box.setFillStyle(0x241c16, 0.98);
        slotView.box.setStrokeStyle(3, 0xc8a75a, 0.8);
        slotView.text.setText('[ empty ]');
        slotView.text.setColor('#8d8577');
        return;
      }

      const card = this.availableCards[cardIndex];
      slotView.box.setFillStyle(0x314226, 0.98);
      slotView.box.setStrokeStyle(3, 0xd4af37, 0.95);
      slotView.text.setText(card?.item || '[ clue ]');
      slotView.text.setColor('#f7f1dc');
    });
  }

  refreshCards() {
    this.cardViews.forEach((view, index) => {
      const isSelected = this.selectedCardIndex === index;
      const isPlaced = this.placedCards.includes(index);

      if (isPlaced) {
        view.bg.setFillStyle(0x5a5a5a, 0.42);
        view.bg.setStrokeStyle(2, 0x9a9a9a, 0.3);
        view.title.setAlpha(0.45);
        view.body.setAlpha(0.35);
        view.tag.setAlpha(0.35);
      } else if (isSelected) {
        view.bg.setFillStyle(0xfff0c2, 1);
        view.bg.setStrokeStyle(4, 0xd4af37, 1);
        view.title.setAlpha(1);
        view.body.setAlpha(1);
        view.tag.setAlpha(1);
      } else {
        view.bg.setFillStyle(0xf1e2bf, 1);
        view.bg.setStrokeStyle(3, 0x7a5c2e, 0.85);
        view.title.setAlpha(1);
        view.body.setAlpha(1);
        view.tag.setAlpha(1);
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

    const orderedSentences = orderedCards.map(card => card.text);
    const orderedItems = orderedCards.map(card => ({
      id: card.id,
      item: card.item,
      text: card.text,
      skills: Array.isArray(card.skills) ? [...card.skills] : [],
      isCorrect: !!card.isCorrect,
      correctOrder: card.correctOrder
    }));

    const finalText = orderedSentences.join(' ');
    const orderScore = this.calculateTheoryScore(orderedCards);
    const uniqueSkills = this.collectUniqueSkills(orderedCards);

    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {};
    }

    gameState.reconstructedHeist.playerOrderedCards = orderedItems;
    gameState.reconstructedHeist.playerOrderedSentences = orderedSentences;
    gameState.reconstructedHeist.playerFinalText = finalText;
    gameState.reconstructedHeist.playerSkills = uniqueSkills;
    gameState.reconstructedHeist.playerTheoryScore = orderScore.score;
    gameState.reconstructedHeist.playerTheoryResult = orderScore.label;

    this.appendTheoryToNotes(finalText, uniqueSkills, orderScore.label);
    this.storeTheorySkills(uniqueSkills);

    gameState.score = (gameState.score || 0) + orderScore.score;
    saveGameState();

    this.showFeedback(
      `${orderScore.message} +${orderScore.score} score`,
      orderScore.color
    );

this.time.delayedCall(900, () => {
  this.launchResultCommentScene();
});
  }

  calculateTheoryScore(orderedCards) {
    const exactMatch = orderedCards.every((card, index) => card.isCorrect && card.correctOrder === index);
    const correctCardsCount = orderedCards.filter(card => card.isCorrect).length;
    const inAnyCorrectOrderCount = orderedCards.filter(card => card.isCorrect && card.correctOrder >= 0).length;

    if (exactMatch) {
      return {
        score: 60,
        label: 'exact',
        message: 'Excellent reconstruction. You nailed the sequence.',
        color: '#7CFC00'
      };
    }

    if (correctCardsCount === 3) {
      return {
        score: 40,
        label: 'close',
        message: 'Good theory. The clues are right, but the order is off.',
        color: '#ffd966'
      };
    }

    if (inAnyCorrectOrderCount >= 2) {
      return {
        score: 25,
        label: 'partial',
        message: 'Promising lead. Part of the heist makes sense.',
        color: '#ffcf66'
      };
    }

    return {
      score: 10,
      label: 'weak',
      message: 'Theory recorded, but the sequence still needs work.',
      color: '#ff9f80'
    };
  }

  collectUniqueSkills(cards) {
    const uniqueSkills = [];

    cards.forEach(card => {
      const skills = Array.isArray(card.skills) ? card.skills : [];
      skills.forEach(skill => {
        const normalized = String(skill).trim();
        if (!normalized) return;

        const exists = uniqueSkills.some(
          existing => existing.toLowerCase() === normalized.toLowerCase()
        );

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
    const skillLine = uniqueSkills.length > 0
      ? `\nLikely skills: ${uniqueSkills.join(', ')}.`
      : '';

    const noteBlock = `${header}\n${finalText}${skillLine}`;
    const existingNotes = typeof gameState.playerNotes === 'string' ? gameState.playerNotes : '';

    if (!existingNotes.includes(finalText)) {
      gameState.playerNotes = existingNotes
        ? `${existingNotes}\n\n${noteBlock}`
        : noteBlock;
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
}