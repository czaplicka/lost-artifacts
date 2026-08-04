
import { audioManager } from '../../AudioManager.js';
// ============================================================
// CrimeLabScene.js
// CSI Forensics Laboratory — 3 rooms, panning camera like OfficeScene.
// Room 1: DNA & Identity Lab  -> UniversalForensicMinigame
// Room 2: Trace Evidence Lab A -> depends on gameState.traceEvidence[0]
// Room 3: Trace Evidence Lab B -> depends on gameState.traceEvidence[1]
// When all 3 analyses are complete, the [PROCEED] hotspot appears.
// ============================================================

import { gameState, saveGameState } from '../../GameData.js';

export class CrimeLabScene extends Phaser.Scene {
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
    this.navHint = null;
    this.introHint = null;

    this.uiLocked = false;
    this.completedCount = 0;
    this.totalStations = 3;
    this.proceedHotspot = null;
  }

  init(data) {
    this.gameState = data?.gameState || gameState;
  }

  create() {
    audioManager.init(this);
    const { width, height } = this.scale;

    this.createBackgrounds(width, height);
    this.createCameraSetup(height);
    this.createHotspots();
    this.createNavigationUI();
    this.setupAudioUnlock();
    this.createOptionalDebug();

    this.goToView('lab_b', false);
    this.showIntroHint();

    this.input.keyboard.on('keydown-LEFT', this.moveLeft, this);
    this.input.keyboard.on('keydown-RIGHT', this.moveRight, this);
    this.input.keyboard.on('keydown-A', this.moveLeft, this);
    this.input.keyboard.on('keydown-D', this.moveRight, this);

    this.events.on(Phaser.Scenes.Events.WAKE, this.forceUnlock, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.forceUnlock, this);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    // Listen for returning mini-game scenes
    this.events.on('resume', this.checkMiniGameResults, this);
  }

  // ----------------------------------------------------------
  // Backgrounds: 3 lab rooms side by side
  // ----------------------------------------------------------
  createBackgrounds(gameWidth, gameHeight) {
    const leftBg = this.add.image(0, 0, 'crimelab_left').setOrigin(0, 0);
    const centerBg = this.add.image(gameWidth, 0, 'crimelab_center').setOrigin(0, 0);
    const rightBg = this.add.image(gameWidth * 2, 0, 'crimelab_right').setOrigin(0, 0);

    [leftBg, centerBg, rightBg].forEach(bg => bg.setDisplaySize(gameWidth, gameHeight));

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

  // ----------------------------------------------------------
  // Hotspots: one per analysis station + exit + proceed
  // ----------------------------------------------------------
  createHotspots() {
    const W = this.scale.width;

    const traceEvidence = this.gameState.traceEvidence || [];
    const trace0 = traceEvidence[0] || { id: 'fingerprint_fragment', label: 'Trace Evidence A', minigame: 'FingerprintPuzzleScene' };
    const trace1 = traceEvidence[1] || { id: 'cctv_footage', label: 'Trace Evidence B', minigame: 'CCTVScrubberScene' };

    const identityAttr = this.gameState.identityEvidence?.attribute || 'hair_color';
    const identityValue = this.gameState.identityEvidence?.thief_value || 'unknown';

    const hotspotData = [
      {
        id: 'identity_station',
        room: 'lab_a',
        x: this.rooms.lab_a.x + 480,
        y: 420,
        width: 350,
        height: 300,
        label: 'Identity Analysis Station',
        completed: !!(this.gameState.identityEvidenceResult),
        action: () => this.enterMiniGame(
          'UniversalForensicMinigame',
          { evidenceType: identityAttr, correctValue: identityValue },
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
        label: trace0.label || 'Trace Evidence A',
        completed: !!(this.gameState.traceEvidenceResults?.[0]),
        action: () => this.enterMiniGame(
          trace0.minigame || 'FingerprintPuzzleScene',
          { evidenceConfig: trace0, evidenceIndex: 0 },
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
        label: trace1.label || 'Trace Evidence B',
        completed: !!(this.gameState.traceEvidenceResults?.[1]),
        action: () => this.enterMiniGame(
          trace1.minigame || 'CCTVScrubberScene',
          { evidenceConfig: trace1, evidenceIndex: 1 },
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

    // Count already completed
    this.completedCount = hotspotData.filter(h => h.completed).length;

    hotspotData.forEach((data) => {
      const zone = this.add.zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });

      zone.hotspotData = data;

      zone.on('pointerover', () => this.onHotspotOver(data));
      zone.on('pointerout', () => this.onHotspotOut());
      zone.on('pointerdown', () => {
        if (this.uiLocked) return;
        if (data.completed && !data.alwaysVisible) return;

        audioManager.playSfx('click_sound');

        data.action();
      });

      this.hotspots.push(zone);

      // Status label on the station
      if (!data.alwaysVisible) {
        const statusText = data.completed ? '[ COMPLETE ]' : '[ ANALYZE ]';
        const statusColor = data.completed ? '#00ff00' : '#ffcc00';
        const label = this.add.text(data.x + data.width / 2, data.y + data.height + 10, statusText, {
          fontFamily: 'PressStart2P', fontSize: '8px', color: statusColor
        }).setOrigin(0.5).setDepth(60);
        zone.statusLabel = label;
      }
    });

    // Hidden "Proceed" hotspot — only visible when all 3 done
    this.proceedHotspot = this.add.text(this.rooms.lab_b.x + W / 2, 50, '', {
      fontFamily: 'PressStart2P', fontSize: '12px', color: '#39ff14',
      backgroundColor: '#000000',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5).setDepth(80).setInteractive({ useHandCursor: true });

    this.proceedHotspot.on('pointerdown', () => this.goToSuspectBoard());

    this.updateProceedVisibility();
  }

  // ----------------------------------------------------------
  // Mini-game launch + return handling
  // ----------------------------------------------------------
  enterMiniGame(sceneKey, sceneData, stationId) {
    this.uiLocked = true;

    const fullData = {
      ...sceneData,
      gameState: this.gameState,
      stationId,
    };

    this.scene.pause();
    this.scene.launch(sceneKey, fullData);
    this.scene.bringToTop(sceneKey);

    const targetScene = this.scene.get(sceneKey);
    targetScene.events.once('minigame-complete', (data) => {
      this.onMiniGameComplete(stationId, data.score || 0, data.value || null);
    });

    targetScene.events.once('minigame-closed', () => {
      this.scene.resume();
      this.scene.bringToTop('CrimeLabScene');
      this.forceUnlock();
    });
  }

  onMiniGameComplete(stationId, score, value) {
    if (stationId === 'identity') {
      this.gameState.identityEvidenceResult = { score, value };
    } else {
      const traceIndex = stationId === 'trace_0' ? 0 : 1;
      if (!this.gameState.traceEvidenceResults) {
        this.gameState.traceEvidenceResults = [];
      }
      // Only count if not already completed
      if (!this.gameState.traceEvidenceResults[traceIndex]) {
        this.completedCount++;
      }
      this.gameState.traceEvidenceResults[traceIndex] = { score, value };
    }

    if (!this.hotspots.find(h => h.hotspotData.id === 'identity_station').hotspotData.completed) {
      if (stationId === 'identity') this.completedCount++;
    }

    // Update hotspot visuals
    const hotspotIdMap = { 'identity': 'identity_station', 'trace_0': 'trace_a_station', 'trace_1': 'trace_b_station' };
    const hotspot = this.hotspots.find(h => h.hotspotData.id === hotspotIdMap[stationId]);
    if (hotspot) {
      hotspot.hotspotData.completed = true;
      if (hotspot.statusLabel) {
        hotspot.statusLabel.setText('[ COMPLETE ]');
        hotspot.statusLabel.setColor('#00ff00');
      }
    }

    saveGameState();
    this.updateProceedVisibility();
  }

  checkMiniGameResults() {
    // Recalculate completed count from gameState in case scene was restored
    let count = 0;
    if (this.gameState.identityEvidenceResult) count++;
    if (this.gameState.traceEvidenceResults?.[0]) count++;
    if (this.gameState.traceEvidenceResults?.[1]) count++;
    this.completedCount = count;
    this.updateProceedVisibility();
  }

  updateProceedVisibility() {
    if (this.completedCount >= this.totalStations) {
      this.proceedHotspot.setText('[ PROCEED TO SUSPECT BOARD ]');
      this.proceedHotspot.setVisible(true);
    } else {
      this.proceedHotspot.setText('');
      this.proceedHotspot.setVisible(false);
    }
  }

  // ----------------------------------------------------------
  // Navigation (same as OfficeScene)
  // ----------------------------------------------------------
  createNavigationUI() {
    const { width, height } = this.scale;

    this.leftArrow = this.add.text(46, height / 2, '\u25C0', {
      fontFamily: 'Special Elite', fontSize: '54px', color: '#39ff14',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: { left: 8, right: 8, top: 8, bottom: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0.75).setInteractive({ useHandCursor: true });

    this.rightArrow = this.add.text(width - 46, height / 2, '\u25B6', {
      fontFamily: 'Special Elite', fontSize: '54px', color: '#39ff14',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: { left: 8, right: 8, top: 8, bottom: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0.75).setInteractive({ useHandCursor: true });

    this.navHint = this.add.text(width / 2, 84, '', {
      fontFamily: 'Special Elite', fontSize: '20px', color: '#39ff14',
      backgroundColor: '#000000',
      padding: { left: 10, right: 10, top: 8, bottom: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220).setVisible(false);

    this.introHint = this.add.text(width / 2, 40, 'Welcome to the Crime Lab — move left or right', {
      fontFamily: 'Special Elite', fontSize: '18px', color: '#fff4c7',
      backgroundColor: '#000000',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220).setAlpha(0);

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
        if (!this.uiLocked) this.leftArrow.setAlpha(0.75);
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

    this.tweens.add({ targets: this.cameras.main, scrollX: targetX, duration: 550, ease: 'Sine.easeInOut' });
  }

  updateNavVisibility() {
    if (this.leftArrow) this.leftArrow.setVisible(this.currentView !== 'lab_a');
    if (this.rightArrow) this.rightArrow.setVisible(this.currentView !== 'lab_c');
  }

  getLeftRoomLabel() {
    if (this.currentView === 'lab_b') return 'Identity Lab';
    if (this.currentView === 'lab_c') return 'Trace Evidence A';
    return '';
  }

  getRightRoomLabel() {
    if (this.currentView === 'lab_a') return 'Trace Evidence A';
    if (this.currentView === 'lab_b') return 'Trace Evidence B';
    return '';
  }

  // ----------------------------------------------------------
  // HUD / audio / hints (mirrors OfficeScene)
  // ----------------------------------------------------------
  getHudScene() {
    if (this.scene.isActive('PlayerHudScene')) return this.scene.get('PlayerHudScene');
    if (this.scene.isActive('UIScene')) return this.scene.get('UIScene');
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
    this.tweens.add({ targets: this.introHint, alpha: 1, duration: 350, ease: 'Power2' });
    this.time.delayedCall(2800, () => {
      if (!this.introHint) return;
      this.tweens.add({ targets: this.introHint, alpha: 0, duration: 500, ease: 'Power2' });
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
    this.labAmbient = audioManager.playSfx('crimelab_ambient', { loop: true });
  }

  // ----------------------------------------------------------
  // Lock / unlock (mirrors OfficeScene)
  // ----------------------------------------------------------
  update() {
    const hud = this.getHudScene();
    const panelOpen = !!(hud && hud.isAnyPanelOpen && hud.isAnyPanelOpen());

    if (panelOpen && !this.uiLocked) {
      this.applyLock(true);
    } else if (!panelOpen && this.uiLocked) {
      this.applyLock(false);
    }
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots.forEach(zone => {
      if (locked) {
        zone.disableInteractive();
      } else {
        zone.setInteractive({ useHandCursor: true });
      }
    });

    if (this.leftArrow) {
      if (locked) { this.leftArrow.disableInteractive(); this.leftArrow.setAlpha(0.35); }
      else { this.leftArrow.setInteractive({ useHandCursor: true }); this.leftArrow.setAlpha(0.75); }
    }

    if (this.rightArrow) {
      if (locked) { this.rightArrow.disableInteractive(); this.rightArrow.setAlpha(0.35); }
      else { this.rightArrow.setInteractive({ useHandCursor: true }); this.rightArrow.setAlpha(0.75); }
    }

    if (locked) this.hideNavHint();
    else this.updateNavVisibility();
  }

  forceUnlock() {
    this.applyLock(false);
  }

  // ----------------------------------------------------------
  // Exit / proceed
  // ----------------------------------------------------------
  exitLab() {
    if (this.labAmbient) { this.labAmbient.stop(); this.labAmbient.destroy(); this.labAmbient = null; }
    this.scene.start('CityScene', { gameState: this.gameState });
  }

  goToSuspectBoard() {
    this.gameState.csiLabCompleted = true;
    saveGameState();
    if (this.labAmbient) { this.labAmbient.stop(); this.labAmbient.destroy(); this.labAmbient = null; }
    this.scene.start('SuspectBoardScene', {
      caseSuspects: this.gameState.caseSuspects,
      identityEvidence: this.gameState.identityEvidence
    });
  }

  // ----------------------------------------------------------
  // Debug overlays (mirrors OfficeScene)
  // ----------------------------------------------------------
  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) return;

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
      const d = zone.hotspotData;
      this.debugGraphics.strokeRect(d.x, d.y, d.width, d.height);

      const label = this.add.text(d.x + 8, d.y + 8, d.id, {
        fontFamily: 'Arial', fontSize: '16px', color: '#00ffcc',
        backgroundColor: '#000000',
        padding: { left: 4, right: 4, top: 2, bottom: 2 }
      }).setDepth(999);

      this.debugTexts.push(label);
    });
  }

  // ----------------------------------------------------------
  // Cleanup (mirrors OfficeScene)
  // ----------------------------------------------------------
  cleanupScene() {
    this.input.keyboard.off('keydown-LEFT', this.moveLeft, this);
    this.input.keyboard.off('keydown-RIGHT', this.moveRight, this);
    this.input.keyboard.off('keydown-A', this.moveLeft, this);
    this.input.keyboard.off('keydown-D', this.moveRight, this);

    this.events.off(Phaser.Scenes.Events.WAKE, this.forceUnlock, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.forceUnlock, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.events.off(Phaser.Scenes.Events.SLEEP, this.cleanupScene, this);
    this.events.off('resume', this.checkMiniGameResults, this);

this.input.keyboard.on('keydown-L', () => {
  this.scene.start('CrimeLabScene', { gameState: this.gameState });
});

    this.hotspots.forEach(zone => {
      zone.removeAllListeners();
      zone.disableInteractive();
      if (zone.statusLabel) zone.statusLabel.destroy();
      zone.destroy();
    });
    this.hotspots = [];

    if (this.debugGraphics) { this.debugGraphics.destroy(); this.debugGraphics = null; }
    this.debugTexts.forEach(text => text.destroy());
    this.debugTexts = [];

    if (this.leftArrow) { this.leftArrow.removeAllListeners(); this.leftArrow.destroy(); this.leftArrow = null; }
    if (this.rightArrow) { this.rightArrow.removeAllListeners(); this.rightArrow.destroy(); this.rightArrow = null; }
    if (this.navHint) { this.navHint.destroy(); this.navHint = null; }
    if (this.introHint) { this.introHint.destroy(); this.introHint = null; }
    if (this.proceedHotspot) { this.proceedHotspot.removeAllListeners(); this.proceedHotspot.destroy(); this.proceedHotspot = null; }

    if (this.labAmbient) {
      this.labAmbient.stop();
      this.labAmbient.destroy();
      this.labAmbient = null;
    }
  }
}
