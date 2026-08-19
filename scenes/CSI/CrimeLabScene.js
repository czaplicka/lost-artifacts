import { BaseScene } from '../BaseScene.js';
import { audioManager } from '../../AudioManager.js';
import { gameState } from '../../GameData.js';
import { saveGameState } from '../../GameStatePersistence.js';
import { CrimeLabManager } from './CrimeLabManager.js';
import { CrimeLabHUD } from './CrimeLabHUD.js';
import { EventBus } from '../../EventBus.js';

export class CrimeLabScene extends BaseScene {
  constructor() {
super({ key: 'CrimeLabScene' });

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.currentView = 'lab_b';
    this.viewPositions = {};
    this.rooms = {};
    this.totalWidth = 0;

    this.hotspots = [];
    this.debugTexts = [];
    this.DEBUG_HOTSPOTS = false;
    this.debugGraphics = null;

    this.labAmbient = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;
    this.proceedHotspot = null;

    this.uiLocked = false;
    this.completedCount = 0;
    this.totalStations = 3;

    this.boundMoveLeft = this.moveLeft.bind(this);
    this.boundMoveRight = this.moveRight.bind(this);
    this.boundForceUnlock = this.forceUnlock.bind(this);
    this.boundCheckMiniGameResults = this.checkMiniGameResults.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;
    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.crimeCityId ||
      'paris';

    this.returnScene = 'CrimeCityScene';
    this.returnData = {
      ...(data.returnData || {}),
      cityId: this.cityId,
      gameState: this.gameState
    };

    this.labManager = new CrimeLabManager(this.gameState, this.cityId);
    this.labManager.ensureCaseForensics();
    this.labManager.ensureRandomTraceEvidence();

    this.currentView = 'lab_b';
    this.hotspots = [];
    this.debugTexts = [];
    this.uiLocked = false;
    this.completedCount = 0;
  }

  create() {
    super.create();
this.game.events.emit('setHudVisible', false);
EventBus.emit('hideHUD');
    audioManager.init(this);

    const { width, height } = this.scale;

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);
    this.createHotspots();
    this.createNavigationUI();

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

  createBackgrounds(gameWidth, gameHeight) {
    const leftBg = this.add.image(0, 0, 'crimelab_left').setOrigin(0, 0);
    const centerBg = this.add.image(gameWidth, 0, 'crimelab_center').setOrigin(0, 0);
    const rightBg = this.add.image(gameWidth * 2, 0, 'crimelab_right').setOrigin(0, 0);

    [leftBg, centerBg, rightBg].forEach((background) => {
      background.setDisplaySize(gameWidth, gameHeight);
    });

    this.rooms = {
      lab_a: { key: 'lab_a', bg: leftBg, x: 0, width: gameWidth },
      lab_b: { key: 'lab_b', bg: centerBg, x: gameWidth, width: gameWidth },
      lab_c: { key: 'lab_c', bg: rightBg, x: gameWidth * 2, width: gameWidth }
    };

    this.totalWidth = gameWidth * 3;
    this.viewPositions = {
      lab_a: this.rooms.lab_a.x,
      lab_b: this.rooms.lab_b.x,
      lab_c: this.rooms.lab_c.x
    };
  }

  createCameraSetup(height) {
    this.cameras.main.setBounds(0, 0, this.totalWidth, height);
  }

  createHotspots() {
    const gameWidth = this.scale.width;
    const caseForensics = this.labManager.ensureCaseForensics();

    const identityEvidence = this.labManager.getIdentityEvidenceConfig();
    const trace0 = this.labManager.getTraceEvidenceConfig(0);
    const trace1 = this.labManager.getTraceEvidenceConfig(1);

    const hotspotData = [
      {
        id: 'identity_station',
        room: 'lab_a',
        x: this.rooms.lab_a.x + 320,
        y: 490,
        width: 250,
        height: 320,
        label: identityEvidence.label,
        completed: Boolean(caseForensics.identityEvidenceResult),
        action: () => {
          this.enterMiniGame(
            identityEvidence.minigame,
            {
              evidenceConfig: identityEvidence,
              evidenceIndex: null,
              evidenceType: identityEvidence.evidenceType,
              correctValue: identityEvidence.correctValue,
              clueType: identityEvidence.clueType,
              clueText: identityEvidence.clueText
            },
            'identity'
          );
        }
      },
      {
        id: 'trace_a_station',
        room: 'lab_b',
        x: this.rooms.lab_b.x + 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace0.label,
        completed: Boolean(caseForensics.traceEvidenceResults[0]),
        action: () => {
          this.enterMiniGame(
            trace0.minigame,
            {
              evidenceConfig: trace0,
              evidenceIndex: 0,
              evidenceType: trace0.evidenceType,
              correctValue: trace0.correctValue,
              clueType: trace0.clueType,
              clueText: trace0.clueText
            },
            'trace_0'
          );
        }
      },
      {
        id: 'trace_b_station',
        room: 'lab_c',
        x: this.rooms.lab_c.x + 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace1.label,
        completed: Boolean(caseForensics.traceEvidenceResults[1]),
        action: () => {
          this.enterMiniGame(
            trace1.minigame,
            {
              evidenceConfig: trace1,
              evidenceIndex: 1,
              evidenceType: trace1.evidenceType,
              correctValue: trace1.correctValue,
              clueType: trace1.clueType,
              clueText: trace1.clueText
            },
            'trace_1'
          );
        }
      },
      {
        id: 'exit_lab',
        room: 'lab_a',
        x: this.rooms.lab_a.x + 40,
        y: 40,
        width: 200,
        height: 60,
        label: 'Exit Lab',
        alwaysVisible: true,
        action: () => this.exitLab()
      }
    ];

    this.completedCount = hotspotData.filter((h) => h.completed).length;

    hotspotData.forEach((data) => {
      const zone = this.add
        .zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });

      zone.hotspotData = data;

      if (data.id === 'exit_lab') {
        const exitBtn = this.add
          .image(data.x + data.width / 2, data.y + data.height / 2, 'btnExit')
          .setScale(0.5)
          .setOrigin(0.5)
          .setDepth(55)
          .setInteractive({ useHandCursor: true });

        exitBtn.on('pointerover', () => {
          if (this.uiLocked) return;
          exitBtn.setScale(0.6);
          this.showNavHint(data.label);
        });

        exitBtn.on('pointerout', () => {
          exitBtn.setScale(0.5);
          this.hideNavHint();
        });

        exitBtn.on('pointerdown', () => {
          if (this.uiLocked) return;
          audioManager.playSfx('click_sound');
          data.action();
        });

        zone.exitBtn = exitBtn;
      }

      zone.on('pointerover', () => this.onHotspotOver(data));
      zone.on('pointerout', () => this.onHotspotOut());
      zone.on('pointerdown', () => {
        if (this.uiLocked) return;
        if (data.completed && !data.alwaysVisible) return;
        audioManager.playSfx('click_sound');
        data.action();
      });

      this.hotspots.push(zone);

      if (!data.alwaysVisible) {
        const label = this.add
          .text(
            data.x + data.width / 2,
            data.y + data.height + 10,
            data.completed ? '[ COMPLETE ]' : '[ ANALYZE ]',
            {
              fontFamily: 'PressStart2P',
              fontSize: '8px',
              color: data.completed ? '#00ff00' : '#ffcc00'
            }
          )
          .setOrigin(0.5)
          .setDepth(60);

        zone.statusLabel = label;
      }
    });

    this.proceedHotspot = this.add
      .text(this.rooms.lab_b.x + gameWidth / 2, 88, '', {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#39ff14',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });

    this.proceedHotspot.on('pointerdown', () => this.goToCrimeCity());
    this.updateProceedVisibility();
  }

  createNavigationUI() {
    const { width, height } = this.scale;

    this.leftArrow = this.add
      .text(46, height / 2, '◀', {
        fontFamily: 'Special Elite',
        fontSize: '54px',
        color: '#39ff14',
        backgroundColor: 'rgba(0,0,0,0.15)',
        padding: { left: 8, right: 8, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add
      .text(width - 46, height / 2, '▶', {
        fontFamily: 'Special Elite',
        fontSize: '54px',
        color: '#39ff14',
        backgroundColor: 'rgba(0,0,0,0.15)',
        padding: { left: 8, right: 8, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.navHint = this.add
      .text(width / 2, 92, '', {
        fontFamily: 'Special Elite',
        fontSize: '20px',
        color: '#39ff14',
        backgroundColor: '#000000',
        padding: { left: 10, right: 10, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false);

    this.introHint = this.add
      .text(width / 2, 110, 'Welcome to the Crime Lab — move left or right', {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#fff4c7',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setAlpha(0);

    this.leftArrow
      .on('pointerdown', () => this.moveLeft())
      .on('pointerover', () => {
        if (this.uiLocked) return;
        this.leftArrow.setScale(1.08).setAlpha(1);
        this.showNavHint(this.getLeftRoomLabel());
      })
      .on('pointerout', () => {
        this.leftArrow.setScale(1);
        if (!this.uiLocked) this.leftArrow.setAlpha(0.75);
        this.hideNavHint();
      });

    this.rightArrow
      .on('pointerdown', () => this.moveRight())
      .on('pointerover', () => {
        if (this.uiLocked) return;
        this.rightArrow.setScale(1.08).setAlpha(1);
        this.showNavHint(this.getRightRoomLabel());
      })
      .on('pointerout', () => {
        this.rightArrow.setScale(1);
        if (!this.uiLocked) this.rightArrow.setAlpha(0.75);
        this.hideNavHint();
      });

    this.tweens.add({
      targets: [this.leftArrow, this.rightArrow],
      alpha: { from: 0.55, to: 0.9 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.updateNavVisibility();
  }

  moveLeft() {
    if (this.uiLocked) return;
    if (this.currentView === 'lab_b') this.goToView('lab_a');
    else if (this.currentView === 'lab_c') this.goToView('lab_b');
  }

  moveRight() {
    if (this.uiLocked) return;
    if (this.currentView === 'lab_a') this.goToView('lab_b');
    else if (this.currentView === 'lab_b') this.goToView('lab_c');
  }

  goToView(viewName, animate = true) {
    const targetX = this.viewPositions[viewName];
    if (targetX === undefined) return;

    this.currentView = viewName;
    this.updateNavVisibility();
    this.hideNavHint();

    if (!animate) {
      this.cameras.main.scrollX = targetX;
      return;
    }

    this.tweens.add({
      targets: this.cameras.main,
      scrollX: targetX,
      duration: 550,
      ease: 'Sine.easeInOut'
    });
  }

  updateNavVisibility() {
    this.leftArrow?.setVisible(this.currentView !== 'lab_a');
    this.rightArrow?.setVisible(this.currentView !== 'lab_c');
  }
updateProceedVisibility() {
  if (!this.proceedHotspot) return;

  const labCompleted =
    this.completedCount >= this.totalStations;

  const canProceed =
    labCompleted &&
    !this.uiLocked;

  if (!labCompleted) {
    this.proceedHotspot
      .setText('')
      .setVisible(false)
      .disableInteractive();

    return;
  }

  this.proceedHotspot
    .setText('[ RETURN TO CRIME CITY ]')
    .setVisible(true)
    .setAlpha(canProceed ? 1 : 0.45);

  if (canProceed) {
    this.proceedHotspot.setInteractive({
      useHandCursor: true
    });
  } else {
    this.proceedHotspot.disableInteractive();
  }
}
  getLeftRoomLabel() {
    if (this.currentView === 'lab_b') return 'Identity Lab';
    if (this.currentView === 'lab_c') return 'Trace Analysis';
    return '';
  }

  getRightRoomLabel() {
    if (this.currentView === 'lab_a') return 'Trace Analysis';
    if (this.currentView === 'lab_b') return 'Evidence Analysis';
    return '';
  }

  showNavHint(text) {
    if (!text || !this.navHint) return;
    this.navHint.setText(text).setVisible(true);
  }

  hideNavHint() {
    this.navHint?.setVisible(false);
  }

  onHotspotOver(data) {
    if (!data?.label || this.uiLocked) return;
    this.showNavHint(data.label);
  }

  onHotspotOut() {
    this.hideNavHint();
  }

  showIntroHint() {
    if (!this.introHint) return;

    this.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2'
    });

    this.time.delayedCall(2800, () => {
      if (!this.introHint) return;
      this.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2'
      });
    });
  }

  setupAudioUnlock() {
    this.input.once('pointerdown', () => {
      if (this.sound?.context?.state === 'suspended') {
        this.sound.context.resume();
      }
      this.playLabAmbient();
    });
  }

  playLabAmbient() {
    if (this.labAmbient) return;
    this.labAmbient = audioManager.playSfx('crimelab_ambient', { loop: true });
  }

  stopLabAmbient() {
    if (!this.labAmbient) return;
    this.labAmbient.stop();
    this.labAmbient.destroy();
    this.labAmbient = null;
  }
  enterMiniGame(sceneKey, sceneData = {}, stationId = '') {
    if (this.uiLocked) return;

    if (!sceneKey || !this.scene.manager.keys[sceneKey]) {
      console.error(
        `[CrimeLabScene] Minigame scene "${sceneKey}" is not registered.`
      );

      this.showNavHint('ANALYSIS STATION UNAVAILABLE');
      return;
    }

    this.uiLocked = true;
    this.applyLock(true);

    const minigameData = {
      ...sceneData,
      stationId,
      cityId: this.cityId,
      caseKey: this.labManager.getCaseKey(),
      gameState: this.gameState
    };

    this.scene.launch(sceneKey, minigameData);

    const minigameScene = this.scene.get(sceneKey);

    minigameScene.events.once(
      'minigame-complete',
      (payload) => this.saveMiniGameResult(payload),
      this
    );

    minigameScene.events.once(
      'minigame-closed',
      () => this.returnFromMiniGame(),
      this
    );

    this.scene.pause();
  }

  saveMiniGameResult(payload = {}) {
    const caseForensics = this.labManager.ensureCaseForensics();

    if (!payload.completed || payload.aborted) {
      return;
    }

    const forensicResult = {
      ...payload,
      completedAt: Date.now()
    };

    if (payload.stationId === 'identity') {
      caseForensics.identityEvidenceResult = forensicResult;
    }

    if (
      typeof payload.stationId === 'string' &&
      payload.stationId.startsWith('trace_')
    ) {
      const evidenceIndex = Number(
        payload.stationId.replace('trace_', '')
      );

      if (Number.isInteger(evidenceIndex) && evidenceIndex >= 0) {
        caseForensics.traceEvidenceResults[evidenceIndex] =
          forensicResult;
      }
    }

    const existingResultIndex = caseForensics.forensicResults.findIndex(
      (result) => result.stationId === payload.stationId
    );

    if (existingResultIndex >= 0) {
      caseForensics.forensicResults[existingResultIndex] =
        forensicResult;
    } else {
      caseForensics.forensicResults.push(forensicResult);
    }

    saveGameState();
  }

returnFromMiniGame() {
  if (!this.scene.isPaused(this.scene.key)) {
    return;
  }

  this.scene.resume(this.scene.key);

  this.uiLocked = false;
  this.applyLock(false);

  this.checkMiniGameResults();
  this.refreshLabHud();
}

  getTimerStateKey() {
    const candidates = [
      'caseTimeRemaining',
      'timeRemaining',
      'timeLeft',
      'missionTimeRemaining'
    ];
    return candidates.find((key) => Number.isFinite(Number(this.gameState[key])));
  }

  getRemainingSeconds() {
    const key = this.getTimerStateKey();
    if (!key) return null;
    return Math.max(0, Math.floor(Number(this.gameState[key])));
  }

  setRemainingSeconds(seconds) {
    const key = this.getTimerStateKey();
    if (!key) return;
    this.gameState[key] = Math.max(0, seconds);
  }

  startCaseTimer() {
    this.timerTickEvent?.remove(false);

    this.timerTickEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.scene.isPaused(this.scene.key) || this.uiLocked) {
          this.refreshLabHud();
          return;
        }

        const remaining = this.getRemainingSeconds();
        if (remaining === null) {
          this.refreshLabHud();
          return;
        }

        if (remaining <= 0) {
          this.handleTimeExpired();
          return;
        }

        this.setRemainingSeconds(remaining - 1);
        this.refreshLabHud();
      }
    });
  }

  handleTimeExpired() {
    this.timerTickEvent?.remove(false);
    this.timerTickEvent = null;

    this.uiLocked = true;
    this.applyLock(true);

    saveGameState();

    const { width, height } = this.scale;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(2200)
      .setInteractive();

    const text = this.add
      .text(
        width / 2,
        height / 2,
        'CASE TIME EXPIRED\n\nThe trail has gone cold.\nThe thief is already on a plane with your evidence.',
        {
          fontFamily: 'Special Elite',
          fontSize: '28px',
          color: '#ff8c8c',
          align: 'center',
          wordWrap: { width: width - 90 }
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2201);

    const button = this.add
      .text(width / 2, height / 2 + 125, '[ RETURN TO OFFICE ]', {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: '#ffcc00',
        backgroundColor: '#000000',
        padding: { left: 12, right: 12, top: 10, bottom: 10 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2201)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      overlay.destroy();
      text.destroy();
      button.destroy();

      this.stopLabAmbient();

      if (this.scene.manager.keys.OfficeScene) {
        this.scene.start('OfficeScene', {
          gameState: this.gameState,
          caseFailedByTime: true
        });
      }
    });
  }

  refreshLabHud() {
    const remaining = this.getRemainingSeconds();
    this.hud?.refresh(this.completedCount, this.totalStations, remaining);
  }

  checkMiniGameResults() {
  const caseForensics = this.labManager.ensureCaseForensics();

  const completedById = {
    identity_station: Boolean(caseForensics.identityEvidenceResult),
    trace_a_station: Boolean(caseForensics.traceEvidenceResults[0]),
    trace_b_station: Boolean(caseForensics.traceEvidenceResults[1]),
  };

  this.completedCount = Object.values(completedById)
    .filter(Boolean)
    .length;

  this.hotspots.forEach((zone) => {
    const data = zone.hotspotData;

    if (!data || data.alwaysVisible) {
      return;
    }

    const completed = Boolean(completedById[data.id]);

    data.completed = completed;

    zone.statusLabel
      ?.setText(completed ? '[ COMPLETE ]' : '[ ANALYZE ]')
      .setColor(completed ? '#00ff00' : '#ffcc00');

    if (completed) {
      zone.disableInteractive();
    }
  });

  this.refreshLabHud();
  this.updateProceedVisibility();
}

  applyLock(locked) {
  this.uiLocked = locked;
 
  this.hotspots?.forEach?.((zone) => {
    if (!zone || zone.isDestroyed) return;
 
    const data = zone.hotspotData;
 
    if (locked) {
      // SAFE: sprawdzenie przed disable
      if (zone.input && !zone.isDestroyed) {
        zone.disableInteractive?.();
      }
      if (zone.exitBtn?.input && !zone.exitBtn.isDestroyed) {
        zone.exitBtn.disableInteractive?.();
      }
      return;
    }
 
    if (!data?.completed || data.alwaysVisible) {
      if (zone.input && !zone.isDestroyed) {
        zone.setInteractive?.({ useHandCursor: true });
      }
    } else {
      if (zone.input && !zone.isDestroyed) {
        zone.disableInteractive?.();
      }
    }
 
    if (zone.exitBtn && zone.exitBtn.input && !zone.exitBtn.isDestroyed) {
      zone.exitBtn.setInteractive?.({ useHandCursor: true });
    }
  });
 
  if (this.proceedHotspot && this.proceedHotspot.input && !this.proceedHotspot.isDestroyed) {
    if (locked) {
      this.proceedHotspot.disableInteractive?.();
    } else if (this.completedCount >= this.totalStations) {
      this.proceedHotspot.setInteractive?.({ useHandCursor: true });
    } else {
      this.proceedHotspot.disableInteractive?.();
    }
  }
 
  [this.leftArrow, this.rightArrow].forEach((arrow) => {
    if (!arrow || arrow.isDestroyed) return;
 
    if (locked) {
      if (arrow.input && !arrow.isDestroyed) {
        arrow.disableInteractive?.();
      }
      arrow.setAlpha?.(0.35);
    } else {
      if (arrow.input && !arrow.isDestroyed) {
        arrow.setInteractive?.({ useHandCursor: true });
      }
      arrow.setAlpha?.(0.75);
    }
  });
 
  if (locked) {
    this.hideNavHint();
  } else {
    this.updateNavVisibility();
    this.updateProceedVisibility();
  }
}

forceUnlock() {
  if (this.scene.isPaused(this.scene.key)) {
    return;
  }

  this.uiLocked = false;
  this.applyLock(false);
}

  exitLab() {
  if (this.uiLocked) return;
 
  const targetScene = 'CrimeCityScene';
 
  // SAFE: Sprawdzenie czy scena istnieje
  if (!this.scene?.manager?.keys || !this.scene.manager.keys[targetScene]) {
    console.error('[CrimeLabScene] CrimeCityScene not registered in scene manager');
    this.showNavHint('CRIME CITY UNAVAILABLE');
    return;
  }
 
  this.uiLocked = true;
  this.applyLock(true);
  this.stopLabAmbient();
 
  const sceneData = {
    ...(this.returnData || {}),
    cityId: this.cityId,
    caseKey: this.labManager?.getCaseKey?.() || 'default_case',
    gameState: this.gameState,
    crimeLabCompleted: this.completedCount >= this.totalStations,
    fromCrimeLab: true
  };
 
  // SAFE: Fade out i start nowej sceny
  try {
    this.cameras.main.fadeOut(300, 0, 0, 0);
 
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        try {
          this.scene.start(targetScene, sceneData);
        } catch (err) {
          console.error('[CrimeLabScene] Failed to start CrimeCityScene:', err);
          // Fallback: spróbuj fade in i odblokuj UI
          this.uiLocked = false;
          this.applyLock(false);
          this.cameras.main.fadeIn(300, 0, 0, 0);
          this.showNavHint('ERROR: Cannot switch scenes');
        }
      }
    );
  } catch (err) {
    console.error('[CrimeLabScene] exitLab() failed during transition:', err);
    this.uiLocked = false;
    this.applyLock(false);
    this.showNavHint('EXIT FAILED');
  }
}

  goToCrimeCity() {
  if (this.uiLocked) return;
  if (this.completedCount < this.totalStations) return;

  if (!this.scene.manager.keys.CrimeCityScene) {
    this.showNavHint('CRIME CITY UNAVAILABLE');
    return;
  }

  this.uiLocked = true;
  this.applyLock(true);

  this.labManager.markCrimeLabCompleted();
  saveGameState();
  this.stopLabAmbient();

  this.cameras.main.fadeOut(350, 0, 0, 0);

  this.cameras.main.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
      this.scene.start('CrimeCityScene', {
        cityId: this.cityId,
        caseKey: this.labManager.getCaseKey(),
        gameState: this.gameState,
        crimeLabCompleted: true,
        showLabCompletionPhoneCall: true,
        returnData: {
          ...this.returnData,
          cityId: this.cityId,
          gameState: this.gameState
        }
      });
    }
  );
}

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) return;

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
      const data = zone.hotspotData;

      this.debugGraphics.strokeRect(data.x, data.y, data.width, data.height);

      const label = this.add
        .text(data.x + 8, data.y + 8, data.id, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: { left: 4, right: 4, top: 2, bottom: 2 }
        })
        .setDepth(999);

      this.debugTexts.push(label);
    });
  }

  cleanupScene() {
  console.log('[CrimeLabScene] Cleanup started');
 
  // Unbind keyboard
  this.input.keyboard?.off?.('keydown-LEFT', this.boundMoveLeft);
  this.input.keyboard?.off?.('keydown-RIGHT', this.boundMoveRight);
 
  // Unbind scene events
  this.events?.off?.(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
  this.events?.off?.(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
  this.events?.off?.(Phaser.Scenes.Events.RESUME, this.boundCheckMiniGameResults);
 
  // Clear timer
  this.timerTickEvent?.remove?.(false);
  this.timerTickEvent = null;
 
  // Cleanup hotspots - SAFE
  if (Array.isArray(this.hotspots)) {
    this.hotspots.forEach((zone) => {
      if (!zone) return;
 
      zone.removeAllListeners?.();
      
      // SAFE: check czy scene i input istnieją
      if (zone.scene?.sys?.input && !zone.isDestroyed) {
        zone.disableInteractive?.();
      }
 
      zone.statusLabel?.destroy?.();
 
      if (zone.exitBtn) {
        zone.exitBtn.removeAllListeners?.();
        
        if (zone.exitBtn.scene?.sys?.input && !zone.exitBtn.isDestroyed) {
          zone.exitBtn.disableInteractive?.();
        }
        
        zone.exitBtn.destroy?.();
      }
 
      zone.destroy?.();
    });
  }
 
  this.hotspots = [];
 
  // Cleanup debug graphics
  this.debugGraphics?.destroy?.();
  this.debugGraphics = null;
 
  if (Array.isArray(this.debugTexts)) {
    this.debugTexts.forEach((text) => {
      text?.destroy?.();
    });
  }
 
  this.debugTexts = [];
 
  // Cleanup HUD
  this.hud?.destroy?.();
  this.hud = null;
 
  // Cleanup UI elements - SAFE
  [
    'leftArrow',
    'rightArrow',
    'navHint',
    'introHint',
    'proceedHotspot'
  ].forEach((property) => {
    const element = this[property];
    if (!element) return;
 
    element.removeAllListeners?.();
    
    // SAFE: check scene przed disableInteractive
    if (element.scene?.sys?.input && !element.isDestroyed) {
      element.disableInteractive?.();
    }
    
    element.destroy?.();
    this[property] = null;
  });
 
  // Stop ambient sound
  this.stopLabAmbient?.();
 
  console.log('[CrimeLabScene] Cleanup complete');
}
}