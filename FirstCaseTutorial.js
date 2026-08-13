import { EventBus } from './EventBus.js';

const FONT_PIXEL = '"Press Start 2P"';
const FONT_TYPE = '"Special Elite"';

const COLORS = {
  panel: 0x17110e,
  panelBorder: 0xf2d477,
  paper: 0xfff4d0,
  muted: 0xd7c58f,
  accent: 0xf2d477,
  success: 0x8fb180,
  warning: 0xd76d52,
};

const PORTRAIT_KEY = 'portrait_hq';
const PORTRAIT_SIZE = 104;

const STEP_ORDER = [
  'walk_to_case_file',
  'open_case_file',
  'find_route',
  'travel_to_city',
  'finished',
];

const STEP_CONTENT = {
  walk_to_case_file: {
    number: '01',
    title: 'FIRST DAY, WORST TIMING',
    objective: 'Walk to the records cabinet.',
    hint: 'Click near the highlighted cabinet to move Detective Marlowe.',
    targetHotspot: 'cabinet-casefile',
  },
  open_case_file: {
    number: '02',
    title: 'PAPERWORK: THE FINAL BOSS',
    objective: 'Open your case file.',
    hint: 'Click the highlighted records cabinet.',
    targetHotspot: 'cabinet-casefile',
  },
  find_route: {
    number: '03',
    title: 'FOLLOW THE PAPER TRAIL',
    objective: 'Choose a route to the crime city.',
    hint: 'Use the globe to find your destination.',
    targetHotspot: 'globe',
  },
  travel_to_city: {
    number: '04',
    title: 'LEAVE THE BUILDING',
    objective: 'Travel to the crime city.',
    hint: 'Pick the mission destination and start the investigation.',
    targetHotspot: null,
  },
};

export class FirstCaseTutorial {
  constructor(scene, state) {
    this.scene = scene;
    this.gameState = state;

    this.active = false;
    this.currentStep = null;

    this.hotspots = new Map();

    this.overlay = null;
    this.panel = null;
    this.portrait = null;
    this.portraitFrame = null;
    this.nameplate = null;
    this.stepNumberText = null;
    this.titleText = null;
    this.objectiveText = null;
    this.hintText = null;
    this.skipText = null;
    this.highlight = null;
    this.highlightTween = null;
    this.feedbackText = null;
    this.feedbackTween = null;

    this.onResizeBound = this.handleResize.bind(this);
    this.onTravelStartedBound = this.onTravelStarted.bind(this);

    this.ensureState();
  }

  ensureState() {
    if (!this.gameState.onboarding) {
      this.gameState.onboarding = {};
    }

    this.gameState.onboarding.firstCase = {
      active: this.gameState.onboarding.firstCase?.active ?? false,
      step: this.gameState.onboarding.firstCase?.step ?? null,
      completed: this.gameState.onboarding.firstCase?.completed ?? false,
      skipped: this.gameState.onboarding.firstCase?.skipped ?? false,
      walkedToCaseFile:
        this.gameState.onboarding.firstCase?.walkedToCaseFile ?? false,
      caseFileOpened:
        this.gameState.onboarding.firstCase?.caseFileOpened ?? false,
      routeOpened:
        this.gameState.onboarding.firstCase?.routeOpened ?? false,
      travelStarted:
        this.gameState.onboarding.firstCase?.travelStarted ?? false,
    };
  }

  registerHotspot(id, zone) {
    if (!id || !zone) {
      return;
    }
    this.hotspots.set(id, zone);
  }

  start() {
    const tutorialState = this.gameState.onboarding.firstCase;

    if (tutorialState.completed) {
      return;
    }

    this.active = true;
    tutorialState.active = true;

    this.createOverlay();

    this.scene.scale.on('resize', this.onResizeBound);
    EventBus.on('firstCaseTravelStarted', this.onTravelStartedBound);

    const savedStep = tutorialState.step;

    if (savedStep && STEP_ORDER.includes(savedStep)) {
      this.setStep(savedStep);
      return;
    }

    this.setStep('walk_to_case_file');
  }

  resume() {
    if (this.gameState.onboarding.firstCase.completed) {
      return;
    }
    this.start();
  }

  isActive() {
    return this.active;
  }

  getStep() {
    return this.currentStep;
  }

  setStep(stepId) {
    if (!this.active || !STEP_ORDER.includes(stepId)) {
      return;
    }

    this.currentStep = stepId;
    this.gameState.onboarding.firstCase.step = stepId;

    if (stepId === 'finished') {
      this.finish();
      return;
    }

    const step = STEP_CONTENT[stepId];

    this.updateOverlay(step);
    this.highlightHotspot(step.targetHotspot);
  }

  canUseHotspot(hotspotId) {
    if (!this.active) {
      return true;
    }

    if (this.currentStep === 'walk_to_case_file') {
      if (hotspotId !== 'cabinet-casefile') {
        this.showFeedback(
          'Explore freely, detective. But the cabinet over there is where we begin.',
          'warning',
        );
      }
      return true;
    }

    if (this.currentStep === 'open_case_file') {
      if (hotspotId !== 'cabinet-casefile') {
        this.showFeedback(
          'Look around if you like, but the case file will not read itself.',
          'warning',
        );
      }
      return true;
    }

    if (this.currentStep === 'find_route') {
      if (hotspotId === 'cabinet-casefile') {
        this.showFeedback(
          'We have the file. Reading it again will not summon a plane.',
          'warning',
        );
      } else if (hotspotId !== 'globe') {
        this.showFeedback(
          'Wander all you want, but the globe knows where we are headed.',
          'warning',
        );
      }
      return true;
    }

    return true;
  }

  canUseAction(actionId) {
    if (!this.active) {
      return true;
    }

    const actionToHotspot = {
      case_file: 'cabinet-casefile',
      travel: 'globe',
    };

    const hotspotId = actionToHotspot[actionId];

    if (!hotspotId) {
      return true;
    }

    return this.canUseHotspot(hotspotId);
  }

  onPlayerPositionChanged(playerX, playerY) {
    if (!this.active || this.currentStep !== 'walk_to_case_file') {
      return;
    }

    const cabinetZone = this.hotspots.get('cabinet-casefile');

    if (!cabinetZone?.hotspotData) {
      return;
    }

    const data = cabinetZone.hotspotData;
    const reachPadding = 42;

    const left = data.x - reachPadding;
    const right = data.x + data.width + reachPadding;
    const top = data.y - reachPadding;
    const bottom = data.y + data.height + reachPadding;

    const isNearCabinet =
      playerX >= left &&
      playerX <= right &&
      playerY >= top &&
      playerY <= bottom;

    if (!isNearCabinet) {
      return;
    }

    this.gameState.onboarding.firstCase.walkedToCaseFile = true;

    this.showFeedback(
      'Excellent. You have located a cabinet. Promotion is surely inevitable.',
      'success',
    );

    this.scene.time.delayedCall(650, () => {
      if (!this.active || this.currentStep !== 'walk_to_case_file') {
        return;
      }
      this.setStep('open_case_file');
    });
  }

  onCaseFileOpened() {
    if (!this.active) {
      return;
    }

    if (this.currentStep === 'walk_to_case_file') {
      this.gameState.onboarding.firstCase.walkedToCaseFile = true;
    }

    if (
      this.currentStep !== 'open_case_file' &&
      this.currentStep !== 'walk_to_case_file'
    ) {
      return;
    }

    this.gameState.onboarding.firstCase.caseFileOpened = true;

    this.showFeedback(
      'A stolen artefact, four days, and no mention of health insurance.',
      'success',
    );

    this.scene.time.delayedCall(800, () => {
      if (!this.active) {
        return;
      }
      this.setStep('find_route');
    });
  }

  onDestinationMapOpened() {
    if (!this.active) {
      return;
    }

    if (
      this.currentStep === 'walk_to_case_file' ||
      this.currentStep === 'open_case_file'
    ) {
      this.gameState.onboarding.firstCase.walkedToCaseFile = true;
      this.gameState.onboarding.firstCase.caseFileOpened = true;
    }

    if (
      this.currentStep !== 'find_route' &&
      this.currentStep !== 'walk_to_case_file' &&
      this.currentStep !== 'open_case_file'
    ) {
      return;
    }

    this.gameState.onboarding.firstCase.routeOpened = true;

    this.showFeedback(
      'Good. Now let us inconvenience an international airport.',
      'success',
    );

    this.scene.time.delayedCall(500, () => {
      if (!this.active) {
        return;
      }
      this.setStep('travel_to_city');
    });
  }

  onTravelStarted() {
    if (!this.active) {
      return;
    }

    this.gameState.onboarding.firstCase.travelStarted = true;
    this.setStep('finished');
  }

  skip() {
    this.gameState.onboarding.firstCase.skipped = true;
    this.finish();
  }

  showFeedback(message, type = 'warning') {
    if (!this.active || !this.feedbackText) {
      return;
    }

    const color = type === 'success' ? '#8fb180' : '#d76d52';

    this.feedbackText.setText(message);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(0);
    this.feedbackText.setVisible(true);

    if (this.feedbackTween) {
      this.feedbackTween.stop();
    }

    this.feedbackTween = this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 2200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.feedbackText) {
          this.feedbackText.setVisible(false);
        }
      },
    });
  }

  createOverlay() {
    if (this.overlay) {
      return;
    }

    const { width, height } = this.scene.scale;
    const panelWidth = Math.min(width - 48, 860);
    const panelHeight = 140;
    const panelLeft = width / 2 - panelWidth / 2;
    const panelCenterY = height - 80;
    const panelTop = panelCenterY - panelHeight / 2;

    const textLeft = panelLeft + PORTRAIT_SIZE + 36;
    const textWrapWidth = Math.max(panelWidth - PORTRAIT_SIZE - 76, 80);

    this.overlay = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(900);

    this.panel = this.scene.add.rectangle(
      width / 2,
      panelCenterY,
      panelWidth,
      panelHeight,
      COLORS.panel,
      0.94,
    ).setStrokeStyle(3, COLORS.panelBorder, 0.92);

    const portraitX = panelLeft + 16 + PORTRAIT_SIZE / 2;
    const portraitY = panelCenterY;

    this.portraitFrame = this.scene.add.rectangle(
      portraitX,
      portraitY,
      PORTRAIT_SIZE + 8,
      PORTRAIT_SIZE + 8,
      COLORS.panel,
      0.98,
    ).setStrokeStyle(2, COLORS.panelBorder, 0.85);

    if (this.scene.textures.exists(PORTRAIT_KEY)) {
      this.portrait = this.scene.add.image(
        portraitX,
        portraitY,
        PORTRAIT_KEY,
      ).setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
    } else {
      console.warn(
        `[FirstCaseTutorial] Portrait texture not found: ${PORTRAIT_KEY}. ` +
        `Add this.load.image('${PORTRAIT_KEY}', 'assets/portraits/hq.png') in preload().`,
      );
      this.portrait = this.scene.add.rectangle(
        portraitX,
        portraitY,
        PORTRAIT_SIZE,
        PORTRAIT_SIZE,
        COLORS.muted,
        0.3,
      ).setStrokeStyle(1, COLORS.accent, 0.5);
    }

    this.nameplate = this.scene.add.text(
      portraitX,
      portraitY + PORTRAIT_SIZE / 2 + 10,
      'HQ',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#f2d477',
      },
    ).setOrigin(0.5, 0);

    this.stepNumberText = this.scene.add.text(
      textLeft,
      panelTop + 10,
      '',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#f2d477',
      },
    );

    this.titleText = this.scene.add.text(
      textLeft,
      panelTop + 26,
      '',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '10px',
        color: '#fff4d0',
      },
    );

    this.objectiveText = this.scene.add.text(
      textLeft,
      panelTop + 48,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '22px',
        color: '#fff4d0',
        wordWrap: { width: textWrapWidth },
      },
    );

    this.hintText = this.scene.add.text(
      textLeft,
      panelTop + 80,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '15px',
        color: '#d7c58f',
        wordWrap: { width: textWrapWidth },
      },
    );

    this.skipText = this.scene.add.text(
      panelLeft + panelWidth - 16,
      panelTop + 10,
      'SKIP TUTORIAL \u25B8',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '8px',
        color: '#d7c58f',
      },
    )
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    this.skipText.on('pointerover', () => {
      this.skipText?.setColor('#f2d477');
    });

    this.skipText.on('pointerout', () => {
      this.skipText?.setColor('#d7c58f');
    });

    this.skipText.on('pointerdown', () => {
      this.skip();
    });

    this.feedbackText = this.scene.add.text(
      width / 2,
      panelTop - 26,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '18px',
        color: '#d76d52',
        align: 'center',
        wordWrap: { width: Math.min(width - 96, 760) },
      },
    )
      .setOrigin(0.5)
      .setVisible(false);

    this.overlay.add([
      this.panel,
      this.portraitFrame,
      this.portrait,
      this.nameplate,
      this.stepNumberText,
      this.titleText,
      this.objectiveText,
      this.hintText,
      this.skipText,
      this.feedbackText,
    ]);
  }

  updateOverlay(step) {
    if (!this.overlay || !step) {
      return;
    }

    this.stepNumberText.setText(`OBJECTIVE ${step.number}`);
    this.titleText.setText(step.title);
    this.objectiveText.setText(step.objective);
    this.hintText.setText(step.hint);
  }

  highlightHotspot(hotspotId) {
    this.clearHighlight();

    if (!hotspotId) {
      return;
    }

    const zone = this.hotspots.get(hotspotId);

    if (!zone || !zone.scene || !zone.hotspotData) {
      console.warn(
        `[FirstCaseTutorial] Missing hotspot for tutorial step: ${hotspotId}`,
      );
      return;
    }

    const data = zone.hotspotData;

    this.highlight = this.scene.add.rectangle(
      data.x + data.width / 2,
      data.y + data.height / 2,
      data.width + 14,
      data.height + 14,
    )
      .setStrokeStyle(4, COLORS.accent, 1)
      .setFillStyle(COLORS.accent, 0.08)
      .setDepth(190);

    this.highlightTween = this.scene.tweens.add({
      targets: this.highlight,
      alpha: {
        from: 0.28,
        to: 1,
      },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  clearHighlight() {
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = null;
    }

    if (this.highlight?.scene) {
      this.highlight.destroy();
    }

    this.highlight = null;
  }

  finish() {
    this.active = false;

    this.gameState.onboarding.firstCase.active = false;
    this.gameState.onboarding.firstCase.completed = true;
    this.gameState.onboarding.firstCase.step = 'finished';

    this.clearHighlight();

    if (!this.overlay) {
      return;
    }

    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.destroyOverlay();
      },
    });
  }

  destroyOverlay() {
    if (this.feedbackTween) {
      this.feedbackTween.stop();
      this.feedbackTween = null;
    }

    if (this.skipText) {
      this.skipText.removeInteractive();
    }

    if (this.overlay?.scene) {
      this.overlay.destroy(true);
    }

    this.overlay = null;
    this.panel = null;
    this.portrait = null;
    this.portraitFrame = null;
    this.nameplate = null;
    this.stepNumberText = null;
    this.titleText = null;
    this.objectiveText = null;
    this.hintText = null;
    this.skipText = null;
    this.feedbackText = null;
  }

  handleResize() {
    if (!this.overlay) {
      return;
    }

    this.destroyOverlay();
    this.createOverlay();

    if (this.currentStep && STEP_CONTENT[this.currentStep]) {
      this.updateOverlay(STEP_CONTENT[this.currentStep]);
      this.highlightHotspot(STEP_CONTENT[this.currentStep].targetHotspot);
    }
  }

  destroy() {
    this.active = false;

    EventBus.off('firstCaseTravelStarted', this.onTravelStartedBound);
    this.scene.scale.off('resize', this.onResizeBound);

    this.clearHighlight();
    this.destroyOverlay();

    this.hotspots.clear();
  }
}