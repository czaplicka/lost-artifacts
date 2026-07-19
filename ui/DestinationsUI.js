import { advanceInvestigation } from '../gameSetup.js';
import { saveGameState } from '../gamedata.js';

export class DestinationsUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isTransitioning = false;
        this.gameState = null;
        this.activePins = [];

        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0).setDepth(25).setVisible(false);

        const overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive();

        this.container.add(overlay);

        const mapImage = this.scene.add.image(width / 2, height / 2, 'mapbg');
        this.container.add(mapImage);

        this.closeBtn = this.scene.add.text(width - 170, 100, 'X', {
            fontFamily: 'Special Elite',
            fontSize: '55px',
            color: '#fbff00'
        })
            .setInteractive({ useHandCursor: true });

        this.closeBtn.on('pointerdown', this.close, this);
        this.container.add(this.closeBtn);

        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });
    }

    open(gameState) {
        if (this.isOpen || this.isTransitioning) return;

        this.isOpen = true;
        this.gameState = gameState;

        this.clearPins();

        if (!Array.isArray(this.gameState.currentDestinations) || this.gameState.currentDestinations.length === 0) {
            console.log('Brak celów podróży. Być może jesteśmy w finałowym mieście.');
            this.container.setVisible(true);
            return;
        }

        console.log(
            'Wybrane miasta na mapę:',
            this.gameState.currentDestinations.map(c => c.city)
        );

        this.renderCityPins(this.gameState.currentDestinations);
        this.container.setVisible(true);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.container.setVisible(false);
        this.clearPins();
    }

    clearPins() {
        if (!this.activePins.length) return;

        this.activePins.forEach(pinObj => {
            if (pinObj && pinObj.destroy) {
                pinObj.destroy(true);
            }
        });

        this.activePins = [];
    }

    renderCityPins(citiesDataArray) {
        if (!Array.isArray(citiesDataArray) || citiesDataArray.length === 0) {
            console.error('renderCityPins otrzymało pustą tablicę!');
            return;
        }

        citiesDataArray.forEach((cityObj) => {
            const cityName = cityObj.city;
            const xPos = cityObj.map?.x ?? cityObj.mapX ?? (this.scene.scale.width / 2);
            const yPos = cityObj.map?.y ?? cityObj.mapY ?? (this.scene.scale.height / 2);

            const pinContainer = this.scene.add.container(xPos, yPos);

            const dot = this.scene.add.circle(0, 0, 15, 0xffcc00)
                .setStrokeStyle(4, 0x8b0000)
                .setInteractive({ useHandCursor: true });

            const label = this.scene.add.text(0, 30, cityName, {
                fontFamily: 'Special Elite',
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 5, y: 5 }
            }).setOrigin(0.5);

            pinContainer.add([dot, label]);
            this.container.add(pinContainer);
            this.activePins.push(pinContainer);

            dot.on('pointerover', () => {
                if (this.isTransitioning) return;
                dot.setFillStyle(0xffffff);
                label.setColor('#ffcc00');
            });

            dot.on('pointerout', () => {
                if (this.isTransitioning) return;
                dot.setFillStyle(0xffcc00);
                label.setColor('#ffffff');
            });

            dot.on('pointerdown', () => {
                if (this.isTransitioning) return;
                this.travelToCity(cityObj);
            });
        });
    }

    travelToCity(selectedCity) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        this.close();

        if (this.scene.closeAllUIPanels) {
            this.scene.closeAllUIPanels();
        }

        const fromCity = this.gameState.currentCity;
        const fromCityId = this.gameState.currentCityId;
        const locationsData = this.scene.cache.json.get('locations') || [];

        const selectedCityData = selectedCity?.id
            ? locationsData.find(loc => loc.id === selectedCity.id)
            : locationsData.find(loc => loc.city === selectedCity?.city);

        if (!selectedCityData) {
            console.error('Nie znaleziono danych miasta:', selectedCity);
            this.isTransitioning = false;
            return;
        }

        const selectedCityId = selectedCityData.id;
        const selectedCityName = selectedCityData.city;
        const wasCorrect = selectedCityId === this.gameState.nextTargetCityId;

        if (!this.scene.scene.get('TravelTransitionScene')) {
            console.error('TravelTransitionScene is not registered in game config.');
            this.isTransitioning = false;
            return;
        }

        this.registerTravel({
            fromCity,
            fromCityId,
            toCity: selectedCityName,
            toCityId: selectedCityId,
            wasCorrect
        });

        if (wasCorrect) {
            this.gameState.currentCity = selectedCityName;
            this.gameState.currentCityId = selectedCityId;
            this.gameState.currentCityData = selectedCityData;

            if (!Array.isArray(this.gameState.visitedCities)) {
                this.gameState.visitedCities = [];
            }

            if (!this.gameState.visitedCities.includes(selectedCityId)) {
                this.gameState.visitedCities.push(selectedCityId);
            }

            const status = advanceInvestigation(locationsData);
            saveGameState();

            this.scene.scene.start('TravelTransitionScene', {
                fromCity,
                fromCityId,
                toCity: selectedCityName,
                toCityId: selectedCityId,
                travelHours: 6,
                wasCorrect: true,
                status,
                cityId: selectedCityId,
                nextScene: 'CityScene'
            });
        } else {
            this.gameState.score = Math.max(0, (this.gameState.score || 0) - 25);
            saveGameState();

            this.scene.scene.start('TravelTransitionScene', {
                fromCity,
                fromCityId,
                toCity: selectedCityName,
                toCityId: selectedCityId,
                travelHours: 6,
                wasCorrect: false,
                status: 'FALSE_LEAD',
                cityId: selectedCityId,
                nextScene: 'GameScene'
            });
        }
    }

    registerTravel({ fromCity, fromCityId, toCity, toCityId, wasCorrect }) {
        if (!Array.isArray(this.gameState.travelHistory)) {
            this.gameState.travelHistory = [];
        }

        const entry = {
            fromCity: fromCity || null,
            fromCityId: fromCityId || null,
            toCity: toCity || null,
            toCityId: toCityId || null,
            wasCorrect: Boolean(wasCorrect),
            travelHours: 6,
            timestamp: Date.now()
        };

        this.gameState.travelHistory.push(entry);
        this.gameState.lastTravel = entry;
        this.gameState.timeSpent = (this.gameState.timeSpent || 0) + 6;
    }

    destroy() {
        this.clearPins();

        if (this.closeBtn) {
            this.closeBtn.off('pointerdown', this.close, this);
        }

        if (this.container) {
            this.container.destroy(true);
        }

        this.activePins = [];
        this.gameState = null;
        this.isOpen = false;
        this.isTransitioning = false;
    }
}