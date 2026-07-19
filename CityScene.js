import { gameState } from './gamedata.js';
import { ensureHud } from './hudHelpers.js';

export class CityScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CityScene' });
        this.city = null;
        this.cityId = 'warsaw';
        this.interactiveObjects = [];
    }

    init(data = {}) {
        this.cityId = data.cityId || this.registry.get('currentCityId') || 'warsaw';
        this.interactiveObjects = [];
    }

    create() {
        const locations = this.cache.json.get('locations') || [];
        const city = locations.find(c => c.id === this.cityId);

        if (!city) {
            console.error('CityScene: city not found', this.cityId);
            this.scene.start('MenuScene');
            return;
        }

        this.city = city;
        this.registry.set('currentCityId', this.cityId);

        if (!Array.isArray(gameState.visitedEncounters)) {
            gameState.visitedEncounters = [];
        }

        this.createBackground(city);
        this.createHeader(city);
        this.createEncounters(city);
        this.createBackButton();

        ensureHud(this);

        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
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
        this.add.rectangle(0, 0, this.scale.width, 80, 0x000000, 0.45)
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

        encounters.forEach((encounter) => {
            const npcTextureKey = this.getNpcTextureKey(encounter.npcId);
            const iconKey = this.textures.exists(npcTextureKey) ? npcTextureKey : 'bum';
            const x = encounter.cityX;
            const y = encounter.cityY;

            const isVisited = this.isEncounterVisited(encounter.id);

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
                this.add.text(x, y - 82, 'Already questioned', {
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

                this.scene.start('LocationScene', {
                    cityId: this.cityId,
                    encounterId: encounter.id,
                    npcId: encounter.npcId,
                    locationId: encounter.locationId,
                    isRepeat: isVisited
                });
            });

            this.interactiveObjects.push(icon);
        });
    }

    createBackButton() {
        const backBtn = this.add.image(120, this.scale.height - 85, 'back')
            .setScale(0.6)
            .setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.closeAllUIPanels();
            this.scene.start('MenuScene');
        });

        this.interactiveObjects.push(backBtn);
    }

    closeAllUIPanels() {
        const hud = this.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    onSceneShutdown() {
        this.interactiveObjects.forEach((obj) => {
            if (obj && obj.removeAllListeners) {
                obj.removeAllListeners();
            }
        });

        this.interactiveObjects = [];
    }

    isEncounterVisited(encounterId) {
        return Array.isArray(gameState.visitedEncounters)
            && gameState.visitedEncounters.includes(encounterId);
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