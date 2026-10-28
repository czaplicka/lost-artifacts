import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';

import {
  generateCaseCityState,
  buildEncounterId
} from '../city-encounter-generator.js';

import { audioManager } from '../managers/AudioManager.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { getGameTimeManager } from '../managers/GameTimeManager.js';
import { saveGameState } from '../gameStatePersistence.js';

import {
  resolveCityNpcTheme,
  getNpcTextureKey,
  getNpcLabel
} from '../npcThemeHelper.js';

import { BaseScene } from './BaseScene.js';
import { addSessionScore } from '../managers/InvestigationManager.js';

const ALL_DAY = [
  'Morning',
  'Afternoon',
  'Evening',
  'Night'
];

const LOCATION_HOURS = {
  bank: ['Morning', 'Afternoon'],
  policehq: ['Morning', 'Afternoon', 'Evening'],
  hotel: ALL_DAY,
  airport: ALL_DAY,
  harbor: ALL_DAY,
  alley: ALL_DAY,
  parking: ALL_DAY,
  restaurant: ['Afternoon', 'Evening'],
  garbage: ALL_DAY,
  shop: ['Morning', 'Afternoon', 'Evening']
};

const CITY_BACKGROUND_KEYS = {
  london: 'london',
  paris: 'paris',
  new_delhi: 'newdelhi',
  newdelhi: 'newdelhi',
  warsaw: 'warsaw',
  new_york_city: 'newyorkcity',
  newyorkcity: 'newyorkcity',
  berlin: 'berlin',
  toronto: 'toronto',
  nairobi: 'nairobi',
  islamabad: 'islamabad',
  kotte: 'kotte',
  tokyo: 'tokyo',
  hq: 'start'
};

const NPC_QUESTION_PENALTY = 10;
const NPC_SCALE = 0.62;
const NPC_HOVER_SCALE = 0.68;

const SHOP_TAXI_ENERGY = 3;
const SHOP_ICON_SIZE = 132;
const SHOP_LABEL_OFFSET = 82;

const MINUTES_PER_DAY = 1440;
const HUD_READY_TIMEOUT = 15000;

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
    this._runToken = null;
    this._waitCancels = new Set();
    this._uiLoading = null;
    this._initialOverlayOpened = false;
    this.uiReady = false;

    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundWakeOrResume = this.onWakeOrResume.bind(this);
    this.boundSleep = this.onSleep.bind(this);
  }

  init(data = {}) {
    this.cancelUiWaits();

    this._runToken = Symbol('city-run');
    this._uiPromise = null;
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

    this.showUiLoading();
    void this.finishCityStartup();
  }

  async finishCityStartup() {
    const token = this._runToken;
    const ready = await this.setupCityUi();

    if (
      token !== this._runToken ||
      !this.canUseCity()
    ) {
      return;
    }

    if (!ready) {
      this.showUiLoading(
        'Interface unavailable.\nClick here to retry.',
        true
      );
      return;
    }

    this.hideUiLoading();
    this.openInitialOverlayIfNeeded();
  }

  showUiLoading(
    message = 'Preparing field equipment...',
    retry = false
  ) {
    this.hideUiLoading();

    const { width, height } = this.scale;

    const root = this.add.container(0, 0)
      .setDepth(9000)
      .setScrollFactor(0);

    const blocker = this.add.rectangle(
      0, 0, width, height, 0x000000, 0.24
    )
      .setOrigin(0)
      .setInteractive();

    const label = this.add.text(
      width / 2,
      height / 2,
      message,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffe6a3',
        backgroundColor: '#17110eee',
        padding: { x: 24, y: 18 },
        align: 'center',
        wordWrap: { width: Math.max(100, width - 64) }
      }
    ).setOrigin(0.5);

    root.add([blocker, label]);
    this._uiLoading = root;

    if (retry) {
      label.setInteractive({ useHandCursor: true });

      label.once('pointerdown', () => {
        this.showUiLoading();
        void this.finishCityStartup();
      });
    }
  }

  hideUiLoading() {
    this._uiLoading?.destroy(true);
    this._uiLoading = null;
  }

  bindLifecycleListeners() {
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );
  }

  unbindLifecycleListeners() {
    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundWakeOrResume
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.boundSleep
    );
  }

  canUseCity() {
    return !this._cleanupDone && this.sys.isActive();
  }

  canStartInteraction() {
    return (
      this.canUseCity() &&
      this.uiReady &&
      !this.isTransitioning &&
      !this.activePopup
    );
  }

  waitForUi(predicate, token) {
    return new Promise(resolve => {
      let settled = false;
      let timeout = null;

      const finish = result => {
        if (settled) return;
        settled = true;

        clearTimeout(timeout);
        this.game.events.off('poststep', check);
        this._waitCancels.delete(cancel);

        resolve(result);
      };

      const cancel = () => finish(false);

      const check = () => {
        if (
          token !== this._runToken ||
          this._cleanupDone
        ) {
          finish(false);
          return;
        }

        try {
          if (predicate()) finish(true);
        } catch (error) {
          console.error('[CityScene] UI readiness check failed:', error);
          finish(false);
        }
      };

      this._waitCancels.add(cancel);
      this.game.events.on('poststep', check);

      timeout = setTimeout(
        () => finish(false),
        HUD_READY_TIMEOUT
      );

      check();
    });
  }

  cancelUiWaits() {
    for (const cancel of [...this._waitCancels]) {
      cancel();
    }

    this._waitCancels.clear();
  }

  async setupCityUi() {
    if (this._uiPromise) return this._uiPromise;
    if (!this.canUseCity()) return false;

    const token = this._runToken;
    this.isSettingUpUi = true;

    const promise = (async () => {
      try {
        const results = await Promise.all([
          this.prepareMainHud(token),
          this.preparePlayerHud(token),
          this.prepareNewsHud(token)
        ]);

        if (
          token !== this._runToken ||
          !this.canUseCity() ||
          results.some(result => !result)
        ) {
          return false;
        }

        this.registry.set('currentSceneKey', 'CityScene');

        this.bringSceneToTopIfActive('PlayerHudScene');
        this.bringSceneToTopIfActive('NewsHud');

        this.uiReady = true;
        return true;
      } catch (error) {
        if (token === this._runToken && !this._cleanupDone) {
          console.error('[CityScene] UI setup failed:', error);
        }

        return false;
      } finally {
        if (token === this._runToken) {
          this.isSettingUpUi = false;
        }
      }
    })();

    this._uiPromise = promise;

    try {
      return await promise;
    } finally {
      if (this._uiPromise === promise) {
        this._uiPromise = null;
      }
    }
  }

  async prepareMainHud(token) {
    const hud = await this.ensureOverlayScene('UIScene');

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => (
        hud.sys.isActive() &&
        !hud._isDestroyed &&
        Boolean(hud.dom?.container?.isConnected) &&
        Boolean(hud.hudStanding)
      ),
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.showHUD();

    return true;
  }

  async preparePlayerHud(token) {
    const hud = await this.restorePlayerHud();

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => hud.sys.isActive() && hud.isHudReady === true,
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.setCurrentGameplayScene?.('CityScene');
    hud.closeAllUIPanels?.();
    hud.refreshNotebook?.();
    hud.refreshUI?.();

    ensureHud(this);
    return true;
  }

  async prepareNewsHud(token) {
    const hud = await this.ensureOverlayScene('NewsHud');

    if (!hud || token !== this._runToken) return false;

    const ready = await this.waitForUi(
      () => hud.sys.isActive() && hud.isUiReady?.() === true,
      token
    );

    if (!ready || !this.canUseCity()) return false;

    hud.scene.setVisible(true);
    hud.setHudVisible(true);
    hud.setNewspaperVisible(true);
    hud.setTvVisible(false);

    return true;
  }

  openInitialOverlayIfNeeded() {
    if (
      !this.canUseCity() ||
      !this.uiReady ||
      this._initialOverlayOpened
    ) {
      return;
    }

    this._initialOverlayOpened = true;

    if (this.isFinalShowdown) {
      this.closeAllUIPanels();
      void this.launchOverlay('ArrestSelectionScene');
      return;
    }

    if (this.shouldShowPhoneCallNow()) {
      this.closeAllUIPanels();

      void this.launchOverlay('PhoneCallScene', {
        sourceScene: 'CityScene',
        cityId: this.cityId
      });

      return;
    }

    if (this.openDestinationsOnCreate) {
      this.openDestinationsPanel();
    }
  }

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) return this.cityAmbient;

    this.cityAmbient = audioManager.playAmbient('citysound', {
      volume: 0.22,
      loop: true
    });

    return this.cityAmbient;
  }

  stopCityAmbient() {
    if (!this.cityAmbient) return;

    audioManager.releaseSound(this.cityAmbient);
    this.cityAmbient = null;
  }

  onWakeOrResume() {
    if (this._cleanupDone) return;

    this.isTransitioning = false;

    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    this.refreshEncounterViews();

    void this.setupCityUi().then(ready => {
      if (ready && this.canUseCity()) {
        this.hideUiLoading();
      }
    });
  }

  onSleep() {
    this.stopCityAmbient();
  }

  changeScore(points, label = 'City investigation') {
    const delta = Number.isFinite(points)
      ? Math.floor(points)
      : 0;

    if (!delta) return gameState.score || 0;

    addSessionScore(delta, label);

    const hud = this.getPlayerHudScene();
    hud?.refreshNotebook?.();
    hud?.refreshUI?.();

    EventBus.emit('scoreChanged', {
      delta,
      total: gameState.score
    });

    return gameState.score;
  }

  ensureCityEncounterState(locations) {
    const existing = gameState.cityEncounterState;

    if (Array.isArray(existing[this.cityId])) return;

    const caseId =
      gameState.currentMission?.id ||
      gameState.currentMission?.caseId ||
      gameState.currentArtifact ||
      `${this.cityId}-default`;

    const generated = generateCaseCityState(
      locations,
      String(caseId),
      {}
    );

    gameState.cityEncounterState = {
      ...generated,
      ...existing
    };

    if (!Array.isArray(gameState.cityEncounterState[this.cityId])) {
      gameState.cityEncounterState[this.cityId] =
        generated[this.cityId] || [];
    }
  }

  ensureHarborEncounter() {
    if (this.city?.harbor !== true) return;

    const encounters = gameState.cityEncounterState[this.cityId];

    if (!Array.isArray(encounters)) return;

    const existing = encounters.find(encounter => (
      encounter?.locationId === 'harbor' &&
      encounter.enabled !== false
    ));

    if (existing) return;

    const pair = this.city.encounterPool?.find(entry => (
      entry?.npcId === 'sailor' &&
      entry?.locationId === 'harbor'
    )) || {
      id: `${this.cityId}_sailor_harbor`,
      npcId: 'sailor',
      locationId: 'harbor'
    };

    const occupiedSlots = new Set(
      encounters
        .filter(entry => entry?.enabled !== false)
        .map(entry => entry.slotId)
    );

    const freeSlot = this.city.encounterSlots?.find(slot => (
      slot.enabled &&
      !occupiedSlots.has(slot.id)
    ));

    const slotId = freeSlot?.id || 'harbor_extra';

    const harbor = {
      id: buildEncounterId(this.cityId, pair.id, slotId),
      baseEncounterId: pair.id,
      cityId: this.cityId,
      cityX: freeSlot?.cityX ?? 130,
      cityY: freeSlot?.cityY ?? Math.max(230, this.scale.height - 260),
      slotId,
      npcId: pair.npcId,
      locationId: 'harbor',
      enabled: true
    };

    gameState.cityEncounterState = {
      ...gameState.cityEncounterState,
      [this.cityId]: [...encounters, harbor]
    };

    saveGameState();
  }

  getEncounters() {
    const list = gameState.cityEncounterState?.[this.cityId];

    if (!Array.isArray(list)) return [];

    return list.filter(encounter => (
      encounter &&
      typeof encounter === 'object' &&
      encounter.enabled !== false
    ));
  }

  isEncounterVisited(encounterId) {
    return gameState.hasEncounter(encounterId);
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) return null;

    const memory = gameState.encounterMemory;

    if (
      !memory ||
      typeof memory !== 'object' ||
      Array.isArray(memory)
    ) {
      return null;
    }

    return memory[encounterId] || null;
  }

  getEncounterStatus(encounter) {
    const isVisited = this.isEncounterVisited(encounter.id);
    const memory = this.getEncounterMemory(encounter.id);
    const hasMemory = Boolean(memory);

    return {
      isVisited,
      memory,
      hasMemory,
      isRepeat: isVisited || hasMemory
    };
  }

  createEncounters() {
    this.destroyEncounterViews();

    for (const encounter of this.getEncounters()) {
      this.createEncounterView(encounter);
    }
  }

  createEncounterView(encounter) {
    const textureKey = getNpcTextureKey(
      encounter.npcId,
      this.npcTheme
    );

    const iconKey = this.textures.exists(textureKey)
      ? textureKey
      : 'fence_w';

    const icon = this.add.image(
      encounter.cityX,
      encounter.cityY,
      iconKey
    )
      .setScale(NPC_SCALE)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    const name = getNpcLabel(encounter.npcId);

    const label = encounter.locationId === 'harbor'
      ? `${name} · Harbor`
      : name;

    const nameLabel = this.add.text(0, 0, label, {
      fontFamily: 'SpecialElite',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000bb',
      padding: { left: 8, right: 8, top: 4, bottom: 4 },
      align: 'center',
      wordWrap: { width: 220 }
    })
      .setOrigin(0.5, 0)
      .setDepth(4);

    const statusLabel = this.add.text(0, 0, '', {
      fontFamily: 'SpecialElite',
      fontSize: '15px',
      color: '#f1e6b8',
      backgroundColor: '#000000cc',
      padding: { left: 6, right: 6, top: 3, bottom: 3 }
    })
      .setOrigin(0.5, 1)
      .setDepth(4)
      .setVisible(false);

    const view = {
      encounter,
      icon,
      nameLabel,
      statusLabel,
      hovered: false
    };

    icon.on('pointerover', () => {
      if (!this.canStartInteraction()) return;

      view.hovered = true;
      this.updateEncounterView(view);
    });

    icon.on('pointerout', () => {
      view.hovered = false;
      this.updateEncounterView(view);
    });

    icon.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitEncounter(encounter);
    });

    this.encounterViews.push(view);
    this.interactiveObjects.push(icon);

    this.updateEncounterView(view);
  }

  updateEncounterView(view) {
    if (!view.icon?.active) return;

    const { isVisited, memory, hasMemory } =
      this.getEncounterStatus(view.encounter);

    view.icon
      .setScale(view.hovered ? NPC_HOVER_SCALE : NPC_SCALE)
      .setAlpha(isVisited ? (view.hovered ? 0.88 : 0.72) : 1)
      .setTint(isVisited ? 0xc8c8c8 : 0xffffff);

    const halfWidth = view.icon.displayWidth / 2;
    const halfHeight = view.icon.displayHeight / 2;

    const minX = halfWidth + 12;
    const maxX = this.scale.width - halfWidth - 12;

    const minY = halfHeight + 115;
    const maxY = this.scale.height - halfHeight - 125;

    view.icon.setPosition(
      Phaser.Math.Clamp(
        Number(view.encounter.cityX) || this.scale.width / 2,
        Math.min(minX, maxX),
        Math.max(minX, maxX)
      ),
      Phaser.Math.Clamp(
        Number(view.encounter.cityY) || this.scale.height / 2,
        Math.min(minY, maxY),
        Math.max(minY, maxY)
      )
    );

    view.nameLabel
      .setPosition(
        view.icon.x,
        view.icon.y + halfHeight + 10
      )
      .setColor(
        view.hovered
          ? (isVisited ? '#f1e6b8' : '#ffe066')
          : (isVisited ? '#d0d0d0' : '#ffffff')
      );

    view.statusLabel
      .setPosition(
        view.icon.x,
        view.icon.y - halfHeight - 8
      )
      .setVisible(isVisited);

    if (isVisited) {
      view.statusLabel.setText(
        hasMemory && memory.reminderShown === false
          ? 'Can remind you'
          : 'Already questioned'
      );
    }
  }

  refreshEncounterViews() {
    for (const view of this.encounterViews) {
      view.hovered = false;
      this.updateEncounterView(view);
    }
  }

  destroyEncounterViews() {
    const views = this.encounterViews.splice(0);
    const icons = new Set(views.map(view => view.icon));

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !icons.has(object)
    );

    for (const { icon, nameLabel, statusLabel } of views) {
      for (const object of [icon, nameLabel, statusLabel]) {
        object?.removeAllListeners?.();
        object?.destroy?.();
      }
    }
  }

  getCityClock() {
    const rawHour = Number(
      gameState.currentHour ?? gameState.hour ?? 8
    );

    const rawMinute = Number(
      gameState.currentMinute ?? gameState.minute ?? 0
    );

    const hour = Number.isFinite(rawHour)
      ? Math.max(0, Math.floor(rawHour))
      : 8;

    const minute = Number.isFinite(rawMinute)
      ? Math.max(0, Math.floor(rawMinute))
      : 0;

    const total = (hour * 60 + minute) % MINUTES_PER_DAY;

    return {
      hour: Math.floor(total / 60),
      minute: total % 60,
      totalMinutes: total
    };
  }

  getPartOfDayForHour(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  }

  isLocationOpen(locationId, clock = this.getCityClock()) {
    const allowed = LOCATION_HOURS[locationId];

    return !allowed || allowed.includes(
      this.getPartOfDayForHour(clock.hour)
    );
  }

  getMinutesUntilOpening(locationId) {
    const clock = this.getCityClock();

    if (this.isLocationOpen(locationId, clock)) return 0;

    for (let minutes = 1; minutes <= MINUTES_PER_DAY; minutes++) {
      const total =
        (clock.totalMinutes + minutes) % MINUTES_PER_DAY;

      if (this.isLocationOpen(locationId, {
        hour: Math.floor(total / 60),
        minute: total % 60
      })) {
        return minutes;
      }
    }

    return null;
  }

  formatCityClock(clock) {
    return (
      `${String(clock.hour).padStart(2, '0')}:` +
      `${String(clock.minute).padStart(2, '0')}`
    );
  }

  formatWaitDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours && remaining) return `${hours}h ${remaining}m`;
    if (hours) return `${hours}h`;

    return `${remaining}m`;
  }

  visitEncounter(encounter) {
    if (!this.canStartInteraction()) return false;

    this.closeAllUIPanels();

    const flags = this.getCityProgressFlags();
    const target = this.getDialogueTargetCityId(flags);

    if (!this.isLocationOpen(encounter.locationId)) {
      this.showLocationClosedPopup(
        encounter.locationId,
        encounter,
        target
      );

      return false;
    }

    return this.openEncounter(encounter, target);
  }

  openEncounter(encounter, dialogueTargetCityId) {
    if (!this.canStartInteraction()) return false;

    if (!this.isLocationOpen(encounter.locationId)) {
      this.showLocationClosedPopup(
        encounter.locationId,
        encounter,
        dialogueTargetCityId
      );

      return false;
    }

    const status = this.getEncounterStatus(encounter);
    const flags = this.getCityProgressFlags();

    const started = this.transitionTo('LocationScene', {
      cityId: this.cityId,
      encounterId: encounter.id,
      npcId: encounter.npcId,
      locationId: encounter.locationId,
      isRepeat: status.isRepeat,
      isCrimeCity: flags.isCrimeCity,
      isNextTargetCity: flags.isNextTargetCity,
      isCorrectCity: flags.isCorrectCity,
      dialogueTargetCityId:
        dialogueTargetCityId === undefined
          ? this.getDialogueTargetCityId(flags)
          : dialogueTargetCityId
    });

    if (started && !status.isRepeat) {
      this.changeScore(-NPC_QUESTION_PENALTY);
    }

    return started;
  }

  getDialogueTargetCityId(progressFlags = null) {
    const manager = gameState.routeManager;
    const flags = progressFlags || this.getCityProgressFlags();

    if (typeof manager?.getNextExpectedCity === 'function') {
      return manager.getNextExpectedCity();
    }

    return flags.isCrimeCity
      ? gameState.crimeCityId || null
      : gameState.nextTargetCityId || null;
  }

  getCityProgressFlags() {
    const manager = gameState.routeManager;

    const expectedCityId =
      typeof manager?.getNextExpectedCity === 'function'
        ? manager.getNextExpectedCity()
        : gameState.nextTargetCityId || null;

    const isCrimeCity = Boolean(
      gameState.crimeCityId &&
      this.cityId === gameState.crimeCityId
    );

    const isNextTargetCity = Boolean(
      expectedCityId &&
      this.cityId === expectedCityId
    );

    const isJustReachedCorrectCity = Boolean(
      gameState.justReachedCorrectCityId &&
      this.cityId === gameState.justReachedCorrectCityId
    );

    return {
      isCrimeCity,
      isNextTargetCity,
      isJustReachedCorrectCity,
      isOnEscapeRoute: false,
      isCurrentVisitedRouteCity: false,
      isCorrectCity:
        isCrimeCity ||
        isNextTargetCity ||
        isJustReachedCorrectCity
    };
  }

  shouldShowPhoneCallNow() {
    return (
      this.pendingPhoneCall === true &&
      (
        !this.pendingPhoneCallCityId ||
        this.pendingPhoneCallCityId === this.cityId
      )
    );
  }

  openDestinationsPanel() {
    if (this._cleanupDone || !this.uiReady) return false;

    const hud = this.getPlayerHudScene();
    hud?.closeAllUIPanels?.();

    if (hud?.openDestinationsPanel) {
      return hud.openDestinationsPanel();
    }

    if (hud?.toggleDestinationsPanel) {
      return hud.toggleDestinationsPanel(true);
    }

    EventBus.emit('openDestinations');
    return true;
  }

  createBackground(city) {
    const key = city.backgroundKey || this.getCityBackgroundKey(city);

    if (this.textures.exists(key)) {
      this.add.image(
        this.scale.width / 2,
        this.scale.height / 2,
        key
      ).setDisplaySize(this.scale.width, this.scale.height);
    } else {
      console.warn('[CityScene] Missing city background:', key);
      this.cameras.main.setBackgroundColor('#20242b');
    }
  }

  getCityBackgroundKey(city) {
    return CITY_BACKGROUND_KEYS[city.id] || city.id;
  }

  createHeader(city) {
    this.add.rectangle(
      0, 0, this.scale.width, 80, 0x000000, 0.45
    ).setOrigin(0);

    this.add.text(40, 24, `${city.city}, ${city.country}`, {
      fontFamily: 'SpecialElite',
      fontSize: '28px',
      color: '#ffffff'
    });

    let subtitle = 'Talk to witnesses and follow the trail.';

    if (this.isFinalShowdown) {
      subtitle =
        'The suspect is cornered. Review the evidence and make the arrest.';
    } else if (this.cityCompleted) {
      subtitle = 'City cleared. Choose the next destination on the map.';
    }

    this.add.text(40, 54, subtitle, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#f1e6b8',
      wordWrap: { width: Math.max(100, this.scale.width - 80) }
    });
  }

  createHotelIcon() {
    this.destroyHotelObjects();

    const configured = this.city?.hotel;
    const x = Number.isFinite(configured?.x)
      ? configured.x
      : this.scale.width - 130;

    const y = Number.isFinite(configured?.y)
      ? configured.y
      : Math.max(150, this.scale.height - 355);

    let icon;

    if (this.textures.exists('hotel_icon')) {
      icon = this.add.image(x, y, 'hotel_icon');

      const size = Math.max(icon.width, icon.height, 1);
      icon.setScale(112 / size);
    } else {
      icon = this.add.rectangle(
        x, y, 112, 86, 0x30271d, 0.96
      ).setStrokeStyle(3, 0xd4af37);
    }

    const baseScaleX = icon.scaleX;
    const baseScaleY = icon.scaleY;

    icon
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(
      x,
      y + 66,
      'HOTEL',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#000000bb',
        padding: { x: 10, y: 5 }
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(6)
      .setInteractive({ useHandCursor: true });

    const objects = [icon, label];

    if (!this.textures.exists('hotel_icon')) {
      const symbol = this.add.text(x, y, 'HOTEL', {
        fontFamily: 'PressStart2P',
        fontSize: '13px',
        color: '#f6dc8c'
      })
        .setOrigin(0.5)
        .setDepth(6);

      objects.push(symbol);
    }

    const enter = pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitHotel();
    };

    for (const target of [icon, label]) {
      target.on('pointerdown', enter);

      target.on('pointerover', () => {
        if (!this.canStartInteraction()) return;

        icon.setScale(baseScaleX * 1.08, baseScaleY * 1.08);
        label.setColor('#ffe066');
      });

      target.on('pointerout', () => {
        icon.setScale(baseScaleX, baseScaleY);
        label.setColor('#ffffff');
      });
    }

    this.hotelObjects.push(...objects);
    this.interactiveObjects.push(icon, label);
  }

  visitHotel() {
    if (!this.canStartInteraction()) return false;

    this.closeAllUIPanels();

    return this.transitionTo('HotelScene', {
      cityId: this.cityId,
      returnScene: 'CityScene',
      returnData: {
        cityId: this.cityId,
        cityCompleted: this.cityCompleted,
        investigationStatus: this.investigationStatus,
        pendingPhoneCall: false,
        openDestinations: false
      }
    });
  }

  destroyHotelObjects() {
    const objects = this.hotelObjects.splice(0);
    const removing = new Set(objects);

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !removing.has(object)
    );

    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  createShopIcon() {
    this.destroyShopObjects();

    const position = this.city?.shop || {
      x: this.scale.width - 130,
      y: this.scale.height - 170
    };

    const hasTexture = this.textures.exists('shop_icon');

    const icon = hasTexture
      ? this.add.image(position.x, position.y, 'shop_icon')
      : this.add.circle(
          position.x,
          position.y,
          SHOP_ICON_SIZE / 2,
          0x806127,
          0.95
        ).setStrokeStyle(3, 0xffd166);

    const baseScale = hasTexture
      ? SHOP_ICON_SIZE / Math.max(icon.width, icon.height, 1)
      : 1;

    icon
      .setScale(baseScale)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(
      position.x,
      position.y + SHOP_LABEL_OFFSET,
      `Shop (-${SHOP_TAXI_ENERGY} Energy)`,
      {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 7, y: 4 },
        align: 'center'
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(6);

    icon.on('pointerover', () => {
      if (!this.canStartInteraction()) return;

      icon.setScale(baseScale * 1.1);
      label.setColor('#ffe066');
    });

    icon.on('pointerout', () => {
      icon.setScale(baseScale);
      label.setColor('#ffffff');
    });

    icon.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      this.visitShop();
    });

    this.shopObjects.push(icon, label);
    this.interactiveObjects.push(icon);

    if (!hasTexture) this.requestShopIconAsset();
  }

  requestShopIconAsset() {
    if (
      this.shopAssetHandler ||
      this.textures.exists('shop_icon')
    ) {
      return;
    }

    const event = 'filecomplete-image-shop_icon';

    const callback = () => {
      this.shopAssetHandler = null;

      if (this.canUseCity()) {
        this.createShopIcon();
      }
    };

    this.shopAssetHandler = { event, callback };

    this.load.once(event, callback);
    this.load.image('shop_icon', 'assets/shop.png');

    if (!this.load.isLoading()) {
      this.load.start();
    }
  }

  destroyShopObjects() {
    const objects = this.shopObjects.splice(0);
    const removing = new Set(objects);

    this.interactiveObjects = this.interactiveObjects.filter(
      object => !removing.has(object)
    );

    for (const object of objects) {
      object?.removeAllListeners?.();
      object?.destroy?.();
    }
  }

  visitShop() {
    if (!this.canStartInteraction()) return false;

    if (getEnergyManager().getCurrentEnergy() < SHOP_TAXI_ENERGY) {
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

      if (!this.canUseCity()) return false;

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
        returnScene: 'CityScene'
      });

      if (!this.canUseCity()) return false;

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
        void this.setupCityUi();
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
      console.error('[CityScene] Opening ShopScene failed:', error);

      if (this.canUseCity()) {
        this.scene.stop('ShopScene');

        this.showMessage(
          'The shop could not be opened.\nCheck the console for details.',
          3200,
          '#8b0000'
        );

        void this.setupCityUi();
      }

      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  showNoEnergyPopup() {
    this.showMessage(
      "You're too exhausted, detective.\nGet some rest before continuing the case.",
      2400,
      '#8b0000'
    );
  }

  showMessage(text, duration = 2200, color = '#37474f') {
    if (!text || !this.canUseCity()) return null;

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
        wordWrap: { width: Math.max(100, this.scale.width - 70) }
      }
    )
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => {
      if (popup?.active) popup.destroy();
    });

    return popup;
  }

  transitionTo(sceneKey, data = {}) {
    if (
      !sceneKey ||
      this.isTransitioning ||
      !this.canUseCity()
    ) {
      return false;
    }

    this.isTransitioning = true;

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.canUseCity()) {
          this.isTransitioning = false;
          return;
        }

        void this.goto(sceneKey, data)
          .then(started => {
            if (!started && !this._cleanupDone) {
              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          })
          .catch(error => {
            if (!this._cleanupDone) {
              console.error(
                `[CityScene] Transition to "${sceneKey}" failed:`,
                error
              );

              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          });
      }
    );

    this.cameras.main.fadeOut(300, 0, 0, 0);
    return true;
  }

  showLocationClosedPopup(
    locationId,
    encounterData,
    dialogueTargetCityId = null
  ) {
    if (!this.canStartInteraction()) return;

    const { width, height } = this.scale;
    const objects = [];

    const clock = this.getCityClock();
    const waitMinutes = this.getMinutesUntilOpening(locationId);
    const allowed = (LOCATION_HOURS[locationId] || []).join(', ');

    const waitLabel = waitMinutes === null
      ? 'Opening unavailable'
      : waitMinutes === 0
        ? 'Enter now'
        : `Wait ${this.formatWaitDuration(waitMinutes)}`;

    const overlay = this.add.rectangle(
      0, 0, width, height, 0x000000, 0.7
    )
      .setOrigin(0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add.rectangle(
      width / 2, height / 2, 500, 300, 0x111111, 0.95
    )
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100)
      .setInteractive();

    const warningText = this.add.text(
      width / 2,
      height / 2 - 50,
      [
        'Location is currently closed.',
        `Open: ${allowed}`,
        `Current: ${this.formatCityClock(clock)} (${this.getPartOfDayForHour(clock.hour)})`
      ].join('\n'),
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 460 }
      }
    )
      .setOrigin(0.5)
      .setDepth(101);

    const waitBtn = this.add.text(
      width / 2,
      height / 2 + 30,
      waitLabel,
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: waitMinutes === null ? '#777777' : '#ffcc00'
      }
    )
      .setOrigin(0.5)
      .setDepth(101);

    if (waitMinutes !== null) {
      waitBtn.setInteractive({ useHandCursor: true });
    }

    const cancelBtn = this.add.text(
      width / 2,
      height / 2 + 80,
      'Return',
      {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#aaaaaa'
      }
    )
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    objects.push(
      overlay,
      popupBg,
      warningText,
      waitBtn,
      cancelBtn
    );

    const popupState = {
      cleanup: null,
      objects,
      busy: false
    };

    const cleanupPopup = () => {
      for (const object of objects) {
        if (object?.active) {
          object.removeAllListeners?.();
          object.destroy();
        }
      }

      if (this.activePopup === popupState) {
        this.activePopup = null;
      }
    };

    const cancelPopup = () => {
      if (!popupState.busy) cleanupPopup();
    };

    popupState.cleanup = cleanupPopup;
    this.activePopup = popupState;

    overlay.on('pointerdown', cancelPopup);
    cancelBtn.on('pointerdown', cancelPopup);

    waitBtn.on('pointerdown', pointer => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (
        popupState.busy ||
        this.activePopup !== popupState ||
        this.isTransitioning ||
        !this.canUseCity()
      ) {
        return;
      }

      const minutesToWait = this.getMinutesUntilOpening(locationId);

      if (minutesToWait === null) {
        warningText.setText(
          'No opening time is available for this location.'
        );
        return;
      }

      popupState.busy = true;
      waitBtn.disableInteractive();
      cancelBtn.disableInteractive();

      const wasGameActive = gameState.isGameActive === true;

      try {
        if (minutesToWait > 0) {
          getGameTimeManager().handleAdvanceTime(0, minutesToWait);
        }

        if (
          !this.canUseCity() ||
          this.activePopup !== popupState
        ) {
          return;
        }

        if (wasGameActive && gameState.isGameActive === false) {
          cleanupPopup();
          return;
        }

        cleanupPopup();
        this.openEncounter(encounterData, dialogueTargetCityId);
      } catch (error) {
        console.error('[CityScene] Waiting failed:', error);

        if (
          this.canUseCity() &&
          this.activePopup === popupState
        ) {
          cleanupPopup();

          this.showMessage(
            'Waiting could not be completed.\nCheck the clock before trying again.',
            4000,
            '#8b0000'
          );
        }
      }
    });
  }

  closeAllUIPanels() {
    this.getPlayerHudScene()?.closeAllUIPanels?.();
  }

  cleanupScene() {
    this.unbindLifecycleListeners();

    this._runToken = null;
    this.cancelUiWaits();

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.uiReady = false;
    this._uiPromise = null;

    this.hideUiLoading();

    this.activePopup?.cleanup?.();
    this.activePopup = null;

    if (this.shopAssetHandler) {
      this.load.off(
        this.shopAssetHandler.event,
        this.shopAssetHandler.callback
      );

      this.shopAssetHandler = null;
    }

    this.destroyEncounterViews();
    this.destroyShopObjects();
    this.destroyHotelObjects();

    for (const object of this.interactiveObjects) {
      object?.removeAllListeners?.();
    }

    this.interactiveObjects = [];
    this.stopCityAmbient();

    this.stopSceneIfActive('ArrestSelectionScene');
    this.stopSceneIfActive('PhoneCallScene');
    this.stopSceneIfActive('HypothesisScene');
    this.stopSceneIfActive('ShopScene');
  }
}