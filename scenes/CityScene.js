import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { generateCaseCityState } from '../city-encounter-generator.js';
import { audioManager } from '../AudioManager.js';
import { resolveCityNpcTheme, getNpcTextureKey, getNpcLabel } from '../npcThemeHelper.js';
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

    this.interactiveObjects = [];

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
      this.onSceneShutdown,
      this
    );

    this.scene.get('NewsHud').events.emit('setNewspaperVisible', true);
    this.scene.get('NewsHud').events.emit('setTvVisible', false);

    audioManager.init(this);

    if (!audioManager.isMusicPlaying('themeGame')) {
      audioManager.playMusic('themeGame', { loop: true });
    }

    this.cityAmbient = audioManager.playAmbient('citysound', {
      volume: 0.22,
      loop: true
    });

    if (
      this.scene.isActive('LocationScene') ||
      this.scene.isSleeping('LocationScene')
    ) {
      this.scene.stop('LocationScene');
    }

    if (this.scene.isActive('ArrestSelectionScene')) {
      this.scene.stop('ArrestSelectionScene');
    }

    this.scene.wake('UIScene');

    const rawLocations = this.cache.json.get('locations');

    if (!Array.isArray(rawLocations)) {
      console.error('[CityScene] Invalid or missing locations data.', {
        cacheKey: 'locations',
        receivedData: rawLocations,
        cityId: this.cityId
      });

      this.closeAllUIPanels();

      this.goto('MenuScene', {
        citySetupFailed: true,
        errorMessage: 'City data could not be loaded.'
      });

      return;
    }

    const locations = rawLocations;

    const city = locations.find((entry) => {
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
          availableCityIds: locations
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => entry.id)
            .filter(Boolean)
        }
      );

      this.closeAllUIPanels();

      this.goto('MenuScene', {
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
    this.registry.set('investigationStatus', this.investigationStatus);

    this.ensureCityEncounterState(locations);

    this.createBackground(city);
    this.createHeader(city);

    if (!this.isFinalShowdown) {
      this.createEncounters();
    }

    ensureHud(this);

    const hud = this.scene.get('PlayerHudScene');

    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }

    if (hud?.refreshNotebook) {
      hud.refreshNotebook();
    } else if (hud?.refreshUI) {
      hud.refreshUI();
    }

    if (this.isFinalShowdown) {
      this.time.delayedCall(250, () => {
        this.closeAllUIPanels();
      });

      if (!this.scene.isActive('ArrestSelectionScene')) {
        this.scene.launch('ArrestSelectionScene');
      } else {
        this.scene.bringToTop('ArrestSelectionScene');
      }

      return;
    }

    if (this.shouldShowPhoneCallNow()) {
      this.time.delayedCall(400, () => {
        this.closeAllUIPanels();
      });

      if (!this.scene.isActive('PhoneCallScene')) {
        this.scene.launch('PhoneCallScene', {
          sourceScene: 'CityScene',
          cityId: this.cityId
        });
      } else {
        this.scene.bringToTop('PhoneCallScene');
      }
    } else if (this.openDestinationsOnCreate) {
      this.time.delayedCall(150, () => {
        this.openDestinationsPanel();
      });
    }
  }

changeScore(points, label = 'City investigation') {
  const delta = Number.isFinite(points)
    ? Math.floor(points)
    : 0;

  if (delta === 0) {
    return gameState.score || 0;
  }

  addSessionScore(delta, label);

    const hud = this.scene.get('PlayerHudScene');

    if (hud?.refreshNotebook) {
      hud.refreshNotebook();
    } else if (hud?.refreshUI) {
      hud.refreshUI();
    }

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
    const hud = this.scene.get('PlayerHudScene');

    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }

    if (hud?.openDestinationsPanel) {
      return hud.openDestinationsPanel();
    }

    if (hud?.toggleDestinationsPanel) {
      return hud.toggleDestinationsPanel(true);
    }

    EventBus.emit('openDestinations');
  }

  createBackground(city) {
    const backgroundKey = city.backgroundKey || this.getCityBackgroundKey(city);

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
      fontFamily: 'Special Elite',
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
      fontFamily: 'Special Elite',
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
          fontFamily: 'Special Elite',
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
            fontFamily: 'Special Elite',
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

        this.goto('LocationScene', {
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
    const rm = gameState.routeManager;
    const flags = progressFlags || this.getCityProgressFlags();

    if (rm && typeof rm.getNextExpectedCity === 'function') {
      return rm.getNextExpectedCity();
    }

    if (flags.isCrimeCity) {
      return gameState.crimeCityId || null;
    }

    return gameState.nextTargetCityId || null;
  }

  getCityProgressFlags() {
    const cityId = this.cityId;
    const rm = gameState.routeManager;

    const expectedCityId =
      rm && typeof rm.getNextExpectedCity === 'function'
        ? rm.getNextExpectedCity()
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

  showLocationClosedPopup(
    locationId,
    encounterData,
    dialogueTargetCityId = null
  ) {
    const width = this.scale.width;
    const height = this.scale.height;

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

    const allowed = (LOCATION_HOURS[locationId] || []).join(', ');
    const current = gameState.currentPartOfDay || 'Morning';

    const warningText = this.add
      .text(
        width / 2,
        height / 2 - 50,
        `Location is currently closed.\nOpen: ${allowed}\nCurrent: ${current}`,
        {
          fontFamily: 'Special Elite',
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
          fontFamily: 'Special Elite',
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
          fontFamily: 'Special Elite',
          fontSize: '22px',
          color: '#aaaaaa'
        }
      )
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    const cleanupPopup = () => {
      overlay.destroy();
      popupBg.destroy();
      warningText.destroy();
      waitBtn.destroy();
      cancelBtn.destroy();
    };

    waitBtn.on('pointerdown', () => {
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

      this.goto('LocationScene', {
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

    cancelBtn.on('pointerdown', cleanupPopup);
  }

  closeAllUIPanels() {
    const hud = this.scene.get('PlayerHudScene');

    if (hud?.closeAllUIPanels) {
      hud.closeAllUIPanels();
    }
  }

  onSceneShutdown() {
    this.interactiveObjects.forEach((obj) => {
      if (obj?.removeAllListeners) {
        obj.removeAllListeners();
      }
    });

    this.interactiveObjects = [];

    if (this.cityAmbient) {
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

    if (this.scene.isActive('ArrestSelectionScene')) {
      this.scene.stop('ArrestSelectionScene');
    }

    if (this.scene.isActive('PhoneCallScene')) {
      this.scene.stop('PhoneCallScene');
    }

    if (this.scene.isActive('HypothesisScene')) {
      this.scene.stop('HypothesisScene');
    }
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
      Array.isArray(gameState.cityEncounterState[this.cityId])
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