import { gameState } from '../GameData.js';
import { getScoreManager } from '../managers/InvestigationManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { HiddenObjectsState } from '../HiddenObjectsState.js';
import { HiddenObjectsResolver } from '../HiddenObjectsResolver.js';
import { HiddenObjectsUI } from '../ui/HiddenObjectsUI.js';
import {
  HiddenObjectsResultOverlay
} from '../ui/HiddenObjectsResultOverlay.js';
import { EventBus } from '../EventBus.js';

import {
  HiddenObjectsPresentation
} from './hiddenObjects/HiddenObjectsPresentation.js';

import {
  HiddenObjectsZoneFactory
} from './hiddenObjects/HiddenObjectsZoneFactory.js';

import {
  HiddenObjectsDataLoader
} from './hiddenObjects/HiddenObjectsDataLoader.js';

import {
  HiddenObjectsReconstructionSync
} from './hiddenObjects/HiddenObjectsReconstructionSync.js';

import {
  HiddenObjectsInteractionController
} from './hiddenObjects/HiddenObjectsInteractionController.js';

import {
  HiddenObjectsTimer
} from './hiddenObjects/HiddenObjectsTimer.js';

import {
  HiddenObjectsSceneFlow
} from './hiddenObjects/HiddenObjectsSceneFlow.js';

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

    this.isCreatingScene = false;
    this.isShuttingDownHiddenObjects = false;

    this.stateManager = new HiddenObjectsState(this);
    this.resolver = new HiddenObjectsResolver(this);
    this.ui = new HiddenObjectsUI(this);

    this.overlay = new HiddenObjectsResultOverlay(this);

    this.presentation =
      new HiddenObjectsPresentation(this);

    this.zoneFactory =
      new HiddenObjectsZoneFactory(this);

    this.dataLoader =
      new HiddenObjectsDataLoader(this);

    this.reconstructionSync =
      new HiddenObjectsReconstructionSync(this);

    this.interactions =
      new HiddenObjectsInteractionController(this);

    this.timerController =
      new HiddenObjectsTimer(this);

    this.flow =
      new HiddenObjectsSceneFlow(this);

    this.boundHandleShutdown =
      this.handleShutdown.bind(this);
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
      Number.isFinite(data.activeCount) &&
      data.activeCount > 0
        ? Math.floor(data.activeCount)
        : difficultyConfig.hiddenObjectCount;

    this.timeLeft = Math.max(
      1,
      Math.round(
        baseTimeLimit *
        difficultyConfig.timerMultiplier
      )
    );

    this.returnScene =
      typeof data.returnScene === 'string' &&
      data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CityScene';

    this.returnData =
      data.returnData &&
      typeof data.returnData === 'object'
        ? { ...data.returnData }
        : {
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

    this.playAreaWidth = 0;
    this.playAreaHeight = 0;
    this.playScale = 1;
    this.playOffsetX = 0;
    this.playOffsetY = 0;

    this.timeAdvanced = false;
    this.isReturning = false;

    this.hudWasSleeping = false;
    this.hudWasPaused = false;

    this.isCreatingScene = false;
    this.isShuttingDownHiddenObjects = false;

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
    this.energyManager = getEnergyManager();

    this.score =
      this.scoreManager?.getSessionPoints?.() ||
      gameState.score ||
      0;

    this.stateManager.ensureStateStructure();
  }

  preload() {
    this.dataLoader.preloadAssets();
  }

  create() {
    super.create();

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundHandleShutdown
    );

    if (this.isCreatingScene || this._cleanupDone) {
      return;
    }

    this.isCreatingScene = true;

    EventBus.emit('hideHUD');

    this.game.events.emit(
      'setHudVisible',
      false
    );

    audioManager.init(this);

    this.cameras.main.setBackgroundColor('#0f0f12');

    this.flow.forceResetCursor();

    try {
      if (this.stateManager.isQuestAlreadyDone()) {
        this.restoreSourceScene();

        void this.returnToSafeScene({
          ...this.returnData,
          hiddenObjectsAlreadyCompleted: true,
          sceneId: this.sceneId
        });

        return;
      }

      if (!this.dataLoader.loadObjectsData()) {
        this.flow.handleSceneSetupFailure(
          `Objects data "${this.objectsDataKey}" ` +
          `(${this.objectsDataPath}) failed to load ` +
          'or was not a valid array.'
        );

        return;
      }

      if (!this.sceneItems.length) {
        this.flow.handleSceneSetupFailure(
          `No objects configured for scene "${this.sceneId}".`
        );

        return;
      }

      if (
        !this.dataLoader.pickActiveItems(
          this.activeCount
        )
      ) {
        return;
      }

      if (
        !Array.isArray(this.activeItems) ||
        this.activeItems.length !== this.activeCount
      ) {
        this.flow.handleSceneSetupFailure(
          `Could not prepare ${this.activeCount} hidden objects ` +
          `for scene "${this.sceneId}".`
        );

        return;
      }

      this.reconstructionSync.synchronize();

      this.presentation.computePlayArea();
      this.presentation.createBackground();

      this.ui.createSidebarUI();

      const zonesCreated =
        this.zoneFactory.createHiddenZones();

      if (zonesCreated !== this.activeItems.length) {
        this.flow.handleMissingZones();

        return;
      }

      this.timerController.start();

      this.interactions.registerMissDetection();

      this.flow.pauseSourceScene();
      this.flow.hideGameHud();

      console.log('[HiddenObjectsScene] Ready', {
        sceneId: this.sceneId,
        activeItemIds: this.activeItems.map(
          (item) => item.id
        ),
        missionRelevantItemIds: [
          ...this.missionRelevantItemIds
        ],
        hiddenZonesCount: this.hiddenZones.length,
        timeLeft: this.timeLeft
      });
    } catch (error) {
      console.error(
        '[HiddenObjectsScene] Scene setup failed:',
        error
      );

      this.flow.handleSceneSetupFailure(
        'The crime scene refused to cooperate. ' +
        'Please return to the city map and try again.'
      );
    } finally {
      this.isCreatingScene = false;
    }
  }

  playSfx(key, config = {}) {
    if (!key || this._cleanupDone) {
      return null;
    }

    return audioManager.playSfx(key, config);
  }

  finishScene(success) {
    if (
      this._cleanupDone ||
      this.isShuttingDownHiddenObjects ||
      this.isSceneFinished
    ) {
      return;
    }

    this.flow.finishScene(Boolean(success));
  }

  abandonGame() {
    if (
      this._cleanupDone ||
      this.isShuttingDownHiddenObjects ||
      this.isReturning
    ) {
      return;
    }

    this.flow.abandonGame();
  }

  returnToSafeScene(data = {}) {
    if (
      this._cleanupDone ||
      this.isShuttingDownHiddenObjects ||
      this.isReturning
    ) {
      return false;
    }

    return this.flow.returnToSafeScene(data);
  }

  restoreSourceScene() {
    if (this._cleanupDone) {
      return false;
    }

    return this.flow.restoreSourceScene();
  }

  restoreGameHud() {
    if (this._cleanupDone) {
      return false;
    }

    return this.flow.restoreGameHud();
  }

  handleShutdown() {
    if (this.isShuttingDownHiddenObjects) {
      return;
    }

    this.isShuttingDownHiddenObjects = true;

    this.isCreatingScene = false;

    try {
      this.timerController?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Timer cleanup failed:',
        error
      );
    }

    this.timerEvent = null;

    try {
      this.interactions?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Interaction cleanup failed:',
        error
      );
    }

    try {
      this.zoneFactory?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Zone cleanup failed:',
        error
      );
    }

    this.hiddenZones = [];

    try {
      this.ui?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] UI cleanup failed:',
        error
      );
    }

    try {
      this.overlay?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Result overlay cleanup failed:',
        error
      );
    }

    try {
      this.presentation?.destroy?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Presentation cleanup failed:',
        error
      );
    }

    try {
      this.flow?.forceResetCursor?.();
    } catch (error) {
      console.warn(
        '[HiddenObjectsScene] Cursor cleanup failed:',
        error
      );
    }

    this.activeItems = [];
    this.activeItemIds.clear();
    this.missionRelevantItemIds.clear();
    this.foundItems.clear();

    this.isReturning = false;
    this.hudWasSleeping = false;
    this.hudWasPaused = false;
  }

    normalizeSkills(value) {
    return this.resolver.normalizeSkills(value);
  }

  formatTime(seconds) {
    const safeSeconds = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    return `${Math.floor(
      safeSeconds / 60
    )}:${String(
      safeSeconds % 60
    ).padStart(2, '0')}`;
  }
}