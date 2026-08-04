import { gameState } from '../GameData.js';
import { ensureHud } from '../hudHelpers.js';
import { EventBus } from '../EventBus.js';
import { generateCaseCityState } from '../city-encounter-generator.js';

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

const KNOWN_CRIME_SCENES = [
  'louvre',
  'tower',
  'castle',
  'dockyard',
  'auction_house',
  'havela'
];

export class CityScene extends Phaser.Scene {
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
  }

  init(data = {}) {
    this.cityId = data.cityId || gameState.currentCityId || this.registry.get('currentCityId') || 'warsaw';
    this.cityCompleted = Boolean(data.cityCompleted);
    this.investigationStatus = data.investigationStatus ?? null;
    this.isFinalShowdown = Boolean(data.isFinalShowdown || this.investigationStatus === 'FINAL_SHOWDOWN');
    this.pendingPhoneCall = Boolean(data.pendingPhoneCall ?? gameState.pendingPhoneCall);
    this.pendingPhoneCallCityId = data.pendingPhoneCallCityId ?? gameState.pendingPhoneCallCityId ?? null;
    this.openDestinationsOnCreate = Boolean(
      data.openDestinations ||
      (this.cityCompleted &&
        this.investigationStatus &&
        this.investigationStatus !== 'CITY_STILL_ACTIVE' &&
        this.investigationStatus !== 'FINAL_SHOWDOWN')
    );
    this.interactiveObjects = [];

    if (!Array.isArray(gameState.visitedEncounters)) gameState.visitedEncounters = [];
    if (!Array.isArray(gameState.cluesCollected)) gameState.cluesCollected = [];
    if (!gameState.encounterMemory || typeof gameState.encounterMemory !== 'object' || Array.isArray(gameState.encounterMemory)) {
      gameState.encounterMemory = {};
    }
    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object' || Array.isArray(gameState.specialScenesVisited)) {
      gameState.specialScenesVisited = {};
    }
    if (!gameState.cityEncounterState || typeof gameState.cityEncounterState !== 'object' || Array.isArray(gameState.cityEncounterState)) {
      gameState.cityEncounterState = {};
    }
  }

  create() {
    audioManager.init(this);
    audioManager.stopMusic('themeMusic');
    audioManager.playMusic('themeGame');
    audioManager.playSfx('citysound', { loop: true });

    if (this.scene.isActive('LocationScene') || this.scene.isSleeping('LocationScene')) {
      this.scene.stop('LocationScene');
    }

    if (this.scene.isActive('ArrestSelectionScene')) {
      this.scene.stop('ArrestSelectionScene');
    }

    this.scene.wake('UIScene');

    const locations = this.cache.json.get('locations') || [];
    const city = locations.find(c => c.id === this.cityId);

    if (!city) {
      console.error('CityScene city not found:', this.cityId);
      this.scene.start('MenuScene');
      return;
    }

    this.city = city;
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
      this.createCrimeScene(city);
    }

    ensureHud(this);

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) hud.closeAllUIPanels();
    if (hud?.refreshNotebook) hud.refreshNotebook();
    else if (hud?.refreshUI) hud.refreshUI();

    if (this.isFinalShowdown) {
      this.time.delayedCall(250, () => this.closeAllUIPanels());
      if (!this.scene.isActive('ArrestSelectionScene')) this.scene.launch('ArrestSelectionScene');
      else this.scene.bringToTop('ArrestSelectionScene');
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);
      return;
    }

    if (this.shouldShowPhoneCallNow()) {
      this.time.delayedCall(400, () => this.closeAllUIPanels());
      if (!this.scene.isActive('PhoneCallScene')) {
        this.scene.launch('PhoneCallScene', {
          sourceScene: 'CityScene',
          cityId: this.cityId
        });
      } else {
        this.scene.bringToTop('PhoneCallScene');
      }
    } else if (this.openDestinationsOnCreate) {
      this.time.delayedCall(150, () => this.openDestinationsPanel());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);
  }

  changeScore(points) {
    const delta = Number.isFinite(points) ? Math.floor(points) : 0;
    gameState.score = Math.max(0, (gameState.score || 0) + delta);

    const hud = this.scene.get('PlayerHudScene');
    if (hud?.refreshNotebook) hud.refreshNotebook();
    else if (hud?.refreshUI) hud.refreshUI();

    EventBus.emit('scoreChanged', {
      delta,
      total: gameState.score
    });
  }

  ensureCityEncounterState(locations) {
    const hasCityEncounters =
      gameState.cityEncounterState &&
      Array.isArray(gameState.cityEncounterState[this.cityId]) &&
      gameState.cityEncounterState[this.cityId].length > 0;

    const hasActiveLocations =
      Array.isArray(gameState.activeLocations) &&
      gameState.activeLocations.length > 0;

    if (hasCityEncounters || hasActiveLocations) return;

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

    console.log('Generated cityEncounterState for', this.cityId, gameState.cityEncounterState[this.cityId]);
  }

  shouldShowPhoneCallNow() {
    return this.pendingPhoneCall === true && (!this.pendingPhoneCallCityId || this.pendingPhoneCallCityId === this.cityId);
  }

  openDestinationsPanel() {
    const hud = this.scene.get('PlayerHudScene');
    if (hud?.closeAllUIPanels) hud.closeAllUIPanels();
    if (hud?.openDestinationsPanel) return hud.openDestinationsPanel();
    if (hud?.toggleDestinationsPanel) return hud.toggleDestinationsPanel(true);
    EventBus.emit('openDestinations');
  }

  createBackground(city) {
    const backgroundKey = city.backgroundKey || this.getCityBackgroundKey(city);

    if (this.textures.exists(backgroundKey)) {
      this.add
        .image(this.scale.width / 2, this.scale.height / 2, backgroundKey)
        .setDisplaySize(this.scale.width, this.scale.height);
    } else {
      console.warn('Missing city background', backgroundKey);
      this.cameras.main.setBackgroundColor('#20242b');
    }
  }

  createHeader(city) {
    this.add.rectangle(0, 0, this.scale.width, 80, 0x000000, 0.45).setOrigin(0, 0);

    this.add.text(40, 24, `${city.city}, ${city.country}`, {
      fontFamily: 'Special Elite',
      fontSize: '28px',
      color: '#ffffff'
    });

    let subtitle = 'Talk to witnesses and follow the trail.';
    if (this.isFinalShowdown) {
      subtitle = 'The suspect is cornered. Review the evidence and make the arrest.';
    } else if (this.cityCompleted) {
      subtitle = 'City cleared. Choose the next destination on the map.';
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

    encounters.forEach(encounter => {
      const npcTextureKey = this.getNpcTextureKey(encounter.npcId);
      const iconKey = this.textures.exists(npcTextureKey) ? npcTextureKey : 'fence';
      const x = encounter.cityX;
      const y = encounter.cityY;
      const isVisited = this.isEncounterVisited(encounter.id);
      const encounterMemory = this.getEncounterMemory(encounter.id);
      const hasMemory = Boolean(encounterMemory);
      const dialogueTargetCityId = this.getDialogueTargetCityId(progressFlags);

      const icon = this.add.image(x, y, iconKey)
        .setScale(0.45)
        .setAlpha(isVisited ? 0.62 : 1)
        .setTint(isVisited ? 0xb8b8b8 : 0xffffff)
        .setInteractive({ useHandCursor: true });

      const nameLabel = this.add.text(x, y + 88, this.getNpcLabel(encounter.npcId), {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: isVisited ? '#d0d0d0' : '#ffffff',
        backgroundColor: '#000000aa',
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      }).setOrigin(0.5);

      if (isVisited) {
        const statusText = hasMemory && encounterMemory?.reminderShown === false
          ? 'Can remind you'
          : 'Already questioned';

        this.add.text(x, y - 82, statusText, {
          fontFamily: 'Special Elite',
          fontSize: '14px',
          color: '#f1e6b8',
          backgroundColor: '#000000cc',
          padding: { left: 6, right: 6, top: 3, bottom: 3 }
        }).setOrigin(0.5);
      }

      icon.on('pointerover', () => {
        icon.setScale(0.5);
        if (isVisited) icon.setAlpha(0.78);
        nameLabel.setColor(isVisited ? '#f1e6b8' : '#ffe066');
      });

      icon.on('pointerout', () => {
        icon.setScale(0.45);
        icon.setAlpha(isVisited ? 0.62 : 1);
        nameLabel.setColor(isVisited ? '#d0d0d0' : '#ffffff');
      });

      icon.on('pointerdown', () => {
        this.closeAllUIPanels();

        const locationId = encounter.locationId;
        const currentPartOfDay = gameState.currentPartOfDay || 'Morning';
        const allowedHours = LOCATION_HOURS[locationId];

        if (allowedHours && !allowedHours.includes(currentPartOfDay)) {
          this.showLocationClosedPopup(locationId, encounter, dialogueTargetCityId);
          return;
        }

        const shouldChargeNpcPenalty = !isVisited && !hasMemory;
        if (shouldChargeNpcPenalty) {
          this.changeScore(-NPC_QUESTION_PENALTY);
        }

        this.scene.start('LocationScene', {
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

  normalizeCityName(value) {
    if (!value) return '';
    return String(value).trim().toLowerCase().replace(/\s+/g, '_');
  }

  getCrimeSceneConfig(city) {
    const mission = gameState.currentMission;
    if (!mission) return null;

    const cityId = city?.id || this.cityId;
    const normalizedCityId = this.normalizeCityName(cityId);
    const normalizedMissionCity = this.normalizeCityName(mission.city);

    if (normalizedMissionCity !== normalizedCityId) return null;

    const sceneId = mission.scene;
    if (!sceneId) {
      console.warn('Mission has no scene field:', mission);
      return null;
    }

    if (!KNOWN_CRIME_SCENES.includes(sceneId)) {
      console.warn(`Unknown crime scene "${sceneId}" for city "${mission.city}"`);
      return null;
    }

    return {
      key: `${cityId}_${sceneId}`,
      sceneId,
      cityId,
      mapKey: sceneId,
      mapPath: `assets/crimes/${sceneId}.json`,
      backgroundKey: `${sceneId}_bg`,
      backgroundPath: `assets/crimes/${sceneId}.jpg`,
      objectLayerName: 'HiddenObjects',
      objectsDataKey: 'objects-data',
      objectsDataPath: 'assets/data/objects.json',
      title: `Crime Scene – ${mission.city}`,
      activeCount: 6,
      timeLimit: 120,
      iconX: city.crimeSceneX ?? 1220,
      iconY: city.crimeSceneY ?? 500
    };
  }

  getCrimeSceneVisitKey(config) {
    const missionId = gameState.currentMission?.id;
    const missionCity = gameState.currentMission?.city || this.cityId || 'unknown';
    const artifact = gameState.currentMission?.artifact || gameState.currentArtifact || 'artifact';
    if (!config) return null;
    if (missionId) return `${config.sceneId}_${missionId}`;
    return `${config.sceneId}_${missionCity}_${artifact}`;
  }

  createCrimeScene(city) {
    const config = this.getCrimeSceneConfig(city);
    if (!config || !this.shouldShowCrimeScene(city, config)) return;

    const x = config.iconX;
    const y = config.iconY;
    const hasSearchTexture = this.textures.exists('search');

    const icon = hasSearchTexture
      ? this.add.image(x, y, 'search').setScale(0.22)
      : this.add.circle(x, y, 34, 0xd4af37, 0.95).setStrokeStyle(3, 0xfff1a8);

    icon
      .setDepth(5)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(x, y + 64, 'Crime Scene', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { left: 8, right: 8, top: 4, bottom: 4 }
    })
      .setOrigin(0.5)
      .setDepth(6);

    icon.on('pointerover', () => {
      if (hasSearchTexture) icon.setScale(0.25);
      label.setColor('#ffe066');
    });

    icon.on('pointerout', () => {
      if (hasSearchTexture) icon.setScale(0.22);
      label.setColor('#ffffff');
    });

    icon.on('pointerdown', () => {
      this.closeAllUIPanels();

      this.scene.start('HiddenObjectsScene', {
        sceneId: config.sceneId,
        mapKey: config.mapKey,
        mapPath: config.mapPath,
        backgroundMode: 'image',
        backgroundKey: config.backgroundKey,
        backgroundPath: config.backgroundPath,
        objectLayerName: config.objectLayerName,
        objectsDataKey: config.objectsDataKey,
        objectsDataPath: config.objectsDataPath,
        itemSceneKey: config.sceneId,
        activeCount: config.activeCount,
        score: gameState.score || 0,
        timeLimit: config.timeLimit,
        title: config.title,
        returnScene: 'CityScene',
        returnData: { cityId: this.cityId },
        cityId: this.cityId,
        sourceScene: 'CityScene',
        mission: gameState.currentMission
      });
    });

    this.interactiveObjects.push(icon);
  }

  shouldShowCrimeScene(city, config = null) {
    const crimeSceneConfig = config || this.getCrimeSceneConfig(city);
    if (!crimeSceneConfig) return false;

    const currentCityId = city?.id || this.cityId;
    const normalizedCurrent = this.normalizeCityName(currentCityId);
    const normalizedConfig = this.normalizeCityName(crimeSceneConfig.cityId);
    if (normalizedCurrent !== normalizedConfig) return false;

    const visitKey = this.getCrimeSceneVisitKey(crimeSceneConfig);
    const alreadyVisited = Boolean(visitKey && gameState.specialScenesVisited?.[visitKey]);
    return !alreadyVisited;
  }

  getDialogueTargetCityId(progressFlags = null) {
    const flags = progressFlags || this.getCityProgressFlags();

    if (!Array.isArray(gameState.escapeRoute) || gameState.escapeRoute.length === 0) {
      return gameState.nextTargetCityId || null;
    }

    if (flags.isCrimeCity) return gameState.escapeRoute[0] || null;

    const currentIndex = gameState.escapeRoute.indexOf(this.cityId);
    if (currentIndex !== -1) {
      return gameState.escapeRoute[currentIndex + 1] || null;
    }

    return gameState.nextTargetCityId || null;
  }

  getCityProgressFlags() {
    const cityId = this.cityId;
    const route = Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [];
    const isCrimeCity = Boolean(gameState.crimeCityId && cityId === gameState.crimeCityId);
    const isNextTargetCity = Boolean(gameState.nextTargetCityId && cityId === gameState.nextTargetCityId);
    const isJustReachedCorrectCity = Boolean(gameState.justReachedCorrectCityId && cityId === gameState.justReachedCorrectCityId);
    const isOnEscapeRoute = route.includes(cityId);
    const isCurrentVisitedRouteCity = Boolean(gameState.currentCityId === cityId && isOnEscapeRoute);

    return {
      isCrimeCity,
      isNextTargetCity,
      isJustReachedCorrectCity,
      isOnEscapeRoute,
      isCurrentVisitedRouteCity,
      isCorrectCity: isCrimeCity || isCurrentVisitedRouteCity || isJustReachedCorrectCity
    };
  }

  showLocationClosedPopup(locationId, encounterData, dialogueTargetCityId = null) {
    const width = this.scale.width;
    const height = this.scale.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add.rectangle(width / 2, height / 2, 500, 300, 0x111111, 0.95)
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100);

    const allowed = (LOCATION_HOURS[locationId] || []).join(', ');
    const current = gameState.currentPartOfDay || 'Morning';

    const warningText = this.add.text(
      width / 2,
      height / 2 - 50,
      `Location is currently closed.\nOpen: ${allowed}\nCurrent: ${current}`,
      {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(101);

    const waitBtn = this.add.text(width / 2, height / 2 + 30, 'Wait untill opening', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#ffcc00'
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    const cancelBtn = this.add.text(width / 2, height / 2 + 80, 'Return', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

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

      if (currentHour >= 22) hoursToWait = 32 - currentHour;
      else if (currentHour < 6) hoursToWait = 8 - currentHour;
      else hoursToWait = 8;

      EventBus.emit('advanceTime', hoursToWait, 0);
      gameState.currentHour = (currentHour + hoursToWait) % 24;
      gameState.currentPartOfDay = 'Morning';

      cleanupPopup();

      const flags = this.getCityProgressFlags();
      const wasVisited = this.isEncounterVisited(encounterData.id);
      const hasMemory = Boolean(this.getEncounterMemory(encounterData.id));
      const shouldChargeNpcPenalty = !wasVisited && !hasMemory;

      if (shouldChargeNpcPenalty) {
        this.changeScore(-NPC_QUESTION_PENALTY);
      }

      this.scene.start('LocationScene', {
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
    if (hud?.closeAllUIPanels) hud.closeAllUIPanels();
  }

  onSceneShutdown() {
    this.interactiveObjects.forEach(obj => {
      if (obj?.removeAllListeners) obj.removeAllListeners();
    });

    this.interactiveObjects = [];

    const citySound = this.registry.get('citySound');
    if (citySound?.isPlaying) citySound.stop();

    if (this.scene.isActive('ArrestSelectionScene')) this.scene.stop('ArrestSelectionScene');
    if (this.scene.isActive('PhoneCallScene')) this.scene.stop('PhoneCallScene');
    if (this.scene.isActive('HypothesisScene')) this.scene.stop('HypothesisScene');
  }

  isEncounterVisited(encounterId) {
    return Array.isArray(gameState.visitedEncounters) && gameState.visitedEncounters.includes(encounterId);
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) return null;
    if (!gameState.encounterMemory || typeof gameState.encounterMemory !== 'object') return null;
    return gameState.encounterMemory[encounterId] || null;
  }

  getEncounters() {
    if (Array.isArray(gameState.activeLocations) && gameState.activeLocations.length > 0) {
      return gameState.activeLocations.filter(encounter => encounter.enabled !== false);
    }

    if (
      gameState.cityEncounterState &&
      typeof gameState.cityEncounterState === 'object' &&
      Array.isArray(gameState.cityEncounterState[this.cityId])
    ) {
      return gameState.cityEncounterState[this.cityId].filter(encounter => encounter.enabled !== false);
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
      hq: 'start'
    };

    return map[city.id] || city.id;
  }

  getNpcTextureKey(npcId) {
    const HINDU_CITIES = ['new_delhi', 'newdelhi'];
    const isHindu = HINDU_CITIES.includes(this.cityId);

    const baseMap = {
      bankier:     isHindu ? 'bankierhindu'     : 'bankier',
      fence:       isHindu ? 'fencehindu'       : 'fence',
      knajpa:      isHindu ? 'knajpahindu'      : 'knajpa',
      maid:        isHindu ? 'maidhindu'        : 'maid',
      parkingowy:  isHindu ? 'parkingnpchindu'  : 'parkingnpc',
      police:      isHindu ? 'policehindu'      : 'police',
      stewardessa: isHindu ? 'stewardessahindu' : 'stewardessa',
      bum:         isHindu ? 'bumhindu'         : 'bum'
    };

    return baseMap[npcId] || (isHindu ? 'fencehindu' : 'fence');
  }

  getNpcLabel(npcId) {
    const map = {
      bankier:     'Banker',
      fence:       'Fence',
      knajpa:      'Restaurant Manager',
      maid:        'Maid',
      parkingowy:  'Parking Worker',
      police:      'Police Officer',
      stewardessa: 'Flight Attendant',
      bum:         'Homeless Man'
    };

    return map[npcId] || 'Witness';
  }
}