import { audioManager } from '../../AudioManager.js';
import { gameState, saveGameState } from '../../GameData.js';
import { BaseScene } from '../BaseScene.js';
import { getEnergyManager } from '../../EnergyManager.js';

export class CrimeLabScene extends BaseScene {
  constructor() {
    super('CrimeLabScene');

    this.currentView = 'lab_b';
    this.viewPositions = {};
    this.hotspots = [];
    this.debugTexts = [];
    this.DEBUG_HOTSPOTS = true;

    this.labAmbient = null;
    this.debugGraphics = null;

    this.leftArrow = null;
    this.rightArrow = null;
    this.officeArrow = null;
    this.navHint = null;
    this.introHint = null;

    this.uiLocked = false;
    this.completedCount = 0;
    this.totalStations = 3;
    this.proceedHotspot = null;

    this.boundMoveLeft = this.moveLeft.bind(this);
    this.boundMoveRight = this.moveRight.bind(this);
    this.boundForceUnlock = this.forceUnlock.bind(this);
    this.boundCheckMiniGameResults = this.checkMiniGameResults.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;
  }

  create() {
    super.create();
this.energyManager = getEnergyManager();
    audioManager.init(this);

    const newsHud = this.scene.manager.keys.NewsHud;

    if (newsHud) {
      newsHud.events.emit('setNewspaperVisible', false);
      newsHud.events.emit('setTvVisible', false);
    }

    const { width, height } = this.scale;

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);
    this.createHotspots();
    this.createNavigationUI();
    this.setupAudioUnlock();
    this.createOptionalDebug();

    this.goToView('lab_b', false);
    this.showIntroHint();

    this.input.keyboard.on('keydown-LEFT', this.boundMoveLeft);
    this.input.keyboard.on('keydown-RIGHT', this.boundMoveRight);

    this.events.on(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.boundCleanupScene);
    this.events.on('resume', this.boundCheckMiniGameResults);
  }

  // ----------------------------------------------------------
  // Evidence configuration
  // ----------------------------------------------------------

  getIdentityEvidenceConfig() {
    const identityEvidence = this.gameState.identityEvidence || {};

    return {
      id: identityEvidence.id || 'identity_fragment',
      label: identityEvidence.label || 'Identity Analysis Station',
      minigame: identityEvidence.minigame || 'HairAnalysisScene',
      evidenceType: identityEvidence.attribute || 'hair_color',
      correctValue: identityEvidence.thief_value || 'unknown',
      clueType: identityEvidence.clueType || 'identity',
      clueText: identityEvidence.clueText
        || 'Identity evidence has been added to the case file.'
    };
  }

  getTraceEvidenceConfig(index) {
    const traceEvidence = this.gameState.traceEvidence || [];
    const storedEvidence = traceEvidence[index] || {};

    const defaults = [
      {
        id: 'lock_cylinder_marks',
        label: 'Toolmark Analysis',
        minigame: 'ToolmarkAnalysisScene',
        evidenceType: 'toolmark_profile',
        correctValue: 'triple_rake_left_handed',
        clueType: 'means',
        clueText: 'The museum lock was picked by a skilled, left-handed intruder using a triple-rake pick.'
      },
      {
        id: 'cctv_footage',
        label: 'CCTV Reconstruction',
        minigame: 'CCTVScrubberScene',
        evidenceType: 'cctv',
        correctValue: null,
        clueType: 'opportunity',
        clueText: 'The footage may reveal when the intruder entered or left the museum.'
      }
    ];

    return {
      ...defaults[index],
      ...storedEvidence
    };
  }

  // ----------------------------------------------------------
  // Lab rooms
  // ----------------------------------------------------------

  createBackgrounds(gameWidth, gameHeight) {
    const leftBg = this.add.image(0, 0, 'crimelab_left').setOrigin(0, 0);

    const centerBg = this.add.image(
      gameWidth,
      0,
      'crimelab_center'
    ).setOrigin(0, 0);

    const rightBg = this.add.image(
      gameWidth * 2,
      0,
      'crimelab_right'
    ).setOrigin(0, 0);

    [leftBg, centerBg, rightBg].forEach((background) => {
      background.setDisplaySize(gameWidth, gameHeight);
    });

    this.rooms = {
      lab_a: {
        key: 'lab_a',
        bg: leftBg,
        x: 0,
        width: gameWidth
      },
      lab_b: {
        key: 'lab_b',
        bg: centerBg,
        x: gameWidth,
        width: gameWidth
      },
      lab_c: {
        key: 'lab_c',
        bg: rightBg,
        x: gameWidth * 2,
        width: gameWidth
      }
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

  // ----------------------------------------------------------
  // Station hotspots
  // ----------------------------------------------------------

  createHotspots() {
    const W = this.scale.width;

    const identityEvidence = this.getIdentityEvidenceConfig();
    const trace0 = this.getTraceEvidenceConfig(0);
    const trace1 = this.getTraceEvidenceConfig(1);

    const hotspotData = [
      {
        id: 'identity_station',
        room: 'lab_a',
        x: this.rooms.lab_a.x + 320,
        y: 490,
        width: 250,
        height: 320,
        label: identityEvidence.label,
        completed: !!this.gameState.identityEvidenceResult,
        action: () => this.enterMiniGame(
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
        )
      },
      {
        id: 'trace_a_station',
        room: 'lab_b',
        x: this.rooms.lab_b.x + 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace0.label,
        completed: !!this.gameState.traceEvidenceResults?.[0],
        action: () => this.enterMiniGame(
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
        )
      },
      {
        id: 'trace_b_station',
        room: 'lab_c',
        x: this.rooms.lab_c.x + 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace1.label,
        completed: !!this.gameState.traceEvidenceResults?.[1],
        action: () => this.enterMiniGame(
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
        )
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

    this.completedCount = hotspotData.filter(
      (hotspot) => hotspot.completed
    ).length;

    hotspotData.forEach((data) => {
      const zone = this.add.zone(
        data.x,
        data.y,
        data.width,
        data.height
      )
        .setOrigin(0, 0)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });

      zone.hotspotData = data;

      if (data.id === 'exit_lab') {
        const exitBtn = this.add.image(
          data.x + data.width / 2,
          data.y + data.height / 2,
          'btnExit'
        )
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
        const statusText = data.completed
          ? '[ COMPLETE ]'
          : '[ ANALYZE ]';

        const statusColor = data.completed
          ? '#00ff00'
          : '#ffcc00';

        const label = this.add.text(
          data.x + data.width / 2,
          data.y + data.height + 10,
          statusText,
          {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: statusColor
          }
        )
          .setOrigin(0.5)
          .setDepth(60);

        zone.statusLabel = label;
      }
    });

    this.proceedHotspot = this.add.text(
      this.rooms.lab_b.x + W / 2,
      50,
      '',
      {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#39ff14',
        backgroundColor: '#000000',
        padding: {
          left: 12,
          right: 12,
          top: 8,
          bottom: 8
        }
      }
    )
      .setOrigin(0.5)
      .setDepth(80)
      .setInteractive({ useHandCursor: true });

    this.proceedHotspot.on('pointerdown', () => {
      this.goToSuspectBoard();
    });

    this.updateProceedVisibility();
  }

  // ----------------------------------------------------------
  // Minigame communication
  // ----------------------------------------------------------

  enterMiniGame(sceneKey, sceneData, stationId) {
    if (this.uiLocked) return;

    this.uiLocked = true;
    this.applyLock(true);
const result = this.energyManager.consumeActivity('csi_lab');
console.log(`🔬 ${result.label}`);

if (result.energyReachedZero) {
  // Nie można kontynuować
  return;
}

// Uruchom mini-grę...
    const fullData = {
      ...sceneData,
      gameState: this.gameState,
      stationId,
      startScore: 100,
      maxScore: 120,
      totalSteps: 3
    };

    this.scene.pause();
    this.scene.launch(sceneKey, fullData);
    this.scene.bringToTop(sceneKey);

    const targetScene = this.scene.get(sceneKey);

    targetScene.events.once('minigame-complete', (result) => {
      this.onMiniGameComplete(stationId, result || {});
    });

    targetScene.events.once('minigame-closed', () => {
      if (this.scene.isPaused()) {
        this.scene.resume();
      }

      this.scene.bringToTop('CrimeLabScene');
      this.forceUnlock();
    });
  }

  onMiniGameComplete(stationId, result = {}) {
    const score = result.score ?? 0;
    const value = result.value ?? null;
    const evidenceType = result.evidenceType || 'generic';
    const mistakes = result.mistakes ?? 0;
    const secondsElapsed = result.secondsElapsed ?? 0;

    let wasCompleted = false;
    let clueType = 'trace';
    let clueText = 'Forensic evidence has been analyzed.';
    let evidenceId = stationId;

    const baseResult = {
      stationId,
      evidenceType,
      value,
      score,
      mistakes,
      secondsElapsed,
      completed: true,
      completedAt: Date.now()
    };

    if (stationId === 'identity') {
      const identityEvidence = this.getIdentityEvidenceConfig();

      wasCompleted = !!this.gameState.identityEvidenceResult;
      clueType = identityEvidence.clueType;
      clueText = identityEvidence.clueText;
      evidenceId = identityEvidence.id;

      this.gameState.identityEvidenceResult = {
        ...baseResult,
        evidenceId,
        clueType,
        clueText
      };
    } else {
      const traceIndex = stationId === 'trace_0' ? 0 : 1;
      const traceEvidence = this.getTraceEvidenceConfig(traceIndex);

      if (!this.gameState.traceEvidenceResults) {
        this.gameState.traceEvidenceResults = [];
      }

      wasCompleted = !!this.gameState.traceEvidenceResults[traceIndex];
      clueType = traceEvidence.clueType;
      clueText = traceEvidence.clueText;
      evidenceId = traceEvidence.id;

      this.gameState.traceEvidenceResults[traceIndex] = {
        ...baseResult,
        evidenceId,
        clueType,
        clueText
      };
    }

    this.gameState.forensicResults ??= [];

    const forensicResult = {
      ...baseResult,
      evidenceId,
      clueType,
      clueText
    };

    const existingResultIndex = this.gameState.forensicResults.findIndex(
      (storedResult) => storedResult.stationId === stationId
    );

    if (existingResultIndex >= 0) {
      this.gameState.forensicResults[existingResultIndex] = forensicResult;
    } else {
      this.gameState.forensicResults.push(forensicResult);
    }

    // Punkty globalne przyznajemy tylko przy pierwszym ukończeniu stacji.
    if (!wasCompleted) {
      this.completedCount += 1;
      this.gameState.score = (this.gameState.score || 0) + score;
    }

    const hotspotIdMap = {
      identity: 'identity_station',
      trace_0: 'trace_a_station',
      trace_1: 'trace_b_station'
    };

    const hotspot = this.hotspots.find(
      (hotspotZone) => (
        hotspotZone.hotspotData.id === hotspotIdMap[stationId]
      )
    );

    if (hotspot) {
      hotspot.hotspotData.completed = true;

      if (hotspot.statusLabel) {
        hotspot.statusLabel.setText('[ COMPLETE ]');
        hotspot.statusLabel.setColor('#00ff00');
      }
    }

    saveGameState();
    this.updateProceedVisibility();
    this.forceUnlock();
  }

  checkMiniGameResults() {
    let count = 0;

    if (this.gameState.identityEvidenceResult) {
      count += 1;
    }

    if (this.gameState.traceEvidenceResults?.[0]) {
      count += 1;
    }

    if (this.gameState.traceEvidenceResults?.[1]) {
      count += 1;
    }

    this.completedCount = count;
    this.updateProceedVisibility();
  }

  updateProceedVisibility() {
    if (!this.proceedHotspot) return;

    const allStationsComplete = this.completedCount >= this.totalStations;

    if (allStationsComplete) {
      this.proceedHotspot.setText('[ PROCEED TO SUSPECT BOARD ]');
      this.proceedHotspot.setVisible(true);
      return;
    }

    this.proceedHotspot.setText('');
    this.proceedHotspot.setVisible(false);
  }

  // ----------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------

  createNavigationUI() {
    const { width, height } = this.scale;

    this.leftArrow = this.add.text(46, height / 2, '\u25C0', {
      fontFamily: 'Special Elite',
      fontSize: '54px',
      color: '#39ff14',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: {
        left: 8,
        right: 8,
        top: 8,
        bottom: 8
      }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.officeArrow = this.add.text(width / 2, height - 42, '\u2191', {
      fontFamily: 'Special Elite',
      fontSize: '42px',
      color: '#7df9ff',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: {
        left: 10,
        right: 10,
        top: 8,
        bottom: 8
      }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add.text(width - 46, height / 2, '\u25B6', {
      fontFamily: 'Special Elite',
      fontSize: '54px',
      color: '#39ff14',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: {
        left: 8,
        right: 8,
        top: 8,
        bottom: 8
      }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.navHint = this.add.text(width / 2, 84, '', {
      fontFamily: 'Special Elite',
      fontSize: '20px',
      color: '#39ff14',
      backgroundColor: '#000000',
      padding: {
        left: 10,
        right: 10,
        top: 8,
        bottom: 8
      }
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false);

    this.introHint = this.add.text(
      width / 2,
      40,
      'Welcome to the Crime Lab — move left or right',
      {
        fontFamily: 'Special Elite',
        fontSize: '18px',
        color: '#fff4c7',
        backgroundColor: '#000000',
        padding: {
          left: 12,
          right: 12,
          top: 8,
          bottom: 8
        }
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setAlpha(0);

    this.leftArrow
      .on('pointerdown', () => this.moveLeft())
      .on('pointerover', () => {
        if (this.uiLocked) return;

        this.leftArrow.setScale(1.08);
        this.leftArrow.setAlpha(1);
        this.showNavHint(this.getLeftRoomLabel());
      })
      .on('pointerout', () => {
        this.leftArrow.setScale(1);

        if (!this.uiLocked) {
          this.leftArrow.setAlpha(0.75);
        }

        this.hideNavHint();
      });

    this.rightArrow
      .on('pointerdown', () => this.moveRight())
      .on('pointerover', () => {
        if (this.uiLocked) return;

        this.rightArrow.setScale(1.08);
        this.rightArrow.setAlpha(1);
        this.showNavHint(this.getRightRoomLabel());
      })
      .on('pointerout', () => {
        this.rightArrow.setScale(1);

        if (!this.uiLocked) {
          this.rightArrow.setAlpha(0.75);
        }

        this.hideNavHint();
      });

    this.officeArrow
      .on('pointerdown', () => this.goToOfficeScene())
      .on('pointerover', () => {
        if (this.uiLocked) return;

        this.officeArrow.setScale(1.08);
        this.officeArrow.setAlpha(1);
        this.showNavHint('Office Scene');
      })
      .on('pointerout', () => {
        this.officeArrow.setScale(1);

        if (!this.uiLocked) {
          this.officeArrow.setAlpha(0.75);
        }

        this.hideNavHint();
      });

    this.tweens.add({
      targets: [
        this.leftArrow,
        this.rightArrow,
        this.officeArrow
      ],
      alpha: {
        from: 0.55,
        to: 0.9
      },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.updateNavVisibility();
  }

  moveLeft() {
    if (this.uiLocked) return;

    if (this.currentView === 'lab_b') {
      this.goToView('lab_a');
    } else if (this.currentView === 'lab_c') {
      this.goToView('lab_b');
    }
  }

  moveRight() {
    if (this.uiLocked) return;

    if (this.currentView === 'lab_a') {
      this.goToView('lab_b');
    } else if (this.currentView === 'lab_b') {
      this.goToView('lab_c');
    }
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
    if (this.leftArrow) {
      this.leftArrow.setVisible(this.currentView !== 'lab_a');
    }

    if (this.rightArrow) {
      this.rightArrow.setVisible(this.currentView !== 'lab_c');
    }

    if (this.officeArrow) {
      this.officeArrow.setVisible(true);
    }
  }

  getLeftRoomLabel() {
    if (this.currentView === 'lab_b') {
      return 'Identity Lab';
    }

    if (this.currentView === 'lab_c') {
      return 'Toolmark Analysis';
    }

    return '';
  }

  getRightRoomLabel() {
    if (this.currentView === 'lab_a') {
      return 'Toolmark Analysis';
    }

    if (this.currentView === 'lab_b') {
      return 'CCTV Reconstruction';
    }

    return '';
  }

  getHudScene() {
    if (this.scene.isActive('PlayerHudScene')) {
      return this.scene.get('PlayerHudScene');
    }

    if (this.scene.isActive('UIScene')) {
      return this.scene.get('UIScene');
    }

    return null;
  }

  showNavHint(text) {
    if (!text || !this.navHint) return;

    this.navHint.setText(text);
    this.navHint.setVisible(true);
  }

  hideNavHint() {
    if (!this.navHint) return;

    this.navHint.setVisible(false);
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

  // ----------------------------------------------------------
  // Audio
  // ----------------------------------------------------------

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

    this.labAmbient = audioManager.playSfx(
      'crimelab_ambient',
      { loop: true }
    );
  }

  stopLabAmbient() {
    if (!this.labAmbient) return;

    this.labAmbient.stop();
    this.labAmbient.destroy();
    this.labAmbient = null;
  }

  // ----------------------------------------------------------
  // UI lock
  // ----------------------------------------------------------

  update() {
    const hud = this.getHudScene();

    const panelOpen = !!(
      hud
      && hud.isAnyPanelOpen
      && hud.isAnyPanelOpen()
    );

    if (panelOpen && !this.uiLocked) {
      this.applyLock(true);
    } else if (!panelOpen && this.uiLocked && !this.scene.isPaused()) {
      this.applyLock(false);
    }
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots.forEach((zone) => {
      if (locked) {
        zone.disableInteractive();

        if (zone.exitBtn) {
          zone.exitBtn.disableInteractive();
        }

        return;
      }

      zone.setInteractive({ useHandCursor: true });

      if (zone.exitBtn) {
        zone.exitBtn.setInteractive({ useHandCursor: true });
      }
    });

    if (this.proceedHotspot) {
      if (locked) {
        this.proceedHotspot.disableInteractive();
      } else {
        this.proceedHotspot.setInteractive({
          useHandCursor: true
        });
      }
    }

    if (this.leftArrow) {
      if (locked) {
        this.leftArrow.disableInteractive();
        this.leftArrow.setAlpha(0.35);
      } else {
        this.leftArrow.setInteractive({
          useHandCursor: true
        });
        this.leftArrow.setAlpha(0.75);
      }
    }

    if (this.rightArrow) {
      if (locked) {
        this.rightArrow.disableInteractive();
        this.rightArrow.setAlpha(0.35);
      } else {
        this.rightArrow.setInteractive({
          useHandCursor: true
        });
        this.rightArrow.setAlpha(0.75);
      }
    }

    if (this.officeArrow) {
      if (locked) {
        this.officeArrow.disableInteractive();
        this.officeArrow.setAlpha(0.35);
      } else {
        this.officeArrow.setInteractive({
          useHandCursor: true
        });
        this.officeArrow.setAlpha(0.75);
      }
    }

    if (locked) {
      this.hideNavHint();
    } else {
      this.updateNavVisibility();
    }
  }

  forceUnlock() {
    this.applyLock(false);
  }

  // ----------------------------------------------------------
  // Leaving the laboratory
  // ----------------------------------------------------------

  exitLab() {
    if (this.uiLocked) return;

    this.stopLabAmbient();

    this.scene.start('CityScene', {
      gameState: this.gameState
    });
  }

  goToSuspectBoard() {
    if (this.uiLocked) return;
    if (this.completedCount < this.totalStations) return;

    this.uiLocked = true;
    this.gameState.csiLabCompleted = true;

    saveGameState();
    this.stopLabAmbient();

    this.scene.start('SuspectBoardScene', {
      caseSuspects: this.gameState.caseSuspects,
      identityEvidence: this.gameState.identityEvidence,
      identityEvidenceResult: this.gameState.identityEvidenceResult,
      traceEvidenceResults: this.gameState.traceEvidenceResults,
      forensicResults: this.gameState.forensicResults,
      gameState: this.gameState
    });
  }

  goToOfficeScene() {
    if (this.uiLocked) return;

    this.uiLocked = true;
    this.stopLabAmbient();

    this.time.delayedCall(10, () => {
      this.scene.start('OfficeScene', {
        gameState: this.gameState
      });
    });
  }

  // ----------------------------------------------------------
  // Debug
  // ----------------------------------------------------------

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) return;

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
      const data = zone.hotspotData;

      this.debugGraphics.strokeRect(
        data.x,
        data.y,
        data.width,
        data.height
      );

      const label = this.add.text(
        data.x + 8,
        data.y + 8,
        data.id,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: {
            left: 4,
            right: 4,
            top: 2,
            bottom: 2
          }
        }
      ).setDepth(999);

      this.debugTexts.push(label);
    });
  }

  // ----------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------

  cleanupScene() {
    this.input.keyboard.off('keydown-LEFT', this.boundMoveLeft);
    this.input.keyboard.off('keydown-RIGHT', this.boundMoveRight);

    this.events.off(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
    this.events.off(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.off(Phaser.Scenes.Events.SLEEP, this.boundCleanupScene);
    this.events.off('resume', this.boundCheckMiniGameResults);

    this.hotspots.forEach((zone) => {
      zone.removeAllListeners();
      zone.disableInteractive();

      if (zone.statusLabel) {
        zone.statusLabel.destroy();
      }

      if (zone.exitBtn) {
        zone.exitBtn.removeAllListeners();
        zone.exitBtn.destroy();
      }

      zone.destroy();
    });

    this.hotspots = [];

    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }

    this.debugTexts.forEach((text) => {
      text.destroy();
    });

    this.debugTexts = [];

    if (this.leftArrow) {
      this.leftArrow.removeAllListeners();
      this.leftArrow.destroy();
      this.leftArrow = null;
    }

    if (this.rightArrow) {
      this.rightArrow.removeAllListeners();
      this.rightArrow.destroy();
      this.rightArrow = null;
    }

    if (this.officeArrow) {
      this.officeArrow.removeAllListeners();
      this.officeArrow.destroy();
      this.officeArrow = null;
    }

    if (this.navHint) {
      this.navHint.destroy();
      this.navHint = null;
    }

    if (this.introHint) {
      this.introHint.destroy();
      this.introHint = null;
    }

    if (this.proceedHotspot) {
      this.proceedHotspot.removeAllListeners();
      this.proceedHotspot.destroy();
      this.proceedHotspot = null;
    }

    this.stopLabAmbient();
  }
}