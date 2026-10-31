import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { OFFICE_CONFIG } from '../config/detectiveOfficeConfig.js';
import { createOfficeObjectDefinitions } from './pi-office/officeProps.js';

import {
  acceptPIQuestFromAdvert,
  getPIQuestStatus
} from '../managers/PIQuestManager.js';

import { PIOfficeComputerUI } from '../ui/PIOfficeComputerUI.js';
import { PIOfficePhoneUI } from '../ui/PIOfficePhoneUI.js';
import { PICrimeBoardUI } from '../ui/PICrimeBoardUI.js';
import { PIOfficeDestinationsUI } from '../ui/PIOfficeDestinationsUI.js';

const SCENE_KEY = 'DetectiveOfficeScene';

const HUD_LOCK_CLASS = 'pi-office-hide-gameplay-hud';
const HUD_LOCK_STYLE = 'pi-office-hud-lock-style';

const HIDDEN_OVERLAYS = [
  'PlayerHudScene',
  'UIScene',
  'NewsHud'
];

const DATA_FILES = [
  ['piOfficeMail', 'assets/data/piMail.json'],
  ['piOfficeClassifieds', 'assets/data/piClassifieds.json'],
  ['piPhoneDirectory', 'assets/data/piPhoneDirectory.json'],
  ['piPhoneDialogues', 'assets/data/piPhoneDialogues.json'],
  ['piCases', 'assets/data/piCases.json']
];

const PHONE_ART = [
  ['pi_phone_desk', 'assets/ui/pi-phone/desk.jpg'],
  ['pi_phone_base', 'assets/ui/pi-phone/base.webp'],
  ['pi_phone_handset', 'assets/ui/pi-phone/handset.webp'],
  ['pi_phone_dial', 'assets/ui/pi-phone/dial.webp']
];

export function officeHotspotBounds(
  config,
  sourceWidth,
  sourceHeight,
  width,
  height
) {
  const sx = width / Math.max(1, sourceWidth);
  const sy = height / Math.max(1, sourceHeight);

  return {
    x: config.x * sx,
    y: config.y * sy,
    w: config.w * sx,
    h: config.h * sy
  };
}

export class DetectiveOfficeScene extends BaseScene {
  constructor() {
    super({ key: SCENE_KEY });
  }

  init(data = {}) {
    this.gameState = gameState;
    this.entrySource = data.entrySource || 'destinations';

    this.citySceneKey =
      OFFICE_CONFIG.citySceneKey || 'HomeCityScene';

    this.hotspotDefs = createOfficeObjectDefinitions();
    this.hotspots = [];

    Object.assign(this, {
      debugMode: false,
      selectedIndex: 0,
      navigating: false,
      disposed: false,

      activeDevice: null,
      computerChild: null,
      childLoading: false,

      computerUI: null,
      phoneUI: null,
      piCrimeBoardUI: null,
      destinationsUI: null,

      officeBackground: null,
      officeTitle: null,
      debugText: null,

      feedback: null,
      feedbackTimer: null,

      hudLockOwned: false,
      interactionEnabled: null
    });

    this.runToken = Symbol('pi-office');
  }

  preload() {
    const backgroundKey =
      OFFICE_CONFIG.backgroundKey || 'pi_office_bg';

    const backgroundUrl =
      OFFICE_CONFIG.backgroundUrl ||
      'assets/local/pioffice.webp';

    if (!this.textures.exists(backgroundKey)) {
      this.load.image(backgroundKey, backgroundUrl);
    }

    for (const [key, url] of DATA_FILES) {
      if (!this.cache.json.exists(key)) {
        this.load.json(key, url);
      }
    }

    const images = [
      ...PHONE_ART,
      [
        'pi_computer_wallpaper',
        'assets/ui/pi-computer/wallpaper.png'
      ]
    ];

    for (const definition of this.hotspotDefs) {
      if (definition.textureKey && definition.textureUrl) {
        images.push([
          definition.textureKey,
          definition.textureUrl
        ]);
      }
    }

    const queued = new Set();

    for (const [key, url] of images) {
      if (queued.has(key) || this.textures.exists(key)) {
        continue;
      }

      queued.add(key);
      this.load.image(key, url);
    }
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    this.registry.set('currentSceneKey', SCENE_KEY);

    const backgroundKey =
      OFFICE_CONFIG.backgroundKey || 'pi_office_bg';

    if (this.textures.exists(backgroundKey)) {
      const source = this.textures
        .get(backgroundKey)
        .getSourceImage();

      this.officeSource = {
        width: source.width,
        height: source.height
      };

      this.officeBackground = this.add
        .image(width / 2, height / 2, backgroundKey)
        .setDisplaySize(width, height);
    } else {
      this.officeSource = { width, height };

      this.officeBackground = this.add
        .rectangle(0, 0, width, height, 0x25231e)
        .setOrigin(0);

      console.error(
        '[DetectiveOfficeScene] Background missing:',
        backgroundKey
      );
    }

    this.hideGameplayHud({ closePanels: true });

    this.hotspots = this.hotspotDefs.map(
      (config, index) => this.createHotspot(config, index)
    );

    this.officeTitle = this.add
      .text(
        16,
        16,
        OFFICE_CONFIG.officeLabel || 'PI OFFICE',
        this.style(14)
      )
      .setDepth(100);

    this.debugText = this.add
      .text(
        16,
        Math.max(100, height - 150),
        '',
        this.style(13)
      )
      .setDepth(400);

    this.createPanels();
    this.bindEvents();
    this.updateDebug();
  }

  style(size = 16) {
    return {
      fontFamily: 'SpecialElite, monospace',
      fontSize: `${size}px`,
      color: '#fff1ce',
      backgroundColor: '#191b16',
      padding: { x: 8, y: 6 }
    };
  }

  tooltipStyle() {
    return {
      fontFamily: 'PressStart2P, monospace',
      fontSize: '12px',
      color: '#fff1ce',
      backgroundColor: '#191b16',
      padding: { x: 10, y: 8 }
    };
  }

  isCurrent(token) {
    return Boolean(
      token === this.runToken &&
      !this.disposed &&
      !this._cleanupDone &&
      this.sys.isActive()
    );
  }

  canUseOffice() {
    return Boolean(
      !this.disposed &&
      !this._cleanupDone &&
      !this.navigating &&
      !this.activeDevice &&
      !this.computerChild &&
      !this.childLoading &&
      this.sys.isActive()
    );
  }

  lockHtmlHud() {
    if (!document.getElementById(HUD_LOCK_STYLE)) {
      const style = document.createElement('style');

      style.id = HUD_LOCK_STYLE;
      style.textContent = `
        html.${HUD_LOCK_CLASS} #hud-container {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `;

      document.head.appendChild(style);
    }

    document.documentElement.classList.add(HUD_LOCK_CLASS);
    this.hudLockOwned = true;
  }

  unlockHtmlHud() {
    if (!this.hudLockOwned) return;

    document.documentElement.classList.remove(HUD_LOCK_CLASS);
    this.hudLockOwned = false;
  }

  hideGameplayHud({ closePanels = false } = {}) {
    if (
      this.disposed ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.lockHtmlHud();

    if (closePanels) {
      this.getRegisteredScene('PlayerHudScene')
        ?.closeAllUIPanels?.();

      this.getRegisteredScene('NewsHud')
        ?.closeMenu?.(true);
    }

    this.getRegisteredScene('UIScene')?.hideHUD?.();

    this.getRegisteredScene('NewsHud')
      ?.setHudVisible?.(false);

    for (const key of HIDDEN_OVERLAYS) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }
  }

  enforceHiddenOverlays() {
    if (
      this.disposed ||
      this._cleanupDone ||
      !this.sys.isActive() ||
      this.registry.get('currentSceneKey') !== SCENE_KEY
    ) {
      return;
    }

    if (
      !document.documentElement.classList.contains(
        HUD_LOCK_CLASS
      )
    ) {
      this.lockHtmlHud();
    }

    for (const key of HIDDEN_OVERLAYS) {
      const overlay = this.getRegisteredScene(key);

      if (overlay?.sys?.settings?.visible) {
        this.scene.setVisible(false, key);
      }
    }
  }

  createPanels() {
    this.computerUI = new PIOfficeComputerUI(this, {
      wallpaperKey: 'pi_computer_wallpaper',

      onOpen: () => this.deviceOpened('computer'),
      onClose: () => this.deviceClosed('computer'),

      onOpenInvestigations: () => this.openInvestigations(),
      onOpenWorldTravel: () => this.openWorldTravel(),

      onAcceptMission: advert =>
        acceptPIQuestFromAdvert(this, advert.id),

      getMissionStatus: id => getPIQuestStatus(id)
    });

    this.phoneUI = new PIOfficePhoneUI(this, {
      onOpen: () => this.deviceOpened('phone'),
      onClose: () => this.deviceClosed('phone')
    });

    this.piCrimeBoardUI = new PICrimeBoardUI(this, {
      onOpen: () => {
        this.computerChild = 'crimeboard';
      },

      onClose: () => this.returnToComputer()
    });

    this.destinationsUI = new PIOfficeDestinationsUI(this, {
      onClose: ({ returnToComputer }) => {
        if (returnToComputer) {
          this.returnToComputer();
        }
      }
    });
  }

  bindEvents() {
    this.keyHandler = event => this.onKey(event);

    this.input.keyboard?.on('keydown', this.keyHandler);

    this.onResume = () => {
      if (this.disposed || this._cleanupDone) return;

      this.registry.set('currentSceneKey', SCENE_KEY);
      this.hideGameplayHud();
      this.refreshInteractions();
    };

    this.onOfficeSleep = () => this.unlockHtmlHud();
    this.onOfficeResize = () => this.layoutOffice();

    this.events.on('resume', this.onResume);
    this.events.on('wake', this.onResume);
    this.events.on('sleep', this.onOfficeSleep);

    this.scale.on('resize', this.onOfficeResize);

    this.events.once('shutdown', this.cleanupOffice, this);
    this.events.once('destroy', this.cleanupOffice, this);
  }

  layoutOffice() {
    if (this.disposed) return;

    const { width, height } = this.scale;

    this.officeBackground?.setDisplaySize(width, height);

    if (this.officeBackground?.type === 'Image') {
      this.officeBackground.setPosition(
        width / 2,
        height / 2
      );
    }

    for (const hotspot of this.hotspots) {
      this.syncHotspot(hotspot);
    }

    this.officeTitle?.setPosition(16, 16);

    this.debugText?.setPosition(
      16,
      Math.max(100, height - 150)
    );
  }

  openComputer() {
    if (this.canUseOffice() && !this.debugMode) {
      this.computerUI.open();
    }
  }

  openPhone() {
    if (this.canUseOffice() && !this.debugMode) {
      this.phoneUI.open();
    }
  }

  deviceOpened(type) {
    if (this.disposed) return;

    this.activeDevice = type;
    this.computerChild = null;

    this.hideGameplayHud({ closePanels: true });
    this.refreshInteractions();
  }

  deviceClosed(type) {
    if (this.activeDevice !== type) return;

    this.activeDevice = null;
    this.computerChild = null;
    this.childLoading = false;

    if (
      this.disposed ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.hideGameplayHud();
    this.updateDebug();
  }

  canOpenComputerChild() {
    return Boolean(
      !this.disposed &&
      !this._cleanupDone &&
      !this.navigating &&
      this.sys.isActive() &&
      this.activeDevice === 'computer' &&
      this.computerUI?.isOpen &&
      !this.computerChild &&
      !this.childLoading
    );
  }

  async openInvestigations() {
    if (!this.canOpenComputerChild()) return;

    const token = this.runToken;

    this.childLoading = true;
    this.computerChild = 'crimeboard';
    this.computerUI.suspend();

    try {
      const opened = await this.piCrimeBoardUI.open();

      if (!this.isCurrent(token)) return;

      if (!opened) {
        this.returnToComputer();

        this.showFeedback(
          'The investigation board could not be opened.'
        );
      }
    } catch (error) {
      if (this.isCurrent(token)) {
        this.returnToComputer();

        this.showFeedback(
          'The investigation board could not be opened.'
        );
      }

      console.error(
        '[DetectiveOfficeScene] PI board failed:',
        error
      );
    } finally {
      if (this.isCurrent(token)) {
        this.childLoading = false;
        this.hideGameplayHud();
      }
    }
  }

  async openWorldTravel() {
    if (!this.canOpenComputerChild()) return;

    const token = this.runToken;

    this.childLoading = true;
    this.computerChild = 'destinations';
    this.computerUI.suspend();

    try {
      await this.ensureOverlayScene('NewsHud');

      if (!this.isCurrent(token)) return;

      this.hideGameplayHud();
      this.destinationsUI.open(this.gameState);
      this.hideGameplayHud();

      if (!this.destinationsUI.isOpen) {
        this.returnToComputer();

        this.showFeedback(
          'The travel map is currently unavailable.'
        );
      }
    } catch (error) {
      if (this.isCurrent(token)) {
        this.returnToComputer();

        this.showFeedback(
          'The travel map could not be opened.'
        );
      }

      console.error(
        '[DetectiveOfficeScene] Travel map failed:',
        error
      );
    } finally {
      if (this.isCurrent(token)) {
        this.childLoading = false;
        this.hideGameplayHud();
      }
    }
  }

  returnToComputer() {
    if (
      this.disposed ||
      this._cleanupDone ||
      this.navigating ||
      !this.sys.isActive()
    ) {
      return;
    }

    this.computerChild = null;
    this.childLoading = false;

    if (this.computerUI?.isOpen) {
      this.activeDevice = 'computer';
      this.computerUI.resume();
    }

    this.hideGameplayHud();
    this.refreshInteractions();
  }

  async goToCity() {
    if (!this.canUseOffice() || this.debugMode) {
      return false;
    }

    const token = this.runToken;

    this.navigating = true;
    this.refreshInteractions();

    try {
      const moved = await this.goto(
        this.citySceneKey,
        {
          entryPoint: 'pi-office',
          fromScene: SCENE_KEY,
          gameState: this.gameState
        }
      );

      if (!this.isCurrent(token)) {
        return moved !== false;
      }

      if (moved === false) {
        this.showFeedback(
          'The city could not be opened.'
        );
      }

      return moved !== false;
    } catch (error) {
      console.error(
        '[DetectiveOfficeScene] City navigation failed:',
        error
      );

      if (this.isCurrent(token)) {
        this.showFeedback(
          'The city could not be opened.'
        );
      }

      return false;
    } finally {
      if (this.isCurrent(token)) {
        this.navigating = false;
        this.hideGameplayHud();
        this.refreshInteractions();
      }
    }
  }

  exitOffice() {
    return this.goToCity();
  }

  update() {
    if (this.disposed || this._cleanupDone) return;

    this.enforceHiddenOverlays();

    const visibilityChanged =
      this.refreshObjectVisibility();

    if (
      visibilityChanged ||
      this.interactionEnabled !== this.canUseOffice()
    ) {
      this.refreshInteractions();
    }
  }

  isObjectVisible(config) {
    if (typeof config.condition !== 'function') {
      return true;
    }

    try {
      return Boolean(
        config.condition(this.gameState, this)
      );
    } catch (error) {
      if (!config._conditionErrorReported) {
        config._conditionErrorReported = true;

        console.error(
          '[DetectiveOfficeScene] Object condition failed:',
          config.id,
          error
        );
      }

      return false;
    }
  }

  refreshObjectVisibility() {
    let changed = false;

    for (const hotspot of this.hotspots) {
      const visible = this.isObjectVisible(
        hotspot.cfg
      );

      if (visible === hotspot.available) continue;

      hotspot.available = visible;
      hotspot.rect.setVisible(visible);
      hotspot.image?.setVisible(visible);

      if (!visible) {
        hotspot.label.setVisible(false);
      }

      changed = true;
    }

    return changed;
  }

  createHotspot(config, index) {
    config.x = Number.isFinite(config.x)
      ? config.x
      : 100;

    config.y = Number.isFinite(config.y)
      ? config.y
      : 100;

    config.w = Math.max(
      10,
      Number(config.w) || 100
    );

    config.h = Math.max(
      10,
      Number(config.h) || 100
    );

    const depth = Number.isFinite(config.depth)
      ? config.depth
      : 10;

    let image = null;

    if (config.textureKey) {
      if (this.textures.exists(config.textureKey)) {
        image = this.add
          .image(0, 0, config.textureKey)
          .setDepth(depth);
      } else {
        console.warn(
          '[DetectiveOfficeScene] Object texture missing:',
          config.id,
          config.textureKey
        );
      }
    }

    const rect = this.add
      .rectangle(0, 0, 1, 1, 0xffd166, 0)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });

    const label = this.add
      .text(
        0,
        0,
        config.tooltip || config.label || config.id,
        this.tooltipStyle()
      )
      .setOrigin(0.5, 1)
      .setDepth(200)
      .setVisible(false);

    const hotspot = {
      cfg: config,
      rect,
      label,
      image,
      available: this.isObjectVisible(config)
    };

    rect.setVisible(hotspot.available);
    image?.setVisible(hotspot.available);

    rect.on('pointerover', () => {
      if (
        hotspot.available &&
        this.canUseOffice() &&
        !this.debugMode
      ) {
        label.setVisible(true);
      }
    });

    rect.on('pointerout', () => {
      if (!this.debugMode) {
        rect.setFillStyle(0xffd166, 0);
        label.setVisible(false);
      }
    });

    rect.on('pointerdown', () => {
      if (
        !this.canUseOffice() ||
        !this.isObjectVisible(config)
      ) {
        return;
      }

      if (this.debugMode) {
        this.selectedIndex = index;
        this.updateDebug();
        return;
      }

      rect.setFillStyle(0xffd166, 0);
      label.setVisible(false);

      this.activateObject(config);
    });

    this.input.setDraggable(rect, false);

    rect.on('drag', (_pointer, x, y) => {
      if (
        !this.debugMode ||
        !this.canUseOffice() ||
        !hotspot.available
      ) {
        return;
      }

      this.selectedIndex = index;

      config.x = Math.round(
        x * this.officeSource.width /
        Math.max(1, this.scale.width)
      );

      config.y = Math.round(
        y * this.officeSource.height /
        Math.max(1, this.scale.height)
      );

      this.syncHotspot(hotspot);
      this.updateDebug();
    });

    this.syncHotspot(hotspot);

    return hotspot;
  }

  activateObject(config) {
    try {
      const result = config.onClick?.(this);

      if (result && typeof result.then === 'function') {
        const token = this.runToken;

        Promise.resolve(result).catch(error => {
          this.handleObjectError(config, error, token);
        });
      }
    } catch (error) {
      this.handleObjectError(
        config,
        error,
        this.runToken
      );
    }
  }

  handleObjectError(config, error, token) {
    console.error(
      '[DetectiveOfficeScene] Object action failed:',
      config.id,
      error
    );

    if (this.isCurrent(token)) {
      this.showFeedback(
        'That could not be opened. Please try again.'
      );
    }
  }

  syncHotspot({ cfg, rect, label, image }) {
    const bounds = officeHotspotBounds(
      cfg,
      this.officeSource.width,
      this.officeSource.height,
      this.scale.width,
      this.scale.height
    );

    rect
      .setPosition(bounds.x, bounds.y)
      .setSize(bounds.w, bounds.h);

    rect.input?.hitArea?.setTo(
      0,
      0,
      bounds.w,
      bounds.h
    );

    label.setPosition(
      bounds.x,
      bounds.y - bounds.h / 2 - 8
    );

    if (image) {
      const scale = Number.isFinite(cfg.scale)
        ? cfg.scale
        : 1;

      image
        .setPosition(bounds.x, bounds.y)
        .setScale(
          scale * this.scale.width /
            Math.max(1, this.officeSource.width),
          scale * this.scale.height /
            Math.max(1, this.officeSource.height)
        );
    }
  }

  refreshInteractions() {
    if (this.disposed) return;

    this.refreshObjectVisibility();

    const enabled = this.canUseOffice();
    this.interactionEnabled = enabled;

    for (const hotspot of this.hotspots) {
      const { rect, label, available } = hotspot;
      const usable = enabled && available;

      if (rect.input) {
        rect.input.enabled = usable;
      }

      this.input.setDraggable(
        rect,
        usable && this.debugMode
      );

      if (!this.debugMode) {
        rect
          .setFillStyle(0xffd166, 0)
          .setStrokeStyle(0);

        label.setVisible(false);
      } else {
        rect
          .setFillStyle(0x00ff88, 0.2)
          .setStrokeStyle(
            2,
            this.hotspots[this.selectedIndex] === hotspot
              ? 0xff44ff
              : 0x00ff88
          );

        label.setVisible(usable);
      }
    }
  }

  exportHotspotLayout() {
    // Eksportujemy wyłącznie układ, bez funkcji i pól runtime.
    const layout = this.hotspotDefs.map(config => {
      const entry = {};

      for (const key of [
        'id',
        'label',
        'tooltip',
        'x',
        'y',
        'w',
        'h',
        'action',
        'textureKey',
        'textureUrl',
        'scale',
        'depth'
      ]) {
        if (config[key] !== undefined) {
          entry[key] = config[key];
        }
      }

      return entry;
    });

    console.log(
      'PI OFFICE LAYOUT — copy coordinates into ' +
      'config/detectiveOfficeConfig.js. ' +
      'Keep any existing condition/onClick functions.'
    );

    console.log(JSON.stringify(layout, null, 2));

    this.showFeedback(
      'Object layout exported to the console.'
    );
  }

  onKey(event) {
    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        target?.tagName
      ) ||
      !this.canUseOffice()
    ) {
      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();

      if (this.debugMode) {
        this.debugMode = false;
        this.updateDebug();
      } else {
        void this.goToCity();
      }

      return;
    }

    if (event.code === 'KeyD') {
      event.preventDefault();
      this.debugMode = !this.debugMode;
      this.updateDebug();
      return;
    }

    if (!this.debugMode || !this.hotspots.length) {
      return;
    }

    if (event.code === 'KeyC') {
      event.preventDefault();
      this.exportHotspotLayout();
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();

      this.selectedIndex = (
        this.selectedIndex +
        (event.shiftKey ? -1 : 1) +
        this.hotspots.length
      ) % this.hotspots.length;

      this.updateDebug();
      return;
    }

    if (![
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown'
    ].includes(event.code)) {
      return;
    }

    event.preventDefault();

    const hotspot = this.hotspots[this.selectedIndex];
    if (!hotspot) return;

    const horizontal =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight';

    const direction =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowUp'
        ? -1
        : 1;

    const key = event.shiftKey
      ? (horizontal ? 'w' : 'h')
      : (horizontal ? 'x' : 'y');

    hotspot.cfg[key] +=
      direction * (event.altKey ? 1 : 5);

    hotspot.cfg.w = Math.max(10, hotspot.cfg.w);
    hotspot.cfg.h = Math.max(10, hotspot.cfg.h);

    this.syncHotspot(hotspot);
    this.updateDebug();
  }

  updateDebug() {
    const config =
      this.hotspots[this.selectedIndex]?.cfg;

    this.debugText?.setText(
      this.debugMode
        ? [
            `DEBUG: ${config?.id || 'no objects'}`,
            `x:${config?.x} y:${config?.y} ` +
              `w:${config?.w} h:${config?.h}`,
            'Arrows: move | Shift: resize | Alt: 1px',
            'Tab: next | C: export | D / Escape: close',
            'Object actions disabled.'
          ].join('\n')
        : ''
    );

    this.refreshInteractions();
  }

  showFeedback(text) {
    if (this.disposed || this._cleanupDone) return;

    this.feedbackTimer?.remove(false);
    this.feedback?.destroy();

    const message = this.add
      .text(
        this.scale.width / 2,
        80,
        text,
        {
          ...this.style(18),
          align: 'center',
          wordWrap: {
            width: Math.max(
              100,
              this.scale.width - 60
            )
          }
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(2500);

    this.feedback = message;

    this.feedbackTimer = this.time.delayedCall(
      3500,
      () => {
        if (message.active) {
          message.destroy();
        }

        if (this.feedback === message) {
          this.feedback = null;
          this.feedbackTimer = null;
        }
      }
    );
  }

  cleanupOffice() {
    if (this.disposed) return;

    this.disposed = true;
    this.runToken = null;

    this.input.keyboard?.off(
      'keydown',
      this.keyHandler
    );

    this.scale.off('resize', this.onOfficeResize);

    this.events.off('resume', this.onResume);
    this.events.off('wake', this.onResume);
    this.events.off('sleep', this.onOfficeSleep);

    this.events.off(
      'shutdown',
      this.cleanupOffice,
      this
    );

    this.events.off(
      'destroy',
      this.cleanupOffice,
      this
    );

    this.feedbackTimer?.remove(false);
    this.feedbackTimer = null;

    try {
      for (const key of [
        'piCrimeBoardUI',
        'destinationsUI',
        'phoneUI',
        'computerUI'
      ]) {
        try {
          this[key]?.destroy();
        } catch (error) {
          console.warn(
            `[DetectiveOfficeScene] ${key} cleanup failed:`,
            error
          );
        }

        this[key] = null;
      }
    } finally {
      this.unlockHtmlHud();
    }
  }
}