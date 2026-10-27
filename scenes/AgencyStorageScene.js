import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { audioManager } from '../managers/AudioManager.js';
import {
  saveGameState,
  requestAutosave
} from '../gameStatePersistence.js';

const EMPTY_STORAGE_KEY = 'agency_storage_room_v2';
const MANAGER_STORAGE_KEY = 'agency_storage_manager';
const MANAGER_PORTRAIT_KEY = 'portrait_magazine';
const MANAGER_PORTRAIT_URL = 'assets/portraits/magazine_manager.png';

const INTRO_LINES = [
  'Ah. Fresh cannon fodder. HR calls it recruitment. ' +
    'I call it restocking.',

  "Alex Murphy. Equipment, storage, and saying 'no' " +
    'to requests involving grappling hooks.',

  "Here's your Agency Field Manual. Evidence handling, " +
    'travel procedures, paperwork. All the glamorous stuff.',

  "If your desk wobbles, stick it under the short leg. " +
    "That's the advanced training.",

  'Now get out. I have to count the emergency parachutes. ' +
    'Apparently, "probably enough" upset somebody in Legal.'
];

const RETURN_LINES = [
  "You've got your manual. If you've already lost it, " +
    "try investigating. I hear that's your department.",

  "Now out. These boxes aren't going to mislabel themselves."
];

export class AgencyStorageScene extends BaseScene {
  constructor() {
    super({ key: 'AgencyStorageScene' });
    this._storageDisposed = true;
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;

    this.background = null;
    this.backButton = null;
    this.retryButton = null;
    this.statusText = null;

    this.manualTemplate = null;
    this.storageHud = null;
    this.storageDialog = null;

    this.isLeaving = false;
    this._conversationOpen = false;
    this._preparing = false;
    this._finishing = false;

    this._storageDisposed = false;
    this._storageRunToken = Symbol('storage-run');
    this._cancelHudWait = null;
    this._prepareTimer = null;
  }

  preload() {
    if (!this.textures.exists(MANAGER_PORTRAIT_KEY)) {
      this.load.image(
        MANAGER_PORTRAIT_KEY,
        MANAGER_PORTRAIT_URL
      );
    }
  }

  create() {
    super.create();

    audioManager.init(this);

    this.registry.set('currentSceneKey', 'AgencyStorageScene');
    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);
    this.registry.set(
      'activeMission',
      this.gameState.currentMission || null
    );

    this.cameras.main.setBackgroundColor('#17110e');

    const initialKey = this.textures.exists(MANAGER_STORAGE_KEY)
      ? MANAGER_STORAGE_KEY
      : EMPTY_STORAGE_KEY;

    if (this.textures.exists(initialKey)) {
      this.background = this.add
        .image(0, 0, initialKey)
        .setOrigin(0)
        .setDepth(0);
    }

    this.createInterface();
    this.layoutStorage();

    this.scale.on('resize', this.layoutStorage, this);

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

    this.statusText
      .setText('Alex is locating your paperwork...')
      .setVisible(true);

    this.schedulePreparation();
  }

  schedulePreparation() {
    this._prepareTimer?.remove(false);

    this._prepareTimer = this.time.delayedCall(0, () => {
      this._prepareTimer = null;
      void this.prepareVisit();
    });
  }

  isCurrent(token = this._storageRunToken) {
    return Boolean(
      !this._storageDisposed &&
      this._storageRunToken === token &&
      !this._cleanupDone &&
      this.sys.isActive()
    );
  }

  completeStorageTutorialVisit() {
    const tutorial = this.gameState.onboarding?.firstCase;

    if (
      !tutorial ||
      tutorial.active !== true ||
      tutorial.completed === true ||
      tutorial.skipped === true ||
      tutorial.step !== 'visit_storage'
    ) {
      return;
    }

    tutorial.storageVisited = true;
    tutorial.step = 'walk_to_case_file';

    requestAutosave();
  }

  showManagerBackground() {
    if (!this.textures.exists(MANAGER_STORAGE_KEY)) {
      return false;
    }

    if (!this.background) {
      this.background = this.add
        .image(0, 0, MANAGER_STORAGE_KEY)
        .setOrigin(0)
        .setDepth(0);
    } else {
      this.background.setTexture(MANAGER_STORAGE_KEY);
    }

    this.background.setDisplaySize(
      this.scale.width,
      this.scale.height
    );

    return true;
  }

  createInterface() {
    const style = {
      fontFamily: 'SpecialElite',
      fontSize: '22px',
      color: '#f2d477',
      backgroundColor: '#17110e',
      padding: { x: 14, y: 10 }
    };

    this.backButton = this.add
      .text(0, 0, '< BACK TO OFFICE', style)
      .setOrigin(0, 1)
      .setDepth(100)
      .setInteractive({ useHandCursor: true });

    this.backButton.on('pointerdown', () => {
      void this.returnToOffice();
    });

    this.retryButton = this.add
      .text(0, 0, 'TALK TO ALEX', style)
      .setOrigin(1, 1)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.retryButton.on('pointerdown', () => {
      void this.prepareVisit();
    });

    for (const button of [this.backButton, this.retryButton]) {
      button.on('pointerover', () => {
        button.setColor('#ffffff');
      });

      button.on('pointerout', () => {
        button.setColor('#f2d477');
      });
    }

    this.statusText = this.add
      .text(0, 0, '', {
        ...style,
        align: 'center',
        padding: { x: 16, y: 12 }
      })
      .setOrigin(0.5, 0)
      .setDepth(110)
      .setVisible(false);
  }

  layoutStorage() {
    if (this._storageDisposed) return;

    const { width, height } = this.scale;
    const compact = width < 600;

    this.background?.setDisplaySize(width, height);

    this.backButton
      ?.setFontSize(compact ? 14 : 22)
      .setPosition(16, height - 24);

    this.retryButton
      ?.setFontSize(compact ? 14 : 22)
      .setPosition(
        width - 16,
        height - (width < 420 ? 82 : 24)
      );

    this.statusText
      ?.setFontSize(compact ? 17 : 22)
      .setPosition(width / 2, 100)
      .setWordWrapWidth(
        Math.max(120, Math.min(width - 48, 760)),
        true
      );
  }

  showStatus(message) {
    if (!this.isCurrent()) return;

    this.statusText?.setText(message).setVisible(true);
  }

  showRecovery(message, error = null) {
    if (!this.isCurrent()) return;

    this.backButton?.setVisible(true);
    this.retryButton?.setVisible(true);
    this.showStatus(message);

    if (error) {
      console.error('[AgencyStorageScene]', error);
    }
  }

  waitForHudReady(hud) {
    if (hud.isHudReady) {
      return Promise.resolve(true);
    }

    this._cancelHudWait?.();

    return new Promise(resolve => {
      let settled = false;
      let timeout = null;

      const finish = ready => {
        if (settled) return;
        settled = true;

        hud.events.off('hud-ready', onReady);
        timeout?.remove(false);

        if (this._cancelHudWait === cancel) {
          this._cancelHudWait = null;
        }

        resolve(ready);
      };

      const onReady = () => finish(true);
      const cancel = () => finish(false);

      this._cancelHudWait = cancel;
      hud.events.once('hud-ready', onReady);

      timeout = this.time.delayedCall(
        10000,
        () => finish(Boolean(hud.isHudReady))
      );

      if (hud.isHudReady) {
        finish(true);
      }
    });
  }

  showStorageHud() {
    if (!this.storageHud?.isHudReady) return;

    this.storageHud.showHud();
    this.scene.setVisible(true, 'PlayerHudScene');
    this.bringSceneToTopIfActive('PlayerHudScene');
  }

  async prepareVisit() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      this._conversationOpen ||
      this._preparing ||
      this._finishing
    ) {
      return;
    }

    const token = this._storageRunToken;
    let prepared = false;

    this._preparing = true;
    this.retryButton?.setVisible(false);
    this.showStatus('Alex is locating your paperwork...');

    try {
      if (!this.showManagerBackground()) {
        throw new Error(
          `Missing image "${MANAGER_STORAGE_KEY}". ` +
          'Check the office manifest and storage scene bundle.'
        );
      }

      if (!this.textures.exists(MANAGER_PORTRAIT_KEY)) {
        console.warn(
          `[AgencyStorageScene] Missing portrait "${MANAGER_PORTRAIT_KEY}".`,
          MANAGER_PORTRAIT_URL
        );
      }

      await ItemsLoader.load();

      if (!this.isCurrent(token) || this.isLeaving) return;

      this.manualTemplate = ItemsLoader.get(
        'documents',
        'agencyFieldManual'
      );

      if (!this.manualTemplate?.id || !this.manualTemplate?.name) {
        throw new Error(
          'Missing documents.agencyFieldManual ' +
          'in assets/data/ItemsCatalog.json.'
        );
      }

      await this.ensureOverlayScene('UIScene');

      if (!this.isCurrent(token) || this.isLeaving) return;

      const hud = await this.restorePlayerHud();

      if (!this.isCurrent(token) || this.isLeaving) return;

      if (!hud) {
        throw new Error('PlayerHudScene is unavailable.');
      }

      const ready = await this.waitForHudReady(hud);

      if (!this.isCurrent(token) || this.isLeaving) return;

      if (!ready) {
        throw new Error(
          'PlayerHudScene did not finish initialising.'
        );
      }

      hud.closeAllUIPanels?.();
      hud.setCurrentGameplayScene?.('AgencyStorageScene');

      const manager = await hud.ensurePanel('dialogManager');

      if (!this.isCurrent(token) || this.isLeaving) return;

      if (!manager?.dialogUI || manager.dialogUI.destroyed) {
        throw new Error('DialogUI could not be created.');
      }

      this.storageHud = hud;
      this.storageDialog = manager.dialogUI;

      const news = await this.ensureOverlayScene('NewsHud');

      if (!this.isCurrent(token) || this.isLeaving) return;

      news?.events?.emit('setNewspaperVisible', false);
      news?.events?.emit('setTvVisible', false);

      this.showStorageHud();
      this.statusText?.setVisible(false);

      prepared = true;
    } catch (error) {
      if (this.isCurrent(token) && !this.isLeaving) {
        this.showRecovery(
          `Storage error: ${error.message || String(error)}`,
          error
        );
      }
    } finally {
      if (this._storageRunToken === token) {
        this._preparing = false;
      }
    }

    if (prepared && this.isCurrent(token) && !this.isLeaving) {
      this.startConversation();
    }
  }

  startConversation() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      this._preparing ||
      this._conversationOpen ||
      this._finishing ||
      !this.manualTemplate
    ) {
      return false;
    }

    const hud = this.storageHud;
    const dialog = this.storageDialog;

    if (
      !hud?.isHudReady ||
      !dialog ||
      dialog.destroyed ||
      dialog.isOpen
    ) {
      this.showRecovery(
        'The conversation is not ready. Try TALK TO ALEX.'
      );

      return false;
    }

    const token = this._storageRunToken;
    const alreadyHasManual = this.hasInventoryItem(
      this.manualTemplate.id
    );

    this._conversationOpen = true;
    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);
    this.statusText?.setVisible(false);

    try {
      this.showManagerBackground();
      this.showStorageHud();

      dialog.open(
        {
          speaker: 'Alex Murphy',
          portraitKey: MANAGER_PORTRAIT_KEY,
          lines: [
            ...(alreadyHasManual ? RETURN_LINES : INTRO_LINES)
          ]
        },
        {
          onClose: () => {
            if (
              !this.isCurrent(token) ||
              !this._conversationOpen ||
              this.isLeaving
            ) {
              return;
            }

            this._conversationOpen = false;
            void this.finishConversation();
          }
        }
      );

      return true;
    } catch (error) {
      this._conversationOpen = false;

      this.showRecovery(
        `Conversation error: ${error.message || String(error)}`,
        error
      );

      return false;
    }
  }

  async finishConversation() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      this._finishing ||
      !this.manualTemplate
    ) {
      return;
    }

    this._finishing = true;

    const token = this._storageRunToken;
    let received = false;

    try {
      if (!this.hasInventoryItem(this.manualTemplate.id)) {
        const added = this.addInventoryItem(
          structuredClone(this.manualTemplate)
        );

        if (!added) {
          this.showRecovery(
            '"Your pockets are full. Come back with room for a book. ' +
            'Preferably before you need the chapter on emergencies."'
          );
          return;
        }
      }

      if (!this.hasInventoryItem(this.manualTemplate.id)) {
        throw new Error('The manual was not added to inventory.');
      }

      this.completeStorageTutorialVisit();

      if (!saveGameState()) {
        console.warn(
          '[AgencyStorageScene] Manual received, but save failed.'
        );
      }

      received = true;
    } catch (error) {
      this.showRecovery(
        `Manual error: ${error.message || String(error)}`,
        error
      );
    } finally {
      if (this._storageRunToken === token) {
        this._finishing = false;
      }
    }

    if (received && this.isCurrent(token)) {
      await this.returnToOffice();
    }
  }

  async returnToOffice() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      this._conversationOpen ||
      this._finishing
    ) {
      return false;
    }

    const token = this._storageRunToken;

    this.isLeaving = true;
    this._cancelHudWait?.();

    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);

    let result = false;

    try {
      audioManager.playSfx('click_sound');
      this.storageHud?.closeAllUIPanels?.();

      result = await this.goto('OfficeScene', {
        gameState: this.gameState
      });
    } catch (error) {
      console.error(
        '[AgencyStorageScene] Return to office failed:',
        error
      );
    }

    if (!this.isCurrent(token)) {
      return result !== false;
    }

    this.isLeaving = false;

    if (result === false) {
      this.showRecovery(
        'The office could not be opened. Try BACK TO OFFICE.'
      );
    }

    return result !== false;
  }

  onWakeOrResume() {
    if (!this.isCurrent() || this.isLeaving) return;

    this.showManagerBackground();
    this.layoutStorage();

    if (this._conversationOpen) {
      this.showStorageHud();
      return;
    }

    if (!this._preparing && !this._finishing) {
      this.schedulePreparation();
    }
  }

  cleanupStorage() {
    if (this._storageDisposed) return;

    this._storageDisposed = true;
    this._storageRunToken = null;
    this._conversationOpen = false;
    this._preparing = false;
    this._finishing = false;

    this._prepareTimer?.remove(false);
    this._prepareTimer = null;

    this._cancelHudWait?.();
    this._cancelHudWait = null;

    if (this.storageDialog) {
      this.storageDialog.onClose = null;
      this.storageDialog.close?.();
    }

    this.scale.off('resize', this.layoutStorage, this);

    for (const [event, callback] of [
      [Phaser.Scenes.Events.WAKE, this.onWakeOrResume],
      [Phaser.Scenes.Events.RESUME, this.onWakeOrResume],
      [Phaser.Scenes.Events.SHUTDOWN, this.cleanupStorage],
      [Phaser.Scenes.Events.DESTROY, this.cleanupStorage]
    ]) {
      this.events.off(event, callback, this);
    }

    this.backButton?.removeAllListeners();
    this.retryButton?.removeAllListeners();

    this.background = null;
    this.backButton = null;
    this.retryButton = null;
    this.statusText = null;
    this.manualTemplate = null;
    this.storageHud = null;
    this.storageDialog = null;
  }
}