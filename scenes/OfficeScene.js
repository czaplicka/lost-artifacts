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

const OPENING_FLAGS = [
  'isOpeningCrimeLab',
  'isOpeningRecoveredArtifacts',
  'isOpeningWantedDatabase',
  'isOpeningArchive',
  'isOpeningStorage'
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
    this.elevatorBackground = null;

    this.uiLocked = false;
    this.isRestoringOfficeUi = false;
    this.startOnboarding = false;
    this.firstCaseTutorial = null;

    this._runToken = null;
    this._uiLayersPromise = null;
    this._tutorialStartTimer = null;
    this._playerHud = null;
    this._officeDisposed = true;

    this.resetOpeningFlags();

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
      data.startOnboarding === true || this.isNewGame;

    this.currentView = 'office';
    this.uiLocked = false;
    this.resetOpeningFlags();
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

    this.rooms = {};
    this.roomOrder = [];
    this.viewPositions = {};
    this.totalWidth = 0;

    this._playerHud = null;
    this._uiLayersPromise = null;
    this._tutorialStartTimer = null;
    this._runToken = Symbol('office-run');
    this._officeDisposed = false;

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

  isCurrentOfficeRun(token = this._runToken) {
    return Boolean(
      token &&
      this._runToken === token &&
      !this._officeDisposed &&
      !this._cleanupDone
    );
  }

  isOfficeActive() {
    return (
      this.isCurrentOfficeRun() &&
      this.sys.isActive()
    );
  }

  resetOpeningFlags() {
    OPENING_FLAGS.forEach((flag) => {
      this[flag] = false;
    });
  }

  async flushOfficeAutosave() {
    try {
      await flushAutosave();
      return true;
    } catch (error) {
      console.error(
        '[OfficeScene] Autosave flush failed:',
        error
      );

      return false;
    }
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error('[OfficeScene] assetManifest is missing.');
      return;
    }

    for (const key of OFFICE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) continue;

      const entry = manifest.backgrounds?.find(
        (asset) => asset.key === key
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
        (asset) => asset.key === 'officescenesound'
      );

      if (ambient?.url) {
        this.load.audio(ambient.key, ambient.url);
      }
    }

    if (!this.cache.json.exists('monologues')) {
      const monologues = manifest.json?.find(
        (asset) => asset.key === 'monologues'
      );

      if (monologues?.url) {
        this.load.json(monologues.key, monologues.url);
      }
    }
  }

  create() {
    super.create();

    // Rejestrujemy sprzątanie przed tworzeniem interfejsu.
    this._bindOfficeEvents();

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
          if (
            this.isOfficeActive() &&
            !this.uiLocked &&
            !this.DEBUG_HOTSPOTS
          ) {
            this.navigation?.moveLeft();
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-RIGHT',
        () => {
          if (
            this.isOfficeActive() &&
            !this.uiLocked &&
            !this.DEBUG_HOTSPOTS
          ) {
            this.navigation?.moveRight();
          }
        }
      );

      this.trackInputEvent(
        this.input.keyboard,
        'keydown-L',
        (event) => this.openCrimeLabHotkey(event)
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

    this.refreshPanelLock();

    void this.setupOfficeUiLayers({
      closePanels: true
    });
  }

  _getOfficeEventBindings() {
    return [
      [Phaser.Scenes.Events.WAKE, this.onWakeOrResume],
      [Phaser.Scenes.Events.RESUME, this.onWakeOrResume],
      [Phaser.Scenes.Events.SLEEP, this.onSleep],
      ['ui-panel-state-changed', this.refreshPanelLock]
    ];
  }

  _bindOfficeEvents() {
    for (const [event, callback] of this._getOfficeEventBindings()) {
      this.events.off(event, callback, this);
      this.events.on(event, callback, this);
    }

    for (const event of [
      Phaser.Scenes.Events.SHUTDOWN,
      Phaser.Scenes.Events.DESTROY
    ]) {
      this.events.off(event, this.cleanupScene, this);
      this.events.once(event, this.cleanupScene, this);
    }
  }

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
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (this.isOfficeActive() && !isBlocked()) {
        button.setColor('#ffffff');
      }
    });

    button.on('pointerout', () => {
      if (this.isCurrentOfficeRun()) {
        this.refreshEntranceButtons();
      }
    });

    button.on('pointerdown', (pointer) => {
      if (
        pointer?.event?.button !== undefined &&
        pointer.event.button !== 0
      ) {
        return;
      }

      if (!this.isOfficeActive() || isBlocked()) return;

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
    const entries = [
      [this.archiveButton, this.isArchiveBlocked()],
      [this.storageButton, this.isStorageBlocked()]
    ];

    entries.forEach(([button, blocked]) => {
      if (!button?.active || !button.input) return;

      button.input.enabled = !blocked;
      button.setAlpha(blocked ? 0.45 : 1);
      button.setColor(blocked ? '#8b8475' : '#f2d477');
    });
  }

  async _openOfficeRoom(sceneKey, flagName, roomName) {
    if (!this.isOfficeActive() || this[flagName]) {
      return false;
    }

    this.refreshPanelLock();
    if (this.uiLocked) return false;

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

    try {
      this.refreshPanelLock();
      this.navigation?.hideHint();
      audioManager.playSfx('click_sound');

      await this.flushOfficeAutosave();

      if (
        !this.isCurrentOfficeRun(token) ||
        !this.sys.isActive()
      ) {
        return false;
      }

      const result = await this.goto(sceneKey, {
        gameState: this.gameState
      });

      if (
        result === false &&
        this.isCurrentOfficeRun(token) &&
        this.sys.isActive()
      ) {
        this.showOfficeStatusMessage(
          `The ${roomName} could not be opened.`
        );
      }

      return result !== false;
    } catch (error) {
      if (this.isCurrentOfficeRun(token)) {
        console.error(
          `[OfficeScene] Failed to open ${sceneKey}:`,
          error
        );

        this.showOfficeStatusMessage(
          `The ${roomName} could not be opened.`
        );
      }

      return false;
    } finally {
      if (this.isCurrentOfficeRun(token)) {
        this[flagName] = false;
        this.refreshPanelLock();
      }
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

  onHudPanelStateChanged() {
    if (this.isCurrentOfficeRun()) {
      this.refreshPanelLock();
    }
  }

  refreshPanelLock() {
    if (!this.isCurrentOfficeRun()) return;

    const hud = this.getPlayerHud();

    const locked = Boolean(
      hud?.isAnyPanelOpen?.() ||
      this.saveUI?.isOpen ||
      this.agencyLedgerUI?.isOpen ||
      OPENING_FLAGS.some((flag) => this[flag])
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

  setupOfficeUiLayers({ closePanels = false } = {}) {
    if (!this.isOfficeActive()) {
      return Promise.resolve(false);
    }

    if (this._uiLayersPromise) {
      return this._uiLayersPromise;
    }

    const token = this._runToken;

    const isCurrent = () => (
      this.isCurrentOfficeRun(token) &&
      this.sys.isActive()
    );

    const request = (async () => {
      try {
        const uiScene = await this.ensureOverlayScene('UIScene');
        if (!isCurrent()) return false;

        const playerHud = await this.restorePlayerHud();
        if (!isCurrent()) return false;

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
        if (!isCurrent()) return false;

        if (uiScene) {
          const visible = !this.agencyLedgerUI?.isOpen;

          EventBus.emit(visible ? 'showHUD' : 'hideHUD');
          this.game.events.emit('setHudVisible', visible);
        }

        this.refreshPanelLock();
        return true;
      } catch (error) {
        if (this.isCurrentOfficeRun(token)) {
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

    const releaseRequest = () => {
      if (this._uiLayersPromise === request) {
        this._uiLayersPromise = null;
        this.isRestoringOfficeUi = false;
      }
    };

    void request.then(releaseRequest, releaseRequest);
    return request;
  }

  async setupNewsHud() {
    const token = this._runToken;
    const newsHud = await this.ensureOverlayScene('NewsHud');

    if (
      !newsHud ||
      !this.isCurrentOfficeRun(token) ||
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
    if (!this.isCurrentOfficeRun()) return;

    this.startOnboarding = false;
    this.refreshEntranceButtons();

    if (!this.sys.isActive()) return;

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();

    void this.setupOfficeUiLayers();
  }

  createBackgrounds(gameWidth, gameHeight) {
    const completed = this.hasCompletedFirstMission();

    const background = (x, key) => (
      this.add
        .image(x, 0, key)
        .setOrigin(0, 0)
        .setDisplaySize(gameWidth, gameHeight)
    );

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
      this.roomOrder.map((key) => [key, this.rooms[key].x])
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

    this._tutorialStartTimer?.remove(false);
    this._tutorialStartTimer = null;
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

    this._tutorialStartTimer = this.time.delayedCall(100, () => {
      if (!this.isCurrentOfficeRun(token)) return;

      this._tutorialStartTimer = null;

      if (this.sys.isActive()) {
        this.firstCaseTutorial?.start();
        this.refreshEntranceButtons();
      }
    });

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
    if (!this.isCurrentOfficeRun()) return;

    const elevatorTexture = this.hasCompletedFirstMission()
      ? 'elevator_open'
      : 'elevator_broken';

    if (
      this.elevatorBackground?.active &&
      this.rooms.elevator &&
      this.elevatorBackground.texture?.key !== elevatorTexture
    ) {
      this.elevatorBackground
        .setTexture(elevatorTexture)
        .setDisplaySize(
          this.rooms.elevator.width,
          this.scale.height
        );
    }

    this.hotspotManager?.refreshAvailability?.();
    this.refreshEntranceButtons();
  }

  onFirstMissionCompleted() {
    if (!this.isCurrentOfficeRun()) return;

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
    if (!this.isCurrentOfficeRun()) return;

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
    if (!message || !this.isOfficeActive()) return;

    const { width } = this.scale;

    const text = this.add
      .text(width / 2, 115, message, {
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
          width: Math.max(100, Math.min(width - 80, 760))
        }
      })
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
        if (text.active) text.destroy();
      }
    });
  }

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

      try {
        this.saveUI?.destroy();
      } catch (cleanupError) {
        console.warn(
          '[OfficeScene] Save controls cleanup failed:',
          cleanupError
        );
      }

      this.saveUI = null;
    }
  }

  setupAudioUnlock() {
    const token = this._runToken;

    const unlock = () => {
      this.offTrackedInputEvent(
        this.input,
        'pointerdown',
        unlock
      );

      if (!this.isCurrentOfficeRun(token)) return;

      try {
        const resume =
          this.sound?.context?.state === 'suspended'
            ? this.sound.context.resume()
            : null;

        if (resume?.catch) {
          void resume.catch((error) => {
            console.warn(
              '[OfficeScene] Audio unlock failed:',
              error
            );
          });
        }

        this.playOfficeAmbient();
      } catch (error) {
        console.warn(
          '[OfficeScene] Audio unlock failed:',
          error
        );
      }
    };

    this.trackInputEvent(this.input, 'pointerdown', unlock);
  }

  playOfficeAmbient() {
    if (!this.isOfficeActive()) return null;

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

  openCrimeLabHotkey(event) {
    const target = event?.target;
    const activeElement = document.activeElement;

    const editingText = [target, activeElement].some(
      (element) => (
        element?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          element?.tagName
        )
      )
    );

    if (
      editingText ||
      event?.repeat ||
      event?.ctrlKey ||
      event?.metaKey ||
      event?.altKey ||
      this.DEBUG_HOTSPOTS
    ) {
      return;
    }

    void this.openCrimeLab();
  }

  async _openOfficeOverlay(sceneKey, flagName) {
    if (!this.isOfficeActive() || this[flagName]) {
      return false;
    }

    this.refreshPanelLock();

    if (this.uiLocked || this.agencyLedgerUI?.isOpen) {
      return false;
    }

    const token = this._runToken;
    let keepOpeningFlag = false;

    this[flagName] = true;

    try {
      this.refreshPanelLock();
      this.navigation?.hideHint();

      if (sceneKey === 'CrimeLabScene') {
        audioManager.playSfx('click_sound');
      }

      await this.flushOfficeAutosave();

      if (
        !this.isCurrentOfficeRun(token) ||
        !this.sys.isActive()
      ) {
        return false;
      }

      const opened = await this.launchOverlay(sceneKey, {
        gameState: this.gameState,
        returnScene: 'OfficeScene'
      });

      if (!this.isCurrentOfficeRun(token)) {
        return false;
      }

      if (!opened) {
        this.showOfficeStatusMessage(
          'This screen could not be opened. Please try again.'
        );
        return false;
      }

      // Flaga pozostaje do powrotu z ekranu.
      // onWakeOrResume() ją wyczyści.
      keepOpeningFlag = true;

      if (this.sys.isActive()) {
        this.scene.pause();
      }

      return true;
    } catch (error) {
      if (this.isCurrentOfficeRun(token)) {
        console.error(
          `[OfficeScene] Failed to open overlay ${sceneKey}:`,
          error
        );

        this.showOfficeStatusMessage(
          'This screen could not be opened. Please try again.'
        );
      }

      return false;
    } finally {
      if (
        this.isCurrentOfficeRun(token) &&
        !keepOpeningFlag
      ) {
        this[flagName] = false;
        this.refreshPanelLock();
      }
    }
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
    if (!panel) return;

    this.closeAllUIPanels();
    panel.open(this.gameState);
    this.refreshPanelLock();
  }

  openDestinations() {
    const panel = this.getPlayerHud()?.destinationsUI;
    if (!panel) return;

    this.closeAllUIPanels();
    panel.open(this.gameState);

    this.firstCaseTutorial?.onDestinationMapOpened();
    this.refreshPanelLock();
  }

  openWarrant() {
    const panel = this.getPlayerHud()?.warrantUI;
    if (!panel) return;

    this.closeAllUIPanels();
    panel.open(this.gameState);
    this.refreshPanelLock();
  }

  openCrimeBoard() {
    const hud = this.getPlayerHud();
    if (!hud) return;

    this.closeAllUIPanels();
    hud.openCrimeBoard();
    this.refreshPanelLock();
  }

  openAtlas() {
    const panel = this.getPlayerHud()?.atlasUI;
    if (!panel) return;

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

  onWakeOrResume() {
    if (!this.isOfficeActive()) return;

    this.resetOpeningFlags();

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();
    this.playOfficeAmbient();

    void this.setupOfficeUiLayers();
  }

  onSleep() {
    if (!this.isCurrentOfficeRun()) return;

    void this.flushOfficeAutosave();

    try {
      this.agencyLedgerUI?.close({
        restoreHud: false
      });
    } catch (error) {
      console.warn(
        '[OfficeScene] Ledger close failed:',
        error
      );
    }

    this.navigation?.hideHint();
    this._stopOfficeAmbient();
  }

  cleanupScene() {
    if (this._officeDisposed) return;

    this._officeDisposed = true;
    this._runToken = null;

    void this.flushOfficeAutosave();

    const clean = (label, action) => {
      try {
        action();
      } catch (error) {
        console.warn(
          `[OfficeScene] ${label} cleanup failed:`,
          error
        );
      }
    };

    clean('Tutorial timer', () => {
      this._tutorialStartTimer?.remove(false);
    });

    this._tutorialStartTimer = null;
    this._uiLayersPromise = null;
    this.isRestoringOfficeUi = false;

    const bindings = [
      ...this._getOfficeEventBindings(),
      [Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene],
      [Phaser.Scenes.Events.DESTROY, this.cleanupScene]
    ];

    for (const [event, callback] of bindings) {
      this.events.off(event, callback, this);
    }

    for (const key of [
      'saveUI',
      'firstCaseTutorial',
      'hotspotManager',
      'agencyLedgerUI',
      'navigation'
    ]) {
      const resource = this[key];
      this[key] = null;

      clean(key, () => resource?.destroy());
    }

    for (const key of ['archiveButton', 'storageButton']) {
      const button = this[key];
      this[key] = null;

      clean(key, () => {
        button?.removeAllListeners();
        button?.destroy();
      });
    }

    clean('Ambient', () => this._stopOfficeAmbient());

    this._playerHud = null;
    this.elevatorBackground = null;
    this.rooms = {};
    this.roomOrder = [];
    this.viewPositions = {};
    this.totalWidth = 0;
    this.uiLocked = false;

    this.resetOpeningFlags();
  }
}