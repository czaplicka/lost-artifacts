import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { getScoreManager } from '../InvestigationManager.js';
import { audioManager } from '../AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../EnergyManager.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { HiddenObjectsState } from '../HiddenObjectsState.js';
import { HiddenObjectsResolver } from '../HiddenObjectsResolver.js';
import { HiddenObjectsUI } from '../ui/HiddenObjectsUI.js';
import { HiddenObjectsResultOverlay } from '../ui/HiddenObjectsResultOverlay.js';
import { EventBus } from '../EventBus.js';

const TIME_PASSED_FLAVOR_LINES = [
  'You spent so long crawling on the floor that a guard asked if you lost a contact lens.',
  'Four hours of crouching behind statues. Your knees will remember this.',
  'You examined every dust bunny twice. Thoroughness has a cost: time.',
  'The museum closed and reopened while you were still under that table.',
  'You now know this room better than the people who built it. Also, it is evening.'
];

export class HiddenObjectsScene extends BaseScene {
  constructor() {
    super({ key: 'HiddenObjectsScene' });

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
    this.sourceScene = null;

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

    this.scoreManager = null;
    this.energyManager = null;

    this.incorrectClicks = 0;

    this.timeCostHours = 4;
    this.timeAdvanced = false;

    this.isReturning = false;
    this.hudWasSleeping = false;
    this.hudWasPaused = false;

    this.stateManager = new HiddenObjectsState(this);
    this.resolver = new HiddenObjectsResolver(this);
    this.ui = new HiddenObjectsUI(this);
    this.overlay = new HiddenObjectsResultOverlay(this);
  }

  init(data = {}) {
    const mission =
      this.resolver.resolveIncomingMission(data);

    const resolvedSceneId =
      this.resolver.resolveSceneId(data, mission);

    const resolvedCityId =
      this.resolver.resolveCityId(data, mission);

    this.sceneId = resolvedSceneId;

    this.mapKey = data.mapKey || this.sceneId;

    this.mapPath =
      data.mapPath ||
      `assets/crimes/${this.sceneId}.json`;

    this.backgroundKey =
      data.backgroundKey ||
      `${this.sceneId}_bg`;

    this.backgroundPath =
      data.backgroundPath ||
      `assets/crimes/${this.sceneId}.jpg`;

    this.objectLayerName =
      data.objectLayerName ||
      'HiddenObjects';

    this.objectsDataKey =
      data.objectsDataKey ||
      'objects-data';

    this.objectsDataPath =
      data.objectsDataPath ||
      'assets/data/objects.json';

    const difficulty =
      this.registry.get('difficulty') ||
      gameState.difficulty ||
      'field';

    const difficultyConfig =
      getDifficultyConfig(difficulty);

    const baseTimeLimit = Number.isFinite(data.timeLimit)
      ? data.timeLimit
      : 120;

    this.activeCount =
      difficultyConfig.hiddenObjectCount;

    this.timeLeft = Math.round(
      baseTimeLimit *
      difficultyConfig.timerMultiplier
    );

    this.returnScene =
      typeof data.returnScene === 'string' &&
      data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CityScene';

    this.returnData =
      data.returnData || {
        cityId: resolvedCityId
      };

    this.cityId = resolvedCityId;
    this.title = data.title || 'Crime Scene';

    this.debugZones = Boolean(data.debugZones);

    this.sourceScene =
      data.sourceScene ||
      data.returnScene ||
      this.returnScene;

    this.sidebarWidth =
      Number(data.sidebarWidth) || 420;

    this.mapWidth =
      Number(data.mapWidth) || 1920;

    this.mapHeight =
      Number(data.mapHeight) || 1080;

    this.timeCostHours = Number.isFinite(
      data.timeCostHours
    )
      ? data.timeCostHours
      : 4;

    this.timeAdvanced = false;
    this.isReturning = false;

    this.hudWasSleeping = false;
    this.hudWasPaused = false;

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

    this.scoreManager = getScoreManager();
    this.score = this.scoreManager.getSessionPoints();

    this.stateManager.ensureStateStructure();
  }

  preload() {
    if (
      this.backgroundPath &&
      !this.textures.exists(this.backgroundKey)
    ) {
      this.load.image(
        this.backgroundKey,
        this.backgroundPath
      );
    }

    if (
      this.mapPath &&
      !this.cache.tilemap.exists(this.mapKey)
    ) {
      this.load.tilemapTiledJSON(
        this.mapKey,
        this.mapPath
      );
    }

    if (
      this.objectsDataPath &&
      !this.cache.json.exists(this.objectsDataKey)
    ) {
      this.load.json(
        this.objectsDataKey,
        this.objectsDataPath
      );
    }
  }

  create() {
    super.create();

    EventBus.emit('hideHUD');
    this.game.events.emit('setHudVisible', false);

    audioManager.init(this);

    this.cameras.main.setBackgroundColor('#0f0f12');

    this.forceResetCursor();

    this.energyManager = getEnergyManager();

    if (this.stateManager.isQuestAlreadyDone()) {
      this.restoreSourceScene();

      void this.returnToSafeScene({
        ...this.returnData,
        hiddenObjectsAlreadyCompleted: true,
        sceneId: this.sceneId
      });

      return;
    }

    if (!this.loadObjectsData()) {
      this.handleSceneSetupFailure(
        `Objects data "${this.objectsDataKey}" ` +
        `(${this.objectsDataPath}) failed to load or was not a valid array.`
      );

      return;
    }

    if (!this.sceneItems.length) {
      this.handleSceneSetupFailure(
        `No objects configured for scene "${this.sceneId}".`
      );

      return;
    }

    if (!this.pickActiveItems(this.activeCount)) {
      return;
    }

    this.syncGeneratedReconstructionData();

    this.computePlayArea();
    this.createBackground();

    this.ui.createSidebarUI();

    const zonesCreated = this.createHiddenZones();

    if (zonesCreated !== this.activeItems.length) {
      const zoneIds = new Set(
        this.hiddenZones.map((zone) =>
          zone.getData('id')
        )
      );

      const missingZoneIds = this.activeItems
        .map((item) => item.id)
        .filter((id) => !zoneIds.has(id));

      this.handleSceneSetupFailure(
        `Missing clickable Tiled zones for: ` +
        `${missingZoneIds.join(', ')}.`
      );

      return;
    }

    this.createTimer();
    this.registerMissDetection();

    this.pauseSourceScene();
    this.hideGameHud();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.handleShutdown,
      this
    );

    console.log('HiddenObjectsScene ready', {
      sceneId: this.sceneId,
      activeItemIds: this.activeItems.map(
        (item) => item.id
      ),
      missionRelevantItemIds: [
        ...this.missionRelevantItemIds
      ],
      hiddenZonesCount: this.hiddenZones.length
    });
  }

  loadObjectsData() {
    const rawData = this.cache.json.get(
      this.objectsDataKey
    );

    if (!Array.isArray(rawData)) {
      console.error(
        `[HiddenObjectsScene] Objects data "${this.objectsDataKey}" ` +
        'is missing or not an array.',
        rawData
      );

      return false;
    }

    this.itemsData = rawData;
    this.itemsById = {};

    rawData.forEach((item) => {
      if (
        item &&
        item.id !== undefined &&
        item.id !== null
      ) {
        this.itemsById[String(item.id)] = item;
      }
    });

    this.sceneItems = rawData.filter(
      (item) =>
        Array.isArray(item.scene) &&
        item.scene.includes(this.sceneId)
    );

    console.log('[HiddenObjectsScene] loadObjectsData', {
      sceneId: this.sceneId,
      totalItems: this.itemsData.length,
      sceneItemsCount: this.sceneItems.length
    });

    return true;
  }

  getGeneratedCardIds() {
    const ids =
      gameState.reconstructedHeist?.foundCardIds;

    if (!Array.isArray(ids)) {
      return [];
    }

    return [
      ...new Set(
        ids
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    ];
  }

  pickActiveItems(legacyCount = 6) {
    const generatedIds = this.getGeneratedCardIds();

    if (generatedIds.length > 0) {
      const sceneItemMap = new Map(
        this.sceneItems.map((item) => [
          String(item.id),
          item
        ])
      );

      const missingIds = generatedIds.filter(
        (id) => !sceneItemMap.has(id)
      );

      if (missingIds.length > 0) {
        this.handleSceneSetupFailure(
          `Generated reconstruction contains IDs unavailable ` +
          `in scene "${this.sceneId}": ${missingIds.join(', ')}.`
        );

        return false;
      }

      this.activeItems = generatedIds.map(
        (id) => sceneItemMap.get(id)
      );

      this.activeCount = this.activeItems.length;

      this.activeItemIds = new Set(generatedIds);

      this.missionRelevantItemIds = new Set(
        (
          gameState.reconstructedHeist
            ?.solutionCardIds || []
        ).map((id) => String(id))
      );

      console.log(
        '[HiddenObjectsScene] Using generated reconstruction cards.',
        {
          sceneId: this.sceneId,
          generatedIds,
          solutionCardIds: [
            ...this.missionRelevantItemIds
          ]
        }
      );

      return true;
    }

    console.warn(
      '[HiddenObjectsScene] No generated foundCardIds. ' +
      'Using legacy candidate pool.',
      {
        sceneId: this.sceneId,
        legacyCount
      }
    );

    this.activeItems =
      this.resolver.buildCandidatePool(
        this.sceneItems,
        legacyCount
      );

    this.activeItemIds = new Set(
      this.activeItems.map((item) => String(item.id))
    );

    this.missionRelevantItemIds = new Set(
      this.activeItems
        .filter((item) => item.isCorrect)
        .map((item) => String(item.id))
    );

    if (!this.activeItems.length) {
      this.handleSceneSetupFailure(
        `No active objects selected for scene "${this.sceneId}".`
      );

      return false;
    }

    return true;
  }

  syncGeneratedReconstructionData() {
    const reconstruction =
      gameState.reconstructedHeist;

    if (
      !reconstruction ||
      this.getGeneratedCardIds().length === 0
    ) {
      const legacyData =
        this.resolver.buildReconstructionCardsFromActiveItems(
          this.activeItems,
          this.cityId,
          this.sceneId
        );

      legacyData.requiredSkills = Array.isArray(
        gameState.hypothesisEvidence?.requiredSkills
      )
        ? [
          ...gameState.hypothesisEvidence.requiredSkills
        ]
        : [];

      legacyData.hiddenObjectsCompleted = false;
      legacyData.hiddenObjectsCompletedAt = null;
      legacyData.collectedCardIds = [];

      this.stateManager.saveReconstructionCards(
        legacyData
      );

      return;
    }

    reconstruction.cityId =
      reconstruction.cityId || this.cityId;

    reconstruction.sceneId =
      reconstruction.sceneId || this.sceneId;

    reconstruction.foundCardIds = this.activeItems.map(
      (item) => String(item.id)
    );

    reconstruction.solutionCardIds = Array.isArray(
      reconstruction.solutionCardIds
    )
      ? reconstruction.solutionCardIds.map((id) =>
        String(id)
      )
      : [];

    reconstruction.collectedCardIds = Array.isArray(
      reconstruction.collectedCardIds
    )
      ? reconstruction.collectedCardIds.filter((id) =>
        reconstruction.foundCardIds.includes(String(id))
      )
      : [];

    reconstruction.requiredSkills = Array.isArray(
      gameState.hypothesisEvidence?.requiredSkills
    )
      ? [
        ...gameState.hypothesisEvidence.requiredSkills
      ]
      : [];

    reconstruction.hiddenObjectsCompleted ??= false;
    reconstruction.hiddenObjectsCompletedAt ??= null;

    if (
      !Array.isArray(reconstruction.allCards) ||
      reconstruction.allCards.length === 0
    ) {
      reconstruction.allCards = this.activeItems.map(
        (item) => ({
          id: String(item.id),
          item: item.item,
          text: item.item,
          skills: Array.isArray(item.skills)
            ? [...item.skills]
            : [],
          scene: this.sceneId,
          cityId: this.cityId,

          correctOrder: Number.isInteger(
            item.correctOrder
          )
            ? item.correctOrder
            : -1,

          isCorrect:
            this.missionRelevantItemIds.has(
              String(item.id)
            ),

          isRedHerring: Boolean(
            item.isRedHerring
          ),

          trueExplanation:
            item.trueExplanation || '',

          heistExplanation:
            item.heistExplanation || '',

          reconstructionUses: Array.isArray(
            item.reconstructionUses
          )
            ? [...item.reconstructionUses]
            : []
        })
      );
    }

    console.log(
      '[HiddenObjectsScene] Reconstruction data synchronized.',
      {
        foundCardIds: reconstruction.foundCardIds,
        solutionCardIds:
          reconstruction.solutionCardIds,
        requiredSkills:
          reconstruction.requiredSkills,
        collectedCardIds:
          reconstruction.collectedCardIds
      }
    );
  }

  getSafeReturnScene() {
    const requestedScene =
      typeof this.returnScene === 'string'
        ? this.returnScene.trim()
        : '';

    if (requestedScene) {
      return requestedScene;
    }

    if (this.hasScene('CityScene')) {
      return 'CityScene';
    }

    if (this.hasScene('MenuScene')) {
      return 'MenuScene';
    }

    console.error(
      '[HiddenObjectsScene] No valid return scene could be determined.'
    );

    return null;
  }

  async returnToSafeScene(data = {}) {
    if (this.isReturning) {
      return false;
    }

    this.isReturning = true;

    const targetScene = this.getSafeReturnScene();

    if (!targetScene) {
      return false;
    }

    this.forceResetCursor();

    const moved = await this.goto(
      targetScene,
      data
    );

    if (!moved) {
      this.isReturning = false;

      console.error(
        '[HiddenObjectsScene] Could not return to scene.',
        {
          targetScene,
          data
        }
      );

      return false;
    }

    return true;
  }

  handleSceneSetupFailure(message) {
    console.error('[HiddenObjectsScene] Setup failed:', message, {
      sceneId: this.sceneId,
      cityId: this.cityId
    });

    void this.returnToSafeScene({
      ...this.returnData,
      hiddenObjectsSetupFailed: true,
      hiddenObjectsSuccess: false,
      hiddenObjectsScore: this.score,
      incorrectClicks: this.incorrectClicks,
      foundItems: [...this.foundItems],
      sceneId: this.sceneId,
      errorMessage: message
    });
  }

  forceResetCursor() {
    this.input?.setDefaultCursor('default');

    if (this.sys?.game?.canvas) {
      this.sys.game.canvas.style.cursor = 'default';
    }
  }

  pauseSourceScene() {
    const source = this.sourceScene;

    if (
      !source ||
      source === this.scene.key ||
      !this.hasScene(source)
    ) {
      return false;
    }

    const sourceRef =
      this.scene.manager.keys[source];

    if (this.isSceneActive(source)) {
      this.scene.sleep(source);
    }

    if (sourceRef?.input) {
      sourceRef.input.enabled = false;
    }

    return true;
  }

  restoreSourceScene() {
    this.forceResetCursor();

    const source =
      this.sourceScene ||
      this.returnScene ||
      'CityScene';

    if (!this.hasScene(source)) {
      return false;
    }

    if (this.isSceneSleeping(source)) {
      this.scene.wake(source);
    }

    if (this.isScenePaused(source)) {
      this.scene.resume(source);
    }

    const sourceSceneRef =
      this.scene.manager.keys[source];

    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true;
      sourceSceneRef.input.setTopOnly(true);
    }

    return true;
  }

  hideGameHud() {
    const uiSceneKey = 'UIScene';

    this.hudWasSleeping = false;
    this.hudWasPaused = false;

    if (!this.hasScene(uiSceneKey)) {
      return;
    }

    this.hudWasSleeping =
      this.isSceneSleeping(uiSceneKey);

    this.hudWasPaused =
      this.isScenePaused(uiSceneKey);

    if (this.isSceneActive(uiSceneKey)) {
      this.scene.sleep(uiSceneKey);
    }
  }

  async restoreGameHud() {
    const uiSceneKey = 'UIScene';

    if (!this.hasScene(uiSceneKey)) {
      const launched = await this.launchOverlay(
        uiSceneKey
      );

      if (!launched) {
        console.warn(
          '[HiddenObjectsScene] UIScene could not be restored.'
        );

        return false;
      }
    }

    if (this.isSceneSleeping(uiSceneKey)) {
      this.scene.wake(uiSceneKey);
    } else if (this.isScenePaused(uiSceneKey)) {
      this.scene.resume(uiSceneKey);
    } else if (!this.isSceneActive(uiSceneKey)) {
      const launched = await this.launchOverlay(
        uiSceneKey
      );

      if (!launched) {
        return false;
      }
    }

    const uiScene =
      this.scene.manager.keys[uiSceneKey];

    const refreshHud = () => {
      EventBus.emit('showHUD');

      EventBus.emit('scoreChanged', {
        total: gameState.score || 0,
        source: 'hidden-objects-return'
      });
    };

    if (this.isSceneActive(uiSceneKey)) {
      refreshHud();
    } else {
      uiScene?.events?.once(
        Phaser.Scenes.Events.WAKE,
        refreshHud
      );
    }

    this.bringSceneToTopIfActive(uiSceneKey);

    return true;
  }

  computePlayArea() {
    const { width, height } = this.scale;

    this.playAreaWidth = Math.max(
      200,
      width - this.sidebarWidth
    );

    this.playAreaHeight = height;

    this.playScale = Math.min(
      this.playAreaWidth / this.mapWidth,
      this.playAreaHeight / this.mapHeight
    );

    const renderedWidth =
      this.mapWidth * this.playScale;

    const renderedHeight =
      this.mapHeight * this.playScale;

    this.playOffsetX =
      this.sidebarWidth +
      (this.playAreaWidth - renderedWidth) / 2;

    this.playOffsetY =
      (this.playAreaHeight - renderedHeight) / 2;
  }

  normalizeSkills(value) {
    return this.resolver.normalizeSkills(value);
  }

  createBackground() {
    const { height } = this.scale;

    const renderedWidth =
      this.mapWidth * this.playScale;

    const renderedHeight =
      this.mapHeight * this.playScale;

    if (this.textures.exists(this.backgroundKey)) {
      this.add
        .image(
          this.playOffsetX + renderedWidth / 2,
          this.playOffsetY + renderedHeight / 2,
          this.backgroundKey
        )
        .setDisplaySize(
          renderedWidth,
          renderedHeight
        )
        .setDepth(-10);
    }

    this.add
      .rectangle(
        this.sidebarWidth,
        0,
        2,
        height,
        0xd4af37,
        0.45
      )
      .setOrigin(0, 0)
      .setDepth(900);
  }

  createHiddenZones() {
    let map;

    try {
      map = this.make.tilemap({
        key: this.mapKey
      });
    } catch (error) {
      console.error(
        `[HiddenObjectsScene] Could not load map "${this.mapKey}".`,
        error
      );

      return 0;
    }

    const objectLayer = map?.getObjectLayer(
      this.objectLayerName
    );

    if (!objectLayer) {
      console.error(
        `[HiddenObjectsScene] Missing layer "${this.objectLayerName}" ` +
        `in map "${this.mapKey}".`
      );

      return 0;
    }

    this.hiddenZones = [];

    objectLayer.objects.forEach((obj) => {
      const id = String(
        this.getTiledProperty(obj, 'id') ||
        obj.name ||
        ''
      );

      if (!id || !this.activeItemIds.has(id)) {
        return;
      }

      const itemData = this.itemsById[id];
      const bounds = this.getObjectBounds(obj);

      if (
        !itemData ||
        !bounds ||
        bounds.width <= 0 ||
        bounds.height <= 0
      ) {
        console.warn(
          `[HiddenObjectsScene] Invalid Tiled object for id="${id}".`
        );

        return;
      }

      const zone = this.add.rectangle(
        this.playOffsetX +
          bounds.x * this.playScale,
        this.playOffsetY +
          bounds.y * this.playScale,
        Math.max(
          8,
          bounds.width * this.playScale
        ),
        Math.max(
          8,
          bounds.height * this.playScale
        ),
        0xffff00,
        this.debugZones ? 0.18 : 0
      );

      zone.setInteractive();

      zone.setData('id', id);
      zone.setData('itemData', itemData);
      zone.setData('found', false);

      zone.setData(
        'isStaticRedHerring',
        Boolean(itemData.isRedHerring)
      );

      zone.setData(
        'clueType',
        itemData.clueType || 'soft_clue'
      );

      if (this.debugZones) {
        zone.setStrokeStyle(2, 0xff0000, 0.85);
      }

      zone.on('pointerdown', (pointer) => {
        if (
          typeof pointer?.event?.stopPropagation ===
          'function'
        ) {
          pointer.event.stopPropagation();
        }

        this.handleHiddenObjectClick(zone);
      });

      this.hiddenZones.push(zone);
    });

    return this.hiddenZones.length;
  }

  getObjectBounds(obj) {
    if (obj.polygon?.length) {
      return this.getPolylineBounds(
        obj.x,
        obj.y,
        obj.polygon
      );
    }

    if (obj.polyline?.length) {
      return this.getPolylineBounds(
        obj.x,
        obj.y,
        obj.polyline
      );
    }

    return {
      x: obj.x + obj.width / 2,
      y: obj.y + obj.height / 2,
      width: obj.width,
      height: obj.height
    };
  }

  getPolylineBounds(originX, originY, points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: originX + minX + (maxX - minX) / 2,
      y: originY + minY + (maxY - minY) / 2,
      width: Math.max(8, maxX - minX),
      height: Math.max(8, maxY - minY)
    };
  }

  handleHiddenObjectClick(zone) {
    if (
      !zone ||
      zone.getData('found') ||
      this.isSceneFinished
    ) {
      return;
    }

    const id = zone.getData('id');
    const itemData = zone.getData('itemData');

    if (!itemData) {
      return;
    }

    zone.setData('found', true);

    zone.setFillStyle(0x555555, 0.55);
    zone.setStrokeStyle(2, 0x777777, 0.7);

    this.playSfx('correct', {
      volume: 0.45
    });

    this.pulseZone(zone, 0x7cfc00);
    this.flashScreen(0x7cfc00, 0.08, 140);

    this.foundItems.add(id);

    this.storeCollectedCardId(id);

    const isMissionRelevant =
      this.missionRelevantItemIds.has(id);

    const clueType =
      itemData.clueType || 'soft_clue';

    const points = isMissionRelevant
      ? clueType === 'hard_clue'
        ? 25
        : 15
      : 5;

    this.score =
      this.scoreManager.addHiddenObjectScore(points);

    this.ui.updateScoreAndMisses(
      this.score,
      this.incorrectClicks
    );

    this.ui.refreshList();

    this.bumpText(this.ui.scoreText);

    if (isMissionRelevant) {
      this.emitClueFound(itemData);

      this.stateManager.storeHiddenObjectClue(
        itemData,
        clueType
      );

      this.ui.showMessage(
        `Evidence secured: ${itemData.item} (+${points})`,
        '#7CFC00'
      );
    } else {
      this.ui.showMessage(
        `Found: ${itemData.item} (+${points})`,
        '#ffd966'
      );
    }

    if (
      this.foundItems.size >=
      this.activeItems.length
    ) {
      this.finishScene(true);
    }
  }

  storeCollectedCardId(id) {
    if (
      !gameState.reconstructedHeist ||
      typeof gameState.reconstructedHeist !== 'object'
    ) {
      return;
    }

    const reconstruction =
      gameState.reconstructedHeist;

    const cardId = String(id);

    reconstruction.collectedCardIds = Array.isArray(
      reconstruction.collectedCardIds
    )
      ? reconstruction.collectedCardIds
      : [];

    if (!reconstruction.collectedCardIds.includes(cardId)) {
      reconstruction.collectedCardIds.push(cardId);
    }

    reconstruction.collectedEvidence ??= {};

    const foundItem = this.itemsById[cardId];

    reconstruction.collectedEvidence[cardId] = {
      id: cardId,
      item: foundItem?.item || cardId,
      collectedAt: Date.now(),
      isMissionRelevant:
        this.missionRelevantItemIds.has(cardId),
      clueType:
        foundItem?.clueType || 'soft_clue'
    };
  }

  emitClueFound(itemData) {
    this.events.emit('clue-found', {
      id: itemData.id,
      item: itemData.item,
      skills: this.normalizeSkills(itemData.skills),
      suspectAffinity:
        itemData.suspectAffinity || [],
      affinityWeight:
        itemData.affinityWeight || 0,
      clueType:
        itemData.clueType || 'soft_clue'
    });
  }

  createTimer() {
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.isSceneFinished) {
          return;
        }

        this.timeLeft -= 1;

        this.ui.updateTimer(this.timeLeft);

        if (this.timeLeft <= 0) {
          this.finishScene(false);
        }
      }
    });
  }

  advanceGameTime() {
    if (this.timeAdvanced) {
      return;
    }

    this.timeAdvanced = true;

    const hours = Number.isFinite(
      this.timeCostHours
    )
      ? this.timeCostHours
      : 4;

    if (hours <= 0) {
      return;
    }

    EventBus.emit('advanceTime', hours, 0);

    console.log(
      '[HiddenObjectsScene] Game time advanced.',
      {
        sceneId: this.sceneId,
        hours
      }
    );
  }

  showTimeAdvanceToast() {
    const hours = Number.isFinite(
      this.timeCostHours
    )
      ? this.timeCostHours
      : 4;

    if (hours <= 0) {
      return;
    }

    const flavor =
      TIME_PASSED_FLAVOR_LINES[
        Math.floor(
          Math.random() *
          TIME_PASSED_FLAVOR_LINES.length
        )
      ];

    this.ui.showMessage(
      `${hours}h passed. ${flavor}`,
      '#9fd3ff'
    );
  }

  finishScene(success) {
    if (this.isSceneFinished) {
      return;
    }

    this.isSceneFinished = true;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.hiddenZones.forEach((zone) => {
      if (zone.input?.enabled) {
        zone.disableInteractive();
      }
    });

    this.stateManager.markSceneVisited(success);

    this.advanceGameTime();

    if (success) {
      if (gameState.reconstructedHeist) {
        gameState.reconstructedHeist.hiddenObjectsCompleted =
          true;

        gameState.reconstructedHeist.hiddenObjectsCompletedAt =
          Date.now();

        gameState.reconstructedHeist.cityId =
          this.cityId;

        gameState.reconstructedHeist.sceneId =
          this.sceneId;
      }

      gameState.hiddenObjectsProgress ??= {};

      const caseId =
        gameState.currentCaseId ||
        gameState.currentMission?.id ||
        gameState.currentMission?.caseId ||
        `${this.cityId}_${this.sceneId}`;

      gameState.hiddenObjectsProgress[caseId] = {
        completed: true,
        completedAt: Date.now(),
        foundCardIds: [...this.foundItems],
        collectedCardIds: [
          ...(
            gameState.reconstructedHeist
              ?.collectedCardIds || []
          )
        ],
        solutionCardIds: [
          ...(
            gameState.reconstructedHeist
              ?.solutionCardIds || []
          )
        ]
      };

      const timeBonus = this.timeLeft * 2;

      this.score =
        this.scoreManager.addHiddenObjectScore(
          timeBonus
        );

      saveGameState();

      this.ui.updateScoreAndMisses(
        this.score,
        this.incorrectClicks
      );

      this.ui.showMessage(
        `Crime scene processed. Time bonus +${timeBonus}`,
        '#7CFC00'
      );

      this.showTimeAdvanceToast();

      this.overlay.showSuccessOverlay();

      return;
    }

    this.playSfx('wrong', {
      volume: 0.5
    });

    this.flashScreen(0xff4d4d, 0.18, 220);

    this.ui.showMessage(
      'Time is up. The evidence trail went cold.',
      '#ff6b6b'
    );

    this.showTimeAdvanceToast();

    this.overlay.showFailureOverlay();
  }

  abandonGame() {
    if (this.isSceneFinished) {
      return;
    }

    this.isSceneFinished = true;

    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.hiddenZones.forEach((zone) => {
      if (zone.input?.enabled) {
        zone.disableInteractive();
      }
    });

    this.stateManager.markSceneVisited(false);

    this.advanceGameTime();

    void this.returnToSafeScene({
      ...this.returnData,
      hiddenObjectsSuccess: false,
      hiddenObjectsAbandoned: true,
      hiddenObjectsScore: this.score,
      incorrectClicks: this.incorrectClicks,
      foundItems: Array.from(this.foundItems),
      sceneId: this.sceneId
    });
  }

  registerMissDetection() {
    this.trackInputEvent(
      this.input,
      'pointerdown',
      this.handleGlobalPointerDown
    );
  }

  handleGlobalPointerDown(pointer, currentlyOver) {
    if (
      this.isSceneFinished ||
      (
        Array.isArray(currentlyOver) &&
        currentlyOver.length
      ) ||
      pointer.x < this.sidebarWidth
    ) {
      return;
    }

    this.incorrectClicks += 1;

    this.score =
      this.scoreManager.addHiddenObjectScore(-3);

    this.ui.updateScoreAndMisses(
      this.score,
      this.incorrectClicks
    );

    this.playSfx('wrong', {
      volume: 0.38
    });

    this.bumpText(this.ui.missesText);
    this.bumpText(this.ui.scoreText);

    this.flashScreen(0xff4d4d, 0.12, 120);

    this.ui.showMessage(
      'No useful evidence there. (-3)',
      '#ff8a8a'
    );
  }

  playSfx(key, config = {}) {
    audioManager.playSfx(key, config);
  }

  flashScreen(
    color = 0xffffff,
    alpha = 0.1,
    duration = 120
  ) {
    const flash = this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        color,
        alpha
      )
      .setOrigin(0, 0)
      .setDepth(2500);

    this.addTrackedTween(
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration,
        ease: 'Linear',
        onComplete: () => flash.destroy()
      })
    );
  }

  pulseZone(zone, color = 0x7cfc00) {
    if (!zone) {
      return;
    }

    const scaleX = zone.scaleX || 1;
    const scaleY = zone.scaleY || 1;

    zone.setStrokeStyle(3, color, 1);

    this.addTrackedTween(
      this.tweens.add({
        targets: zone,
        scaleX: scaleX * 1.08,
        scaleY: scaleY * 1.08,
        duration: 90,
        yoyo: true,
        ease: 'Quad.Out'
      })
    );
  }

  bumpText(target) {
    if (!target) {
      return;
    }

    this.tweens.killTweensOf(target);

    target.setScale(1);

    this.addTrackedTween(
      this.tweens.add({
        targets: target,
        scale: 1.08,
        duration: 90,
        yoyo: true,
        ease: 'Quad.Out'
      })
    );
  }

  handleShutdown() {
    if (this.timerEvent) {
      this.timerEvent.remove(false);
      this.timerEvent = null;
    }

    this.hiddenZones.forEach((zone) => {
      zone?.removeAllListeners?.();
    });

    this.hiddenZones = [];

    this.overlay?.destroy();

    this.forceResetCursor();
  }

  getTiledProperty(obj, propertyName) {
    const prop = obj.properties?.find(
      (property) =>
        property.name === propertyName
    );

    return prop ? prop.value : null;
  }

  formatTime(seconds) {
    const safeSeconds = Math.max(0, seconds);

    return `${Math.floor(
      safeSeconds / 60
    )}:${String(
      safeSeconds % 60
    ).padStart(2, '0')}`;
  }
}