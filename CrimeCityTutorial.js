import { EventBus } from './EventBus.js';
import { PlayerMenuUI } from './ui/PlayerMenuUI.js';
import { getEvidenceCaseKey } from './managers/ApartmentEvidenceModel.js';
import { requestAutosave } from './gameStatePersistence.js';

const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';

const COLORS = {
  panel: 0x17110e,
  panelBorder: 0xf2d477,
  accent: 0xf2d477,
};

const PORTRAIT_KEY = 'portrait_hq';
const PORTRAIT_SIZE = 84;

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
  'visit_apartment',
  'search_apartment',
  'ticket_lab',
  'pursuit',
];

const STEP_CONTENT = {
  crime_scene: {
    title: 'EVERYTHING IS EVIDENCE',
    objective: 'Search the crime scene and find the hidden objects.',
    hint:
      'Every object matters until you know how the crime happened. ' +
      'Free hint: slow and safe. Legal hint: costs money. ' +
      'Illegal hint: HQ will pretend it never saw it.',
    targetHotspot: 'crime-scene',
    success:
      'Lots of objects, zero context. Perfect. That is what the lab is for.',
  },

  crime_lab: {
    title: 'SCIENCE DOES THE BORING PART',
    objective: 'Go to the Crime Lab and collect the forensic result.',
    hint:
      'For this first case, the lab has already analysed the evidence. ' +
      'Later, you will have to do it yourself.',
    targetHotspot: 'crime-lab',
    success:
      'The lab found something useful. Naturally, they will explain it over the phone.',
  },

  phone_lab: {
    title: 'THE NERDS CALL BACK',
    objective: 'Answer the Crime Lab call and hear the reconstruction.',
    hint:
      'The report explains how the theft was carried out. ' +
      'Listen carefully: the method will matter later.',
    targetHotspot: 'phone',
    success: 'Now you know what kind of thief you are looking for.',
  },

  hypothesis: {
    title: 'HOW DID THEY DO IT?',
    objective: 'Reconstruct the theft.',
    hint:
      'Place the elements in the slots. The system tells you what fits, ' +
      'what almost fits, and what is nonsense. Three tries, then it costs points.',
    targetHotspot: 'hypothesis',
    success: 'Now you know what skills the thief needed.',
  },

  suspects: {
    title: 'TEN PEOPLE, ONE THIEF',
    objective: 'Open the Evidence Grid to compare the suspects with the evidence.',
    hint:
      'Use the forensic clues and the reconstruction to narrow down your suspects. ' +
      'You decide who does not fit.',
    targetHotspot: 'suspect-grid',
    success:
      'The files are open. Time to see whose story survives the evidence.',
  },

  suspect_grid: {
    title: 'THE GRID',
    objective: 'Use the remaining clues to narrow your shortlist to two people.',
    hint:
      'Combine the forensic clues with the skills needed for the theft. ' +
      'Return to Crime City to confirm your shortlist.',
    targetHotspot: 'suspect-grid',
    success:
      'Two suspects remain. Evidence got us this far. Now we need their stories.',
  },

  talk_to_npcs: {
    title: 'SMALL TALK, BIG ALIBIS',
    objective: 'Talk to the witnesses and collect their accounts.',
    hint:
      'Ask about the remaining suspects and where they were during the theft. ' +
      'Everybody has an alibi. Some of them are even true.',
    targetHotspot: 'city-npc',
    success: 'Witness accounts collected. Trust issues unlocked.',
  },

  find_liar: {
    title: 'SOMEBODY IS LYING',
    objective: 'Compare the testimonies with the timeline and expose the false alibi.',
    hint:
      'Check the stories against each other. Someone is covering for a suspect. ' +
      'Their confidence is not supporting evidence.',
    targetHotspot: 'alibi-board',
    success: 'The alibi has collapsed. Time to visit the apartment.',
  },

  visit_apartment: {
    title: 'FOLLOW THE ADDRESS',
    objective: "Visit the suspect's apartment.",
    hint:
      'The false alibi gives you your next lead. ' +
      'You still need more information before issuing an arrest warrant.',
    targetHotspot: 'apartment',
    success: 'Nobody home. How considerate of them to leave the evidence.',
  },

  search_apartment: {
    title: 'HOME SWEET CRIME SCENE',
    objective: 'Search the apartment and collect the escape evidence.',
    hint:
      'Inspect the objects and collect useful items. ' +
      'Keep the ticket: the Crime Lab can examine it. Then return to Crime City.',
    targetHotspot: null,
    success: 'Next stop: the Crime Lab. Your ticket needs a second opinion.',
  },

  ticket_lab: {
    title: 'A TICKET TO SOMEWHERE',
    objective: 'Return to the Crime Lab and have the ticket examined.',
    hint:
      'Ask the lab to examine the ticket from your inventory. ' +
      'A damaged destination is still a destination. Just less cooperative.',
    targetHotspot: 'crime-lab',
    success: 'Destination clue recovered. Time to put the travel budget in danger.',
  },

  pursuit: {
    title: 'THE CHASE IS ON',
    objective: 'Open Travel in the bottom menu and follow the destination clue.',
    hint:
      'Use the lab result to choose your next city. ' +
      'The thief has a head start. Do not give them a sightseeing allowance.',
    targetHotspot: 'travel',
    success: 'Tutorial complete. Follow the trail, detective.',
  },
};

function getTicketResult(state) {
  return (
    state?.caseData?.ticketAnalyses?.[getEvidenceCaseKey(state)] ??
    null
  );
}

function hasTicketResult(state) {
  return getTicketResult(state)?.completed === true;
}

function getApartmentProgress(state) {
  const mission = state?.currentMission ?? {};

  const missionId = String(
    mission.id ||
    mission.missionId ||
    'unknown_mission'
  );

  return state?.apartmentProgress?.[missionId] ?? null;
}

function hasApartmentProgress(state) {
  const progress = getApartmentProgress(state);

  return Boolean(
    progress &&
    (
      progress.inventoryVersion === 2 ||
      progress.updatedAt
    )
  );
}

function migrateTutorialState(state) {
  const tutorial = state?.onboarding?.crimeCity;

  if (!tutorial) return;

  tutorial.doneSteps = Array.isArray(tutorial.doneSteps)
    ? [...new Set(
        tutorial.doneSteps.filter(
          id => CRIME_TUTORIAL_STEPS.includes(id)
        )
      )]
    : [];

  // Explicit skips and already finished tutorials stay finished.
  if (tutorial.completed) return;

  if (tutorial.step === 'arrest') {
    tutorial.step = hasApartmentProgress(state)
      ? 'search_apartment'
      : 'visit_apartment';
  }

  // Earlier tutorial versions jumped straight to Travel.
  if (tutorial.step === 'pursuit' && !hasTicketResult(state)) {
    tutorial.step = 'ticket_lab';
  }
}

function normalizeRequestedStep(stepId) {
  // ApartmentScene still uses this legacy completion signal on entry.
  return stepId === 'arrest'
    ? 'visit_apartment'
    : stepId;
}

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
    this.progressTimer = null;

    this.travelMenu = null;
    this.travelButton = null;
    this.travelHighlight = null;
    this.travelHighlightTween = null;

    this.onStepEventBound = this.onStepEvent.bind(this);
    this.onResizeBound = this.handleResize.bind(this);

    this.ensureState();
  }

  loadStepContent() {
    // The module owns the current text and numbering.
    // Legacy cached JSON cannot restore the removed warrant step.
    return Object.fromEntries(
      CRIME_TUTORIAL_STEPS.map((id, index) => [
        id,
        {
          ...STEP_CONTENT[id],
          number: index + 1,
        },
      ])
    );
  }

  ensureState() {
    this.gameState.onboarding ??= {};

    const existing = this.gameState.onboarding.crimeCity ?? {};

    this.gameState.onboarding.crimeCity = {
      ...existing,
      active: existing.active ?? false,
      step: existing.step ?? null,
      completed: existing.completed ?? false,
      skipped: existing.skipped ?? false,
      collapsed: existing.collapsed ?? false,
      doneSteps: Array.isArray(existing.doneSteps)
        ? existing.doneSteps
        : [],
    };

    migrateTutorialState(this.gameState);
  }

  get tutorialState() {
    return this.gameState.onboarding.crimeCity;
  }

  get collapsed() {
    return Boolean(this.tutorialState.collapsed);
  }

  get sceneKey() {
    return this.scene?.sys?.settings?.key;
  }

  toggleCollapsed() {
    if (!this.active) return;

    this.tutorialState.collapsed = !this.tutorialState.collapsed;
    this.rebuildOverlay();
  }

  rebuildOverlay() {
    if (!this.active) return;

    const step = this.stepContent[this.currentStep];

    this.destroyOverlay();
    this.createOverlay();

    if (step) {
      this.updateOverlay(step);
      this.highlightHotspot(step.targetHotspot);
    }
  }

  registerHotspot(id, zone) {
    if (!id || !zone) return;

    this.hotspots.set(id, zone);

    if (
      this.active &&
      this.stepContent[this.currentStep]?.targetHotspot === id &&
      !(id === 'travel' && this.currentStep === 'pursuit')
    ) {
      this.highlightHotspot(id);
    }
  }

  unregisterHotspot(id) {
    this.hotspots.delete(id);

    if (
      this.active &&
      this.stepContent[this.currentStep]?.targetHotspot === id
    ) {
      this.clearHighlight();
    }
  }

  isSceneUsable() {
    const sys = this.scene?.sys;

    if (!sys) return false;

    const status = sys.settings?.status;

    return (
      status !== Phaser.Scenes.SHUTDOWN &&
      status !== Phaser.Scenes.DESTROYED
    );
  }

  start() {
    if (this.destroyed || !this.isSceneUsable()) return;

    migrateTutorialState(this.gameState);

    if (this.tutorialState.completed) return;

    if (!this.active) {
      this.active = true;
      this.tutorialState.active = true;

      this.createOverlay();

      this.scene.scale.off('resize', this.onResizeBound);
      this.scene.scale.on('resize', this.onResizeBound);

      EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
      EventBus.on('crimeCityTutorialStep', this.onStepEventBound);

      this.progressTimer?.remove(false);

      this.progressTimer = this.scene.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => this.syncProgress(),
      });
    }

    const saved = this.tutorialState.step;

    this.setStep(
      CRIME_TUTORIAL_STEPS.includes(saved)
        ? saved
        : CRIME_TUTORIAL_STEPS[0]
    );

    this.syncProgress();
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

    // CrimeCityScene emits this before ApartmentScene is launched.
    // Entry is confirmed by ApartmentScene's legacy "arrest" signal.
    if (stepId === 'search_apartment') return;

    this.complete(stepId, payload?.message);
  }

  syncProgress() {
    if (
      !this.active ||
      this.destroyed ||
      !this.scene?.sys?.isActive()
    ) {
      return;
    }

    const tutorial = this.tutorialState;

    if (tutorial.completed || tutorial.step === 'finished') {
      this.finish(Boolean(tutorial.skipped));
      return;
    }

    migrateTutorialState(this.gameState);

    // ApartmentScene has returned to CrimeCityScene.
    // Entering the apartment alone does not complete its search step.
    if (
      this.sceneKey === 'CrimeCityScene' &&
      hasApartmentProgress(this.gameState) &&
      (
        tutorial.step === 'visit_apartment' ||
        tutorial.step === 'search_apartment'
      )
    ) {
      for (const id of ['visit_apartment', 'search_apartment']) {
        if (!tutorial.doneSteps.includes(id)) {
          tutorial.doneSteps.push(id);
        }
      }

      tutorial.step = 'ticket_lab';
      requestAutosave();
    }

    // Read the real analysis result, not just the lab visit.
    if (
      tutorial.step === 'ticket_lab' &&
      hasTicketResult(this.gameState)
    ) {
      advanceCrimeTutorial(this.gameState, 'ticket_lab');
      requestAutosave();
    }

    if (tutorial.step !== this.currentStep) {
      this.setStep(tutorial.step);
    }

    if (
      this.currentStep === 'pursuit' &&
      this.sceneKey === 'CrimeCityScene'
    ) {
      this.syncTravelHighlight();
    } else {
      this.clearTravelHighlight();
    }
  }

  complete(stepId, message) {
    stepId = normalizeRequestedStep(stepId);

    if (
      !this.active ||
      !CRIME_TUTORIAL_STEPS.includes(stepId) ||
      this.tutorialState.step !== stepId
    ) {
      return;
    }

    // Apartment exit and the lab result own these transitions.
    if (stepId === 'search_apartment') return;

    if (stepId === 'ticket_lab' && !hasTicketResult(this.gameState)) {
      return;
    }

    const advanced = advanceCrimeTutorial(this.gameState, stepId);

    if (!advanced) return;

    this.showFeedback(
      message ??
        this.stepContent[stepId]?.success ??
        'Good work, detective.',
      'success'
    );

    requestAutosave();

    if (this.tutorialState.completed) {
      this.finish(false);
      return;
    }

    this.setStep(this.tutorialState.step);
  }

  setStep(stepId) {
    if (!this.active) return;

    stepId = normalizeRequestedStep(stepId);

    if (!CRIME_TUTORIAL_STEPS.includes(stepId)) return;

    const step = this.stepContent[stepId];

    if (!step) return;

    if (this.currentStep !== stepId) {
      this.clearTravelHighlight();
    }

    this.currentStep = stepId;
    this.tutorialState.step = stepId;

    this.clearStepDelay();
    this.updateOverlay(step);
    this.highlightHotspot(step.targetHotspot);

    if (
      stepId === 'pursuit' &&
      this.sceneKey === 'CrimeCityScene'
    ) {
      this.syncTravelHighlight();
    }
  }

  getPlayerMenu() {
    const hud = this.scene?.scene?.manager?.keys?.PlayerHudScene;

    if (!hud?.sys?.isActive()) return null;

    const menu = (
      PlayerMenuUI._registry.get(hud) ||
      hud.playerMenu
    );

    if (
      !menu ||
      menu.isDestroyed ||
      !menu.container?.scene
    ) {
      return null;
    }

    return menu;
  }

  syncTravelHighlight() {
    const menu = this.getPlayerMenu();

    if (!menu) {
      this.clearTravelHighlight();
      return;
    }

    const button = menu.buttonMap?.get('plane');
    const target = button?.hitAreaObject;

    if (!target?.scene || !target.active) {
      this.clearTravelHighlight();
      return;
    }

    if (this.travelMenu !== menu) {
      this.clearTravelHighlight();
      this.travelMenu = menu;

      if (!menu.isOpen && !menu.isAnimating) {
        menu.open();
      }
    }

    // Retry opening if a closing animation was running on step entry.
    if (!menu.isOpen && !menu.isAnimating && !this.travelHighlight) {
      menu.open();
    }

    if (this.travelButton !== target) {
      this.destroyTravelRectangle();
      this.travelButton = target;
    }

    if (!this.travelHighlight?.scene) {
      this.travelHighlight = menu.scene.add
        .rectangle(0, 0, 1, 1)
        .setStrokeStyle(4, COLORS.accent, 1)
        .setFillStyle(COLORS.accent, 0.08)
        .setScrollFactor(0)
        .setDepth(10001);

      this.travelHighlightTween = menu.scene.tweens.add({
        targets: this.travelHighlight,
        alpha: { from: 0.3, to: 1 },
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const visible = (
      menu.isOpen &&
      !menu.isAnimating &&
      menu.container.visible &&
      target.visible
    );

    this.travelHighlight.setVisible(visible);

    if (!visible) return;

    // getBounds includes the menu container's current position.
    const bounds = target.getBounds();

    this.travelHighlight
      .setPosition(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      )
      .setSize(
        bounds.width + 8,
        bounds.height + 8
      );
  }

  destroyTravelRectangle() {
    this.travelHighlightTween?.stop();
    this.travelHighlightTween = null;

    this.travelHighlight?.destroy();
    this.travelHighlight = null;
    this.travelButton = null;
  }

  clearTravelHighlight() {
    this.destroyTravelRectangle();
    this.travelMenu = null;
  }

  skip() {
    if (this.destroyed || !this.active) return;

    this.finish(true);
    requestAutosave();
  }

  finish(skipped = false) {
    if (this.destroyed || !this.active) return;

    const alreadyCompleted = this.tutorialState.completed;

    this.active = false;
    this.currentStep = null;

    this.tutorialState.active = false;
    this.tutorialState.completed = true;
    this.tutorialState.skipped = skipped;
    this.tutorialState.step = 'finished';

    this.clearStepDelay();
    this.clearHighlight();
    this.clearTravelHighlight();

    this.progressTimer?.remove(false);
    this.progressTimer = null;

    EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
    this.scene.scale.off('resize', this.onResizeBound);

    if (!alreadyCompleted) {
      EventBus.emit('crimeCityTutorialFinished', {
        skipped,
        tutorialState: { ...this.tutorialState },
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
      onComplete: () => this.destroyOverlay(),
    });
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
    this.feedbackTween = null;

    this.feedbackText
      .setText(message)
      .setColor(type === 'success' ? '#8fb180' : '#d76d52')
      .setAlpha(0)
      .setVisible(true);

    this.feedbackTween = this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 1,
      duration: 160,
      yoyo: true,
      hold: 2200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.feedbackText?.setVisible(false);
        this.feedbackTween = null;
      },
    });
  }

  createOverlay() {
    if (this.overlay?.scene) return;

    const collapsed = this.collapsed;
    const { width } = this.scene.scale;

    const panelWidth = Math.min(
      Math.max(width - 48, 320),
      860
    );

    const panelHeight = collapsed
      ? PANEL_HEIGHT_COLLAPSED
      : PANEL_HEIGHT_EXPANDED;

    const panelLeft = width / 2 - panelWidth / 2;
    const panelTop = 20;
    const panelCenterY = panelTop + panelHeight / 2;

    const textLeft = collapsed
      ? panelLeft + 16
      : panelLeft + PORTRAIT_SIZE + 32;

    const textWrapWidth = Math.max(
      panelWidth - PORTRAIT_SIZE - 72,
      80
    );

    this.overlay = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    const panel = this.scene.add
      .rectangle(
        width / 2,
        panelCenterY,
        panelWidth,
        panelHeight,
        COLORS.panel,
        0.95
      )
      .setScrollFactor(0)
      .setStrokeStyle(3, COLORS.panelBorder, 0.92);

    const items = [panel];

    if (!collapsed) {
      const portraitX = panelLeft + 16 + PORTRAIT_SIZE / 2;
      const portraitY = panelCenterY + 4;

      const portraitFrame = this.scene.add
        .rectangle(
          portraitX,
          portraitY,
          PORTRAIT_SIZE + 8,
          PORTRAIT_SIZE + 8,
          COLORS.panel,
          0.98
        )
        .setScrollFactor(0)
        .setStrokeStyle(2, COLORS.panelBorder, 0.85);

      let portrait;

      if (this.scene.textures.exists(PORTRAIT_KEY)) {
        portrait = this.scene.add
          .image(portraitX, portraitY, PORTRAIT_KEY)
          .setScrollFactor(0)
          .setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      } else {
        portrait = this.scene.add
          .rectangle(
            portraitX,
            portraitY,
            PORTRAIT_SIZE,
            PORTRAIT_SIZE,
            0xd7c58f,
            0.3
          )
          .setScrollFactor(0);
      }

      const nameplate = this.scene.add
        .text(
          portraitX,
          portraitY + PORTRAIT_SIZE / 2 + 7,
          'HQ',
          {
            fontFamily: FONT_PIXEL,
            fontSize: '8px',
            color: '#f2d477',
          }
        )
        .setScrollFactor(0)
        .setOrigin(0.5, 0);

      items.push(portraitFrame, portrait, nameplate);
    }

    this.stepNumberText = this.scene.add
      .text(
        textLeft,
        panelTop + (collapsed ? 9 : 12),
        '',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '8px',
          color: '#f2d477',
        }
      )
      .setScrollFactor(0);

    this.titleText = this.scene.add
      .text(
        textLeft,
        panelTop + (collapsed ? 26 : 28),
        '',
        {
          fontFamily: FONT_PIXEL,
          fontSize: '9px',
          color: '#fff4d0',
        }
      )
      .setScrollFactor(0);

    items.push(this.stepNumberText, this.titleText);

    if (!collapsed) {
      this.objectiveText = this.scene.add
        .text(textLeft, panelTop + 50, '', {
          fontFamily: FONT_TYPE,
          fontSize: '20px',
          color: '#fff4d0',
          wordWrap: { width: textWrapWidth },
        })
        .setScrollFactor(0);

      this.hintText = this.scene.add
        .text(textLeft, panelTop + 84, '', {
          fontFamily: FONT_TYPE,
          fontSize: '14px',
          color: '#d7c58f',
          wordWrap: { width: textWrapWidth },
        })
        .setScrollFactor(0);

      items.push(this.objectiveText, this.hintText);
    }

    const skipW = 136;
    const skipH = 26;
    const skipX = panelLeft + panelWidth - skipW / 2 - 10;
    const skipY = panelTop + 8 + skipH / 2;

    const skipBorder = this.scene.add
      .rectangle(
        skipX,
        skipY,
        skipW,
        skipH,
        COLORS.panel,
        0.35
      )
      .setScrollFactor(0)
      .setStrokeStyle(1, COLORS.accent, 0.72);

    const skipButton = this.scene.add
      .rectangle(
        skipX,
        skipY,
        skipW,
        skipH,
        0x000000,
        0.001
      )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const skipText = this.scene.add
      .text(skipX, skipY, 'SKIP TUTORIAL ▸', {
        fontFamily: FONT_PIXEL,
        fontSize: '7px',
        color: '#d7c58f',
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    skipButton.on('pointerover', () => {
      skipText.setColor('#f2d477');
    });

    skipButton.on('pointerout', () => {
      skipText.setColor('#d7c58f');
    });

    skipButton.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      this.skip();
    });

    const toggleSize = 26;
    const toggleX = skipX - skipW / 2 - 8 - toggleSize / 2;

    const toggleBorder = this.scene.add
      .rectangle(
        toggleX,
        skipY,
        toggleSize,
        toggleSize,
        COLORS.panel,
        0.35
      )
      .setScrollFactor(0)
      .setStrokeStyle(1, COLORS.accent, 0.72);

    const toggleButton = this.scene.add
      .rectangle(
        toggleX,
        skipY,
        toggleSize,
        toggleSize,
        0x000000,
        0.001
      )
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    const toggleText = this.scene.add
      .text(toggleX, skipY, collapsed ? '+' : '–', {
        fontFamily: FONT_PIXEL,
        fontSize: '12px',
        color: '#d7c58f',
      })
      .setScrollFactor(0)
      .setOrigin(0.5);

    toggleButton.on('pointerover', () => {
      toggleText.setColor('#f2d477');
    });

    toggleButton.on('pointerout', () => {
      toggleText.setColor('#d7c58f');
    });

    toggleButton.on('pointerdown', (pointer, lx, ly, event) => {
      event?.stopPropagation?.();
      this.toggleCollapsed();
    });

    this.feedbackText = this.scene.add
      .text(
        width / 2,
        panelTop + panelHeight + 28,
        '',
        {
          fontFamily: FONT_TYPE,
          fontSize: '18px',
          color: '#d76d52',
          align: 'center',
          wordWrap: {
            width: Math.min(width - 96, 760),
          },
        }
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
      this.feedbackText
    );

    this.overlay.add(items);
  }

  updateOverlay(step) {
    if (!this.overlay?.scene || !step) return;

    this.stepNumberText?.setText(
      `CRIME CITY ${step.number}/${CRIME_TUTORIAL_STEPS.length}`
    );

    this.titleText?.setText(step.title);
    this.objectiveText?.setText(step.objective);
    this.hintText?.setText(step.hint);
  }

  highlightHotspot(hotspotId) {
    this.clearHighlight();

    if (!hotspotId || !this.active) return;

    // Travel is highlighted in PlayerHudScene, not on the city map.
    if (
      hotspotId === 'travel' &&
      this.currentStep === 'pursuit'
    ) {
      return;
    }

    const zone = this.hotspots.get(hotspotId);

    if (!zone?.scene || !zone.hotspotData) return;

    const data = zone.hotspotData;

    this.highlight = this.scene.add
      .rectangle(
        data.x + data.width / 2,
        data.y + data.height / 2,
        data.width + 14,
        data.height + 14
      )
      .setStrokeStyle(4, COLORS.accent, 1)
      .setFillStyle(COLORS.accent, 0.08)
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
      ease: 'Sine.easeInOut',
    });
  }

  clearHighlight() {
    this.highlightTween?.stop();
    this.highlightTween = null;

    this.highlight?.destroy();
    this.highlight = null;
  }

  destroyOverlay() {
    this.feedbackTween?.stop();
    this.feedbackTween = null;

    if (this.overlay?.scene) {
      this.scene.tweens.killTweensOf(this.overlay);
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

    if (
      this.currentStep === 'pursuit' &&
      this.sceneKey === 'CrimeCityScene'
    ) {
      this.syncTravelHighlight();
    }
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.active = false;
    this.currentStep = null;

    EventBus.off('crimeCityTutorialStep', this.onStepEventBound);
    this.scene.scale.off('resize', this.onResizeBound);

    this.progressTimer?.remove(false);
    this.progressTimer = null;

    this.clearStepDelay();
    this.clearHighlight();
    this.clearTravelHighlight();
    this.destroyOverlay();
    this.hotspots.clear();
  }
}

export function advanceCrimeTutorial(state, stepId) {
  const tutorial = state?.onboarding?.crimeCity;

  if (!tutorial || tutorial.completed) return false;

  migrateTutorialState(state);

  stepId = normalizeRequestedStep(stepId);

  if (
    !CRIME_TUTORIAL_STEPS.includes(stepId) ||
    tutorial.step !== stepId
  ) {
    return false;
  }

  // Legacy calls from the analysis service must not finish apartment search.
  // Apartment exit is handled when CrimeCityScene becomes active.
  if (stepId === 'search_apartment') return false;

  if (stepId === 'ticket_lab' && !hasTicketResult(state)) {
    return false;
  }

  // Travel can only finish this tutorial after successful lab analysis.
  if (stepId === 'pursuit' && !hasTicketResult(state)) {
    return false;
  }

  if (!tutorial.doneSteps.includes(stepId)) {
    tutorial.doneSteps.push(stepId);
  }

  const index = CRIME_TUTORIAL_STEPS.indexOf(stepId);
  const next = CRIME_TUTORIAL_STEPS[index + 1];

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
