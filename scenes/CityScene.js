import { BaseScene } from './BaseScene.js';
import { CityMapDebug } from './city/CityMapDebug.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import {
  resolveCityNpcTheme,
  getNpcTextureKey,
  getNpcLabel
} from '../npcThemeHelper.js';
import { CityUi } from './city/CityUi.js';
import { CityEncounters } from './city/CityEncounters.js';
import { CityClock } from './city/CityClock.js';
import { CityPlaces } from './city/CityPlaces.js';
import { CityPresentation } from './city/CityPresentation.js';
import { CityLifecycle } from './city/CityLifecycle.js';

export class CityScene extends BaseScene {
  constructor() {
    super({ key: 'CityScene' });

    this.city = null;
    this.cityId = 'warsaw';

    this.interactiveObjects = [];
    this.encounterViews = [];
    this.shopObjects = [];
    this.hotelObjects = [];

    this.shopAssetHandler = null;
    this.cityAmbient = null;
    this.activePopup = null;

    this._uiPromise = null;
    this._uiFailures = [];
    this._runToken = null;
    this._waitCancels = new Set();
    this._uiLoading = null;
    this._initialOverlayOpened = false;
    this.uiReady = false;
    this.cityDebug = null;

    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundWakeOrResume = this.onWakeOrResume.bind(this);
    this.boundSleep = this.onSleep.bind(this);
  }

  init(data = {}) {
    this.cancelUiWaits();

    this._runToken = Symbol('city-run');
    this._uiPromise = null;
    this._uiFailures = [];
    this._initialOverlayOpened = false;
    this._uiLoading = null;

    this.cityId =
      data.cityId ||
      gameState.currentCityId ||
      this.registry.get('currentCityId') ||
      'warsaw';

    this.cityCompleted = Boolean(data.cityCompleted);
    this.investigationStatus = data.investigationStatus ?? null;

    this.isFinalShowdown = Boolean(
      data.isFinalShowdown ||
      this.investigationStatus === 'FINAL_SHOWDOWN'
    );

    this.pendingPhoneCall = Boolean(
      data.pendingPhoneCall ?? gameState.pendingPhoneCall
    );

    this.pendingPhoneCallCityId =
      data.pendingPhoneCallCityId ??
      gameState.pendingPhoneCallCityId ??
      null;

    this.openDestinationsOnCreate = Boolean(
      data.openDestinations ||
      (
        this.cityCompleted &&
        this.investigationStatus &&
        this.investigationStatus !== 'CITY_STILL_ACTIVE' &&
        this.investigationStatus !== 'FINAL_SHOWDOWN'
      )
    );

    this.city = null;
    this.interactiveObjects = [];
    this.encounterViews = [];
    this.shopObjects = [];
    this.hotelObjects = [];

    this.cityAmbient = null;
    this.npcTheme = 'default';

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.activePopup = null;
    this.shopAssetHandler = null;
    this.uiReady = false;

    [
      'encounterMemory',
      'specialScenesVisited',
      'cityEncounterState'
    ].forEach(key => {
      const value = gameState[key];

      if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value)
      ) {
        gameState[key] = {};
      }
    });
  }

  create() {
    super.create();

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);

    this.unbindLifecycleListeners();
    this.bindLifecycleListeners();

    this.stopSceneIfActive('LocationScene');
    this.stopSceneIfActive('ArrestSelectionScene');

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    this.playCityAmbient();

    const locations = this.cache.json.get('locations');

    if (!Array.isArray(locations)) {
      console.error('[CityScene] Invalid locations data.', locations);

      void this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: 'City data could not be loaded.'
      });

      return;
    }

    this.city = locations.find(entry => entry?.id === this.cityId);

    if (!this.city) {
      console.error('[CityScene] Unknown city:', this.cityId);

      void this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: `Unknown city: ${this.cityId}`
      });

      return;
    }

    this.npcTheme = resolveCityNpcTheme(this.city);

    gameState.currentCityId = this.cityId;
    gameState.currentCity = this.city.city;
    gameState.currentCountry = this.city.country;

    if (gameState.currentCityData?.id !== this.city.id) {
      gameState.currentCityData = structuredClone(this.city);
    }

    this.registry.set('currentCityId', this.cityId);
    this.registry.set('currentCity', this.city.city);
    this.registry.set('currentSceneKey', 'CityScene');
    this.registry.set('investigationStatus', this.investigationStatus);

    this.ensureCityEncounterState(locations);
    this.ensureHarborEncounter();

    this.createBackground(this.city);
    this.createHeader(this.city);

    if (!this.isFinalShowdown) {
      this.createEncounters();
      this.createShopIcon();
      this.createHotelIcon();
    }

    this.cityDebug?.destroy();
    this.cityDebug = new CityMapDebug(this);

    this.showUiLoading();
    void this.finishCityStartup();
  }
}

for (const module of [CityUi, CityEncounters, CityClock, CityPlaces, CityPresentation, CityLifecycle]) {
  for (const name of Object.getOwnPropertyNames(module.prototype)) {
    if (name === 'constructor') continue;
    if (Object.hasOwn(CityScene.prototype, name)) throw new Error(`Duplicate CityScene method: ${name}`);
    Object.defineProperty(CityScene.prototype, name,
      Object.getOwnPropertyDescriptor(module.prototype, name));
  }
}
