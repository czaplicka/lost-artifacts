import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { getScoreManager } from '../managers/InvestigationManager.js';
import { audioManager } from '../managers/AudioManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { getDifficultyConfig } from '../DifficultySettings.js';
import { HiddenObjectsState } from '../HiddenObjectsState.js';
import { HiddenObjectsResolver } from '../HiddenObjectsResolver.js';
import { HiddenObjectsUI } from '../ui/HiddenObjectsUI.js';
import { CrimeCityTutorial, advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { HiddenObjectsResultOverlay } from '../ui/HiddenObjectsResultOverlay.js';
import { EventBus } from '../EventBus.js';
import { saveGameState } from '../gameStatePersistence.js';
import { HiddenObjectsPresentation } from './hiddenObjects/HiddenObjectsPresentation.js';
import { HiddenObjectsZoneFactory } from './hiddenObjects/HiddenObjectsZoneFactory.js';
import { HiddenObjectsDataLoader } from './hiddenObjects/HiddenObjectsDataLoader.js';
import { HiddenObjectsReconstructionSync } from './hiddenObjects/HiddenObjectsReconstructionSync.js';
import { HiddenObjectsInteractionController } from './hiddenObjects/HiddenObjectsInteractionController.js';
import { HiddenObjectsTimer } from './hiddenObjects/HiddenObjectsTimer.js';
import { HiddenObjectsSceneFlow } from './hiddenObjects/HiddenObjectsSceneFlow.js';

const OVERLAPPING_SFX = new Set(['correct', 'wrong']);

export class HiddenObjectsScene extends BaseScene {
  constructor() {
    super({ key: 'HiddenObjectsScene' });
    this.sceneId = 'louvre'; this.mapKey = 'hidden-objects-map'; this.mapPath = '';
    this.backgroundKey = 'hidden-objects-bg'; this.backgroundPath = '';
    this.objectLayerName = 'HiddenObjects';
    this.objectsDataKey = 'objects-data'; this.objectsDataPath = 'assets/data/objects.json';
    this.activeCount = 6; this.score = 0; this.timeLeft = 120;
    this.returnScene = 'CityScene'; this.returnData = {};
    this.cityId = 'paris'; this.title = __dialogueText('scenes/HiddenObjectsScene.js', 't_deb2ecf56ab544bfcb8e');
    this.debugZones = false; this.sourceScene = null;
    this.sidebarWidth = 420; this.mapWidth = 1920; this.mapHeight = 1080;
    this.playAreaWidth = 0; this.playAreaHeight = 0; this.playScale = 1;
    this.playOffsetX = 0; this.playOffsetY = 0;
    this.itemsData = []; this.itemsById = {}; this.sceneItems = [];
    this.activeItems = []; this.activeItemIds = new Set(); this.missionRelevantItemIds = new Set();
    this.hiddenZones = []; this.foundItems = new Set();
    this.timerEvent = null; this.isSceneFinished = false;
    this.scoreManager = null; this.energyManager = null; this.incorrectClicks = 0;
    this.timeCostHours = 4; this.timeAdvanced = false;
    this.isReturning = false; this.hudWasSleeping = false; this.hudWasPaused = false;
    this.isCreatingScene = false; this.isShuttingDownHiddenObjects = false;
    this.crimeTutorial = null;
    this.chargeCrimeSceneOnReady = false; this.crimeSceneEnergyCharged = false;
    this.stateManager = new HiddenObjectsState(this);
    this.resolver = new HiddenObjectsResolver(this);
    this.ui = new HiddenObjectsUI(this);
    this.overlay = new HiddenObjectsResultOverlay(this);
    this.presentation = new HiddenObjectsPresentation(this);
    this.zoneFactory = new HiddenObjectsZoneFactory(this);
    this.dataLoader = new HiddenObjectsDataLoader(this);
    this.reconstructionSync = new HiddenObjectsReconstructionSync(this);
    this.interactions = new HiddenObjectsInteractionController(this);
    this.timerController = new HiddenObjectsTimer(this);
    this.flow = new HiddenObjectsSceneFlow(this);
    this.boundHandleShutdown = this.handleShutdown.bind(this);
  }

  init(data = {}) {
    this.destroyCrimeTutorial();
    const mission = this.resolver.resolveIncomingMission(data);
    const resolvedSceneId = this.resolver.resolveSceneId(data, mission);
    const resolvedCityId = this.resolver.resolveCityId(data, mission);
    this.sceneId = resolvedSceneId;
    this.mapKey = data.mapKey || this.sceneId;
    this.mapPath = data.mapPath || `${__dialogueText('scenes/HiddenObjectsScene.js', 't_6b9b2f83e78caa08cfb1')}${this.sceneId}${__dialogueText('scenes/HiddenObjectsScene.js', 't_12157ab04ed2c6accc3d')}`;
    this.backgroundKey = data.backgroundKey || `${this.sceneId}_bg`;
    this.backgroundPath = data.backgroundPath || `${__dialogueText('scenes/HiddenObjectsScene.js', 't_6b9b2f83e78caa08cfb1')}${this.sceneId}${__dialogueText('scenes/HiddenObjectsScene.js', 't_d912c70acf20eda7217a')}`;
    this.objectLayerName = data.objectLayerName || 'HiddenObjects';
    this.objectsDataKey = data.objectsDataKey || 'objects-data';
    this.objectsDataPath = data.objectsDataPath || 'assets/data/objects.json';
    const difficulty = this.registry.get('difficulty') || gameState.difficulty || 'field';
    const difficultyConfig = getDifficultyConfig(difficulty);
    const baseTimeLimit = Number.isFinite(data.timeLimit) ? data.timeLimit : 120;
    this.activeCount = Number.isFinite(data.activeCount) && data.activeCount > 0
      ? Math.floor(data.activeCount) : difficultyConfig.hiddenObjectCount;
    this.timeLeft = Math.max(1, Math.round(baseTimeLimit * difficultyConfig.timerMultiplier));
    this.returnScene = typeof data.returnScene === 'string' && data.returnScene.trim() ? data.returnScene.trim() : 'CityScene';
    this.returnData = data.returnData && typeof data.returnData === 'object' ? { ...data.returnData } : { cityId: resolvedCityId };
    this.cityId = resolvedCityId;
    this.title = data.title || __dialogueText('scenes/HiddenObjectsScene.js', 't_deb2ecf56ab544bfcb8e');
    this.debugZones = Boolean(data.debugZones);
    this.sourceScene = data.sourceScene || data.returnScene || this.returnScene;
    this.sidebarWidth = Number(data.sidebarWidth) || 420;
    this.mapWidth = Number(data.mapWidth) || 1920; this.mapHeight = Number(data.mapHeight) || 1080;
    this.timeCostHours = Number.isFinite(data.timeCostHours) ? data.timeCostHours : 4;
    this.playAreaWidth = 0; this.playAreaHeight = 0; this.playScale = 1;
    this.playOffsetX = 0; this.playOffsetY = 0;
    this.timeAdvanced = false; this.isReturning = false;
    this.hudWasSleeping = false; this.hudWasPaused = false;
    this.isCreatingScene = false; this.isShuttingDownHiddenObjects = false;
    this.itemsData = []; this.itemsById = {}; this.sceneItems = [];
    this.activeItems = []; this.activeItemIds = new Set(); this.missionRelevantItemIds = new Set();
    this.hiddenZones = []; this.foundItems = new Set();
    this.timerEvent = null; this.isSceneFinished = false; this.incorrectClicks = 0;
    // Only the updated dispatch path requests deferred entry payment.
    // Legacy launchers that paid beforehand must not be charged again.
    this.chargeCrimeSceneOnReady = data.chargeCrimeSceneOnReady === true;
    this.crimeSceneEnergyCharged = false;
    this.scoreManager = getScoreManager(); this.energyManager = getEnergyManager();
    this.score = this.scoreManager?.getSessionPoints?.() || gameState.score || 0;
    this.stateManager.ensureStateStructure();
  }

  preload() { this.dataLoader.preloadAssets(); }

  create() {
    super.create();
    // Remove stale paired bindings before installing this run's cleanup.
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundHandleShutdown);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.boundHandleShutdown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundHandleShutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.boundHandleShutdown);
    if (this.isCreatingScene || this._cleanupDone) return;
    this.isCreatingScene = true;
    EventBus.emit('hideHUD'); this.game.events.emit('setHudVisible', false);
    audioManager.init(this);
    this.cameras.main.setBackgroundColor('#0f0f12'); this.flow.forceResetCursor();
    try {
      if (this.stateManager.isQuestAlreadyDone()) {
        this.restoreSourceScene();
        void this.returnToSafeScene({ ...this.returnData, hiddenObjectsAlreadyCompleted: true, sceneId: this.sceneId });
        return;
      }
      if (!this.dataLoader.loadObjectsData()) {
        this.flow.handleSceneSetupFailure(
          `${__dialogueText('scenes/HiddenObjectsScene.js', 't_dda1d966f625e1f93ad7')}${this.objectsDataKey}${__dialogueText('scenes/HiddenObjectsScene.js', 't_769d3e22b2c440cabc1b')}` +
          `${__dialogueText('scenes/HiddenObjectsScene.js', 't_32ebb1abcc1c601ceb9c')}${this.objectsDataPath}${__dialogueText('scenes/HiddenObjectsScene.js', 't_c4b4efe788369dc42f2d')}` +
          __dialogueText('scenes/HiddenObjectsScene.js', 't_f9cd062e97a6563e8d36')
        );
        return;
      }
      if (!this.sceneItems.length) {
        this.flow.handleSceneSetupFailure(`${__dialogueText('scenes/HiddenObjectsScene.js', 't_b70382e682a646b63208')}${this.sceneId}${__dialogueText('scenes/HiddenObjectsScene.js', 't_1e4a1452ad4db45827a1')}`);
        return;
      }
      // The loader already routes both false-returning branches to setup failure.
      if (!this.dataLoader.pickActiveItems(this.activeCount)) return;
      if (!Array.isArray(this.activeItems) || this.activeItems.length !== this.activeCount) {
        this.flow.handleSceneSetupFailure(
          `${__dialogueText('scenes/HiddenObjectsScene.js', 't_3ae443073723eb690020')}${this.activeCount}${__dialogueText('scenes/HiddenObjectsScene.js', 't_3409b1ab06358442f7a6')}` +
          `${__dialogueText('scenes/HiddenObjectsScene.js', 't_d8bd50d902f763641408')}${this.sceneId}${__dialogueText('scenes/HiddenObjectsScene.js', 't_1e4a1452ad4db45827a1')}`
        );
        return;
      }
      this.reconstructionSync.synchronize();
      this.presentation.computePlayArea(); this.presentation.createBackground();
      this.ui.createSidebarUI();
      if (this.zoneFactory.createHiddenZones() !== this.activeItems.length) {
        this.flow.handleMissingZones(); return;
      }
      this.timerController.start(); this.interactions.registerMissDetection();
      this.flow.pauseSourceScene(); this.flow.hideGameHud(); this.startCrimeTutorial();
    } catch (error) {
      console.error('[HiddenObjectsScene] Scene setup failed:', error);
      this.flow.handleSceneSetupFailure(
        __dialogueText('scenes/HiddenObjectsScene.js', 't_4bf159b4a954183a06b1') +
        __dialogueText('scenes/HiddenObjectsScene.js', 't_5d750650f552eac0f349')
      );
      return;
    } finally { this.isCreatingScene = false; }

    // All setup operations have succeeded. Do not classify errors after a
    // successful payment (e.g. autosave failure) as asset/setup failures.
    if (!this.commitCrimeSceneEntryEnergy()) {
      this.timerController.stop(); this.zoneFactory.disableAllZones(); this.destroyCrimeTutorial();
      this.flow.handleSceneSetupFailure(getEnergyManager().getInsufficientEnergyMessage(
        getEnergyManager().getActivityCost('crime_scene')
      ));
    }
  }

  commitCrimeSceneEntryEnergy() {
    if (!this.chargeCrimeSceneOnReady || this.crimeSceneEnergyCharged) return true;
    const energy = getEnergyManager();
    if (!energy.canPerformActivity('crime_scene').ok) return false;
    const result = energy.consumeActivity('crime_scene');
    if (!result?.success) return false;
    this.crimeSceneEnergyCharged = true;
    this.energyManager = energy;
    try { saveGameState(); }
    catch (error) { console.warn('[HiddenObjectsScene] Entry paid, but autosave failed:', error); }
    return true;
  }

  startCrimeTutorial() {
    if (this._cleanupDone || this.isShuttingDownHiddenObjects) return;
    this.destroyCrimeTutorial();
    const saved = gameState.onboarding?.crimeCity;
    if (saved?.completed || saved?.step && saved.step !== 'crime_scene') return;
    this.crimeTutorial = new CrimeCityTutorial(this, gameState); this.crimeTutorial.start();
  }
  destroyCrimeTutorial() {
    if (!this.crimeTutorial) return;
    try { this.crimeTutorial.destroy(); }
    catch (error) { console.warn('[HiddenObjectsScene] Tutorial cleanup failed:', error); }
    this.crimeTutorial = null;
  }
  playSfx(key, config = {}) {
    if (!key || this._cleanupDone) return null;
    const overlap = config.overlap ?? OVERLAPPING_SFX.has(key);
    return audioManager.playSfx(key, { ...config, scene: this, overlap });
  }
  finishScene(success) {
    if (this._cleanupDone || this.isShuttingDownHiddenObjects || this.isSceneFinished) return;
    this.destroyCrimeTutorial();
    if (advanceCrimeTutorial(gameState, 'crime_scene')) saveGameState();
    this.flow.finishScene(Boolean(success));
  }
  abandonGame() {
    if (this._cleanupDone || this.isShuttingDownHiddenObjects || this.isReturning) return;
    this.destroyCrimeTutorial(); this.flow.abandonGame();
  }
  returnToSafeScene(data = {}) {
    if (this._cleanupDone || this.isShuttingDownHiddenObjects || this.isReturning) return false;
    return this.flow.returnToSafeScene(data);
  }
  restoreSourceScene() { if (this._cleanupDone) return false; return this.flow.restoreSourceScene(); }
  restoreGameHud() { if (this._cleanupDone) return false; return this.flow.restoreGameHud(); }

  handleShutdown() {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundHandleShutdown);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.boundHandleShutdown);
    if (this.isShuttingDownHiddenObjects) return;
    this.isShuttingDownHiddenObjects = true; this.isCreatingScene = false;
    this.destroyCrimeTutorial();
    for (const [component, label] of [
      [this.timerController, 'Timer'], [this.interactions, 'Interaction'],
      [this.zoneFactory, 'Zone'], [this.ui, 'UI'], [this.overlay, 'Result overlay'],
      [this.presentation, 'Presentation']
    ]) {
      try { component?.destroy?.(); }
      catch (error) { console.warn(`[HiddenObjectsScene] ${label} cleanup failed:`, error); }
    }
    this.timerEvent = null; this.hiddenZones = [];
    try { this.flow?.forceResetCursor?.(); }
    catch (error) { console.warn('[HiddenObjectsScene] Cursor cleanup failed:', error); }
    this.activeItems = []; this.activeItemIds.clear(); this.missionRelevantItemIds.clear(); this.foundItems.clear();
    this.isReturning = false; this.hudWasSleeping = false; this.hudWasPaused = false;
  }
  normalizeSkills(value) { return this.resolver.normalizeSkills(value); }
  formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
  }
}