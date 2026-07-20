import { advanceInvestigation } from '../gameSetup.js';
import { saveGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

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

        let travelHours = 6;

        const currentCityData = this.gameState.currentCityData ||
            locationsData.find(loc => loc.id === fromCityId);

        if (currentCityData?.map && selectedCityData?.map) {
            const dx = selectedCityData.map.x - currentCityData.map.x;
            const dy = selectedCityData.map.y - currentCityData.map.y;
            const distance = Math.hypot(dx, dy);
            const TIME_MULTIPLIER = 0.02;

            travelHours = Math.max(1, Math.round(distance * TIME_MULTIPLIER));

            console.log(`Dystans z ${fromCity} do ${selectedCityName}: ${distance.toFixed(1)}px`);
            console.log(`Wyliczony czas: ${travelHours} godzin.`);
        }

        this.registerTravel({
            fromCity,
            fromCityId,
            toCity: selectedCityName,
            toCityId: selectedCityId,
            wasCorrect,
            travelHours
        });

        this.gameState.currentCity = selectedCityName;
        this.gameState.currentCityId = selectedCityId;
        this.gameState.currentCityData = selectedCityData;

        if (!Array.isArray(this.gameState.visitedCities)) {
            this.gameState.visitedCities = [];
        }

        if (!this.gameState.visitedCities.includes(selectedCityId)) {
            this.gameState.visitedCities.push(selectedCityId);
        }

        if (this.gameState.mustIncludeCityId && selectedCityId === this.gameState.mustIncludeCityId) {
            this.gameState.mustIncludeCityId = null;
        }

        let status = 'FALSE_LEAD';

        if (wasCorrect) {
            status = advanceInvestigation(locationsData);
        } else {
            this.gameState.score = Math.max(0, (this.gameState.score || 0) - 25);
        }

        EventBus.emit('advanceTime', travelHours, 0);

        saveGameState();

        this.scene.scene.start('TravelTransitionScene', {
            fromCity,
            fromCityId,
            toCity: selectedCityName,
            toCityId: selectedCityId,
            travelHours,
            wasCorrect,
            status,
            cityId: selectedCityId,
            nextScene: 'LocationScene'
        });
    }

    registerTravel({ fromCity, fromCityId, toCity, toCityId, wasCorrect, travelHours = 6 }) {
        if (!Array.isArray(this.gameState.travelHistory)) {
            this.gameState.travelHistory = [];
        }

        const entry = {
            fromCity: fromCity || null,
            fromCityId: fromCityId || null,
            toCity: toCity || null,
            toCityId: toCityId || null,
            wasCorrect: Boolean(wasCorrect),
            travelHours: travelHours,
            timestamp: Date.now()
        };

        this.gameState.travelHistory.push(entry);
        this.gameState.lastTravel = entry;
        this.gameState.timeSpent = (this.gameState.timeSpent || 0) + travelHours;
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