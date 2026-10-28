import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import { audioManager } from '../managers/AudioManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { saveGameState } from '../gameStatePersistence.js';

import { ensureAlibiEncounters } from '../alibi/AlibiEncounterSetup.js';
import { EventBus } from '../EventBus.js';

import { CrimeCityProgressService } from './crimeCity/CrimeCityProgressService.js';
import { CrimeCityReconstructionService } from './crimeCity/CrimeCityReconstructionService.js';
import { CrimeCityTutorialController } from './crimeCity/CrimeCityTutorialController.js';
import { CrimeCityMapUI } from './crimeCity/CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './crimeCity/CrimeCityNpcManager.js';
import { buildCrimeCityLayout } from './crimeCity/CrimeCityLayout.js';

import { CrimeCityTutorial } from '../CrimeCityTutorial.js';

const SHOP_TAXI_ENERGY = 3;

const LOCAL_ACTIVITY_BY_NODE = Object.freeze({
  crime_scene: 'crime_scene',
  crime_lab: 'csi_lab',
  apartment: 'apartment_visit'
});

export class CrimeCityScene extends BaseScene {
  constructor() {
    super({ key: 'CrimeCityScene' });

    this.cityId = null;
    this.cityData = null;
    this.crimeCityConfig = null;

    this.interactiveObjects = [];
    this.cityAmbient = null;

    this.progressService = null;
    this.reconstructionService = null;
    this.tutorialController = null;
    this.mapUI = null;
    this.npcManager = null;
    this.crimeTutorial = null;

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.isVisitingApartment = false;
    this.alibiEncountersEnsuredFor = null;

    this._runToken = null;
  }

  init(data = {}) {
    this.destroyControllers();

    this._runToken = Symbol('crime-city');

    this.cityId = this.normalizeCityId(
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentMission?.city ||
      'paris'
    );

    this.interactiveObjects = [];
    this.cityAmbient = null;
    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.isVisitingApartment = false;
    this.alibiEncountersEnsuredFor = null;

    this.progressService = new CrimeCityProgressService(this);

    this.reconstructionService =
      new CrimeCityReconstructionService({
        cache: this.cache,
        gameState,
        cityId: this.cityId,
        getCaseKey: () => this.getCaseKey()
      });

    this.tutorialController = new CrimeCityTutorialController(this);
    this.tutorialController.initialize(data);

    this.mapUI = new CrimeCityMapUI(this);
    this.npcManager = new CrimeCityNpcManager(this);
  }

  normalizeCityId(value) {
    if (!value) return 'paris';

    const normalized = String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');

    return ({
      new_york: 'new_york_city',
      new_york_city: 'new_york_city',
      new_delhi: 'new_delhi',
      new_dehli: 'new_delhi',
      kotte: 'kotte',
      sri_jayawardenepura_kotte: 'kotte'
    })[normalized] || normalized;
  }

  create() {
    super.create();

    if (!this.scene?.manager?.keys) return;

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.unbindLifecycleListeners();
    this.bindLifecycleListeners();

    try {
      this.initializeCrimeCity();
      this.createCrimeCityContent();

      void this.setupCrimeCityUi();

      this.scheduleStoryEvents();
      this.startCrimeTutorial();
    } catch (error) {
      console.error(
        '[CrimeCityScene] Initialization failed:',
        error
      );
    }
  }

  bindLifecycleListeners() {
    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.onWakeOrResume,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.onWakeOrResume,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.onSleep,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  unbindLifecycleListeners() {
    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.onWakeOrResume,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.onWakeOrResume,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.onSleep,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  async setupCrimeCityUi() {
    if (this.isSettingUpUi || this._cleanupDone) return;

    const token = this._runToken;
    this.isSettingUpUi = true;

    try {
      const uiScene = await this.ensureOverlayScene('UIScene');

      if (!this.isCurrentRun(token)) return;

      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();

        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute: gameState.currentMinute ?? gameState.minute ?? 0,

          partOfDay:
            gameState.currentPartOfDay ||
            gameState.partOfDay ||
            'Morning'
        });
      }

      const playerHud = await this.restorePlayerHud();

      if (!this.isCurrentRun(token)) return;

      if (playerHud) {
        playerHud.setCurrentGameplayScene('CrimeCityScene');
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      }

      const newsHud = await this.ensureOverlayScene('NewsHud');

      if (!this.isCurrentRun(token)) return;

      if (newsHud) {
        newsHud.events?.emit('setNewspaperVisible', true);
        newsHud.events?.emit('setTvVisible', false);

        this.bringSceneToTopIfActive('NewsHud');
      }
    } catch (error) {
      if (token === this._runToken && !this._cleanupDone) {
        console.error(
          '[CrimeCityScene] UI restore failed:',
          error
        );
      }
    } finally {
      if (token === this._runToken) {
        this.isSettingUpUi = false;
      }
    }
  }

  isCurrentRun(token) {
    return (
      token === this._runToken &&
      !this._cleanupDone &&
      this.sys.isActive()
    );
  }

  initializeCrimeCity() {
    const locations = this.cache.json.get('locations');

    this.cityData = Array.isArray(locations)
      ? locations.find(location => (
          location?.id === this.cityId ||
          this.normalizeCityId(location?.city) === this.cityId
        ))
      : null;

    if (!this.cityData?.crimeCity) {
      console.error(
        '[CrimeCityScene] Missing city configuration:',
        this.cityId
      );

      return;
    }

    this.crimeCityConfig = buildCrimeCityLayout(
      this,
      this.cityData.crimeCity
    );

    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.cityData.city;
    gameState.currentCountry = this.cityData.country;

    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.cityData.city);

    this.progressService.initializeCurrentNode();

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    this.playCityAmbient();
  }

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) return this.cityAmbient;

    this.cityAmbient = audioManager.playAmbient(
      'citysound',
      { volume: 0.22, loop: true }
    );

    return this.cityAmbient;
  }

  hasVisitedApartment() {
    const mission = gameState.currentMission || {};

    const missionId = String(
      mission.id ||
      mission.missionId ||
      'unknown_mission'
    );

    const progress = gameState.apartmentProgress?.[missionId];

    return Boolean(
      progress &&
      (
        progress.inventoryVersion === 2 ||
        progress.updatedAt
      )
    );
  }

  createCrimeCityContent() {
    if (!this.cityData?.crimeCity) return;

    const crimeSceneCompleted = this.isCrimeSceneCompleted();
    const crimeLabCompleted = this.isCrimeLabCompleted();
    const gridCompleted = this.isGridCompleted();
    const apartmentVisited = this.hasVisitedApartment();

    this.npcManager?.clearCreatedObjects();

    this.mapUI?.createBackground();
    this.mapUI?.createHeader();

    this.mapUI?.createAvailableLocations({
      crimeSceneCompleted,
      crimeLabCompleted,
      gridCompleted,
      apartmentVisited,
      apartmentAvailable: this.hasAnyDebunkedAlibi()
    });

    if (apartmentVisited) return;

    if (crimeLabCompleted) {
      this.ensureAlibiEncountersOnce();
    }

    if (crimeLabCompleted && gridCompleted) {
      this.npcManager?.createNpcSpots();
      this.tutorialController?.scheduleSuspectTutorial();
    }
  }

  startCrimeTutorial() {
    if (this._cleanupDone || !this.cityData?.crimeCity) return;

    this.crimeTutorial?.destroy();

    this.crimeTutorial = new CrimeCityTutorial(
      this,
      gameState
    );

    this.crimeTutorial.start();
    this.syncCrimeTutorial();
  }

  syncCrimeTutorial() {
    const tutorial = this.crimeTutorial;

    if (!tutorial?.isActive()) return;

    const saved = gameState.onboarding?.crimeCity;

    if (!saved) return;

    if (saved.completed || saved.step === 'finished') {
      tutorial.finish(false);
      return;
    }

    if (
      saved.step &&
      saved.step !== tutorial.getStep()
    ) {
      tutorial.setStep(saved.step);
    }

    const doneByStep = {
      crime_scene: this.isCrimeSceneCompleted(),
      crime_lab: this.isCrimeLabCompleted()
    };

    const step = tutorial.getStep();

    if (doneByStep[step]) {
      tutorial.complete(step);
    }
  }

  ensureAlibiEncountersOnce() {
    if (this.hasVisitedApartment()) return;

    const caseKey = this.getCaseKey();

    if (
      !caseKey ||
      this.alibiEncountersEnsuredFor === caseKey
    ) {
      return;
    }

    ensureAlibiEncounters(caseKey);
    this.alibiEncountersEnsuredFor = caseKey;
  }

  rebuildMapContent() {
    this.npcManager?.destroy();
    this.mapUI?.destroy();

    this.mapUI = new CrimeCityMapUI(this);
    this.npcManager = new CrimeCityNpcManager(this);

    this.createCrimeCityContent();
  }

  scheduleStoryEvents() {
    if (this.hasVisitedApartment()) return;

    this.tutorialController?.scheduleLabCompletionPhoneCall();
  }

  createShopPin() {
    this.mapUI?.createShopIcon();
  }

  getLocalActivityEnergyCost(targetNodeId) {
    const activityType = Object.prototype.hasOwnProperty.call(
      LOCAL_ACTIVITY_BY_NODE,
      targetNodeId
    )
      ? LOCAL_ACTIVITY_BY_NODE[targetNodeId]
      : null;

    if (!activityType) {
      console.error(
        '[CrimeCityScene] Unknown local activity node:',
        targetNodeId
      );

      return null;
    }

    const energy = getEnergyManager();

    const travelCost =
      this.progressService?.getCurrentNode() === targetNodeId
        ? 0
        : energy.getTravelCost('taxi');

    const activityAlreadyPaid =
      targetNodeId === 'crime_lab' &&
      this.hasPaidCrimeLabEntry();

    const activityCost = activityAlreadyPaid
      ? 0
      : energy.getActivityCost(activityType);

    return {
      activityType,
      travelCost,
      activityCost,
      totalCost: travelCost + activityCost
    };
  }

  canAffordLocalActivity(targetNodeId) {
    if (
      !this.progressService ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const costs = this.getLocalActivityEnergyCost(targetNodeId);

    if (!costs) return false;

    const energy = getEnergyManager();
    const affordability = energy.canAfford(costs.totalCost);

    if (!affordability.ok) {
      this.showMessage(
        energy.getInsufficientEnergyMessage(costs.totalCost),
        3200,
        '#8b0000'
      );

      return false;
    }

    return true;
  }

  visitShop() {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    if (
      getEnergyManager().getCurrentEnergy() <
      SHOP_TAXI_ENERGY
    ) {
      this.showNoEnergyPopup();
      return false;
    }

    this.closeAllUIPanels();
    this.isTransitioning = true;

    void this.openShopOverlay();
    return true;
  }

  async openShopOverlay() {
    try {
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.ensure('ShopScene');
      }

      if (this._cleanupDone || !this.sys.isActive()) {
        return false;
      }

      if (!this.hasScene('ShopScene')) {
        throw new Error('ShopScene is not registered.');
      }

      const energy = getEnergyManager();

      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.showNoEnergyPopup();
        return false;
      }

      const opened = await this.launchOverlay('ShopScene', {
        cityId: this.cityId,
        returnScene: 'CrimeCityScene'
      });

      if (this._cleanupDone || !this.sys.isActive()) {
        return false;
      }

      if (!opened) {
        this.showMessage(
          'The shop could not be opened.\nPlease try again.',
          2800,
          '#8b0000'
        );

        return false;
      }

      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.scene.stop('ShopScene');
        this.showNoEnergyPopup();

        void this.setupCrimeCityUi();
        return false;
      }

      energy.consumeCustom(
        SHOP_TAXI_ENERGY,
        'Taxi to shop: -3'
      );

      saveGameState();
      this.getSceneIfActive('UIScene')?.updateEnergy?.();

      this.scene.pause();
      return true;
    } catch (error) {
      console.error(
        '[CrimeCityScene] Opening ShopScene failed:',
        error
      );

      if (!this._cleanupDone && this.sys.isActive()) {
        this.scene.stop('ShopScene');

        this.showMessage(
          'The shop could not be opened.\nCheck the console for details.',
          3200,
          '#8b0000'
        );

        void this.setupCrimeCityUi();
      }

      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  openCrimeScene() {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    const mission = gameState.currentMission;

    if (!mission?.scene) {
      this.showMessage(
        'This case has no crime-scene data yet.\nEven the chalk outline is confused.',
        2600,
        '#5d2a00'
      );

      return;
    }

    const reconstruction =
      this.reconstructionService?.prepareReconstruction();

    if (!reconstruction) {
      this.showMessage(
        'The case reconstruction could not be prepared.\nThe evidence board is having an existential crisis.',
        3200,
        '#8b0000'
      );

      return;
    }

    const foundCardIds = reconstruction.foundCardIds || [];

    if (
      !Array.isArray(foundCardIds) ||
      foundCardIds.length !== 6
    ) {
      console.error(
        '[CrimeCityScene] Invalid evidence set:',
        reconstruction
      );

      this.showMessage(
        'The case produced an invalid evidence set.\nCheck the reconstruction generator data.',
        3200,
        '#8b0000'
      );

      return;
    }

    if (!this.canAffordLocalActivity('crime_scene')) return;
    if (!this.moveToCrimeCityNode('crime_scene')) return;
    if (!this.trySpendEnergy('activity', 'crime_scene')) return;

    this.closeAllUIPanels();

    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene,
      mapKey: mission.scene,
      mapPath: `assets/crimes/${mission.scene}.json`,
      backgroundMode: 'image',
      backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `assets/crimes/${mission.scene}.jpg`,
      objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data',
      objectsDataPath: 'assets/data/objects.json',
      itemSceneKey: mission.scene,
      activeCount: 6,
      timeLimit: 120,
      title: `Crime Scene – ${this.cityData.city}`,
      returnScene: 'CrimeCityScene',
      returnData: { cityId: this.cityId },
      cityId: this.cityId,
      sourceScene: 'CrimeCityScene',
      mission
    });
  }

  openCrimeLab() {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive() ||
      !this.isCrimeSceneCompleted()
    ) {
      return false;
    }

    if (!this.canAffordLocalActivity('crime_lab')) return false;
    if (!this.moveToCrimeCityNode('crime_lab')) return false;
    if (!this.payCrimeLabEntryOnce()) return false;

    this.closeAllUIPanels();

    return this.transitionTo('CrimeLabScene', {
      cityId: this.cityId,
      caseKey: this.getCaseKey(),
      returnScene: 'CrimeCityScene',
      returnData: { cityId: this.cityId },
      sourceScene: 'CrimeCityScene'
    });
  }

  visitApartment(suspectId) {
    if (
      this.isTransitioning ||
      this.isVisitingApartment ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const targetSuspectId =
      suspectId || gameState.currentThiefId;

    if (!targetSuspectId) {
      this.showMessage(
        'No suspect selected.\nPick someone from the board first.',
        2200,
        '#5d2a00'
      );

      return false;
    }

    if (!this.isAlibiDebunked(targetSuspectId)) {
      this.showMessage(
        "This suspect's alibi still holds up.\nCheck the witness statements first.",
        2600,
        '#5d2a00'
      );

      return false;
    }

    if (!this.canAffordLocalActivity('apartment')) {
      return false;
    }

    this.isTransitioning = true;
    this.isVisitingApartment = true;

    void this.prepareApartmentVisit(
      targetSuspectId,
      this._runToken
    );

    return true;
  }

  async prepareApartmentVisit(suspectId, token) {
    try {
      // Lazy registration must happen before any Phaser start/launch call.
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.ensure('ApartmentScene');
      }

      if (!this.isCurrentRun(token)) return;

      if (!this.hasScene('ApartmentScene')) {
        throw new Error(
          'ApartmentScene could not be registered by SceneLoader.'
        );
      }

      // Recheck after asynchronous loading.
      if (!this.isAlibiDebunked(suspectId)) {
        this.restoreAfterApartmentFailure(token);
        return;
      }

      if (!this.canAffordLocalActivity('apartment')) {
        this.restoreAfterApartmentFailure(token);
        return;
      }

      if (!this.moveToCrimeCityNode('apartment')) {
        this.restoreAfterApartmentFailure(token);
        return;
      }

      if (!this.trySpendEnergy('activity', 'apartment_visit')) {
        this.restoreAfterApartmentFailure(token);
        return;
      }

      if (!this.isCurrentRun(token)) return;

      this.closeAllUIPanels();

      // Keep the existing tutorial signal for compatibility.
      EventBus.emit('crimeCityTutorialStep', {
        step: 'search_apartment'
      });

      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => {
          if (!this.isCurrentRun(token)) return;

          void this.enterPreparedApartment(
            suspectId,
            token
          );
        }
      );

      this.cameras.main.fadeOut(350, 0, 0, 0);
    } catch (error) {
      if (token !== this._runToken || this._cleanupDone) {
        return;
      }

      console.error(
        '[CrimeCityScene] Apartment preparation failed:',
        error
      );

      this.restoreAfterApartmentFailure(token);

      this.showMessage(
        'The apartment could not be loaded.\nPlease try again. Check the console if it happens again.',
        4000,
        '#8b0000'
      );
    }
  }

  async enterPreparedApartment(suspectId, token) {
    try {
      const started = await this.goto('ApartmentScene', {
        suspectId,
        cityId: this.cityId,
        caseKey: this.getCaseKey(),
        returnScene: 'CrimeCityScene'
      });

      if (!started && this.isCurrentRun(token)) {
        this.restoreAfterApartmentFailure(token);

        this.showMessage(
          'The apartment could not be opened.\nPlease try again.',
          3200,
          '#8b0000'
        );
      }
    } catch (error) {
      if (!this.isCurrentRun(token)) return;

      console.error(
        '[CrimeCityScene] Apartment transition failed:',
        error
      );

      this.restoreAfterApartmentFailure(token);

      this.showMessage(
        'The apartment could not be opened.\nCheck the console for details.',
        4000,
        '#8b0000'
      );
    }
  }

  restoreAfterApartmentFailure(token) {
    if (!this.isCurrentRun(token)) return;

    this.isTransitioning = false;
    this.isVisitingApartment = false;

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;

    if (
      typeof this.progressService?.isAlibiDebunked === 'function'
    ) {
      return Boolean(
        this.progressService.isAlibiDebunked(suspectId)
      );
    }

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    return (
      Array.isArray(debunked) &&
      debunked.includes(suspectId)
    );
  }

  hasAnyDebunkedAlibi() {
    if (
      typeof this.progressService?.hasAnyDebunkedAlibi === 'function'
    ) {
      return Boolean(
        this.progressService.hasAnyDebunkedAlibi()
      );
    }

    const debunked =
      gameState.debunkedAlibis ||
      gameState.currentCase?.debunkedAlibis ||
      [];

    return Array.isArray(debunked) && debunked.length > 0;
  }

  getCaseKey() {
    return this.progressService?.getCaseKey() || null;
  }

  getCrimeCityProgress() {
    return this.progressService?.getCrimeCityProgress() || null;
  }

  hasPaidCrimeLabEntry() {
    return this.progressService?.hasPaidCrimeLabEntry() || false;
  }

  payCrimeLabEntryOnce() {
    return this.progressService?.payCrimeLabEntryOnce() || false;
  }

  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') {
    return this.progressService?.moveToCrimeCityNode(
      targetNodeId,
      transportType
    ) || false;
  }

  trySpendEnergy(category, key) {
    return this.progressService?.trySpendEnergy(
      category,
      key
    ) || false;
  }

  isCrimeSceneCompleted() {
    return this.progressService?.isCrimeSceneCompleted() || false;
  }

  isCrimeLabCompleted() {
    return this.progressService?.isCrimeLabCompleted() || false;
  }

  isGridCompleted() {
    return this.progressService?.isGridCompleted() || false;
  }

  transitionTo(sceneKey, data = {}) {
    if (
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const token = this._runToken;

    this.isTransitioning = true;

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.isCurrentRun(token)) return;

        void this.goto(sceneKey, data)
          .then(started => {
            if (!started && this.isCurrentRun(token)) {
              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          })
          .catch(error => {
            if (!this.isCurrentRun(token)) return;

            console.error(
              `[CrimeCityScene] Transition to ${sceneKey} failed:`,
              error
            );

            this.isTransitioning = false;
            this.cameras.main.fadeIn(200, 0, 0, 0);
          });
      }
    );

    this.cameras.main.fadeOut(350, 0, 0, 0);
    return true;
  }

  showNoEnergyPopup() {
    this.showMessage(
      "You're too exhausted, detective.\nGet some rest before continuing the case.",
      2400,
      '#8b0000'
    );
  }

  showMessage(text, duration = 2200, color = '#37474f') {
    if (
      !text ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return null;
    }

    const popup = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      text,
      {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: color,
        padding: { x: 24, y: 16 },
        align: 'center',
        wordWrap: {
          width: Math.max(100, this.scale.width - 64)
        }
      }
    )
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => {
      if (popup?.active) popup.destroy();
    });

    return popup;
  }

  closeAllUIPanels() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();
  }

  onWakeOrResume() {
    if (this._cleanupDone) return;

    this.isTransitioning = false;
    this.isVisitingApartment = false;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    void this.setupCrimeCityUi();

    this.rebuildMapContent();
    this.crimeTutorial?.resume();
    this.syncCrimeTutorial();
  }

  onSleep() {
    this.stopCityAmbient();
  }

  cleanupScene() {
    this._runToken = null;

    this.unbindLifecycleListeners();

    this.isTransitioning = false;
    this.isSettingUpUi = false;
    this.isVisitingApartment = false;

    for (const object of this.interactiveObjects) {
      object?.removeAllListeners?.();
    }

    this.interactiveObjects = [];

    this.stopCityAmbient();
    this.destroyControllers();
  }

  stopCityAmbient() {
    if (!this.cityAmbient) return;

    audioManager.releaseSound(this.cityAmbient);
    this.cityAmbient = null;
  }

  destroyControllers() {
    this.crimeTutorial?.destroy();
    this.crimeTutorial = null;

    this.tutorialController?.destroy();
    this.tutorialController = null;

    this.npcManager?.destroy();
    this.npcManager = null;

    this.mapUI?.destroy();
    this.mapUI = null;

    this.reconstructionService = null;

    this.progressService?.destroy();
    this.progressService = null;
  }
}