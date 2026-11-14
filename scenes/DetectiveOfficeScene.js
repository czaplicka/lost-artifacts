import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';

import {
  OFFICE_CONFIG
} from '../config/detectiveOfficeConfig.js';

import {
  PI_OFFICE_IMAGES,
  PI_OFFICE_LAYERS,
  PI_BIG_OFFICE_HOTSPOTS
} from '../config/piOfficeUpgradeConfig.js';

import {
  NEW_PI_OFFICE_ID,
  ownsOfficeItem,
  ownsNewPIOffice,
  needsOfficeMoveIn
} from '../managers/PIOfficeShopManager.js';

import {
  acceptPIQuestFromAdvert,
  getPIQuestStatus
} from '../managers/PIQuestManager.js';

import {
  PIOfficeComputerUI
} from '../ui/PIOfficeComputerUI.js';

import {
  PIOfficePhoneUI
} from '../ui/PIOfficePhoneUI.js';

import {
  PICrimeBoardUI
} from '../ui/PICrimeBoardUI.js';

import {
  PIOfficeDestinationsUI
} from '../ui/PIOfficeDestinationsUI.js';

import {
  bindPIInventoryOfficeShop
} from '../ui/pi-computer/PIInventoryOfficeShop.js';

import {
  OfficeMoveIn
} from './pi-office/OfficeMoveIn.js';

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
  ['pi_phone_desk', 'assets/ui/pi-phone/desk.webp'],
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

    Object.assign(this, {
      disposed: false,
      navigating: false,
      debugMode: false,
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
      tooltip: null,
      feedback: null,
      feedbackTimer: null,
      moveIn: null,
      hudLockOwned: false,
      bigOffice: false,
      retryButton: null
    });

    this.hotspots = [];
    this.layers = [];

    this.runToken = Symbol('pi-office');
  }

  preload() {
    const images = [
      [
        OFFICE_CONFIG.backgroundKey || 'pi_office_bg',
        OFFICE_CONFIG.backgroundUrl ||
          'assets/local/pioffice.webp'
      ],
      ...PI_OFFICE_IMAGES,
      ...PHONE_ART,
      [
        'pi_computer_wallpaper',
        'assets/ui/computer/wallpaper_pi.webp'
      ]
    ];

    const queued = new Set();

    for (const [key, url] of images) {
      if (
        queued.has(key) ||
        this.textures.exists(key)
      ) {
        continue;
      }

      queued.add(key);
      this.load.image(key, url);
    }

    for (const [key, url] of DATA_FILES) {
      if (!this.cache.json.exists(key)) {
        this.load.json(key, url);
      }
    }
  }

  create() {
    super.create();

    this.registry.set('currentSceneKey', SCENE_KEY);

    this.officeTitle = this.add
      .text(16, 16, __dialogueText("scenes/DetectiveOfficeScene.js", "t_f99419d296900dce0711"), this.style(14))
      .setDepth(100);

    this.debugText = this.add
      .text(
        16,
        55,
        '',
        this.style(13)
      )
      .setDepth(100);

    this.tooltip = this.add
      .text(0, 0, '', this.style(15))
      .setOrigin(0.5, 1)
      .setDepth(200)
      .setVisible(false);

    this.createPanels();
    this.bindEvents();
    this.rebuildOffice();

    this.hideGameplayHud({ closePanels: true });

    if (needsOfficeMoveIn()) {
      this.startMoveIn();
    }
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
      !this.moveIn &&
      !needsOfficeMoveIn() &&
      this.sys.isActive()
    );
  }

  pointerBlocked(pointer) {
    const event = pointer?.event;
    const touch =
      event?.changedTouches?.[0] ||
      event?.touches?.[0];

    const x = touch?.clientX ?? event?.clientX;
    const y = touch?.clientY ?? event?.clientY;

    if (event?.target?.closest?.(__dialogueText("scenes/DetectiveOfficeScene.js", "t_ac41b924aa2755fb032c"))) {
      return true;
    }

    return Boolean(
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      document.elementFromPoint(x, y)?.closest?.(__dialogueText("scenes/DetectiveOfficeScene.js", "t_ac41b924aa2755fb032c"))
    );
  }

  lockHtmlHud() {
    if (!document.getElementById(HUD_LOCK_STYLE)) {
      const style = document.createElement('style');

      style.id = HUD_LOCK_STYLE;

      style.textContent =
        `${__dialogueText("scenes/DetectiveOfficeScene.js", "t_c3a80412da16a675dc16")}${HUD_LOCK_CLASS}${__dialogueText("scenes/DetectiveOfficeScene.js", "t_d613f9ec6abd46f9876f")}` +
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_ff1953cb056875ea13bd") +
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_1f6318dda2d74a2b2642") +
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_3cd4f16d9f07d0c37451") +
        '}';

      document.head.appendChild(style);
    }

    document.documentElement.classList.add(
      HUD_LOCK_CLASS
    );

    this.hudLockOwned = true;
  }

  unlockHtmlHud() {
    if (!this.hudLockOwned) return;

    document.documentElement.classList.remove(
      HUD_LOCK_CLASS
    );

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
      this.getRegisteredScene(
        'PlayerHudScene'
      )?.closeAllUIPanels?.();

      this.getRegisteredScene(
        'NewsHud'
      )?.closeMenu?.(true);
    }

    this.getRegisteredScene('UIScene')?.hideHUD?.();

    this.getRegisteredScene(
      'NewsHud'
    )?.setHudVisible?.(false);

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
      if (
        this.getRegisteredScene(key)
          ?.sys?.settings?.visible
      ) {
        this.scene.setVisible(false, key);
      }
    }
  }

  createPanels() {
    this.computerUI = new PIOfficeComputerUI(this, {
      wallpaperKey: 'pi_computer_wallpaper',

      onOpen: () => this.deviceOpened('computer'),
      onClose: () => this.deviceClosed('computer'),

      onOpenInvestigations: () =>
        this.openInvestigations(),

      onOpenWorldTravel: () =>
        this.openWorldTravel(),

      onAcceptMission: advert =>
        acceptPIQuestFromAdvert(this, advert.id),

      getMissionStatus: id =>
        getPIQuestStatus(id)
    });

    bindPIInventoryOfficeShop(
      this.computerUI.officeShop
    );

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

    this.destinationsUI = new PIOfficeDestinationsUI(
      this,
      {
        onClose: ({ returnToComputer }) => {
          if (returnToComputer) {
            this.returnToComputer();
          }
        }
      }
    );
  }

  bindEvents() {
    this.keyHandler = event => this.onKey(event);
    this.resizeHandler = () => this.layoutOffice();

    this.resumeHandler = () => {
      if (this.disposed || this._cleanupDone) return;

      this.registry.set('currentSceneKey', SCENE_KEY);
      this.hideGameplayHud();
    };

    this.sleepHandler = () => this.unlockHtmlHud();

    this.input.keyboard?.on(
      'keydown',
      this.keyHandler
    );

    this.scale.on('resize', this.resizeHandler);

    this.events.on('resume', this.resumeHandler);
    this.events.on('wake', this.resumeHandler);
    this.events.on('sleep', this.sleepHandler);

    this.events.once(
      'shutdown',
      this.cleanupOffice,
      this
    );

    this.events.once(
      'destroy',
      this.cleanupOffice,
      this
    );
  }

  rebuildOffice() {
    this.tooltip?.setVisible(false);

    this.officeBackground?.destroy();

    for (const hotspot of this.hotspots) {
      hotspot.rect.destroy();
    }

    for (const layer of this.layers) {
      layer.image.destroy();
    }

    this.hotspots = [];
    this.layers = [];

    const oldKey =
      OFFICE_CONFIG.backgroundKey || 'pi_office_bg';

    const requestedKey = ownsNewPIOffice()
      ? 'bigger-office'
      : oldKey;

    this.bigOffice =
      requestedKey === 'bigger-office' &&
      this.textures.exists('bigger-office');

    const key = this.textures.exists(requestedKey)
      ? requestedKey
      : oldKey;

    const { width, height } = this.scale;

    if (this.textures.exists(key)) {
      const source = this.textures
        .get(key)
        .getSourceImage();

      this.officeSource = {
        width: source.width,
        height: source.height
      };

      this.officeBackground = this.add
        .image(0, 0, key)
        .setOrigin(0)
        .setDepth(0);
    } else {
      this.officeSource = { width, height };

      this.officeBackground = this.add
        .rectangle(0, 0, width, height, 0x25231e)
        .setOrigin(0)
        .setDepth(0);

      console.error(
        '[DetectiveOfficeScene] Office background missing:',
        requestedKey
      );
    }

    const definitions = this.bigOffice
      ? PI_BIG_OFFICE_HOTSPOTS
      : OFFICE_CONFIG.hotspots || [];

    for (const definition of definitions) {
      this.createBaseHotspot(
        definition,
        this.bigOffice
      );
    }

    if (this.bigOffice) {
      for (
        let index = 0;
        index < PI_OFFICE_LAYERS.length;
        index++
      ) {
        this.createLayer(
          PI_OFFICE_LAYERS[index],
          index
        );
      }
    }

    this.layoutOffice();

    this.officeTitle.setText(
      this.bigOffice
        ? __dialogueText("scenes/DetectiveOfficeScene.js", "t_6cd4221303b5fe07f38b")
        : __dialogueText("scenes/DetectiveOfficeScene.js", "t_f99419d296900dce0711")
    );
  }

  createBaseHotspot(config, relative) {
    const rect = this.add
      .rectangle(0, 0, 1, 1, 0xffd166, 0)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });

    const hotspot = {
      cfg: { ...config },
      rect,
      relative
    };

    rect.on('pointerover', () => {
      if (this.canUseOffice()) {
        this.showTooltip(
          config.label || config.id,
          rect.x,
          rect.y - rect.height / 2
        );
      }
    });

    rect.on('pointerout', () =>
      this.tooltip.setVisible(false)
    );

    rect.on('pointerdown', pointer => {
      if (
        !this.canUseOffice() ||
        this.pointerBlocked(pointer)
      ) {
        return;
      }

      this.tooltip.setVisible(false);

      void this.activateAction(config);
    });

    this.hotspots.push(hotspot);
  }

  createLayer(config, index) {
    if (!this.textures.exists(config.key)) {
      console.warn(
        '[DetectiveOfficeScene] Layer missing:',
        config.key
      );

      return;
    }

    const image = this.add
      .image(0, 0, config.key)
      .setOrigin(0)
      .setDepth(10 + index);

    image.setInteractive({
      useHandCursor: true,
      pixelPerfect: true,
      alphaTolerance: 32
    });

    image.on('pointerover', pointer => {
      if (
        this.canUseOffice() &&
        ownsOfficeItem(config.id)
      ) {
        this.showTooltip(
          config.label,
          pointer.x,
          pointer.y - 12
        );
      }
    });

    image.on('pointerout', () =>
      this.tooltip.setVisible(false)
    );

    image.on('pointerdown', pointer => {
      if (
        !this.canUseOffice() ||
        !ownsOfficeItem(config.id) ||
        this.pointerBlocked(pointer)
      ) {
        return;
      }

      this.tooltip.setVisible(false);

      void this.activateAction(config);
    });

    this.layers.push({
      cfg: config,
      image
    });
  }

  showTooltip(text, x, y) {
    const { width } = this.scale;

    this.tooltip
      .setText(text)
      .setPosition(
        Math.max(80, Math.min(width - 80, x)),
        Math.max(60, y)
      )
      .setVisible(true);
  }

  layoutOffice() {
    if (this.disposed) return;

    const { width, height } = this.scale;

    this.officeBackground?.setDisplaySize(
      width,
      height
    );

    for (const { cfg, rect, relative } of this.hotspots) {
      const b = relative
        ? {
            x: cfg.x * width,
            y: cfg.y * height,
            w: cfg.w * width,
            h: cfg.h * height
          }
        : officeHotspotBounds(
            cfg,
            this.officeSource.width,
            this.officeSource.height,
            width,
            height
          );

      rect
        .setPosition(b.x, b.y)
        .setSize(b.w, b.h);

      rect.input?.hitArea?.setTo(
        0,
        0,
        b.w,
        b.h
      );
    }

    for (const { image } of this.layers) {
      image
        .setPosition(0, 0)
        .setDisplaySize(width, height);
    }

    this.officeTitle?.setPosition(16, 16);
    this.debugText?.setPosition(16, 55);

    this.retryButton?.setPosition(
      width / 2,
      height / 2
    );
  }

  async activateAction(config) {
    try {
      switch (config.action) {
        case 'computer':
          this.openComputer();
          break;

        case 'phone':
          this.openPhone();
          break;

        case 'city':
        case 'gotoCity':
          await this.goToCity();
          break;

        case 'archive':
          this.openOfficeApplication('office-archive');
          break;

        case 'documents':
          this.openOfficeApplication('office-documents');
          break;

        case 'investigations':
          this.openOfficeApplication('investigations');
          break;

        case 'notebook':
          this.openCaseNotes();
          break;

        default:
          this.showFeedback(
            config.message || __dialogueText("scenes/DetectiveOfficeScene.js", "t_6cbc302f22aa1b8ee0af")
          );
      }
    } catch (error) {
      console.error(
        '[DetectiveOfficeScene] Object action failed:',
        config.id,
        error
      );

      this.showFeedback(
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_809fc8591742d9821fbd")
      );
    }
  }

  openComputer() {
    if (this.canUseOffice()) {
      this.computerUI.open();
    }
  }

  openPhone() {
    if (this.canUseOffice()) {
      this.phoneUI.open();
    }
  }

  openCaseNotes() {
    if (!this.canUseOffice()) return;

    const handle =
      document.querySelector(__dialogueText("scenes/DetectiveOfficeScene.js", "t_986f4ab9a5ec85d629ec"));

    const paper =
      document.querySelector(__dialogueText("scenes/DetectiveOfficeScene.js", "t_2e02c20641dc0d86904f"));

    if (!handle || !paper) {
      this.showFeedback(
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_59973fc0ab24c18bfb33")
      );

      return;
    }

    if (paper.hidden) {
      handle.click();
    }
  }

  openOfficeApplication(app) {
    if (
      !this.canUseOffice() ||
      ![
        'office-archive',
        'office-documents',
        'investigations'
      ].includes(app)
    ) {
      return false;
    }

    const ui = this.computerUI;

    if (!ui || ui.destroyed) return false;

    const hadOption =
      Object.prototype.hasOwnProperty.call(
        ui.options,
        'skipBoot'
      );

    const previous = ui.options.skipBoot;

    try {
      ui.options.skipBoot = true;
      ui.open();

      if (
        ui.isOpen &&
        !ui.suspended &&
        !ui.destroyed
      ) {
        ui.openApp(app);
        return true;
      }

      return false;
    } finally {
      if (hadOption) {
        ui.options.skipBoot = previous;
      } else {
        delete ui.options.skipBoot;
      }
    }
  }

  deviceOpened(type) {
    if (this.disposed) return;

    this.activeDevice = type;
    this.computerChild = null;

    this.tooltip?.setVisible(false);
    this.hideGameplayHud({ closePanels: true });
  }

  deviceClosed(type) {
    if (this.activeDevice !== type) return;

    this.activeDevice = null;
    this.computerChild = null;
    this.childLoading = false;

    if (
      !this.disposed &&
      !this._cleanupDone &&
      this.sys.isActive()
    ) {
      this.hideGameplayHud();
    }
  }

  canOpenComputerChild() {
    return Boolean(
      !this.disposed &&
      !this._cleanupDone &&
      !this.navigating &&
      !this.moveIn &&
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
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_cea8b43cceb044ca159c")
        );
      }
    } catch (error) {
      console.error(
        '[DetectiveOfficeScene] PI board failed:',
        error
      );

      if (this.isCurrent(token)) {
        this.returnToComputer();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_cea8b43cceb044ca159c")
        );
      }
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

      if (!this.destinationsUI.isOpen) {
        this.returnToComputer();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_0756c0ff30466f0a2e23")
        );
      }
    } catch (error) {
      console.error(
        '[DetectiveOfficeScene] Travel map failed:',
        error
      );

      if (this.isCurrent(token)) {
        this.returnToComputer();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_fd3e891598e803cb3add")
        );
      }
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
    } else {
      this.activeDevice = null;
    }

    this.hideGameplayHud();
  }

  handleOfficePurchase(id, previewBounds = null) {
    if (
      this.disposed ||
      this._cleanupDone
    ) {
      return;
    }

    if (id === NEW_PI_OFFICE_ID) {
      this.computerUI.close();

      this.rebuildOffice();
      this.startMoveIn(previewBounds);
    }
  }

  startMoveIn(previewBounds = null) {
    if (
      this.disposed ||
      this.moveIn ||
      !needsOfficeMoveIn()
    ) {
      return;
    }

    const missing = [
      'bigger-office',
      'bigger-office-ad',
      'bigger-office-reality'
    ].filter(key => !this.textures.exists(key));

    if (missing.length) {
      console.error(
        '[DetectiveOfficeScene] Move-in images missing:',
        missing
      );

      this.showFeedback(
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_ce46e1ea5584e29734bc") +
        __dialogueText("scenes/DetectiveOfficeScene.js", "t_49987a1c5f839e0c09bf")
      );

      this.showMoveInRetry();
      return;
    }

    this.retryButton?.destroy();
    this.retryButton = null;

    this.activeDevice = 'move-in';
    this.tooltip?.setVisible(false);

    this.moveIn = new OfficeMoveIn(
      this,
      previewBounds,
      () => {
        this.moveIn = null;
        this.activeDevice = null;

        if (this.disposed) return;

        this.rebuildOffice();

        this.showFeedback(
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_444b818bfd8c9cce6e08")
        );
      }
    );
  }

  showMoveInRetry() {
    if (this.retryButton) return;

    const { width, height } = this.scale;

    this.retryButton = this.add.text(
      width / 2,
      height / 2,
      __dialogueText("scenes/DetectiveOfficeScene.js", "t_7456d88f80aaeb4025e7"),
      this.style(22)
    )
      .setOrigin(0.5)
      .setDepth(5000)
      .setInteractive({ useHandCursor: true });

    this.retryButton.on('pointerdown', () => {
      if (this.load.isLoading()) return;

      const missing = PI_OFFICE_IMAGES.filter(
        ([key]) =>
          [
            'bigger-office',
            'bigger-office-ad',
            'bigger-office-reality'
          ].includes(key) &&
          !this.textures.exists(key)
      );

      if (!missing.length) {
        this.startMoveIn();
        return;
      }

      const token = this.runToken;

      for (const [key, url] of missing) {
        this.load.image(key, url);
      }

      this.load.once('complete', () => {
        if (!this.isCurrent(token)) return;

        this.rebuildOffice();
        this.startMoveIn();
      });

      this.load.start();
    });
  }

  async goToCity() {
    if (!this.canUseOffice()) return false;

    const token = this.runToken;

    this.navigating = true;
    this.tooltip?.setVisible(false);

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
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_5319d91d50bf1f202593")
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
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_5319d91d50bf1f202593")
        );
      }

      return false;
    } finally {
      if (this.isCurrent(token)) {
        this.navigating = false;
        this.hideGameplayHud();
      }
    }
  }

  exitOffice() {
    return this.goToCity();
  }

  onKey(event) {
    if (event.defaultPrevented) return;

    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        target?.tagName
      ) ||
      target?.closest?.(__dialogueText("scenes/DetectiveOfficeScene.js", "t_ac41b924aa2755fb032c")) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (
      event.code === __dialogueText("scenes/DetectiveOfficeScene.js", "t_037c968467aa3fd7c059") &&
      this.canUseOffice()
    ) {
      event.preventDefault();

      if (this.debugMode) {
        this.debugMode = false;
      } else {
        void this.goToCity();
      }
    }

    if (
      event.code === 'KeyD' &&
      this.canUseOffice()
    ) {
      event.preventDefault();
      this.debugMode = !this.debugMode;
    }
  }

  update() {
    if (this.disposed || this._cleanupDone) return;

    this.enforceHiddenOverlays();

    const usable = this.canUseOffice();

    for (const { rect } of this.hotspots) {
      if (rect.input) {
        rect.input.enabled = usable;
      }

      rect
        .setFillStyle(
          0xffd166,
          this.debugMode && usable ? 0.18 : 0
        )
        .setStrokeStyle(
          this.debugMode && usable ? 2 : 0,
          0xffd166
        );
    }

    for (const { cfg, image } of this.layers) {
      const visible = ownsOfficeItem(cfg.id);

      image.setVisible(visible);

      if (image.input) {
        image.input.enabled = visible && usable;
      }
    }

    this.debugText.setText(
      this.debugMode
        ? __dialogueText("scenes/DetectiveOfficeScene.js", "t_ebabfa4190bb6ebe044e") +
          __dialogueText("scenes/DetectiveOfficeScene.js", "t_7d5cbce44b356c19e921")
        : ''
    );
  }

  showFeedback(text) {
    if (this.disposed || this._cleanupDone) return;

    this.feedbackTimer?.remove(false);
    this.feedback?.destroy();

    const message = this.add.text(
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
      5000,
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

    this.scale.off(
      'resize',
      this.resizeHandler
    );

    this.events.off('resume', this.resumeHandler);
    this.events.off('wake', this.resumeHandler);
    this.events.off('sleep', this.sleepHandler);

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

    this.moveIn?.destroy();
    this.moveIn = null;

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