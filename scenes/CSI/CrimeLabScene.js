import { BaseScene } from '../BaseScene.js';
import { audioManager } from '../../AudioManager.js';
import { gameState } from '../../GameData.js';
import { CrimeLabManager } from './CrimeLabManager.js';
import { CrimeLabHUD } from './CrimeLabHUD.js';

export class CrimeLabScene extends BaseScene {
  constructor() {
    super('CrimeLabScene');
    this.gameState = gameState;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;
    this.cityId = data.cityId || this.gameState.currentMission?.city || 'paris';

    // Inicjalizacja dedykowanego menedżera
    this.labManager = new CrimeLabManager(this.gameState, this.cityId);
    this.labManager.ensureCaseForensics();
    this.labManager.ensureRandomTraceEvidence();

    this.currentView = 'lab_b';
    this.completedCount = 0;
    this.totalStations = 3;
  }

  create() {
    super.create();

    audioManager.init(this);

    const { width, height } = this.scale;

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);
    this.createHotspots();
    this.createNavigationUI();
    
    // Inicjalizacja HUD
    this.hud = new CrimeLabHUD(this);
    this.hud.create();

    this.startCaseTimer();
    this.setupAudioUnlock();
    this.createOptionalDebug();

    this.goToView('lab_b', false);
    this.showIntroHint();
    this.refreshLabHud();

    this.input.keyboard.on('keydown-LEFT', this.boundMoveLeft);
    this.input.keyboard.on('keydown-RIGHT', this.boundMoveRight);

    this.events.on(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.RESUME, this.boundCheckMiniGameResults);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
  }

  // Wewnętrzne wywołania oddelegowane do labManager oraz hud
  refreshLabHud() {
    const remaining = this.getRemainingSeconds();
    this.hud.refresh(this.completedCount, this.totalStations, remaining);
  }

  cleanupScene() {
    this.input.keyboard.off('keydown-LEFT', this.boundMoveLeft);
    this.input.keyboard.off('keydown-RIGHT', this.boundMoveRight);

    this.events.off(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
    this.events.off(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
    this.events.off(Phaser.Scenes.Events.RESUME, this.boundCheckMiniGameResults);

    this.timerTickEvent?.remove(false);
    this.timerTickEvent = null;

    this.hotspots.forEach((zone) => {
      zone.removeAllListeners();
      zone.disableInteractive();

      zone.statusLabel?.destroy();

      if (zone.exitBtn) {
        zone.exitBtn.removeAllListeners();
        zone.exitBtn.destroy();
      }

      zone.destroy();
    });

    this.hotspots = [];

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => {
      text.destroy();
    });

    this.debugTexts = [];

    // Niszczenie instancji HUD
    this.hud?.destroy();
    this.hud = null;

    [
      'leftArrow',
      'rightArrow',
      'officeArrow',
      'navHint',
      'introHint',
      'proceedHotspot'
    ].forEach((property) => {
      if (!this[property]) return;

      this[property].removeAllListeners?.();
      this[property].destroy();
      this[property] = null;
    });

    this.stopLabAmbient();
  }
}