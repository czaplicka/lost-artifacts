// scenes/CrimeCityScene.js
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

const SHOP_TAXI_ENERGY = 3;

export class CrimeCityScene extends BaseScene {
  constructor() {
    super({ key: 'CrimeCityScene' });
    this.cityId = null; this.cityData = null; this.crimeCityConfig = null;
    this.interactiveObjects = []; this.cityAmbient = null;
    this.progressService = null; this.reconstructionService = null;
    this.tutorialController = null; this.mapUI = null; this.npcManager = null;
    this.isSettingUpUi = false; this.isTransitioning = false;
    this.isVisitingApartment = false; this.alibiEncountersEnsuredFor = null;
  }
  init(data = {}) {
    this.destroyControllers();
    this.cityId = this.normalizeCityId(
      data.cityId || gameState.crimeCityId || gameState.currentMission?.city || 'paris');
    this.interactiveObjects = []; this.cityAmbient = null;
    this.isSettingUpUi = false; this.isTransitioning = false;
    this.isVisitingApartment = false; this.alibiEncountersEnsuredFor = null;
    this.progressService = new CrimeCityProgressService(this);
    this.reconstructionService = new CrimeCityReconstructionService({
      cache: this.cache, gameState, cityId: this.cityId, getCaseKey: () => this.getCaseKey()
    });
    this.tutorialController = new CrimeCityTutorialController(this);
    this.tutorialController.initialize(data);
    this.mapUI = new CrimeCityMapUI(this);
    this.npcManager = new CrimeCityNpcManager(this);
  }
  normalizeCityId(value) {
    if (!value) return 'paris';
    const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
    return ({ new_york: 'new_york_city', new_york_city: 'new_york_city',
      new_delhi: 'new_delhi', new_dehli: 'new_delhi', kotte: 'kotto',
      sri_jayawardenepura_kotte: 'kotto' })[normalized] || normalized;
  }
  create() {
    super.create();
    if (!this?.scene?.manager?.keys) return;
    this.cameras.main.resetFX(); this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.unbindLifecycleListeners(); this.bindLifecycleListeners();
    try {
      this.initializeCrimeCity(); this.createCrimeCityContent();
      void this.setupCrimeCityUi(); this.scheduleStoryEvents();
    } catch (error) { console.error('[CrimeCityScene] Initialization failed.', error); }
  }
  bindLifecycleListeners() {
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
  }
  unbindLifecycleListeners() {
    this.events.off(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.off(Phaser.Scenes.Events.SLEEP, this.onSleep, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
  }
  async setupCrimeCityUi() {
    if (this.isSettingUpUi || this._cleanupDone) return;
    this.isSettingUpUi = true;
    try {
      const uiScene = await this.ensureOverlayScene('UIScene');
      if (this._cleanupDone || !this.sys.isActive()) return;
      if (uiScene) {
        this.game.events.emit('setHudVisible', true); EventBus.emit('showHUD');
        uiScene.refreshScoreHud?.(); uiScene.refreshMoneyHud?.(); uiScene.updateEnergy?.();
        uiScene.updateTime?.({ day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute: gameState.currentMinute ?? gameState.minute ?? 0,
          partOfDay: gameState.currentPartOfDay || gameState.partOfDay || 'Morning' });
      }
      const playerHud = await this.restorePlayerHud();
      if (this._cleanupDone || !this.sys.isActive()) return;
      if (playerHud) {
        playerHud.setCurrentGameplayScene('CrimeCityScene');
        playerHud.closeAllUIPanels?.(); playerHud.refreshNotebook?.(); playerHud.refreshUI?.();
      }
      const newsHud = await this.ensureOverlayScene('NewsHud');
      if (this._cleanupDone || !this.sys.isActive()) return;
      if (newsHud) {
        newsHud.events?.emit('setNewspaperVisible', true);
        newsHud.events?.emit('setTvVisible', false);
        this.bringSceneToTopIfActive('NewsHud');
      }
    } catch (error) {
      if (!this._cleanupDone) console.error('[CrimeCityScene] UI restore failed.', error);
    } finally { this.isSettingUpUi = false; }
  }
  initializeCrimeCity() {
    const locations = this.cache.json.get('locations');
    this.cityData = Array.isArray(locations) ? locations.find(location =>
      location?.id === this.cityId || this.normalizeCityId(location?.city) === this.cityId) : null;
    if (!this.cityData?.crimeCity) {
      console.error('[CrimeCityScene] Missing city configuration.', this.cityId); return;
    }
    this.crimeCityConfig = buildCrimeCityLayout(this, this.cityData.crimeCity);
    gameState.currentCityId = this.cityId; gameState.currentCity = this.cityData.city;
    gameState.currentCountry = this.cityData.country;
    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.cityData.city);
    this.progressService.initializeCurrentNode();
    audioManager.init(this);
    if (!audioManager.isMusicPlaying('themeGame')) audioManager.playMusic('themeGame', { loop: true });
    this.playCityAmbient();
  }
  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) return this.cityAmbient;
    this.cityAmbient = audioManager.playAmbient('citysound', { volume: 0.22, loop: true });
    return this.cityAmbient;
  }
  createCrimeCityContent() {
    if (!this.cityData?.crimeCity) return;
    this.mapUI?.createBackground(); this.mapUI?.createHeader();
    const crimeSceneCompleted = this.isCrimeSceneCompleted();
    const crimeLabCompleted = this.isCrimeLabCompleted();
    const gridCompleted = this.isGridCompleted();
    this.mapUI?.createAvailableLocations({ crimeSceneCompleted, crimeLabCompleted, gridCompleted,
      apartmentAvailable: this.hasAnyDebunkedAlibi() });
    if (crimeLabCompleted) this.ensureAlibiEncountersOnce();
    if (crimeLabCompleted && gridCompleted) {
      this.npcManager?.createNpcSpots(); this.tutorialController?.scheduleSuspectTutorial();
    }
  }
  ensureAlibiEncountersOnce() {
    const caseKey = this.getCaseKey();
    if (!caseKey || this.alibiEncountersEnsuredFor === caseKey) return;
    ensureAlibiEncounters(caseKey); this.alibiEncountersEnsuredFor = caseKey;
  }
  rebuildMapContent() {
    this.mapUI?.destroy(); this.npcManager?.destroy();
    this.mapUI = new CrimeCityMapUI(this); this.npcManager = new CrimeCityNpcManager(this);
    this.createCrimeCityContent();
  }
  scheduleStoryEvents() { this.tutorialController?.scheduleLabCompletionPhoneCall(); }
  createShopPin() { this.mapUI?.createShopIcon(); }

  visitShop() {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    if (getEnergyManager().getCurrentEnergy() < SHOP_TAXI_ENERGY) {
      this.showNoEnergyPopup(); return false;
    }
    this.closeAllUIPanels();
    this.isTransitioning = true;
    void this.openShopOverlay();
    return true;
  }
  async openShopOverlay() {
    try {
      // Rejestracja przed ponownym sprawdzeniem energii, bez pauzowania miasta.
      if (this.game.sceneLoader) await this.game.sceneLoader.ensure('ShopScene');
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!this.hasScene('ShopScene')) throw new Error('ShopScene is not registered.');
      const energy = getEnergyManager();
      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.showNoEnergyPopup(); return false;
      }
      const opened = await this.launchOverlay('ShopScene', {
        cityId: this.cityId, returnScene: 'CrimeCityScene'
      });
      if (this._cleanupDone || !this.sys.isActive()) return false;
      if (!opened) {
        this.showMessage('The shop could not be opened.\nPlease try again.', 2800, '#8b0000');
        return false;
      }
      // Dokładnie 3, bez scaleCost i bez drugiego kosztu przez moveToCrimeCityNode.
      // Po await sprawdzamy saldo ponownie, zanim pobierzemy energię.
      if (energy.getCurrentEnergy() < SHOP_TAXI_ENERGY) {
        this.scene.stop('ShopScene');
        this.showNoEnergyPopup();
        void this.setupCrimeCityUi();
        return false;
      }
      energy.consumeCustom(SHOP_TAXI_ENERGY, 'Taxi to shop: -3');
      saveGameState();
      this.getSceneIfActive('UIScene')?.updateEnergy?.();
      this.scene.pause();
      return true;
    } catch (error) {
      console.error('[CrimeCityScene] Opening ShopScene failed.', error);
      if (!this._cleanupDone && this.sys.isActive()) {
        this.scene.stop('ShopScene');
        this.showMessage('The shop could not be opened.\nCheck the console for details.', 3200, '#8b0000');
        void this.setupCrimeCityUi();
      }
      return false;
    } finally { this.isTransitioning = false; }
  }
  openCrimeScene() {
    if (this.isTransitioning || this._cleanupDone) return;
    const mission = gameState.currentMission;
    if (!mission?.scene) {
      this.showMessage('This case has no crime-scene data yet.\nEven the chalk outline is confused.', 2600, '#5d2a00'); return;
    }
    const reconstruction = this.reconstructionService?.prepareReconstruction();
    if (!reconstruction) {
      this.showMessage('The case reconstruction could not be prepared.\nThe evidence board is having an existential crisis.', 3200, '#8b0000'); return;
    }
    const foundCardIds = reconstruction.foundCardIds || [];
    if (!Array.isArray(foundCardIds) || foundCardIds.length !== 6) {
      console.error('[CrimeCityScene] Invalid evidence set.', reconstruction);
      this.showMessage('The case produced an invalid evidence set.\nCheck the reconstruction generator data.', 3200, '#8b0000'); return;
    }
    if (!this.moveToCrimeCityNode('crime_scene')) return;
    if (!this.trySpendEnergy('activity', 'crime_scene')) return;
    this.closeAllUIPanels();
    this.transitionTo('HiddenObjectsScene', {
      sceneId: mission.scene, mapKey: mission.scene, mapPath: `assets/crimes/${mission.scene}.json`,
      backgroundMode: 'image', backgroundKey: `${mission.scene}_bg`,
      backgroundPath: `assets/crimes/${mission.scene}.jpg`, objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data', objectsDataPath: 'assets/data/objects.json', itemSceneKey: mission.scene,
      activeCount: 6, timeLimit: 120, title: `Crime Scene – ${this.cityData.city}`,
      returnScene: 'CrimeCityScene', returnData: { cityId: this.cityId },
      cityId: this.cityId, sourceScene: 'CrimeCityScene', mission
    });
  }
  visitApartment(suspectId) {
    if (this.isTransitioning || this.isVisitingApartment || this._cleanupDone || !this.sys.isActive()) return false;
    const targetSuspectId = suspectId || gameState.currentThiefId;
    if (!targetSuspectId) {
      this.showMessage('No suspect selected.\nPick someone from the board first.', 2200, '#5d2a00'); return false;
    }
    if (!this.isAlibiDebunked(targetSuspectId)) {
      this.showMessage("This suspect's alibi still holds up.\nNo warrant, no keys, no apartment tour.", 2600, '#5d2a00'); return false;
    }
    if (!this.trySpendEnergy('activity', 'apartment_visit')) return false;
    this.closeAllUIPanels(); this.isTransitioning = true; this.isVisitingApartment = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.isTransitioning = false;
      if (!this.sys.isActive() || this._cleanupDone) { this.isVisitingApartment = false; return; }
      this.scene.pause();
      this.scene.launch('ApartmentScene', { suspectId: targetSuspectId, cityId: this.cityId, returnScene: 'CrimeCityScene' });
    });
    return true;
  }
  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;
    if (typeof this.progressService?.isAlibiDebunked === 'function') return !!this.progressService.isAlibiDebunked(suspectId);
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    return Array.isArray(debunked) && debunked.includes(suspectId);
  }
  hasAnyDebunkedAlibi() {
    if (typeof this.progressService?.hasAnyDebunkedAlibi === 'function') return !!this.progressService.hasAnyDebunkedAlibi();
    const debunked = gameState.debunkedAlibis || gameState.currentCase?.debunkedAlibis || [];
    return Array.isArray(debunked) && debunked.length > 0;
  }
  getCaseKey() { return this.progressService?.getCaseKey() || null; }
  getCrimeCityProgress() { return this.progressService?.getCrimeCityProgress() || null; }
  hasPaidCrimeLabEntry() { return this.progressService?.hasPaidCrimeLabEntry() || false; }
  payCrimeLabEntryOnce() { return this.progressService?.payCrimeLabEntryOnce() || false; }
  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') { return this.progressService?.moveToCrimeCityNode(targetNodeId, transportType) || false; }
  trySpendEnergy(category, key) { return this.progressService?.trySpendEnergy(category, key) || false; }
  isCrimeSceneCompleted() { return this.progressService?.isCrimeSceneCompleted() || false; }
  isCrimeLabCompleted() { return this.progressService?.isCrimeLabCompleted() || false; }
  isGridCompleted() { return this.progressService?.isGridCompleted() || false; }
  transitionTo(sceneKey, data = {}) {
    if (this.isTransitioning || this._cleanupDone || !this.sys.isActive()) return false;
    this.isTransitioning = true; this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!this.sys.isActive() || this._cleanupDone) { this.isTransitioning = false; return; }
      void this.goto(sceneKey, data).catch(error => {
        console.error(`[CrimeCityScene] Transition to ${sceneKey} failed.`, error);
      }).finally(() => { this.isTransitioning = false; });
    });
    return true;
  }
  showNoEnergyPopup() {
    this.showMessage("You're too exhausted, detective.\nGet some rest before continuing the case.", 2400, '#8b0000');
  }
  showMessage(text, duration = 2200, color = '#37474f') {
    if (!text || this._cleanupDone || !this.sys.isActive()) return null;
    const popup = this.add.text(this.scale.width / 2, this.scale.height / 2, text, {
      fontFamily: 'SpecialElite', fontSize: '19px', color: '#ffffff', backgroundColor: color,
      padding: { x: 24, y: 16 }, align: 'center'
    }).setOrigin(0.5).setDepth(200);
    this.time.delayedCall(duration, () => { if (popup?.active) popup.destroy(); });
    return popup;
  }
  closeAllUIPanels() { this.getPlayerHudScene()?.closeAllUIPanels?.(); }
  onWakeOrResume() {
    if (this._cleanupDone) return;
    this.isTransitioning = false; this.isVisitingApartment = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    if (!this.cityAmbient?.isPlaying) this.playCityAmbient();
    void this.setupCrimeCityUi(); this.rebuildMapContent();
  }
  onSleep() { this.stopCityAmbient(); }
  cleanupScene() {
    this.unbindLifecycleListeners(); this.isTransitioning = false;
    this.isSettingUpUi = false; this.isVisitingApartment = false;
    this.interactiveObjects.forEach(object => object?.removeAllListeners?.());
    this.interactiveObjects = []; this.stopCityAmbient(); this.destroyControllers();
  }
  stopCityAmbient() {
    if (!this.cityAmbient) return;
    audioManager.releaseSound(this.cityAmbient); this.cityAmbient = null;
  }
  destroyControllers() {
    this.tutorialController?.destroy(); this.tutorialController = null;
    this.npcManager?.destroy(); this.npcManager = null;
    this.mapUI?.destroy(); this.mapUI = null;
    this.reconstructionService = null;
    this.progressService?.destroy(); this.progressService = null;
  }
}