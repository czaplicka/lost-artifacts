import { EventBus } from './EventBus.js';
import { requestAutosave } from './gameStatePersistence.js';

const STEP_ORDER = [
  'visit_storage',
  'walk_to_case_file',
  'open_case_file',
  'find_route',
  'travel_to_city'
];

const FALLBACK_STEP_CONTENT = {
  visit_storage: {
    title: 'FIRST DAY, FIRST STOP',
    objective: 'Visit the Storage Room.',
    hint: 'Click STORAGE on the left. Alex Murphy handles equipment, manuals, and unreasonable requests.',
    targetHotspot: 'storage-room'
  },
  walk_to_case_file: {
    title: 'FIRST DAY, FIRST DRAWER',
    objective: 'Walk over to the case-file cabinet.',
    hint: 'Use the movement controls and approach the cabinet marked by the glowing frame.',
    targetHotspot: 'cabinet-casefile'
  },
  open_case_file: {
    title: 'THE CASE FILE',
    objective: 'Open the case file in the cabinet.',
    hint: 'Click the cabinet when you are close enough. Bureaucracy has never been this dangerous.',
    targetHotspot: 'cabinet-casefile'
  },
  find_route: {
    title: 'FOLLOW THE GLOBE',
    objective: 'Use the globe to choose your destination.',
    hint: 'The globe is the agency travel desk, because apparently airports were too expensive.',
    targetHotspot: 'globe'
  },
  travel_to_city: {
    title: 'FIELD WORK',
    objective: 'Travel to the crime city.',
    hint: 'Choose the destination and begin the investigation before the trail gets cold.',
    targetHotspot: 'globe'
  }
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
    this.highlight = null;
    this.highlightTween = null;
    this.feedbackTween = null;
    this.finishTween = null;
    this.stepDelay = null;

    this.skipButtonEnabled = true;

    this.onResizeBound = () => this.handleResize();
    this.onTravelStartedBound = () => this.onTravelStarted();

    this.ensureState();
  }

  loadStepContent() {
    const json = this.scene.cache.json.get('csi') || {};

    return Object.fromEntries(
      STEP_ORDER.map((id, index) => [
        id,
        {
          ...FALLBACK_STEP_CONTENT[id],
          ...(json[id] || {}),
          number: index + 1
        }
      ])
    );
  }

  ensureState() {
    this.gameState.onboarding ??= {};

    const old = this.gameState.onboarding.firstCase || {};

    this.gameState.onboarding.firstCase = {
      ...old,
      active: old.active ?? false,
      step: old.step ?? null,
      completed: old.completed ?? false,
      skipped: old.skipped ?? false,
      collapsed: old.collapsed ?? false,
      storageVisited: old.storageVisited ?? false,
      walkedToCaseFile: old.walkedToCaseFile ?? false,
      caseFileOpened: old.caseFileOpened ?? false,
      routeOpened: old.routeOpened ?? false,
      travelStarted: old.travelStarted ?? false
    };
  }

  get state() {
    return this.gameState.onboarding.firstCase;
  }

  get collapsed() {
    return Boolean(this.state.collapsed);
  }

  isActive() {
    return this.active;
  }

  getStep() {
    return this.currentStep;
  }

  registerHotspot(id, zone) {
    if (!id || !zone) return;

    this.hotspots.set(id, zone);

    if (
      this.active &&
      this.stepContent[this.currentStep]?.targetHotspot === id
    ) {
      this.highlightHotspot(id);
    }
  }

  unregisterHotspot(id) {
    this.hotspots.delete(id);

    if (this.stepContent[this.currentStep]?.targetHotspot === id) {
      this.clearHighlight();
    }
  }

  registerStorageButton() {
    const button = this.scene.storageButton;

    if (button?.active) {
      this.registerHotspot('storage-room', button);
    }
  }

  start() {
    if (
      this.destroyed ||
      !this.scene.sys.isActive() ||
      this.state.completed ||
      this.state.skipped ||
      this.started
    ) {
      return;
    }

    this.finished = false;
    this.started = true;
    this.active = true;
    this.state.active = true;

    this.registerStorageButton();
    this.createOverlay();

    this.scene.scale.off('resize', this.onResizeBound);
    this.scene.scale.on('resize', this.onResizeBound);

    EventBus.off('firstCaseTravelStarted', this.onTravelStartedBound);
    EventBus.on('firstCaseTravelStarted', this.onTravelStartedBound);

    let step = this.state.step;

    if (!STEP_ORDER.includes(step)) {
      step = this.state.storageVisited
        ? 'walk_to_case_file'
        : 'visit_storage';
    }

    if (step === 'visit_storage' && this.state.storageVisited) {
      step = 'walk_to_case_file';
    }

    this.setStep(step);
  }

  resume() {
    this.start();
  }

  setStep(id) {
    if (!this.active || !STEP_ORDER.includes(id)) return;

    this.clearStepDelay();

    this.currentStep = id;
    this.state.step = id;

    this.updateOverlay(this.stepContent[id]);
    this.highlightHotspot(this.stepContent[id].targetHotspot);

    requestAutosave();
  }

  toggleCollapsed() {
    if (!this.active) return;

    this.state.collapsed = !this.collapsed;

    this.rebuildOverlay();
    requestAutosave();
  }

  rebuildOverlay() {
    if (!this.active) return;

    this.destroyOverlay();
    this.createOverlay();

    const step = this.stepContent[this.currentStep];

    if (step) {
      this.updateOverlay(step);
      this.highlightHotspot(step.targetHotspot);
    }
  }

  canUseHotspot(id) {
    if (!this.active) return true;

    if (this.currentStep === 'visit_storage') {
      if (id === 'cabinet-casefile' || id === 'globe') {
        this.showFeedback(
          'Storage first, detective. Alex has your welcome package. It is mostly paperwork.'
        );

        return false;
      }

      return true;
    }

    const target = this.stepContent[this.currentStep]?.targetHotspot;

    if (id !== target) {
      this.showFeedback(
        'Explore freely, detective. Your next objective is still waiting.'
      );
    }

    return true;
  }

  canUseAction(id) {
    const targets = {
      case_file: 'cabinet-casefile',
      travel: 'globe',
      storage: 'storage-room'
    };

    return !targets[id] || this.canUseHotspot(targets[id]);
  }

  onPlayerPositionChanged(x, y) {
    if (
      !this.active ||
      this.currentStep !== 'walk_to_case_file' ||
      this.stepDelay
    ) {
      return;
    }

    const d = this.hotspots.get('cabinet-casefile')?.hotspotData;

    if (
      !d ||
      x < d.x - 42 ||
      x > d.x + d.width + 42 ||
      y < d.y - 42 ||
      y > d.y + d.height + 42
    ) {
      return;
    }

    this.state.walkedToCaseFile = true;

    this.showFeedback(
      'Excellent. You have located a cabinet. Promotion is surely inevitable.',
      'success'
    );

    this.delayStep(650, () => {
      if (this.active && this.currentStep === 'walk_to_case_file') {
        this.setStep('open_case_file');
      }
    });
  }

  onCaseFileOpened() {
    if (
      !this.active ||
      !['walk_to_case_file', 'open_case_file'].includes(this.currentStep)
    ) {
      return;
    }

    this.state.walkedToCaseFile = true;
    this.state.caseFileOpened = true;

    this.showFeedback(
      'A stolen artefact, four days, and no mention of health insurance.',
      'success'
    );

    this.delayStep(800, () => {
      if (this.active) this.setStep('find_route');
    });
  }

  onDestinationMapOpened() {
    if (
      !this.active ||
      ![
        'walk_to_case_file',
        'open_case_file',
        'find_route'
      ].includes(this.currentStep)
    ) {
      return;
    }

    this.state.walkedToCaseFile = true;
    this.state.caseFileOpened = true;
    this.state.routeOpened = true;

    this.showFeedback(
      'Good. Now let us inconvenience an international airport.',
      'success'
    );

    this.delayStep(500, () => {
      if (this.active) this.setStep('travel_to_city');
    });
  }

  onTravelStarted() {
    if (!this.active || this.currentStep === 'visit_storage') return;

    this.state.travelStarted = true;
    this.finish(false);
  }

  skip() {
    this.finish(true);
  }

  delayStep(delay, callback) {
    this.clearStepDelay();

    this.stepDelay = this.scene.time.delayedCall(delay, () => {
      this.stepDelay = null;

      if (!this.destroyed) callback();
    });
  }

  clearStepDelay() {
    this.stepDelay?.remove(false);
    this.stepDelay = null;
  }

  showFeedback(message, type = 'warning') {
    if (!this.active || !this.feedbackText?.scene) return;

    this.feedbackTween?.stop();

    const feedback = this.feedbackText;

    feedback
      .setText(message)
      .setColor(type === 'success' ? '#8fb180' : '#d76d52')
      .setAlpha(0)
      .setVisible(true);

    this.feedbackTween = this.scene.tweens.add({
      targets: feedback,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 2200,
      onComplete: () => {
        if (feedback.scene) feedback.setVisible(false);
        this.feedbackTween = null;
      }
    });
  }

  createOverlay() {
    if (this.overlay?.scene) return;

    const { width } = this.scene.scale;

    const w = Math.min(860, Math.max(240, width - 32));
    const compact = w < 580;
    const collapsed = this.collapsed;
    const portraitVisible = !collapsed && !compact;

    // Na wąskim ekranie nagłówek i przyciski mają osobne rzędy.
    const stackedHeader = w < 420;
    const headerHeight = stackedHeader ? 66 : 38;

    const h = collapsed
      ? headerHeight + 36
      : compact
        ? headerHeight + 172
        : headerHeight + 136;

    const left = (width - w) / 2;
    const top = 20;

    this.overlay = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    this.panel = this.scene.add
      .rectangle(
        width / 2,
        top + h / 2,
        w,
        h,
        0x17110e,
        0.96
      )
      .setStrokeStyle(3, 0xf2d477, 0.92)
      .setScrollFactor(0);

    this.overlay.add(this.panel);

    const addText = (x, y, text, style = {}) => {
      const object = this.scene.add
        .text(x, y, text, {
          fontFamily: 'SpecialElite',
          color: '#fff4d0',
          ...style
        })
        .setScrollFactor(0);

      this.overlay.add(object);

      return object;
    };

    this.stepNumberText = addText(left + 16, top + 12, '', {
      fontFamily: 'PressStart2P',
      fontSize: '8px',
      color: '#f2d477'
    });

    const textX = portraitVisible ? left + 116 : left + 16;
    const wrap = w - (portraitVisible ? 136 : 32);
    const contentY = top + headerHeight + 5;

    if (portraitVisible) {
      this.portraitFrame = this.scene.add
        .rectangle(
          left + 58,
          contentY + 49,
          92,
          92,
          0x17110e
        )
        .setStrokeStyle(2, 0xf2d477)
        .setScrollFactor(0);

      this.overlay.add(this.portraitFrame);

      if (this.scene.textures.exists('portrait_hq')) {
        this.portrait = this.scene.add
          .image(left + 58, contentY + 49, 'portrait_hq')
          .setDisplaySize(84, 84)
          .setScrollFactor(0);

        this.overlay.add(this.portrait);
      }

      this.nameplate = addText(
        left + 58,
        contentY + 101,
        'HQ',
        {
          fontFamily: 'PressStart2P',
          fontSize: '8px',
          color: '#f2d477'
        }
      ).setOrigin(0.5, 0);
    }

    this.titleText = addText(textX, contentY, '', {
      fontFamily: 'PressStart2P',
      fontSize: collapsed ? '7px' : '9px',
      wordWrap: { width: wrap }
    });

    if (!collapsed) {
      this.objectiveText = addText(textX, contentY + 29, '', {
        fontSize: compact ? '18px' : '20px',
        wordWrap: { width: wrap }
      });

      this.hintText = addText(textX, contentY + 63, '', {
        fontSize: '14px',
        color: '#d7c58f',
        wordWrap: { width: wrap }
      });
    }

    const buttonY = top + (stackedHeader ? 45 : 19);

    const createButton = (x, bw, label, action) => {
      // Najpierw tło, potem napis. Interaktywne jest tylko tło.
      const border = this.scene.add
        .rectangle(x, buttonY, bw, 28, 0x17110e, 1)
        .setStrokeStyle(1, 0xf2d477, 0.85)
        .setScrollFactor(0);

      this.overlay.add(border);

      const text = addText(x, buttonY, label, {
        fontFamily: 'PressStart2P',
        fontSize: '7px',
        color: '#f2d477'
      }).setOrigin(0.5);

      border.setInteractive({ useHandCursor: true });

      border.on('pointerdown', (pointer, localX, localY, event) => {
        event?.stopPropagation?.();

        if (!this.active || this.destroyed) return;

        action();
      });

      border.on('pointerover', () => {
        if (!border.scene || !text.scene) return;

        border.setFillStyle(0x35271a, 1);
        text.setColor('#ffffff');
      });

      border.on('pointerout', () => {
        if (!border.scene || !text.scene) return;

        border.setFillStyle(0x17110e, 1);
        text.setColor('#f2d477');
      });

      return {
        border,
        hit: border,
        text
      };
    };

    const skip = createButton(
      left + w - 84,
      144,
      'SKIP TUTORIAL >',
      () => {
        if (this.skipButtonEnabled) this.skip();
      }
    );

    this.skipButton = skip.hit;
    this.skipText = skip.text;
    this.skipButtonBorder = skip.border;

    const toggle = createButton(
      left + w - 178,
      28,
      collapsed ? '+' : '-',
      () => this.toggleCollapsed()
    );

    this.toggleButton = toggle.hit;
    this.toggleText = toggle.text;
    this.toggleButtonBorder = toggle.border;

    this.feedbackText = addText(
      width / 2,
      top + h + 14,
      '',
      {
        fontSize: '18px',
        align: 'center',
        backgroundColor: '#17110e',
        padding: { x: 8, y: 5 },
        wordWrap: {
          width: Math.max(100, Math.min(width - 64, 760))
        }
      }
    )
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.setSkipButtonEnabled(this.skipButtonEnabled);
  }

  setSkipButtonEnabled(enabled) {
    this.skipButtonEnabled = Boolean(enabled);

    if (!this.skipButton?.scene) return;

    if (this.skipButtonEnabled) {
      this.skipButton.setInteractive({ useHandCursor: true });
    } else {
      this.skipButton.disableInteractive();
    }

    this.skipButtonBorder?.setAlpha(enabled ? 1 : 0.45);
    this.skipText?.setAlpha(enabled ? 1 : 0.45);
  }

  updateOverlay(step) {
    if (!this.overlay?.scene || !step) return;

    this.stepNumberText?.setText(
      `OBJECTIVE ${step.number}/${STEP_ORDER.length}`
    );

    this.titleText?.setText(step.title);
    this.objectiveText?.setText(step.objective);

    if (this.objectiveText && this.titleText) {
      this.objectiveText.setY(
        this.titleText.y + this.titleText.height + 12
      );
    }

    if (this.hintText && this.objectiveText) {
      this.hintText.setScale(1);

      this.hintText.setPosition(
        this.hintText.x,
        this.objectiveText.y + this.objectiveText.height + 8
      );

      this.hintText.setText(step.hint);

      const available =
        this.panel.y +
        this.panel.height / 2 -
        this.hintText.y -
        12;

      this.hintText.setScale(
        Math.min(
          1,
          Math.max(1, available) /
            Math.max(1, this.hintText.height)
        )
      );
    }
  }

  highlightHotspot(id) {
    this.clearHighlight();

    if (!id || !this.active) return;

    const zone = this.hotspots.get(id);

    if (!zone?.scene) return;

    let d = zone.hotspotData;

    if (!d && typeof zone.getBounds === 'function') {
      const bounds = zone.getBounds();

      d = {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    }

    if (!d) return;

    this.highlight = this.scene.add
      .rectangle(
        d.x + d.width / 2,
        d.y + d.height / 2,
        d.width + 14,
        d.height + 14
      )
      .setStrokeStyle(4, 0xf2d477)
      .setFillStyle(0xf2d477, 0.08)
      .setDepth(9999)
      .setScrollFactor(
        zone.scrollFactorX ?? 1,
        zone.scrollFactorY ?? 1
      );

    this.highlightTween = this.scene.tweens.add({
      targets: this.highlight,
      alpha: { from: 0.28, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  clearHighlight() {
    this.highlightTween?.stop();
    this.highlightTween = null;

    this.highlight?.destroy();
    this.highlight = null;
  }

  finish(skipped = false) {
    if (this.destroyed || !this.active || this.finished) return;

    this.finished = true;
    this.active = false;
    this.started = false;
    this.currentStep = null;

    Object.assign(this.state, {
      active: false,
      completed: true,
      skipped: skipped || this.state.skipped,
      step: 'finished'
    });

    this.clearStepDelay();
    this.clearHighlight();

    EventBus.off(
      'firstCaseTravelStarted',
      this.onTravelStartedBound
    );

    this.scene.scale.off('resize', this.onResizeBound);

    requestAutosave();

    EventBus.emit('firstCaseTutorialFinished', {
      skipped: this.state.skipped,
      completed: true,
      tutorialState: { ...this.state }
    });

    if (this.state.skipped) {
      EventBus.emit('firstCaseTutorialSkipped', {
        onboarding: { ...this.state }
      });
    }

    this.destroyOverlay();
  }

  destroyOverlay() {
    this.feedbackTween?.stop();
    this.feedbackTween = null;

    this.overlay?.destroy(true);

    for (const key of [
      'overlay',
      'panel',
      'portrait',
      'portraitFrame',
      'nameplate',
      'stepNumberText',
      'titleText',
      'objectiveText',
      'hintText',
      'skipText',
      'skipButton',
      'skipButtonBorder',
      'toggleText',
      'toggleButton',
      'toggleButtonBorder',
      'feedbackText'
    ]) {
      this[key] = null;
    }
  }

  handleResize() {
    this.registerStorageButton();
    this.rebuildOverlay();
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.active = false;
    this.started = false;
    this.currentStep = null;

    EventBus.off(
      'firstCaseTravelStarted',
      this.onTravelStartedBound
    );

    this.scene.scale.off('resize', this.onResizeBound);

    this.clearStepDelay();
    this.clearHighlight();
    this.destroyOverlay();

    this.hotspots.clear();
  }
}