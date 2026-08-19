import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { travelToCity as performTravel } from '../gameSetup.js';
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from '../MoneyManager.js';

const TRANSPORT_CONFIG = {
  plane: {
    id: 'plane',
    icon: '✈',
    label: 'Plane',
    color: 0xd9c27a,
    minHours: 2,
    hoursPerMapPixel: 0.012,
    baseCost: 130,
    costPerHour: 35,
    energyPerHour: 0.7
  },
  train: {
    id: 'train',
    icon: '🚆',
    label: 'Train',
    color: 0x8fd3ff,
    minHours: 3,
    hoursPerMapPixel: 0.045,
    baseCost: 35,
    costPerHour: 15,
    energyPerHour: 1.15
  },
  bus: {
    id: 'bus',
    icon: '🚌',
    label: 'Bus',
    color: 0xffb347,
    minHours: 4,
    hoursPerMapPixel: 0.06,
    baseCost: 18,
    costPerHour: 9,
    energyPerHour: 1.7
  },
  ship: {
    id: 'ship',
    icon: '🚢',
    label: 'Ship',
    color: 0x62b6cb,
    minHours: 6,
    hoursPerMapPixel: 0.03,
    baseCost: 45,
    costPerHour: 12,
    energyPerHour: 1.25
  }
};

const ROUTE_LINE_COLOR = 0xff4f81;
const ROUTE_SHADOW_COLOR = 0x280812;

export class DestinationsUI {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this.isTransitioning = false;
    this.canConfirm = false;
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
        fontFamily: 'Special Elite',
        fontSize: '55px',
        color: '#fbff00'
      })
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', this.close, this);
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
    this.scene.input.keyboard.on(
      'keydown-T',
      this.boundTravelKeyHandler
    );
  }

  onTravelKeyDown(event) {
    const activeTag = document.activeElement?.tagName;
    const isTyping =
      activeTag === 'INPUT' ||
      activeTag === 'TEXTAREA' ||
      document.activeElement?.isContentEditable;

    if (isTyping || this.isTransitioning) return;

    event.preventDefault();

    if (this.isOpen) this.close();
    else this.open(gameState);
  }

  createInfoPanel(width, height) {
    this.infoPanel = this.scene.add.container(
      width - 405,
      height - 430
    );

    const bg = this.scene.add
      .rectangle(0, 0, 380, 415, 0x101820, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37);

    this.infoTitle = this.scene.add.text(20, 16, 'Travel dossier', {
      fontFamily: 'Special Elite',
      fontSize: '27px',
      color: '#f4e7c1'
    });

    this.infoCity = this.scene.add.text(20, 58, '', {
      fontFamily: 'Special Elite',
      fontSize: '23px',
      color: '#ffffff'
    });

    this.infoCountry = this.scene.add.text(20, 61, '', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#c6d7e5'
    });

    this.transportPrompt = this.scene.add.text(20, 98, '', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#ffd166',
      wordWrap: {
        width: 335,
        useAdvancedWrap: true
      }
    });

    this.infoTravel = this.scene.add.text(20, 210, '', {
      fontFamily: 'Special Elite',
      fontSize: '18px',
      color: '#d6e4f0',
      wordWrap: {
        width: 340,
        useAdvancedWrap: true
      }
    });

    this.infoHours = this.scene.add.text(20, 258, '', {
      fontFamily: 'Special Elite',
      fontSize: '19px',
      color: '#ffd166'
    });

    this.confirmButton = this.scene.add
      .rectangle(190, 315, 245, 44, 0x6c757d, 1)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, 0xf1f1f1)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = this.scene.add
      .text(190, 337, 'Choose a city', {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.confirmButton.on('pointerdown', () => {
      if (
        !this.canConfirm ||
        !this.selectedCity ||
        !this.selectedTransport ||
        this.isTransitioning
      ) {
        return;
      }

      this.travelToCity(
        this.selectedCity,
        this.selectedTransport
      );
    });

    this.infoPanel.add([
      bg,
      this.infoTitle,
      this.infoCity,
      this.infoCountry,
      this.transportPrompt,
      this.infoTravel,
      this.infoHours,
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
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#fff2f6'
      })
      .setOrigin(0.5);

    this.hqButton.add([
      this.hqButtonBg,
      this.hqButtonLabel
    ]);

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
    if (!this.hqButton || !this.hqButtonBg || !this.hqButtonLabel) {
      return;
    }

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
    const headquarters = locationsData.find(
      location => location.id === 'hq'
    );

    if (!headquarters) {
      console.error('HQ location was not found in locations.json.');
      return;
    }

    if (this.isAtHQ()) return;

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

    const currentCityData = this.getCurrentCityData();
    const options = this.getTransportOptions(
      currentCityData,
      headquarters
    );

    this.selectedTransport = options[0] || null;
    this.createTransportButtons(options);
    this.refreshInfoPanel(headquarters);
    this.previewRoute(headquarters);
    this.setConfirmEnabled(Boolean(this.selectedTransport));
  }

  open(gameStateData) {
    if (this.isTransitioning || this.isOpen) return;

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
      London: 'london',
      Paris: 'paris',
      'New Delhi': 'new_delhi',
      Warsaw: 'warsaw',
      'New York City': 'new_york_city',
      Berlin: 'berlin',
      Toronto: 'toronto',
      Kotto: 'kotto',
      Islamabad: 'islamabad',
      Nairobi: 'nairobi',
      Tokyo: 'tokyo',
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

    const currentCityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId;

    const currentCity =
      this.gameState?.currentCity ||
      gameState.currentCity;

    return locationsData.find(
      location =>
        location.id === currentCityId ||
        location.city === currentCity
    ) || null;
  }

  getDestinationsWithMustInclude() {
    const locationsData = this.getLocationsData();

    const currentCityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const maxDestinations = 5;

    let result = Array.isArray(this.gameState?.currentDestinations)
      ? [...this.gameState.currentDestinations]
      : [];

    result = result.filter(city => {
      const cityId = this.getCityId(city);
      return cityId && cityId !== currentCityId;
    });

    const mustIncludeCityId =
      this.gameState?.mustIncludeCityId ||
      null;

    const alreadyContainsRequiredCity = result.some(
      city => this.getCityId(city) === mustIncludeCityId
    );

    if (
      mustIncludeCityId &&
      mustIncludeCityId !== currentCityId &&
      !alreadyContainsRequiredCity
    ) {
      const requiredCity = locationsData.find(
        location => this.getCityId(location) === mustIncludeCityId
      );

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
      const filler = Phaser.Utils.Array.Shuffle(
        locationsData.filter(location => {
          const locationId = this.getCityId(location);

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
        seen.add(this.getCityId(city));
      }
    }

    return result.slice(0, maxDestinations);
  }

  clearPins() {
    this.activePins.forEach(pinObject => {
      pinObject?.destroy?.(true);
    });

    this.activePins = [];
  }

  renderCityPins(citiesDataArray) {
    citiesDataArray.forEach(cityObj => {
      const xPos =
        cityObj.map?.x ??
        cityObj.mapX ??
        this.scene.scale.width / 2;

      const yPos =
        cityObj.map?.y ??
        cityObj.mapY ??
        this.scene.scale.height / 2;

      const pinContainer = this.scene.add.container(xPos, yPos);

      const dot = this.scene.add
        .circle(0, 0, 15, 0xffcc00)
        .setStrokeStyle(4, 0x8b0000)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, 30, cityObj.city, {
          fontFamily: 'Special Elite',
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

    const currentCityData = this.getCurrentCityData();
    const options = this.getTransportOptions(
      currentCityData,
      cityObj
    );

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

    return Phaser.Math.Distance.Between(
      fromCity.map.x,
      fromCity.map.y,
      toCity.map.x,
      toCity.map.y
    );
  }

  buildTransportOption(transportType, fromCity, toCity) {
    const config = TRANSPORT_CONFIG[transportType];
    const distance = this.getMapDistance(fromCity, toCity);

    const hours = Math.max(
      config.minHours,
      Math.round(
        config.minHours +
        distance * config.hoursPerMapPixel
      )
    );

    const cost = Math.round(
      config.baseCost +
      hours * config.costPerHour
    );

    const energyChange = -Math.max(
      2,
      Math.round(hours * config.energyPerHour)
    );

    return {
      ...config,
      travelHours: hours,
      baseTravelHours: hours,
      moneySpent: cost,
      energyChange
    };
  }

  getTransportOptions(fromCity, toCity) {
    if (!fromCity || !toCity) return [];

    const options = [];

    if (fromCity.airport && toCity.airport) {
      options.push(
        this.buildTransportOption('plane', fromCity, toCity)
      );
    }

    if (
      fromCity.trainStation &&
      toCity.trainStation &&
      this.canTravelByLand(fromCity, toCity)
    ) {
      options.push(
        this.buildTransportOption('train', fromCity, toCity)
      );
    }

    if (
      fromCity.busStation &&
      toCity.busStation &&
      this.canTravelByLand(fromCity, toCity)
    ) {
      options.push(
        this.buildTransportOption('bus', fromCity, toCity)
      );
    }

    if (fromCity.harbor && toCity.harbor) {
      options.push(
        this.buildTransportOption('ship', fromCity, toCity)
      );
    }

    return options;
  }

  clearTransportButtons() {
    this.transportButtons.forEach(button => {
      button?.destroy?.(true);
    });

    this.transportButtons = [];
  }

  createTransportButtons(options) {
    this.clearTransportButtons();

    if (options.length <= 1) return;

    const totalWidth = 330;
    const gap = 8;

    const buttonWidth = Math.min(
      82,
      Math.floor(
        (totalWidth - gap * (options.length - 1)) /
        options.length
      )
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
        .setStrokeStyle(
          2,
          isSelected ? 0xffffff : option.color
        )
        .setInteractive({ useHandCursor: true });

      const icon = this.scene.add
        .text(0, -9, option.icon, {
          fontFamily: 'Special Elite',
          fontSize: '21px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      const label = this.scene.add
        .text(0, 14, option.label, {
          fontFamily: 'Special Elite',
          fontSize: '13px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      container.add([bg, icon, label]);

      bg.on('pointerdown', () => {
        if (this.isTransitioning) return;

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
    if (!cityObj) {
      this.infoCity.setText('Choose a city');
      this.infoCountry.setText('');
      this.infoCountry.setPosition(20, 61);
      this.transportPrompt.setColor('#ffd166');
      this.transportPrompt.setText('');
      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.confirmLabel.setText('Choose a city');
      return;
    }

    const preview = this.getTravelPreview(cityObj);

    this.infoCity.setText(cityObj.city || 'Unknown city');

    const countryText = cityObj.country
      ? `· ${cityObj.country}`
      : '';

    this.infoCountry.setText(countryText);
    this.infoCountry.setPosition(28 + this.infoCity.width, 61);

    if (!this.selectedTransport) {
      this.transportPrompt.setColor('#ff6b6b');
      this.transportPrompt.setText('No sensible route is available.');
      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.confirmLabel.setText('No route available');
      this.setConfirmEnabled(false);
      return;
    }

    const agencyBudget = this.getAvailableAgencyBudget();
    const canAfford = this.canAffordTravel(preview.moneySpent);

    this.transportPrompt.setColor(
      canAfford ? '#ffd166' : '#ff6b6b'
    );

    this.transportPrompt.setText(
      `Selected: ${this.selectedTransport.icon} ${this.selectedTransport.label}`
    );

    this.infoTravel.setText(
      `🎟 ${this.formatMoney(preview.moneySpent)}   ` +
      `🏢 Agency: ${this.formatMoney(agencyBudget)}   ` +
      `⚡ ${preview.energyChange}`
    );

    this.infoHours.setText(
      `Travel time: +${preview.travelHours}h`
    );

    this.confirmLabel.setText(
      canAfford
        ? `Go by ${this.selectedTransport.label}`
        : 'Agency budget too low'
    );

    this.setConfirmEnabled(canAfford);
  }

  previewRoute(cityObj) {
    if (this.routePreview) {
      this.routePreview.destroy();
      this.routePreview = null;
    }

    const currentCityData = this.getCurrentCityData();

    if (!currentCityData?.map || !cityObj?.map) return;

    this.routePreview = this.scene.add.graphics();

    this.routePreview.lineStyle(
      9,
      ROUTE_SHADOW_COLOR,
      0.55
    );

    this.routePreview.beginPath();
    this.routePreview.moveTo(
      currentCityData.map.x,
      currentCityData.map.y
    );
    this.routePreview.lineTo(cityObj.map.x, cityObj.map.y);
    this.routePreview.strokePath();

    this.routePreview.lineStyle(
      4,
      ROUTE_LINE_COLOR,
      0.98
    );

    this.routePreview.beginPath();
    this.routePreview.moveTo(
      currentCityData.map.x,
      currentCityData.map.y
    );
    this.routePreview.lineTo(cityObj.map.x, cityObj.map.y);
    this.routePreview.strokePath();

    this.container.add(this.routePreview);
    this.container.moveAbove(this.routePreview, this.mapImage);
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

  formatMoney(amount) {
    const safeAmount = Math.max(
      0,
      Math.round(Number(amount) || 0)
    );

    return `$${safeAmount.toLocaleString('en-US')}`;
  }

  getAvailableAgencyBudget() {
    return Math.max(
      0,
      Math.floor(
        Number(
          moneyManager?.getBalance?.(MONEY_SOURCE.AGENCY) ??
          gameState.agencyBudget ??
          0
        )
      )
    );
  }

  canAffordTravel(cost) {
    const safeCost = Math.max(
      0,
      Math.round(Number(cost) || 0)
    );

    return this.getAvailableAgencyBudget() >= safeCost;
  }

  showTravelError(message) {
    this.transportPrompt.setColor('#ff6b6b');
    this.transportPrompt.setText(message);

    this.scene.time.delayedCall(2500, () => {
      if (!this.isOpen || !this.selectedTransport) return;
      this.refreshInfoPanel(this.selectedCity);
    });
  }

  chargeTravel(selectedCityData, selectedTransport) {
    const cost = Math.max(
      0,
      Math.round(Number(selectedTransport?.moneySpent) || 0)
    );

    if (!cost) return true;

    if (!this.canAffordTravel(cost)) {
      this.showTravelError(
        `Agency budget too low. Need ${this.formatMoney(cost)}.`
      );
      return false;
    }

    const payment = moneyManager.spend(cost, {
      source: MONEY_SOURCE.AGENCY,
      category: ECONOMY_CATEGORY.TRAVEL,
      description: `${selectedTransport.label} ticket to ${selectedCityData.city}`,
      metadata: {
        transportType: selectedTransport.id,
        destinationCityId: selectedCityData.id,
        destinationCity: selectedCityData.city
      }
    });

    if (!payment.ok) {
      this.showTravelError(
        `Ticket payment failed. Need ${this.formatMoney(cost)}.`
      );
      return false;
    }

    EventBus.emit('travelTicketPurchased', {
      cityId: selectedCityData.id,
      city: selectedCityData.city,
      transportType: selectedTransport.id,
      cost
    });

    return true;
  }

  disableHotspots() {
    this.scene.disableHotspots?.();

    this.scene.hotspots?.forEach(hotspot => {
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
      sceneManager
        .get('PlayerHudScene')
        ?.closeAllUIPanels?.();
    }
  }

  travelToCity(selectedCity, selectedTransport) {
    if (
      this.isTransitioning ||
      !selectedCity ||
      !selectedTransport
    ) {
      return;
    }

    const locationsData = this.getLocationsData();

    const selectedCityData = locationsData.find(
      location => location.id === this.getCityId(selectedCity)
    );

    if (!selectedCityData) {
      console.error('City data not found:', selectedCity);
      this.setConfirmEnabled(true);
      return;
    }

    if (!this.canAffordTravel(selectedTransport.moneySpent)) {
      this.showTravelError(
        `Agency budget too low. Need ${this.formatMoney(
          selectedTransport.moneySpent
        )}.`
      );

      this.refreshInfoPanel(this.selectedCity);
      return;
    }

    const fromCityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const fromCity =
      this.gameState?.currentCity ||
      gameState.currentCity ||
      null;

    this.isTransitioning = true;
    this.setConfirmEnabled(false);

    try {
      const wasCharged = this.chargeTravel(
        selectedCityData,
        selectedTransport
      );

      if (!wasCharged) {
        this.isTransitioning = false;
        this.refreshInfoPanel(this.selectedCity);
        return;
      }

      // gameSetup.travelToCity expects a transport TYPE STRING.
      // Correct values: 'plane', 'train', 'bus', 'ship'.
      const result = performTravel(
        selectedCityData.city,
        locationsData,
        selectedTransport.id
      );

      if (!result) {
        throw new Error('performTravel returned no result.');
      }

      const travelHours =
        Number(result.travelHours) ||
        Number(selectedTransport.travelHours) ||
        0;

      const baseTravelHours =
        Number(result.baseTravelHours) ||
        Number(selectedTransport.baseTravelHours) ||
        travelHours;

      const energyChange = Number.isFinite(Number(result.energyChange))
        ? Number(result.energyChange)
        : Number(selectedTransport.energyChange) || 0;

      const moneySpent = Number.isFinite(Number(result.moneySpent))
        ? Number(result.moneySpent)
        : Number(selectedTransport.moneySpent) || 0;

      // This is the real game-clock update. GameTimeManager listens to it.
      EventBus.emit('advanceTime', travelHours, 0);

      gameState.lastTravel = {
        fromCityId,
        fromCity,
        toCityId: selectedCityData.id,
        toCity: selectedCityData.city,
        transportType: selectedTransport.id,
        transportLabel: selectedTransport.label,
        travelHours,
        baseTravelHours,
        moneySpent,
        energyChange,
        travelEncounter: result.travelEncounter || null,
        wasCorrect: Boolean(result.wasCorrect)
      };

      saveGameState();

      EventBus.emit('firstCaseTravelStarted', {
        fromCityId,
        toCityId: selectedCityData.id,
        city: selectedCityData.city,
        transportType: selectedTransport.id,
        isCrimeSceneArrival: Boolean(result.isCrimeSceneArrival)
      });

      const mission = gameState.currentMission || {};

const missionCityId = this.normalizeCityId(
  gameState.crimeCityId ||
  mission.cityId ||
  mission.city ||
  null
);

      const selectedCityId = this.getCityId(selectedCityData);

      const isMissionCrimeCity =
        Boolean(selectedCityData.crimeCity) &&
        selectedCityId === missionCityId;

      const isCrimeSceneArrival =
        Boolean(result.isCrimeSceneArrival) ||
        isMissionCrimeCity;

      const destinationScene = isCrimeSceneArrival
        ? 'CrimeCityScene'
        : 'CityScene';

      const transitionPayload = {
        fromCity: result.fromCity || fromCity,
        toCity: result.toCity || selectedCityData.city,
        toCityId: selectedCityData.id,
        cityId: selectedCityData.id,

        destinationScene,
        isCrimeSceneArrival,

        transportType: selectedTransport.id,
        transportLabel: selectedTransport.label,
        travelHours,
        baseTravelHours,
        moneySpent,
        energyChange,

        travelEncounter: result.travelEncounter || null,
        wasCorrect: Boolean(result.wasCorrect),
        status: result.status,

        pendingPhoneCall: Boolean(gameState.pendingPhoneCall),

        pendingPhoneCallCityId:
          gameState.pendingPhoneCallCityId ||
          selectedCityData.id
      };

      const sceneManager = this.scene.scene;

      this.cleanupBeforeTravel();
      this.close();

      [
        'OfficeScene',
        'CityScene',
        'CrimeCityScene'
      ].forEach(sceneKey => {
        if (
          sceneManager.isActive(sceneKey) ||
          sceneManager.isSleeping(sceneKey)
        ) {
          sceneManager.stop(sceneKey);
        }
      });

      sceneManager.start(
        'TravelTransitionScene',
        transitionPayload
      );
    } catch (error) {
      console.error('Travel failed:', error);
      this.isTransitioning = false;
      this.refreshInfoPanel(this.selectedCity);
      this.setConfirmEnabled(true);
    }
  }

  destroy() {
    EventBus.emit('showHUD');

    this.clearPins();
    this.clearTransportButtons();

    if (this.routePreview) {
      this.routePreview.destroy();
      this.routePreview = null;
    }

    this.closeBtn?.off('pointerdown', this.close, this);
    this.confirmButton?.removeAllListeners();
    this.overlay?.removeAllListeners();
    this.hqButtonBg?.removeAllListeners();

    this.scene?.input?.keyboard?.off(
      'keydown-T',
      this.boundTravelKeyHandler
    );

    this.hqButton?.destroy(true);

    this.hqButton = null;
    this.hqButtonBg = null;
    this.hqButtonLabel = null;

    this.container?.destroy(true);

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