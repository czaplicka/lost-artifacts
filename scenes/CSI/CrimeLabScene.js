import { BaseScene } from '../BaseScene.js';
import { gameState } from '../../GameData.js';
import { saveGameState } from '../../GameStatePersistence.js';
import { CrimeLabManager } from './CrimeLabManager.js';
import { CrimeLabHUD } from './CrimeLabHUD.js';
import { CrimeLabView } from './CrimeLabView.js';
import { EventBus } from '../../EventBus.js';
import { getLabOnboardingConfig } from './labOnboardingConfig.js';

const STATION_TIME_COST_HOURS = {
  identity: 2,
  trace_0: 1,
  trace_1: 1
};

const LAB_TIME_FLAVOR_LINES = [
  'The centrifuge hummed for hours. You are now an expert in staring at spinning tubes.',
  'Somewhere, a lab tech is annoyed you touched their equipment. Time well spent.',
  'You filled out three forms in triplicate just to look at a hair under glass.',
  'The coffee in the break room went cold twice while you waited for results.',
  'Science is slow. Also, it is later than when you started.'
];

const IDENTITY_EVIDENCE_TYPES = [
  'hair_color',
  'blood_type',
  'dna_gender',
  'fingerprint_pattern'
];

export class CrimeLabScene extends BaseScene {
  constructor() {
    super({ key: 'CrimeLabScene' });

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.currentView = 'lab_intro';
    this.viewPositions = {};
    this.rooms = {};
    this.totalWidth = 0;

    this.labOnboarding = null;
    this.assistantHotspot = null;
    this.labView = null;

    this.hotspots = [];
    this.debugTexts = [];
    this.DEBUG_HOTSPOTS = false;
    this.debugGraphics = null;

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

    this.labOnboarding = this.getLabOnboarding();

    this.currentView = 'lab_intro';
    this.hotspots = [];
    this.debugTexts = [];
    this.uiLocked = false;
    this.completedCount = 0;
  }

  create() {
    super.create();

    this.game.events.emit('setHudVisible', false);
    EventBus.emit('hideHUD');

    const { width, height } = this.scale;

this.labView = new CrimeLabView(this, {
  initialView: 'lab_intro',
  introBackgroundKey: this.getIntroBackgroundKey(),
  onViewChanged: (viewKey) => {
    this.currentView = viewKey;
    this.updateNavVisibility();
    this.hideNavHint();
  }
});

this.labView.create(width, height);
    this.createHotspots();
    this.createAssistantHotspot();
    this.createNavigationUI();

    this.hud = new CrimeLabHUD(this);
    this.hud.create();

    this.createOptionalDebug();

    this.goToView('lab_intro', false);
    this.showIntroHint();
    this.hud?.refreshFromScene();

    this.input.keyboard.on('keydown-LEFT', this.boundMoveLeft);
    this.input.keyboard.on('keydown-RIGHT', this.boundMoveRight);

    this.events.on(Phaser.Scenes.Events.WAKE, this.boundForceUnlock);
    this.events.on(Phaser.Scenes.Events.RESUME, this.boundForceUnlock);
    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundCheckMiniGameResults
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );
  }

  getLabOnboarding() {
    const mission = this.gameState.currentMission || {};

    const caseIndex = String(
      mission.caseIndex ??
      mission.index ??
      this.gameState.currentCaseIndex ??
      this.gameState.caseIndex ??
      0
    );

    const schedule =
      mission.onboarding ||
      this.gameState.currentOnboarding ||
      this.gameState.onboardingSchedule?.[caseIndex] ||
      { lab: 'three_games' };

    const labMode = schedule.lab || 'three_games';

    return getLabOnboardingConfig(labMode);
  }

getIntroBackgroundKey() {
  return this.labOnboarding?.backgroundKey || 'crimelab_point';
}

  getPlayerGameCount() {
    const rawValue = Number(this.labOnboarding?.playerGameCount);

    if (!Number.isFinite(rawValue)) {
      return 3;
    }

    return Phaser.Math.Clamp(rawValue, 0, this.totalStations);
  }

  getAssistantResultCount() {
    return this.totalStations - this.getPlayerGameCount();
  }

  getAssistantLine() {
    if (this.labOnboarding?.assistantLine) {
      return this.labOnboarding.assistantLine;
    }

    const playerGameCount = this.getPlayerGameCount();

    if (playerGameCount === 0) {
      return 'I completed the analyses. Review the evidence terminal and narrow the suspect list.';
    }

    if (playerGameCount === 1) {
      return 'I finished two samples. One remains at an active workstation.';
    }

    if (playerGameCount === 2) {
      return 'One result is ready. Two samples are waiting at the active workstations.';
    }

    return 'Lab assistant unavailable. Complete all remaining analyses yourself.';
  }

  getRemainingAnalysisCount() {
    const caseForensics = this.labManager.ensureCaseForensics();

    const completedStations = [
      Boolean(caseForensics.identityEvidenceResult),
      Boolean(caseForensics.traceEvidenceResults?.[0]),
      Boolean(caseForensics.traceEvidenceResults?.[1])
    ].filter(Boolean).length;

    return Math.max(0, this.totalStations - completedStations);
  }

  createBackgrounds(gameWidth, gameHeight) {
    const introBackgroundKey = this.getIntroBackgroundKey();

    const introBg = this.add
      .image(0, 0, introBackgroundKey)
      .setOrigin(0, 0);

    const leftBg = this.add
      .image(gameWidth, 0, 'crimelab_left')
      .setOrigin(0, 0);

    const centerBg = this.add
      .image(gameWidth * 2, 0, 'crimelab_center')
      .setOrigin(0, 0);

    const rightBg = this.add
      .image(gameWidth * 3, 0, 'crimelab_right')
      .setOrigin(0, 0);

    [introBg, leftBg, centerBg, rightBg].forEach((background) => {
      background.setDisplaySize(gameWidth, gameHeight);
      background.setDepth(-100);
    });

    this.rooms = {
      lab_intro: {
        key: 'lab_intro',
        bg: introBg,
        x: 0,
        width: gameWidth
      },
      lab_a: {
        key: 'lab_a',
        bg: leftBg,
        x: gameWidth,
        width: gameWidth
      },
      lab_b: {
        key: 'lab_b',
        bg: centerBg,
        x: gameWidth * 2,
        width: gameWidth
      },
      lab_c: {
        key: 'lab_c',
        bg: rightBg,
        x: gameWidth * 3,
        width: gameWidth
      }
    };

    this.totalWidth = gameWidth * 4;

    this.viewPositions = {
      lab_intro: this.rooms.lab_intro.x,
      lab_a: this.rooms.lab_a.x,
      lab_b: this.rooms.lab_b.x,
      lab_c: this.rooms.lab_c.x
    };
  }

  createCameraSetup(height) {
    this.cameras.main.setBounds(0, 0, this.totalWidth, height);
  }

  createAssistantHotspot() {
    if (!this.labOnboarding?.assistantPresent) {
      return;
    }

    /*
     * Zmień te cztery wartości po pierwszym teście w grze.
     * Prostokąt ma obejmować TYLKO postać asystenta na grafice
     * crimelab_point_assistant, nie cały pierwszy ekran.
     */
    const assistantX = 220;
    const assistantY = 340;
    const assistantWidth = 230;
    const assistantHeight = 410;

    this.assistantHotspot = this.add
      .zone(
        assistantX,
        assistantY,
        assistantWidth,
        assistantHeight
      )
      .setOrigin(0, 0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true });

    this.assistantHotspot.on('pointerover', () => {
      if (this.uiLocked) {
        return;
      }

      this.showNavHint('Talk to Lab Assistant');
    });

    this.assistantHotspot.on('pointerout', () => {
      this.hideNavHint();
    });

    this.assistantHotspot.on('pointerdown', () => {
      if (this.uiLocked) {
        return;
      }

      this.showAssistantHint();
    });
  }

  showAssistantHint() {
  const remaining = this.getRemainingAnalysisCount();
  const hintTitle =
    this.labOnboarding?.hintTitle ||
    'FORENSIC STATUS';

  const hintText =
    this.labOnboarding?.hintText ||
    'Review the available evidence and complete the remaining analyses.';

  const assistantLine = this.getAssistantLine();

  const progressLine =
    remaining <= 0
      ? 'ALL FORENSIC RESULTS ARE READY.'
      : remaining === 1
        ? 'ONE ANALYSIS REMAINS.'
        : `${remaining} ANALYSES REMAIN.`;

  this.showNavHint(
    `${hintTitle}\n\n${hintText}\n\n` +
    `ASSISTANT: ${assistantLine}\n\n` +
    progressLine
  );

  this.time.delayedCall(6200, () => {
    if (!this.uiLocked) {
      this.hideNavHint();
    }
  });
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
        room: 'lab_intro',
        x: this.rooms.lab_intro.x + 40,
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
          .image(
            data.x + data.width / 2,
            data.y + data.height / 2,
            'btnExit'
          )
          .setScale(0.5)
          .setOrigin(0.5)
          .setDepth(55)
          .setInteractive({ useHandCursor: true });

        exitBtn.on('pointerover', () => {
          if (this.uiLocked) {
            return;
          }

          exitBtn.setScale(0.6);
          this.showNavHint(data.label);
        });

        exitBtn.on('pointerout', () => {
          exitBtn.setScale(0.5);
          this.hideNavHint();
        });

        exitBtn.on('pointerdown', () => {
          if (this.uiLocked) {
            return;
          }

          data.action();
        });

        zone.exitBtn = exitBtn;
      }

      zone.on('pointerover', () => this.onHotspotOver(data));

      zone.on('pointerout', () => this.onHotspotOut());

      zone.on('pointerdown', () => {
        if (this.uiLocked) {
          return;
        }

        if (data.completed && !data.alwaysVisible) {
          return;
        }

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

    this.proceedHotspot.on('pointerdown', () => {
      this.goToCrimeCity();
    });

    this.updateProceedVisibility();
  }

updateRoomHotspots() {
  this.hotspots.forEach((zone) => {
    const room = zone.hotspotData?.room;
    const isVisible = room === this.currentView;

    zone.setVisible(isVisible);

    if (zone.statusLabel) {
      zone.statusLabel.setVisible(isVisible);
    }

    if (zone.exitBtn) {
      zone.exitBtn.setVisible(isVisible);
    }

    if (!isVisible || this.uiLocked) {
      zone.disableInteractive();
      zone.exitBtn?.disableInteractive();
      return;
    }

    const isCompleted =
      zone.hotspotData?.completed === true;

    if (isCompleted && !zone.hotspotData?.alwaysVisible) {
      zone.disableInteractive();
    } else {
      zone.setInteractive({ useHandCursor: true });

      if (zone.exitBtn) {
        zone.exitBtn.setInteractive({
          useHandCursor: true
        });
      }
    }
  });

  const showProceed =
    this.currentView === 'lab_b' &&
    this.completedCount >= this.totalStations;

  this.proceedHotspot?.setVisible(showProceed);

  if (showProceed && !this.uiLocked) {
    this.proceedHotspot?.setInteractive({
      useHandCursor: true
    });
  } else {
    this.proceedHotspot?.disableInteractive();
  }
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
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
        wordWrap: { width: width - 140, useAdvancedWrap: true },
        align: 'center'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setVisible(false);

    this.introHint = this.add
      .text(
        width / 2,
        110,
        'Crime Lab — move right to inspect the analysis stations',
        {
          fontFamily: 'Special Elite',
          fontSize: '18px',
          color: '#fff4c7',
          backgroundColor: '#000000',
          padding: { left: 12, right: 12, top: 8, bottom: 8 },
          wordWrap: { width: width - 120, useAdvancedWrap: true },
          align: 'center'
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(220)
      .setAlpha(0);

    this.leftArrow
      .on('pointerdown', () => this.moveLeft())
      .on('pointerover', () => {
        if (this.uiLocked) {
          return;
        }

        this.leftArrow.setScale(1.08).setAlpha(1);
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
        if (this.uiLocked) {
          return;
        }

        this.rightArrow.setScale(1.08).setAlpha(1);
        this.showNavHint(this.getRightRoomLabel());
      })
      .on('pointerout', () => {
        this.rightArrow.setScale(1);

        if (!this.uiLocked) {
          this.rightArrow.setAlpha(0.75);
        }

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
    if (this.uiLocked) {
      return;
    }

    if (this.currentView === 'lab_a') {
      this.goToView('lab_intro');
    } else if (this.currentView === 'lab_b') {
      this.goToView('lab_a');
    } else if (this.currentView === 'lab_c') {
      this.goToView('lab_b');
    }
  }

  moveRight() {
    if (this.uiLocked) {
      return;
    }

    if (this.currentView === 'lab_intro') {
      this.goToView('lab_a');
    } else if (this.currentView === 'lab_a') {
      this.goToView('lab_b');
    } else if (this.currentView === 'lab_b') {
      this.goToView('lab_c');
    }
  }

goToView(viewName) {
  if (!this.labView?.showView(viewName)) {
    return;
  }

  this.currentView = viewName;
  this.updateNavVisibility();
  this.hideNavHint();
}

  updateNavVisibility() {
    this.leftArrow?.setVisible(this.currentView !== 'lab_intro');
    this.rightArrow?.setVisible(this.currentView !== 'lab_c');
  }

  updateProceedVisibility() {
    if (!this.proceedHotspot) {
      return;
    }

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
    if (this.currentView === 'lab_a') {
      return 'Lab Entrance';
    }

    if (this.currentView === 'lab_b') {
      return 'Identity Lab';
    }

    if (this.currentView === 'lab_c') {
      return 'Trace Analysis';
    }

    return '';
  }

  getRightRoomLabel() {
    if (this.currentView === 'lab_intro') {
      return 'Identity Lab';
    }

    if (this.currentView === 'lab_a') {
      return 'Trace Analysis';
    }

    if (this.currentView === 'lab_b') {
      return 'Evidence Analysis';
    }

    return '';
  }

  showNavHint(text) {
    if (!text || !this.navHint) {
      return;
    }

    this.navHint.setText(text).setVisible(true);
  }

  hideNavHint() {
    this.navHint?.setVisible(false);
  }

  onHotspotOver(data) {
    if (!data?.label || this.uiLocked) {
      return;
    }

    this.showNavHint(data.label);
  }

  onHotspotOut() {
    this.hideNavHint();
  }

  showIntroHint() {
    if (!this.introHint) {
      return;
    }

    this.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2'
    });

    this.time.delayedCall(2800, () => {
      if (!this.introHint) {
        return;
      }

      this.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2'
      });
    });
  }

  async enterMiniGame(sceneKey, sceneData = {}, stationId = '') {
    if (this.uiLocked) {
      return;
    }

    if (!sceneKey) {
      console.error(
        '[CrimeLabScene] enterMiniGame called without a sceneKey.'
      );

      this.showNavHint('ANALYSIS STATION UNAVAILABLE');
      return;
    }

    this.uiLocked = true;
    this.applyLock(true);

    try {
      await this.game.sceneLoader.ensure(sceneKey);
    } catch (err) {
      console.error(
        `[CrimeLabScene] Minigame scene "${sceneKey}" failed to load.`,
        err
      );

      this.showNavHint('ANALYSIS STATION UNAVAILABLE');
      this.uiLocked = false;
      this.applyLock(false);
      return;
    }

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

  getCrimeBoardCase() {
    const caseKey =
      this.labManager?.getCaseKey?.() ||
      'default_case';

    this.gameState.crimeBoards ??= {};

    this.gameState.crimeBoards[caseKey] ??= {
      caseKey,
      cityId: this.cityId,
      forensicEvidence: [],
      clues: [],
      updatedAt: null
    };

    this.gameState.crimeBoards[caseKey].forensicEvidence ??= [];
    this.gameState.crimeBoards[caseKey].clues ??= [];

    return this.gameState.crimeBoards[caseKey];
  }

  addForensicResultToCrimeBoard(payload = {}, forensicResult = {}) {
    const evidenceConfig = payload.evidenceConfig || {};
    const board = this.getCrimeBoardCase();

    const stationId =
      payload.stationId ||
      forensicResult.stationId;

    if (!stationId) {
      return;
    }

    const clue = {
      id: `forensic_${stationId}`,
      source: 'crime_lab',
      stationId,
      cityId: this.cityId,

      evidenceType:
        payload.evidenceType ||
        evidenceConfig.evidenceType ||
        'unknown_evidence',

      clueType:
        payload.clueType ||
        evidenceConfig.clueType ||
        'forensic',

      title:
        evidenceConfig.label ||
        payload.label ||
        'Crime Lab Result',

      text:
        payload.clueText ||
        evidenceConfig.clueText ||
        forensicResult.clueText ||
        'The laboratory produced an inconclusive but suspicious result.',

      correctValue:
        payload.correctValue ??
        evidenceConfig.correctValue ??
        forensicResult.correctValue ??
        null,

      result:
        payload.result ??
        payload.selectedValue ??
        payload.answer ??
        forensicResult.result ??
        null,

      isValuable:
        Boolean(
          payload.isValuable ??
          evidenceConfig.isValuable ??
          evidenceConfig.clueType === 'identity' ??
          false
        ),

      completedAt: forensicResult.completedAt || Date.now(),
      discovered: true,
      read: false
    };

    const existingIndex = board.forensicEvidence.findIndex(
      (item) => item.id === clue.id
    );

    if (existingIndex >= 0) {
      board.forensicEvidence[existingIndex] = {
        ...board.forensicEvidence[existingIndex],
        ...clue
      };
    } else {
      board.forensicEvidence.push(clue);
    }

    const clueIndex = board.clues.findIndex(
      (item) => item.id === clue.id
    );

    if (clueIndex >= 0) {
      board.clues[clueIndex] = {
        ...board.clues[clueIndex],
        ...clue
      };
    } else {
      board.clues.push(clue);
    }

    board.updatedAt = Date.now();

    EventBus.emit('crimeBoardClueAdded', {
      caseKey: board.caseKey,
      clue
    });
  }

  isStationAlreadyCompleted(stationId, caseForensics) {
    if (stationId === 'identity') {
      return Boolean(caseForensics.identityEvidenceResult);
    }

    if (
      typeof stationId === 'string' &&
      stationId.startsWith('trace_')
    ) {
      const evidenceIndex = Number(
        stationId.replace('trace_', '')
      );

      if (
        Number.isInteger(evidenceIndex) &&
        evidenceIndex >= 0
      ) {
        return Boolean(
          caseForensics.traceEvidenceResults[evidenceIndex]
        );
      }
    }

    return false;
  }

  advanceGameTimeForStation(stationId) {
    const hours = STATION_TIME_COST_HOURS[stationId];

    if (!Number.isFinite(hours) || hours <= 0) {
      return;
    }

    EventBus.emit('advanceTime', hours, 0);

    console.log(
      '[CrimeLabScene] Game time advanced for station.',
      {
        caseKey: this.labManager?.getCaseKey?.(),
        stationId,
        hours
      }
    );

    this.showLabTimeToast(hours);
  }

  showLabTimeToast(hours) {
    if (!this.navHint) {
      return;
    }

    const flavor = LAB_TIME_FLAVOR_LINES[
      Math.floor(Math.random() * LAB_TIME_FLAVOR_LINES.length)
    ];

    this.navHint
      .setText(`+${hours}h — ${flavor}`)
      .setVisible(true);

    this.time.delayedCall(3200, () => {
      if (!this.navHint) {
        return;
      }

      this.navHint.setVisible(false);
    });
  }

  saveMiniGameResult(payload = {}) {
    const caseForensics = this.labManager.ensureCaseForensics();

    if (!payload.completed || payload.aborted) {
      return;
    }

    const stationId = payload.stationId;

    const wasAlreadyCompleted =
      this.isStationAlreadyCompleted(
        stationId,
        caseForensics
      );

    const forensicResult = {
      ...payload,
      completedAt: Date.now()
    };

    if (stationId === 'identity') {
      caseForensics.identityEvidenceResult = forensicResult;
    }

    if (
      typeof stationId === 'string' &&
      stationId.startsWith('trace_')
    ) {
      const evidenceIndex = Number(
        stationId.replace('trace_', '')
      );

      if (
        Number.isInteger(evidenceIndex) &&
        evidenceIndex >= 0
      ) {
        caseForensics.traceEvidenceResults[evidenceIndex] =
          forensicResult;
      }
    }

    const existingResultIndex =
      caseForensics.forensicResults.findIndex(
        (result) => result.stationId === stationId
      );

    if (existingResultIndex >= 0) {
      caseForensics.forensicResults[existingResultIndex] =
        forensicResult;
    } else {
      caseForensics.forensicResults.push(forensicResult);
    }

    this.addCrimeLabClueToBoard(payload, forensicResult);
    this.unlockIdentityEvidenceForSuspects(payload);

    if (!wasAlreadyCompleted) {
      this.advanceGameTimeForStation(stationId);
    }

    saveGameState();
  }

  addCrimeLabClueToBoard(payload = {}, forensicResult = {}) {
    const caseKey =
      this.labManager?.getCaseKey?.() ||
      'default_case';

    const evidence = payload.evidenceConfig || {};

    const clue = {
      id: `crime_lab_${caseKey}_${payload.stationId}`,
      stationId: payload.stationId,
      source: 'crime_lab',
      cityId: this.cityId,

      title: evidence.label || 'Crime Lab Evidence',

      text:
        evidence.clueText ||
        payload.clueText ||
        'The lab result needs further interpretation.',

      clueText:
        evidence.clueText ||
        payload.clueText ||
        'The lab result needs further interpretation.',

      clueType:
        evidence.clueType ||
        payload.clueType ||
        'forensic',

      evidenceType:
        evidence.evidenceType ||
        payload.evidenceType ||
        'unknown',

      correctValue:
        evidence.correctValue ??
        payload.correctValue ??
        null,

      category: 'forensics',
      discovered: true,
      read: false,
      completedAt: forensicResult.completedAt || Date.now()
    };

    this.gameState.caseClues ??= {};
    this.gameState.caseClues[caseKey] ??= [];

    const caseClues = this.gameState.caseClues[caseKey];

    const existingIndex = caseClues.findIndex(
      (item) => item.id === clue.id
    );

    if (existingIndex >= 0) {
      caseClues[existingIndex] = {
        ...caseClues[existingIndex],
        ...clue
      };
    } else {
      caseClues.push(clue);
    }

    this.gameState.crimeLabClues ??= {};
    this.gameState.crimeLabClues[caseKey] ??= [];

    const labClues = this.gameState.crimeLabClues[caseKey];

    const labClueIndex = labClues.findIndex(
      (item) => item.id === clue.id
    );

    if (labClueIndex >= 0) {
      labClues[labClueIndex] = {
        ...labClues[labClueIndex],
        ...clue
      };
    } else {
      labClues.push(clue);
    }

    EventBus.emit('crimeBoardClueAdded', {
      caseKey,
      clue
    });

    console.log(
      '[CrimeLabScene] Crime Board clue added:',
      clue
    );
  }

  returnFromMiniGame() {
    if (!this.scene.isPaused(this.scene.key)) {
      return;
    }

    this.scene.resume(this.scene.key);

    this.uiLocked = false;
    this.applyLock(false);

    this.checkMiniGameResults();
    this.hud?.refreshFromScene();
  }

  checkMiniGameResults() {
    const caseForensics = this.labManager.ensureCaseForensics();

    const completedById = {
      identity_station: Boolean(
        caseForensics.identityEvidenceResult
      ),
      trace_a_station: Boolean(
        caseForensics.traceEvidenceResults[0]
      ),
      trace_b_station: Boolean(
        caseForensics.traceEvidenceResults[1]
      )
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
        ?.setText(
          completed ? '[ COMPLETE ]' : '[ ANALYZE ]'
        )
        .setColor(
          completed ? '#00ff00' : '#ffcc00'
        );

      if (completed) {
        zone.disableInteractive();
      }
    });

    this.hud?.refreshFromScene();
    this.updateProceedVisibility();
  }

  unlockIdentityEvidenceForSuspects(payload = {}) {
    if (!payload.completed || payload.aborted) {
      return;
    }

    const evidenceType = payload.evidenceType;

    if (!IDENTITY_EVIDENCE_TYPES.includes(evidenceType)) {
      return;
    }

    const suspects = Array.isArray(this.gameState.suspects)
      ? this.gameState.suspects
      : [];

    suspects.forEach((suspect) => {
      suspect.restrictedProfile ??= {};
      suspect.restrictedProfile.unlockedFields ??= [];
      suspect.restrictedProfile.forensicAttributes ??= {};

      const attributeData =
        suspect.restrictedProfile.forensicAttributes[
          evidenceType
        ];

      if (attributeData && typeof attributeData === 'object') {
        attributeData.unlocked = true;
      }

      if (
        !suspect.restrictedProfile.unlockedFields.includes(
          evidenceType
        )
      ) {
        suspect.restrictedProfile.unlockedFields.push(
          evidenceType
        );
      }
    });
  }

  applyLock(locked) {
    this.uiLocked = locked;

    this.hotspots?.forEach?.((zone) => {
      if (!zone || zone.isDestroyed) {
        return;
      }

      const data = zone.hotspotData;

      if (locked) {
        if (zone.input && !zone.isDestroyed) {
          zone.disableInteractive?.();
        }

        if (
          zone.exitBtn?.input &&
          !zone.exitBtn.isDestroyed
        ) {
          zone.exitBtn.disableInteractive?.();
        }

        return;
      }

      if (!data?.completed || data.alwaysVisible) {
        if (zone.input && !zone.isDestroyed) {
          zone.setInteractive?.({
            useHandCursor: true
          });
        }
      } else if (zone.input && !zone.isDestroyed) {
        zone.disableInteractive?.();
      }

      if (
        zone.exitBtn &&
        zone.exitBtn.input &&
        !zone.exitBtn.isDestroyed
      ) {
        zone.exitBtn.setInteractive?.({
          useHandCursor: true
        });
      }
    });

    if (
      this.assistantHotspot &&
      !this.assistantHotspot.isDestroyed
    ) {
      if (locked) {
        this.assistantHotspot.disableInteractive?.();
      } else if (this.labOnboarding?.assistantPresent) {
        this.assistantHotspot.setInteractive?.({
          useHandCursor: true
        });
      }
    }

    if (
      this.proceedHotspot &&
      this.proceedHotspot.input &&
      !this.proceedHotspot.isDestroyed
    ) {
      if (locked) {
        this.proceedHotspot.disableInteractive?.();
      } else if (
        this.completedCount >= this.totalStations
      ) {
        this.proceedHotspot.setInteractive?.({
          useHandCursor: true
        });
      } else {
        this.proceedHotspot.disableInteractive?.();
      }
    }

    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      if (!arrow || arrow.isDestroyed) {
        return;
      }

      if (locked) {
        if (arrow.input && !arrow.isDestroyed) {
          arrow.disableInteractive?.();
        }

        arrow.setAlpha?.(0.35);
      } else {
        if (arrow.input && !arrow.isDestroyed) {
          arrow.setInteractive?.({
            useHandCursor: true
          });
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
    if (this.uiLocked) {
      return;
    }

    const targetScene = 'CrimeCityScene';

    this.uiLocked = true;
    this.applyLock(true);

    const sceneData = {
      ...(this.returnData || {}),
      cityId: this.cityId,
      caseKey:
        this.labManager?.getCaseKey?.() ||
        'default_case',
      gameState: this.gameState,
      crimeLabCompleted:
        this.completedCount >= this.totalStations,
      fromCrimeLab: true
    };

    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      async () => {
        try {
          await this.game.sceneLoader.ensure(targetScene);
          this.goto(targetScene, sceneData);
        } catch (err) {
          console.error(
            '[CrimeLabScene] Failed to start CrimeCityScene:',
            err
          );

          this.uiLocked = false;
          this.applyLock(false);

          this.cameras.main.fadeIn(300, 0, 0, 0);
          this.showNavHint('ERROR: Cannot switch scenes');
        }
      }
    );
  }

  goToCrimeCity() {
    if (this.uiLocked) {
      return;
    }

    if (this.completedCount < this.totalStations) {
      console.warn(
        '[CrimeLabScene] Cannot return to Crime City: not all lab stations are complete.',
        {
          completedCount: this.completedCount,
          totalStations: this.totalStations
        }
      );

      return;
    }

    console.log(
      '[CrimeLabScene] Returning to Crime City after lab completion.',
      {
        cityId: this.cityId,
        caseKey: this.labManager?.getCaseKey?.(),
        completedCount: this.completedCount
      }
    );

    this.uiLocked = true;
    this.applyLock(true);

    this.labManager.markCrimeLabCompleted();
    saveGameState();

    const returnData = {
      ...this.returnData,
      cityId: this.cityId,
      caseKey: this.labManager.getCaseKey(),
      gameState: this.gameState,
      crimeLabCompleted: true,
      showLabCompletionPhoneCall: true,
      fromCrimeLab: true
    };

    this.cameras.main.fadeOut(350, 0, 0, 0);

    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      async () => {
        try {
          await this.game.sceneLoader.ensure(
            'CrimeCityScene'
          );

          this.game.events.emit('setHudVisible', true);
          EventBus.emit('showHUD');

          this.goto('CrimeCityScene', returnData);
        } catch (error) {
          console.error(
            '[CrimeLabScene] Failed to start CrimeCityScene:',
            error
          );

          this.uiLocked = false;
          this.applyLock(false);

          this.cameras.main.fadeIn(350, 0, 0, 0);
          this.showNavHint('CRIME CITY UNAVAILABLE');
        }
      }
    );
  }

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) {
      return;
    }

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

    if (this.assistantHotspot) {
      const bounds = this.assistantHotspot.getBounds();

      this.debugGraphics.strokeRect(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      const assistantLabel = this.add
        .text(
          bounds.x + 8,
          bounds.y + 8,
          'assistant_hotspot',
          {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#00ffcc',
            backgroundColor: '#000000',
            padding: { left: 4, right: 4, top: 2, bottom: 2 }
          }
        )
        .setDepth(999);

      this.debugTexts.push(assistantLabel);
    }
  }

  cleanupScene() {
    console.log('[CrimeLabScene] Cleanup started');

    this.input.keyboard?.off?.(
      'keydown-LEFT',
      this.boundMoveLeft
    );

    this.input.keyboard?.off?.(
      'keydown-RIGHT',
      this.boundMoveRight
    );

    this.events?.off?.(
      Phaser.Scenes.Events.WAKE,
      this.boundForceUnlock
    );

    this.events?.off?.(
      Phaser.Scenes.Events.RESUME,
      this.boundForceUnlock
    );

    this.events?.off?.(
      Phaser.Scenes.Events.RESUME,
      this.boundCheckMiniGameResults
    );

    this.timerTickEvent?.remove?.(false);
    this.timerTickEvent = null;

    if (Array.isArray(this.hotspots)) {
      this.hotspots.forEach((zone) => {
        if (!zone) {
          return;
        }

        zone.removeAllListeners?.();

        if (zone.scene?.sys?.input && !zone.isDestroyed) {
          zone.disableInteractive?.();
        }

        zone.statusLabel?.destroy?.();

        if (zone.exitBtn) {
          zone.exitBtn.removeAllListeners?.();

          if (
            zone.exitBtn.scene?.sys?.input &&
            !zone.exitBtn.isDestroyed
          ) {
            zone.exitBtn.disableInteractive?.();
          }

          zone.exitBtn.destroy?.();
        }

        zone.destroy?.();
      });
    }

    this.hotspots = [];

    if (this.assistantHotspot) {
      this.assistantHotspot.removeAllListeners?.();

      if (
        this.assistantHotspot.scene?.sys?.input &&
        !this.assistantHotspot.isDestroyed
      ) {
        this.assistantHotspot.disableInteractive?.();
      }

      this.assistantHotspot.destroy?.();
      this.assistantHotspot = null;
    }

    this.debugGraphics?.destroy?.();
    this.debugGraphics = null;

    if (Array.isArray(this.debugTexts)) {
      this.debugTexts.forEach((text) => {
        text?.destroy?.();
      });
    }

    this.debugTexts = [];

    this.hud?.destroy?.();
    this.hud = null;

    [
      'leftArrow',
      'rightArrow',
      'navHint',
      'introHint',
      'proceedHotspot'
    ].forEach((property) => {
      const element = this[property];

      if (!element) {
        return;
      }

      element.removeAllListeners?.();

      if (
        element.scene?.sys?.input &&
        !element.isDestroyed
      ) {
        element.disableInteractive?.();
      }

      element.destroy?.();
      this[property] = null;
    });

    console.log('[CrimeLabScene] Cleanup complete');
  }
}