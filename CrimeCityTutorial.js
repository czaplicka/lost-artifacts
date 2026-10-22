import { EventBus } from './EventBus.js';


const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';


const COLORS = {
  panel: 0x17110e,
  panelBorder: 0xf2d477,
  accent: 0xf2d477,
};


const PORTRAIT_KEY = 'portrait_hq';
const PORTRAIT_SIZE = 84;
const CACHE_KEY = 'crimeCityTutorial';


const PANEL_HEIGHT_EXPANDED = 150;
const PANEL_HEIGHT_COLLAPSED = 46;


export const CRIME_TUTORIAL_STEPS = [
  'crime_scene',
  'crime_lab',
  'phone_lab',
  'hypothesis',
  'suspects',
  'suspect_grid',
  'talk_to_npcs',
  'find_liar',
  'arrest',
  'search_apartment',
  'pursuit',
];


const FALLBACK = {
  crime_scene: {
    number: 1,
    title: 'EVERYTHING IS EVIDENCE',
    objective: 'Search the crime scene and find the hidden objects.',
    hint: 'Every object matters until you know how the crime happened. Free hint: slow, safe. Legal hint: costs money. Illegal hint: fast, but HQ will pretend it never saw it.',
    targetHotspot: 'crime-scene',
    success: 'Lots of objects, zero context. Perfect. That is what the lab is for.',
  },
  crime_lab: {
    number: 2,
    title: 'SCIENCE DOES THE BORING PART',
    objective: 'Go to the Crime Lab and collect the forensic result.',
    hint: 'For this first case, the lab has already analysed the evidence. Later, you will have to do it yourself.',
    targetHotspot: 'crime-lab',
    success: 'The lab found something useful. Naturally, they will explain it over the phone.',
  },
  phone_lab: {
    number: 3,
    title: 'THE NERDS CALL BACK',
    objective: 'Answer the Crime Lab call and hear the reconstruction.',
    hint: 'The report explains how the theft was carried out. Listen carefully: the method will matter later.',
    targetHotspot: 'phone',
    success: 'Now you know what kind of thief you are looking for.',
  },
  hypothesis: {
    number: 4,
    title: 'HOW DID THEY DO IT?',
    objective: 'Reconstruct the theft.',
    hint: 'Place the elements in the slots. The system tells you what fits, what almost fits, and what is nonsense. Three tries, then it costs points.',
    targetHotspot: 'hypothesis',
    success: 'Now you know what skills the thief needed.',
  },
  suspects: {
    number: 5,
    title: 'TEN PEOPLE, ONE THIEF',
    objective: 'Open the Evidence Grid to compare the suspects with the evidence.',
    hint: 'Use the forensic clues and the reconstruction to narrow down your suspects. You decide who does not fit.',
    targetHotspot: 'suspect-grid',
    success: 'The files are open. Time to see whose story survives the evidence.',
  },
  suspect_grid: {
    number: 6,
    title: 'THE GRID',
    objective: 'Use the remaining clues to narrow your shortlist to two people.',
    hint: 'The reconstruction tells you which skills the thief needed. Combine it with the other forensic clues.',
    targetHotspot: 'suspect-grid',
    success: 'Two people remain: the thief and their forensic twin.',
  },
  talk_to_npcs: {
    number: 7,
    title: 'SMALL TALK, BIG ALIBIS',
    objective: 'Talk to people in the city and learn the alibis.',
    hint: 'Everybody has an alibi. Some of them are even true.',
    targetHotspot: 'city-npc',
    success: 'Alibis collected. Trust issues unlocked.',
  },
  find_liar: {
    number: 8,
    title: 'SOMEBODY IS LYING',
    objective: 'Check the alibis. Find who lies and who steals.',
    hint: 'A witness who covers for a thief is still a liar. Compare every story with the timeline.',
    targetHotspot: 'alibi-board',
    success: 'The liar is exposed. The thief is next.',
  },
  arrest: {
    number: 9,
    title: 'NOW COMES THE FUN PART',
    objective: 'Issue the warrant and arrest the thief.',
    hint: 'Wrong person means a lawsuit. Right person means a chase.',
    targetHotspot: 'arrest',
    success: 'Arrest attempted. The thief, however, had other plans.',
  },
  search_apartment: {
    number: 10,
    title: 'HOME SWEET CRIME SCENE',
    objective: "Search the thief's apartment.",
    hint: 'You may find motive clues, the artefact, and for sure a hint where the thief ran.',
    targetHotspot: 'apartment',
    success: 'A trail. Finally, something that is not a coffee stain.',
  },
  pursuit: {
    number: 11,
    title: 'THE CHASE IS ON',
    objective: 'Follow the trail and travel to the next city.',
    hint: 'The thief has a head start. Your budget has a bigger one.',
    targetHotspot: 'travel',
    success: 'Tutorial complete. From now on, you are on your own.',
  },
};


export class CrimeCityTutorial {
  constructor(scene, state) {
    this.scene = scene;
    this.gameState = state;


    this.active = false;
    this.destroyed = false;
    this.currentStep = null;


    this.hotspots = new Map();
    this.stepContent = this.loadStepContent();


    this.overlay = null;
    this.stepNumberText = null;
    this.titleText = null;
    this.objectiveText = null;
    this.hintText = null;
    this.feedbackText = null;
    this.feedbackTween = null;
    this.highlight = null;
    this.highlightTween = null;
    this.stepDelay = null;


    this.onStepEventBound = this.onStepEvent.bind(this);
    this.onResizeBound = this.handleResize.bind(this);


    this.ensureState();
  }


  loadStepContent() {
    const json = this.scene?.cache?.json?.get(CACHE_KEY);


    if (!json || Object.keys(json).length === 0) {
      console.warn(
        `[CrimeCityTutorial] "${CACHE_KEY}" missing in cache - using fallback text.`,
      );
      return FALLBACK;
    }


    const merged = {};
    CRIME_TUTORIAL_STEPS.forEach((id) => {
      merged[id] = json[id] ?? FALLBACK[id];
    });
    return merged;
  }


  ensureState() {
    if (!this.gameState.onboarding) {
      this.gameState.onboarding = {};
    }


    const existing = this.gameState.onboarding.crimeCity ?? {};


    this.gameState.onboarding.crimeCity = {
      active: existing.active ?? false,
      step: existing.step ?? null,
      completed: existing.completed ?? false,
      skipped: existing.skipped ?? false,
      collapsed: existing.collapsed ?? false,
      doneSteps: Array.isArray(existing.doneSteps) ? existing.doneSteps : [],
    };
  }


  get tutorialState() {
    return this.gameState.onboarding.crimeCity;
  }


  get collapsed() {
    return Boolean(this.tutorialState.collapsed);
  }


  toggleCollapsed() {
    if (!this.active) {
      return;
    }


    this.tutorialState.collapsed = !this.tutorialState.collapsed;
    this.rebuildOverlay();
  }


  rebuildOverlay() {
    if (!this.active) {
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


  registerHotspot(id, zone) {
    if (!id || !zone) {
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


  isSceneUsable() {
    const sys = this.scene?.sys;


    if (!sys) {
      return false;
    }


    const status = sys.settings?.status;


    return (
      status !== Phaser.Scenes.SHUTDOWN &&
      status !== Phaser.Scenes.DESTROYED
    );
  }


  start() {
    if (this.destroyed || !this.isSceneUsable()) {
      console.warn('[CrimeCityTutorial] Not started: scene unusable or tutorial destroyed.');
      return;
    }


    if (this.tutorialState.completed || this.active) {
      return;
    }


    this.active = true;
    this.tutorialState.active = true;


    this.createOverlay();


    this.scene.scale.off('resize', this.onResizeBound);
    this.scene.scale.on('resize', this.onResizeBound);


    EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
    EventBus.on('crimeCityTutorialStep', this.onStepEventBound);


    const saved = this.tutorialState.step;


    if (saved && CRIME_TUTORIAL_STEPS.includes(saved)) {
      this.setStep(saved);
      return;
    }


    this.setStep(CRIME_TUTORIAL_STEPS[0]);
  }


  resume() {
    this.start();
  }


  isActive() {
    return this.active;
  }


  getStep() {
    return this.currentStep;
  }


  onStepEvent(payload) {
    const stepId = payload?.step ?? payload;
    this.complete(stepId, payload?.message);
  }


  complete(stepId, message) {
    if (!this.active || stepId !== this.currentStep) {
      return;
    }


    if (!this.tutorialState.doneSteps.includes(stepId)) {
      this.tutorialState.doneSteps.push(stepId);
    }


    const index = CRIME_TUTORIAL_STEPS.indexOf(stepId);
    const next = CRIME_TUTORIAL_STEPS[index + 1];


    this.showFeedback(
      message ?? this.stepContent[stepId]?.success ?? 'Good work, detective.',
      'success',
    );


    if (!next) {
      this.delayStep(1200, () => this.finish(false));
      return;
    }


    this.delayStep(900, () => {
      if (this.active) {
        this.setStep(next);
      }
    });
  }


  setStep(stepId) {
    if (!this.active || !CRIME_TUTORIAL_STEPS.includes(stepId)) {
      return;
    }


    const step = this.stepContent[stepId];


    if (!step) {
      return;
    }


    this.currentStep = stepId;
    this.tutorialState.step = stepId;


    this.clearStepDelay();
    this.updateOverlay(step);
    this.highlightHotspot(step.targetHotspot);
  }


  skip() {
    if (this.destroyed || !this.active) {
      return;
    }


    this.finish(true);
  }


  finish(skipped = false) {
    if (this.destroyed || !this.active) {
      return;
    }


    this.active = false;
    this.currentStep = null;


    this.tutorialState.active = false;
    this.tutorialState.completed = true;
    this.tutorialState.skipped = skipped;
    this.tutorialState.step = 'finished';


    this.clearStepDelay();
    this.clearHighlight();


    EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
    this.scene.scale.off('resize', this.onResizeBound);


    EventBus.emit('crimeCityTutorialFinished', {
      skipped,
      tutorialState: { ...this.tutorialState },
    });


    if (!this.overlay?.scene) {
      this.destroyOverlay();
      return;
    }


    this.scene.tweens.add({
      targets: this.overlay,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => this.destroyOverlay(),
    });
  }


  delayStep(delay, callback) {
    this.clearStepDelay();


    this.stepDelay = this.scene.time.delayedCall(delay, () => {
      this.stepDelay = null;


      if (!this.destroyed) {
        callback();
      }
    });
  }


  clearStepDelay() {
    if (this.stepDelay) {
      this.stepDelay.remove(false);
      this.stepDelay = null;
    }
  }


  showFeedback(message, type = 'warning') {
    if (!this.active || !this.feedbackText?.scene) {
      return;
    }


    if (this.feedbackTween) {
      this.feedbackTween.stop();
      this.feedbackTween = null;
    }


    this.feedbackText.setText(message);
    this.feedbackText.setColor(type === 'success' ? '#8fb180' : '#d76d52');
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


    const collapsed = this.collapsed;
    const { width } = this.scene.scale;


    const panelWidth = Math.min(Math.max(width - 48, 320), 860);
    const panelHeight = collapsed ? PANEL_HEIGHT_COLLAPSED : PANEL_HEIGHT_EXPANDED;
    const panelLeft = width / 2 - panelWidth / 2;
    const panelTop = 20;
    const panelCenterY = panelTop + panelHeight / 2;
    const textLeft = collapsed
      ? panelLeft + 16
      : panelLeft + PORTRAIT_SIZE + 32;
    const textWrapWidth = Math.max(panelWidth - PORTRAIT_SIZE - 72, 80);


    this.overlay = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(10000);


    const panel = this.scene.add.rectangle(
      width / 2, panelCenterY, panelWidth, panelHeight, COLORS.panel, 0.95,
    )
      .setScrollFactor(0)
      .setStrokeStyle(3, COLORS.panelBorder, 0.92);


    const items = [panel];


    if (!collapsed) {
      const portraitX = panelLeft + 16 + PORTRAIT_SIZE / 2;
      const portraitY = panelCenterY + 4;


      const portraitFrame = this.scene.add.rectangle(
        portraitX, portraitY, PORTRAIT_SIZE + 8, PORTRAIT_SIZE + 8, COLORS.panel, 0.98,
      )
        .setScrollFactor(0)
        .setStrokeStyle(2, COLORS.panelBorder, 0.85);


      let portrait;


      if (this.scene.textures.exists(PORTRAIT_KEY)) {
        portrait = this.scene.add.image(portraitX, portraitY, PORTRAIT_KEY)
          .setScrollFactor(0)
          .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      } else {
        portrait = this.scene.add.rectangle(
          portraitX, portraitY, PORTRAIT_SIZE, PORTRAIT_SIZE, 0xd7c58f, 0.3,
        ).setScrollFactor(0);
      }


      const nameplate = this.scene.add.text(
        portraitX, portraitY + PORTRAIT_SIZE / 2 + 7, 'HQ',
        { fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f2d477' },
      )
        .setScrollFactor(0)
        .setOrigin(0.5, 0);


      items.push(portraitFrame, portrait, nameplate);
    }


    this.stepNumberText = this.scene.add.text(
      textLeft, panelTop + (collapsed ? 9 : 12), '',
      { fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f2d477' },
    ).setScrollFactor(0);


    this.titleText = this.scene.add.text(
      textLeft, panelTop + (collapsed ? 26 : 28), '',
      { fontFamily: FONT_PIXEL, fontSize: '9px', color: '#fff4d0' },
    ).setScrollFactor(0);


    items.push(this.stepNumberText, this.titleText);


    if (!collapsed) {
      this.objectiveText = this.scene.add.text(
        textLeft, panelTop + 50, '',
        {
          fontFamily: FONT_TYPE,
          fontSize: '20px',
          color: '#fff4d0',
          wordWrap: { width: textWrapWidth },
        },
      ).setScrollFactor(0);


      this.hintText = this.scene.add.text(
        textLeft, panelTop + 84, '',
        {
          fontFamily: FONT_TYPE,
          fontSize: '14px',
          color: '#d7c58f',
          wordWrap: { width: textWrapWidth },
        },
      ).setScrollFactor(0);


      items.push(this.objectiveText, this.hintText);
    }


    const skipW = 136;
    const skipH = 26;
    const skipX = panelLeft + panelWidth - skipW / 2 - 10;
    const skipY = panelTop + 8 + skipH / 2;


    const skipBorder = this.scene.add.rectangle(
      skipX, skipY, skipW, skipH, COLORS.panel, 0.35,
    )
      .setScrollFactor(0)
      .setStrokeStyle(1, COLORS.accent, 0.72);


    const skipButton = this.scene.add.rectangle(
      skipX, skipY, skipW, skipH, 0x000000, 0.001,
    )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });


    const skipText = this.scene.add.text(
      skipX, skipY, 'SKIP TUTORIAL ▸',
      { fontFamily: FONT_PIXEL, fontSize: '7px', color: '#d7c58f' },
    )
      .setScrollFactor(0)
      .setOrigin(0.5);


    skipButton.on('pointerover', () => skipText.setColor('#f2d477'));
    skipButton.on('pointerout', () => skipText.setColor('#d7c58f'));
    skipButton.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      this.skip();
    });


    const toggleSize = 26;
    const toggleX = skipX - skipW / 2 - 8 - toggleSize / 2;
    const toggleY = skipY;


    const toggleBorder = this.scene.add.rectangle(
      toggleX, toggleY, toggleSize, toggleSize, COLORS.panel, 0.35,
    )
      .setScrollFactor(0)
      .setStrokeStyle(1, COLORS.accent, 0.72);


    const toggleButton = this.scene.add.rectangle(
      toggleX, toggleY, toggleSize, toggleSize, 0x000000, 0.001,
    )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });


    const toggleText = this.scene.add.text(
      toggleX, toggleY, collapsed ? '+' : '–',
      { fontFamily: FONT_PIXEL, fontSize: '12px', color: '#d7c58f' },
    )
      .setScrollFactor(0)
      .setOrigin(0.5);


    toggleButton.on('pointerover', () => toggleText.setColor('#f2d477'));
    toggleButton.on('pointerout', () => toggleText.setColor('#d7c58f'));
    toggleButton.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      this.toggleCollapsed();
    });


    this.feedbackText = this.scene.add.text(
      width / 2, panelTop + panelHeight + 28, '',
      {
        fontFamily: FONT_TYPE,
        fontSize: '18px',
        color: '#d76d52',
        align: 'center',
        wordWrap: { width: Math.min(width - 96, 760) },
      },
    )
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setVisible(false);


    items.push(
      skipBorder,
      skipButton,
      skipText,
      toggleBorder,
      toggleButton,
      toggleText,
      this.feedbackText,
    );


    this.overlay.add(items);
  }


  updateOverlay(step) {
    if (!this.overlay?.scene || !step) {
      return;
    }


    this.stepNumberText?.setText(
      `CRIME CITY ${step.number}/${CRIME_TUTORIAL_STEPS.length}`,
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
      .setScrollFactor(zone.scrollFactorX ?? 1, zone.scrollFactorY ?? 1);


    this.highlightTween = this.scene.tweens.add({
      targets: this.highlight,
      alpha: { from: 0.28, to: 1 },
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


  destroyOverlay() {
    if (this.feedbackTween) {
      this.feedbackTween.stop();
      this.feedbackTween = null;
    }


    if (this.overlay?.scene) {
      this.overlay.destroy(true);
    }


    this.overlay = null;
    this.stepNumberText = null;
    this.titleText = null;
    this.objectiveText = null;
    this.hintText = null;
    this.feedbackText = null;
  }


  handleResize() {
    this.rebuildOverlay();
  }


  destroy() {
    if (this.destroyed) {
      return;
    }


    this.destroyed = true;
    this.active = false;
    this.currentStep = null;


    EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
    this.scene.scale.off('resize', this.onResizeBound);


    this.clearStepDelay();
    this.clearHighlight();
    this.destroyOverlay();
    this.hotspots.clear();
  }
}


export function advanceCrimeTutorial(state, stepId) {
  const tutorial = state?.onboarding?.crimeCity;


  if (!tutorial || tutorial.completed || tutorial.step !== stepId) {
    return false;
  }


  if (!Array.isArray(tutorial.doneSteps)) {
    tutorial.doneSteps = [];
  }


  if (!tutorial.doneSteps.includes(stepId)) {
    tutorial.doneSteps.push(stepId);
  }


  const next = CRIME_TUTORIAL_STEPS[CRIME_TUTORIAL_STEPS.indexOf(stepId) + 1];


  if (next) {
    tutorial.step = next;
    return true;
  }


  tutorial.step = 'finished';
  tutorial.completed = true;
  tutorial.active = false;
  tutorial.skipped = false;


  EventBus.emit('crimeCityTutorialFinished', {
    skipped: false,
    tutorialState: { ...tutorial },
  });


  return true;
}