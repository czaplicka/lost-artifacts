// ui/DestinationsUI.js

import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';

import {
  travelToCity as performTravel
} from '../managers/TravelManager.js';

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

const OVERLAY_SCENES = new Set([
  'PlayerHudScene',
  'UIScene',
  'NewsHud',
  'LoadingOverlayScene'
]);

export class DestinationsUI {
  constructor(scene) {
    this.scene = scene;

    this.isOpen = false;
    this.isTransitioning = false;
    this.isDestroyed = false;
    this.canConfirm = false;

    this.gameState = null;

    this.activePins = [];
    this.transportButtons = [];

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedLabel = null;
    this.selectedTransport = null;

    this.routePreview = null;
    this.travelErrorTimer = null;

    // A committed journey must not be purchased again
    // if opening the transition screen fails.
    this.committedTravelPayload = null;

    this.hqButton = null;
    this.hqButtonBg = null;
    this.hqButtonLabel = null;

    this.officeButton = null;
    this.officeButtonBg = null;
    this.officeButtonLabel = null;

    this.newsVisibility = null;

    this.boundTravelKeyHandler =
      this.onTravelKeyDown.bind(this);

    this.boundShutdownHandler =
      this.destroy.bind(this);

    const { width, height } = scene.scale;

    this.container = scene.add
      .container(0, 0)
      .setDepth(1800)
      .setVisible(false);

    this.overlay = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setInteractive();

    this.overlay.on('pointerdown', () => {
      this.close();
    });

    this.container.add(this.overlay);

    this.mapImage = scene.add
      .image(width / 2, height / 2, 'mapbg')
      .setDisplaySize(width, height)
      .setInteractive();

    // The map blocks clicks from reaching the background overlay.
    this.container.add(this.mapImage);

    this.closeBtn = scene.add
      .text(width - 100, 75, 'X', {
        fontFamily: 'SpecialElite',
        fontSize: '48px',
        color: '#fbff00'
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.closeBtn.on('pointerdown', () => {
      this.close();
    });

    this.container.add(this.closeBtn);

    this.createInfoPanel(width, height);
    this.createHQButton();
    this.createOfficeButton();
    this.registerKeyboard();

    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdownHandler
    );
  }

  // ------------------------------------------------------------------
  // Scene helpers
  // ------------------------------------------------------------------

  getRegisteredScene(key) {
    return this.scene?.scene?.manager?.keys?.[key] || null;
  }

  getNavigationScene() {
  const owner = this.scene;
  const manager = owner?.scene?.manager;

  if (!owner?.sys || !manager) {
    console.error(
      '[DestinationsUI] Scene owner or scene manager is missing.'
    );

    return null;
  }

  const ownerKey = owner.sys.settings.key;

  const overlayKeys = new Set([
    'PlayerHudScene',
    'UIScene',
    'NewsHud',
    'LoadingOverlayScene'
  ]);

  const isGameplayScene = scene => {
    if (!scene?.sys) return false;

    const key = scene.sys.settings.key;

    return (
      !overlayKeys.has(key) &&
      (
        scene.sys.isActive() ||
        scene.sys.isPaused()
      )
    );
  };

  // A map owned directly by the office or another gameplay scene
  // must navigate from that scene.
  if (isGameplayScene(owner)) {
    return owner;
  }

  const hud = manager.keys['PlayerHudScene'];

  // PlayerHudScene already tracks the actual gameplay scene here.
  const preferredKeys = [
    owner.currentGameplaySceneKey,
    hud?.currentGameplaySceneKey,
    owner.registry.get('currentSceneKey')
  ];

  for (const key of new Set(preferredKeys.filter(Boolean))) {
    const candidate = manager.keys[key];

    if (isGameplayScene(candidate)) {
      console.log(
        '[DestinationsUI] Gameplay scene resolved:',
        key
      );

      return candidate;
    }
  }

  // Fallback only if exactly one gameplay scene remains.
  const candidates = manager
    .getScenes(true)
    .filter(isGameplayScene);

  if (candidates.length === 1) {
    return candidates[0];
  }

  console.error(
    '[DestinationsUI] Could not resolve gameplay scene.',
    {
      ownerScene: ownerKey,
      ownerGameplaySceneKey:
        owner.currentGameplaySceneKey,
      hudGameplaySceneKey:
        hud?.currentGameplaySceneKey,
      registrySceneKey:
        owner.registry.get('currentSceneKey'),
      candidates: candidates.map(scene => ({
        key: scene.sys.settings.key,
        active: scene.sys.isActive(),
        paused: scene.sys.isPaused()
      }))
    }
  );

  return null;
}

  // Kept for compatibility with earlier calls.
  getOfficeNavigationScene() {
    return this.getNavigationScene();
  }

  async ensureSceneRegistered(key) {
    const loader = this.scene?.game?.sceneLoader;

    if (loader) {
      await loader.ensure(key);
    }

    if (!this.getRegisteredScene(key)) {
      throw new Error(
        `${key} is not registered. Check sceneRegistry.js.`
      );
    }
  }

  async navigateFrom(sourceScene, targetKey, data) {
    if (!sourceScene?.sys) {
      throw new Error('The source scene is unavailable.');
    }

    if (typeof sourceScene.goto === 'function') {
      return sourceScene.goto(targetKey, data);
    }

    const loader = sourceScene.game?.sceneLoader;

    if (loader) {
      return loader.goto(sourceScene, targetKey, data);
    }

    if (!sourceScene.scene.manager.keys[targetKey]) {
      throw new Error(
        `Scene "${targetKey}" is not registered.`
      );
    }

    sourceScene.scene.start(targetKey, data);
    return true;
  }

  // ------------------------------------------------------------------
  // Keyboard
  // ------------------------------------------------------------------

  registerKeyboard() {
    const keyboard = this.scene?.input?.keyboard;

    if (!keyboard) return;

    keyboard.on(
      'keydown-T',
      this.boundTravelKeyHandler
    );
  }

  onTravelKeyDown(event) {
    const active = document.activeElement;

    if (
      active?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(active?.tagName) ||
      this.isTransitioning ||
      this.isDestroyed
    ) {
      return;
    }

    event.preventDefault();

    if (this.isOpen) {
      this.close();
    } else {
      this.open(gameState);
    }
  }

  // ------------------------------------------------------------------
  // Open / close
  // ------------------------------------------------------------------

  open(gameStateData = gameState) {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.isOpen
    ) {
      return false;
    }

    this.gameState = gameStateData || gameState;

    this.resetSelectionState();
    this.clearPins();
    this.refreshInfoPanel();

    this.isOpen = true;
    this.container.setVisible(true);

    EventBus.emit('hideHUD');

    const news = this.getRegisteredScene('NewsHud');

    if (news) {
      this.newsVisibility = {
        newspaper: news.newspaperButton?.visible !== false,
        tv: news.tvButton?.visible !== false
      };

      news.events?.emit('setNewspaperVisible', false);
      news.events?.emit('setTvVisible', false);
    }

    this.updateHQButton();
    this.updateOfficeButton();

    const destinations =
      this.getDestinationsWithMustInclude();

    this.renderCityPins(destinations);

    for (const object of [
      this.infoPanel,
      this.hqButton,
      this.officeButton,
      this.closeBtn
    ]) {
      if (object) {
        this.container.bringToTop(object);
      }
    }

    this.setConfirmEnabled(false);

    if (this.committedTravelPayload) {
      this.transportPrompt
        .setColor('#ff9d6b')
        .setText(
          'This journey was already processed, but the travel screen failed to open.'
        );

      this.confirmLabel.setText('Retry travel screen');
      this.confirmButton.setFillStyle(0xb57928, 1);
      this.confirmButton.setAlpha(1);
      this.confirmLabel.setAlpha(1);
    }

    return true;
  }

  close({ restoreHud = true } = {}) {
    if (!this.isOpen || this.isDestroyed) {
      return false;
    }

    // Do not interrupt an in-flight action with a normal close.
    if (this.isTransitioning && restoreHud) {
      return false;
    }

    this.isOpen = false;
    this.container.setVisible(false);

    this.clearPins();
    this.resetSelectionState();
    this.refreshInfoPanel();
    this.setConfirmEnabled(false);

    if (restoreHud) {
      EventBus.emit('showHUD');

      const news = this.getRegisteredScene('NewsHud');

      if (news && this.newsVisibility) {
        news.events?.emit(
          'setNewspaperVisible',
          this.newsVisibility.newspaper
        );

        news.events?.emit(
          'setTvVisible',
          this.newsVisibility.tv
        );
      }
    }

    this.newsVisibility = null;

    return true;
  }

  resetSelectionState() {
    this.clearTravelErrorTimer();

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedLabel = null;
    this.selectedTransport = null;
    this.canConfirm = false;

    this.clearTransportButtons();

    this.routePreview?.destroy();
    this.routePreview = null;
  }

  // ------------------------------------------------------------------
  // Travel information panel
  // ------------------------------------------------------------------

  createInfoPanel(width, height) {
    this.infoPanel = this.scene.add.container(
      width - 405,
      height - 430
    );

    const bg = this.scene.add
      .rectangle(0, 0, 380, 415, 0x101820, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, 0xd4af37)
      .setInteractive();

    const text = (x, y, value, size, color, wrap = 0) => {
      return this.scene.add.text(x, y, value, {
        fontFamily: 'SpecialElite',
        fontSize: `${size}px`,
        color,
        wordWrap: wrap
          ? { width: wrap, useAdvancedWrap: true }
          : undefined
      });
    };

    this.infoTitle = text(
      20, 16, 'Travel dossier', 27, '#f4e7c1'
    );

    this.infoCity = text(
      20, 58, '', 23, '#ffffff'
    );

    this.infoCountry = text(
      20, 86, '', 17, '#c6d7e5', 335
    );

    this.transportPrompt = text(
      20, 113, '', 17, '#ffd166', 335
    );

    this.infoTravel = text(
      20, 211, '', 17, '#d6e4f0', 340
    );

    this.infoHours = text(
      20, 257, '', 18, '#ffd166'
    );

    this.debtWarning = text(
      20, 282, '', 14, '#ff9d6b', 340
    );

    this.confirmButton = this.scene.add
      .rectangle(190, 350, 280, 44, 0x6c757d, 1)
      .setStrokeStyle(2, 0xf1f1f1)
      .setInteractive({ useHandCursor: true });

    this.confirmLabel = text(
      190, 350, 'Choose a city', 17, '#ffffff'
    ).setOrigin(0.5);

    this.confirmButton.on('pointerdown', () => {
      if (this.isDestroyed || this.isTransitioning) return;

      if (this.committedTravelPayload) {
        void this.retryCommittedTravel();
        return;
      }

      if (
        !this.canConfirm ||
        !this.selectedCity ||
        !this.selectedTransport
      ) {
        return;
      }

      void this.travelToCity(
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
      this.debtWarning,
      this.confirmButton,
      this.confirmLabel
    ]);

    this.container.add(this.infoPanel);
    this.setConfirmEnabled(false);
  }

  // ------------------------------------------------------------------
  // HQ
  // ------------------------------------------------------------------

  createHQButton() {
    this.hqButton = this.scene.add.container(150, 105);

    this.hqButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, 0x251926, 0.96)
      .setStrokeStyle(2, 0xff4f81)
      .setInteractive({ useHandCursor: true });

    this.hqButtonLabel = this.scene.add
      .text(0, 0, 'RETURN TO HQ', {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#fff2f6'
      })
      .setOrigin(0.5);

    this.hqButton.add([
      this.hqButtonBg,
      this.hqButtonLabel
    ]);

    this.hqButtonBg.on('pointerover', () => {
      if (
        this.isTransitioning ||
        this.isAtHQ() ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.hqButtonBg.setFillStyle(0x5a1c38, 1);
    });

    this.hqButtonBg.on('pointerout', () => {
      this.updateHQButton();
    });

    this.hqButtonBg.on('pointerdown', () => {
      if (
        this.isTransitioning ||
        this.isAtHQ() ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.selectHeadquarters();
    });

    this.container.add(this.hqButton);
  }

  isAtHQ() {
    return (
      this.gameState?.currentCityId ||
      gameState.currentCityId
    ) === 'hq';
  }

  updateHQButton() {
    if (!this.hqButtonBg) return;

    const blocked =
      this.isAtHQ() ||
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.hqButton.setVisible(true);
    this.hqButton.setAlpha(blocked ? 0.6 : 1);

    this.hqButtonBg.setFillStyle(
      blocked ? 0x30343b : 0x251926,
      0.96
    );

    this.hqButtonBg.setStrokeStyle(
      2,
      blocked ? 0x777777 : 0xff4f81
    );

    this.hqButtonLabel
      .setText(
        this.isAtHQ() ? 'MARK AGENCY HQ' : 'RETURN TO HQ'
      )
      .setColor(blocked ? '#a5a5a5' : '#fff2f6');

    if (blocked) {
      this.hqButtonBg.disableInteractive();
    } else {
      this.hqButtonBg.setInteractive({
        useHandCursor: true
      });
    }
  }

  selectHeadquarters() {
    if (
      this.isAtHQ() ||
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return;
    }

    const headquarters = this.getLocationsData().find(
      location => getCityId(location) === 'hq'
    );

    if (!headquarters) {
      this.showTravelError(
        'Headquarters is missing from the location data.'
      );
      return;
    }

    this.selectCity(headquarters);
  }

  // ------------------------------------------------------------------
  // PI Office
  // ------------------------------------------------------------------

  createOfficeButton() {
    this.officeButton = this.scene.add.container(430, 105);

    this.officeButtonBg = this.scene.add
      .rectangle(0, 0, 220, 44, 0x1c2a1e, 0.96)
      .setStrokeStyle(2, 0x6fbf73)
      .setInteractive({ useHandCursor: true });

    this.officeButtonLabel = this.scene.add
      .text(0, 0, 'PI OFFICE', {
        fontFamily: 'SpecialElite',
        fontSize: '18px',
        color: '#eaf6ec'
      })
      .setOrigin(0.5);

    this.officeButton.add([
      this.officeButtonBg,
      this.officeButtonLabel
    ]);

    this.officeButtonBg.on('pointerover', () => {
      if (
        this.isTransitioning ||
        this.committedTravelPayload
      ) {
        return;
      }

      this.officeButtonBg.setFillStyle(0x2c4a30, 1);
      this.officeButtonLabel.setColor('#c9f2cf');
    });

    this.officeButtonBg.on('pointerout', () => {
      this.updateOfficeButton();
    });

    this.officeButtonBg.on(
      'pointerdown',
      (_pointer, _x, _y, event) => {
        event?.stopPropagation();

        console.log('[DestinationsUI] PI OFFICE clicked', {
          ownerScene: this.scene.sys.settings.key,
          currentCityId: gameState.currentCityId
        });

        void this.enterOffice();
      }
    );

    this.container.add(this.officeButton);
  }

  updateOfficeButton() {
    if (!this.officeButtonBg) return;

    const blocked =
      this.isTransitioning ||
      Boolean(this.committedTravelPayload);

    this.officeButton
      .setVisible(true)
      .setAlpha(blocked ? 0.6 : 1);

    this.officeButtonBg.setFillStyle(0x1c2a1e, 0.96);
    this.officeButtonLabel.setColor('#eaf6ec');

    if (blocked) {
      this.officeButtonBg.disableInteractive();
    } else {
      this.officeButtonBg.setInteractive({
        useHandCursor: true
      });
    }
  }

  async enterOffice() {
    if (
      this.isTransitioning ||
      this.isDestroyed ||
      this.committedTravelPayload
    ) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    const targetKey = 'DetectiveOfficeScene';

    if (source.sys.settings.key === targetKey) {
      this.close();
      return true;
    }

    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();

    try {
      await this.ensureSceneRegistered(targetKey);

      if (this.isDestroyed) return false;

      this.close({ restoreHud: false });

      const opened = await this.navigateFrom(
        source,
        targetKey,
        {
          entrySource: 'destinations',
          fromDestinations: true,
          fromScene: source.sys.settings.key
        }
      );

      if (opened === false) {
        throw new Error('PI office transition returned false.');
      }

      return true;
    } catch (error) {
      console.error(
        '[DestinationsUI] Failed to enter PI office:',
        error
      );

      if (
        !this.isDestroyed &&
        this.scene?.sys?.isActive()
      ) {
        this.isTransitioning = false;

        if (!this.isOpen) {
          this.open(this.gameState || gameState);
        }

        this.showTravelError(
          'The PI office could not be opened. Check the console.'
        );
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
      }
    }
  }

  // ------------------------------------------------------------------
  // Location data
  // ------------------------------------------------------------------

  getLocationsData() {
    const data =
      this.scene.cache.json.get('locations') || [];

    if (Array.isArray(data)) return data;

    return Array.isArray(data.locations)
      ? data.locations
      : [];
  }

  getCurrentCityData() {
    const locations = this.getLocationsData();

    const cityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId;

    const cityName =
      this.gameState?.currentCity ||
      gameState.currentCity;

    return (
      locations.find(
        location => getCityId(location) === cityId
      ) ||
      locations.find(
        location => location.city === cityName
      ) ||
      null
    );
  }

  getDestinationsWithMustInclude() {
    const locations = this.getLocationsData();

    const currentId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const maxDestinations = 5;

    let result = Array.isArray(
      this.gameState?.currentDestinations
    )
      ? [...this.gameState.currentDestinations]
      : [];

    // Resolve entries against canonical location data.
    result = result
      .map(city => {
        const id = getCityId(city);

        return locations.find(
          location => getCityId(location) === id
        );
      })
      .filter(city => {
        const id = city ? getCityId(city) : null;
        return id && id !== currentId && id !== 'hq';
      });

    const requiredId =
      this.gameState?.mustIncludeCityId || null;

    if (requiredId && requiredId !== currentId) {
      const required = locations.find(
        location => getCityId(location) === requiredId
      );

      if (required) {
        result = [
          required,
          ...result.filter(
            city => getCityId(city) !== requiredId
          )
        ];
      }
    }

    const seen = new Set();

    result = result.filter(city => {
      const id = getCityId(city);

      if (!id || seen.has(id)) return false;

      seen.add(id);
      return true;
    });

    if (result.length < maxDestinations) {
      const filler = Phaser.Utils.Array.Shuffle(
        locations.filter(location => {
          const id = getCityId(location);

          return (
            location.city &&
            id &&
            id !== currentId &&
            id !== 'hq' &&
            !seen.has(id)
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

  // ------------------------------------------------------------------
  // Map pins
  // ------------------------------------------------------------------

  clearPins() {
    for (const object of this.activePins) {
      object?.destroy?.(true);
    }

    this.activePins = [];
  }

  renderCityPins(cities) {
    for (const city of cities) {
      const x =
        city.map?.x ??
        city.mapX ??
        this.scene.scale.width / 2;

      const y =
        city.map?.y ??
        city.mapY ??
        this.scene.scale.height / 2;

      const pin = this.scene.add.container(x, y);

      const dot = this.scene.add
        .circle(0, 0, 15, 0xffcc00)
        .setStrokeStyle(4, 0x8b0000)
        .setInteractive({ useHandCursor: true });

      const label = this.scene.add
        .text(0, 30, city.city || 'Unknown city', {
          fontFamily: 'SpecialElite',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 5, y: 5 }
        })
        .setOrigin(0.5);

      pin.add([dot, label]);

      this.container.add(pin);
      this.activePins.push(pin);

      dot.on('pointerover', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload ||
          this.selectedPin === dot
        ) {
          return;
        }

        dot.setFillStyle(0xffffff);
        label.setColor('#ffcc00');
      });

      dot.on('pointerout', () => {
        if (this.selectedPin === dot) return;

        dot.setFillStyle(0xffcc00);
        label.setColor('#ffffff');
      });

      dot.on('pointerdown', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.selectCity(city, dot, label);
      });
    }
  }

  selectCity(city, dot = null, label = null) {
    if (
      this.isTransitioning ||
      this.committedTravelPayload
    ) {
      return;
    }

    this.clearTravelErrorTimer();

    this.selectedPin?.setFillStyle(0xffcc00);
    this.selectedPin?.setScale(1);
    this.selectedLabel?.setColor('#ffffff');

    this.selectedCity = city;
    this.selectedPin = dot;
    this.selectedLabel = label;

    dot?.setFillStyle(0xffffff);
    dot?.setScale(1.15);
    label?.setColor('#ffcc00');

    const options = getTransportOptions(
      this.getCurrentCityData(),
      city
    ) || [];

    this.selectedTransport = options[0] || null;

    this.createTransportButtons(options);
    this.refreshInfoPanel(city);
    this.previewRoute(city);

    this.setConfirmEnabled(
      Boolean(this.selectedTransport)
    );
  }

  // ------------------------------------------------------------------
  // Transport
  // ------------------------------------------------------------------

  clearTransportButtons() {
    for (const button of this.transportButtons) {
      button?.destroy?.(true);
    }

    this.transportButtons = [];
  }

  createTransportButtons(options) {
    this.clearTransportButtons();

    if (options.length <= 1) return;

    const gap = 8;

    const buttonWidth = Math.min(
      82,
      Math.floor(
        (330 - gap * (options.length - 1)) /
        options.length
      )
    );

    options.forEach((option, index) => {
      const x =
        20 +
        buttonWidth / 2 +
        index * (buttonWidth + gap);

      const selected =
        option.id === this.selectedTransport?.id;

      const container =
        this.scene.add.container(x, 169);

      const bg = this.scene.add
        .rectangle(
          0, 0,
          buttonWidth, 48,
          selected ? option.color : 0x273746,
          1
        )
        .setStrokeStyle(
          2,
          selected ? 0xffffff : option.color
        )
        .setInteractive({ useHandCursor: true });

      const icon = this.scene.add
        .text(0, -9, option.icon || '', {
          fontFamily: 'SpecialElite',
          fontSize: '21px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      const label = this.scene.add
        .text(0, 14, option.label || option.id, {
          fontFamily: 'SpecialElite',
          fontSize: '13px',
          color: '#ffffff'
        })
        .setOrigin(0.5);

      container.add([bg, icon, label]);

      bg.on('pointerdown', () => {
        if (
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.clearTravelErrorTimer();
        this.selectedTransport = option;

        this.createTransportButtons(options);
        this.refreshInfoPanel(this.selectedCity);
        this.previewRoute(this.selectedCity);
      });

      this.infoPanel.add(container);
      this.transportButtons.push(container);
    });
  }

  getTravelPreview(city) {
    const transport = this.selectedTransport;

    return {
      fromCity: this.getCurrentCityData()?.city || '',
      toCity: city?.city || '',
      travelHours: transport?.travelHours ?? 0,
      baseTravelHours: transport?.baseTravelHours ?? 0,
      moneySpent: transport?.moneySpent ?? 0,
      energyChange: transport?.energyChange ?? 0
    };
  }

  refreshInfoPanel(city = null) {
    if (this.isDestroyed) return;

    if (!city) {
      this.infoCity.setText('Choose a city');
      this.infoCountry.setText('');
      this.transportPrompt
        .setColor('#ffd166')
        .setText('');

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText('Choose a city');
      return;
    }

    this.infoCity.setText(city.city || 'Unknown city');
    this.infoCountry.setText(city.country || '');

    if (!this.selectedTransport) {
      this.transportPrompt
        .setColor('#ff6b6b')
        .setText('No sensible route is available.');

      this.infoTravel.setText('');
      this.infoHours.setText('');
      this.debtWarning.setText('');
      this.confirmLabel.setText('No route available');

      this.setConfirmEnabled(false);
      return;
    }

    const preview = this.getTravelPreview(city);
    const budget = getAvailableAgencyBudget();

    const freeTransfers = Math.max(
      0,
      Number(gameState.freeTransfers) || 0
    );

    const cost = freeTransfers > 0
      ? 0
      : preview.moneySpent;

    const createsDebt =
      cost > 0 && wouldCreateDebt(cost);

    this.transportPrompt
      .setColor('#ffd166')
      .setText(
        `Selected: ${this.selectedTransport.icon || ''} ` +
        this.selectedTransport.label
      );

    this.infoTravel.setText(
      `Ticket: ${cost === 0 ? 'FREE' : formatMoney(cost)}\n` +
      `Agency: ${formatMoney(budget)} | Energy: ${preview.energyChange}`
    );

    this.infoHours.setText(
      `Travel time: +${preview.travelHours}h`
    );

    this.debtWarning.setText(
      freeTransfers > 0
        ? `Free transfers: ${freeTransfers}. This trip will use one.`
        : createsDebt
          ? 'Insufficient agency budget. The balance will become agency debt.'
          : ''
    );

    this.confirmLabel.setText(
      `Go by ${this.selectedTransport.label}`
    );

    this.setConfirmEnabled(true);
  }

  previewRoute(city) {
    this.routePreview?.destroy();
    this.routePreview = null;

    const current = this.getCurrentCityData();

    if (!current?.map || !city?.map) return;

    this.routePreview = this.scene.add.graphics();

    for (const [width, color, alpha] of [
      [9, ROUTE_SHADOW_COLOR, 0.55],
      [4, ROUTE_LINE_COLOR, 0.98]
    ]) {
      this.routePreview.lineStyle(width, color, alpha);
      this.routePreview.beginPath();
      this.routePreview.moveTo(
        current.map.x,
        current.map.y
      );
      this.routePreview.lineTo(
        city.map.x,
        city.map.y
      );
      this.routePreview.strokePath();
    }

    this.container.add(this.routePreview);

    this.container.moveAbove(
      this.routePreview,
      this.mapImage
    );
  }

  setConfirmEnabled(enabled) {
    this.canConfirm = Boolean(
      enabled &&
      !this.isTransitioning &&
      !this.isDestroyed &&
      !this.committedTravelPayload
    );

    if (!this.confirmButton || this.isDestroyed) return;

    this.confirmButton.setFillStyle(
      this.canConfirm ? 0x9b5de5 : 0x6c757d,
      1
    );

    const alpha = this.canConfirm ? 1 : 0.7;

    this.confirmButton.setAlpha(alpha);
    this.confirmLabel.setAlpha(alpha);
  }

  // ------------------------------------------------------------------
  // Errors
  // ------------------------------------------------------------------

  clearTravelErrorTimer() {
    this.travelErrorTimer?.remove(false);
    this.travelErrorTimer = null;
  }

  showTravelError(message) {
    if (this.isDestroyed) return;

    this.clearTravelErrorTimer();

    this.transportPrompt
      .setColor('#ff6b6b')
      .setText(message);

    this.travelErrorTimer =
      this.scene.time.delayedCall(3500, () => {
        this.travelErrorTimer = null;

        if (
          this.isDestroyed ||
          !this.isOpen ||
          this.isTransitioning ||
          this.committedTravelPayload
        ) {
          return;
        }

        this.refreshInfoPanel(this.selectedCity);
      });
  }

  // ------------------------------------------------------------------
  // Travel
  // ------------------------------------------------------------------

  cleanupBeforeTravel() {
    // Do not close all panels here: on some owners this would
    // close this map and trigger computer callbacks prematurely.
    const hud = this.getRegisteredScene('PlayerHudScene');

    hud?.closeAllUIPanels?.();
  }

  async travelToCity(selectedCity, selectedTransport) {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      this.committedTravelPayload ||
      !selectedCity ||
      !selectedTransport
    ) {
      return false;
    }

    const locations = this.getLocationsData();

    const destination = locations.find(
      location =>
        getCityId(location) === getCityId(selectedCity)
    );

    if (!destination) {
      this.showTravelError('Destination data is missing.');
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    const fromCityId =
      this.gameState?.currentCityId ||
      gameState.currentCityId ||
      null;

    const fromCity =
      this.gameState?.currentCity ||
      gameState.currentCity ||
      null;

    const transportId = selectedTransport.id;

    this.clearTravelErrorTimer();
    this.isTransitioning = true;
    this.setConfirmEnabled(false);
    this.updateHQButton();
    this.updateOfficeButton();

    let committed = false;

    try {
      // Catch missing transition registration before charging.
      await this.ensureSceneRegistered(
        'TravelTransitionScene'
      );

      if (this.isDestroyed) return false;

      const result = performTravel(
        destination.city,
        locations,
        transportId
      );

      if (!result) {
        throw new Error(
          'performTravel returned no result.'
        );
      }

      if (result.blocked) {
        this.isTransitioning = false;
        this.refreshInfoPanel(this.selectedCity);

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

        this.showTravelError(
          'You are already in this city.'
        );

        return false;
      }

      committed = true;

      const toCityId = getCityId(destination);

      const travelHours =
        Number(result.travelHours) || 0;

      const baseTravelHours =
        Number(result.baseTravelHours) || travelHours;

      const energyChange =
        Number(result.energyChange) || 0;

      const moneySpent =
        Number(result.moneySpent) || 0;

      const agencyDebtAdded =
        Number(result.agencyDebtAdded) || 0;

      const transportLabel =
        result.transportLabel ||
        selectedTransport.label;

      const mission = gameState.currentMission || {};

      const missionCityId = normalizeCityId(
        gameState.crimeCityId ||
        mission.cityId ||
        mission.city ||
        null
      );

      const isMissionCrimeCity = Boolean(
        (
          destination.isCrimeCity ||
          destination.crimeCity
        ) &&
        normalizeCityId(toCityId) === missionCityId
      );

      const isCrimeSceneArrival =
        Boolean(result.isCrimeSceneArrival) ||
        isMissionCrimeCity;

      const payload = {
        fromCity: result.fromCity || fromCity,
        toCity: result.toCity || destination.city,
        toCityId,
        cityId: toCityId,

        destinationScene: isCrimeSceneArrival
          ? 'CrimeCityScene'
          : 'CityScene',

        isCrimeSceneArrival,
        transportType: transportId,
        transportLabel,
        travelHours,
        baseTravelHours,
        moneySpent,
        agencyDebtAdded,
        energyChange,

        travelEncounter:
          result.travelEncounter || null,

        wasCorrect: Boolean(result.wasCorrect),
        status: result.status,

        pendingPhoneCall:
          Boolean(gameState.pendingPhoneCall),

        pendingPhoneCallCityId:
          gameState.pendingPhoneCallCityId ||
          toCityId
      };

      // Save before any subsequent UI operations.
      this.committedTravelPayload = payload;

      gameState.lastTravel = {
        ...(gameState.lastTravel || {}),
        fromCityId,
        fromCity,
        toCityId,
        toCity: destination.city,
        transportType: transportId,
        transportLabel,
        travelHours,
        baseTravelHours,
        moneySpent,
        agencyDebtAdded,
        energyChange,
        travelEncounter: payload.travelEncounter,
        wasCorrect: payload.wasCorrect
      };

      advanceCrimeTutorial(gameState, 'pursuit');

      if (!gameState.caseFailed) {
        requestAutosave();
      }

      EventBus.emit('travelTicketPurchased', {
        cityId: toCityId,
        city: destination.city,
        transportType: transportId,
        cost: moneySpent,
        agencyDebtAdded
      });

      EventBus.emit('firstCaseTravelStarted', {
        fromCityId,
        toCityId,
        city: destination.city,
        transportType: transportId,
        isCrimeSceneArrival
      });

      return await this.startTravelTransition(
        source,
        payload
      );
    } catch (error) {
      console.error('[DestinationsUI] Travel failed:', error, {
        committed,
        fromCityId,
        toCityId: getCityId(destination),
        transportType: transportId
      });

      if (
        this.isDestroyed ||
        !this.scene?.sys?.isActive()
      ) {
        return false;
      }

      this.isTransitioning = false;

      if (!this.isOpen) {
        this.open(this.gameState || gameState);
      }

      if (this.committedTravelPayload) {
        this.showCommittedTravelRecovery();
      } else {
        this.refreshInfoPanel(this.selectedCity);

        this.showTravelError(
          committed
            ? 'Travel was processed, but its transition data could not be prepared. Check the console before trying again.'
            : 'Travel failed. Check the console for details.'
        );

        if (committed) {
          this.setConfirmEnabled(false);
        }
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
        this.updateHQButton();
        this.updateOfficeButton();
      }
    }
  }

  async startTravelTransition(source, payload) {
    this.close({ restoreHud: false });

    const opened = await this.navigateFrom(
      source,
      'TravelTransitionScene',
      payload
    );

    if (opened === false) {
      throw new Error(
        'TravelTransitionScene could not be started.'
      );
    }

    if (!this.isDestroyed) {
      this.committedTravelPayload = null;
    }

    return true;
  }

  showCommittedTravelRecovery() {
    this.clearTravelErrorTimer();

    this.setConfirmEnabled(false);

    this.transportPrompt
      .setColor('#ff9d6b')
      .setText(
        'Travel was processed. Retry opening the travel screen without paying again.'
      );

    this.confirmLabel.setText('Retry travel screen');
    this.confirmButton.setFillStyle(0xb57928, 1);
    this.confirmButton.setAlpha(1);
    this.confirmLabel.setAlpha(1);

    this.updateHQButton();
    this.updateOfficeButton();
  }

  async retryCommittedTravel() {
    if (
      this.isDestroyed ||
      this.isTransitioning ||
      !this.committedTravelPayload
    ) {
      return false;
    }

    const source = this.getNavigationScene();

    if (!source) {
      this.showTravelError(
        'Could not determine the current location.'
      );
      return false;
    }

    this.isTransitioning = true;

    try {
      await this.ensureSceneRegistered(
        'TravelTransitionScene'
      );

      if (this.isDestroyed) return false;

      return await this.startTravelTransition(
        source,
        this.committedTravelPayload
      );
    } catch (error) {
      console.error(
        '[DestinationsUI] Travel transition retry failed:',
        error
      );

      if (
        !this.isDestroyed &&
        this.scene?.sys?.isActive()
      ) {
        this.isTransitioning = false;

        if (!this.isOpen) {
          this.open(this.gameState || gameState);
        }

        this.showCommittedTravelRecovery();
      }

      return false;
    } finally {
      if (!this.isDestroyed) {
        this.isTransitioning = false;
      }
    }
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  destroy() {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    this.clearTravelErrorTimer();

    this.scene?.input?.keyboard?.off(
      'keydown-T',
      this.boundTravelKeyHandler
    );

    this.scene?.events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundShutdownHandler
    );

    this.clearPins();
    this.clearTransportButtons();

    this.routePreview?.destroy();
    this.routePreview = null;

    this.container?.destroy(true);
    this.container = null;

    this.hqButton = null;
    this.hqButtonBg = null;
    this.hqButtonLabel = null;

    this.officeButton = null;
    this.officeButtonBg = null;
    this.officeButtonLabel = null;

    this.selectedCity = null;
    this.selectedPin = null;
    this.selectedLabel = null;
    this.selectedTransport = null;

    this.gameState = null;
    this.newsVisibility = null;
    this.committedTravelPayload = null;

    this.isOpen = false;
    this.isTransitioning = false;
    this.canConfirm = false;
  }
}