import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { audioManager } from '../managers/AudioManager.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { FirstCaseTutorial } from '../tutorials/FirstCaseTutorial.js';
import { AgencyLedgerUI } from '../ui/AgencyLedgerUI.js';
import { flushAutosave } from '../gameStatePersistence.js';

import { OfficeNavigation } from './office/OfficeNavigation.js';
import { OfficeDoorSigns } from './office/OfficeDoorsigns.js';
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

const HUD_READY_TIMEOUT_MS = 12000;

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
    this.doorSigns = null;
    this.archiveButton = null;
    this.storageButton = null;
    this.elevatorBackground = null;

    this.uiLocked = false;
    this.isRestoringOfficeUi = false;
    this.startOnboarding = false;
    this.firstCaseTutorial = null;

    this._runToken = null;
    this._uiRestoreToken = null;
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
    this.doorSigns = null;
    this.archiveButton = null;
    this.storageButton = null;
    this.elevatorBackground = null;

    this.rooms = {};
    this.roomOrder = [];
    this.viewPositions = {};
    this.totalWidth = 0;

    this._playerHud = null;
    this._uiLayersPromise = null;
    this._uiRestoreToken = null;
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
        storageVisited: false,
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

    const tutorialState =
      this.gameState.onboarding?.firstCase;

    const tutorialFinished = (
      tutorialState?.completed === true ||
      tutorialState?.skipped === true
    );

    this.startOnboarding = !tutorialFinished && (
      data.startOnboarding === true ||
      this.isNewGame ||
      tutorialState?.active === true
    );
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
    OPENING_FLAGS.forEach(flag => {
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
    const manifest =
      this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error(
        '[OfficeScene] assetManifest is missing.'
      );
      return;
    }

    for (const key of OFFICE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) continue;

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

    this._bindOfficeEvents();
    audioManager.init(this);

    const { width, height } = this.scale;

    this.restoreOfficeRegistry();

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);

    this.navigation = new OfficeNavigation(this, {
      roomOrder: this.roomOrder,
      viewPositions: this.viewPositions,
      initialView: 'office',
      getRoomMeta: key => this.getOfficeRoomMeta(key)
    });

    this.navigation.create();
    this.agencyLedgerUI = new AgencyLedgerUI(this);

    this.hotspotManager = new OfficeHotspotManager(
      this,
      { debugEnabled: this.DEBUG_HOTSPOTS }
    );

    this.hotspotManager.create(
      createOfficeHotspotDefinitions(this)
    );

    this.createDoorSigns();
    this.createSaveControls();

    this.monologue?.startIdle(__dialogueText("scenes/OfficeScene.js", "t_d6509e0b2500397e2bd5"));
    this.setupAudioUnlock();

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
        event => this.openCrimeLabHotkey(event)
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

    this.events.once(
      Phaser.Scenes.Events.CREATE,
      this.onOfficeCreated,
      this
    );
  }

  onOfficeCreated() {
    if (!this.isOfficeActive()) return;

    this.restoreOfficeRegistry();
    this.releasePIOfficeHudLock();
    this.playOfficeAmbient();

    void this.setupOfficeUiLayers({
      closePanels: true
    });
  }

  restoreOfficeRegistry() {
    this.registry.set('currentSceneKey', 'OfficeScene');
    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);

    this.registry.set(
      'activeMission',
      this.gameState.currentMission || null
    );
  }

  releasePIOfficeHudLock() {
    if (!this.isOfficeActive()) return;

    document.documentElement.classList.remove(
      'pi-office-hide-gameplay-hud'
    );
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
    for (
      const [event, callback]
      of this._getOfficeEventBindings()
    ) {
      this.events.off(event, callback, this);
      this.events.on(event, callback, this);
    }

    this.events.off(
      Phaser.Scenes.Events.CREATE,
      this.onOfficeCreated,
      this
    );

    for (const event of [
      Phaser.Scenes.Events.SHUTDOWN,
      Phaser.Scenes.Events.DESTROY
    ]) {
      this.events.off(event, this.cleanupScene, this);
      this.events.once(event, this.cleanupScene, this);
    }
  }

  isOfficeTutorialBlocking() {
    const tutorialState =
      this.gameState.onboarding?.firstCase;

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
    const firstCase =
      this.gameState.onboarding?.firstCase;

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
    return Boolean(this.uiLocked);
  }

  /**
   * Nazwy i podpisy pokoi na pasku nawigacji oraz pod strzałkami.
   * Klucze to nazwy widoków z createBackgrounds():
   * elevator | storage (globus + szafa z aktami) | office | cabinet.
   * Zmieniaj tu teksty, nie w OfficeNavigation.
   */
  getOfficeRoomMeta(roomKey) {
    const meta = {
      elevator: {
        label: __dialogueText("scenes/OfficeScene.js", "t_8ec78fd4e0c76ee47e25"),
        subtitle: this.hasCompletedFirstMission()
          ? __dialogueText("scenes/OfficeScene.js", "t_82d1f7cc09a97dc7b5be")
          : __dialogueText("scenes/OfficeScene.js", "t_24d8f84a780c7168cc3f")
      },
      storage: {
        label: __dialogueText("scenes/OfficeScene.js", "t_5b24b840a76014023657"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_6ac6b00357d9081fdc38")
      },
      office: {
        label: __dialogueText("scenes/OfficeScene.js", "t_9af0ff0f58a463fe73ff"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_55483976a9e1caae2b56")
      },
      cabinet: {
        label: __dialogueText("scenes/OfficeScene.js", "t_408d2e9270273051bb20"),
        subtitle: __dialogueText("scenes/OfficeScene.js", "t_163bcef7b4a7b5a834c6")
      }
    };

    return meta[roomKey] ?? null;
  }

  createDoorSigns() {
    this.doorSigns?.destroy();

    this.doorSigns = new OfficeDoorSigns(this, {
      x: 24,
      y: 170,
      spacing: 82,
      doors: [
        {
          id: 'archive',
          label: __dialogueText("scenes/OfficeScene.js", "t_b22a9799327ae5c2ede9"),
          subtitle: __dialogueText("scenes/OfficeScene.js", "t_4e7499010dd7e1ad7e0a"),
          glyph: 'archive',
          lockedLabel: 'LOCKED',
          isBlocked: () => this.isArchiveBlocked(),
          onBlockedClick: () => {
            if (!this.uiLocked && this.isOfficeTutorialBlocking()) {
              this.showOfficeStatusMessage(
                __dialogueText("scenes/OfficeScene.js", "t_fdb4e3e1e53a1750aaf2")
              );
            }
          },
          onOpen: () => this.openArchive()
        },
        {
          id: 'storage',
          label: __dialogueText("scenes/OfficeScene.js", "t_599b626e7206a74d972a"),
          subtitle: __dialogueText("scenes/OfficeScene.js", "t_0cb148a28ca68d58479d"),
          glyph: 'storage',
          isBlocked: () => this.isStorageBlocked(),
          onOpen: () => this.openStorage()
        }
      ]
    });

    this.doorSigns.create();

    // FirstCaseTutorial podświetla storageButton przez getBounds().
    this.archiveButton = this.doorSigns.getSign('archive');
    this.storageButton = this.doorSigns.getSign('storage');
  }

  refreshEntranceButtons() {
    this.doorSigns?.refresh();
  }

  async _openOfficeRoom(sceneKey, flagName, roomName) {
    if (!this.isOfficeActive() || this[flagName]) {
      return false;
    }

    this.refreshPanelLock();

    if (this.uiLocked) return false;

    const isStorage = sceneKey === 'AgencyStorageScene';

    if (!isStorage && this.isOfficeTutorialBlocking()) {
      this.showOfficeStatusMessage(
        __dialogueText("scenes/OfficeScene.js", "t_fdb4e3e1e53a1750aaf2")
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
          `${__dialogueText("scenes/OfficeScene.js", "t_103c5169871d49be7a2e")}${roomName}${__dialogueText("scenes/OfficeScene.js", "t_601ea6e3e0cdd6fbc311")}`
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
          `${__dialogueText("scenes/OfficeScene.js", "t_103c5169871d49be7a2e")}${roomName}${__dialogueText("scenes/OfficeScene.js", "t_601ea6e3e0cdd6fbc311")}`
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
      __dialogueText("scenes/OfficeScene.js", "t_81b1437735c9dc91dee1")
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
      OPENING_FLAGS.some(flag => this[flag])
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
    const hud = this.getPlayerHudScene();
    this._playerHud = hud;
    return hud;
  }

  invalidateOfficeUiRestore() {
    this._uiRestoreToken = null;
    this._uiLayersPromise = null;
    this.isRestoringOfficeUi = false;
  }

  async waitForOfficeOverlay(
    sceneKey,
    overlay,
    isCurrent,
    ready = () => true
  ) {
    const deadline = Date.now() + HUD_READY_TIMEOUT_MS;

    while (isCurrent()) {
      if (
        this.getRegisteredScene(sceneKey) !== overlay
      ) {
        return false;
      }

      if (
        this.isSceneActive(sceneKey) &&
        ready(overlay)
      ) {
        return true;
      }

      if (Date.now() >= deadline) {
        console.error(
          `[OfficeScene] ${sceneKey} did not become ready.`,
          {
            status: overlay?.sys?.settings?.status,
            active: this.isSceneActive(sceneKey)
          }
        );

        return false;
      }

      await new Promise(resolve => {
        window.setTimeout(resolve, 20);
      });
    }

    return false;
  }

  setupOfficeUiLayers({ closePanels = false } = {}) {
    if (!this.isOfficeActive()) {
      return Promise.resolve(false);
    }

    if (this._uiLayersPromise) {
      return this._uiLayersPromise;
    }

    const runToken = this._runToken;
    const restoreToken = Symbol('office-ui-restore');

    this._uiRestoreToken = restoreToken;
    this.isRestoringOfficeUi = true;

    const isCurrent = () => (
      this.isCurrentOfficeRun(runToken) &&
      this._uiRestoreToken === restoreToken &&
      this.sys.isActive() &&
      this.registry.get('currentSceneKey') === 'OfficeScene'
    );

    const restoreLayer = async (name, action) => {
      try {
        if (!isCurrent()) return null;
        return await action();
      } catch (error) {
        if (isCurrent()) {
          console.error(
            `[OfficeScene] ${name} restoration failed:`,
            error
          );
        }

        return null;
      }
    };

    // Start in a microtask so the request is stored first.
    const request = Promise.resolve().then(async () => {
      if (!isCurrent()) return false;

      this.releasePIOfficeHudLock();

      const uiScene = await restoreLayer(
        'UIScene',
        async () => {
          const ui = await this.ensureOverlayScene('UIScene');

          if (!ui || !isCurrent()) return null;

          const ready = await this.waitForOfficeOverlay(
            'UIScene',
            ui,
            isCurrent
          );

          if (!ready || !isCurrent()) return null;

          this.scene.setVisible(true, 'UIScene');
          return ui;
        }
      );

      if (!isCurrent()) return false;

      const playerHud = await restoreLayer(
        'PlayerHudScene',
        async () => {
          const hud = await this.restorePlayerHud();

          if (!hud || !isCurrent()) return null;

          const ready = await this.waitForOfficeOverlay(
            'PlayerHudScene',
            hud,
            isCurrent,
            value => value.isHudReady !== false
          );

          if (!ready || !isCurrent()) return null;

          this._playerHud = hud;

          this.scene.setVisible(true, 'PlayerHudScene');

          if (closePanels) {
            hud.closeAllUIPanels?.();
          }

          hud.setCurrentGameplayScene?.('OfficeScene');

          this.bringSceneToTopIfActive('PlayerHudScene');

          return hud;
        }
      );

      if (!isCurrent()) return false;

      await restoreLayer(__dialogueText("scenes/OfficeScene.js", "t_f89b936161f25346de58"), async () => {
        this.releasePIOfficeHudLock();

        const visible = !this.agencyLedgerUI?.isOpen;

        if (uiScene) {
          this.scene.setVisible(true, 'UIScene');
        }

        EventBus.emit(visible ? 'showHUD' : 'hideHUD');
        this.game.events.emit('setHudVisible', visible);
      });

      if (!isCurrent()) return false;

      // A failure in another HUD must not skip NewsHud.
      const newsReady = await restoreLayer(
        'NewsHud',
        () => this.setupNewsHud(isCurrent)
      );

      if (!isCurrent()) return false;

      if (!newsReady) {
        console.warn(
          '[OfficeScene] NewsHud could not be restored.'
        );
      }

      await restoreLayer(__dialogueText("scenes/OfficeScene.js", "t_c26982b1425da26a9637"), async () => {
        this.restoreFirstCaseTutorial();
      });

      if (!isCurrent()) return false;

      this.refreshPanelLock();

      return Boolean(uiScene && playerHud && newsReady);
    }).catch(error => {
      if (isCurrent()) {
        console.error(
          '[OfficeScene] Failed to set up UI layers:',
          error
        );
      }

      return false;
    });

    this._uiLayersPromise = request;

    const releaseRequest = () => {
      if (
        this._uiLayersPromise === request &&
        this._uiRestoreToken === restoreToken
      ) {
        this._uiLayersPromise = null;
        this.isRestoringOfficeUi = false;
      }
    };

    void request.then(releaseRequest, releaseRequest);

    return request;
  }

  async setupNewsHud(
    isCurrent = () => this.isOfficeActive()
  ) {
    const token = this._runToken;

    const current = () => (
      this.isCurrentOfficeRun(token) &&
      isCurrent()
    );

    if (!current()) return false;

    const newsHud = await this.ensureOverlayScene('NewsHud');

    if (!newsHud || !current()) return false;

    const ready = await this.waitForOfficeOverlay(
      'NewsHud',
      newsHud,
      current,
      news => (
        typeof news.isUiReady === 'function'
          ? news.isUiReady()
          : news.uiReady === true
      )
    );

    if (!ready || !current()) return false;

    newsHud.setButtonsVisible(true);
    newsHud.setNewspaperVisible(true);
    newsHud.setTvVisible(true);

    const visible = !this.agencyLedgerUI?.isOpen;

    newsHud.setHudVisible(visible);

    this.scene.setVisible(true, 'NewsHud');
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
      this.add.image(x, 0, key)
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
      this.roomOrder.map(key => [key, this.rooms[key].x])
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

  shouldRestoreFirstCaseTutorial() {
    const state = this.gameState.onboarding?.firstCase;

    if (
      state?.completed === true ||
      state?.skipped === true
    ) {
      return false;
    }

    return Boolean(
      this.startOnboarding ||
      state?.active === true
    );
  }

  suspendFirstCaseTutorial() {
    this._tutorialStartTimer?.remove(false);
    this._tutorialStartTimer = null;

    const tutorial = this.firstCaseTutorial;
    this.firstCaseTutorial = null;

    if (tutorial) {
      try {
        tutorial.destroy();
      } catch (error) {
        console.warn(
          '[OfficeScene] Tutorial suspension failed:',
          error
        );
      }
    }
  }

  restoreFirstCaseTutorial() {
    if (!this.isOfficeActive()) return;

    if (!this.shouldRestoreFirstCaseTutorial()) {
      this.suspendFirstCaseTutorial();
      this.refreshEntranceButtons();
      return;
    }

    if (
      this.firstCaseTutorial?.isActive() &&
      this.firstCaseTutorial.overlay?.scene
    ) {
      this.firstCaseTutorial.registerStorageButton();
      this.firstCaseTutorial.rebuildOverlay();
      this.refreshEntranceButtons();
      return;
    }

    this.createFirstCaseTutorial();
  }

  createFirstCaseTutorial() {
    if (!this.isOfficeActive()) return;

    if (!this.shouldRestoreFirstCaseTutorial()) {
      this.suspendFirstCaseTutorial();
      this.refreshEntranceButtons();
      return;
    }

    if (this._tutorialStartTimer) return;

    this.suspendFirstCaseTutorial();

    const tutorial = new FirstCaseTutorial(
      this,
      this.gameState
    );

    this.firstCaseTutorial = tutorial;

    for (
      const hotspot
      of this.hotspotManager?.hotspots ?? []
    ) {
      const id = hotspot?.hotspotData?.id;

      if (id) {
        tutorial.registerHotspot(id, hotspot);
      }
    }

    tutorial.registerStorageButton();

    const token = this._runToken;

    this._tutorialStartTimer = this.time.delayedCall(
      100,
      () => {
        this._tutorialStartTimer = null;

        if (
          !this.isCurrentOfficeRun(token) ||
          !this.sys.isActive() ||
          this.firstCaseTutorial !== tutorial
        ) {
          return;
        }

        tutorial.start();
        this.refreshEntranceButtons();
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
    this.navigation?.refreshRoomMeta();
    this.refreshEntranceButtons();
  }

  onFirstMissionCompleted() {
    if (!this.isCurrentOfficeRun()) return;

    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionCompleted = true;

    this.refreshMissionProgressVisuals();

    if (this.sys.isActive()) {
      this.showOfficeStatusMessage(
        __dialogueText("scenes/OfficeScene.js", "t_218af78fa4d07edacf36")
      );
    }
  }

  onFirstMissionSuccess() {
    if (!this.isCurrentOfficeRun()) return;

    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionSuccess = true;

    this.refreshEntranceButtons();
  }

  showOfficeStatusMessage(message) {
    if (!message || !this.isOfficeActive()) return;

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
          width: Math.max(100, Math.min(width - 80, 760))
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
          void resume.catch(error => {
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
      element => (
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

      if (!this.isCurrentOfficeRun(token)) return false;

      if (!opened) {
        this.showOfficeStatusMessage(
          __dialogueText("scenes/OfficeScene.js", "t_a475e66491996ef650aa")
        );
        return false;
      }

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
          __dialogueText("scenes/OfficeScene.js", "t_a475e66491996ef650aa")
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
      artifact: mission.artifact || __dialogueText("scenes/OfficeScene.js", "t_51b01e8422efd81865f3"),
      city: mission.city || __dialogueText("scenes/OfficeScene.js", "t_031708f5a6c18e0a6279"),
      country: mission.country || __dialogueText("scenes/OfficeScene.js", "t_e282dbbdd7a0fe3f46f5"),
      description:
        mission.description || __dialogueText("scenes/OfficeScene.js", "t_5b90bad5ea1caf117c4e"),
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

    this.restoreOfficeRegistry();
    this.releasePIOfficeHudLock();
    this.resetOpeningFlags();
    this.invalidateOfficeUiRestore();

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();
    this.playOfficeAmbient();

    void this.setupOfficeUiLayers({
      closePanels: true
    });
  }

  onSleep() {
    if (!this.isCurrentOfficeRun()) return;

    this.invalidateOfficeUiRestore();
    this.suspendFirstCaseTutorial();

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
    this._playerHud = null;
  }

  cleanupScene() {
    if (this._officeDisposed) return;

    this._officeDisposed = true;
    this._runToken = null;

    this.invalidateOfficeUiRestore();
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

    const bindings = [
      ...this._getOfficeEventBindings(),
      [Phaser.Scenes.Events.CREATE, this.onOfficeCreated],
      [Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene],
      [Phaser.Scenes.Events.DESTROY, this.cleanupScene]
    ];

    for (const [event, callback] of bindings) {
      this.events.off(event, callback, this);
    }

    clean(__dialogueText("scenes/OfficeScene.js", "t_c26982b1425da26a9637"), () => {
      this.suspendFirstCaseTutorial();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_9481ee5252a0f469c224"), () => {
      this.agencyLedgerUI?.close({
        restoreHud: false
      });
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_ee69eb4afc76aae085cd"), () => {
      this.agencyLedgerUI?.destroy?.();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_5df4278ace74baa7c8cb"), () => {
      this.saveUI?.destroy?.();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_3db65f8c2a7d1861b4bc"), () => {
      this.navigation?.destroy?.();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_07d25c2b1b907fd071f7"), () => {
      this.hotspotManager?.destroy?.();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_a78a25792364c427f7ee"), () => {
      this._stopOfficeAmbient();
    });

    clean(__dialogueText("scenes/OfficeScene.js", "t_7e1c5362ed106b31dac8"), () => {
      this.doorSigns?.destroy();
    });

    this.firstCaseTutorial = null;
    this._tutorialStartTimer = null;
    this.agencyLedgerUI = null;
    this.saveUI = null;
    this.navigation = null;
    this.hotspotManager = null;
    this.doorSigns = null;
    this.archiveButton = null;
    this.storageButton = null;
    this.elevatorBackground = null;
    this._playerHud = null;

    this.rooms = {};
    this.roomOrder = [];
    this.viewPositions = {};
    this.totalWidth = 0;

    this.resetOpeningFlags();
  }
}