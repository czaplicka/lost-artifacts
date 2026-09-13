import { EventBus } from './EventBus.js';

const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';

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
const PORTRAIT_SIZE = 84;

const STEP_ORDER = [
  'walk_to_case_file',
  'open_case_file',
  'find_route',
  'travel_to_city',
];

const TUTORIAL_CACHE_KEY = 'csi';

const FALLBACK_STEP_CONTENT = {
  walk_to_case_file: {
    number: 1,
    title: 'FIRST DAY, FIRST DRAWER',
    objective: 'Walk over to the case-file cabinet.',
    hint: 'Use the movement controls and approach the cabinet marked by the glowing frame.',
    targetHotspot: 'cabinet-casefile',
  },

  open_case_file: {
    number: 2,
    title: 'THE CASE FILE',
    objective: 'Open the case file in the cabinet.',
    hint: 'Click the cabinet when you are close enough. Bureaucracy has never been this dangerous.',
    targetHotspot: 'cabinet-casefile',
  },

  find_route: {
    number: 3,
    title: 'FOLLOW THE GLOBE',
    objective: 'Use the globe to choose your destination.',
    hint: 'The globe is the agency travel desk, because apparently airports were too expensive.',
    targetHotspot: 'globe',
  },

  travel_to_city: {
    number: 4,
    title: 'FIELD WORK',
    objective: 'Travel to the crime city.',
    hint: 'Choose the destination and begin the investigation before the trail gets cold.',
    targetHotspot: 'globe',
  },
};

export class FirstCaseTutorial {
  constructor(scene, state) {
    this.scene = scene;
    this.gameState = state;

    this.active = false;
    this.currentStep = null;
    this.started = false;
    this.destroyed = false;
    this.finished = false;

    this.hotspots = new Map();
    this.stepContent = this.loadStepContent();

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
    this.skipButton = null;
    this.skipButtonBorder = null;
this.skipButtonEnabled = true;

    this.highlight = null;
    this.highlightTween = null;

    this.feedbackText = null;
    this.feedbackTween = null;
    this.stepDelay = null;

    this.onResizeBound = this.handleResize.bind(this);
    this.onTravelStartedBound = this.onTravelStarted.bind(this);

    this.ensureState();
  }

  loadStepContent() {
    const json = this.scene?.cache?.json?.get(
      TUTORIAL_CACHE_KEY,
    );

    if (!json || Object.keys(json).length === 0) {
      console.warn(
        `[FirstCaseTutorial] "${TUTORIAL_CACHE_KEY}.json" missing or empty in cache - ` +
        'falling back to built-in tutorial text. Did you forget to load ' +
        `assets/data/${TUTORIAL_CACHE_KEY}.json in the preloader?`,
      );

      return FALLBACK_STEP_CONTENT;
    }

    const merged = {};

    STEP_ORDER.forEach((stepId) => {
      if (json[stepId]) {
        merged[stepId] = json[stepId];
      } else {
        console.warn(
          `[FirstCaseTutorial] Step "${stepId}" missing from "${TUTORIAL_CACHE_KEY}.json" - ` +
          'using built-in fallback text for this step.',
        );

        merged[stepId] = FALLBACK_STEP_CONTENT[stepId];
      }
    });

    return merged;
  }

  ensureState() {
    if (!this.gameState.onboarding) {
      this.gameState.onboarding = {};
    }

    const existing =
      this.gameState.onboarding.firstCase ?? {};

    this.gameState.onboarding.firstCase = {
      active: existing.active ?? false,
      step: existing.step ?? null,
      completed: existing.completed ?? false,
      skipped: existing.skipped ?? false,
      walkedToCaseFile:
        existing.walkedToCaseFile ?? false,
      caseFileOpened:
        existing.caseFileOpened ?? false,
      routeOpened: existing.routeOpened ?? false,
      travelStarted: existing.travelStarted ?? false,
    };
  }

  registerHotspot(id, zone) {
    if (!id || !zone) {
      console.warn(
        '[FirstCaseTutorial] registerHotspot received invalid data.',
        { id, zone },
      );

      return;
    }

    this.hotspots.set(id, zone);

    if (
      this.active &&
      this.currentStep &&
      this.stepContent[this.currentStep]?.targetHotspot === id
    ) {
      this.highlightHotspot(id);
    }
  }

  unregisterHotspot(id) {
    this.hotspots.delete(id);
  }

  start() {
    if (this.destroyed || !this.scene?.sys?.isActive()) {
      return;
    }

    const tutorialState =
      this.gameState.onboarding.firstCase;

    if (tutorialState.completed || this.started) {
      return;
    }

    this.finished = false;
    this.started = true;
    this.active = true;
    tutorialState.active = true;

    this.createOverlay();

    this.scene.scale.off(
      'resize',
      this.onResizeBound,
    );

    this.scene.scale.on(
      'resize',
      this.onResizeBound,
    );

    EventBus.off(
      'firstCaseTravelStarted',
      this.onTravelStartedBound,
    );

    EventBus.on(
      'firstCaseTravelStarted',
      this.onTravelStartedBound,
    );

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
setSkipButtonEnabled(enabled) {
  const shouldEnable = Boolean(enabled);

  if (
    this.skipButtonEnabled === shouldEnable ||
    !this.skipButton?.scene
  ) {
    return;
  }

  this.skipButtonEnabled = shouldEnable;

  if (shouldEnable) {
    this.skipButton.setInteractive({
      useHandCursor: true,
    });

    this.skipButtonBorder?.setAlpha(1);
    this.skipText?.setAlpha(1);

    return;
  }

  this.skipButton.disableInteractive();

  this.skipButtonBorder?.setAlpha(0.45);
  this.skipText?.setAlpha(0.45);
}
  setStep(stepId) {
    if (!this.active || !STEP_ORDER.includes(stepId)) {
      return;
    }

    const step = this.stepContent[stepId];

    if (!step) {
      console.warn(
        `[FirstCaseTutorial] Unknown tutorial step: ${stepId}`,
      );

      return;
    }

    this.currentStep = stepId;
    this.gameState.onboarding.firstCase.step = stepId;

    this.clearStepDelay();
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

    return !hotspotId || this.canUseHotspot(hotspotId);
  }

  onPlayerPositionChanged(playerX, playerY) {
    if (
      !this.active ||
      this.currentStep !== 'walk_to_case_file'
    ) {
      return;
    }

    const cabinetZone = this.hotspots.get(
      'cabinet-casefile',
    );

    if (!cabinetZone?.hotspotData) {
      return;
    }

    const data = cabinetZone.hotspotData;
    const reachPadding = 42;

    const isNearCabinet =
      playerX >= data.x - reachPadding &&
      playerX <= data.x + data.width + reachPadding &&
      playerY >= data.y - reachPadding &&
      playerY <= data.y + data.height + reachPadding;

    if (!isNearCabinet) {
      return;
    }

    this.gameState.onboarding.firstCase.walkedToCaseFile = true;

    this.showFeedback(
      'Excellent. You have located a cabinet. Promotion is surely inevitable.',
      'success',
    );

    this.delayStep(650, () => {
      if (
        this.active &&
        this.currentStep === 'walk_to_case_file'
      ) {
        this.setStep('open_case_file');
      }
    });
  }

  onCaseFileOpened() {
    if (!this.active) {
      return;
    }

    if (
      this.currentStep !== 'walk_to_case_file' &&
      this.currentStep !== 'open_case_file'
    ) {
      return;
    }

    this.gameState.onboarding.firstCase.walkedToCaseFile = true;
    this.gameState.onboarding.firstCase.caseFileOpened = true;

    this.showFeedback(
      'A stolen artefact, four days, and no mention of health insurance.',
      'success',
    );

    this.delayStep(800, () => {
      if (this.active) {
        this.setStep('find_route');
      }
    });
  }

  onDestinationMapOpened() {
    if (!this.active) {
      return;
    }

    const validSteps = [
      'walk_to_case_file',
      'open_case_file',
      'find_route',
    ];

    if (!validSteps.includes(this.currentStep)) {
      return;
    }

    this.gameState.onboarding.firstCase.walkedToCaseFile = true;
    this.gameState.onboarding.firstCase.caseFileOpened = true;
    this.gameState.onboarding.firstCase.routeOpened = true;

    this.showFeedback(
      'Good. Now let us inconvenience an international airport.',
      'success',
    );

    this.delayStep(500, () => {
      if (this.active) {
        this.setStep('travel_to_city');
      }
    });
  }

  onTravelStarted() {
    if (!this.active) {
      return;
    }

    this.gameState.onboarding.firstCase.travelStarted = true;
    this.finish(false);
  }

  skip() {
    if (
      this.destroyed ||
      !this.active ||
      this.finished
    ) {
      return;
    }

    console.log(
      '[FirstCaseTutorial] Skip Tutorial clicked.',
    );

    this.finish(true);
  }

  delayStep(delay, callback) {
    this.clearStepDelay();

    this.stepDelay = this.scene.time.delayedCall(
      delay,
      () => {
        this.stepDelay = null;

        if (!this.destroyed) {
          callback();
        }
      },
    );
  }

  clearStepDelay() {
    if (this.stepDelay) {
      this.stepDelay.remove(false);
      this.stepDelay = null;
    }
  }

  showFeedback(message, type = 'warning') {
    if (
      !this.active ||
      !this.feedbackText ||
      !this.feedbackText.scene
    ) {
      return;
    }

    const color =
      type === 'success'
        ? '#8fb180'
        : '#d76d52';

    if (this.feedbackTween) {
      this.feedbackTween.stop();
      this.feedbackTween = null;
    }

    this.feedbackText.setText(message);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(0);
    this.feedbackText.setVisible(true);

    this.feedbackTween = this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 2200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (this.feedbackText?.scene) {
          this.feedbackText.setVisible(false);
        }

        this.feedbackTween = null;
      },
    });
  }

  createOverlay() {
    if (this.overlay?.scene) {
      return;
    }

    const { width, height } = this.scene.scale;

    const panelWidth = Math.min(
      Math.max(width - 48, 320),
      860,
    );

    const panelHeight = 150;
    const panelLeft = width / 2 - panelWidth / 2;

    /*
     * Panel u góry ekranu.
     *
     * Dolne strzałki OfficeNavigation pozostają w pełni odkryte,
     * niezależnie od ich depth i hit area.
     */
    const panelCenterY = 92;
    const panelTop = panelCenterY - panelHeight / 2;

    const textLeft = panelLeft + PORTRAIT_SIZE + 32;

    const textWrapWidth = Math.max(
      panelWidth - PORTRAIT_SIZE - 72,
      80,
    );

    this.overlay = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(10000)
      .setAlpha(1)
      .setVisible(true);

    this.panel = this.scene.add.rectangle(
      width / 2,
      panelCenterY,
      panelWidth,
      panelHeight,
      COLORS.panel,
      0.95,
    )
      .setScrollFactor(0)
      .setStrokeStyle(3, COLORS.panelBorder, 0.92);

    const portraitX =
      panelLeft +
      16 +
      PORTRAIT_SIZE / 2;

    const portraitY = panelCenterY + 4;

    this.portraitFrame = this.scene.add.rectangle(
      portraitX,
      portraitY,
      PORTRAIT_SIZE + 8,
      PORTRAIT_SIZE + 8,
      COLORS.panel,
      0.98,
    )
      .setScrollFactor(0)
      .setStrokeStyle(2, COLORS.panelBorder, 0.85);

    if (this.scene.textures.exists(PORTRAIT_KEY)) {
      this.portrait = this.scene.add.image(
        portraitX,
        portraitY,
        PORTRAIT_KEY,
      )
        .setScrollFactor(0)
        .setDisplaySize(
          PORTRAIT_SIZE,
          PORTRAIT_SIZE,
        );
    } else {
      console.warn(
        `[FirstCaseTutorial] Portrait texture not found: ${PORTRAIT_KEY}`,
      );

      this.portrait = this.scene.add.rectangle(
        portraitX,
        portraitY,
        PORTRAIT_SIZE,
        PORTRAIT_SIZE,
        COLORS.muted,
        0.3,
      )
        .setScrollFactor(0)
        .setStrokeStyle(
          1,
          COLORS.accent,
          0.5,
        );
    }

    this.nameplate = this.scene.add.text(
      portraitX,
      portraitY + PORTRAIT_SIZE / 2 + 7,
      'HQ',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '8px',
        color: '#f2d477',
      },
    )
      .setScrollFactor(0)
      .setOrigin(0.5, 0);

    this.stepNumberText = this.scene.add.text(
      textLeft,
      panelTop + 12,
      '',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '8px',
        color: '#f2d477',
      },
    ).setScrollFactor(0);

    this.titleText = this.scene.add.text(
      textLeft,
      panelTop + 28,
      '',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '9px',
        color: '#fff4d0',
      },
    ).setScrollFactor(0);

    this.objectiveText = this.scene.add.text(
      textLeft,
      panelTop + 50,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '20px',
        color: '#fff4d0',
        wordWrap: {
          width: textWrapWidth,
        },
      },
    ).setScrollFactor(0);

    this.hintText = this.scene.add.text(
      textLeft,
      panelTop + 84,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '14px',
        color: '#d7c58f',
        wordWrap: {
          width: textWrapWidth,
        },
      },
    ).setScrollFactor(0);

    const skipButtonWidth = 136;
    const skipButtonHeight = 26;

    const skipButtonCenterX =
      panelLeft +
      panelWidth -
      skipButtonWidth / 2 -
      10;

    const skipButtonCenterY = panelTop + 14;

    this.skipButtonBorder = this.scene.add.rectangle(
      skipButtonCenterX,
      skipButtonCenterY,
      skipButtonWidth,
      skipButtonHeight,
      COLORS.panel,
      0.35,
    )
      .setScrollFactor(0)
      .setStrokeStyle(1, COLORS.accent, 0.72);

    this.skipButton = this.scene.add.rectangle(
      skipButtonCenterX,
      skipButtonCenterY,
      skipButtonWidth,
      skipButtonHeight,
      0x000000,
      0.001,
    )
      .setScrollFactor(0)
      .setInteractive({
        useHandCursor: true,
      });

    this.skipText = this.scene.add.text(
      skipButtonCenterX,
      skipButtonCenterY,
      'SKIP TUTORIAL ▸',
      {
        fontFamily: FONT_PIXEL,
        fontSize: '7px',
        color: '#d7c58f',
      },
    )
      .setScrollFactor(0)
      .setOrigin(0.5);

    this.skipButton.on('pointerover', () => {
      if (this.skipText?.scene) {
        this.skipText.setColor('#f2d477');
      }
this.skipButtonEnabled = true;
      if (this.skipButtonBorder?.scene) {
        this.skipButtonBorder.setStrokeStyle(
          1,
          COLORS.accent,
          1,
        );
      }
    });

    this.skipButton.on('pointerout', () => {
      if (this.skipText?.scene) {
        this.skipText.setColor('#d7c58f');
      }

      if (this.skipButtonBorder?.scene) {
        this.skipButtonBorder.setStrokeStyle(
          1,
          COLORS.accent,
          0.72,
        );
      }
    });

    this.skipButton.on(
      'pointerdown',
      (pointer, localX, localY, event) => {
        event?.stopPropagation?.();

        console.log(
          '[FirstCaseTutorial] Skip Tutorial clicked.',
        );

        this.skip();
      },
    );

    this.feedbackText = this.scene.add.text(
      width / 2,
      panelCenterY + panelHeight / 2 + 28,
      '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '18px',
        color: '#d76d52',
        align: 'center',
        wordWrap: {
          width: Math.min(width - 96, 760),
        },
      },
    )
      .setScrollFactor(0)
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
      this.skipButtonBorder,
      this.skipButton,
      this.skipText,
      this.feedbackText,
    ]);
  }

  updateOverlay(step) {
    if (!this.overlay?.scene || !step) {
      return;
    }

    this.stepNumberText?.setText(
      `OBJECTIVE ${step.number}`,
    );

    this.titleText?.setText(step.title);
    this.objectiveText?.setText(step.objective);
    this.hintText?.setText(step.hint);
  }

  highlightHotspot(hotspotId) {
    this.clearHighlight();

    if (!hotspotId || !this.active) {
      return;
    }

    const zone = this.hotspots.get(hotspotId);

    if (!zone?.scene || !zone.hotspotData) {
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
      .setDepth(9999)
      .setScrollFactor(
        zone.scrollFactorX ?? 1,
        zone.scrollFactorY ?? 1,
      );

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

  finish(skipped = false) {
    if (
      this.destroyed ||
      !this.active ||
      this.finished
    ) {
      return;
    }

    this.finished = true;
    this.active = false;
    this.started = false;
    this.currentStep = null;

    const tutorialState =
      this.gameState.onboarding.firstCase;

    tutorialState.active = false;
    tutorialState.completed = true;
    tutorialState.skipped =
      skipped ||
      tutorialState.skipped;

    tutorialState.step = 'finished';

    this.clearStepDelay();
    this.clearHighlight();

    EventBus.off(
      'firstCaseTravelStarted',
      this.onTravelStartedBound,
    );

    this.scene.scale.off(
      'resize',
      this.onResizeBound,
    );

    EventBus.emit('firstCaseTutorialFinished', {
      skipped: tutorialState.skipped,
      completed: tutorialState.completed,
      tutorialState: {
        ...tutorialState,
      },
    });

    if (tutorialState.skipped) {
      EventBus.emit('firstCaseTutorialSkipped', {
        onboarding: {
          ...tutorialState,
        },
      });
    }

    if (!this.overlay?.scene) {
      this.destroyOverlay();
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

    if (this.skipButton?.scene) {
      this.skipButton.removeInteractive();
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
    this.skipButton = null;
    this.skipButtonBorder = null;
    this.skipButtonEnabled = true;
    this.feedbackText = null;
  }

  handleResize() {
    if (!this.active || !this.overlay?.scene) {
      return;
    }

    const step = this.stepContent[this.currentStep];

    this.destroyOverlay();
    this.createOverlay();

    if (step) {
      this.updateOverlay(step);
      this.highlightHotspot(step.targetHotspot);
    }
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.active = false;
    this.started = false;
    this.currentStep = null;

    EventBus.off(
      'firstCaseTravelStarted',
      this.onTravelStartedBound,
    );

    this.scene.scale.off(
      'resize',
      this.onResizeBound,
    );

    this.clearStepDelay();
    this.clearHighlight();
    this.destroyOverlay();

    this.hotspots.clear();
  }
}