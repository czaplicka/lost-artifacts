// DestinationsUI.js
import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { travelToCity as performTravel } from '../gameSetup.js';
import { 
    ROUTE_LINE_COLOR, 
    ROUTE_SHADOW_COLOR, 
    getCityId, 
    normalizeCityId 
} from './DestinationMeta.js';
import { 
    getTransportOptions, 
    getAvailableAgencyBudget, 
    wouldCreateDebt, 
    formatMoney 
} from './DestinationCalculator.js';

export class DestinationsUI {
    constructor(scene) {
        this.scene = scene;
        this.isOpen = false;
        this.isTransitioning = false;
        this.canConfirm = false;
        this.isDestroyed = false;
        this.gameState = null;
        this.activePins = [];
        this.transportButtons = [];
        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.selectedTransport = null;
        this.routePreview = null;
        this.hqButton = null;
        this.hqButtonBg = null;
        this.hqButtonLabel = null;
        this.travelErrorTimer = null;

        this.boundTravelKeyHandler = this.onTravelKeyDown.bind(this);

        const { width, height } = this.scene.scale;

        this.container = this.scene.add
            .container(0, 0)
            .setDepth(25)
            .setVisible(false);

        this.overlay = this.scene.add
            .rectangle(0, 0, width, height, 0x000000, 0.8)
            .setOrigin(0)
            .setInteractive();

        this.overlay.on('pointerdown', () => this.close());
        this.container.add(this.overlay);

        this.mapImage = this.scene.add
            .image(width / 2, height / 2, 'mapbg')
            .setDisplaySize(width, height);

        this.container.add(this.mapImage);

        this.closeBtn = this.scene.add
            .text(width - 170, 100, 'X', {
                fontFamily: 'SpecialElite',
                fontSize: '55px',
                color: '#fbff00'
            })
            .setInteractive({ useHandCursor: true });

        this.closeBtn.on('pointerdown', () => this.close());
        this.container.add(this.closeBtn);

        this.createInfoPanel(width, height);
        this.createHQButton();
        this.registerKeyboard();

        this.scene.events.once(
            Phaser.Scenes.Events.SHUTDOWN,
            () => this.destroy()
        );
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

        if (isTyping || this.isTransitioning || this.isDestroyed) {
            return;
        }

        event.preventDefault();
        if (this.isOpen) this.close();
        else this.open(gameState);
    }

    createInfoPanel(width, height) {
        this.infoPanel = this.scene.add.container(width - 405, height - 430);

        const bg = this.scene.add
            .rectangle(0, 0, 380, 415, 0x101820, 0.96)
            .setOrigin(0)
            .setStrokeStyle(2, 0xd4af37);

        this.infoTitle = this.scene.add.text(20, 16, 'Travel dossier', {
            fontFamily: 'SpecialElite',
            fontSize: '27px',
            color: '#f4e7c1'
        });

        this.infoCity = this.scene.add.text(20, 58, '', {
            fontFamily: 'SpecialElite',
            fontSize: '23px',
            color: '#ffffff'
        });

        this.infoCountry = this.scene.add.text(20, 61, '', {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: '#c6d7e5'
        });

        this.transportPrompt = this.scene.add.text(20, 98, '', {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: '#ffd166',
            wordWrap: { width: 335, useAdvancedWrap: true }
        });

        this.infoTravel = this.scene.add.text(20, 210, '', {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: '#d6e4f0',
            wordWrap: { width: 340, useAdvancedWrap: true }
        });

        this.infoHours = this.scene.add.text(20, 258, '', {
            fontFamily: 'SpecialElite',
            fontSize: '19px',
            color: '#ffd166'
        });

        this.debtWarning = this.scene.add.text(20, 282, '', {
            fontFamily: 'SpecialElite',
            fontSize: '15px',
            color: '#ff9d6b',
            wordWrap: { width: 340, useAdvancedWrap: true }
        });

        this.confirmButton = this.scene.add
            .rectangle(190, 315, 245, 44, 0x6c757d, 1)
            .setOrigin(0.5, 0)
            .setStrokeStyle(2, 0xf1f1f1)
            .setInteractive({ useHandCursor: true });

        this.confirmLabel = this.scene.add
            .text(190, 337, 'Choose a city', {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: '#ffffff'
            })
            .setOrigin(0.5);

        this.confirmButton.on('pointerdown', () => {
            if (
                !this.canConfirm ||
                !this.selectedCity ||
                !this.selectedTransport ||
                this.isTransitioning ||
                this.isDestroyed
            ) {
                return;
            }

            void this.travelToCity(this.selectedCity, this.selectedTransport);
        });

        this.infoPanel.add([
            bg,
            this.infoTitle,
            this.infoCity,
            this.infoCountry,
            this.transportPrompt,
            this.infoTravel,
            this.infoHours,
            this.debtWarning,
            this.confirmButton,
            this.confirmLabel
        ]);

        this.container.add(this.infoPanel);
        this.setConfirmEnabled(false);
    }

    createHQButton() {
        this.hqButton = this.scene.add.container(150, 105);

        this.hqButtonBg = this.scene.add
            .rectangle(0, 0, 220, 44, 0x251926, 0.96)
            .setStrokeStyle(2, 0xff4f81)
            .setInteractive({ useHandCursor: true });

        this.hqButtonLabel = this.scene.add
            .text(0, 0, '↩ RETURN TO HQ', {
                fontFamily: 'SpecialElite',
                fontSize: '18px',
                color: '#fff2f6'
            })
            .setOrigin(0.5);

        this.hqButton.add([this.hqButtonBg, this.hqButtonLabel]);

        this.hqButtonBg.on('pointerover', () => {
            if (this.isTransitioning || this.isAtHQ()) return;
            this.hqButtonBg.setFillStyle(0x5a1c38, 1);
            this.hqButtonLabel.setColor('#ffb3cc');
        });

        this.hqButtonBg.on('pointerout', () => {
            if (this.isTransitioning || this.isAtHQ()) return;
            this.hqButtonBg.setFillStyle(0x251926, 0.96);
            this.hqButtonLabel.setColor('#fff2f6');
        });

        this.hqButtonBg.on('pointerdown', () => {
            if (this.isTransitioning || this.isAtHQ()) return;
            this.selectHeadquarters();
        });

        this.container.add(this.hqButton);
    }

    isAtHQ() {
        const currentCityId =
            this.gameState?.currentCityId ||
            gameState.currentCityId ||
            null;
        return currentCityId === 'hq';
    }

    updateHQButton() {
        if (!this.hqButton || !this.hqButtonBg || !this.hqButtonLabel) return;

        const atHQ = this.isAtHQ();
        this.hqButton.setVisible(true);

        if (atHQ) {
            this.hqButtonBg.disableInteractive();
            this.hqButtonBg.setFillStyle(0x30343b, 0.9);
            this.hqButtonBg.setStrokeStyle(2, 0x777777);
            this.hqButtonLabel.setText('MARK AGENCY HQ');
            this.hqButtonLabel.setColor('#a5a5a5');
            this.hqButton.setAlpha(0.8);
            return;
        }

        this.hqButtonBg.setInteractive({ useHandCursor: true });
        this.hqButtonBg.setFillStyle(0x251926, 0.96);
        this.hqButtonBg.setStrokeStyle(2, 0xff4f81);
        this.hqButtonLabel.setText('↩ RETURN TO HQ');
        this.hqButtonLabel.setColor('#fff2f6');
        this.hqButton.setAlpha(1);
    }

    selectHeadquarters() {
        const locationsData = this.getLocationsData();
        const headquarters = locationsData.find((loc) => loc.id === 'hq');

        if (!headquarters) {
            console.error('HQ location was not found in locations.json.');
            return;
        }

        if (this.isAtHQ()) return;

        this.clearTravelErrorTimer();

        if (this.selectedPin) {
            this.selectedPin.setFillStyle(0xffcc00);
            this.selectedPin.setScale(1);
        }

        if (this.selectedLabel) {
            this.selectedLabel.setColor('#ffffff');
        }

        this.selectedCity = headquarters;
        this.selectedPin = null;
        this.selectedLabel = null;

        const options = getTransportOptions(this.getCurrentCityData(), headquarters);
        this.selectedTransport = options[0] || null;

        this.createTransportButtons(options);
        this.refreshInfoPanel(headquarters);
        this.previewRoute(headquarters);
        this.setConfirmEnabled(Boolean(this.selectedTransport));
    }

    open(gameStateData) {
        if (this.isTransitioning || this.isOpen || this.isDestroyed) return;

        this.isOpen = true;
        EventBus.emit('hideHUD');

        const newsHud = this.scene.scene.get('NewsHud');
        if (newsHud?.events) {
            newsHud.events.emit('setNewspaperVisible', false);
            newsHud.events.emit('setTvVisible', false);
        }

        this.gameState = gameStateData || gameState;
        this.resetSelectionState();
        this.clearPins();
        this.refreshInfoPanel();
        this.setConfirmEnabled(false);

        const destinations = this.getDestinationsWithMustInclude();
        this.container.setVisible(true);
        this.updateHQButton();

        if (!destinations.length) {
            console.warn('No travel destinations are available.');
            return;
        }

        this.renderCityPins(destinations);
    }

    close({ restoreHud = true } = {}) {
        if (!this.isOpen || this.isDestroyed) return;

        this.isOpen = false;
        this.container.setVisible(false);
        this.clearPins();
        this.resetSelectionState();
        this.refreshInfoPanel();
        this.setConfirmEnabled(false);

        if (restoreHud) {
            EventBus.emit('showHUD');
        }
    }

    resetSelectionState() {
        this.clearTravelErrorTimer();
        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.selectedTransport = null;
        this.canConfirm = false;

        this.clearTransportButtons();

        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }
    }

    getLocationsData() {
        const data = this.scene.cache.json.get('locations') || [];
        return Array.isArray(data) ? data : data.locations || [];
    }

    getCurrentCityData() {
        const locationsData = this.getLocationsData();
        const currentCityId = this.gameState?.currentCityId || gameState.currentCityId;
        const currentCity = this.gameState?.currentCity || gameState.currentCity;

        return locationsData.find(
            (location) => location.id === currentCityId || location.city === currentCity
        ) || null;
    }

    getDestinationsWithMustInclude() {
        const locationsData = this.getLocationsData();
        const currentCityId = this.gameState?.currentCityId || gameState.currentCityId || null;
        const maxDestinations = 5;

        let result = Array.isArray(this.gameState?.currentDestinations)
            ? [...this.gameState.currentDestinations]
            : [];

        result = result.filter((city) => {
            const cityId = getCityId(city);
            return cityId && cityId !== currentCityId;
        });

        const mustIncludeCityId = this.gameState?.mustIncludeCityId || null;
        const alreadyContainsRequiredCity = result.some(
            (city) => getCityId(city) === mustIncludeCityId
        );

        if (mustIncludeCityId && mustIncludeCityId !== currentCityId && !alreadyContainsRequiredCity) {
            const requiredCity = locationsData.find(
                (location) => getCityId(location) === mustIncludeCityId
            );
            if (requiredCity) result.unshift(requiredCity);
        } else if (mustIncludeCityId === currentCityId) {
            this.gameState.mustIncludeCityId = null;
        }

        const seen = new Set();
        result = result.filter((city) => {
            const cityId = getCityId(city);
            if (!cityId || seen.has(cityId)) return false;
            seen.add(cityId);
            return true;
        });

        if (result.length < maxDestinations) {
            const filler = Phaser.Utils.Array.Shuffle(
                locationsData.filter((location) => {
                    const locationId = getCityId(location);
                    return (
                        location?.city &&
                        locationId &&
                        locationId !== currentCityId &&
                        locationId !== 'hq' &&
                        !seen.has(locationId)
                    );
                })
            );

            for (const city of filler) {
                if (result.length >= maxDestinations) break;
                result.push(city);
                seen.add(getCityId(city));
            }
        }

        return result.slice(0, maxDestinations);
    }

    clearPins() {
        this.activePins.forEach((pinObject) => pinObject?.destroy?.(true));
        this.activePins = [];
    }

    renderCityPins(citiesDataArray) {
        citiesDataArray.forEach((cityObj) => {
            const xPos = cityObj.map?.x ?? cityObj.mapX ?? this.scene.scale.width / 2;
            const yPos = cityObj.map?.y ?? cityObj.mapY ?? this.scene.scale.height / 2;

            const pinContainer = this.scene.add.container(xPos, yPos);

            const dot = this.scene.add
                .circle(0, 0, 15, 0xffcc00)
                .setStrokeStyle(4, 0x8b0000)
                .setInteractive({ useHandCursor: true });

            const label = this.scene.add
                .text(0, 30, cityObj.city, {
                    fontFamily: 'SpecialElite',
                    fontSize: '24px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 5 }
                })
                .setOrigin(0.5);

            pinContainer.add([dot, label]);
            this.container.add(pinContainer);
            this.activePins.push(pinContainer);

            dot.on('pointerover', () => {
                if (this.isTransitioning || this.selectedPin === dot) return;
                dot.setFillStyle(0xffffff);
                label.setColor('#ffcc00');
            });

            dot.on('pointerout', () => {
                if (this.isTransitioning || this.selectedPin === dot) return;
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
        this.clearTravelErrorTimer();
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

        const options = getTransportOptions(this.getCurrentCityData(), cityObj);
        this.selectedTransport = options[0] || null;

        this.createTransportButtons(options);
        this.refreshInfoPanel(cityObj);
        this.previewRoute(cityObj);
        this.setConfirmEnabled(Boolean(this.selectedTransport));
    }

    clearTransportButtons() {
        this.transportButtons.forEach((button) => button?.destroy?.(true));
        this.transportButtons = [];
    }

    createTransportButtons(options) {
        this.clearTransportButtons();
        if (options.length <= 1) return;

        const totalWidth = 330;
        const gap = 8;
        const buttonWidth = Math.min(
            82,
            Math.floor((totalWidth - gap * (options.length - 1)) / options.length)
        );
        const startX = 20 + buttonWidth / 2;

        options.forEach((option, index) => {
            const x = startX + index * (buttonWidth + gap);
            const isSelected = option.id === this.selectedTransport?.id;
            const container = this.scene.add.container(x, 145);

            const bg = this.scene.add
                .rectangle(
                    0,
                    0,
                    buttonWidth,
                    48,
                    isSelected ? option.color : 0x273746,
                    isSelected ? 0.95 : 1
                )
                .setStrokeStyle(2, isSelected ? 0xffffff : option.color)
                .setInteractive({ useHandCursor: true });

            const icon = this.scene.add
                .text(0, -9, option.icon, {
                    fontFamily: 'SpecialElite',
                    fontSize: '21px',
                    color: '#ffffff'
                })
                .setOrigin(0.5);

            const label = this.scene.add
                .text(0, 14, option.label, {
                    fontFamily: 'SpecialElite',
                    fontSize: '13px',
                    color: '#ffffff'
                })
                .setOrigin(0.5);

            container.add([bg, icon, label]);

            bg.on('pointerdown', () => {
                if (this.isTransitioning) return;

                this.clearTravelErrorTimer();
                this.selectedTransport = option;

                this.createTransportButtons(options);
                this.refreshInfoPanel(this.selectedCity);
                this.previewRoute(this.selectedCity);
                this.setConfirmEnabled(true);
            });

            this.infoPanel.add(container);
            this.transportButtons.push(container);
        });
    }

    getTravelPreview(cityObj) {
        const currentCityData = this.getCurrentCityData();
        const transport = this.selectedTransport;

        if (!currentCityData || !cityObj || !transport) {
            return {
                fromCity: currentCityData?.city || '',
                toCity: cityObj?.city || '',
                travelHours: null,
                baseTravelHours: null,
                moneySpent: 0,
                energyChange: 0
            };
        }

        return {
            fromCity: currentCityData.city,
            toCity: cityObj.city,
            travelHours: transport.travelHours,
            baseTravelHours: transport.baseTravelHours,
            moneySpent: transport.moneySpent,
            energyChange: transport.energyChange
        };
    }

    refreshInfoPanel(cityObj = null) {
        if (this.isDestroyed) return;

        if (!cityObj) {
            this.infoCity.setText('Choose a city');
            this.infoCountry.setText('');
            this.infoCountry.setPosition(20, 61);
            this.transportPrompt.setColor('#ffd166');
            this.transportPrompt.setText('');
            this.infoTravel.setText('');
            this.infoHours.setText('');
            this.debtWarning.setText('');
            this.confirmLabel.setText('Choose a city');
            return;
        }

        const preview = this.getTravelPreview(cityObj);
        this.infoCity.setText(cityObj.city || 'Unknown city');

        const countryText = cityObj.country ? `· ${cityObj.country}` : '';
        this.infoCountry.setText(countryText);
        this.infoCountry.setPosition(28 + this.infoCity.width, 61);

        if (!this.selectedTransport) {
            this.transportPrompt.setColor('#ff6b6b');
            this.transportPrompt.setText('No sensible route is available.');
            this.infoTravel.setText('');
            this.infoHours.setText('');
            this.debtWarning.setText('');
            this.confirmLabel.setText('No route available');
            this.setConfirmEnabled(false);
            return;
        }

        const agencyBudget = getAvailableAgencyBudget();
        const willGoIntoDebt = wouldCreateDebt(preview.moneySpent);

        this.transportPrompt.setColor('#ffd166');
        this.transportPrompt.setText(
            `Selected: ${this.selectedTransport.icon} ${this.selectedTransport.label}`
        );

        this.infoTravel.setText(
            `🎟 ${formatMoney(preview.moneySpent)}   ` +
            `🏢 Agency: ${formatMoney(agencyBudget)}   ` +
            `⚡ ${preview.energyChange}`
        );

        this.infoHours.setText(`Travel time: +${preview.travelHours}h`);
        this.debtWarning.setText(
            willGoIntoDebt ? '⚠ Not enough cash + budget - will add to agency debt.' : ''
        );

        this.confirmLabel.setText(`Go by ${this.selectedTransport.label}`);
        this.setConfirmEnabled(true);
    }

    previewRoute(cityObj) {
        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }

        const currentCityData = this.getCurrentCityData();
        if (!currentCityData?.map || !cityObj?.map) return;

        this.routePreview = this.scene.add.graphics();

        this.routePreview.lineStyle(9, ROUTE_SHADOW_COLOR, 0.55);
        this.routePreview.beginPath();
        this.routePreview.moveTo(currentCityData.map.x, currentCityData.map.y);
        this.routePreview.lineTo(cityObj.map.x, cityObj.map.y);
        this.routePreview.strokePath();

        this.routePreview.lineStyle(4, ROUTE_LINE_COLOR, 0.98);
        this.routePreview.beginPath();
        this.routePreview.moveTo(currentCityData.map.x, currentCityData.map.y);
        this.routePreview.lineTo(cityObj.map.x, cityObj.map.y);
        this.routePreview.strokePath();

        this.container.add(this.routePreview);
        this.container.moveAbove(this.routePreview, this.mapImage);
    }

    setConfirmEnabled(enabled) {
        this.canConfirm = Boolean(enabled) && !this.isTransitioning && !this.isDestroyed;
        if (!this.confirmButton || this.isDestroyed) return;

        if (this.canConfirm) {
            this.confirmButton.setFillStyle(0x9b5de5, 1);
            this.confirmButton.setAlpha(1);
            this.confirmLabel.setAlpha(1);
        } else {
            this.confirmButton.setFillStyle(0x6c757d, 1);
            this.confirmButton.setAlpha(0.7);
            this.confirmLabel.setAlpha(0.7);
        }
    }

    clearTravelErrorTimer() {
        this.travelErrorTimer?.remove(false);
        this.travelErrorTimer = null;
    }

    showTravelError(message) {
        if (this.isDestroyed) return;

        this.clearTravelErrorTimer();
        this.transportPrompt.setColor('#ff6b6b');
        this.transportPrompt.setText(message);

        this.travelErrorTimer = this.scene.time.delayedCall(2500, () => {
            this.travelErrorTimer = null;
            if (
                this.isDestroyed ||
                !this.isOpen ||
                !this.selectedTransport ||
                this.isTransitioning
            ) {
                return;
            }
            this.refreshInfoPanel(this.selectedCity);
        });
    }

    disableHotspots() {
        this.scene.disableHotspots?.();
        this.scene.hotspots?.forEach((hotspot) => {
            hotspot?.disableInteractive?.();
        });
    }

    cleanupBeforeTravel() {
        this.scene.closeAllUIPanels?.();
        this.disableHotspots();

        const sceneManager = this.scene.scene;
        if (
            sceneManager.isActive('PlayerHudScene') ||
            sceneManager.isSleeping('PlayerHudScene')
        ) {
            sceneManager.get('PlayerHudScene')?.closeAllUIPanels?.();
        }
    }

    async travelToCity(selectedCity, selectedTransport) {
        if (
            this.isTransitioning ||
            this.isDestroyed ||
            !selectedCity ||
            !selectedTransport
        ) {
            return false;
        }

        const locationsData = this.getLocationsData();
        const selectedCityData = locationsData.find(
            (location) => getCityId(location) === getCityId(selectedCity)
        );

        if (!selectedCityData) {
            console.error('City data not found:', selectedCity);
            this.setConfirmEnabled(true);
            this.showTravelError('Destination data is missing.');
            return false;
        }

        const fromCityId = this.gameState?.currentCityId || gameState.currentCityId || null;
        const fromCity = this.gameState?.currentCity || gameState.currentCity || null;
        const transportId = selectedTransport.id;
        const fallbackTransportLabel = selectedTransport.label;

        this.clearTravelErrorTimer();
        this.isTransitioning = true;
        this.setConfirmEnabled(false);

        let travelCommitted = false;

        try {
            const result = performTravel(selectedCityData.city, locationsData, transportId);

            if (!result) {
                throw new Error('performTravel returned no result.');
            }

            if (result.blocked) {
                this.isTransitioning = false;
                this.refreshInfoPanel(this.selectedCity);
                this.setConfirmEnabled(Boolean(this.selectedTransport));
                this.showTravelError(
                    result.blockReason === 'insufficient_energy'
                        ? 'Too exhausted to travel. Get some sleep first.'
                        : 'Travel is currently blocked.'
                );
                return false;
            }

            if (result.status === 'ALREADY_HERE') {
                this.isTransitioning = false;
                this.refreshInfoPanel(this.selectedCity);
                this.setConfirmEnabled(Boolean(this.selectedTransport));
                this.showTravelError('You are already in this city.');
                return false;
            }

            travelCommitted = true;

            const travelHours = Number(result.travelHours) || 0;
            const baseTravelHours = Number(result.baseTravelHours) || travelHours;
            const energyChange = Number(result.energyChange) || 0;
            const moneySpent = Number(result.moneySpent) || 0;
            const agencyDebtAdded = Number(result.agencyDebtAdded) || 0;
            const transportLabel = result.transportLabel || fallbackTransportLabel;
            const selectedCityId = getCityId(selectedCityData);

            gameState.lastTravel = {
                ...(gameState.lastTravel || {}),
                fromCityId,
                fromCity,
                toCityId: selectedCityId,
                toCity: selectedCityData.city,
                transportType: transportId,
                transportLabel,
                travelHours,
                baseTravelHours,
                moneySpent,
                agencyDebtAdded,
                energyChange,
                travelEncounter: result.travelEncounter || null,
                wasCorrect: Boolean(result.wasCorrect)
            };

            saveGameState();

            EventBus.emit('travelTicketPurchased', {
                cityId: selectedCityId,
                city: selectedCityData.city,
                transportType: transportId,
                cost: moneySpent,
                agencyDebtAdded
            });

            const mission = gameState.currentMission || {};
            const missionCityId = normalizeCityId(
                gameState.crimeCityId || mission.cityId || mission.city || null
            );

            const isMissionCrimeCity =
                Boolean(selectedCityData.isCrimeCity || selectedCityData.crimeCity) &&
                selectedCityId === missionCityId;

            const isCrimeSceneArrival =
                Boolean(result.isCrimeSceneArrival) || isMissionCrimeCity;

            EventBus.emit('firstCaseTravelStarted', {
                fromCityId,
                toCityId: selectedCityId,
                city: selectedCityData.city,
                transportType: transportId,
                isCrimeSceneArrival
            });

            const destinationScene = isCrimeSceneArrival ? 'CrimeCityScene' : 'CityScene';

            const transitionPayload = {
                fromCity: result.fromCity || fromCity,
                toCity: result.toCity || selectedCityData.city,
                toCityId: selectedCityId,
                cityId: selectedCityId,
                destinationScene,
                isCrimeSceneArrival,
                transportType: transportId,
                transportLabel,
                travelHours,
                baseTravelHours,
                moneySpent,
                agencyDebtAdded,
                energyChange,
                travelEncounter: result.travelEncounter || null,
                wasCorrect: Boolean(result.wasCorrect),
                status: result.status,
                pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
                pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || selectedCityId
            };

            const sceneManager = this.scene.scene;
            this.cleanupBeforeTravel();
            this.close({ restoreHud: false });

            ['OfficeScene', 'CityScene', 'CrimeCityScene'].forEach((sceneKey) => {
                if (sceneManager.isActive(sceneKey) || sceneManager.isSleeping(sceneKey)) {
                    sceneManager.stop(sceneKey);
                }
            });

            const didStartTransition = await this.scene.goto(
                'TravelTransitionScene',
                transitionPayload
            );

            if (!didStartTransition) {
                throw new Error('TravelTransitionScene could not be started.');
            }

            return true;
        } catch (error) {
            console.error('Travel failed:', error, {
                travelCommitted,
                fromCityId,
                toCityId: getCityId(selectedCityData),
                transportType: transportId
            });

            if (this.isDestroyed || !this.scene?.sys?.isActive()) {
                return false;
            }

            if (travelCommitted) {
                this.setConfirmEnabled(false);
                if (this.isOpen) {
                    this.showTravelError(
                        'Travel was processed, but the next screen failed to open.'
                    );
                }
                return false;
            }

            this.isTransitioning = false;
            if (!this.isOpen) {
                this.open(this.gameState || gameState);
            }

            this.refreshInfoPanel(this.selectedCity);
            this.setConfirmEnabled(Boolean(this.selectedTransport));
            this.showTravelError('Travel failed. Check the console for details.');
            return false;
        }
    }

    destroy() {
        if (this.isDestroyed) return;

        const wasTransitioning = this.isTransitioning;
        this.isDestroyed = true;

        this.clearTravelErrorTimer();

        if (!wasTransitioning) {
            EventBus.emit('showHUD');
        }

        this.clearPins();
        this.clearTransportButtons();

        if (this.routePreview) {
            this.routePreview.destroy();
            this.routePreview = null;
        }

        this.closeBtn?.removeAllListeners();
        this.confirmButton?.removeAllListeners();
        this.overlay?.removeAllListeners();
        this.hqButtonBg?.removeAllListeners();

        this.scene?.input?.keyboard?.off('keydown-T', this.boundTravelKeyHandler);

        this.container?.destroy(true);

        this.hqButton = null;
        this.hqButtonBg = null;
        this.hqButtonLabel = null;
        this.container = null;

        this.activePins = [];
        this.transportButtons = [];
        this.gameState = null;
        this.selectedCity = null;
        this.selectedPin = null;
        this.selectedLabel = null;
        this.selectedTransport = null;

        this.isOpen = false;
        this.isTransitioning = false;
        this.canConfirm = false;
    }
}