import { gameState, saveGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import {
    travelToCity as performTravel,
    completeCityInvestigation,
    getTravelHours
} from '../gameSetup.js';

export class DestinationsUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isTransitioning = false;
        this.gameState = null;
        this.activePins = [];

        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.routePreview = null;
        this.canConfirm = false;

        this.boundTravelKeyHandler = this.onTravelKeyDown.bind(this);

        const { width, height } = this.scene.scale;

        this.container = this.scene.add.container(0, 0)
            .setDepth(25)
            .setVisible(false);

        this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive();

        this.overlay.on('pointerdown', () => this.close());
        this.container.add(this.overlay);

        this.mapImage = this.scene.add.image(width / 2, height / 2, 'mapbg');
        this.container.add(this.mapImage);

        this.closeBtn = this.scene.add.text(width - 170, 100, 'X', {
            fontFamily: 'Special Elite',
            fontSize: '55px',
            color: '#fbff00'
        }).setInteractive({ useHandCursor: true });

        this.closeBtn.on('pointerdown', this.close, this);
        this.container.add(this.closeBtn);

        this.createInfoPanel(width, height);
        this.registerKeyboard();

        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.destroy();
        });
    }

    registerKeyboard() {
        if (!this.scene?.input?.keyboard) return;

        this.scene.input.keyboard.addCapture('T');
        this.scene.input.keyboard.on('keydown-T', this.boundTravelKeyHandler);
    }

    onTravelKeyDown(event) {
        const activeTag = document.activeElement?.tagName;
        const isTyping =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            document.activeElement?.isContentEditable;

        if (isTyping || this.isTransitioning) return;

        event.preventDefault();

        if (this.isOpen) {
            this.close();
        } else {
            this.open(gameState);
        }
    }

    createInfoPanel(width, height) {
        this.infoPanel = this.scene.add.container(width - 360, height - 240);

        const bg = this.scene.add.rectangle(0, 0, 320, 205, 0x101820, 0.9)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xd4af37);

        this.infoTitle = this.scene.add.text(20, 18, 'Travel dossier', {
            fontFamily: 'Special Elite',
            fontSize: '26px',
            color: '#f4e7c1'
        });

        this.infoCity = this.scene.add.text(20, 60, 'Choose a city on the map.', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: 280, useAdvancedWrap: true }
        });

        this.infoCountry = this.scene.add.text(20, 98, '', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#d9d9d9'
        });

        this.infoHours = this.scene.add.text(20, 128, '', {
            fontFamily: 'Special Elite',
            fontSize: '20px',
            color: '#ffd166'
        });

        this.confirmButton = this.scene.add.rectangle(160, 158, 190, 40, 0x6c757d, 1)
            .setOrigin(0.5, 0)
            .setStrokeStyle(2, 0xf1f1f1)
            .setInteractive({ useHandCursor: true });

        this.confirmLabel = this.scene.add.text(160, 178, 'Go by plane', {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.confirmButton.on('pointerdown', () => {
            if (!this.canConfirm || !this.selectedCity || this.isTransitioning) return;
            this.travelToCity(this.selectedCity);
        });

        this.infoPanel.add([
            bg,
            this.infoTitle,
            this.infoCity,
            this.infoCountry,
            this.infoHours,
            this.confirmButton,
            this.confirmLabel
        ]);

        this.container.add(this.infoPanel);
        this.setConfirmEnabled(false);
    }

    open(gameStateData) {
        if (this.isTransitioning) return;
        if (this.isOpen) return;

        this.isOpen = true;
        this.gameState = gameStateData || gameState;

        this.resetSelectionState();
        this.clearPins();
        this.refreshInfoPanel();
        this.setConfirmEnabled(false);

        const destinations = this.getDestinationsWithMustInclude();

        if (!Array.isArray(destinations) || destinations.length === 0) {
            console.log('Brak celów podróży. Być może jesteśmy w finałowym mieście.');
            this.container.setVisible(true);
            return;
        }

        console.log('Wybrane miasta na mapę:', destinations.map(c => c.city));

        this.renderCityPins(destinations);
        this.container.setVisible(true);
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.container.setVisible(false);
        this.clearPins();
        this.resetSelectionState();
        this.refreshInfoPanel();
        this.setConfirmEnabled(false);
    }

    resetSelectionState() {
        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.canConfirm = false;

        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }
    }

    shouldAdvanceOnDeparture() {
        const currentCityId = this.gameState?.currentCityId || gameState.currentCityId || null;
        const targetCityId = this.gameState?.nextTargetCityId || gameState.nextTargetCityId || null;
        const justReachedCorrectCityId =
            this.gameState?.justReachedCorrectCityId ||
            gameState.justReachedCorrectCityId ||
            null;

        if (!currentCityId) return false;

        return currentCityId === targetCityId || currentCityId === justReachedCorrectCityId;
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
                if (this.selectedPin === dot) return;
                dot.setFillStyle(0xffffff);
                label.setColor('#ffcc00');
            });

            dot.on('pointerout', () => {
                if (this.isTransitioning) return;
                if (this.selectedPin === dot) return;
                dot.setFillStyle(0xffcc00);
                label.setColor('#ffffff');
            });

            dot.on('pointerdown', () => {
                if (this.isTransitioning) return;
                this.selectCity(cityObj, dot, label);
            });
        });
    }

    selectCity(cityObj, dot, label) {
        this.selectedCity = cityObj;

        if (this.selectedPin && this.selectedPin !== dot) {
            this.selectedPin.setFillStyle(0xffcc00);
            this.selectedPin.setScale(1);
        }

        if (this.selectedLabel && this.selectedLabel !== label) {
            this.selectedLabel.setColor('#ffffff');
        }

        this.selectedPin = dot;
        this.selectedLabel = label;

        dot.setFillStyle(0xffffff);
        dot.setScale(1.15);
        label.setColor('#ffcc00');

        this.refreshInfoPanel(cityObj);
        this.previewRoute(cityObj);
        this.setConfirmEnabled(true);
    }

    getTravelPreview(cityObj) {
        const locationsData = this.scene.cache.json.get('locations') || [];
        const currentCityData = locationsData.find(loc =>
            loc.id === this.gameState?.currentCityId ||
            loc.city === this.gameState?.currentCity
        );

        if (!currentCityData || !cityObj) {
            return {
                fromCity: currentCityData?.city || this.gameState?.currentCity || '',
                toCity: cityObj?.city || '',
                travelHours: null
            };
        }

        const travelHours = getTravelHours(
            currentCityData.city,
            cityObj.city,
            locationsData
        );

        return {
            fromCity: currentCityData.city,
            toCity: cityObj.city,
            travelHours
        };
    }

    refreshInfoPanel(cityObj = null) {
        if (!cityObj) {
            this.infoCity.setText('Choose a city.');
            this.infoCountry.setText('');
            this.infoHours.setText('');
            return;
        }

        const preview = this.getTravelPreview(cityObj);

        this.infoCity.setText(cityObj.city || 'Unknown city');
        this.infoCountry.setText(cityObj.country || '');

        if (typeof preview.travelHours === 'number') {
            this.infoHours.setText(`Travel time: +${preview.travelHours}h`);
        } else {
            this.infoHours.setText('Travel time unknown.');
        }
    }

    previewRoute(cityObj) {
        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }

        const locationsData = this.scene.cache.json.get('locations') || [];
        const currentCityData = locationsData.find(loc =>
            loc.id === this.gameState?.currentCityId ||
            loc.city === this.gameState?.currentCity
        );

        if (!currentCityData?.map || !cityObj?.map) {
            return;
        }

        this.routePreview = this.scene.add.graphics();
        this.routePreview.lineStyle(4, 0xffe066, 0.95);
        this.routePreview.beginPath();
        this.routePreview.moveTo(currentCityData.map.x, currentCityData.map.y);
        this.routePreview.lineTo(cityObj.map.x, cityObj.map.y);
        this.routePreview.strokePath();

        this.container.add(this.routePreview);
        this.container.sendToBack(this.routePreview);
    }

    setConfirmEnabled(enabled) {
        this.canConfirm = enabled;

        if (!this.confirmButton) return;

        if (enabled) {
            this.confirmButton.setFillStyle(0x9b5de5, 1);
            this.confirmButton.setAlpha(1);
            this.confirmLabel.setAlpha(1);
        } else {
            this.confirmButton.setFillStyle(0x6c757d, 1);
            this.confirmButton.setAlpha(0.7);
            this.confirmLabel.setAlpha(0.7);
        }
    }

    disableHotspots() {
        if (typeof this.scene.disableHotspots === 'function') {
            this.scene.disableHotspots();
        }

        if (this.scene.hotspots && Array.isArray(this.scene.hotspots)) {
            this.scene.hotspots.forEach(hotspot => {
                hotspot?.disableInteractive?.();
            });
        }
    }

    cleanupBeforeTravel() {
        if (this.scene.closeAllUIPanels) {
            this.scene.closeAllUIPanels();
        }

        this.disableHotspots();

        const sceneManager = this.scene.scene;
        let hud = null;

        if (sceneManager.isActive('PlayerHudScene') || sceneManager.isSleeping('PlayerHudScene')) {
            hud = sceneManager.get('PlayerHudScene');
        }

        if (hud?.closeAllUIPanels) {
            hud.closeAllUIPanels();
        }
    }

    travelToCity(selectedCity) {
        if (this.isTransitioning || !selectedCity) return;

        this.isTransitioning = true;
        this.setConfirmEnabled(false);

        const locationsData = this.scene.cache.json.get('locations') || [];
        const selectedCityData = selectedCity?.id
            ? locationsData.find(loc => loc.id === selectedCity.id)
            : locationsData.find(loc => loc.city === selectedCity?.city);

        if (!selectedCityData) {
            console.error('Nie znaleziono danych miasta:', selectedCity);
            this.isTransitioning = false;
            this.setConfirmEnabled(true);
            return;
        }

        try {
            const shouldAdvanceBeforeDeparture = this.shouldAdvanceOnDeparture();

            if (shouldAdvanceBeforeDeparture) {
                const completionResult = completeCityInvestigation(locationsData);

                console.log('[DestinationsUI.travelToCity] completionResult:', completionResult);

                if (!completionResult?.success) {
                    console.error('Nie udało się domknąć śledztwa w mieście:', completionResult);
                    this.isTransitioning = false;
                    this.setConfirmEnabled(true);
                    return;
                }
            }

            const result = performTravel(selectedCityData.city, locationsData);

            console.log('[DestinationsUI.travelToCity] result:', result);

            if (!result) {
                console.error('travelToCity zwróciło pusty wynik');
                this.isTransitioning = false;
                this.setConfirmEnabled(true);
                return;
            }

            EventBus.emit('advanceTime', result.travelHours || 0, 0);
            saveGameState();

            const transitionPayload = {
                fromCity: result.fromCity,
                toCity: result.toCity,
                toCityId: selectedCityData.id,
                cityId: selectedCityData.id,
                travelHours: result.travelHours || 0,
                wasCorrect: result.wasCorrect,
                status: result.status,
                isCrimeSceneArrival: result.isCrimeSceneArrival || false,
                pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
                pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || selectedCityData.id
            };

            console.log('[DestinationsUI.travelToCity] start TravelTransitionScene with:', transitionPayload);

            this.cleanupBeforeTravel();
            this.close();
            this.scene.scene.start('TravelTransitionScene', transitionPayload);
        } catch (error) {
            console.error('Błąd podczas podróży do miasta:', error);
            this.isTransitioning = false;
            this.setConfirmEnabled(true);
        }
    }

    destroy() {
        this.clearPins();

        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }

        if (this.closeBtn) {
            this.closeBtn.off('pointerdown', this.close, this);
        }

        if (this.confirmButton) {
            this.confirmButton.removeAllListeners();
        }

        if (this.overlay) {
            this.overlay.removeAllListeners();
        }

        if (this.scene?.input?.keyboard) {
            this.scene.input.keyboard.off('keydown-T', this.boundTravelKeyHandler);
        }

        if (this.container) {
            this.container.destroy(true);
        }

        this.activePins = [];
        this.gameState = null;
        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.isOpen = false;
        this.isTransitioning = false;
        this.canConfirm = false;
    }
}