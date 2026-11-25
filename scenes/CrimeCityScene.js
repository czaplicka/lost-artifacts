import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import { CrimeCityProgressService } from './crimeCity/CrimeCityProgressService.js';
import { CrimeCityReconstructionService } from './crimeCity/CrimeCityReconstructionService.js';
import { CrimeCityTutorialController } from './crimeCity/CrimeCityTutorialController.js';

import { CrimeCityMapUI } from './crimeCity/CrimeCityMapUI.js';
import { installEvidenceGridMapCosts } from './crimeCity/EvidenceGridMapCosts.js';
import { CrimeCityNpcManager } from './crimeCity/CrimeCityNpcManager.js';

import { crimeCityHudMethods } from './crimeCity/CrimeCityHudMethods.js';
import { crimeCityContentMethods } from './crimeCity/CrimeCityContentMethods.js';
import { crimeCityTravelMethods } from './crimeCity/CrimeCityTravelMethods.js';
import { crimeCityApartmentMethods } from './crimeCity/CrimeCityApartmentMethods.js';

const CITY_ALIASES = Object.freeze({
  new_york: 'new_york_city',
  new_york_city: 'new_york_city',

  new_delhi: 'new_delhi',
  new_dehli: 'new_delhi',

  kotte: 'kotte',
  sri_jayawardenepura_kotte: 'kotte'
});

function citySlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/đ/g, 'd')
    .replace(/ð/g, 'd')
    .replace(/þ/g, 'th')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ß/g, 'ss')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');
}

function aliasedCitySlug(value) {
  const slug = citySlug(value);
  return CITY_ALIASES[slug] || slug;
}

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

    this._mapContentBuilt = false;
    this._mapContentSignature = null;
    this._mapContentSize = null;
    this._mapContentConfig = null;

    this._crimeCityErrorView = null;
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

    this.cityData = null;
    this.crimeCityConfig = null;

    this.interactiveObjects = [];
    this.cityAmbient = null;

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.isVisitingApartment = false;

    this.alibiEncountersEnsuredFor = null;

    this.progressService = new CrimeCityProgressService(this);

    this.reconstructionService = new CrimeCityReconstructionService({
      cache: this.cache,
      gameState,
      cityId: this.cityId,
      getCaseKey: () => this.getCaseKey()
    });

    this.tutorialController = new CrimeCityTutorialController(this);
    this.tutorialController.initialize(data);

    this.mapUI = new CrimeCityMapUI(this);
    installEvidenceGridMapCosts(this.mapUI, gameState);
    this.npcManager = new CrimeCityNpcManager(this);
  }

  normalizeCityId(value) {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return 'paris';
    }

    const normalized = aliasedCitySlug(raw);
    const locations = this.cache?.json?.get('locations');

    if (Array.isArray(locations)) {
      const exactMatch = locations.find(location => (
        typeof location?.id === 'string' &&
        location.id === raw
      ));

      if (exactMatch) {
        return exactMatch.id;
      }

      const idMatches = locations.filter(location => (
        typeof location?.id === 'string' &&
        location.id.trim() &&
        aliasedCitySlug(location.id) === normalized
      ));

      if (idMatches.length === 1) {
        return idMatches[0].id;
      }

      const nameMatches = locations.filter(location => (
        typeof location?.id === 'string' &&
        location.id.trim() &&
        typeof location.city === 'string' &&
        aliasedCitySlug(location.city) === normalized
      ));

      if (nameMatches.length === 1) {
        return nameMatches[0].id;
      }
    }

    return normalized || raw;
  }

  create() {
    super.create();

    this.unbindLifecycleListeners();
    this.bindLifecycleListeners();

    try {
      this.cameras.main.resetFX();
      this.cameras.main.setAlpha(1);

      if (!this.initializeCrimeCity()) {
        return;
      }

      this.createCrimeCityContent();

      if (this._crimeCityErrorView) {
        return;
      }

      this.cameras.main.fadeIn(300, 0, 0, 0);

      this.startCrimeCityUiSetup();

      this.scheduleStoryEvents();
      this.startCrimeTutorial();
    } catch (error) {
      console.error(
        '[CrimeCityScene] Initialization failed:',
        error
      );

      this.showCrimeCityError(
        'The city map could not be prepared. ' +
        'Please return to the city and try again.'
      );
    }
  }

  startCrimeCityUiSetup() {
    if (this._cleanupDone || this._crimeCityErrorView) {
      return;
    }

    const token = this._runToken;

    void Promise.resolve()
      .then(() => {
        if (
          !this.isCurrentRun(token) ||
          this._crimeCityErrorView
        ) {
          return;
        }

        return this.setupCrimeCityUi();
      })
      .catch(error => {
        if (
          token !== this._runToken ||
          this._cleanupDone
        ) {
          return;
        }

        console.error(
          '[CrimeCityScene] Unhandled UI setup failure:',
          error
        );

        if (
          this.sys.isActive() &&
          !this._crimeCityErrorView
        ) {
          this.showCrimeCityError(
            'The city interface could not be restored. ' +
            'Please return to the city and try again.'
          );
        }
      });
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

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
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

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupScene,
      this
    );
  }

  isCurrentRun(token) {
    return (
      token === this._runToken &&
      !this._cleanupDone &&
      this.sys.isActive()
    );
  }

  onWakeOrResume() {
    if (this._cleanupDone) {
      return;
    }

    this.isTransitioning = false;
    this.isVisitingApartment = false;

    try {
      if (this.cameras.main.fadeEffect?.alpha > 0) {
        this.cameras.main.resetFX();
      }

      this.cameras.main.setAlpha(1);

      if (this._crimeCityErrorView) {
        return;
      }

      if (!this.cityData?.crimeCity) {
        this.showCrimeCityError();
        return;
      }

      this.refreshCrimeCityContent();

      if (this._crimeCityErrorView) {
        return;
      }

      if (!this.cityAmbient?.isPlaying) {
        this.playCityAmbient();
      }

      this.startCrimeCityUiSetup();

      this.crimeTutorial?.resume();
      this.syncCrimeTutorial();
    } catch (error) {
      console.error(
        '[CrimeCityScene] Resume failed:',
        error
      );

      this.showCrimeCityError(
        'The city map could not be refreshed. ' +
        'Please return to the city and try again.'
      );
    }
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

    this.stopCityAmbient();
    this.destroyControllers();

    this.interactiveObjects = [];
  }

  destroyControllers() {
    this.clearCrimeCityError();

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

    this._mapContentBuilt = false;
    this._mapContentSignature = null;
    this._mapContentSize = null;
    this._mapContentConfig = null;
  }
}

for (const methods of [
  crimeCityHudMethods,
  crimeCityContentMethods,
  crimeCityTravelMethods,
  crimeCityApartmentMethods
]) {
  for (const [name, descriptor] of Object.entries(
    Object.getOwnPropertyDescriptors(methods)
  )) {
    if (
      Object.prototype.hasOwnProperty.call(
        CrimeCityScene.prototype,
        name
      )
    ) {
      throw new Error(
        `[CrimeCityScene] Duplicate method: ${name}`
      );
    }

    Object.defineProperty(
      CrimeCityScene.prototype,
      name,
      {
        ...descriptor,
        enumerable: false
      }
    );
  }
}