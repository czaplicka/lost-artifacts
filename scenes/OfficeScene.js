import { audioManager } from '../AudioManager.js';
import { OfficeSaveUI } from '../OfficeSaveUI.js';
import { gameState } from '../GameData.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { FirstCaseTutorial } from '../FirstCaseTutorial.js';
import { ensureHud } from '../hudHelpers.js';

import { OfficeNavigation } from './office/OfficeNavigation.js';
import { OfficeHotspotManager } from './office/OfficeHotspotManager.js';
import { createOfficeHotspotDefinitions } from './office/officeHotspots.js';

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
    this.DEBUG_HOTSPOTS = true;

    this.saveUI = null;
    this.officeAmbient = null;

    this.uiLocked = false;
    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;

    this.startOnboarding = false;
    this.firstCaseTutorial = null;

    this.elevatorBackground = null;
    this.archiveBackground = null;

    this.onFirstMissionCompletedBound =
      this.onFirstMissionCompleted.bind(this);
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

    this.navigation = null;
    this.hotspotManager = null;

    if (!this.gameState) {
      console.error('[OfficeScene] Missing gameState in init().');
      return;
    }

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
        missionCompleted: false
      };

      console.log(
        '[OfficeScene] New Game: first-case tutorial state has been reset.',
        this.gameState.onboarding.firstCase
      );
    }

    console.log('[OfficeScene] init()', {
      isNewGame: this.isNewGame,
      startOnboarding: this.startOnboarding,
      tutorialState: this.gameState.onboarding?.firstCase
    });
  }

  create() {
    super.create();

    console.log('[OfficeScene] create: started');

    this.hasMenu = true;

    try {
      ensureHud(this);
      console.log('[OfficeScene] create: HUD ensured');
    } catch (error) {
      console.error('[OfficeScene] ensureHud failed:', error);
    }

    audioManager.init(this);
    audioManager.stopAllVoice();
    audioManager.stopAllSfx();

    EventBus.emit('showHUD');
    this.game.events.emit('setHudVisible', true);

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

    this.hotspotManager = new OfficeHotspotManager(this, {
      debugEnabled: this.DEBUG_HOTSPOTS
    });

    this.hotspotManager.create(
      createOfficeHotspotDefinitions(this)
    );

    this.createFirstCaseTutorial();

    this.monologue?.startIdle('idle.office');

    this.createSaveControls();
    this.setupAudioUnlock();
    this.playOfficeAmbient();

    this.navigation.goTo('office', false);
    this.navigation.showIntroHint();

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-LEFT',
      () => this.navigation?.moveLeft()
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-RIGHT',
      () => this.navigation?.moveRight()
    );

    this.trackInputEvent(
      this.input.keyboard,
      'keydown-L',
      this.openCrimeLabHotkey
    );

    this.onBus(
      'firstMissionCompleted',
      this.onFirstMissionCompletedBound
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

    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.onSleep,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    void this.setupOfficeUiLayers();
  }

  /**
   * Przywraca wszystkie trzy niezależne warstwy interfejsu:
   *
   * 1. UIScene — HTML HUD w prawym górnym rogu.
   * 2. PlayerHudScene — dolne menu/panele Phaser.
   * 3. NewsHud — zakładka news z gazetą i telewizją.
   */
  async setupOfficeUiLayers() {
    try {
      const uiScene = await this.ensureOverlayScene(
        'UIScene'
      );

      if (uiScene) {
        EventBus.emit('showHUD');
        this.game.events.emit('setHudVisible', true);
      } else {
        console.warn(
          '[OfficeScene] UIScene could not be restored.'
        );
      }

      const playerHud = await this.restorePlayerHud();

      if (playerHud) {
        playerHud.closeAllUIPanels?.();
        playerHud.refreshNotebook?.();
        playerHud.refreshUI?.();
      } else {
        console.warn(
          '[OfficeScene] PlayerHudScene could not be restored.'
        );
      }

      await this.setupNewsHud();
    } catch (error) {
      console.error(
        '[OfficeScene] Failed to set up office UI layers:',
        error
      );
    }
  }

  /**
   * Uruchamia lub przywraca zakładkę News.
   */
  async setupNewsHud() {
    try {
      const newsHud = await this.ensureOverlayScene(
        'NewsHud'
      );

      if (!newsHud) {
        console.warn(
          '[OfficeScene] NewsHud could not be opened.'
        );

        return false;
      }

      newsHud.events?.emit(
        'setNewspaperVisible',
        true
      );

      newsHud.events?.emit(
        'setTvVisible',
        true
      );

      this.bringSceneToTopIfActive('NewsHud');

      return true;
    } catch (error) {
      console.error(
        '[OfficeScene] NewsHud setup failed:',
        error
      );

      return false;
    }
  }

  /**
   * Zwraca wyłącznie dolny Phaserowy HUD.
   *
   * UIScene nie jest fallbackiem, ponieważ ma wyłącznie HUD HTML,
   * a nie caseFileUI / crimeBoardUI / destinationsUI / atlasUI.
   */
  getPlayerHud() {
    return this.getPlayerHudScene();
  }

  update() {
    const playerHud = this.getPlayerHud();

    const hudPanelOpen = Boolean(
      playerHud &&
      typeof playerHud.isAnyPanelOpen === 'function' &&
      playerHud.isAnyPanelOpen()
    );

    const savePanelOpen = Boolean(this.saveUI?.isOpen);

    const shouldLockOffice =
      hudPanelOpen ||
      savePanelOpen;

    if (shouldLockOffice && !this.uiLocked) {
      this.applyLock(true);
    } else if (!shouldLockOffice && this.uiLocked) {
      this.applyLock(false);
    }
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
        '[OfficeScene] Failed to initialize OfficeSaveUI. ' +
        'The office will continue without save controls.',
        error
      );

      this.saveUI = null;
    }
  }

  createBackgrounds(gameWidth, gameHeight) {
    const requiredTextures = [
      'elevator_broken',
      'elevator_open',
      'backgroundhi',
      'backgroundoff',
      'backgroundset',
      'archive',
      'archivist'
    ];

    requiredTextures.forEach((key) => {
      console.log(
        `[OfficeScene] Texture "${key}":`,
        this.textures.exists(key)
          ? 'LOADED'
          : 'MISSING'
      );
    });

    const elevatorTexture = this.hasCompletedFirstMission()
      ? 'elevator_open'
      : 'elevator_broken';

    const archiveTexture = this.hasCompletedFirstMission()
      ? 'archivist'
      : 'archive';

    const elevatorBg = this.add
      .image(-gameWidth, 0, elevatorTexture)
      .setOrigin(0, 0)
      .setDisplaySize(gameWidth, gameHeight);

    const storageBg = this.add
      .image(0, 0, 'backgroundhi')
      .setOrigin(0, 0)
      .setDisplaySize(gameWidth, gameHeight);

    const officeBg = this.add
      .image(gameWidth, 0, 'backgroundoff')
      .setOrigin(0, 0)
      .setDisplaySize(gameWidth, gameHeight);

    const cabinetBg = this.add
      .image(gameWidth * 2, 0, 'backgroundset')
      .setOrigin(0, 0)
      .setDisplaySize(gameWidth, gameHeight);

    const archiveBg = this.add
      .image(gameWidth * 3, 0, archiveTexture)
      .setOrigin(0, 0)
      .setDisplaySize(gameWidth, gameHeight);

    this.elevatorBackground = elevatorBg;
    this.archiveBackground = archiveBg;

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
      },
      archive: {
        key: 'archive',
        bg: archiveBg,
        x: gameWidth * 3,
        width: gameWidth
      }
    };

    this.roomOrder = [
      'elevator',
      'storage',
      'office',
      'cabinet',
      'archive'
    ];

    this.totalWidth = gameWidth * 5;

    this.viewPositions = {
      elevator: this.rooms.elevator.x,
      storage: this.rooms.storage.x,
      office: this.rooms.office.x,
      cabinet: this.rooms.cabinet.x,
      archive: this.rooms.archive.x
    };
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
    const tutorialCompleted =
      this.gameState?.onboarding?.firstCase?.completed === true;

    const shouldStartTutorial =
      this.startOnboarding === true &&
      !tutorialCompleted;

    if (!shouldStartTutorial) {
      return;
    }

    this.firstCaseTutorial?.destroy();

    this.firstCaseTutorial = new FirstCaseTutorial(
      this,
      this.gameState
    );

    const hotspots = this.hotspotManager?.hotspots ?? [];

    hotspots.forEach((hotspot) => {
      const hotspotId = hotspot?.hotspotData?.id;

      if (!hotspotId) {
        return;
      }

      this.firstCaseTutorial.registerHotspot(
        hotspotId,
        hotspot
      );
    });

    this.time.delayedCall(100, () => {
      if (!this.sys.isActive()) {
        return;
      }

      this.firstCaseTutorial?.start();
    });
  }

  notifyTutorialOfficeReached() {
    if (
      !this.firstCaseTutorial?.isActive() ||
      this.firstCaseTutorial.getStep() !==
        'walk_to_case_file'
    ) {
      return;
    }

    const cabinetZone = this.hotspotManager?.findById(
      'cabinet-casefile'
    );

    if (!cabinetZone?.hotspotData) {
      return;
    }

    const data = cabinetZone.hotspotData;

    this.firstCaseTutorial.onPlayerPositionChanged(
      data.x + data.width / 2,
      data.y + data.height / 2
    );
  }

  hasCompletedFirstMission() {
    return Boolean(
      this.gameState.firstMissionCompleted ||
      this.gameState.progress?.firstMissionCompleted ||
      this.gameState.story?.firstMissionCompleted ||
      this.gameState.onboarding?.firstCase?.missionCompleted
    );
  }

  onFirstMissionCompleted() {
    this.gameState.progress ??= {};

    this.gameState.progress.firstMissionCompleted = true;

    this.elevatorBackground?.setTexture('elevator_open');
    this.archiveBackground?.setTexture('archivist');

    this.showOfficeStatusMessage(
      'The elevator opens. The archive gains an archivist. Both developments are suspicious.'
    );
  }

  showOfficeStatusMessage(message) {
    if (!message) {
      return;
    }

    const { width } = this.scale;

    const text = this.add
      .text(width / 2, 115, message, {
        fontFamily: 'Special Elite',
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
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0);

    this.addTrackedTween(
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 250,
        yoyo: true,
        hold: 2600,
        ease: 'Sine.easeInOut',
        onComplete: () => text.destroy()
      })
    );
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspotManager?.setLocked(locked);
    this.navigation?.setLocked(locked);
    this.saveUI?.setLocked(locked);
  }

  setupAudioUnlock() {
    this.input.once('pointerdown', () => {
      if (this.sound?.context?.state === 'suspended') {
        void this.sound.context.resume();
      }

      this.playOfficeAmbient();
    });
  }

  playOfficeAmbient() {
    if (this.officeAmbient?.isPlaying) {
      return this.officeAmbient;
    }

    this.officeAmbient = audioManager.playAmbient(
      'officescenesound',
      {
        loop: true
      }
    );

    return this.officeAmbient;
  }

  openCrimeLabHotkey() {
    void this.openCrimeLab();
  }

  async openCrimeLab() {
    if (
      this.uiLocked ||
      this.isOpeningCrimeLab
    ) {
      return;
    }

    this.isOpeningCrimeLab = true;

    this.navigation?.hideHint();

    audioManager.playSfx('click_sound');

    const opened = await this.launchOverlay(
      'CrimeLabScene',
      {
        gameState: this.gameState,
        returnScene: 'OfficeScene'
      }
    );

    if (opened && this.sys.isActive()) {
      this.scene.pause();
    } else {
      this.isOpeningCrimeLab = false;
    }
  }

  async openRecoveredArtifacts() {
    if (
      this.uiLocked ||
      this.isOpeningRecoveredArtifacts
    ) {
      return;
    }

    this.isOpeningRecoveredArtifacts = true;

    this.navigation?.hideHint();

    const opened = await this.launchOverlay(
      'RecoveredArtifactsScene',
      {
        gameState: this.gameState,
        returnScene: 'OfficeScene'
      }
    );

    if (opened && this.sys.isActive()) {
      this.scene.pause();
    } else {
      this.isOpeningRecoveredArtifacts = false;
    }
  }

  async openWantedDatabase() {
    if (
      this.uiLocked ||
      this.isOpeningWantedDatabase
    ) {
      return;
    }

    this.isOpeningWantedDatabase = true;

    this.navigation?.hideHint();

    const opened = await this.launchOverlay(
      'WantedDatabaseScene',
      {
        gameState: this.gameState,
        returnScene: 'OfficeScene'
      }
    );

    if (opened && this.sys.isActive()) {
      this.scene.pause();
    } else {
      this.isOpeningWantedDatabase = false;
    }
  }

  openCasefile() {
    const hud = this.getPlayerHud();

    if (!hud?.caseFileUI) {
      console.error(
        '[OfficeScene] Cannot open Case File: PlayerHudScene or caseFileUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    const mission = this.gameState.currentMission || {};

    hud.caseFileUI.open({
      artifact: mission.artifact || 'UNKNOWN ARTIFACT',
      city: mission.city || 'UNKNOWN CITY',
      country: mission.country || 'UNKNOWN COUNTRY',
      description:
        mission.description ||
        'No case description available.',
      significance: mission.significance || '',
      clue: mission.clue || '',
      artifactKey: mission.artifactKey || ''
    });

    this.firstCaseTutorial?.onCaseFileOpened();
  }

  openNotes() {
    const hud = this.getPlayerHud();

    if (!hud?.notesUI) {
      console.warn(
        '[OfficeScene] PlayerHudScene or notesUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    hud.notesUI.open(this.gameState);
  }

  openDestinations() {
    const hud = this.getPlayerHud();

    if (!hud?.destinationsUI) {
      console.warn(
        '[OfficeScene] PlayerHudScene or destinationsUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    hud.destinationsUI.open(this.gameState);

    this.firstCaseTutorial?.onDestinationMapOpened();
  }

  openWarrant() {
    const hud = this.getPlayerHud();

    if (!hud?.warrantUI) {
      console.warn(
        '[OfficeScene] PlayerHudScene or warrantUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    hud.warrantUI.open(this.gameState);
  }

  openCrimeBoard() {
    const hud = this.getPlayerHud();

    if (!hud?.crimeBoardUI) {
      console.warn(
        '[OfficeScene] PlayerHudScene or crimeBoardUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    hud.crimeBoardUI.open(this.gameState);
  }

  openAtlas() {
    const hud = this.getPlayerHud();

    if (!hud?.atlasUI) {
      console.warn(
        '[OfficeScene] PlayerHudScene or atlasUI is unavailable.'
      );

      return;
    }

    this.closeAllUIPanels();

    const mission = this.gameState.currentMission || {};

    hud.atlasUI.open({
      country: mission.country || '',
      city: mission.city || '',
      artifact: mission.artifact || '',
      gameState: this.gameState
    });
  }

  closeAllUIPanels() {
    const hud = this.getPlayerHud();

    hud?.closeAllUIPanels?.();
  }

  onWakeOrResume() {
    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;

    this.applyLock(false);
    this.navigation?.updateVisibility();

    if (!this.officeAmbient?.isPlaying) {
      this.playOfficeAmbient();
    }

    void this.setupOfficeUiLayers();
  }

  onSleep() {
    this.navigation?.hideHint();

    if (this.officeAmbient?.isPlaying) {
      this.officeAmbient.pause();
    }
  }

  cleanupScene() {
    this.saveUI?.destroy();
    this.saveUI = null;

    this.firstCaseTutorial?.destroy();
    this.firstCaseTutorial = null;

    this.hotspotManager?.destroy();
    this.hotspotManager = null;

    this.navigation?.destroy();
    this.navigation = null;

    if (this.officeAmbient) {
      try {
        if (this.officeAmbient.isPlaying) {
          this.officeAmbient.stop();
        }

        if (!this.officeAmbient.pendingRemove) {
          this.officeAmbient.destroy();
        }
      } catch (error) {
        console.warn(
          '[OfficeScene] Office ambient cleanup failed:',
          error
        );
      }

      this.officeAmbient = null;
    }

    this.isOpeningCrimeLab = false;
    this.isOpeningRecoveredArtifacts = false;
    this.isOpeningWantedDatabase = false;
  }
}