import { gameState, saveGameState } from './GameData.js';

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
  }

  init(data = {}) {
    this.sceneId = data.sceneId || 'louvre';
    this.mapKey = data.mapKey || this.sceneId;
    this.mapPath = data.mapPath || 'assets/crimes/luvre.json';
    this.backgroundKey = data.backgroundKey || `${this.sceneId}_bg`;
    this.backgroundPath = data.backgroundPath || 'assets/crimes/luvre.jpg';
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

    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object') {
      gameState.specialScenesVisited = {};
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
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f0f12');

    this.loadObjectsData();
    this.pickActiveItems(this.activeCount);
    this.computePlayArea();
    this.createBackground();
    this.createUi();
    this.createHiddenZones();
    this.createTimer();
  }

  loadObjectsData() {
    this.itemsData = this.cache.json.get(this.objectsDataKey) || [];
    this.itemsById = Object.fromEntries(this.itemsData.map(item => [item.id, item]));
    this.sceneItems = this.itemsData.filter(item => item.scene === this.sceneId);
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

  getCurrentThiefSkills() {
    const thiefSkills =
      gameState.currentThief?.skills ||
      gameState.currentSuspect?.skills ||
      gameState.currentCulprit?.skills ||
      gameState.currentMission?.suspectSkills ||
      [];

    return Array.isArray(thiefSkills)
      ? thiefSkills.map(skill => String(skill).trim().toLowerCase())
      : [];
  }

  hasSharedSkill(itemSkills = [], thiefSkills = []) {
    if (!Array.isArray(itemSkills) || !Array.isArray(thiefSkills)) {
      return false;
    }

    const thiefSkillSet = new Set(
      thiefSkills.map(skill => String(skill).trim().toLowerCase())
    );

    return itemSkills.some(skill =>
      thiefSkillSet.has(String(skill).trim().toLowerCase())
    );
  }

  pickActiveItems(count = 6) {
    const scenePool = [...this.sceneItems];
    const thiefSkills = this.getCurrentThiefSkills();

    this.missionRelevantItemIds = new Set();

    if (thiefSkills.length === 0) {
      Phaser.Utils.Array.Shuffle(scenePool);
      this.activeItems = scenePool.slice(0, Math.min(count, scenePool.length));
      this.activeItemIds = new Set(this.activeItems.map(item => item.id));
      return;
    }

    const staticRedHerrings = scenePool.filter(item => !!item.isRedHerring);
    const normalItems = scenePool.filter(item => !item.isRedHerring);

    const matchingItems = normalItems.filter(item =>
      this.hasSharedSkill(item.skills || [], thiefSkills)
    );

    const nonMatchingItems = normalItems.filter(item =>
      !this.hasSharedSkill(item.skills || [], thiefSkills)
    );

    Phaser.Utils.Array.Shuffle(matchingItems);
    Phaser.Utils.Array.Shuffle(nonMatchingItems);
    Phaser.Utils.Array.Shuffle(staticRedHerrings);

    const relevant = matchingItems.slice(0, Math.min(3, matchingItems.length));
    relevant.forEach(item => this.missionRelevantItemIds.add(item.id));

    const fillerPool = [...nonMatchingItems, ...staticRedHerrings];
    Phaser.Utils.Array.Shuffle(fillerPool);

    const fillerNeeded = Math.max(0, count - relevant.length);
    const filler = fillerPool
      .filter(item => !relevant.some(selected => selected.id === item.id))
      .slice(0, fillerNeeded);

    const combined = [...relevant, ...filler];

    if (combined.length < count) {
      const fallbackPool = scenePool.filter(
        item => !combined.some(selected => selected.id === item.id)
      );
      Phaser.Utils.Array.Shuffle(fallbackPool);
      combined.push(...fallbackPool.slice(0, count - combined.length));
    }

    Phaser.Utils.Array.Shuffle(combined);

    this.activeItems = combined.slice(0, count);
    this.activeItemIds = new Set(this.activeItems.map(item => item.id));
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

    this.add.text(34, 132, 'Find these objects:', {
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

    this.backBtn = this.add.text(width - 120, 24, 'Back', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#222222',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    })
      .setInteractive({ useHandCursor: true })
      .setDepth(1001);

    this.backBtn.on('pointerdown', () => {
      this.finishAndReturn();
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

      zone.setInteractive({ useHandCursor: true });
      zone.setData('id', id);
      zone.setData('itemData', itemData);
      zone.setData('found', false);
      zone.setData('isStaticRedHerring', !!itemData.isRedHerring);
      zone.setData('clueType', itemData.clueType || 'soft_clue');

      if (this.debugZones) {
        zone.setStrokeStyle(2, 0xff0000, 0.85);
      }

      zone.on('pointerover', () => {
        if (!zone.getData('found')) {
          document.body.style.cursor = 'pointer';
          zone.setStrokeStyle(2, this.debugZones ? 0x00ffff : 0xffff00, this.debugZones ? 0.95 : 0.4);
        }
      });

      zone.on('pointerout', () => {
        document.body.style.cursor = 'default';
        if (this.debugZones) {
          zone.setStrokeStyle(2, 0xff0000, 0.85);
        } else {
          zone.setStrokeStyle();
        }
      });

      zone.on('pointerdown', () => this.handleHiddenObjectClick(zone));

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
    zone.disableInteractive();
    zone.setFillStyle(0x00ff88, 0.2);
    zone.setStrokeStyle(2, 0x00ff88, 0.6);

    this.foundItems.add(id);

    const isStaticRedHerring = !!itemData.isRedHerring;
    const isMissionRelevant = this.missionRelevantItemIds.has(id);
    const isRedHerring = isStaticRedHerring || !isMissionRelevant;
    const clueType = itemData.clueType || 'soft_clue';

    let points = 0;

    if (isStaticRedHerring) {
      points = 5;
      this.showMessage(
        `${itemData.item}: false lead. ${itemData.trueExplanation || 'This object is misleading.'}`,
        '#ffb347'
      );
    } else if (!isMissionRelevant) {
      points = 5;
      this.showMessage(
        `${itemData.item}: unrelated to this thief. ${itemData.trueExplanation || 'Does not match the suspect pattern.'}`,
        '#ffb347'
      );
    } else if (clueType === 'hard_clue') {
      points = 25;
      this.showMessage(
        `${itemData.item}: strong clue. Skills: ${(itemData.skills || []).join(', ')}`,
        '#7CFC00'
      );
    } else {
      points = 15;
      this.showMessage(
        `${itemData.item}: useful clue. Skills: ${(itemData.skills || []).join(', ')}`,
        '#ffd966'
      );
    }

    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
    this.refreshList(isRedHerring);

    if (!isStaticRedHerring && isMissionRelevant) {
      this.emitClueFound(itemData);
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
      skills: itemData.skills || [],
      suspectAffinity,
      affinityWeight,
      clueType: itemData.clueType || 'soft_clue'
    });
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
    }

    this.hiddenZones.forEach(zone => {
      if (zone.input && zone.input.enabled) {
        zone.disableInteractive();
      }
    });

    this.markSceneVisited();

    if (success) {
      this.showMessage('All objects found.', '#7CFC00');
    } else {
      this.showMessage('Time is up.', '#ff6b6b');
    }

    this.time.delayedCall(1800, () => {
      this.scene.start(this.returnScene, {
        ...this.returnData,
        hiddenObjectsSuccess: success,
        hiddenObjectsScore: this.score,
        foundItems: Array.from(this.foundItems),
        sceneId: this.sceneId
      });
    });
  }

  finishAndReturn() {
    if (this.isSceneFinished) return;

    this.markSceneVisited();

    this.scene.start(this.returnScene, {
      ...this.returnData,
      hiddenObjectsAborted: true,
      hiddenObjectsScore: this.score,
      foundItems: Array.from(this.foundItems),
      sceneId: this.sceneId
    });
  }

  markSceneVisited() {
    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object') {
      gameState.specialScenesVisited = {};
    }

    const visitKey = this.getVisitKey();
    gameState.specialScenesVisited[visitKey] = true;
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
}