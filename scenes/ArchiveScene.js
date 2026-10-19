import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';

import {
  isOfficeNpcVisible
} from '../officeScheduleService.js';

const ARCHIVE_BACKGROUND_KEYS = [
  'archive',
  'archivist'
];

const REPORT_ITEM_ID = 'agency_mission_report';

const FRANK_HOTSPOT = {
  width: 200,
  height: 200,
  offsetX: 0,
  offsetY: 0,
  highlight: true
};

export class ArchiveScene extends BaseScene {
  constructor() {
    super({ key: 'ArchiveScene' });

    this.background = null;
    this.frankHotspot = null;
    this.frankHighlight = null;
    this.frankLabel = null;

    this.backButton = null;
    this.statusText = null;

    this.isLeaving = false;
    this.frankPresent = false;

    this._archiveRunToken = null;
    this._archiveDisposed = true;
    this._statusTimer = null;
    this._uiSetupPromise = null;
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;

    this.background = null;
    this.frankHotspot = null;
    this.frankHighlight = null;
    this.frankLabel = null;

    this.backButton = null;
    this.statusText = null;

    this.isLeaving = false;
    this.frankPresent = false;

    this._archiveRunToken = Symbol('archive-run');
    this._archiveDisposed = false;
    this._statusTimer = null;
    this._uiSetupPromise = null;
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');

    for (const key of ARCHIVE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) {
        continue;
      }

      const entry = manifest?.backgrounds?.find(
        asset => asset.key === key
      );

      if (!entry?.url) {
        console.error(
          `[ArchiveScene] Missing background manifest entry "${key}".`
        );

        continue;
      }

      this.load.image(key, entry.url);
    }
  }

  create() {
    super.create();

    audioManager.init(this);

    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);

    this.cameras.main.setBackgroundColor('#17110e');

    this.createBackground();
    this.createFrankHotspot();
    this.createInterface();

    this.refreshArchive();

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
      this.cleanupArchive,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupArchive,
      this
    );

    void this.setupArchiveUiLayers();
  }

  // ------------------------------------------------------------------
  // Background
  // ------------------------------------------------------------------

  createBackground() {
    const availableKey = ARCHIVE_BACKGROUND_KEYS.find(
      key => this.textures.exists(key)
    );

    if (!availableKey) {
      console.error(
        '[ArchiveScene] Neither archive background is available.'
      );

      return;
    }

    this.background = this.add
      .image(0, 0, availableKey)
      .setOrigin(0, 0)
      .setDepth(0);
  }

  getSolvedCaseCount() {
    const value = this.gameState?.casesSolved;

    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0
    )
      ? Math.floor(value)
      : 0;
  }

  refreshArchive() {
    if (this._archiveDisposed) {
      return;
    }

    this.frankPresent = isOfficeNpcVisible(
      'archivist_drebin',
      this.getSolvedCaseCount()
    );

    const backgroundKey = this.frankPresent
      ? 'archivist'
      : 'archive';

    if (this.textures.exists(backgroundKey)) {
      if (!this.background) {
        this.background = this.add
          .image(0, 0, backgroundKey)
          .setOrigin(0, 0)
          .setDepth(0);
      } else {
        this.background.setTexture(backgroundKey);
      }

      this.background.setVisible(true);
    } else {
      // Nie pokazujemy Franka na niewłaściwym tle.
      this.background?.setVisible(false);

      console.error(
        `[ArchiveScene] Missing required background "${backgroundKey}".`
      );
    }

    this.frankHotspot?.setVisible(this.frankPresent);

    if (this.frankPresent) {
      if (this.frankHotspot?.input) {
        this.frankHotspot.input.enabled = true;
      }
    } else {
      this.frankHotspot?.disableInteractive();
      this.frankLabel?.setVisible(false);
    }

    this.layoutArchive();
  }

  // ------------------------------------------------------------------
  // Frank
  // ------------------------------------------------------------------

  createFrankHotspot() {
    this.frankHighlight = this.add
      .graphics()
      .setDepth(20);

    this.frankHotspot = this.add
      .zone(
        0,
        0,
        FRANK_HOTSPOT.width,
        FRANK_HOTSPOT.height
      )
      .setOrigin(0, 0)
      .setDepth(21)
      .setName('hotspot-archivist-drebin')
      .setInteractive({
        useHandCursor: true
      });

    this.frankLabel = this.add
      .text(
        0,
        0,
        'Lieutenant Frank Drebin',
        {
          fontFamily: 'SpecialElite',
          fontSize: '20px',
          color: '#ffe29a',
          backgroundColor: '#17110e',
          align: 'center',
          padding: {
            left: 10,
            right: 10,
            top: 6,
            bottom: 6
          }
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(22)
      .setVisible(false);

    this.frankHotspot.on('pointerover', () => {
      if (!this.canInteract() || !this.frankPresent) {
        return;
      }

      this.frankLabel.setVisible(true);
      this.drawFrankHighlight(true);
    });

    this.frankHotspot.on('pointerout', () => {
      this.frankLabel?.setVisible(false);
      this.drawFrankHighlight(false);
    });

    this.frankHotspot.on('pointerdown', () => {
      this.interactWithFrank();
    });
  }

  getFrankHotspotBounds() {
    const { width, height } = this.scale;

    return {
      x:
        width / 2 -
        FRANK_HOTSPOT.width / 2 +
        FRANK_HOTSPOT.offsetX,

      y:
        height / 2 -
        FRANK_HOTSPOT.height / 2 +
        FRANK_HOTSPOT.offsetY,

      width: FRANK_HOTSPOT.width,
      height: FRANK_HOTSPOT.height
    };
  }

  drawFrankHighlight(hovered = false) {
    if (!this.frankHighlight) {
      return;
    }

    this.frankHighlight.clear();

    if (
      !this.frankPresent ||
      !FRANK_HOTSPOT.highlight
    ) {
      return;
    }

    const bounds = this.getFrankHotspotBounds();

    this.frankHighlight.fillStyle(
      0xffd54a,
      hovered ? 0.24 : 0.12
    );

    this.frankHighlight.fillRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );

    this.frankHighlight.lineStyle(
      hovered ? 4 : 3,
      0xffd54a,
      1
    );

    this.frankHighlight.strokeRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
  }

  interactWithFrank() {
    if (!this.canInteract() || !this.frankPresent) {
      return;
    }

    audioManager.playSfx('click_sound');

    const selectedItem = inventoryManager.getSelectedItem();

    if (selectedItem?.id === REPORT_ITEM_ID) {
      this.showStatus(
        'Mission report selected. Report handover is not connected yet.'
      );

      return;
    }

    if (selectedItem) {
      this.showStatus(
        'Select the mission report to hand it over.'
      );

      return;
    }

    if (inventoryManager.hasItem(REPORT_ITEM_ID)) {
      this.showStatus(
        'Select your mission report in the inventory, then click Frank.'
      );

      return;
    }

    this.showStatus(
      'You need to write the mission report before handing it in.'
    );
  }

  // ------------------------------------------------------------------
  // Interface
  // ------------------------------------------------------------------

  createInterface() {
    this.backButton = this.add
      .text(
        0,
        0,
        '< BACK TO OFFICE',
        {
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
        }
      )
      .setOrigin(0, 1)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true
      });

    this.backButton.on('pointerover', () => {
      this.backButton?.setColor('#ffffff');
    });

    this.backButton.on('pointerout', () => {
      this.backButton?.setColor('#f2d477');
    });

    this.backButton.on('pointerdown', () => {
      this.returnToOffice();
    });

    this.statusText = this.add
      .text(
        0,
        0,
        '',
        {
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
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(110)
      .setVisible(false);
  }

  layoutArchive() {
    if (this._archiveDisposed) {
      return;
    }

    const { width, height } = this.scale;

    this.background?.setDisplaySize(width, height);

    const bounds = this.getFrankHotspotBounds();

    this.frankHotspot?.setPosition(
      bounds.x,
      bounds.y
    );

    this.frankLabel?.setPosition(
      bounds.x + bounds.width / 2,
      bounds.y - 10
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

    this.drawFrankHighlight(false);
  }

  showStatus(message) {
    if (
      !message ||
      this._archiveDisposed ||
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

        if (!this._archiveDisposed) {
          this.statusText?.setVisible(false);
        }
      }
    );
  }

  canInteract() {
    if (
      this._archiveDisposed ||
      this.isLeaving ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const hud = this.getPlayerHudScene();

    return !hud?.isAnyPanelOpen?.();
  }

  returnToOffice() {
    if (!this.canInteract()) {
      return;
    }

    this.isLeaving = true;

    audioManager.playSfx('click_sound');

    this.getPlayerHudScene()?.closeAllUIPanels?.();

    this.goto('OfficeScene', {
      gameState: this.gameState
    });
  }

  // ------------------------------------------------------------------
  // Shared HUD
  // ------------------------------------------------------------------

  setupArchiveUiLayers() {
    if (this._archiveDisposed) {
      return Promise.resolve(false);
    }

    if (this._uiSetupPromise) {
      return this._uiSetupPromise;
    }

    const token = this._archiveRunToken;

    const isCurrent = () => (
      !this._archiveDisposed &&
      this._archiveRunToken === token &&
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
        hud?.setCurrentGameplayScene?.('ArchiveScene');

        const newsHud = await this.ensureOverlayScene('NewsHud');

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
            '[ArchiveScene] Failed to restore HUD:',
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
    this.layoutArchive();
  }

  onWakeOrResume() {
    if (this._archiveDisposed) {
      return;
    }

    this.isLeaving = false;

    this.refreshArchive();

    void this.setupArchiveUiLayers();
  }

  cleanupArchive() {
    if (this._archiveDisposed) {
      return;
    }

    this._archiveDisposed = true;
    this._archiveRunToken = null;

    this._statusTimer?.remove(false);
    this._statusTimer = null;

    this._uiSetupPromise = null;

    this.scale.off(
      'resize',
      this.handleResize,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.onWakeOrResume,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.onWakeOrResume,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupArchive,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupArchive,
      this
    );

    this.frankHotspot?.removeAllListeners();
    this.backButton?.removeAllListeners();

    this.background = null;
    this.frankHotspot = null;
    this.frankHighlight = null;
    this.frankLabel = null;

    this.backButton = null;
    this.statusText = null;
  }
}