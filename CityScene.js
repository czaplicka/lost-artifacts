import { gameState } from './GameData.js';
import { ensureHud } from './hudHelpers.js';
import { EventBus } from './EventBus.js';

const LOCATION_HOURS = {
  'bank': ['Morning', 'Afternoon'],
  'policehq': ['Morning', 'Afternoon', 'Evening'],
  'hotel': ['Morning', 'Afternoon', 'Evening', 'Night'],
  'airport': ['Morning', 'Afternoon', 'Evening', 'Night'],
  'alley': ['Morning', 'Afternoon', 'Evening', 'Night'],
  'parking': ['Morning', 'Afternoon', 'Evening']
};

export class CityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CityScene' });
    this.city = null;
    this.cityId = 'warsaw';
    this.interactiveObjects = [];
  }

  init(data = {}) {
    this.cityId =
      data.cityId ||
      gameState.currentCityId ||
      this.registry.get('currentCityId') ||
      'warsaw';

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
  }

  create() {
    const bgMusic = this.registry.get('bgMusic');

    if (bgMusic) {
      bgMusic.stop();
    }

    let gameMusic = this.registry.get('gameMusic');

    if (!gameMusic) {
      gameMusic = this.sound.add('themeGame', {
        loop: true,
        volume: 0.5
      });
      this.registry.set('gameMusic', gameMusic);
    }

    if (!gameMusic.isPlaying) {
      gameMusic.play();
    }

    this.scene.wake('UIScene');

    const locations = this.cache.json.get('locations') || [];
    const city = locations.find(c => c.id === this.cityId);

    if (!city) {
      console.error('CityScene: city not found', this.cityId);
      this.scene.start('MenuScene');
      return;
    }

    this.city = city;
    gameState.currentCityId = this.cityId;
    gameState.currentCity = city.city;
    gameState.currentCityData = city;
    this.registry.set('currentCityId', this.cityId);

    this.createBackground(city);
    this.createHeader(city);
    this.createEncounters(city);

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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onSceneShutdown, this);
  }

  createBackground(city) {
    const backgroundKey = city.backgroundKey || this.getCityBackgroundKey(city);

    if (this.textures.exists(backgroundKey)) {
      this.add
        .image(this.scale.width / 2, this.scale.height / 2, backgroundKey)
        .setDisplaySize(this.scale.width, this.scale.height);
    } else {
      console.warn(`Missing city background: ${backgroundKey}`);
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

    this.add.text(40, 54, 'Talk to witnesses and follow the trail.', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#f1e6b8'
    });
  }

  createEncounters(city) {
    const encounters = this.getEncounters(city);
    const progressFlags = this.getCityProgressFlags();

    encounters.forEach(encounter => {
      const npcTextureKey = this.getNpcTextureKey(encounter.npcId);
      const iconKey = this.textures.exists(npcTextureKey) ? npcTextureKey : 'bum';
      const x = encounter.cityX;
      const y = encounter.cityY;

      const isVisited = this.isEncounterVisited(encounter.id);
      const encounterMemory = this.getEncounterMemory(encounter.id);
      const hasMemory = Boolean(encounterMemory);

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

        if (isVisited) {
          icon.setAlpha(0.78);
          nameLabel.setColor('#f1e6b8');
        } else {
          nameLabel.setColor('#ffe066');
        }
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
          this.showLocationClosedPopup(locationId, encounter);
          return;
        }

        this.scene.start('LocationScene', {
          cityId: this.cityId,
          encounterId: encounter.id,
          npcId: encounter.npcId,
          locationId: encounter.locationId,
          isRepeat: hasMemory || isVisited,
          isCrimeCity: progressFlags.isCrimeCity,
          isNextTargetCity: progressFlags.isNextTargetCity,
          isCorrectCity: progressFlags.isCorrectCity
        });
      });

      this.interactiveObjects.push(icon);
    });
  }

  getCityProgressFlags() {
    const cityId = this.cityId;

    const isCrimeCity = Boolean(gameState.crimeCityId && cityId === gameState.crimeCityId);
    const isNextTargetCity = Boolean(
      gameState.nextTargetCityId && cityId === gameState.nextTargetCityId
    );

    return {
      isCrimeCity,
      isNextTargetCity,
      isCorrectCity: isCrimeCity || isNextTargetCity
    };
  }

  showLocationClosedPopup(locationId, encounterData) {
    const width = this.scale.width;
    const height = this.scale.height;

    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setDepth(99)
      .setInteractive();

    const popupBg = this.add.rectangle(width / 2, height / 2, 500, 300, 0x111111, 0.95)
      .setStrokeStyle(4, 0xff0000)
      .setDepth(100);

    const allowed = LOCATION_HOURS[locationId].join(', ');
    const current = gameState.currentPartOfDay || 'Morning';

    const warningText = this.add.text(
      width / 2,
      height / 2 - 50,
      `Location is currently closed.\n(Open: ${allowed})\nCurrently it's: ${current}`,
      {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5).setDepth(101);

    const waitBtn = this.add.text(width / 2, height / 2 + 30, '[ Wait till Morning ]', {
      fontFamily: 'Special Elite',
      fontSize: '22px',
      color: '#ffcc00'
    }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

    const cancelBtn = this.add.text(width / 2, height / 2 + 80, '[ Return ]', {
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

      this.scene.start('LocationScene', {
        cityId: this.cityId,
        encounterId: encounterData.id,
        npcId: encounterData.npcId,
        locationId: encounterData.locationId,
        isRepeat: this.isEncounterVisited(encounterData.id) || Boolean(this.getEncounterMemory(encounterData.id)),
        isCrimeCity: flags.isCrimeCity,
        isNextTargetCity: flags.isNextTargetCity,
        isCorrectCity: flags.isCorrectCity
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
    this.interactiveObjects.forEach(obj => {
      if (obj?.removeAllListeners) {
        obj.removeAllListeners();
      }
    });

    this.interactiveObjects = [];
  }

  isEncounterVisited(encounterId) {
    return Array.isArray(gameState.visitedEncounters)
      && gameState.visitedEncounters.includes(encounterId);
  }

  getEncounterMemory(encounterId) {
    if (!encounterId) return null;
    if (!gameState.encounterMemory || typeof gameState.encounterMemory !== 'object') return null;
    return gameState.encounterMemory[encounterId] || null;
  }

  getEncounters(city) {
    if (Array.isArray(city.encounters) && city.encounters.length > 0) {
      return city.encounters
        .filter(encounter => encounter.enabled !== false)
        .slice(0, 3);
    }

    const npcPool = city.npcPool || city.npc || [];
    const locationPool = city.locationPool || city.availableLocations || [];
    const defaultX = [420, 960, 1500];
    const defaultY = [700, 620, 700];

    return npcPool.slice(0, 3).map((npcId, index) => ({
      id: `${this.cityId}_${npcId}_${locationPool[index] || 'alley'}`,
      npcId,
      locationId: locationPool[index] || 'alley',
      cityX: defaultX[index],
      cityY: defaultY[index],
      enabled: true
    }));
  }

  getCityBackgroundKey(city) {
    const map = {
      london: 'london',
      paris: 'paris',
      new_delhi: 'new_delhi',
      warsaw: 'warsaw',
      new_york_city: 'new_york_city',
      berlin: 'berlin',
      hq: 'start'
    };

    return map[city.id] || city.id;
  }

  getNpcTextureKey(npcId) {
    const map = {
      bankier: 'bankier',
      bum: 'bum',
      maid: 'maid',
      parkingowy: 'parking_npc',
      police: 'police',
      stewardessa: 'stewardessa'
    };

    return map[npcId] || 'bum';
  }

  getNpcLabel(npcId) {
    const map = {
      bankier: 'Banker',
      bum: 'Homeless',
      maid: 'Maid',
      parkingowy: 'Parking Worker',
      police: 'Police Officer',
      stewardessa: 'Stewardess'
    };

    return map[npcId] || npcId || 'Witness';
  }

  normalizeCityId(cityName) {
    const map = {
      London: 'london',
      Paris: 'paris',
      'New Delhi': 'new_delhi',
      Warsaw: 'warsaw',
      'New York City': 'new_york_city',
      Berlin: 'berlin',
      'Mark Agency Headquarters': 'hq'
    };

    return map[cityName] || 'warsaw';
  }
}