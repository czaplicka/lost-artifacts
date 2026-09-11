import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { generateCaseCityState } from '../city-encounter-generator.js';
import { audioManager } from '../AudioManager.js';
import {
  resolveCityNpcTheme,
  getNpcTextureKey,
  getNpcLabel
} from '../npcThemeHelper.js';
import { BaseScene } from './BaseScene.js';
import { addSessionScore } from '../InvestigationManager.js';

const LOCATION_HOURS = {
  bank: ['Morning', 'Afternoon'],
  policehq: ['Morning', 'Afternoon', 'Evening'],
  hotel: ['Morning', 'Afternoon', 'Evening', 'Night'],
  airport: ['Morning', 'Afternoon', 'Evening', 'Night'],
  alley: ['Morning', 'Afternoon', 'Evening', 'Night'],
  parking: ['Morning', 'Afternoon', 'Evening', 'Night'],
  restaurant: ['Afternoon', 'Evening'],
  garbage: ['Morning', 'Afternoon', 'Evening', 'Night']
};

const NPC_QUESTION_PENALTY = 10;

export class CityScene extends BaseScene {
  constructor() {
    super({ key: 'CityScene' });

    this.city = null;
    this.cityId = 'warsaw';
    this.interactiveObjects = [];
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

    this.investigationStatus =
      data.investigationStatus ?? null;

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
    this.cityAmbient = null;
    this.npcTheme = 'default';

    this.isSettingUpUi = false;
    this.isTransitioning = false;
    this.activePopup = null;

    if (!Array.isArray(gameState.visitedEncounters)) {
      gameState.visitedEncounters = [];
    }

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object' ||
      Array.isArray(gameState.encounterMemory)
    ) {
      gameState.encounterMemory = {};
    }

    if (
      !gameState.specialScenesVisited ||
      typeof gameState.specialScenesVisited !== 'object' ||
      Array.isArray(gameState.specialScenesVisited)
    ) {
      gameState.specialScenesVisited = {};
    }

    if (
      !gameState.cityEncounterState ||
      typeof gameState.cityEncounterState !== 'object' ||
      Array.isArray(gameState.cityEncounterState)
    ) {
      gameState.cityEncounterState = {};
    }
  }

  create() {
    super.create();

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

    this.stopSceneIfActive('LocationScene');
    this.stopSceneIfActive('ArrestSelectionScene');

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', {
        loop: true
      });
    }

    this.playCityAmbient();

    const rawLocations = this.cache.json.get('locations');

    if (!Array.isArray(rawLocations)) {
      console.error('[CityScene] Invalid or missing locations data.', {
        cacheKey: 'locations',
        receivedData: rawLocations,
        cityId: this.cityId
      });

      this.closeAllUIPanels();

      void this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: 'City data could not be loaded.'
      });

      return;
    }

    const city = rawLocations.find((entry) => {
      return (
        entry &&
        typeof entry === 'object' &&
        entry.id === this.cityId
      );
    });

    if (!city) {
      console.error(
        '[CityScene] Requested city was not found in locations data.',
        {
          cityId: this.cityId,
          availableCityIds: rawLocations
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => entry.id)
            .filter(Boolean)
        }
      );

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
    gameState.currentCityData = structuredClone(city);

    this.registry.set('currentCityId', this.cityId);
    this.registry.set(
      'investigationStatus',
      this.investigationStatus
    );

    this.ensureCityEncounterState(rawLocations);

    this.createBackground(city);
    this.createHeader(city);

    if (!this.isFinalShowdown) {
      this.createEncounters();
    }

    try {
      ensureHud(this);
    } catch (error) {
      console.error('[CityScene] ensureHud failed:', error);
    }

    void this.setupCityUi();
    this.openInitialOverlayIfNeeded();
  }

  async setupCityUi() {
    if (
      this.isSettingUpUi ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.isSettingUpUi = true;

    try {
      const uiScene = await this.ensureOverlayScene('UIScene');

      if (
        this._cleanupDone ||
        !this.sys.isActive()
      ) {
        return;
      }

      if (uiScene) {
        this.game.events.emit('setHudVisible', true);
        EventBus.emit('showHUD');

        uiScene.refreshScoreHud?.();
        uiScene.refreshMoneyHud?.();
        uiScene.updateEnergy?.();
        uiScene.updateTime?.({
          day: gameState.currentDay || gameState.day || 1,
          hour: gameState.currentHour ?? gameState.hour ?? 8,
          minute:
            gameState.currentMinute ??
            gameState.minute ??
            0,
          partOfDay:
            gameState.currentPartOfDay ||
            gameState.partOfDay ||
            'Morning'
        });
      }

      const playerHud = await this.restorePlayerHud();

      if (
        this._cleanupDone ||
        !this.sys.isActive()
      ) {
        return;
      }

      if (playerHud) {
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      }

      const newsHud = await this.ensureOverlayScene('NewsHud');

      if (
        this._cleanupDone ||
        !this.sys.isActive()
      ) {
        return;
      }

      if (newsHud) {
        newsHud.events?.emit(
          'setNewspaperVisible',
          true
        );

        newsHud.events?.emit(
          'setTvVisible',
          false
        );

        this.bringSceneToTopIfActive('NewsHud');
      }
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          '[CityScene] Failed to restore city UI:',
          error
        );
      }
    } finally {
      this.isSettingUpUi = false;
    }
  }

  openInitialOverlayIfNeeded() {
    if (
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    if (this.isFinalShowdown) {
      this.time.delayedCall(250, () => {
        if (
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

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
        if (
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

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
        if (
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

        this.openDestinationsPanel();
      });
    }
  }

  playCityAmbient() {
    if (this.cityAmbient?.isPlaying) {
      return this.cityAmbient;
    }

    this.cityAmbient = audioManager.playAmbient('citysound', {
      volume: 0.22,
      loop: true
    });

    return this.cityAmbient;
  }

  pauseCityAmbient() {
    if (this.cityAmbient?.isPlaying) {
      this.cityAmbient.pause();
    }
  }

  stopCityAmbient() {
    if (!this.cityAmbient) {
      return;
    }

    try {
      if (this.cityAmbient.isPlaying) {
        this.cityAmbient.stop();
      }

      if (!this.cityAmbient.pendingRemove) {
        this.cityAmbient.destroy();
      }
    } catch (error) {
      console.warn(
        '[CityScene] city ambient cleanup failed:',
        error
      );
    }

    this.cityAmbient = null;
  }

  onWakeOrResume() {
    if (this._cleanupDone) {
      return;
    }

    this.isTransitioning = false;

    if (!this.cityAmbient?.isPlaying) {
      this.playCityAmbient();
    }

    void this.setupCityUi();
  }

  onSleep() {
    this.pauseCityAmbient();
  }

  changeScore(points, label = 'City investigation') {
    const delta = Number.isFinite(points)
      ? Math.floor(points)
      : 0;

    if (delta === 0) {
      return gameState.score || 0;
    }

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
    const hasCityEncounters =
      gameState.cityEncounterState &&
      Array.isArray(gameState.cityEncounterState[this.cityId]) &&
      gameState.cityEncounterState[this.cityId].length > 0;

    const hasActiveLocations =
      Array.isArray(gameState.activeLocations) &&
      gameState.activeLocations.length > 0;

    if (hasCityEncounters || hasActiveLocations) {
      return;
    }

    const caseId =
      gameState.currentMission?.id ||
      gameState.currentMission?.caseId ||
      gameState.currentArtifact ||
      `${this.cityId}-default`;

    gameState.cityEncounterState = generateCaseCityState(
      locations,
      String(caseId),
      {}
    );

    if (!Array.isArray(gameState.cityEncounterState[this.cityId])) {
      gameState.cityEncounterState[this.cityId] = [];
    }

    console.log(
      'Generated cityEncounterState for',
      this.cityId,
      gameState.cityEncounterState[this.cityId]
    );
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
    if (this._cleanupDone) {
      return false;
    }

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
    const backgroundKey =
      city.backgroundKey ||
      this.getCityBackgroundKey(city);

    if (this.textures.exists(backgroundKey)) {
      this.add
        .image(
          this.scale.width / 2,
          this.scale.height / 2,
          backgroundKey
        )
        .setDisplaySize(
          this.scale.width,
          this.scale.height
        );
    } else {
      console.warn('Missing city background', backgroundKey);
      this.cameras.main.setBackgroundColor('#20242b');
    }
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
      subtitle =
        'City cleared. Choose the next destination on the map.';
    } else if (this.shouldShowPhoneCallNow()) {
      subtitle = 'Headquarters is trying to reach you.';
    }

    this.add.text(40, 54, subtitle, {
      fontFamily: 'SpecialElite',
      fontSize: '18px',
      color: '#f1e6b8'
    });
  }

  createEncounters() {
    const encounters = this.getEncounters();
    const progressFlags = this.getCityProgressFlags();

    encounters.forEach((encounter) => {
      const npcTextureKey = getNpcTextureKey(
        encounter.npcId,
        this.npcTheme
      );

      const iconKey = this.textures.exists(npcTextureKey)
        ? npcTextureKey
        : 'fence_w';

      const x = encounter.cityX;
      const y = encounter.cityY;
      const isVisited = this.isEncounterVisited(encounter.id);
      const encounterMemory = this.getEncounterMemory(encounter.id);
      const hasMemory = Boolean(encounterMemory);

      const dialogueTargetCityId =
        this.getDialogueTargetCityId(progressFlags);

      const icon = this.add
        .image(x, y, iconKey)
        .setScale(0.45)
        .setAlpha(isVisited ? 0.62 : 1)
        .setTint(isVisited ? 0xb8b8b8 : 0xffffff)
        .setInteractive({ useHandCursor: true });

      const nameLabel = this.add
        .text(x, y + 88, getNpcLabel(encounter.npcId), {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: isVisited ? '#d0d0d0' : '#ffffff',
          backgroundColor: '#000000aa',
          padding: {
            left: 8,
            right: 8,
            top: 4,
            bottom: 4
          }
        })
        .setOrigin(0.5);

      if (isVisited) {
        const statusText =
          hasMemory && encounterMemory?.reminderShown === false
            ? 'Can remind you'
            : 'Already questioned';

        this.add
          .text(x, y - 82, statusText, {
            fontFamily: 'SpecialElite',
            fontSize: '14px',
            color: '#f1e6b8',
            backgroundColor: '#000000cc',
            padding: {
              left: 6,
              right: 6,
              top: 3,
              bottom: 3
            }
          })
          .setOrigin(0.5);
      }

      icon.on('pointerover', () => {
        if (this.isTransitioning) {
          return;
        }

        icon.setScale(0.5);

        if (isVisited) {
          icon.setAlpha(0.78);
        }

        nameLabel.setColor(
          isVisited ? '#f1e6b8' : '#ffe066'
        );
      });

      icon.on('pointerout', () => {
        icon.setScale(0.45);
        icon.setAlpha(isVisited ? 0.62 : 1);

        nameLabel.setColor(
          isVisited ? '#d0d0d0' : '#ffffff'
        );
      });

      icon.on('pointerdown', () => {
        if (
          this.isTransitioning ||
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
          return;
        }

        this.closeAllUIPanels();

        const locationId = encounter.locationId;
        const currentPartOfDay =
          gameState.currentPartOfDay || 'Morning';

        const allowedHours = LOCATION_HOURS[locationId];

        if (
          allowedHours &&
          !allowedHours.includes(currentPartOfDay)
        ) {
          this.showLocationClosedPopup(
            locationId,
            encounter,
            dialogueTargetCityId
          );

          return;
        }

        const shouldChargeNpcPenalty =
          !isVisited &&
          !hasMemory;

        if (shouldChargeNpcPenalty) {
          this.changeScore(-NPC_QUESTION_PENALTY);
        }

        this.transitionTo('LocationScene', {
          cityId: this.cityId,
          encounterId: encounter.id,
          npcId: encounter.npcId,
          locationId: encounter.locationId,
          isRepeat: hasMemory || isVisited,
          isCrimeCity: progressFlags.isCrimeCity,
          isNextTargetCity: progressFlags.isNextTargetCity,
          isCorrectCity: progressFlags.isCorrectCity,
          dialogueTargetCityId
        });
      });

      this.interactiveObjects.push(icon);
    });
  }

  getDialogueTargetCityId(progressFlags = null) {
    const routeManager = gameState.routeManager;
    const flags =
      progressFlags ||
      this.getCityProgressFlags();

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
    const cityId = this.cityId;
    const routeManager = gameState.routeManager;

    const expectedCityId =
      routeManager &&
      typeof routeManager.getNextExpectedCity === 'function'
        ? routeManager.getNextExpectedCity()
        : gameState.nextTargetCityId || null;

    const isCrimeCity = Boolean(
      gameState.crimeCityId &&
      cityId === gameState.crimeCityId
    );

    const isNextTargetCity = Boolean(
      expectedCityId &&
      cityId === expectedCityId
    );

    const isJustReachedCorrectCity = Boolean(
      gameState.justReachedCorrectCityId &&
      cityId === gameState.justReachedCorrectCityId
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

  transitionTo(sceneKey, data = {}) {
    if (
      !sceneKey ||
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    this.isTransitioning = true;

    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (
          this._cleanupDone ||
          !this.sys.isActive()
        ) {
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
    if (
      this.activePopup ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;

    const popupObjects = [];

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add
      .rectangle(
        width / 2,
        height / 2,
        500,
        300,
        0x111111,
        0.95
      )
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100);

    const allowed = (
      LOCATION_HOURS[locationId] || []
    ).join(', ');

    const current =
      gameState.currentPartOfDay || 'Morning';

    const warningText = this.add
      .text(
        width / 2,
        height / 2 - 50,
        `Location is currently closed.\nOpen: ${allowed}\nCurrent: ${current}`,
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#ffffff',
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setDepth(101);

    const waitBtn = this.add
      .text(
        width / 2,
        height / 2 + 30,
        'Wait until opening',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#ffcc00'
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    const cancelBtn = this.add
      .text(
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

    popupObjects.push(
      overlay,
      popupBg,
      warningText,
      waitBtn,
      cancelBtn
    );

    const cleanupPopup = () => {
      popupObjects.forEach((object) => {
        if (object?.active) {
          object.removeAllListeners?.();
          object.destroy();
        }
      });

      this.activePopup = null;
    };

    this.activePopup = {
      cleanup: cleanupPopup,
      objects: popupObjects
    };

    overlay.on('pointerdown', cleanupPopup);
    cancelBtn.on('pointerdown', cleanupPopup);

    waitBtn.on('pointerdown', () => {
      if (
        this.isTransitioning ||
        this._cleanupDone
      ) {
        return;
      }

      let hoursToWait = 0;
      const currentHour = gameState.currentHour || 0;

      if (currentHour >= 22) {
        hoursToWait = 32 - currentHour;
      } else if (currentHour < 6) {
        hoursToWait = 8 - currentHour;
      } else {
        hoursToWait = 8;
      }

      EventBus.emit('advanceTime', hoursToWait, 0);

      gameState.currentHour =
        (currentHour + hoursToWait) % 24;

      gameState.currentPartOfDay = 'Morning';

      cleanupPopup();

      const flags = this.getCityProgressFlags();

      const wasVisited = this.isEncounterVisited(
        encounterData.id
      );

      const hasMemory = Boolean(
        this.getEncounterMemory(encounterData.id)
      );

      const shouldChargeNpcPenalty =
        !wasVisited &&
        !hasMemory;

      if (shouldChargeNpcPenalty) {
        this.changeScore(-NPC_QUESTION_PENALTY);
      }

      this.transitionTo('LocationScene', {
        cityId: this.cityId,
        encounterId: encounterData.id,
        npcId: encounterData.npcId,
        locationId: encounterData.locationId,
        isRepeat: wasVisited || hasMemory,
        isCrimeCity: flags.isCrimeCity,
        isNextTargetCity: flags.isNextTargetCity,
        isCorrectCity: flags.isCorrectCity,
        dialogueTargetCityId
      });
    });
  }

  closeAllUIPanels() {
    const hud = this.getPlayerHudScene();

    hud?.closeAllUIPanels?.();
  }

  cleanupScene() {
    this.isSettingUpUi = false;
    this.isTransitioning = false;

    this.activePopup?.cleanup?.();
    this.activePopup = null;

    this.interactiveObjects.forEach((object) => {
      object?.removeAllListeners?.();
    });

    this.interactiveObjects = [];

    this.stopCityAmbient();

    this.stopSceneIfActive('ArrestSelectionScene');
    this.stopSceneIfActive('PhoneCallScene');
    this.stopSceneIfActive('HypothesisScene');
  }

  isEncounterVisited(encounterId) {
    return (
      Array.isArray(gameState.visitedEncounters) &&
      gameState.visitedEncounters.includes(encounterId)
    );
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) {
      return null;
    }

    if (
      !gameState.encounterMemory ||
      typeof gameState.encounterMemory !== 'object'
    ) {
      return null;
    }

    return gameState.encounterMemory[encounterId] || null;
  }

  getEncounters() {
    if (
      Array.isArray(gameState.activeLocations) &&
      gameState.activeLocations.length > 0
    ) {
      return gameState.activeLocations.filter(
        (encounter) => encounter.enabled !== false
      );
    }

    if (
      gameState.cityEncounterState &&
      typeof gameState.cityEncounterState === 'object' &&
      Array.isArray(
        gameState.cityEncounterState[this.cityId]
      )
    ) {
      return gameState.cityEncounterState[this.cityId].filter(
        (encounter) => encounter.enabled !== false
      );
    }

    return [];
  }

  getCityBackgroundKey(city) {
    const map = {
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
      kotto: 'kotto',
      tokyo: 'tokyo',
      hq: 'start'
    };

    return map[city.id] || city.id;
  }
}