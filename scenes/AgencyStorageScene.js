import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';

const BACKGROUND_KEY = 'agency_storage_background';
const BACKGROUND_URL = 'assets/local/magasine.jpg';

export class AgencyStorageScene extends BaseScene {
  constructor() {
    super({ key: 'AgencyStorageScene' });

    this.background = null;
    this.backButton = null;
    this.statusText = null;

    this.isLeaving = false;

    this._storageDisposed = true;
    this._storageRunToken = null;
    this._uiSetupPromise = null;
    this._statusTimer = null;
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;

    this.background = null;
    this.backButton = null;
    this.statusText = null;

    this.isLeaving = false;

    this._storageDisposed = false;
    this._storageRunToken = Symbol('agency-storage-run');
    this._uiSetupPromise = null;
    this._statusTimer = null;
  }

  preload() {
    if (!this.textures.exists(BACKGROUND_KEY)) {
      this.load.image(
        BACKGROUND_KEY,
        BACKGROUND_URL
      );
    }
  }

  create() {
    super.create();

    audioManager.init(this);

    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);

    this.registry.set(
      'activeMission',
      this.gameState.currentMission || null
    );

    this.cameras.main.setBackgroundColor('#17110e');

    this.createBackground();
    this.createInterface();
    this.layoutStorage();

    this.scale.on(
      'resize',
      this.handleResize,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.onWakeOrResume,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.onWakeOrResume,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupStorage,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupStorage,
      this
    );

    void this.setupStorageUiLayers();
  }

  // ------------------------------------------------------------------
  // Background
  // ------------------------------------------------------------------

  createBackground() {
    if (!this.textures.exists(BACKGROUND_KEY)) {
      console.error(
        `[AgencyStorageScene] Missing background: ${BACKGROUND_URL}`
      );

      return;
    }

    this.background = this.add
      .image(0, 0, BACKGROUND_KEY)
      .setOrigin(0, 0)
      .setDepth(0);
  }

  // ------------------------------------------------------------------
  // Interface
  // ------------------------------------------------------------------

  createInterface() {
    this.backButton = this.add
      .text(0, 0, '< BACK TO OFFICE', {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#f2d477',
        backgroundColor: '#17110e',
        padding: {
          left: 14,
          right: 14,
          top: 10,
          bottom: 10
        }
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true
      });

    this.backButton.on('pointerover', () => {
      if (this.canInteract()) {
        this.backButton?.setColor('#ffffff');
      }
    });

    this.backButton.on('pointerout', () => {
      this.backButton?.setColor('#f2d477');
    });

    this.backButton.on('pointerdown', () => {
      void this.returnToOffice();
    });

    this.statusText = this.add
      .text(0, 0, '', {
        fontFamily: 'SpecialElite',
        fontSize: '22px',
        color: '#f2d477',
        align: 'center',
        backgroundColor: '#17110e',
        padding: {
          left: 16,
          right: 16,
          top: 12,
          bottom: 12
        }
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(110)
      .setVisible(false);
  }

  layoutStorage() {
    if (this._storageDisposed) {
      return;
    }

    const { width, height } = this.scale;

    this.background?.setDisplaySize(
      width,
      height
    );

    this.backButton?.setPosition(
      24,
      height - 24
    );

    if (this.statusText) {
      this.statusText.setPosition(
        width / 2,
        100
      );

      this.statusText.setWordWrapWidth(
        Math.max(120, Math.min(width - 48, 760)),
        true
      );
    }
  }

  showStatus(message) {
    if (
      !message ||
      this._storageDisposed ||
      !this.statusText
    ) {
      return;
    }

    this._statusTimer?.remove(false);

    this.statusText
      .setText(message)
      .setVisible(true);

    this._statusTimer = this.time.delayedCall(
      4200,
      () => {
        this._statusTimer = null;

        if (!this._storageDisposed) {
          this.statusText?.setVisible(false);
        }
      }
    );
  }

  canInteract() {
    if (
      this._storageDisposed ||
      this.isLeaving ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const hud = this.getPlayerHudScene();

    return !hud?.isAnyPanelOpen?.();
  }

  async returnToOffice() {
    if (!this.canInteract()) {
      return false;
    }

    const token = this._storageRunToken;

    this.isLeaving = true;

    audioManager.playSfx('click_sound');

    this.getPlayerHudScene()?.closeAllUIPanels?.();

    try {
      const result = await this.goto(
        'OfficeScene',
        {
          gameState: this.gameState
        }
      );

      if (
        this._storageRunToken === token &&
        !this._storageDisposed &&
        this.sys.isActive()
      ) {
        this.isLeaving = false;

        if (result === false) {
          this.showStatus(
            'The office could not be opened.'
          );
        }
      }

      return result !== false;
    } catch (error) {
      if (
        this._storageRunToken === token &&
        !this._storageDisposed
      ) {
        this.isLeaving = false;

        this.showStatus(
          'The office could not be opened.'
        );

        console.error(
          '[AgencyStorageScene] Failed to return to OfficeScene:',
          error
        );
      }

      return false;
    }
  }

  // ------------------------------------------------------------------
  // Shared HUD
  // ------------------------------------------------------------------

  setupStorageUiLayers() {
    if (this._storageDisposed) {
      return Promise.resolve(false);
    }

    if (this._uiSetupPromise) {
      return this._uiSetupPromise;
    }

    const token = this._storageRunToken;

    const isCurrent = () => (
      !this._storageDisposed &&
      this._storageRunToken === token &&
      this.sys.isActive()
    );

    const request = (async () => {
      try {
        await this.ensureOverlayScene('UIScene');

        if (!isCurrent()) {
          return false;
        }

        const hud = await this.restorePlayerHud();

        if (!isCurrent()) {
          return false;
        }

        hud?.closeAllUIPanels?.();

        hud?.setCurrentGameplayScene?.(
          'AgencyStorageScene'
        );

        const newsHud = await this.ensureOverlayScene(
          'NewsHud'
        );

        if (!isCurrent()) {
          return false;
        }

        newsHud?.events?.emit(
          'setNewspaperVisible',
          false
        );

        newsHud?.events?.emit(
          'setTvVisible',
          false
        );

        return true;
      } catch (error) {
        if (isCurrent()) {
          console.error(
            '[AgencyStorageScene] Failed to restore HUD:',
            error
          );
        }

        return false;
      }
    })();

    this._uiSetupPromise = request;

    void request.finally(() => {
      if (this._uiSetupPromise === request) {
        this._uiSetupPromise = null;
      }
    });

    return request;
  }

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  handleResize() {
    this.layoutStorage();
  }

  onWakeOrResume() {
    if (this._storageDisposed) {
      return;
    }

    this.isLeaving = false;

    this.layoutStorage();

    void this.setupStorageUiLayers();
  }

  cleanupStorage() {
    if (this._storageDisposed) {
      return;
    }

    this._storageDisposed = true;
    this._storageRunToken = null;

    this._statusTimer?.remove(false);
    this._statusTimer = null;

    this._uiSetupPromise = null;

    this.scale.off(
      'resize',
      this.handleResize,
      this
    );

    const bindings = [
      [
        Phaser.Scenes.Events.WAKE,
        this.onWakeOrResume
      ],
      [
        Phaser.Scenes.Events.RESUME,
        this.onWakeOrResume
      ],
      [
        Phaser.Scenes.Events.SHUTDOWN,
        this.cleanupStorage
      ],
      [
        Phaser.Scenes.Events.DESTROY,
        this.cleanupStorage
      ]
    ];

    for (const [event, callback] of bindings) {
      this.events.off(
        event,
        callback,
        this
      );
    }

    this.backButton?.removeAllListeners();

    this.background = null;
    this.backButton = null;
    this.statusText = null;
  }
}