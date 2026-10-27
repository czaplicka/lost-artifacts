import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { generateCaseCityState } from '../city-encounter-generator.js';
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

const LOCATION_HOURS = {
  bank: ['Morning', 'Afternoon'],
  policehq: ['Morning', 'Afternoon', 'Evening'],
  hotel: ['Morning', 'Afternoon', 'Evening', 'Night'],
  airport: ['Morning', 'Afternoon', 'Evening', 'Night'],
  alley: ['Morning', 'Afternoon', 'Evening', 'Night'],
  parking: ['Morning', 'Afternoon', 'Evening', 'Night'],
  restaurant: ['Afternoon', 'Evening'],
  garbage: ['Morning', 'Afternoon', 'Evening', 'Night'],
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
const SHOP_TAXI_ENERGY = 3;
const SHOP_ICON_SIZE = 132;
const SHOP_LABEL_OFFSET = 82;
const MINUTES_PER_DAY = 1440;

export class CityScene extends BaseScene {
  constructor() {
    super({ key: 'CityScene' });

    this.city = null;
    this.cityId = 'warsaw';
    this.interactiveObjects = [];
    this.encounterViews = [];

    this.openDestinationsOnCreate = false;
    this.cityCompleted = false;
    this.investigationStatus = null;
    this.isFinalShowdown = false;
    this.pendingPhoneCall = false;
    this.pendingPhoneCallCityId = null;

    this.cityAmbient = null;
    this.npcTheme = 'default';
    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.activePopup = null;

    this.shopObjects = [];
    this.shopAssetHandler = null;

    this.boundCleanupScene = this.cleanupScene.bind(this);
    this.boundWakeOrResume = this.onWakeOrResume.bind(this);
    this.boundSleep = this.onSleep.bind(this);
  }

  init(data = {}) {
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
    this.cityAmbient = null;
    this.npcTheme = 'default';
    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.activePopup = null;
    this.shopObjects = [];
    this.shopAssetHandler = null;

    [
      'encounterMemory',
      'specialScenesVisited',
      'cityEncounterState'
    ].forEach((key) => {
      const value = gameState[key];

      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        gameState[key] = {};
      }
    });
  }

  create() {
    super.create();

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
      console.error('[CityScene] Invalid or missing locations data.', {
        cacheKey: 'locations',
        receivedData: locations,
        cityId: this.cityId
      });

      this.closeAllUIPanels();

      void this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: 'City data could not be loaded.'
      });

      return;
    }

    const city = locations.find((entry) => {
      return entry && typeof entry === 'object' && entry.id === this.cityId;
    });

    if (!city) {
      console.error('[CityScene] Requested city was not found.', {
        cityId: this.cityId,
        availableCityIds: locations
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => entry.id)
          .filter(Boolean)
      });

      this.closeAllUIPanels();

      void this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: `Unknown city: ${this.cityId}`
      });

      return;
    }

    this.city = city;
    this.npcTheme = resolveCityNpcTheme(city);

    gameState.currentCityId = this.cityId;
    gameState.currentCity = city.city;

    if (gameState.currentCityData?.id !== city.id) {
      gameState.currentCityData = structuredClone(city);
    }

    this.registry.set('currentCityId', this.cityId);
    this.registry.set('investigationStatus', this.investigationStatus);

    this.ensureCityEncounterState(locations);
    this.createBackground(city);
    this.createHeader(city);

    if (!this.isFinalShowdown) {
      this.createEncounters();
      this.createShopIcon();
    }

    try {
      ensureHud(this);
    } catch (error) {
      console.error('[CityScene] ensureHud failed:', error);
    }

    void this.setupCityUi();
    this.openInitialOverlayIfNeeded();
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
      !this.isTransitioning &&
      !this.activePopup
    );
  }

  async setupCityUi() {
    if (this.isSettingUpUi || !this.canUseCity()) return;

    this.isSettingUpUi = true;

    try {
      const uiScene = await this.ensureOverlayScene('UIScene');
      if (!this.canUseCity()) return;

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
      if (!this.canUseCity()) return;

      if (playerHud) {
        playerHud.setCurrentGameplayScene?.('CityScene');
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      }

      const newsHud = await this.ensureOverlayScene('NewsHud');
      if (!this.canUseCity()) return;

      if (newsHud) {
        newsHud.events?.emit('setNewspaperVisible', true);
        newsHud.events?.emit('setTvVisible', false);
        this.bringSceneToTopIfActive('NewsHud');
      }
    } catch (error) {
      if (!this._cleanupDone) {
        console.error('[CityScene] Failed to restore city UI:', error);
      }
    } finally {
      this.isSettingUpUi = false;
    }
  }

  openInitialOverlayIfNeeded() {
    if (!this.canUseCity()) return;

    if (this.isFinalShowdown) {
      this.time.delayedCall(250, () => {
        if (!this.canUseCity()) return;

        this.closeAllUIPanels();

        if (this.isSceneActive('ArrestSelectionScene')) {
          this.scene.bringToTop('ArrestSelectionScene');
          return;
        }

        void this.launchOverlay('ArrestSelectionScene');
      });

      return;
    }

    if (this.shouldShowPhoneCallNow()) {
      this.time.delayedCall(400, () => {
        if (!this.canUseCity()) return;

        this.closeAllUIPanels();

        if (this.isSceneActive('PhoneCallScene')) {
          this.scene.bringToTop('PhoneCallScene');
          return;
        }

        void this.launchOverlay('PhoneCallScene', {
          sourceScene: 'CityScene',
          cityId: this.cityId
        });
      });

      return;
    }

    if (this.openDestinationsOnCreate) {
      this.time.delayedCall(150, () => {
        if (this.canUseCity()) {
          this.openDestinationsPanel();
        }
      });
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

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    this.refreshEncounterViews();
    void this.setupCityUi();
  }

  onSleep() {
    this.stopCityAmbient();
  }

  changeScore(points, label = 'City investigation') {
    const delta = Number.isFinite(points) ? Math.floor(points) : 0;
    if (delta === 0) return gameState.score || 0;

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

    gameState.cityEncounterState = { ...generated, ...existing };

    if (!Array.isArray(gameState.cityEncounterState[this.cityId])) {
      gameState.cityEncounterState[this.cityId] =
        generated[this.cityId] || [];
    }
  }

  getEncounters() {
    const list = gameState.cityEncounterState?.[this.cityId];

    if (!Array.isArray(list)) return [];

    return list.filter((encounter) => {
      return (
        encounter &&
        typeof encounter === 'object' &&
        encounter.enabled !== false
      );
    });
  }

  isEncounterVisited(encounterId) {
    return gameState.hasEncounter(encounterId);
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) return null;

    const memory = gameState.encounterMemory;

    if (!memory || typeof memory !== 'object' || Array.isArray(memory)) {
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

    this.getEncounters().forEach((encounter) => {
      this.createEncounterView(encounter);
    });
  }

  createEncounterView(encounter) {
    const textureKey = getNpcTextureKey(encounter.npcId, this.npcTheme);
    const iconKey = this.textures.exists(textureKey)
      ? textureKey
      : 'fence_w';

    const x = encounter.cityX;
    const y = encounter.cityY;

    const icon = this.add
      .image(x, y, iconKey)
      .setScale(0.45)
      .setInteractive({ useHandCursor: true });

    const nameLabel = this.add
      .text(x, y + 88, getNpcLabel(encounter.npcId), {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5);

    const statusLabel = this.add
      .text(x, y - 82, '', {
        fontFamily: 'SpecialElite',
        fontSize: '14px',
        color: '#f1e6b8',
        backgroundColor: '#000000cc',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      })
      .setOrigin(0.5)
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

    icon.on('pointerdown', (pointer) => {
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
      .setScale(view.hovered ? 0.5 : 0.45)
      .setAlpha(isVisited ? (view.hovered ? 0.78 : 0.62) : 1)
      .setTint(isVisited ? 0xb8b8b8 : 0xffffff);

    view.nameLabel.setColor(
      view.hovered
        ? (isVisited ? '#f1e6b8' : '#ffe066')
        : (isVisited ? '#d0d0d0' : '#ffffff')
    );

    view.statusLabel.setVisible(isVisited);

    if (isVisited) {
      view.statusLabel.setText(
        hasMemory && memory.reminderShown === false
          ? 'Can remind you'
          : 'Already questioned'
      );
    }
  }

  refreshEncounterViews() {
    this.encounterViews.forEach((view) => {
      view.hovered = false;
      this.updateEncounterView(view);
    });
  }

  destroyEncounterViews() {
    const views = this.encounterViews.splice(0);
    const icons = new Set(views.map((view) => view.icon));

    this.interactiveObjects = this.interactiveObjects.filter(
      (object) => !icons.has(object)
    );

    views.forEach(({ icon, nameLabel, statusLabel }) => {
      [icon, nameLabel, statusLabel].forEach((object) => {
        object?.removeAllListeners?.();
        object?.destroy?.();
      });
    });
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

    if (!allowed) return true;

    return allowed.includes(
      this.getPartOfDayForHour(clock.hour)
    );
  }

  getMinutesUntilOpening(locationId) {
    const clock = this.getCityClock();

    if (this.isLocationOpen(locationId, clock)) return 0;

    for (let minutes = 1; minutes <= MINUTES_PER_DAY; minutes += 1) {
      const total =
        (clock.totalMinutes + minutes) % MINUTES_PER_DAY;

      const futureClock = {
        hour: Math.floor(total / 60),
        minute: total % 60
      };

      if (this.isLocationOpen(locationId, futureClock)) {
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
    const remainingMinutes = minutes % 60;

    if (hours && remainingMinutes) {
      return `${hours}h ${remainingMinutes}m`;
    }

    if (hours) return `${hours}h`;
    return `${remainingMinutes}m`;
  }

  visitEncounter(encounter) {
    if (!this.canStartInteraction()) return false;

    this.closeAllUIPanels();

    const flags = this.getCityProgressFlags();
    const dialogueTargetCityId = this.getDialogueTargetCityId(flags);

    if (!this.isLocationOpen(encounter.locationId)) {
      this.showLocationClosedPopup(
        encounter.locationId,
        encounter,
        dialogueTargetCityId
      );

      return false;
    }

    return this.openEncounter(encounter, dialogueTargetCityId);
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
    const routeManager = gameState.routeManager;
    const flags = progressFlags || this.getCityProgressFlags();

    if (
      routeManager &&
      typeof routeManager.getNextExpectedCity === 'function'
    ) {
      return routeManager.getNextExpectedCity();
    }

    if (flags.isCrimeCity) {
      return gameState.crimeCityId || null;
    }

    return gameState.nextTargetCityId || null;
  }

  getCityProgressFlags() {
    const routeManager = gameState.routeManager;

    const expectedCityId =
      routeManager &&
      typeof routeManager.getNextExpectedCity === 'function'
        ? routeManager.getNextExpectedCity()
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
    if (this._cleanupDone) return false;

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
      this.add
        .image(this.scale.width / 2, this.scale.height / 2, key)
        .setDisplaySize(this.scale.width, this.scale.height);
    } else {
      console.warn('Missing city background', key);
      this.cameras.main.setBackgroundColor('#20242b');
    }
  }

  getCityBackgroundKey(city) {
    return CITY_BACKGROUND_KEYS[city.id] || city.id;
  }

  createHeader(city) {
    this.add
      .rectangle(0, 0, this.scale.width, 80, 0x000000, 0.45)
      .setOrigin(0, 0);

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
    } else if (this.shouldShowPhoneCallNow()) {
      subtitle = 'Headquarters is trying to reach you.';
    }

    this.add.text(40, 54, subtitle, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#f1e6b8'
    });
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
      : this.add
          .circle(
            position.x,
            position.y,
            SHOP_ICON_SIZE / 2,
            0x806127,
            0.95
          )
          .setStrokeStyle(3, 0xffd166);

    const baseScale = hasTexture
      ? SHOP_ICON_SIZE / Math.max(icon.width, icon.height, 1)
      : 1;

    icon
      .setScale(baseScale)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(
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

    icon.on('pointerdown', (pointer) => {
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

    if (!hasTexture) {
      this.requestShopIconAsset();
    }
  }

  requestShopIconAsset() {
    if (this.shopAssetHandler || this.textures.exists('shop_icon')) {
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
      (object) => !removing.has(object)
    );

    objects.forEach((object) => {
      object?.removeAllListeners?.();
      object?.destroy?.();
    });
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

      energy.consumeCustom(SHOP_TAXI_ENERGY, 'Taxi to shop: -3');
      saveGameState();
      this.getSceneIfActive('UIScene')?.updateEnergy?.();

      this.scene.pause();
      return true;
    } catch (error) {
      console.error('[CityScene] Opening ShopScene failed.', error);

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

    const popup = this.add
      .text(this.scale.width / 2, this.scale.height / 2, text, {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffffff',
        backgroundColor: color,
        padding: { x: 24, y: 16 },
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(200);

    this.time.delayedCall(duration, () => {
      if (popup?.active) {
        popup.destroy();
      }
    });

    return popup;
  }

  transitionTo(sceneKey, data = {}) {
    if (!sceneKey || this.isTransitioning || !this.canUseCity()) {
      return false;
    }

    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (!this.canUseCity()) {
          this.isTransitioning = false;
          return;
        }

        void this.goto(sceneKey, data)
          .then((started) => {
            if (!started && !this._cleanupDone) {
              this.isTransitioning = false;
              this.cameras.main.fadeIn(200, 0, 0, 0);
            }
          })
          .catch((error) => {
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

    return true;
  }

  showLocationClosedPopup(
    locationId,
    encounterData,
    dialogueTargetCityId = null
  ) {
    if (!this.canStartInteraction()) return;

    const width = this.scale.width;
    const height = this.scale.height;
    const popupObjects = [];

    const clock = this.getCityClock();
    const waitMinutes = this.getMinutesUntilOpening(locationId);
    const allowed = (LOCATION_HOURS[locationId] || []).join(', ');

    const currentPartOfDay =
      this.getPartOfDayForHour(clock.hour);

    const waitLabel = waitMinutes === null
      ? 'Opening unavailable'
      : waitMinutes === 0
        ? 'Enter now'
        : `Wait ${this.formatWaitDuration(waitMinutes)}`;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add
      .rectangle(width / 2, height / 2, 500, 300, 0x111111, 0.95)
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100)
      .setInteractive();

    const warningText = this.add
      .text(
        width / 2,
        height / 2 - 50,
        [
          'Location is currently closed.',
          `Open: ${allowed}`,
          `Current: ${this.formatCityClock(clock)} (${currentPartOfDay})`
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

    const waitBtn = this.add
      .text(width / 2, height / 2 + 30, waitLabel, {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: waitMinutes === null ? '#777777' : '#ffcc00'
      })
      .setOrigin(0.5)
      .setDepth(101);

    if (waitMinutes !== null) {
      waitBtn.setInteractive({ useHandCursor: true });
    }

    const cancelBtn = this.add
      .text(width / 2, height / 2 + 80, 'Return', {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#aaaaaa'
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    popupObjects.push(
      overlay,
      popupBg,
      warningText,
      waitBtn,
      cancelBtn
    );

    const popupState = {
      cleanup: null,
      objects: popupObjects,
      busy: false
    };

    const cleanupPopup = () => {
      popupObjects.forEach((object) => {
        if (object?.active) {
          object.removeAllListeners?.();
          object.destroy();
        }
      });

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

    waitBtn.on('pointerdown', (pointer) => {
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

        // Zmiana czasu może uruchomić koniec sprawy lub zmianę sceny.
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
        console.error('[CityScene] Waiting until opening failed:', error);

        if (
          this.canUseCity() &&
          this.activePopup === popupState
        ) {
          // Nie ponawiamy automatycznie przesunięcia czasu:
          // zegar mógł już zostać zmieniony przed wystąpieniem błędu.
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

    this.isSettingUpUi = false;
    this.isTransitioning = false;

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

    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];
    this.stopCityAmbient();

    this.stopSceneIfActive('ArrestSelectionScene');
    this.stopSceneIfActive('PhoneCallScene');
    this.stopSceneIfActive('HypothesisScene');
    this.stopSceneIfActive('ShopScene');
  }
}