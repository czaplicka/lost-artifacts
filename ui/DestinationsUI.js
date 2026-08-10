import { gameState, saveGameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { travelToCity as performTravel } from '../gameSetup.js';

const TRANSPORT_CONFIG = {
  plane: { id: 'plane', icon: '✈', label: 'Plane', color: 0xd9c27a, minHours: 2, hoursPerMapPixel: 0.012, baseCost: 130, costPerHour: 35, energyPerHour: 0.7 },
  train: { id: 'train', icon: '🚆', label: 'Train', color: 0x8fd3ff, minHours: 3, hoursPerMapPixel: 0.045, baseCost: 35, costPerHour: 15, energyPerHour: 1.15 },
  bus: { id: 'bus', icon: '🚌', label: 'Bus', color: 0xffb347, minHours: 4, hoursPerMapPixel: 0.06, baseCost: 18, costPerHour: 9, energyPerHour: 1.7 },
  ship: { id: 'ship', icon: '🚢', label: 'Ship', color: 0x62b6cb, minHours: 6, hoursPerMapPixel: 0.03, baseCost: 45, costPerHour: 12, energyPerHour: 1.25 }
};

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
    this.selectedTransport = null;
    this.routePreview = null;
    this.transportButtons = [];
    this.canConfirm = false;
    this.boundTravelKeyHandler = this.onTravelKeyDown.bind(this);

    const { width, height } = this.scene.scale;
    this.container = this.scene.add.container(0, 0).setDepth(25).setVisible(false);
    this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0).setInteractive();
    this.overlay.on('pointerdown', () => this.close());
    this.container.add(this.overlay);

    this.mapImage = this.scene.add.image(width / 2, height / 2, 'mapbg').setDisplaySize(width, height);
    this.container.add(this.mapImage);

    this.closeBtn = this.scene.add.text(width - 170, 100, 'X', {
      fontFamily: 'Special Elite', fontSize: '55px', color: '#fbff00'
    }).setInteractive({ useHandCursor: true });
    this.closeBtn.on('pointerdown', this.close, this);
    this.container.add(this.closeBtn);

    this.createInfoPanel(width, height);
    this.registerKeyboard();
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }
create () {
      this.scene.get('NewsHud').events.emit('setNewspaperVisible', false); 
  this.scene.get('NewsHud').events.emit('setTvVisible', false);
}
  registerKeyboard() {
    if (!this.scene?.input?.keyboard) return;
    this.scene.input.keyboard.addCapture('T');
    this.scene.input.keyboard.on('keydown-T', this.boundTravelKeyHandler);
  }

  onTravelKeyDown(event) {
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    if (isTyping || this.isTransitioning) return;
    event.preventDefault();
    if (this.isOpen) this.close();
    else this.open(gameState);
  }

  createInfoPanel(width, height) {
    this.infoPanel = this.scene.add.container(width - 390, height - 370);
    const bg = this.scene.add.rectangle(0, 0, 360, 335, 0x101820, 0.94).setOrigin(0, 0).setStrokeStyle(2, 0xd4af37);
    this.infoTitle = this.scene.add.text(20, 16, 'Travel dossier', { fontFamily: 'Special Elite', fontSize: '26px', color: '#f4e7c1' });
    this.infoCity = this.scene.add.text(20, 55, 'Choose a city on the map.', { fontFamily: 'Special Elite', fontSize: '22px', color: '#ffffff', wordWrap: { width: 320, useAdvancedWrap: true } });
    this.infoCountry = this.scene.add.text(20, 87, '', { fontFamily: 'Special Elite', fontSize: '18px', color: '#d9d9d9' });
    this.transportPrompt = this.scene.add.text(20, 122, '', { fontFamily: 'Special Elite', fontSize: '18px', color: '#ffd166' });
    this.infoTravel = this.scene.add.text(20, 220, '', { fontFamily: 'Special Elite', fontSize: '19px', color: '#d6e4f0', wordWrap: { width: 320, useAdvancedWrap: true } });
    this.infoHours = this.scene.add.text(20, 248, '', { fontFamily: 'Special Elite', fontSize: '19px', color: '#ffd166' });

    this.confirmButton = this.scene.add.rectangle(180, 282, 230, 40, 0x6c757d, 1).setOrigin(0.5, 0).setStrokeStyle(2, 0xf1f1f1).setInteractive({ useHandCursor: true });
    this.confirmLabel = this.scene.add.text(180, 302, 'Choose transport', { fontFamily: 'Special Elite', fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.confirmButton.on('pointerdown', () => {
      if (!this.canConfirm || !this.selectedCity || !this.selectedTransport || this.isTransitioning) return;
      this.travelToCity(this.selectedCity, this.selectedTransport);
    });

    this.infoPanel.add([bg, this.infoTitle, this.infoCity, this.infoCountry, this.transportPrompt, this.infoTravel, this.infoHours, this.confirmButton, this.confirmLabel]);
    this.container.add(this.infoPanel);
    this.setConfirmEnabled(false);
  }

  open(gameStateData) {
    if (this.isTransitioning || this.isOpen) return;
    this.isOpen = true;
    EventBus.emit('hideHUD');
    this.gameState = gameStateData || gameState;
    this.resetSelectionState();
    this.clearPins();
    this.refreshInfoPanel();
    this.setConfirmEnabled(false);

    const destinations = this.getDestinationsWithMustInclude();
    this.container.setVisible(true);
    if (!destinations.length) {
      console.log('No travel destinations are available.');
      return;
    }
    this.renderCityPins(destinations);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.container.setVisible(false);
    this.clearPins();
    this.resetSelectionState();
    this.refreshInfoPanel();
    this.setConfirmEnabled(false);
    EventBus.emit('showHUD');
  }

  resetSelectionState() {
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

  normalizeCityId(city) {
    if (!city) return null;
    const map = {
      London: 'london', Paris: 'paris', 'New Delhi': 'new_delhi', Warsaw: 'warsaw',
      'New York City': 'new_york_city', Berlin: 'berlin', Toronto: 'toronto',
      Kotto: 'kotto', Islamabad: 'islamabad', Nairobi: 'nairobi', Tokyo: 'tokyo',
      'Mark Agency Headquarters': 'hq'
    };
    return map[city] || city.toLowerCase().replace(/\s+/g, '_');
  }

  getCityId(cityObj) {
    return cityObj?.id || this.normalizeCityId(cityObj?.city);
  }

  getLocationsData() {
    const data = this.scene.cache.json.get('locations') || [];
    return Array.isArray(data) ? data : data.locations || [];
  }

  getCurrentCityData() {
    const locationsData = this.getLocationsData();
    const currentCityId = this.gameState?.currentCityId || gameState.currentCityId;
    const currentCity = this.gameState?.currentCity || gameState.currentCity;
    return locationsData.find(loc => loc.id === currentCityId || loc.city === currentCity) || null;
  }

  getDestinationsWithMustInclude() {
    const locationsData = this.getLocationsData();
    const currentCityId = this.gameState?.currentCityId || gameState.currentCityId || null;
    const maxDestinations = 5;
    let result = Array.isArray(this.gameState?.currentDestinations) ? [...this.gameState.currentDestinations] : [];
    result = result.filter(city => this.getCityId(city) && this.getCityId(city) !== currentCityId);

    const mustIncludeCityId = this.gameState?.mustIncludeCityId || null;
    if (mustIncludeCityId && mustIncludeCityId !== currentCityId && !result.some(city => this.getCityId(city) === mustIncludeCityId)) {
      const requiredCity = locationsData.find(loc => this.getCityId(loc) === mustIncludeCityId);
      if (requiredCity) result.unshift(requiredCity);
    } else if (mustIncludeCityId === currentCityId) {
      this.gameState.mustIncludeCityId = null;
    }

    const seen = new Set();
    result = result.filter(city => {
      const cityId = this.getCityId(city);
      if (!cityId || seen.has(cityId)) return false;
      seen.add(cityId);
      return true;
    });

    if (result.length < maxDestinations) {
      const filler = Phaser.Utils.Array.Shuffle(locationsData.filter(loc => {
        const locId = this.getCityId(loc);
        return loc?.city && locId && locId !== currentCityId && locId !== 'hq' && !seen.has(locId);
      }));
      for (const city of filler) {
        if (result.length >= maxDestinations) break;
        result.push(city);
        seen.add(this.getCityId(city));
      }
    }
    return result.slice(0, maxDestinations);
  }

  clearPins() {
    this.activePins.forEach(pinObj => pinObj?.destroy?.(true));
    this.activePins = [];
  }

  renderCityPins(citiesDataArray) {
    citiesDataArray.forEach(cityObj => {
      const xPos = cityObj.map?.x ?? cityObj.mapX ?? this.scene.scale.width / 2;
      const yPos = cityObj.map?.y ?? cityObj.mapY ?? this.scene.scale.height / 2;
      const pinContainer = this.scene.add.container(xPos, yPos);
      const dot = this.scene.add.circle(0, 0, 15, 0xffcc00).setStrokeStyle(4, 0x8b0000).setInteractive({ useHandCursor: true });
      const label = this.scene.add.text(0, 30, cityObj.city, { fontFamily: 'Special Elite', fontSize: '24px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 5, y: 5 } }).setOrigin(0.5);
      pinContainer.add([dot, label]);
      this.container.add(pinContainer);
      this.activePins.push(pinContainer);

      dot.on('pointerover', () => {
        if (!this.isTransitioning && this.selectedPin !== dot) {
          dot.setFillStyle(0xffffff);
          label.setColor('#ffcc00');
        }
      });
      dot.on('pointerout', () => {
        if (!this.isTransitioning && this.selectedPin !== dot) {
          dot.setFillStyle(0xffcc00);
          label.setColor('#ffffff');
        }
      });
      dot.on('pointerdown', () => {
        if (!this.isTransitioning) this.selectCity(cityObj, dot, label);
      });
    });
  }

  selectCity(cityObj, dot, label) {
    this.selectedCity = cityObj;
    if (this.selectedPin && this.selectedPin !== dot) {
      this.selectedPin.setFillStyle(0xffcc00);
      this.selectedPin.setScale(1);
    }
    if (this.selectedLabel && this.selectedLabel !== label) this.selectedLabel.setColor('#ffffff');
    this.selectedPin = dot;
    this.selectedLabel = label;
    dot.setFillStyle(0xffffff);
    dot.setScale(1.15);
    label.setColor('#ffcc00');

    const currentCityData = this.getCurrentCityData();
    const options = this.getTransportOptions(currentCityData, cityObj);
    this.selectedTransport = options[0] || null;
    this.createTransportButtons(options);
    this.refreshInfoPanel(cityObj);
    this.previewRoute(cityObj);
    this.setConfirmEnabled(Boolean(this.selectedTransport));
  }

  canTravelByLand(fromCity, toCity) {
    if (!fromCity || !toCity) return false;
    if (fromCity.country === toCity.country) return true;
    const region = fromCity.travelRegion;
    if (region !== toCity.travelRegion) return false;
    return region === 'europe' || region === 'north_america';
  }

  getMapDistance(fromCity, toCity) {
    if (!fromCity?.map || !toCity?.map) return 250;
    return Phaser.Math.Distance.Between(fromCity.map.x, fromCity.map.y, toCity.map.x, toCity.map.y);
  }

  buildTransportOption(transportType, fromCity, toCity) {
    const config = TRANSPORT_CONFIG[transportType];
    const distance = this.getMapDistance(fromCity, toCity);
    const hours = Math.max(config.minHours, Math.round(config.minHours + distance * config.hoursPerMapPixel));
    const cost = Math.round(config.baseCost + hours * config.costPerHour);
    const energyChange = -Math.max(2, Math.round(hours * config.energyPerHour));
    return { ...config, travelHours: hours, baseTravelHours: hours, moneySpent: cost, energyChange };
  }

  getTransportOptions(fromCity, toCity) {
    if (!fromCity || !toCity) return [];
    const options = [];
    if (fromCity.airport && toCity.airport) options.push(this.buildTransportOption('plane', fromCity, toCity));
    if (fromCity.trainStation && toCity.trainStation && this.canTravelByLand(fromCity, toCity)) options.push(this.buildTransportOption('train', fromCity, toCity));
    if (fromCity.busStation && toCity.busStation && this.canTravelByLand(fromCity, toCity)) options.push(this.buildTransportOption('bus', fromCity, toCity));
    if (fromCity.harbor && toCity.harbor) options.push(this.buildTransportOption('ship', fromCity, toCity));
    return options;
  }

  clearTransportButtons() {
    this.transportButtons.forEach(button => button?.destroy?.(true));
    this.transportButtons = [];
  }

  createTransportButtons(options) {
    this.clearTransportButtons();
    if (!options.length) return;
    this.transportPrompt.setText('Choose transport:');
    const totalWidth = 320;
    const buttonWidth = Math.min(76, Math.floor(totalWidth / options.length) - 8);
    const startX = 20 + buttonWidth / 2;
    options.forEach((option, index) => {
      const x = startX + index * (buttonWidth + 8);
      const selected = option.id === this.selectedTransport?.id;
      const container = this.scene.add.container(x, 164);
      const bg = this.scene.add.rectangle(0, 0, buttonWidth, 48, selected ? option.color : 0x273746, selected ? 0.95 : 1).setStrokeStyle(2, selected ? 0xffffff : option.color).setInteractive({ useHandCursor: true });
      const icon = this.scene.add.text(0, -9, option.icon, { fontFamily: 'Special Elite', fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
      const label = this.scene.add.text(0, 14, option.label, { fontFamily: 'Special Elite', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      container.add([bg, icon, label]);
      bg.on('pointerdown', () => {
        if (this.isTransitioning) return;
        this.selectedTransport = option;
        this.createTransportButtons(options);
        this.refreshInfoPanel(this.selectedCity);
        this.setConfirmEnabled(true);
      });
      this.infoPanel.add(container);
      this.transportButtons.push(container);
    });
  }

  getTravelPreview(cityObj) {
    const currentCityData = this.getCurrentCityData();
    const transport = this.selectedTransport;
    if (!currentCityData || !cityObj || !transport) return { fromCity: currentCityData?.city || '', toCity: cityObj?.city || '', travelHours: null, baseTravelHours: null };
    return { fromCity: currentCityData.city, toCity: cityObj.city, travelHours: transport.travelHours, baseTravelHours: transport.baseTravelHours, moneySpent: transport.moneySpent, energyChange: transport.energyChange };
  }

  refreshInfoPanel(cityObj = null) {
    if (!cityObj) {
      this.infoCity.setText('Choose a city on the map.');
      this.infoCountry.setText('');
      this.transportPrompt.setText('');
      this.infoTravel.setText('');
      this.infoHours.setText('');
      if (this.confirmLabel) this.confirmLabel.setText('Choose transport');
      return;
    }
    const preview = this.getTravelPreview(cityObj);
    this.infoCity.setText(cityObj.city || 'Unknown city');
    this.infoCountry.setText(cityObj.country || '');
    if (!this.selectedTransport) {
      this.transportPrompt.setText('No sensible route is available.');
      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.confirmLabel.setText('No route available');
      return;
    }
    this.transportPrompt.setText(`Selected: ${this.selectedTransport.icon} ${this.selectedTransport.label}`);
    this.infoTravel.setText(`Cost: £${preview.moneySpent}     Energy: ${preview.energyChange}`);
    this.infoHours.setText(`Travel time: +${preview.travelHours}h`);
    this.confirmLabel.setText(`Go by ${this.selectedTransport.label}`);
  }

  previewRoute(cityObj) {
    if (this.routePreview) this.routePreview.destroy();
    const currentCityData = this.getCurrentCityData();
    if (!currentCityData?.map || !cityObj?.map) return;
    const color = this.selectedTransport?.color || 0xffe066;
    this.routePreview = this.scene.add.graphics();
    this.routePreview.lineStyle(4, color, 0.95);
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
    this.scene.disableHotspots?.();
    this.scene.hotspots?.forEach?.(hotspot => hotspot?.disableInteractive?.());
  }

  cleanupBeforeTravel() {
    this.scene.closeAllUIPanels?.();
    this.disableHotspots();
    const sceneManager = this.scene.scene;
    if (sceneManager.isActive('PlayerHudScene') || sceneManager.isSleeping('PlayerHudScene')) {
      sceneManager.get('PlayerHudScene')?.closeAllUIPanels?.();
    }
  }

  travelToCity(selectedCity, selectedTransport) {
    if (this.isTransitioning || !selectedCity || !selectedTransport) return;
    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    const locationsData = this.getLocationsData();
    const selectedCityData = locationsData.find(loc => loc.id === this.getCityId(selectedCity));
    if (!selectedCityData) {
      console.error('City data not found:', selectedCity);
      this.isTransitioning = false;
      this.setConfirmEnabled(true);
      return;
    }

    try {
      const result = performTravel(selectedCityData.city, locationsData, selectedTransport.id);
      if (!result) throw new Error('performTravel returned no result.');
      const travelHours = selectedTransport.travelHours;
      const baseTravelHours = selectedTransport.baseTravelHours;
      EventBus.emit('advanceTime', travelHours, 0);

      gameState.lastTravel = {
        fromCityId: this.gameState?.currentCityId || gameState.currentCityId || null,
        toCityId: selectedCityData.id,
        transportType: selectedTransport.id,
        transportLabel: selectedTransport.label,
        travelHours,
        baseTravelHours,
        moneySpent: selectedTransport.moneySpent,
        energyChange: selectedTransport.energyChange,
        travelEncounter: result.travelEncounter || null,
        wasCorrect: Boolean(result.wasCorrect)
      };
      saveGameState();

      const transitionPayload = {
        fromCity: result.fromCity,
        toCity: result.toCity,
        toCityId: selectedCityData.id,
        cityId: selectedCityData.id,
        transportType: selectedTransport.id,
        transportLabel: selectedTransport.label,
        travelHours,
        baseTravelHours,
        moneySpent: selectedTransport.moneySpent,
        energyChange: selectedTransport.energyChange,
        travelEncounter: result.travelEncounter || null,
        wasCorrect: result.wasCorrect,
        status: result.status,
        isCrimeSceneArrival: result.isCrimeSceneArrival || false,
        pendingPhoneCall: Boolean(gameState.pendingPhoneCall),
        pendingPhoneCallCityId: gameState.pendingPhoneCallCityId || selectedCityData.id
      };

      const sceneManager = this.scene.scene;
      this.cleanupBeforeTravel();
      this.close();
      if (sceneManager.isActive('OfficeScene') || sceneManager.isSleeping('OfficeScene')) sceneManager.stop('OfficeScene');
      if (sceneManager.isActive('CityScene') || sceneManager.isSleeping('CityScene')) sceneManager.stop('CityScene');
      sceneManager.start('TravelTransitionScene', transitionPayload);
    } catch (error) {
      console.error('Travel failed:', error);
      this.isTransitioning = false;
      this.setConfirmEnabled(true);
    }
  }

  destroy() {
    EventBus.emit('showHUD');
    this.clearPins();
    this.clearTransportButtons();
    if (this.routePreview) this.routePreview.destroy();
    this.closeBtn?.off('pointerdown', this.close, this);
    this.confirmButton?.removeAllListeners();
    this.overlay?.removeAllListeners();
    this.scene?.input?.keyboard?.off('keydown-T', this.boundTravelKeyHandler);
    this.container?.destroy(true);
    this.activePins = [];
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