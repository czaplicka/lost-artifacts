import { audioManager } from '../managers/AudioManager.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { FirstCaseTutorial } from '../FirstCaseTutorial.js';
import { AgencyLedgerUI } from '../ui/AgencyLedgerUI.js';
import { flushAutosave } from '../gameStatePersistence.js';

import { OfficeNavigation } from './office/OfficeNavigation.js';
import { OfficeHotspotManager } from './office/OfficeHotspotManager.js';
import {
  createOfficeHotspotDefinitions
} from './office/officeHotspots.js';

const OFFICE_BACKGROUND_KEYS = [
  'elevator_broken',
  'elevator_open',
  'backgroundhi',
  'backgroundoff',
  'backgroundset'
];

const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

export class OfficeScene extends BaseScene {
  constructor() {
    super({ key: 'OfficeScene' });

    this.currentView = 'office';

    this.viewPositions = {};
    this.rooms = {};
    this.roomOrder = [];
    this.totalWidth = 0;

    this.navigation = null;
    this.hotspotManager = null;

    this.DEBUG_HOTSPOTS = false;

    this.saveUI = null;
    this.officeAmbient = null;
    this.agencyLedgerUI = null;

    this.archiveButton = null;
    this.storageButton = null;

    this.uiLocked = false;

    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;
    this.isOpeningArchive = false;
    this.isOpeningStorage = false;
    this.isRestoringOfficeUi = false;

    this.startOnboarding = false;
    this.firstCaseTutorial = null;

    this.elevatorBackground = null;

    this._runToken = null;
    this._uiLayersPromise = null;
    this._tutorialStartTimer = null;
    this._playerHud = null;

    this.onFirstMissionCompletedBound =
      this.onFirstMissionCompleted.bind(this);

    this.onFirstCaseTutorialFinishedBound =
      this.onFirstCaseTutorialFinished.bind(this);

    this.onFirstMissionSuccessBound =
      this.onFirstMissionSuccess.bind(this);
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;

    this.fromSave = data.fromSave ?? false;
    this.saveSlotKey = data.saveSlotKey ?? null;
    this.isNewGame = data.isNewGame === true;

    this.startOnboarding =
      data.startOnboarding === true ||
      this.isNewGame;

    this.currentView = 'office';
    this.uiLocked = false;

    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;
    this.isOpeningArchive = false;
    this.isOpeningStorage = false;
    this.isRestoringOfficeUi = false;

    this.navigation = null;
    this.hotspotManager = null;
    this.agencyLedgerUI = null;
    this.saveUI = null;
    this.officeAmbient = null;
    this.firstCaseTutorial = null;

    this.archiveButton = null;
    this.storageButton = null;
    this.elevatorBackground = null;

    this._playerHud = null;
    this._uiLayersPromise = null;
    this._runToken = Symbol('office-run');

    const debugValue = new URLSearchParams(
      window.location.search
    ).get('debug');

    this.DEBUG_HOTSPOTS = LOCAL_DEBUG_ALLOWED && (
      debugValue === '' ||
      debugValue === '1' ||
      debugValue === 'true'
    );

    if (this.isNewGame) {
      this.gameState.onboarding ??= {};

      this.gameState.onboarding.firstCase = {
        active: false,
        step: null,
        completed: false,
        skipped: false,
        walkedToCaseFile: false,
        caseFileOpened: false,
        routeOpened: false,
        travelStarted: false,
        missionCompleted: false,
        successCount: 0
      };

      this.gameState.progress ??= {};
      this.gameState.progress.firstMissionSuccess = false;
    }
  }

  // ------------------------------------------------------------------
  // Assets
  // ------------------------------------------------------------------

  preload() {
    const manifest = this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error('[OfficeScene] assetManifest is missing.');
      return;
    }

    for (const key of OFFICE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) {
        continue;
      }

      const entry = manifest.backgrounds?.find(
        asset => asset.key === key
      );

      if (entry?.url) {
        this.load.image(key, entry.url);
      } else {
        console.error(
          `[OfficeScene] Missing background manifest entry "${key}".`
        );
      }
    }

    if (!this.cache.audio.exists('officescenesound')) {
      const ambient = manifest.audio?.find(
        asset => asset.key === 'officescenesound'
      );

      if (ambient?.url) {
        this.load.audio(ambient.key, ambient.url);
      }
    }

    if (!this.cache.json.exists('monologues')) {
      const monologues = manifest.json?.find(
        asset => asset.key === 'monologues'
      );

      if (monologues?.url) {
        this.load.json(monologues.key, monologues.url);
      }
    }
  }

  create() {
    super.create();

    audioManager.init(this);

    const { width, height } = this.scale;

    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);

    this.registry.set(
      'activeMission',
      this.gameState.currentMission || null
    );

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);

    this.navigation = new OfficeNavigation(this, {
      roomOrder: this.roomOrder,
      viewPositions: this.viewPositions,
      initialView: 'office'
    });

    this.navigation.create();

    this.agencyLedgerUI = new AgencyLedgerUI(this);

    this.hotspotManager = new OfficeHotspotManager(this, {
      debugEnabled: this.DEBUG_HOTSPOTS
    });

    this.hotspotManager.create(
      createOfficeHotspotDefinitions(this)
    );

    this.createArchiveButton();
    this.createStorageButton();
    this.createSaveControls();
    this.createFirstCaseTutorial();

    this.monologue?.startIdle('idle.office');

    this.setupAudioUnlock();
    this.playOfficeAmbient();

    this.navigation.goTo('office', false);
    this.navigation.showIntroHint();

    if (this.input.keyboard) {
      this.trackInputEvent(
        this.input.keyboard,
        'keydown-LEFT',
        () => {
          if (!this.uiLocked) {
            this.navigation?.moveLeft();
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-RIGHT',
        () => {
          if (!this.uiLocked) {
            this.navigation?.moveRight();
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-L',
        this.openCrimeLabHotkey
      );
    }

    this.onBus(
      'firstMissionCompleted',
      this.onFirstMissionCompletedBound
    );

    this.onBus(
      'firstMissionSuccess',
      this.onFirstMissionSuccessBound
    );

    this.onBus(
      'firstCaseTutorialFinished',
      this.onFirstCaseTutorialFinishedBound
    );

    this.onBus(
      'hud:panel-state-changed',
      this.onHudPanelStateChanged
    );

    this._bindOfficeEvents();
    this.refreshPanelLock();

    void this.setupOfficeUiLayers({
      closePanels: true
    });
  }

  _bindOfficeEvents() {
    const bindings = [
      [Phaser.Scenes.Events.WAKE, this.onWakeOrResume],
      [Phaser.Scenes.Events.RESUME, this.onWakeOrResume],
      [Phaser.Scenes.Events.SLEEP, this.onSleep],
      ['ui-panel-state-changed', this.refreshPanelLock]
    ];

    for (const [event, callback] of bindings) {
      this.events.off(event, callback, this);
      this.events.on(event, callback, this);
    }

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupScene,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanupScene,
      this
    );
  }

  // ------------------------------------------------------------------
  // Archive and storage entrances
  // ------------------------------------------------------------------

  isOfficeTutorialBlocking() {
    const tutorialState = this.gameState.onboarding?.firstCase;

    if (
      tutorialState?.completed === true ||
      tutorialState?.skipped === true
    ) {
      return false;
    }

    return Boolean(
      this.startOnboarding ||
      tutorialState?.active === true ||
      this.firstCaseTutorial?.isActive()
    );
  }

  hasFirstMissionSuccess() {
    const firstCase = this.gameState.onboarding?.firstCase;

    return Boolean(
      this.gameState.firstMissionSuccess ||
      this.gameState.progress?.firstMissionSuccess ||
      firstCase?.successCount >= 1 ||
      firstCase?.successes >= 1
    );
  }

  isArchiveBlocked() {
    return Boolean(
      this.uiLocked ||
      this.isOfficeTutorialBlocking()
    );
  }

  isStorageBlocked() {
    return Boolean(
      this.isArchiveBlocked() ||
      !this.hasFirstMissionSuccess()
    );
  }

  createEntranceButton(y, label, action, isBlocked) {
    const button = this.add
      .text(24, y, label, {
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
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive({
        useHandCursor: true
      });

    button.on('pointerover', () => {
      if (!isBlocked()) {
        button.setColor('#ffffff');
      }
    });

    button.on('pointerout', () => {
      this.refreshEntranceButtons();
    });

    button.on('pointerdown', () => {
      void action();
    });

    return button;
  }

  createArchiveButton() {
    this.archiveButton = this.createEntranceButton(
      170,
      'ARCHIVE >',
      () => this.openArchive(),
      () => this.isArchiveBlocked()
    );
  }

  createStorageButton() {
    this.storageButton = this.createEntranceButton(
      230,
      'STORAGE >',
      () => this.openStorage(),
      () => this.isStorageBlocked()
    );
  }

  refreshEntranceButtons() {
    const archiveBlocked = this.isArchiveBlocked();
    const storageBlocked = this.isStorageBlocked();

    if (this.archiveButton?.input) {
      this.archiveButton.input.enabled = !archiveBlocked;
      this.archiveButton.setAlpha(archiveBlocked ? 0.45 : 1);
      this.archiveButton.setColor(
        archiveBlocked ? '#8b8475' : '#f2d477'
      );
    }

    if (this.storageButton?.input) {
      this.storageButton.input.enabled = !storageBlocked;
      this.storageButton.setAlpha(storageBlocked ? 0.45 : 1);
      this.storageButton.setColor(
        storageBlocked ? '#8b8475' : '#f2d477'
      );
    }
  }

  async _openOfficeRoom(sceneKey, flagName, roomName) {
    if (
      this._cleanupDone ||
      !this.sys.isActive() ||
      this[flagName]
    ) {
      return false;
    }

    this.refreshPanelLock();

    if (this.uiLocked) {
      return false;
    }

    if (this.isOfficeTutorialBlocking()) {
      this.showOfficeStatusMessage(
        'Finish your introduction before visiting other rooms.'
      );
      return false;
    }

    if (
      sceneKey === 'AgencyStorageScene' &&
      !this.hasFirstMissionSuccess()
    ) {
      this.showOfficeStatusMessage(
        'Storage access requires one successful mission.'
      );
      return false;
    }

    const token = this._runToken;

    this[flagName] = true;
    this.refreshPanelLock();

    this.navigation?.hideHint();
    audioManager.playSfx('click_sound');

    flushAutosave();

    try {
      const result = await this.goto(sceneKey, {
        gameState: this.gameState
      });

      if (
        this._runToken === token &&
        !this._cleanupDone &&
        this.sys.isActive()
      ) {
        this[flagName] = false;
        this.refreshPanelLock();

        if (result === false) {
          this.showOfficeStatusMessage(
            `The ${roomName} could not be opened.`
          );
        }
      }

      return result !== false;
    } catch (error) {
      if (
        this._runToken === token &&
        !this._cleanupDone
      ) {
        this[flagName] = false;
        this.refreshPanelLock();

        this.showOfficeStatusMessage(
          `The ${roomName} could not be opened.`
        );

        console.error(
          `[OfficeScene] Failed to open ${sceneKey}:`,
          error
        );
      }

      return false;
    }
  }

  openArchive() {
    return this._openOfficeRoom(
      'ArchiveScene',
      'isOpeningArchive',
      'archive'
    );
  }

  openStorage() {
    return this._openOfficeRoom(
      'AgencyStorageScene',
      'isOpeningStorage',
      'storage room'
    );
  }

  // ------------------------------------------------------------------
  // Panel locking
  // ------------------------------------------------------------------

  onHudPanelStateChanged() {
    if (!this._cleanupDone) {
      this.refreshPanelLock();
    }
  }

  refreshPanelLock() {
    if (this._cleanupDone) {
      return;
    }

    const hud = this.getPlayerHud();

    const locked = Boolean(
      hud?.isAnyPanelOpen?.() ||
      this.saveUI?.isOpen ||
      this.agencyLedgerUI?.isOpen ||
      this.isOpeningCrimeLab ||
      this.isOpeningRecoveredArtifacts ||
      this.isOpeningWantedDatabase ||
      this.isOpeningArchive ||
      this.isOpeningStorage
    );

    this.applyLock(locked);
  }

  applyLock(locked) {
    this.uiLocked = Boolean(locked);

    this.hotspotManager?.setLocked(this.uiLocked);
    this.navigation?.setLocked(this.uiLocked);
    this.saveUI?.setLocked(this.uiLocked);

    this.refreshEntranceButtons();
  }

  getPlayerHud() {
    if (
      this._playerHud?.isHudReady &&
      this.isSceneActive('PlayerHudScene')
    ) {
      return this._playerHud;
    }

    this._playerHud = this.getPlayerHudScene();

    return this._playerHud;
  }

  // ------------------------------------------------------------------
  // HUD layers
  // ------------------------------------------------------------------

  setupOfficeUiLayers({ closePanels = false } = {}) {
    if (this._cleanupDone) {
      return Promise.resolve(false);
    }

    if (this._uiLayersPromise) {
      return this._uiLayersPromise;
    }

    const token = this._runToken;

    const isCurrent = () => (
      !this._cleanupDone &&
      this._runToken === token &&
      this.sys.isActive()
    );

    const request = (async () => {
      try {
        const uiScene = await this.ensureOverlayScene('UIScene');

        if (!isCurrent()) {
          return false;
        }

        const playerHud = await this.restorePlayerHud();

        if (!isCurrent()) {
          return false;
        }

        if (playerHud) {
          this._playerHud = playerHud;

          if (closePanels) {
            playerHud.closeAllUIPanels?.();
          }

          playerHud.setCurrentGameplayScene?.('OfficeScene');
        } else {
          console.warn(
            '[OfficeScene] PlayerHudScene could not be restored.'
          );
        }

        await this.setupNewsHud();

        if (!isCurrent()) {
          return false;
        }

        if (uiScene) {
          const visible = !this.agencyLedgerUI?.isOpen;

          EventBus.emit(visible ? 'showHUD' : 'hideHUD');

          this.game.events.emit('setHudVisible', visible);
        }

        this.refreshPanelLock();

        return true;
      } catch (error) {
        if (this._runToken === token) {
          console.error(
            '[OfficeScene] Failed to set up UI layers:',
            error
          );
        }

        return false;
      }
    })();

    this._uiLayersPromise = request;
    this.isRestoringOfficeUi = true;

    void request.finally(() => {
      if (this._uiLayersPromise === request) {
        this._uiLayersPromise = null;
        this.isRestoringOfficeUi = false;
      }
    });

    return request;
  }

  async setupNewsHud() {
    const token = this._runToken;

    const newsHud = await this.ensureOverlayScene('NewsHud');

    if (
      !newsHud ||
      this._cleanupDone ||
      this._runToken !== token ||
      !this.sys.isActive()
    ) {
      return false;
    }

    newsHud.events?.emit('setNewspaperVisible', true);
    newsHud.events?.emit('setTvVisible', true);

    this.bringSceneToTopIfActive('NewsHud');

    return true;
  }

  onFirstCaseTutorialFinished() {
    this.startOnboarding = false;

    if (this._cleanupDone) {
      return;
    }

    this.refreshEntranceButtons();

    if (!this.sys.isActive()) {
      return;
    }

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();

    void this.setupOfficeUiLayers();
  }

  // ------------------------------------------------------------------
  // Backgrounds and navigation
  // ------------------------------------------------------------------

  createBackgrounds(gameWidth, gameHeight) {
    const completed = this.hasCompletedFirstMission();

    const background = (x, key) =>
      this.add.image(x, 0, key)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth, gameHeight);

    const elevatorBg = background(
      -gameWidth,
      completed ? 'elevator_open' : 'elevator_broken'
    );

    const storageBg = background(0, 'backgroundhi');
    const officeBg = background(gameWidth, 'backgroundoff');
    const cabinetBg = background(gameWidth * 2, 'backgroundset');

    this.elevatorBackground = elevatorBg;

    this.rooms = {
      elevator: {
        key: 'elevator',
        bg: elevatorBg,
        x: -gameWidth,
        width: gameWidth
      },
      storage: {
        key: 'storage',
        bg: storageBg,
        x: 0,
        width: gameWidth
      },
      office: {
        key: 'office',
        bg: officeBg,
        x: gameWidth,
        width: gameWidth
      },
      cabinet: {
        key: 'cabinet',
        bg: cabinetBg,
        x: gameWidth * 2,
        width: gameWidth
      }
    };

    this.roomOrder = [
      'elevator',
      'storage',
      'office',
      'cabinet'
    ];

    this.totalWidth = gameWidth * this.roomOrder.length;

    this.viewPositions = Object.fromEntries(
      this.roomOrder.map(key => [
        key,
        this.rooms[key].x
      ])
    );
  }

  createCameraSetup(height) {
    this.cameras.main.setBounds(
      this.rooms.elevator.x,
      0,
      this.totalWidth,
      height
    );
  }

  // ------------------------------------------------------------------
  // Tutorial and mission progress
  // ------------------------------------------------------------------

  createFirstCaseTutorial() {
    const tutorialState = this.gameState.onboarding?.firstCase;

    if (
      !this.startOnboarding ||
      tutorialState?.completed === true ||
      tutorialState?.skipped === true
    ) {
      this.refreshEntranceButtons();
      return;
    }

    this.firstCaseTutorial?.destroy();

    this.firstCaseTutorial = new FirstCaseTutorial(
      this,
      this.gameState
    );

    for (const hotspot of this.hotspotManager?.hotspots ?? []) {
      const id = hotspot?.hotspotData?.id;

      if (id) {
        this.firstCaseTutorial.registerHotspot(id, hotspot);
      }
    }

    const token = this._runToken;

    this._tutorialStartTimer = this.time.delayedCall(
      100,
      () => {
        this._tutorialStartTimer = null;

        if (
          !this._cleanupDone &&
          this._runToken === token &&
          this.sys.isActive()
        ) {
          this.firstCaseTutorial?.start();
          this.refreshEntranceButtons();
        }
      }
    );

    this.refreshEntranceButtons();
  }

  notifyTutorialOfficeReached() {
    if (
      !this.firstCaseTutorial?.isActive() ||
      this.firstCaseTutorial.getStep() !== 'walk_to_case_file'
    ) {
      return;
    }

    const data = this.hotspotManager
      ?.findById('cabinet-casefile')
      ?.hotspotData;

    if (data) {
      this.firstCaseTutorial.onPlayerPositionChanged(
        data.x + data.width / 2,
        data.y + data.height / 2
      );
    }
  }

  hasCompletedFirstMission() {
    return Boolean(
      this.gameState.firstMissionCompleted ||
      this.gameState.progress?.firstMissionCompleted ||
      this.gameState.story?.firstMissionCompleted ||
      this.gameState.onboarding?.firstCase?.missionCompleted
    );
  }

  refreshMissionProgressVisuals() {
    const completed = this.hasCompletedFirstMission();

    const elevatorTexture = completed
      ? 'elevator_open'
      : 'elevator_broken';

    if (
      this.elevatorBackground &&
      this.elevatorBackground.texture?.key !== elevatorTexture
    ) {
      this.elevatorBackground.setTexture(elevatorTexture);

      this.elevatorBackground.setDisplaySize(
        this.rooms.elevator.width,
        this.scale.height
      );
    }

    this.hotspotManager?.refreshAvailability?.();
    this.refreshEntranceButtons();
  }

  onFirstMissionCompleted() {
    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionCompleted = true;

    this.refreshMissionProgressVisuals();

    if (this.sys.isActive()) {
      this.showOfficeStatusMessage(
        'The elevator opens. An unexpected victory for maintenance.'
      );
    }
  }

  onFirstMissionSuccess() {
    if (this._cleanupDone) {
      return;
    }

    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionSuccess = true;

    this.refreshEntranceButtons();

    if (this.sys.isActive()) {
      this.showOfficeStatusMessage(
        'Storage access granted. Try not to get lost in there.'
      );
    }
  }

  showOfficeStatusMessage(message) {
    if (!message || this._cleanupDone) {
      return;
    }

    const { width } = this.scale;

    const text = this.add.text(
      width / 2,
      115,
      message,
      {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#f2d477',
        align: 'center',
        backgroundColor: '#17110e',
        padding: {
          left: 14,
          right: 14,
          top: 10,
          bottom: 10
        },
        wordWrap: {
          width: Math.min(width - 80, 760)
        }
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0);

    this.createTrackedTween({
      targets: text,
      alpha: 1,
      duration: 250,
      yoyo: true,
      hold: 2600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (text.active) {
          text.destroy();
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // Save and audio
  // ------------------------------------------------------------------

  createSaveControls() {
    try {
      this.saveUI = new OfficeSaveUI(this, {
        locationType: 'office',
        locationCode: 'agency_headquarters',
        cityCode: 'hq'
      });

      this.saveUI.createButton();
    } catch (error) {
      console.error(
        '[OfficeScene] Save controls could not be created:',
        error
      );

      this.saveUI = null;
    }
  }

  setupAudioUnlock() {
    const unlock = () => {
      this.offTrackedInputEvent(
        this.input,
        'pointerdown',
        unlock
      );

      const resume =
        this.sound?.context?.state === 'suspended'
          ? this.sound.context.resume()
          : null;

      if (resume?.catch) {
        void resume.catch(error => {
          console.warn(
            '[OfficeScene] Audio unlock failed:',
            error
          );
        });
      }

      this.playOfficeAmbient();
    };

    this.trackInputEvent(
      this.input,
      'pointerdown',
      unlock
    );
  }

  playOfficeAmbient() {
    if (
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return null;
    }

    if (this.officeAmbient?.isPlaying) {
      return this.officeAmbient;
    }

    audioManager.init(this);

    this.officeAmbient = audioManager.playAmbient(
      'officescenesound',
      { loop: true }
    );

    return this.officeAmbient;
  }

  _stopOfficeAmbient() {
    const sound = this.officeAmbient;
    this.officeAmbient = null;

    if (sound) {
      audioManager._destroySound(sound);
    }
  }

  // ------------------------------------------------------------------
  // Overlay scenes
  // ------------------------------------------------------------------

  openCrimeLabHotkey() {
    void this.openCrimeLab();
  }

  async _openOfficeOverlay(sceneKey, flagName) {
    if (
      this._cleanupDone ||
      this.uiLocked ||
      this.agencyLedgerUI?.isOpen ||
      this[flagName]
    ) {
      return false;
    }

    const token = this._runToken;

    this[flagName] = true;
    this.refreshPanelLock();

    this.navigation?.hideHint();

    if (sceneKey === 'CrimeLabScene') {
      audioManager.playSfx('click_sound');
    }

    flushAutosave();

    const opened = await this.launchOverlay(
      sceneKey,
      {
        gameState: this.gameState,
        returnScene: 'OfficeScene'
      }
    );

    if (
      this._cleanupDone ||
      this._runToken !== token
    ) {
      return false;
    }

    if (opened && this.sys.isActive()) {
      this.scene.pause();
      return true;
    }

    this[flagName] = false;
    this.refreshPanelLock();

    return false;
  }

  openCrimeLab() {
    return this._openOfficeOverlay(
      'CrimeLabScene',
      'isOpeningCrimeLab'
    );
  }

  openRecoveredArtifacts() {
    return this._openOfficeOverlay(
      'RecoveredArtifactsScene',
      'isOpeningRecoveredArtifacts'
    );
  }

  openWantedDatabase() {
    return this._openOfficeOverlay(
      'WantedDatabaseScene',
      'isOpeningWantedDatabase'
    );
  }

  // ------------------------------------------------------------------
  // HUD panels
  // ------------------------------------------------------------------

  openCasefile() {
    const panel = this.getPlayerHud()?.caseFileUI;

    if (!panel) {
      console.warn('[OfficeScene] Case File is unavailable.');
      return;
    }

    this.closeAllUIPanels();

    const mission = this.gameState.currentMission || {};

    panel.open({
      artifact: mission.artifact || 'UNKNOWN ARTIFACT',
      city: mission.city || 'UNKNOWN CITY',
      country: mission.country || 'UNKNOWN COUNTRY',
      description:
        mission.description || 'No case description available.',
      significance: mission.significance || '',
      clue: mission.clue || '',
      artifactKey: mission.artifactKey || ''
    });

    this.firstCaseTutorial?.onCaseFileOpened();
    this.refreshPanelLock();
  }

  openNotes() {
    const panel = this.getPlayerHud()?.notesUI;

    if (!panel) {
      return;
    }

    this.closeAllUIPanels();
    panel.open(this.gameState);
    this.refreshPanelLock();
  }

  openDestinations() {
    const panel = this.getPlayerHud()?.destinationsUI;

    if (!panel) {
      return;
    }

    this.closeAllUIPanels();
    panel.open(this.gameState);

    this.firstCaseTutorial?.onDestinationMapOpened();

    this.refreshPanelLock();
  }

  openWarrant() {
    const panel = this.getPlayerHud()?.warrantUI;

    if (!panel) {
      return;
    }

    this.closeAllUIPanels();
    panel.open(this.gameState);
    this.refreshPanelLock();
  }

  openCrimeBoard() {
    const hud = this.getPlayerHud();

    if (!hud) {
      return;
    }

    this.closeAllUIPanels();
    hud.openCrimeBoard();
    this.refreshPanelLock();
  }

  openAtlas() {
    const panel = this.getPlayerHud()?.atlasUI;

    if (!panel) {
      return;
    }

    this.closeAllUIPanels();

    const mission = this.gameState.currentMission || {};

    panel.open({
      country: mission.country || '',
      city: mission.city || '',
      artifact: mission.artifact || '',
      gameState: this.gameState
    });

    this.refreshPanelLock();
  }

  closeAllUIPanels() {
    this.agencyLedgerUI?.close();
    this.getPlayerHud()?.closeAllUIPanels?.();
    this.refreshPanelLock();
  }

  // ------------------------------------------------------------------
  // Wake, resume and cleanup
  // ------------------------------------------------------------------

  onWakeOrResume() {
    if (this._cleanupDone) {
      return;
    }

    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;
    this.isOpeningArchive = false;
    this.isOpeningStorage = false;

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();

    this.playOfficeAmbient();

    void this.setupOfficeUiLayers();
  }

  onSleep() {
    flushAutosave();

    this.agencyLedgerUI?.close({
      restoreHud: false
    });

    this.navigation?.hideHint();
    this._stopOfficeAmbient();
  }

  cleanupScene() {
    flushAutosave();

    this._runToken = null;

    this._tutorialStartTimer?.remove(false);
    this._tutorialStartTimer = null;

    this._uiLayersPromise = null;
    this.isRestoringOfficeUi = false;

    const bindings = [
      [Phaser.Scenes.Events.WAKE, this.onWakeOrResume],
      [Phaser.Scenes.Events.RESUME, this.onWakeOrResume],
      [Phaser.Scenes.Events.SLEEP, this.onSleep],
      ['ui-panel-state-changed', this.refreshPanelLock],
      [Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene],
      [Phaser.Scenes.Events.DESTROY, this.cleanupScene]
    ];

    for (const [event, callback] of bindings) {
      this.events.off(event, callback, this);
    }

    this.saveUI?.destroy();
    this.saveUI = null;

    this.firstCaseTutorial?.destroy();
    this.firstCaseTutorial = null;

    this.hotspotManager?.destroy();
    this.hotspotManager = null;

    this.agencyLedgerUI?.destroy();
    this.agencyLedgerUI = null;

    this.navigation?.destroy();
    this.navigation = null;

    for (const button of [
      this.archiveButton,
      this.storageButton
    ]) {
      button?.removeAllListeners();
      button?.destroy();
    }

    this.archiveButton = null;
    this.storageButton = null;

    this._stopOfficeAmbient();

    this._playerHud = null;
    this.elevatorBackground = null;

    this.rooms = {};
    this.roomOrder = [];
    this.viewPositions = {};

    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;
    this.isOpeningArchive = false;
    this.isOpeningStorage = false;
  }
}