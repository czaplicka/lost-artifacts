import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { audioManager } from '../managers/AudioManager.js';
import { OfficeSaveUI } from '../ui/OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { AgencyLedgerUI } from '../ui/AgencyLedgerUI.js';
import { flushAutosave, requestAutosave } from '../gameStatePersistence.js';

import { OfficeNavigation } from './office/OfficeNavigation.js';
import { OfficeHotspotManager } from './office/OfficeHotspotManager.js';
import {
  createOfficeHotspotDefinitions
} from './office/officeHotspots.js';

import { OPENING_FLAGS, LOCAL_DEBUG_ALLOWED } from './office/OfficeSceneConfig.js';
import { OfficeUiLayers } from './office/OfficeUiLayers.js';
import { OfficeTutorialFlow } from './office/OfficeTutorialFlow.js';
import { OfficeRoomLayout } from './office/OfficeRoomLayout.js';
import { OfficeSceneAccess } from './office/OfficeSceneAccess.js';
import { OfficeAudio } from './office/OfficeAudio.js';
import { OfficePanelActions } from './office/OfficePanelActions.js';

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
    this._officePanelRequest = null;
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
      requestAutosave();
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

Object.assign(OfficeScene.prototype,
  OfficeUiLayers,
  OfficeTutorialFlow,
  OfficeRoomLayout,
  OfficeSceneAccess,
  OfficeAudio,
  OfficePanelActions
);
