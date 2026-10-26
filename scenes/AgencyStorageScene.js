import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { ItemsLoader } from '../ItemsLoader.js';
import { audioManager } from '../managers/AudioManager.js';
import { saveGameState } from '../gameStatePersistence.js';

const BACKGROUND_KEY = 'agency_storage_room_v2';
const MANAGER_KEY = 'agency_storage_manager';

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

    this.isLeaving = false;
    this._conversationOpen = false;
    this._uiReady = false;
    this._preparing = false;

    this._storageDisposed = false;
    this._storageRunToken = Symbol('storage-run');
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

    if (this.textures.exists(BACKGROUND_KEY)) {
      this.background = this.add
        .image(0, 0, BACKGROUND_KEY)
        .setOrigin(0)
        .setDepth(0);
    } else {
      console.error(
        '[AgencyStorageScene] Missing background. ' +
        'Check office.json and the scene bundle in index.json.'
      );
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

    void this.prepareVisit();
  }

  isCurrent(token = this._storageRunToken) {
    return (
      !this._storageDisposed &&
      this._storageRunToken === token &&
      this.sys.isActive()
    );
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
      if (!this._uiReady || !this.manualTemplate) {
        void this.prepareVisit();
        return;
      }

      this.startConversation();
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

    this.statusText
      ?.setText(message)
      .setVisible(true);
  }

  canInteract() {
    return (
      this.isCurrent() &&
      !this.isLeaving &&
      !this._conversationOpen &&
      !this._preparing &&
      !this.getPlayerHudScene()?.isAnyPanelOpen?.()
    );
  }

  async prepareVisit() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      this._conversationOpen ||
      this._preparing
    ) {
      return;
    }

    const token = this._storageRunToken;

    this._preparing = true;
    this.retryButton?.setVisible(false);
    this.statusText?.setVisible(false);

    try {
      await ItemsLoader.load();

      if (!this.isCurrent(token) || this.isLeaving) return;

      this.manualTemplate = ItemsLoader.get(
        'documents',
        'agencyFieldManual'
      );

      if (!this.manualTemplate?.id || !this.manualTemplate?.name) {
        throw new Error(
          'Missing documents.agencyFieldManual in ItemsCatalog.json.'
        );
      }

      if (!this.textures.exists(BACKGROUND_KEY)) {
        throw new Error(
          `Missing manifest image: ${BACKGROUND_KEY}`
        );
      }

      if (!this.textures.exists(MANAGER_KEY)) {
        throw new Error(
          `Missing manifest image: ${MANAGER_KEY}`
        );
      }

      await this.ensureOverlayScene('UIScene');

      if (!this.isCurrent(token) || this.isLeaving) return;

      const hud = await this.restorePlayerHud();

      if (!this.isCurrent(token) || this.isLeaving) return;

      if (!hud) {
        throw new Error('Player HUD could not be restored.');
      }

      hud.closeAllUIPanels?.();
      hud.setCurrentGameplayScene?.('AgencyStorageScene');

      const news = await this.ensureOverlayScene('NewsHud');

      if (!this.isCurrent(token) || this.isLeaving) return;

      news?.events?.emit('setNewspaperVisible', false);
      news?.events?.emit('setTvVisible', false);

      this._uiReady = true;
    } catch (error) {
      if (this.isCurrent(token)) {
        this._uiReady = false;
        this.retryButton?.setVisible(true);

        this.showStatus(
          'Storage could not be prepared. ' +
          'Check the item catalogue and scene manifests, then try again.'
        );

        console.error(
          '[AgencyStorageScene] Preparation failed:',
          error
        );
      }
    } finally {
      if (this._storageRunToken === token) {
        this._preparing = false;
      }
    }

    if (
      this.isCurrent(token) &&
      !this.isLeaving &&
      this._uiReady
    ) {
      this.startConversation();
    }
  }

  startConversation() {
    if (
      !this._uiReady ||
      !this.manualTemplate ||
      !this.canInteract()
    ) {
      return false;
    }

    const dialog =
      this.getPlayerHudScene()?.dialogManager?.dialogUI;

    if (!dialog || dialog.destroyed || dialog.isOpen) {
      this.retryButton?.setVisible(true);

      this.showStatus(
        'The conversation could not be opened. Try TALK TO ALEX.'
      );

      return false;
    }

    const token = this._storageRunToken;
    const alreadyHasManual = this.hasInventoryItem(
      this.manualTemplate.id
    );

    this._conversationOpen = true;

    this.statusText?.setVisible(false);
    this.retryButton?.setVisible(false);
    this.backButton?.setVisible(false);

    try {
      dialog.open(
        {
          speaker: 'Alex Murphy',
          portraitKey: MANAGER_KEY,
          lines: [
            ...(alreadyHasManual ? RETURN_LINES : INTRO_LINES)
          ]
        },
        {
          onClose: () => {
            if (
              !this.isCurrent(token) ||
              !this._conversationOpen
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

      this.backButton?.setVisible(true);
      this.retryButton?.setVisible(true);

      this.showStatus(
        'The conversation could not be opened. Nothing was issued.'
      );

      console.error(
        '[AgencyStorageScene] Conversation failed:',
        error
      );

      return false;
    }
  }

  async finishConversation() {
    if (
      !this.isCurrent() ||
      this.isLeaving ||
      !this.manualTemplate
    ) {
      return;
    }

    if (!this.hasInventoryItem(this.manualTemplate.id)) {
      const added = this.addInventoryItem(
        structuredClone(this.manualTemplate)
      );

      if (!added) {
        this.backButton?.setVisible(true);
        this.retryButton?.setVisible(true);

        this.showStatus(
          '"Your pockets are full. Come back with room for a book. ' +
          'Preferably before you need the chapter on emergencies."'
        );

        return;
      }
    }

    if (!saveGameState()) {
      console.warn(
        '[AgencyStorageScene] Manual is in inventory, ' +
        'but automatic saving is unavailable.'
      );
    }

    await this.returnToOffice();
  }

  async returnToOffice() {
    if (!this.canInteract()) return false;

    const token = this._storageRunToken;

    this.isLeaving = true;

    this.backButton?.setVisible(false);
    this.retryButton?.setVisible(false);

    audioManager.playSfx('click_sound');

    this.getPlayerHudScene()?.closeAllUIPanels?.();

    const result = await this.goto('OfficeScene', {
      gameState: this.gameState
    });

    if (!this.isCurrent(token)) {
      return result !== false;
    }

    this.isLeaving = false;

    if (result === false) {
      this.backButton?.setVisible(true);

      this.showStatus(
        'The office could not be opened. ' +
        'Try BACK TO OFFICE. Any collected manual remains in inventory.'
      );
    }

    return result !== false;
  }

  onWakeOrResume() {
    if (!this.isCurrent()) return;

    this.isLeaving = false;
    this.layoutStorage();

    if (!this._conversationOpen) {
      void this.prepareVisit();
    }
  }

  cleanupStorage() {
    if (this._storageDisposed) return;

    this._storageDisposed = true;
    this._storageRunToken = null;
    this._conversationOpen = false;
    this._uiReady = false;
    this._preparing = false;

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
  }
}