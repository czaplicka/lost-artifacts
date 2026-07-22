import { saveGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { travelToCity as performTravel } from '../gameSetup.js';

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
        }).setInteractive({ useHandCursor: true });

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

        const destinations = this.getDestinationsWithMustInclude();

        if (!Array.isArray(destinations) || destinations.length === 0) {
            console.log('Brak celów podróży. Być może jesteśmy w finałowym mieście.');
            this.container.setVisible(true);
            return;
        }

        console.log(
            'Wybrane miasta na mapę:',
            destinations.map(c => c.city)
        );

        this.renderCityPins(destinations);
        this.container.setVisible(true);
    }

    getDestinationsWithMustInclude() {
        const locationsData = this.scene.cache.json.get('locations') || [];
        const baseDestinations = Array.isArray(this.gameState?.currentDestinations)
            ? [...this.gameState.currentDestinations]
            : [];

        const mustIncludeCityId = this.gameState?.mustIncludeCityId;

        if (!mustIncludeCityId) {
            return baseDestinations;
        }

        if (this.gameState.currentCityId === mustIncludeCityId) {
            this.gameState.mustIncludeCityId = null;
            return baseDestinations;
        }

        const alreadyIncluded = baseDestinations.some(city => city?.id === mustIncludeCityId);

        if (alreadyIncluded) {
            return baseDestinations;
        }

        const requiredCity = locationsData.find(loc => loc.id === mustIncludeCityId);

        if (requiredCity) {
            baseDestinations.unshift(requiredCity);
        }

        return baseDestinations;
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
            if (pinObj?.destroy) {
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

    cleanupBeforeTravel() {
        if (this.scene.closeAllUIPanels) {
            this.scene.closeAllUIPanels();
        }

        const hud = this.scene.scene.get('PlayerHudScene');
        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }

        const sceneManager = this.scene.scene;

        if (sceneManager.isActive('LocationScene') || sceneManager.isSleeping('LocationScene')) {
            sceneManager.stop('LocationScene');
        }
    }

    travelToCity(selectedCity) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        this.close();

        const locationsData = this.scene.cache.json.get('locations') || [];

        const selectedCityData = selectedCity?.id
            ? locationsData.find(loc => loc.id === selectedCity.id)
            : locationsData.find(loc => loc.city === selectedCity?.city);

        if (!selectedCityData) {
            console.error('Nie znaleziono danych miasta:', selectedCity);
            this.isTransitioning = false;
            return;
        }

        const sceneManager = this.scene.scene;
        const transitionExists = sceneManager.keys?.TravelTransitionScene || sceneManager.get('TravelTransitionScene');

        if (!transitionExists) {
            console.error('TravelTransitionScene is not registered in game config.');
            this.isTransitioning = false;
            return;
        }

        try {
            const result = performTravel(selectedCityData.city, locationsData);

            if (!result) {
                console.error('travelToCity zwróciło pusty wynik');
                this.isTransitioning = false;
                return;
            }

            EventBus.emit('advanceTime', result.travelHours || 0, 0);
            saveGameState();

            console.log('[DestinationsUI.travelToCity]', {
                fromCity: result.fromCity,
                toCity: result.toCity,
                status: result.status,
                wasCorrect: result.wasCorrect,
                travelHours: result.travelHours,
                isCrimeSceneArrival: result.isCrimeSceneArrival
            });

            this.cleanupBeforeTravel();

            this.scene.scene.start('TravelTransitionScene', {
                fromCity: result.fromCity,
                toCity: result.toCity,
                toCityId: selectedCityData.id,
                cityId: selectedCityData.id,
                travelHours: result.travelHours || 0,
                wasCorrect: result.wasCorrect,
                status: result.status,
                isCrimeSceneArrival: result.isCrimeSceneArrival || false
            });
        } catch (error) {
            console.error('Błąd podczas podróży do miasta:', error);
            this.isTransitioning = false;
        }
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