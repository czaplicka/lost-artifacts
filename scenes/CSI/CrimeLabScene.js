import { BaseScene } from '../BaseScene.js';
import { gameState } from '../../GameData.js';
import { CrimeLabManager } from './CrimeLabManager.js';
import { CrimeLabHUD } from './CrimeLabHUD.js';
import { CrimeLabView } from './CrimeLabView.js';
import { CrimeLabAudioController } from './CrimeLabAudioController.js';
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
    this.audioController = null;
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

    this.navigationArrowStates = new Map();
    this.introHintTween = null;
    this.introHintTimer = null;

    this.uiLocked = false;
    this.isExitingLab = false;
    this.completedCount = 0;
    this.totalStations = STATION_IDS.length;

    this.activeMiniGameSession = null;
    this.miniGameLoadToken = null;
    this.labRunToken = null;

    this.boundMoveLeft = this.moveLeft.bind(this);
    this.boundMoveRight = this.moveRight.bind(this);
    this.boundForceUnlock = this.forceUnlock.bind(this);
    this.boundCheckMiniGameResults =
      this.checkMiniGameResults.bind(this);
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  init(data = {}) {
    this.detachMiniGameListeners();

    this.labRunToken = {};
    this.miniGameLoadToken = null;

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

    this.audioController = new CrimeLabAudioController(this);
    this.audioController.init();
    this.audioController.setupAudioUnlock();

    if (!this.sound.locked) {
      this.audioController.playLabAmbient();
    }

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

    this.input.keyboard?.on(
      'keydown-LEFT',
      this.boundMoveLeft
    );

    this.input.keyboard?.on(
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

    return getLabOnboardingConfig(
      schedule.lab ?? 'call_only'
    );
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

    if (
      playerGameCount + assistantResultCount !==
      this.totalStations
    ) {
      console.warn(
        '[CrimeLabScene] Invalid lab onboarding configuration.',
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
    return this.getRequiredStationIds().filter((stationId) => {
      return this.evidenceService?.isStationCompleted(
        stationId
      ) === true;
    }).length;
  }

  isLabComplete() {
    const requiredStations = this.getRequiredStationIds();

    return (
      requiredStations.length === 0 ||
      this.completedCount >= requiredStations.length
    );
  }

  getRemainingAnalysisCount() {
    return Math.max(
      0,
      this.getRequiredStationIds().length -
        this.completedCount
    );
  }

  getEvidenceConfigForStation(stationId) {
    return (
      this.evidenceService?.getStationEvidenceConfig(
        stationId
      ) || null
    );
  }

  getAssistantResultSummaries() {
    return this.getAssistantStationIds().map((stationId) => {
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
        if (!this.isExitingLab) {
          this.applyLock(false);
        }
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

    this.assistantHotspot = this.add
      .zone(220, 340, 230, 410)
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

    const createStationAction = (
      evidence,
      evidenceIndex,
      stationId
    ) => {
      return () => this.enterMiniGame(
        evidence.minigame,
        {
          evidenceConfig: evidence,
          evidenceIndex,
          evidenceType: evidence.evidenceType,
          correctValue: evidence.correctValue,
          clueType: evidence.clueType,
          clueText: evidence.clueText
        },
        stationId
      );
    };

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
        action: createStationAction(
          identityEvidence,
          null,
          'identity'
        )
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
        action: createStationAction(
          trace0,
          0,
          'trace_0'
        )
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
        action: createStationAction(
          trace1,
          1,
          'trace_1'
        )
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
          if (!this.uiLocked) {
            exitBtn.setScale(0.6);
            this.showNavHint(data.label);
          }
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
          (
            data.stationId &&
            !this.isStationRequired(data.stationId)
          )
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

        zone.statusLabel = this.add
          .text(
            data.x + data.width / 2,
            data.y + data.height + 10,
            !isRequired
              ? '[ ASSISTANT RESULT ]'
              : data.completed
                ? '[ COMPLETE ]'
                : '[ ANALYZE ]',
            {
              fontFamily: 'PressStart2P',
              fontSize: '8px',
              color: !isRequired
                ? '#39ff14'
                : data.completed
                  ? '#00ff00'
                  : '#ffcc00'
            }
          )
          .setOrigin(0.5)
          .setDepth(60);
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

    gameObject.setInteractive?.({ useHandCursor: true });
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
      const visible = this.currentView === 'lab_intro';
      this.assistantHotspot.setVisible(visible);

      if (
        visible &&
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

    const arrowStyle = {
      fontFamily: 'SpecialElite',
      fontSize: '54px',
      color: '#39ff14',
      backgroundColor: 'rgba(0,0,0,0.15)',
      padding: { left: 8, right: 8, top: 8, bottom: 8 }
    };

    this.leftArrow = this.add
      .text(46, height / 2, '◀', arrowStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0.75)
      .setInteractive({ useHandCursor: true });

    this.rightArrow = this.add
      .text(width - 46, height / 2, '▶', arrowStyle)
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
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
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
          padding: { left: 12, right: 12, top: 8, bottom: 8 },
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

    this.setupNavigationArrow(
      this.leftArrow,
      () => this.moveLeft(),
      () => this.getLeftRoomLabel()
    );

    this.setupNavigationArrow(
      this.rightArrow,
      () => this.moveRight(),
      () => this.getRightRoomLabel()
    );

    this.updateNavVisibility();
  }

  setupNavigationArrow(arrow, move, getLabel) {
    const tween = this.tweens.add({
      targets: arrow,
      alpha: { from: 0.55, to: 0.9 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true
    });

    const state = {
      tween,
      hovered: false,
      hasDestination: false,
      originalSetVisible: arrow.setVisible
    };

    this.navigationArrowStates.set(arrow, state);

    // Także bezpośrednie setVisible(false) zatrzymuje pulsowanie.
    arrow.setVisible = (visible) => {
      state.originalSetVisible.call(arrow, visible);

      if (!visible) {
        state.hovered = false;
        this.hideNavHint();
      }

      this.refreshNavigationArrow(arrow);

      return arrow;
    };

    arrow
      .on('pointerdown', (pointer) => {
        pointer?.event?.stopPropagation?.();

        if (this.canUseNavigationArrow(arrow)) {
          move();
        }
      })
      .on('pointerover', () => {
        if (!this.canUseNavigationArrow(arrow)) {
          return;
        }

        state.hovered = true;
        this.refreshNavigationArrow(arrow);
        this.showNavHint(getLabel());
      })
      .on('pointerout', () => {
        state.hovered = false;
        this.refreshNavigationArrow(arrow);
        this.hideNavHint();
      });
  }

  canUseNavigationArrow(arrow) {
    const state = this.navigationArrowStates.get(arrow);

    return Boolean(
      state &&
      state.hasDestination &&
      arrow?.scene &&
      arrow.visible &&
      !this.uiLocked &&
      !this.isExitingLab
    );
  }

  refreshNavigationArrow(arrow) {
    const state = this.navigationArrowStates.get(arrow);

    if (!state || !arrow?.scene) {
      return;
    }

    const enabled = this.canUseNavigationArrow(arrow);

    if (arrow.input) {
      arrow.input.enabled = enabled;
    }

    if (!enabled || state.hovered) {
      state.tween.pause();

      if (!enabled) {
        state.hovered = false;
      }

      arrow
        .setScale(enabled && state.hovered ? 1.08 : 1)
        .setAlpha(enabled ? 1 : 0.35);

      return;
    }

    arrow.setScale(1);
    state.tween.resume();
  }

  destroyNavigationTweens() {
    for (const [arrow, state] of this.navigationArrowStates) {
      state.tween.remove();

      // Usuwamy wrapper przed niszczeniem obiektu.
      arrow.setVisible = state.originalSetVisible;
    }

    this.navigationArrowStates.clear();
  }

  moveLeft() {
    if (this.uiLocked || this.isExitingLab) {
      return;
    }

    const previous = {
      lab_a: 'lab_intro',
      lab_b: 'lab_a',
      lab_c: 'lab_b'
    }[this.currentView];

    if (previous) {
      this.goToView(previous);
    }
  }

  moveRight() {
    if (this.uiLocked || this.isExitingLab) {
      return;
    }

    const next = {
      lab_intro: 'lab_a',
      lab_a: 'lab_b',
      lab_b: 'lab_c'
    }[this.currentView];

    if (next) {
      this.goToView(next);
    }
  }

  goToView(viewName) {
    this.labView?.showView(viewName);
  }

  updateNavVisibility() {
    this.updateNavigationArrow(
      this.leftArrow,
      this.currentView !== 'lab_intro'
    );

    this.updateNavigationArrow(
      this.rightArrow,
      this.currentView !== 'lab_c'
    );
  }

  updateNavigationArrow(arrow, hasDestination) {
    const state = this.navigationArrowStates.get(arrow);

    if (!state || !arrow?.scene) {
      return;
    }

    state.hasDestination = hasDestination;

    // Wrapper od razu aktualizuje tween, alpha i interakcję.
    arrow.setVisible(hasDestination);
  }

  updateProceedVisibility() {
    this.updateRoomHotspots();
  }

  getLeftRoomLabel() {
    return {
      lab_a: 'Lab Entrance',
      lab_b: 'Identity Lab',
      lab_c: 'Trace Analysis'
    }[this.currentView] || '';
  }

  getRightRoomLabel() {
    return {
      lab_intro: 'Identity Lab',
      lab_a: 'Trace Analysis',
      lab_b: 'Evidence Analysis'
    }[this.currentView] || '';
  }

  showNavHint(text) {
    if (text && this.navHint) {
      this.navHint.setText(text).setVisible(true);
    }
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

  clearIntroHintAnimation() {
    if (this.introHintTimer) {
      this.introHintTimer.remove(false);
      this.introHintTimer = null;
    }

    if (this.introHintTween) {
      this.introHintTween.remove();
      this.introHintTween = null;
    }
  }

  showIntroHint() {
    if (!this.introHint?.scene) {
      return;
    }

    this.clearIntroHintAnimation();

    const runToken = this.labRunToken;

    this.introHint.setAlpha(0);

    this.introHintTween = this.tweens.add({
      targets: this.introHint,
      alpha: 1,
      duration: 350,
      ease: 'Power2',
      onComplete: () => {
        this.introHintTween = null;
      }
    });

    this.introHintTimer = this.time.delayedCall(2800, () => {
      this.introHintTimer = null;

      if (
        this.labRunToken !== runToken ||
        !this.introHint?.scene
      ) {
        return;
      }

      if (this.introHintTween) {
        this.introHintTween.remove();
        this.introHintTween = null;
      }

      this.introHintTween = this.tweens.add({
        targets: this.introHint,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.introHintTween = null;
        }
      });
    });
  }

  detachMiniGameListeners() {
    const session = this.activeMiniGameSession;

    if (!session) {
      return;
    }

    this.activeMiniGameSession = null;

    const events = session.scene?.events;

    events?.off('minigame-complete', session.onComplete);
    events?.off('minigame-closed', session.onClosed);
    events?.off(
      Phaser.Scenes.Events.SHUTDOWN,
      session.onStopped
    );
    events?.off(
      Phaser.Scenes.Events.DESTROY,
      session.onStopped
    );
  }

  attachMiniGameListeners(minigameScene, sceneKey) {
    this.detachMiniGameListeners();

    const session = {
      scene: minigameScene,
      sceneKey,
      completed: false,
      onComplete: null,
      onClosed: null,
      onStopped: null
    };

    session.onComplete = (payload) => {
      if (
        this.activeMiniGameSession !== session ||
        session.completed ||
        this.isExitingLab ||
        !this.labRunToken
      ) {
        return;
      }

      session.completed = true;
      this.handleMiniGameComplete(payload);
    };

    session.onClosed = () => {
      if (this.activeMiniGameSession !== session) {
        return;
      }

      this.detachMiniGameListeners();
      this.returnFromMiniGame();
    };

    session.onStopped = session.onClosed;

    this.activeMiniGameSession = session;

    minigameScene.events.once(
      'minigame-complete',
      session.onComplete
    );

    minigameScene.events.once(
      'minigame-closed',
      session.onClosed
    );

    minigameScene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      session.onStopped
    );

    minigameScene.events.once(
      Phaser.Scenes.Events.DESTROY,
      session.onStopped
    );
  }

  async enterMiniGame(
    sceneKey,
    sceneData = {},
    stationId = ''
  ) {
    if (
      this.uiLocked ||
      this.isExitingLab ||
      this.activeMiniGameSession ||
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

    const loadToken = {};
    const runToken = this.labRunToken;

    this.miniGameLoadToken = loadToken;
    this.applyLock(true);

    try {
      await this.game.sceneLoader.ensure(sceneKey);

      if (
        this.miniGameLoadToken !== loadToken ||
        this.labRunToken !== runToken ||
        this.isExitingLab ||
        !this.sys.isActive()
      ) {
        return;
      }

      this.miniGameLoadToken = null;

      const minigameData = {
        ...sceneData,
        stationId,
        cityId: this.cityId,
        caseKey: this.labManager.getCaseKey(),
        gameState: this.gameState
      };

      const minigameScene = this.scene.get(sceneKey);

      if (!minigameScene) {
        throw new Error(
          `Minigame scene "${sceneKey}" not found.`
        );
      }

      // Rejestracja przed startem — również dla zdarzeń z create().
      this.attachMiniGameListeners(minigameScene, sceneKey);

      this.scene.pause();
      this.scene.launch(sceneKey, minigameData);
    } catch (error) {
      if (
        this.labRunToken !== runToken ||
        !this.labRunToken
      ) {
        return;
      }

      console.error(
        `[CrimeLabScene] Minigame scene "${sceneKey}" failed to start.`,
        error
      );

      this.miniGameLoadToken = null;
      this.detachMiniGameListeners();

      if (this.scene.isPaused(this.scene.key)) {
        this.scene.resume(this.scene.key);
      }

      if (!this.isExitingLab) {
        this.applyLock(false);
        this.showNavHint('ANALYSIS STATION UNAVAILABLE');
      }
    }
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
    this.detachMiniGameListeners();

    if (this.isExitingLab || !this.labRunToken) {
      return;
    }

    if (this.scene.isPaused(this.scene.key)) {
      this.scene.resume(this.scene.key);
    }

    this.applyLock(false);
    this.checkMiniGameResults();
  }

  checkMiniGameResults() {
    if (!this.evidenceService) {
      return;
    }

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
        this.evidenceService.isStationCompleted(
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
    this.uiLocked = Boolean(locked);

    // Aktualizacja strzałek sama obsługuje pauzę i alpha.
    this.updateNavVisibility();
    this.updateRoomHotspots();

    if (this.uiLocked) {
      this.hideNavHint();
    }
  }

  forceUnlock() {
    if (
      this.isExitingLab ||
      this.miniGameLoadToken ||
      this.activeMiniGameSession ||
      this.assistantDialog?.isOpen() ||
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

    this.completedCount =
      this.getCompletedRequiredStationCount();

    const labCompleted = this.isLabComplete();
    const runToken = this.labRunToken;

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
          await this.game.sceneLoader.ensure('CrimeCityScene');

          if (
            this.labRunToken !== runToken ||
            !this.sys.isActive()
          ) {
            return;
          }

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

          if (
            this.labRunToken !== runToken ||
            !this.sys.isActive()
          ) {
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

  goToCrimeCity() {
    this.exitLab();
  }

  createOptionalDebug() {
    if (!this.DEBUG_HOTSPOTS) {
      return;
    }

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    const addDebugLabel = (x, y, text) => {
      const label = this.add
        .text(x + 8, y + 8, text, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: { left: 4, right: 4, top: 2, bottom: 2 }
        })
        .setDepth(999);

      this.debugTexts.push(label);
    };

    this.hotspots.forEach((zone) => {
      const data = zone.hotspotData;

      this.debugGraphics.strokeRect(
        data.x,
        data.y,
        data.width,
        data.height
      );

      addDebugLabel(data.x, data.y, data.id);
    });

    if (this.assistantHotspot) {
      const bounds = this.assistantHotspot.getBounds();

      this.debugGraphics.strokeRect(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      addDebugLabel(
        bounds.x,
        bounds.y,
        'assistant_hotspot'
      );
    }
  }

  cleanupScene() {
    this.labRunToken = null;
    this.miniGameLoadToken = null;
    this.isExitingLab = true;

    this.destroyNavigationTweens();
    this.clearIntroHintAnimation();

    const minigameKey =
      this.activeMiniGameSession?.sceneKey;

    this.detachMiniGameListeners();

    if (
      minigameKey &&
      (
        this.scene.isActive(minigameKey) ||
        this.scene.isPaused(minigameKey) ||
        this.scene.isSleeping(minigameKey)
      )
    ) {
      this.scene.stop(minigameKey);
    }

    this.input.keyboard?.off(
      'keydown-LEFT',
      this.boundMoveLeft
    );

    this.input.keyboard?.off(
      'keydown-RIGHT',
      this.boundMoveRight
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.boundForceUnlock
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundForceUnlock
    );

    this.events.off(
      Phaser.Scenes.Events.RESUME,
      this.boundCheckMiniGameResults
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.audioController?.destroy();
    this.audioController = null;

    this.assistantDialog?.destroy?.();
    this.assistantDialog = null;

    this.timeController?.destroy?.();
    this.timeController = null;

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

    this.hotspots = [];

    if (this.assistantHotspot) {
      this.assistantHotspot.removeAllListeners?.();
      this.safeDisableInteractive(this.assistantHotspot);
      this.assistantHotspot.destroy?.();
      this.assistantHotspot = null;
    }

    this.debugGraphics?.destroy?.();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => text?.destroy?.());
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

      if (element) {
        element.removeAllListeners?.();
        this.safeDisableInteractive(element);
        element.destroy?.();
        this[property] = null;
      }
    });

    this.labView?.destroy?.();
    this.labView = null;

    this.evidenceService = null;
    this.labManager = null;
  }
}