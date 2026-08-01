import { gameState, saveGameState } from '../GameData.js';
import { ScoreManager } from '../ScoreManager.js';

export default class HiddenObjectsScene extends Phaser.Scene {
  constructor() {
    super('HiddenObjectsScene');

    this.sceneId = 'louvre';
    this.mapKey = 'hidden-objects-map';
    this.mapPath = '';
    this.backgroundKey = 'hidden-objects-bg';
    this.backgroundPath = '';
    this.objectLayerName = 'HiddenObjects';
    this.objectsDataKey = 'objects-data';
    this.objectsDataPath = 'assets/data/objects.json';

    this.activeCount = 6;
    this.score = 0;
    this.timeLeft = 120;
    this.returnScene = 'CityScene';
    this.returnData = {};
    this.cityId = 'paris';
    this.title = 'Crime Scene';
    this.debugZones = false;

    this.sidebarWidth = 420;
    this.mapWidth = 1920;
    this.mapHeight = 1080;
    this.playAreaWidth = 0;
    this.playAreaHeight = 0;
    this.playScale = 1;
    this.playOffsetX = 0;
    this.playOffsetY = 0;

    this.itemsData = [];
    this.itemsById = {};
    this.sceneItems = [];
    this.activeItems = [];
    this.activeItemIds = new Set();
    this.missionRelevantItemIds = new Set();

    this.hiddenZones = [];
    this.foundItems = new Set();
    this.timerEvent = null;
    this.isSceneFinished = false;

    this.resultOverlay = null;
    this.resultContainer = null;

    this.scoreManager = null;
  }

  init(data = {}) {
    this.sceneId = data.sceneId || 'louvre';
    this.mapKey = data.mapKey || this.sceneId;
    this.mapPath = data.mapPath || `assets/crimes/${this.sceneId}.json`;
this.backgroundKey = data.backgroundKey || `${this.sceneId}_bg`;
this.backgroundPath = data.backgroundPath || `assets/crimes/${this.sceneId}.jpg`;
    this.objectLayerName = data.objectLayerName || 'HiddenObjects';
    this.objectsDataKey = data.objectsDataKey || 'objects-data';
    this.objectsDataPath = data.objectsDataPath || 'assets/data/objects.json';

    this.activeCount = data.activeCount || 6;
    this.score = data.score || 0;
    this.timeLeft = data.timeLimit || 120;
    this.returnScene = data.returnScene || 'CityScene';
    this.returnData = data.returnData || { cityId: data.cityId || 'paris' };
    this.cityId = data.cityId || this.returnData.cityId || 'paris';
    this.title = data.title || 'Crime Scene';
    this.debugZones = Boolean(data.debugZones);

    this.sidebarWidth = data.sidebarWidth || 420;
    this.mapWidth = data.mapWidth || 1920;
    this.mapHeight = data.mapHeight || 1080;

    this.itemsData = [];
    this.itemsById = {};
    this.sceneItems = [];
    this.activeItems = [];
    this.activeItemIds = new Set();
    this.missionRelevantItemIds = new Set();

    this.hiddenZones = [];
    this.foundItems = new Set();
    this.timerEvent = null;
    this.isSceneFinished = false;
    this.incorrectClicks = 0;

    this.resultOverlay = null;
    this.resultContainer = null;

    this.scoreManager = new ScoreManager();

    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object') {
      gameState.specialScenesVisited = {};
    }

    if (!Array.isArray(gameState.hiddenObjectHistory)) {
      gameState.hiddenObjectHistory = [];
    }

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {
        cityId: null,
        sceneId: null,
        thiefId: null,
        thiefName: null,
        thiefSkills: [],
        allCards: [],
        correctCardIds: [],
        correctSequence: [],
        selectedCards: [],
        playerOrderedCards: [],
        playerOrderedSentences: [],
        playerFinalText: '',
        playerSkills: [],
        playerTheoryScore: 0,
        playerTheoryResult: null,
        playerSlotFeedback: [],
        playerAttemptsLeft: 2
      };
    }
  }

  preload() {
    if (this.backgroundPath && !this.textures.exists(this.backgroundKey)) {
      this.load.image(this.backgroundKey, this.backgroundPath);
    }

    if (this.mapPath && !this.cache.tilemap.exists(this.mapKey)) {
      this.load.tilemapTiledJSON(this.mapKey, this.mapPath);
    }

    if (this.objectsDataPath && !this.cache.json.exists(this.objectsDataKey)) {
      this.load.json(this.objectsDataKey, this.objectsDataPath);
    }

    if (!this.textures.exists('back')) {
      this.load.image('back', '/assets/back.png');
    }

    if (!this.cache.audio.exists('wrong')) {
      this.load.audio('wrong', 'assets/audio/wrong.mp3');
    }

    if (!this.cache.audio.exists('correct')) {
      this.load.audio('correct', 'assets/audio/correct.mp3');
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f12');

    if (this.isQuestAlreadyDone()) {
      this.scene.start(this.returnScene, {
        ...this.returnData,
        hiddenObjectsAlreadyCompleted: true,
        sceneId: this.sceneId
      });
      return;
    }

    this.loadObjectsData();
    this.pickActiveItems(this.activeCount);
    this.saveReconstructionCards();
    this.computePlayArea();
    this.createBackground();
    this.createUi();
    this.createHiddenZones();
    this.createTimer();
    this.registerMissDetection();

    this.scene.sleep('UIScene');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  isQuestAlreadyDone() {
    const visited = gameState.specialScenesVisited;
    return !!(visited && visited[this.getVisitKey()]);
  }

  loadObjectsData() {
    this.itemsData = this.cache.json.get(this.objectsDataKey) || [];
    this.itemsById = Object.fromEntries(this.itemsData.map(item => [item.id, item]));
    this.sceneItems = this.itemsData.filter(item => {
      const scenes = Array.isArray(item.scene) ? item.scene : [item.scene];
      return scenes.includes(this.sceneId);
    });
  }

  computePlayArea() {
    const { width, height } = this.scale;
    this.playAreaWidth = Math.max(200, width - this.sidebarWidth);
    this.playAreaHeight = height;

    const scaleX = this.playAreaWidth / this.mapWidth;
    const scaleY = this.playAreaHeight / this.mapHeight;
    this.playScale = Math.min(scaleX, scaleY);

    const renderedWidth = this.mapWidth * this.playScale;
    const renderedHeight = this.mapHeight * this.playScale;

    this.playOffsetX = this.sidebarWidth + (this.playAreaWidth - renderedWidth) / 2;
    this.playOffsetY = (this.playAreaHeight - renderedHeight) / 2;
  }

  normalizeSkills(value) {
    if (Array.isArray(value)) {
      return value.map(skill => String(skill).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map(skill => skill.trim()).filter(Boolean);
    }
    return [];
  }

  getCurrentThiefSkills() {
    const thiefSkills =
      gameState.currentThief?.skills ||
      gameState.currentSuspect?.skills ||
      gameState.currentCulprit?.skills ||
      gameState.currentMission?.suspectSkills ||
      [];
    return this.normalizeSkills(thiefSkills).map(skill => skill.toLowerCase());
  }

  hasSharedSkill(itemSkills = [], thiefSkills = []) {
    const normalizedItemSkills = this.normalizeSkills(itemSkills).map(skill => skill.toLowerCase());
    const normalizedThiefSkills = this.normalizeSkills(thiefSkills).map(skill => skill.toLowerCase());

    if (!normalizedItemSkills.length || !normalizedThiefSkills.length) {
      return false;
    }

    const thiefSkillSet = new Set(normalizedThiefSkills);
    return normalizedItemSkills.some(skill => thiefSkillSet.has(skill));
  }

  buildCandidatePool() {
  const thiefSkills = this.getCurrentThiefSkills();

  const pool = this.sceneItems.map(item => ({
    ...item,
    skills: this.normalizeSkills(item.skills)
  }));

  const matching = Phaser.Utils.Array.Shuffle(
    pool.filter(item => this.hasSharedSkill(item.skills, thiefSkills))
  );

  const correct = matching.slice(0, 3).map((item, index) => ({
    ...item,
    isCorrect: true,
    correctOrder: index
  }));

  const rest = Phaser.Utils.Array.Shuffle(
    pool.filter(item => !correct.some(c => c.id === item.id))
  );

  const distractors = rest.slice(0, 6 - correct.length).map(item => ({
    ...item,
    isCorrect: false,
    correctOrder: -1
  }));

  return Phaser.Utils.Array.Shuffle([...correct, ...distractors]);
}

  pickActiveItems(count = 6) {
  this.activeItems = this.buildCandidatePool().slice(0, count);
  this.activeItemIds = new Set(this.activeItems.map(item => item.id));
  this.missionRelevantItemIds = new Set(
    this.activeItems.filter(item => item.isCorrect).map(item => item.id)
  );
}

  buildReconstructionCardsFromActiveItems() {
    const thief = gameState.currentThief || null;
    const thiefSkills = this.normalizeSkills(thief?.skills);

    const allCards = this.activeItems.map((item, index) => ({
      id: item.id || `card_${index}`,
      item: item.item || `Clue ${index + 1}`,
      text: item.item || `Clue ${index + 1}`,
      skills: this.normalizeSkills(item.skills),
      cityId: this.cityId,
      scene: this.sceneId,
      isCorrect: !!item.isCorrect,
      correctOrder: Number.isInteger(item.correctOrder) ? item.correctOrder : -1,
      clueType: item.clueType || 'soft_clue',
      heistExplanation: item.heistExplanation || '',
      trueExplanation: item.trueExplanation || '',
      isRedHerring: !!item.isRedHerring
    }));

    const correctCards = allCards
      .filter(card => card.isCorrect)
      .sort((a, b) => a.correctOrder - b.correctOrder)
      .slice(0, 3);

    return {
      cityId: this.cityId,
      sceneId: this.sceneId,
      thiefId: gameState.currentThiefId || thief?.id || null,
      thiefName: thief?.name || null,
      thiefSkills,
      allCards,
      correctCardIds: correctCards.map(card => card.id),
      correctSequence: correctCards.map(card => card.id),
      selectedCards: [],
      playerOrderedCards: [],
      playerOrderedSentences: [],
      playerFinalText: '',
      playerSkills: [],
      playerTheoryScore: 0,
      playerTheoryResult: null,
      playerSlotFeedback: [],
      playerAttemptsLeft: 2
    };
  }

  saveReconstructionCards() {
    const reconstruction = this.buildReconstructionCardsFromActiveItems();
    gameState.reconstructedHeist = reconstruction;
    saveGameState();
  }

  createBackground() {
    const { height } = this.scale;
    const renderedWidth = this.mapWidth * this.playScale;
    const renderedHeight = this.mapHeight * this.playScale;

    if (this.textures.exists(this.backgroundKey)) {
      this.add.image(
        this.playOffsetX + renderedWidth / 2,
        this.playOffsetY + renderedHeight / 2,
        this.backgroundKey
      )
        .setDisplaySize(renderedWidth, renderedHeight)
        .setDepth(-10);
    }

    this.add.rectangle(this.sidebarWidth, 0, 2, height, 0xd4af37, 0.45)
      .setOrigin(0, 0)
      .setDepth(900);
  }

  createUi() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, this.sidebarWidth, height, 0x111111, 0.94)
      .setOrigin(0, 0)
      .setDepth(1000);

    this.add.rectangle(18, 18, this.sidebarWidth - 36, height - 36, 0x1b1b1f, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xc8a75a, 0.45)
      .setDepth(1000);

    this.add.text(34, 34, this.title, {
      fontFamily: 'Special Elite, Arial',
      fontSize: '26px',
      color: '#ffffff',
      wordWrap: { width: this.sidebarWidth - 90 }
    }).setDepth(1001);

    this.timerText = this.add.text(34, 88, `Time: ${this.formatTime(this.timeLeft)}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffd966'
    }).setDepth(1001);

    this.scoreText = this.add.text(220, 88, `Score: ${this.score}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#7CFC00'
    }).setDepth(1001);

    this.missesText = this.add.text(34, 114, `Misses: ${this.incorrectClicks}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff8a8a'
    }).setDepth(1001);

    this.add.text(34, 142, 'Find these objects:', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(1001);

    this.listText = this.add.text(34, 170, this.buildListText(), {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f2f2f2',
      lineSpacing: 8,
      wordWrap: { width: this.sidebarWidth - 68 }
    }).setDepth(1001);

    this.messageText = this.add.text(34, height - 170, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd966',
      wordWrap: { width: this.sidebarWidth - 68 },
      lineSpacing: 6
    }).setDepth(1001);

    if (this.textures.exists('back')) {
      this.backBtn = this.add.image(width - 70, 44, 'back')
        .setDisplaySize(96, 56)
        .setInteractive({ useHandCursor: true })
        .setDepth(1001);
    } else {
      this.backBtn = this.add.text(width - 120, 24, 'Back', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#222222',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
        .setInteractive({ useHandCursor: true })
        .setDepth(1001);
    }

    this.backBtn.on('pointerdown', () => {
      this.abandonGame();
    });
  }

  createHiddenZones() {
    const map = this.make.tilemap({ key: this.mapKey });
    const objectLayer = map.getObjectLayer(this.objectLayerName);

    if (!objectLayer) {
      console.error(`Brak warstwy ${this.objectLayerName} w pliku mapy`);
      return;
    }

    this.hiddenZones = [];

    objectLayer.objects.forEach((obj) => {
      const id = this.getTiledProperty(obj, 'id') || obj.name;

      if (!id || !this.activeItemIds.has(id)) {
        return;
      }

      const itemData = this.itemsById[id];
      if (!itemData) {
        console.warn(`Brak itemData dla id=${id}`);
        return;
      }

      const bounds = this.getObjectBounds(obj);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        console.warn(`Nieprawidłowe bounds dla id=${id}`, obj);
        return;
      }

      const zone = this.add.rectangle(
        this.playOffsetX + (bounds.x * this.playScale),
        this.playOffsetY + (bounds.y * this.playScale),
        Math.max(8, bounds.width * this.playScale),
        Math.max(8, bounds.height * this.playScale),
        0xffff00,
        this.debugZones ? 0.18 : 0
      );

      zone.setInteractive();
      zone.setData('id', id);
      zone.setData('itemData', itemData);
      zone.setData('found', false);
      zone.setData('isStaticRedHerring', !!itemData.isRedHerring);
      zone.setData('clueType', itemData.clueType || 'soft_clue');

      if (this.debugZones) {
        zone.setStrokeStyle(2, 0xff0000, 0.85);
      }

      zone.on('pointerdown', (pointer) => {
        if (pointer && typeof pointer.event?.stopPropagation === 'function') {
          pointer.event.stopPropagation();
        }
        this.handleHiddenObjectClick(zone);
      });

      this.hiddenZones.push(zone);
    });
  }

  getObjectBounds(obj) {
    if (obj.polygon && obj.polygon.length > 0) {
      const xs = obj.polygon.map(p => p.x);
      const ys = obj.polygon.map(p => p.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: obj.x + minX + (maxX - minX) / 2,
        y: obj.y + minY + (maxY - minY) / 2,
        width: maxX - minX,
        height: maxY - minY
      };
    }

    if (obj.polyline && obj.polyline.length > 0) {
      const xs = obj.polyline.map(p => p.x);
      const ys = obj.polyline.map(p => p.y);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      return {
        x: obj.x + minX + (maxX - minX) / 2,
        y: obj.y + minY + (maxY - minY) / 2,
        width: Math.max(8, maxX - minX),
        height: Math.max(8, maxY - minY)
      };
    }

    return {
      x: obj.x + obj.width / 2,
      y: obj.y + obj.height / 2,
      width: obj.width,
      height: obj.height
    };
  }

  handleHiddenObjectClick(zone) {
    if (!zone || zone.getData('found') || this.isSceneFinished) {
      return;
    }

    const id = zone.getData('id');
    const itemData = zone.getData('itemData');

    if (!itemData) {
      console.warn(`Nie znaleziono itemData dla obiektu: ${id}`);
      return;
    }

    zone.setData('found', true);
    zone.setFillStyle(0x555555, 0.55);
    zone.setStrokeStyle(2, 0x777777, 0.7);

    this.playSfx('correct', { volume: 0.45 });
    this.pulseZone(zone, 0x7CFC00);
    this.flashScreen(0x7CFC00, 0.08, 140);

    this.foundItems.add(id);

    const isStaticRedHerring = !!itemData.isRedHerring;
    const isMissionRelevant = this.missionRelevantItemIds.has(id);
    const clueType = itemData.clueType || 'soft_clue';

    let points = 0;

    if (isStaticRedHerring) {
      points = 5;
    } else if (!isMissionRelevant) {
      points = 5;
    } else if (clueType === 'hard_clue') {
      points = 25;
    } else {
      points = 15;
    }

    this.score += points;
    this.scoreManager.addHiddenObjectScore(points);

    this.scoreText.setText(`Score: ${this.score}`);
    this.refreshList();
    this.bumpText(this.scoreText);

    if (!isStaticRedHerring && isMissionRelevant) {
      this.emitClueFound(itemData);
      this.storeHiddenObjectClue(itemData, clueType);
      this.showMessage(`Evidence secured: ${itemData.item} (+${points})`, '#7CFC00');
    } else {
      this.showMessage(`Found: ${itemData.item} (+${points})`, '#ffd966');
    }

    if (this.foundItems.size >= this.activeItems.length) {
      this.finishScene(true);
    }
  }

  emitClueFound(itemData) {
    const suspectAffinity = itemData.suspectAffinity || [];
    const affinityWeight = itemData.affinityWeight || 0;

    this.events.emit('clue-found', {
      id: itemData.id,
      item: itemData.item,
      skills: this.normalizeSkills(itemData.skills),
      suspectAffinity,
      affinityWeight,
      clueType: itemData.clueType || 'soft_clue'
    });
  }

  storeHiddenObjectClue(itemData, clueType = 'soft_clue') {
    if (!itemData) return;

    if (!Array.isArray(gameState.hiddenObjectHistory)) {
      gameState.hiddenObjectHistory = [];
    }

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    const alreadyStoredObject = gameState.hiddenObjectHistory.some(
      entry =>
        entry?.id === itemData.id &&
        entry?.scene === this.sceneId &&
        entry?.cityId === this.cityId
    );

    if (!alreadyStoredObject) {
      gameState.hiddenObjectHistory.push({
        id: itemData.id,
        item: itemData.item,
        scene: this.sceneId,
        cityId: this.cityId,
        clueType,
        skills: this.normalizeSkills(itemData.skills),
        heistExplanation: itemData.heistExplanation || '',
        trueExplanation: itemData.trueExplanation || '',
        foundAt: Date.now()
      });
    }

    const skills = this.normalizeSkills(itemData.skills);

    skills.forEach((skill) => {
      const normalizedSkill = String(skill).trim();
      if (!normalizedSkill) return;

      const alreadyExists = gameState.cluesCollected.some(
        clue =>
          clue?.type === 'suspect' &&
          clue?.category === 'skills' &&
          String(clue?.value).toLowerCase() === normalizedSkill.toLowerCase()
      );

      if (!alreadyExists) {
        gameState.cluesCollected.push({
          type: 'suspect',
          category: 'skills',
          value: normalizedSkill,
          source: 'hidden_object',
          itemId: itemData.id,
          cityId: this.cityId,
          text: `Skill: ${normalizedSkill}`
        });
      }
    });

    saveGameState();
  }

  buildListText() {
    return this.activeItems.map(item => {
      const found = this.foundItems.has(item.id);
      return `${found ? '✓' : '•'} ${item.item}`;
    }).join('\n');
  }

  refreshList() {
    this.listText.setText(this.buildListText());
  }

  createTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isSceneFinished) return;

        this.timeLeft -= 1;
        this.timerText.setText(`Time: ${this.formatTime(this.timeLeft)}`);

        if (this.timeLeft <= 0) {
          this.finishScene(false);
        }
      }
    });
  }

  finishScene(success) {
    if (this.isSceneFinished) return;
    this.isSceneFinished = true;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.hiddenZones.forEach(zone => {
      if (zone.input && zone.input.enabled) {
        zone.disableInteractive();
      }
    });

    this.markSceneVisited(success);

    if (success) {
      const timeBonus = this.timeLeft * 2;
      this.score += timeBonus;
      this.scoreManager.addHiddenObjectScore(timeBonus);

      this.showMessage(`Crime scene processed. Time bonus +${timeBonus}`, '#7CFC00');
      this.showSuccessOverlay();
    } else {
      this.playSfx('wrong', { volume: 0.5 });
      this.showMessage('Time is up.', '#ff6b6b');
      this.showFailureOverlay();
    }
  }

  showSuccessOverlay() {
    const { width, height } = this.scale;
    const panelWidth = 700;
    const panelHeight = 420;
    const centerX = this.sidebarWidth + (width - this.sidebarWidth) / 2;
    const centerY = height / 2;
    const remainingTimeBonus = this.timeLeft * 2;
    const finalScore = this.score;

    this.resultOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.add.container(centerX, centerY).setDepth(3001).setAlpha(0);

    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x181511, 0.98)
      .setStrokeStyle(3, 0xd4af37, 0.9);

    const title = this.add.text(0, -155, 'Crime Scene Complete', {
      fontFamily: 'Special Elite, Arial',
      fontSize: '38px',
      color: '#f8e7b9',
      align: 'center'
    }).setOrigin(0.5);

    const subtitle = this.add.text(0, -104, 'The forensic sweep is finished.', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#f2f2f2',
      align: 'center'
    }).setOrigin(0.5);

    const stats = this.add.text(0, -5,
      [
        `Objects found: ${this.foundItems.size}/${this.activeItems.length}`,
        `Misses: ${this.incorrectClicks}`,
        `Time left: ${this.formatTime(this.timeLeft)}`,
        `Time bonus: +${remainingTimeBonus}`,
        `Final score: ${finalScore}`
      ].join('\n'),
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5);

    const note = this.add.text(0, 112,
      'Evidence logged. Return to the city and continue the investigation.',
      {
        fontFamily: 'Arial',
        fontSize: '19px',
        color: '#d8d8d8',
        align: 'center',
        wordWrap: { width: panelWidth - 100 }
      }
    ).setOrigin(0.5);

    const continueBtnBg = this.add.rectangle(0, 170, 260, 56, 0x8b6b2f, 1)
      .setStrokeStyle(2, 0xf0d48a, 0.9)
      .setInteractive({ useHandCursor: true });

    const continueBtnText = this.add.text(0, 170, 'Continue', {
      fontFamily: 'Press Start 2P, Arial',
      fontSize: '16px',
      color: '#fff7dc'
    }).setOrigin(0.5);

    continueBtnBg.on('pointerover', () => continueBtnBg.setFillStyle(0xa07a34, 1));
    continueBtnBg.on('pointerout', () => continueBtnBg.setFillStyle(0x8b6b2f, 1));
    continueBtnBg.on('pointerdown', () => {
      this.playSfx('correct', { volume: 0.35 });
      this.scene.start(this.returnScene, {
        ...this.returnData,
        hiddenObjectsSuccess: true,
        hiddenObjectsScore: finalScore,
        incorrectClicks: this.incorrectClicks,
        foundItems: Array.from(this.foundItems),
        sceneId: this.sceneId
      });
    });

    this.resultContainer.add([
      panel,
      title,
      subtitle,
      stats,
      note,
      continueBtnBg,
      continueBtnText
    ]);

    this.tweens.add({
      targets: this.resultOverlay,
      alpha: 1,
      duration: 250,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 8,
      duration: 320,
      ease: 'Back.Out'
    });
  }

  showFailureOverlay() {
    const { width, height } = this.scale;
    const panelWidth = 680;
    const panelHeight = 340;
    const centerX = this.sidebarWidth + (width - this.sidebarWidth) / 2;
    const centerY = height / 2;

    this.resultOverlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.68)
      .setOrigin(0, 0)
      .setDepth(3000)
      .setAlpha(0);

    this.resultContainer = this.add.container(centerX, centerY).setDepth(3001).setAlpha(0);

    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1c1212, 0.98)
      .setStrokeStyle(3, 0xa44a4a, 0.95);

    const title = this.add.text(0, -95, 'Crime Scene Lost', {
      fontFamily: 'Special Elite, Arial',
      fontSize: '36px',
      color: '#ffb3b3'
    }).setOrigin(0.5);

    const body = this.add.text(0, -10,
      [
        'You ran out of time before the scene was fully processed.',
        '',
        `Objects found: ${this.foundItems.size}/${this.activeItems.length}`,
        `Misses: ${this.incorrectClicks}`,
        `Score: ${this.score}`
      ].join('\n'),
      {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#f4f4f4',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: panelWidth - 100 }
      }
    ).setOrigin(0.5);

    const btnBg = this.add.rectangle(0, 112, 240, 54, 0x6b2a2a, 1)
      .setStrokeStyle(2, 0xd88b8b, 0.9)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 112, 'Return', {
      fontFamily: 'Press Start 2P, Arial',
      fontSize: '16px',
      color: '#fff1f1'
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x823333, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x6b2a2a, 1));
    btnBg.on('pointerdown', () => {
      this.scene.start(this.returnScene, {
        ...this.returnData,
        hiddenObjectsSuccess: false,
        hiddenObjectsScore: this.score,
        incorrectClicks: this.incorrectClicks,
        foundItems: Array.from(this.foundItems),
        sceneId: this.sceneId
      });
    });

    this.resultContainer.add([panel, title, body, btnBg, btnText]);

    this.tweens.add({
      targets: this.resultOverlay,
      alpha: 1,
      duration: 220,
      ease: 'Power2'
    });

    this.tweens.add({
      targets: this.resultContainer,
      alpha: 1,
      y: centerY - 6,
      duration: 280,
      ease: 'Back.Out'
    });
  }

  abandonGame() {
    if (this.isSceneFinished) return;
    this.isSceneFinished = true;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.restoreSourceScene();

    this.scene.start(this.returnScene, {
      ...this.returnData,
      hiddenObjectsAborted: true,
      hiddenObjectsSuccess: false,
      hiddenObjectsScore: this.score,
      incorrectClicks: this.incorrectClicks,
      foundItems: Array.from(this.foundItems),
      sceneId: this.sceneId
    });
  }

  registerMissDetection() {
    this.input.on('pointerdown', this.handleGlobalPointerDown, this);
  }

  handleGlobalPointerDown(pointer, currentlyOver) {
    if (this.isSceneFinished) return;
    if (Array.isArray(currentlyOver) && currentlyOver.length > 0) return;
    if (pointer.x < this.sidebarWidth) return;

    this.incorrectClicks += 1;

    const missPenalty = 3;
    this.score = Math.max(0, this.score - missPenalty);
    this.scoreManager.addHiddenObjectScore(-missPenalty);

    if (this.missesText) {
      this.missesText.setText(`Misses: ${this.incorrectClicks}`);
    }

    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score}`);
    }

    this.playSfx('wrong', { volume: 0.38 });
    this.bumpText(this.missesText);
    this.bumpText(this.scoreText);
    this.flashScreen(0xff4d4d, 0.12, 120);
    this.showMessage(`No useful evidence there. (-${missPenalty})`, '#ff8a8a');
  }

  playSfx(key, config = {}) {
    if (!this.sound || !this.cache.audio.exists(key)) return;
    this.sound.play(key, config);
  }

  flashScreen(color = 0xffffff, alpha = 0.1, duration = 120) {
    const { width, height } = this.scale;
    const flash = this.add.rectangle(0, 0, width, height, color, alpha)
      .setOrigin(0, 0)
      .setDepth(2500);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      ease: 'Linear',
      onComplete: () => flash.destroy()
    });
  }

  pulseZone(zone, color = 0x7CFC00) {
    if (!zone) return;

    const originalScaleX = zone.scaleX || 1;
    const originalScaleY = zone.scaleY || 1;

    zone.setStrokeStyle(3, color, 1);

    this.tweens.add({
      targets: zone,
      scaleX: originalScaleX * 1.08,
      scaleY: originalScaleY * 1.08,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });
  }

  bumpText(target) {
    if (!target) return;

    this.tweens.killTweensOf(target);
    target.setScale(1);

    this.tweens.add({
      targets: target,
      scale: 1.08,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out'
    });
  }

  handleShutdown() {
    if (this.input) {
      this.input.off('pointerdown', this.handleGlobalPointerDown, this);
    }

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }
  }

  markSceneVisited(success = false) {
    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object') {
      gameState.specialScenesVisited = {};
    }

    if (!gameState.specialScenesCompleted || typeof gameState.specialScenesCompleted !== 'object') {
      gameState.specialScenesCompleted = {};
    }

    const visitKey = this.getVisitKey();
    gameState.specialScenesVisited[visitKey] = true;
    if (success) {
      gameState.specialScenesCompleted[visitKey] = true;
    }
    saveGameState();
  }

  getVisitKey() {
    const missionId = gameState.currentMission?.id;
    const missionCity = gameState.currentMission?.city || this.cityId || 'unknown';
    const artifact = gameState.currentMission?.artifact || gameState.currentArtifact || 'artifact';

    if (missionId) {
      return `${this.sceneId}_${missionId}`;
    }

    return `${this.sceneId}_${missionCity}_${artifact}`;
  }

  getTiledProperty(obj, propertyName) {
    if (!obj.properties) return null;
    const prop = obj.properties.find(p => p.name === propertyName);
    return prop ? prop.value : null;
  }

  showMessage(text, color = '#ffd966') {
    if (!this.messageText) return;

    this.messageText.setText(text);
    this.messageText.setColor(color);
    this.messageText.setAlpha(1);

    this.tweens.killTweensOf(this.messageText);

    this.tweens.add({
      targets: this.messageText,
      alpha: 0,
      duration: 2200,
      delay: 1000,
      ease: 'Linear'
    });
  }

  formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
}