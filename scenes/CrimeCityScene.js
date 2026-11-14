import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { CrimeCityProgressService } from './crimeCity/CrimeCityProgressService.js';
import { CrimeCityReconstructionService } from './crimeCity/CrimeCityReconstructionService.js';
import { CrimeCityTutorialController } from './crimeCity/CrimeCityTutorialController.js';
import { CrimeCityMapUI } from './crimeCity/CrimeCityMapUI.js';
import { CrimeCityNpcManager } from './crimeCity/CrimeCityNpcManager.js';
import { crimeCityHudMethods } from './crimeCity/CrimeCityHudMethods.js';
import { crimeCityContentMethods } from './crimeCity/CrimeCityContentMethods.js';
import { crimeCityTravelMethods } from './crimeCity/CrimeCityTravelMethods.js';
import { crimeCityApartmentMethods } from './crimeCity/CrimeCityApartmentMethods.js';

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
      data.cityId || gameState.crimeCityId || gameState.currentMission?.city || 'paris'
    );
    this.interactiveObjects = [];
    this.cityAmbient = null;
    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.isVisitingApartment = false;
    this.alibiEncountersEnsuredFor = null;
    this.progressService = new CrimeCityProgressService(this);
    this.reconstructionService = new CrimeCityReconstructionService({
      cache: this.cache, gameState, cityId: this.cityId,
      getCaseKey: () => this.getCaseKey()
    });
    this.tutorialController = new CrimeCityTutorialController(this);
    this.tutorialController.initialize(data);
    this.mapUI = new CrimeCityMapUI(this);
    this.npcManager = new CrimeCityNpcManager(this);
  }

  normalizeCityId(value) {
    if (!value) return 'paris';
    const normalized = String(value).trim().toLowerCase().replace(/\s+/g, '_');
    return ({
      new_york: 'new_york_city', new_york_city: 'new_york_city',
      new_delhi: 'new_delhi', new_dehli: 'new_delhi',
      kotte: 'kotte', sri_jayawardenepura_kotte: 'kotte'
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
      console.error('[CrimeCityScene] Initialization failed:', error);
    }
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

  isCurrentRun(token) {
    return token === this._runToken && !this._cleanupDone && this.sys.isActive();
  }

  onWakeOrResume() {
    if (this._cleanupDone) return;
    this.isTransitioning = false;
    this.isVisitingApartment = false;
    this.cameras.main.fadeIn(300, 0, 0, 0);
    if (!this.cityAmbient?.isPlaying) this.playCityAmbient();
    void this.setupCrimeCityUi();
    this.rebuildMapContent();
    this.crimeTutorial?.resume();
    this.syncCrimeTutorial();
  }

  onSleep() { this.stopCityAmbient(); }

  cleanupScene() {
    this._runToken = null;
    this.unbindLifecycleListeners();
    this.isTransitioning = false;
    this.isSettingUpUi = false;
    this.isVisitingApartment = false;
    for (const object of this.interactiveObjects) object?.removeAllListeners?.();
    this.interactiveObjects = [];
    this.stopCityAmbient();
    this.destroyControllers();
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
    this.progressService = null;
  }
}

for (const methods of [
  crimeCityHudMethods, crimeCityContentMethods,
  crimeCityTravelMethods, crimeCityApartmentMethods
]) {
  for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(methods))) {
    if (Object.prototype.hasOwnProperty.call(CrimeCityScene.prototype, name)) {
      throw new Error(`[CrimeCityScene] Duplicate method: ${name}`);
    }
    Object.defineProperty(CrimeCityScene.prototype, name, { ...descriptor, enumerable: false });
  }
}
