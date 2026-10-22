import { BaseScene } from '../BaseScene.js';
import { gameState } from '../../GameData.js';
import { CrimeLabManager } from './CrimeLabManager.js';
import { CrimeLabHUD } from './CrimeLabHUD.js';
import { CrimeLabView } from './CrimeLabView.js';
import { EventBus } from '../../EventBus.js';
import { getLabOnboardingConfig } from './labOnboardingConfig.js';
import { CrimeLabEvidenceService } from './CrimeLabEvidenceService.js';
import { CrimeLabAssistantDialog } from './CrimeLabAssistantDialog.js';
import { CrimeLabTimeController } from './CrimeLabTimeController.js';
import { advanceCrimeTutorial } from '../../CrimeCityTutorial.js';


const STATION_IDS = ['identity', 'trace_0', 'trace_1'];


export class CrimeLabScene extends BaseScene {
  constructor() {
    super({ key: 'CrimeLabScene' });


    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CrimeCityScene';
    this.returnData = {};


    this.currentView = 'lab_intro';


    this.labManager = null;
    this.evidenceService = null;
    this.timeController = null;
    this.labOnboarding = null;


    this.labView = null;
    this.hud = null;
    this.assistantDialog = null;
    this.assistantHotspot = null;


    this.hotspots = [];
    this.debugTexts = [];
    this.DEBUG_HOTSPOTS = false;
    this.debugGraphics = null;


    this.leftArrow = null;
    this.rightArrow = null;
    this.navHint = null;
    this.introHint = null;


    this.uiLocked = false;
    this.isExitingLab = false;
    this.completedCount = 0;
    this.totalStations = STATION_IDS.length;


    this.boundMoveLeft = this.moveLeft.bind(this);
    this.boundMoveRight = this.moveRight.bind(this);
    this.boundForceUnlock = this.forceUnlock.bind(this);
    this.boundCheckMiniGameResults =
      this.checkMiniGameResults.bind(this);
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


    this.labManager = new CrimeLabManager(
      this.gameState,
      this.cityId
    );


    this.labManager.ensureCaseForensics();
    this.labManager.ensureRandomTraceEvidence();


    this.evidenceService = new CrimeLabEvidenceService(
      this.gameState,
      this.labManager,
      this.cityId
    );


    this.timeController = new CrimeLabTimeController(this);
    this.labOnboarding = this.getLabOnboarding();


    this.evidenceService.ensureAssistantResults(
      this.getAssistantStationIds()
    );


    this.currentView = 'lab_intro';
    this.hotspots = [];
    this.debugTexts = [];
    this.uiLocked = false;
    this.isExitingLab = false;


    this.completedCount =
      this.getCompletedRequiredStationCount();
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


        if (this.leftArrow && this.rightArrow) {
          this.updateNavVisibility();
        }


        if (this.hotspots.length > 0) {
          this.updateRoomHotspots();
        }


        this.hideNavHint();
      }
    });


    this.labView.create(width, height);


    this.createHotspots();
    this.createAssistantHotspot();
    this.createNavigationUI();


    this.hud = new CrimeLabHUD(this);
    this.hud.create();


    this.assistantDialog = new CrimeLabAssistantDialog(this);


    this.createOptionalDebug();


    this.labView.showView('lab_intro');
    this.updateRoomHotspots();
    this.showIntroHint();
    this.hud.refreshFromScene();


    if (this.labOnboarding?.assistantPresent) {
      this.time.delayedCall(250, () => {
        if (
          !this.uiLocked &&
          !this.isExitingLab &&
          !this.assistantDialog?.isOpen()
        ) {
          this.openAssistantDialogue('greeting');
        }
      });
    }


    this.input.keyboard.on(
      'keydown-LEFT',
      this.boundMoveLeft
    );


    this.input.keyboard.on(
      'keydown-RIGHT',
      this.boundMoveRight
    );


    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.boundForceUnlock
    );


    this.events.on(
      Phaser.Scenes.Events.RESUME,
      this.boundForceUnlock
    );


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
    const mission = this.gameState?.currentMission ?? {};


    const rawCaseIndex =
      mission.caseIndex ??
      mission.index ??
      this.gameState?.currentCaseIndex ??
      this.gameState?.caseIndex ??
      0;


    const caseIndex = String(rawCaseIndex);


    const schedule =
      mission.onboarding ??
      this.gameState?.currentOnboarding ??
      this.gameState?.onboardingSchedule?.[caseIndex] ??
      { lab: 'call_only' };


    const labMode = schedule.lab ?? 'call_only';
    const config = getLabOnboardingConfig(labMode);


    console.log('[CrimeLabScene] Lab onboarding resolved:', {
      rawCaseIndex,
      caseIndex,
      labMode,
      assistantPresent: config.assistantPresent,
      playerGameCount: config.playerGameCount,
      assistantResultCount: config.assistantResultCount
    });


    return config;
  }


  getIntroBackgroundKey() {
    return (
      this.labOnboarding?.backgroundKey ||
      'crimelab_point'
    );
  }


  getPlayerGameCount() {
    const rawValue = Number(
      this.labOnboarding?.playerGameCount
    );


    if (!Number.isFinite(rawValue)) {
      return this.totalStations;
    }


    return Phaser.Math.Clamp(
      Math.floor(rawValue),
      0,
      this.totalStations
    );
  }


  getAssistantResultCount() {
    const rawValue = Number(
      this.labOnboarding?.assistantResultCount
    );


    if (!Number.isFinite(rawValue)) {
      return 0;
    }


    return Phaser.Math.Clamp(
      Math.floor(rawValue),
      0,
      this.totalStations
    );
  }


  getLabStationAssignment() {
    const playerGameCount = this.getPlayerGameCount();
    const assistantResultCount =
      this.getAssistantResultCount();


    const configuredTotal =
      playerGameCount + assistantResultCount;


    if (configuredTotal !== this.totalStations) {
      console.warn(
        '[CrimeLabScene] Invalid lab onboarding configuration. ' +
        'playerGameCount + assistantResultCount must equal totalStations.',
        {
          playerGameCount,
          assistantResultCount,
          totalStations: this.totalStations,
          mode: this.labOnboarding?.mode
        }
      );


      return {
        playerStationIds: STATION_IDS.slice(
          0,
          playerGameCount
        ),
        assistantStationIds: STATION_IDS.slice(
          playerGameCount
        )
      };
    }


    return {
      playerStationIds: STATION_IDS.slice(
        0,
        playerGameCount
      ),
      assistantStationIds: STATION_IDS.slice(
        playerGameCount,
        playerGameCount + assistantResultCount
      )
    };
  }


  getRequiredStationIds() {
    return this.getLabStationAssignment().playerStationIds;
  }


  getAssistantStationIds() {
    return this.getLabStationAssignment().assistantStationIds;
  }


  isStationRequired(stationId) {
    return this.getRequiredStationIds().includes(stationId);
  }


  getCompletedRequiredStationCount() {
    return this.getRequiredStationIds()
      .filter((stationId) => {
        return this.evidenceService?.isStationCompleted(
          stationId
        ) === true;
      })
      .length;
  }


  isLabComplete() {
    const requiredStations = this.getRequiredStationIds();


    if (requiredStations.length === 0) {
      return true;
    }


    return this.completedCount >= requiredStations.length;
  }


  getRemainingAnalysisCount() {
    return Math.max(
      0,
      this.getRequiredStationIds().length -
        this.completedCount
    );
  }


  getEvidenceConfigForStation(stationId) {
    return this.evidenceService?.getStationEvidenceConfig(
      stationId
    ) || null;
  }


  getAssistantResultSummaries() {
    return this.getAssistantStationIds()
      .map((stationId) => {
        const evidence =
          this.getEvidenceConfigForStation(stationId);


        return {
          stationId,
          label: evidence?.label || 'Forensic Analysis',
          text:
            evidence?.clueText ||
            'The result is ready for review.'
        };
      });
  }


  openAssistantDialogue(startNodeId = 'greeting') {
    if (
      this.uiLocked ||
      this.isExitingLab ||
      !this.labOnboarding?.assistantPresent ||
      this.assistantDialog?.isOpen()
    ) {
      return;
    }


    const dialogue = this.cache.json.get(
      'crime_lab_assistant_dialogues'
    );


    if (!dialogue?.nodes) {
      console.error(
        '[CrimeLabScene] Assistant dialogue JSON is missing or invalid.',
        dialogue
      );


      this.showNavHint('LAB ASSISTANT DIALOGUE UNAVAILABLE');
      return;
    }


    const resolvedNodeId = dialogue.nodes[startNodeId]
      ? startNodeId
      : dialogue.defaultNodeId;


    if (!resolvedNodeId || !dialogue.nodes[resolvedNodeId]) {
      console.error(
        '[CrimeLabScene] Assistant dialogue has no valid start node.',
        {
          requestedNodeId: startNodeId,
          defaultNodeId: dialogue.defaultNodeId,
          availableNodes: Object.keys(dialogue.nodes)
        }
      );


      this.showNavHint('DIALOGUE NODE MISSING');
      return;
    }


    const opened = this.assistantDialog.open({
      dialogue,
      startNodeId: resolvedNodeId,
      onClose: () => {
        if (this.isExitingLab) {
          return;
        }


        this.applyLock(false);
      }
    });


    if (opened) {
      this.applyLock(true);
    }
  }


  createAssistantHotspot() {
    if (!this.labOnboarding?.assistantPresent) {
      return;
    }


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
      if (!this.uiLocked) {
        this.showNavHint('Talk to Lab Assistant');
      }
    });


    this.assistantHotspot.on('pointerout', () => {
      this.hideNavHint();
    });


    this.assistantHotspot.on('pointerdown', () => {
      this.openAssistantDialogue('greeting');
    });
  }


  createHotspots() {
    const caseForensics =
      this.labManager.ensureCaseForensics();


    const identityEvidence =
      this.labManager.getIdentityEvidenceConfig();


    const trace0 =
      this.labManager.getTraceEvidenceConfig(0);


    const trace1 =
      this.labManager.getTraceEvidenceConfig(1);


    const hotspotData = [
      {
        id: 'identity_station',
        stationId: 'identity',
        room: 'lab_a',
        x: 320,
        y: 490,
        width: 250,
        height: 320,
        label: identityEvidence.label,
        completed: Boolean(
          caseForensics.identityEvidenceResult
        ),
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
        stationId: 'trace_0',
        room: 'lab_b',
        x: 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace0.label,
        completed: Boolean(
          caseForensics.traceEvidenceResults?.[0]
        ),
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
        stationId: 'trace_1',
        room: 'lab_c',
        x: 480,
        y: 420,
        width: 350,
        height: 300,
        label: trace1.label,
        completed: Boolean(
          caseForensics.traceEvidenceResults?.[1]
        ),
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
        x: 40,
        y: 40,
        width: 200,
        height: 60,
        label: 'Exit Lab',
        alwaysVisible: true,
        action: () => this.exitLab()
      }
    ];


    this.completedCount =
      this.getCompletedRequiredStationCount();


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
          if (!this.uiLocked && !this.isExitingLab) {
            data.action();
          }
        });


        zone.exitBtn = exitBtn;
      }


      zone.on('pointerover', () => this.onHotspotOver(data));
      zone.on('pointerout', () => this.onHotspotOut());


      zone.on('pointerdown', () => {
        if (
          this.uiLocked ||
          this.isExitingLab ||
          (data.completed && !data.alwaysVisible) ||
          (data.stationId &&
            !this.isStationRequired(data.stationId))
        ) {
          return;
        }


        data.action();
      });


      this.hotspots.push(zone);


      if (!data.alwaysVisible) {
        const isRequired = this.isStationRequired(
          data.stationId
        );


        const labelText = !isRequired
          ? '[ ASSISTANT RESULT ]'
          : data.completed
            ? '[ COMPLETE ]'
            : '[ ANALYZE ]';


        const labelColor = !isRequired
          ? '#39ff14'
          : data.completed
            ? '#00ff00'
            : '#ffcc00';


        const label = this.add
          .text(
            data.x + data.width / 2,
            data.y + data.height + 10,
            labelText,
            {
              fontFamily: 'PressStart2P',
              fontSize: '8px',
              color: labelColor
            }
          )
          .setOrigin(0.5)
          .setDepth(60);


        zone.statusLabel = label;
      }
    });


    this.updateRoomHotspots();
  }


  safeSetInteractive(gameObject) {
    if (
      !gameObject ||
      gameObject.isDestroyed ||
      !gameObject.scene?.sys?.input
    ) {
      return;
    }


    gameObject.setInteractive?.({
      useHandCursor: true
    });
  }


  safeDisableInteractive(gameObject) {
    if (
      !gameObject ||
      gameObject.isDestroyed ||
      !gameObject.input
    ) {
      return;
    }


    gameObject.disableInteractive?.();
  }


  updateRoomHotspots() {
    this.hotspots.forEach((zone) => {
      if (!zone || zone.isDestroyed) {
        return;
      }


      const data = zone.hotspotData;
      const isVisible = data?.room === this.currentView;


      const isRequired =
        !data?.stationId ||
        this.isStationRequired(data.stationId);


      zone.setVisible(isVisible);
      zone.statusLabel?.setVisible(isVisible);
      zone.exitBtn?.setVisible(isVisible);


      if (
        !isVisible ||
        this.uiLocked ||
        this.isExitingLab ||
        !isRequired ||
        (data?.completed && !data?.alwaysVisible)
      ) {
        this.safeDisableInteractive(zone);
        this.safeDisableInteractive(zone.exitBtn);
        return;
      }


      this.safeSetInteractive(zone);
      this.safeSetInteractive(zone.exitBtn);
    });


    if (
      this.assistantHotspot &&
      !this.assistantHotspot.isDestroyed
    ) {
      const assistantVisible =
        this.currentView === 'lab_intro';


      this.assistantHotspot.setVisible(assistantVisible);


      if (
        assistantVisible &&
        !this.uiLocked &&
        !this.isExitingLab
      ) {
        this.safeSetInteractive(this.assistantHotspot);
      } else {
        this.safeDisableInteractive(this.assistantHotspot);
      }
    }
  }


  createNavigationUI() {
    const { width, height } = this.scale;


    this.leftArrow = this.add
      .text(46, height / 2, '◀', {
        fontFamily: 'SpecialElite',
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
        fontFamily: 'SpecialElite',
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
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#39ff14',
        backgroundColor: '#000000',
        padding: {
          left: 10,
          right: 10,
          top: 8,
          bottom: 8
        },
        wordWrap: {
          width: width - 140,
          useAdvancedWrap: true
        },
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
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#fff4c7',
          backgroundColor: '#000000',
          padding: {
            left: 12,
            right: 12,
            top: 8,
            bottom: 8
          },
          wordWrap: {
            width: width - 120,
            useAdvancedWrap: true
          },
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
        if (!this.uiLocked) {
          this.leftArrow.setScale(1.08).setAlpha(1);
          this.showNavHint(this.getLeftRoomLabel());
        }
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
        if (!this.uiLocked) {
          this.rightArrow.setScale(1.08).setAlpha(1);
          this.showNavHint(this.getRightRoomLabel());
        }
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
    if (this.uiLocked || this.isExitingLab) {
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
    if (this.uiLocked || this.isExitingLab) {
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
    this.labView?.showView(viewName);
  }


  updateNavVisibility() {
    const showLeft = this.currentView !== 'lab_intro';
    const showRight = this.currentView !== 'lab_c';
    const canNavigate = !this.uiLocked && !this.isExitingLab;


    this.leftArrow?.setVisible(showLeft);
    this.rightArrow?.setVisible(showRight);


    if (showLeft && canNavigate) {
      this.safeSetInteractive(this.leftArrow);
    } else {
      this.safeDisableInteractive(this.leftArrow);
    }


    if (showRight && canNavigate) {
      this.safeSetInteractive(this.rightArrow);
    } else {
      this.safeDisableInteractive(this.rightArrow);
    }
  }


  updateProceedVisibility() {
    this.updateRoomHotspots();
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


    if (
      data.stationId &&
      !this.isStationRequired(data.stationId)
    ) {
      this.showNavHint('RESULT COMPLETED BY LAB ASSISTANT');
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


  async enterMiniGame(
    sceneKey,
    sceneData = {},
    stationId = ''
  ) {
    if (
      this.uiLocked ||
      this.isExitingLab ||
      !this.isStationRequired(stationId)
    ) {
      return;
    }


    if (!sceneKey) {
      console.error(
        '[CrimeLabScene] enterMiniGame called without a sceneKey.'
      );


      this.showNavHint('ANALYSIS STATION UNAVAILABLE');
      return;
    }


    this.applyLock(true);


    try {
      await this.game.sceneLoader.ensure(sceneKey);
    } catch (error) {
      console.error(
        `[CrimeLabScene] Minigame scene "${sceneKey}" failed to load.`,
        error
      );


      this.applyLock(false);
      this.showNavHint('ANALYSIS STATION UNAVAILABLE');
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
      (payload) => this.handleMiniGameComplete(payload),
      this
    );


    minigameScene.events.once(
      'minigame-closed',
      () => this.returnFromMiniGame(),
      this
    );


    this.scene.pause();
  }


  handleMiniGameComplete(payload = {}) {
    const result =
      this.evidenceService?.saveMiniGameResult(payload);


    if (!result?.saved) {
      return;
    }


    if (!result.wasAlreadyCompleted) {
      this.timeController?.advanceForStation(
        result.stationId
      );
    }


    this.completedCount =
      this.getCompletedRequiredStationCount();


    this.hud?.refreshFromScene();
    this.updateRoomHotspots();
  }


  returnFromMiniGame() {
    if (
      this.isExitingLab ||
      !this.scene.isPaused(this.scene.key)
    ) {
      return;
    }


    this.scene.resume(this.scene.key);
    this.applyLock(false);


    this.checkMiniGameResults();
    this.hud?.refreshFromScene();
  }


  checkMiniGameResults() {
    this.completedCount =
      this.getCompletedRequiredStationCount();


    this.hotspots.forEach((zone) => {
      const data = zone?.hotspotData;


      if (
        !data ||
        data.alwaysVisible ||
        !data.stationId
      ) {
        return;
      }


      data.completed = Boolean(
        this.evidenceService?.isStationCompleted(
          data.stationId
        )
      );


      const isRequired = this.isStationRequired(
        data.stationId
      );


      zone.statusLabel
        ?.setText(
          !isRequired
            ? '[ ASSISTANT RESULT ]'
            : data.completed
              ? '[ COMPLETE ]'
              : '[ ANALYZE ]'
        )
        .setColor(
          !isRequired
            ? '#39ff14'
            : data.completed
              ? '#00ff00'
              : '#ffcc00'
        );
    });


    this.hud?.refreshFromScene();
    this.updateRoomHotspots();
  }


  applyLock(locked) {
    this.uiLocked = locked;


    this.updateNavVisibility();
    this.updateRoomHotspots();


    if (
      this.assistantHotspot &&
      !this.assistantHotspot.isDestroyed
    ) {
      if (locked || this.isExitingLab) {
        this.safeDisableInteractive(this.assistantHotspot);
      } else if (this.currentView === 'lab_intro') {
        this.safeSetInteractive(this.assistantHotspot);
      }
    }


    [this.leftArrow, this.rightArrow].forEach((arrow) => {
      if (!arrow || arrow.isDestroyed) {
        return;
      }


      arrow.setAlpha?.(locked ? 0.35 : 0.75);
    });


    if (locked) {
      this.hideNavHint();
    }
  }


  forceUnlock() {
    if (
      this.isExitingLab ||
      this.scene.isPaused(this.scene.key)
    ) {
      return;
    }


    this.applyLock(false);
  }


  exitLab() {
    if (
      this.uiLocked ||
      this.isExitingLab ||
      !this.sys.isActive()
    ) {
      return;
    }


    // Sprawdzamy aktualnie zapisane wyniki przed wyjściem.
    this.completedCount =
      this.getCompletedRequiredStationCount();


    const labCompleted = this.isLabComplete();


    this.isExitingLab = true;
    this.applyLock(true);


    const returnData = {
      ...this.returnData,
      cityId: this.cityId,
      caseKey: this.labManager.getCaseKey(),
      gameState: this.gameState,
      crimeLabCompleted: labCompleted,
      showLabCompletionPhoneCall: labCompleted,
      fromCrimeLab: true
    };


    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      async () => {
        try {
          await this.game.sceneLoader.ensure(
            'CrimeCityScene'
          );


          if (!this.sys.isActive()) {
            return;
          }


          // Ten zapis był wcześniej tylko w goToCrimeCity().
          if (labCompleted) {
            this.labManager.markCrimeLabCompleted();
            advanceCrimeTutorial(this.gameState, 'crime_lab');
          }


          this.game.events.emit('setHudVisible', true);
          EventBus.emit('showHUD');


          await this.goto('CrimeCityScene', returnData);
        } catch (error) {
          console.error(
            '[CrimeLabScene] Failed to return to CrimeCityScene:',
            error
          );


          if (!this.sys.isActive()) {
            return;
          }


          this.isExitingLab = false;
          this.applyLock(false);


          this.game.events.emit('setHudVisible', false);
          EventBus.emit('hideHUD');


          this.cameras.main.fadeIn(350, 0, 0, 0);
          this.showNavHint('CRIME CITY UNAVAILABLE');
        }
      }
    );


    this.cameras.main.fadeOut(350, 0, 0, 0);
  }


  // Zachowane dla ewentualnych wywołań z pozostałych modułów.
  // Nie tworzy dodatkowego przycisku ani osobnej ścieżki wyjścia.
  goToCrimeCity() {
    this.exitLab();
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
          padding: {
            left: 4,
            right: 4,
            top: 2,
            bottom: 2
          }
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
            padding: {
              left: 4,
              right: 4,
              top: 2,
              bottom: 2
            }
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


    this.assistantDialog?.destroy?.();
    this.assistantDialog = null;


    this.timeController?.destroy?.();
    this.timeController = null;


    if (Array.isArray(this.hotspots)) {
      this.hotspots.forEach((zone) => {
        if (!zone) {
          return;
        }


        zone.removeAllListeners?.();
        this.safeDisableInteractive(zone);


        zone.statusLabel?.destroy?.();


        if (zone.exitBtn) {
          zone.exitBtn.removeAllListeners?.();
          this.safeDisableInteractive(zone.exitBtn);
          zone.exitBtn.destroy?.();
        }


        zone.destroy?.();
      });
    }


    this.hotspots = [];


    if (this.assistantHotspot) {
      this.assistantHotspot.removeAllListeners?.();
      this.safeDisableInteractive(this.assistantHotspot);
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
      'introHint'
    ].forEach((property) => {
      const element = this[property];


      if (!element) {
        return;
      }


      element.removeAllListeners?.();
      this.safeDisableInteractive(element);
      element.destroy?.();
      this[property] = null;
    });


    this.labView?.destroy?.();
    this.labView = null;


    this.evidenceService = null;
    this.labManager = null;


    console.log('[CrimeLabScene] Cleanup complete');
  }
}