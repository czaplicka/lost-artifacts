import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
// tutorial-compact-objectives-v1
import { EventBus } from '../EventBus.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';
import { getEvidenceCaseKey } from '../managers/ApartmentEvidenceModel.js';
import { requestAutosave } from '../gameStatePersistence.js';

const FONT_PIXEL = '"PressStart2P"';
const FONT_TYPE = '"SpecialElite"';
const COLORS = { panel: 0x17110e, panelBorder: 0xf2d477, accent: 0xf2d477 };
const PORTRAIT_KEY = 'portrait_hq';
const PORTRAIT_SIZE = 84;
const PANEL_HEIGHT_EXPANDED = 150;
const PANEL_HEIGHT_COLLAPSED = 46;

export const CRIME_TUTORIAL_STEPS = [
  'crime_scene', 'crime_lab', 'phone_lab', 'hypothesis', 'suspects', 'suspect_grid',
  'talk_to_npcs', 'find_liar', 'visit_apartment', 'search_apartment', 'ticket_lab', 'pursuit'
];
const STEP_CONTENT = {
  crime_scene: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_b179e89d5451215f66c9"),
    objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_396f8165e6c7ddf84c1d"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_698b9cf384ad2ceab4fb"),
    targetHotspot: 'crime-scene', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_cc91b09ffcb426913432")
  },
  crime_lab: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_d0bedf0c191928f395e7"),
    objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_7eabc10201d8278c339b"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_8adc6da1cbd1d17bfe7b"),
    targetHotspot: 'crime-lab', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_0a3caf483cfc74688dd5")
  },
  phone_lab: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_1375d784d15263207988"),
    objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_08808396627e86370fee"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_e9fbc37b2cdf6615f604"),
    targetHotspot: 'phone', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_40cfca41c403bc9f9e39")
  },
  hypothesis: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_810fa3b5d9418487cfa9"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_5e5c6cd8f11508e06b2a"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_85ad93eafb3dae20fee4"),
    targetHotspot: 'hypothesis', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_cdb8bfbdf4711d519710")
  },
  suspects: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_4ace015fa0941eef096c"),
    objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_59f7beb50ca0cc785a4c"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_3bbb247a90f205e3e3f7"),
    targetHotspot: 'suspect-grid', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_020d9feb00ebd493aefa")
  },
  suspect_grid: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_b5e6b36926054fbc858d"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_97f30e451538697cf614"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_6cea0271c6fe2903439d"),
    targetHotspot: 'suspect-grid', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_ed1a7a1b1769d3de48c1")
  },
  talk_to_npcs: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_458f9ec1869ff5f1c5d9"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_c3b96318a759db560542"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_a42b435fc930122264b7"),
    targetHotspot: 'city-npc', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_1410fe6ad886c6b5a654")
  },
  find_liar: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_06cd95af021e931de365"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_b1f6dfad514e777ebc84"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_90300513a4af31cd8386"),
    targetHotspot: 'alibi-board', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_f3fa4dbfee624492c90f")
  },
  visit_apartment: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_536c9ccb84f8d0069c82"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_5b6588dd45cab881a3f5"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_a500a7ac6e4c61b384bc"),
    targetHotspot: 'apartment', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_221981bb683cb28f7f1c")
  },
  search_apartment: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_c102e0ed754206fb88ec"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_2421a1de44fae81f518d"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_5fdde590ece0cae81bf5"),
    targetHotspot: null, success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_2ad59f46625fcb9fbb93")
  },
  ticket_lab: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_0a52b7d83faa57d79481"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_9822c06f13c76e6c47ec"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_9ad172ebdf017a4d7bfa"),
    targetHotspot: 'crime-lab', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_9c10d0671b6ea5f480ba")
  },
  pursuit: {
    title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_d3cecb4f05065c6ff9d3"), objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_e76bc9ed34c1b358fd42"),
    hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_330f6b7bee175fcfb9dc"),
    targetHotspot: 'travel', success: __dialogueText("tutorials/CrimeCityTutorial.js", "t_f1be86cd9cc389a7c0a5")
  }
};

function getTicketResult(state) { return state?.caseData?.ticketAnalyses?.[getEvidenceCaseKey(state)] ?? null; }
function hasTicketResult(state) { return getTicketResult(state)?.completed === true; }
function getApartmentProgress(state) {
  const mission = state?.currentMission ?? {};
  return state?.apartmentProgress?.[String(mission.id || mission.missionId || 'unknown_mission')] ?? null;
}
function hasApartmentProgress(state) {
  const progress = getApartmentProgress(state);
  return Boolean(progress && (progress.inventoryVersion === 2 || progress.updatedAt));
}
function migrateTutorialState(state) {
  const tutorial = state?.onboarding?.crimeCity;
  if (!tutorial) return;
  tutorial.doneSteps = Array.isArray(tutorial.doneSteps) ? [...new Set(tutorial.doneSteps.filter(id => CRIME_TUTORIAL_STEPS.includes(id)))] : [];
  if (tutorial.completed) return;
  if (tutorial.step === 'arrest') tutorial.step = hasApartmentProgress(state) ? 'search_apartment' : 'visit_apartment';
  if (tutorial.step === 'pursuit' && !hasTicketResult(state)) tutorial.step = 'ticket_lab';
}
function normalizeRequestedStep(stepId) { return stepId === 'arrest' ? 'visit_apartment' : stepId; }

export class CrimeCityTutorial {
  constructor(scene, state) {
    this.scene = scene; this.gameState = state;
    this.active = false; this.destroyed = false; this.currentStep = null;
    this.hotspots = new Map(); this.stepContent = this.loadStepContent();
    this.overlay = null; this.stepNumberText = null; this.titleText = null;
    this.objectiveText = null; this.hintText = null; this.feedbackText = null;
    this.feedbackTween = null; this.highlight = null; this.highlightTween = null;
    this.stepDelay = null; this.progressTimer = null;
    this.travelMenu = null; this.travelButton = null; this.travelHighlight = null; this.travelHighlightTween = null;
    this.gridPresentationKey = null;
    this.onStepEventBound = this.onStepEvent.bind(this);
    this.onResizeBound = this.handleResize.bind(this);
    this.ensureState();
  }
  loadStepContent() {
    return Object.fromEntries(CRIME_TUTORIAL_STEPS.map((id, index) => [id, { ...STEP_CONTENT[id], number: index + 1 }]));
  }
  ensureState() {
    this.gameState.onboarding ??= {};
    const existing = this.gameState.onboarding.crimeCity ?? {};
    this.gameState.onboarding.crimeCity = {
      ...existing, active: existing.active ?? false, step: existing.step ?? null,
      completed: existing.completed ?? false, skipped: existing.skipped ?? false,
      collapsed: existing.collapsed ?? false, doneSteps: Array.isArray(existing.doneSteps) ? existing.doneSteps : []
    };
    migrateTutorialState(this.gameState);
  }
  get tutorialState() { return this.gameState.onboarding.crimeCity; }
  get collapsed() { return Boolean(this.tutorialState.collapsed); }
  get sceneKey() { return this.scene?.sys?.settings?.key; }

  getDisplayStep(stepId = this.currentStep) {
    const base = this.stepContent[stepId];
    if (stepId !== 'suspect_grid' || this.sceneKey !== 'SuspectGridScene' || !base) return base;
    const submitted = this.scene.isGridShortlistSubmitted?.() === true;
    const remaining = this.scene.getGridRemainingSuspects?.().length ?? 0;
    if (submitted) return {
      ...base, title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_8dab8da6117b9bad2517"),
      objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_66bd164ab6e236a20147"),
      hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_d7b758117e35738dd7ea"),
      targetHotspot: 'grid-return', gridPhase: 'return'
    };
    if (remaining === 2) return {
      ...base, title: __dialogueText("tutorials/CrimeCityTutorial.js", "t_e65de23fd9c62eab2454"),
      objective: __dialogueText("tutorials/CrimeCityTutorial.js", "t_5eef2ab87dde0030dbd5"),
      hint: __dialogueText("tutorials/CrimeCityTutorial.js", "t_a08ad7534081cb98400f"),
      targetHotspot: 'grid-send', gridPhase: 'send'
    };
    return { ...base, targetHotspot: null, gridPhase: 'compare' };
  }

  syncGridStep(force = false) {
    if (!this.active || this.destroyed || this.currentStep !== 'suspect_grid' || this.sceneKey !== 'SuspectGridScene') return;
    const step = this.getDisplayStep();
    const key = `${step.gridPhase}:${this.scene.scale.width}:${this.scene.scale.height}`;
    if (!force && key === this.gridPresentationKey && (!step.targetHotspot || this.highlight?.scene)) return;
    this.gridPresentationKey = key;
    this.updateOverlay(step); this.highlightHotspot(step.targetHotspot);
  }

  toggleCollapsed() {
    if (!this.active) return;
    this.tutorialState.collapsed = !this.tutorialState.collapsed;
    this.rebuildOverlay(); requestAutosave();
  }
  rebuildOverlay() {
    if (!this.active) return;
    const step = this.getDisplayStep();
    this.destroyOverlay(); this.createOverlay();
    if (step) { this.updateOverlay(step); this.highlightHotspot(step.targetHotspot); }
  }
  registerHotspot(id, zone) {
    if (!id || !zone) return;
    this.hotspots.set(id, zone);
    if (this.active && this.getDisplayStep()?.targetHotspot === id && !(id === 'travel' && this.currentStep === 'pursuit')) this.highlightHotspot(id);
  }
  unregisterHotspot(id) {
    this.hotspots.delete(id);
    if (this.active && this.getDisplayStep()?.targetHotspot === id) this.clearHighlight();
  }
  isSceneUsable() {
    const sys = this.scene?.sys;
    return Boolean(sys && sys.settings?.status !== Phaser.Scenes.SHUTDOWN && sys.settings?.status !== Phaser.Scenes.DESTROYED);
  }
  start() {
    if (this.destroyed || !this.isSceneUsable()) return;
    migrateTutorialState(this.gameState);
    if (this.tutorialState.completed) return;
    if (!this.active) {
      this.active = true; this.tutorialState.active = true; this.createOverlay();
      this.scene.scale.off('resize', this.onResizeBound); this.scene.scale.on('resize', this.onResizeBound);
      EventBus.off('crimeCityTutorialStep', this.onStepEventBound); EventBus.on('crimeCityTutorialStep', this.onStepEventBound);
      this.progressTimer?.remove(false);
      this.progressTimer = this.scene.time.addEvent({ delay: 200, loop: true, callback: () => this.syncProgress() });
    }
    const saved = this.tutorialState.step;
    this.setStep(CRIME_TUTORIAL_STEPS.includes(saved) ? saved : CRIME_TUTORIAL_STEPS[0]); this.syncProgress();
  }
  resume() { this.start(); }
  isActive() { return this.active; }
  getStep() { return this.currentStep; }
  onStepEvent(payload) {
    const stepId = payload?.step ?? payload;
    if (stepId === 'search_apartment') return;
    this.complete(stepId, payload?.message);
  }
  syncProgress() {
    if (!this.active || this.destroyed || !this.scene?.sys?.isActive()) return;
    const tutorial = this.tutorialState;
    if (tutorial.completed || tutorial.step === 'finished') { this.finish(Boolean(tutorial.skipped)); return; }
    migrateTutorialState(this.gameState);
    if (this.sceneKey === 'CrimeCityScene' && hasApartmentProgress(this.gameState) && ['visit_apartment', 'search_apartment'].includes(tutorial.step)) {
      for (const id of ['visit_apartment', 'search_apartment']) if (!tutorial.doneSteps.includes(id)) tutorial.doneSteps.push(id);
      tutorial.step = 'ticket_lab'; requestAutosave();
    }
    if (tutorial.step === 'ticket_lab' && hasTicketResult(this.gameState)) { advanceCrimeTutorial(this.gameState, 'ticket_lab'); requestAutosave(); }
    if (tutorial.step !== this.currentStep) this.setStep(tutorial.step);
    this.syncGridStep();
    if (this.currentStep === 'pursuit' && this.sceneKey === 'CrimeCityScene') this.syncTravelHighlight();
    else this.clearTravelHighlight();
  }
  complete(stepId, message) {
    stepId = normalizeRequestedStep(stepId);
    if (!this.active || !CRIME_TUTORIAL_STEPS.includes(stepId) || this.tutorialState.step !== stepId) return;
    if (stepId === 'search_apartment') return;
    if (stepId === 'ticket_lab' && !hasTicketResult(this.gameState)) return;
    // The Grid return action owns this transition, not the Send button or an event.
    if (stepId === 'suspect_grid' && this.sceneKey === 'SuspectGridScene' && !this.scene.gridLeaving) return;
    if (!advanceCrimeTutorial(this.gameState, stepId)) return;
    this.showFeedback(message ?? this.stepContent[stepId]?.success ?? __dialogueText("tutorials/CrimeCityTutorial.js", "t_7a451d0bfc4d551badcb"), 'success');
    requestAutosave();
    if (this.tutorialState.completed) { this.finish(false); return; }
    this.setStep(this.tutorialState.step);
  }
  setStep(stepId) {
    if (!this.active) return;
    stepId = normalizeRequestedStep(stepId);
    if (!CRIME_TUTORIAL_STEPS.includes(stepId)) return;
    if (this.currentStep !== stepId) { this.clearTravelHighlight(); this.gridPresentationKey = null; }
    this.currentStep = stepId; this.tutorialState.step = stepId;
    const step = this.getDisplayStep();
    if (!step) return;
    this.clearStepDelay(); this.updateOverlay(step); this.highlightHotspot(step.targetHotspot);
    if (stepId === 'pursuit' && this.sceneKey === 'CrimeCityScene') this.syncTravelHighlight();
  }
  getPlayerMenu() {
    const hud = this.scene?.scene?.manager?.keys?.PlayerHudScene;
    if (!hud?.sys?.isActive()) return null;
    const menu = PlayerMenuUI._registry.get(hud) || hud.playerMenu;
    return !menu || menu.isDestroyed || !menu.container?.scene ? null : menu;
  }
  syncTravelHighlight() {
    const menu = this.getPlayerMenu();
    if (!menu) { this.clearTravelHighlight(); return; }
    const target = menu.buttonMap?.get('plane')?.hitAreaObject;
    if (!target?.scene || !target.active) { this.clearTravelHighlight(); return; }
    if (this.travelMenu !== menu) {
      this.clearTravelHighlight(); this.travelMenu = menu;
      if (!menu.isOpen && !menu.isAnimating) menu.open();
    }
    if (!menu.isOpen && !menu.isAnimating && !this.travelHighlight) menu.open();
    if (this.travelButton !== target) { this.destroyTravelRectangle(); this.travelButton = target; }
    if (!this.travelHighlight?.scene) {
      this.travelHighlight = menu.scene.add.rectangle(0, 0, 1, 1).setStrokeStyle(4, COLORS.accent, 1)
        .setFillStyle(COLORS.accent, 0.08).setScrollFactor(0).setDepth(10001);
      this.travelHighlightTween = menu.scene.tweens.add({ targets: this.travelHighlight, alpha: { from: 0.3, to: 1 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const visible = menu.isOpen && !menu.isAnimating && menu.container.visible && target.visible;
    this.travelHighlight.setVisible(visible);
    if (!visible) return;
    const bounds = target.getBounds();
    this.travelHighlight.setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2).setSize(bounds.width + 8, bounds.height + 8);
  }
  destroyTravelRectangle() {
    this.travelHighlightTween?.stop(); this.travelHighlightTween = null;
    this.travelHighlight?.destroy(); this.travelHighlight = null; this.travelButton = null;
  }
  clearTravelHighlight() { this.destroyTravelRectangle(); this.travelMenu = null; }
  skip() { if (!this.destroyed && this.active) { this.finish(true); requestAutosave(); } }
  finish(skipped = false) {
    if (this.destroyed || !this.active) return;
    const alreadyCompleted = this.tutorialState.completed;
    this.active = false; this.currentStep = null;
    Object.assign(this.tutorialState, { active: false, completed: true, skipped, step: 'finished' });
    this.clearStepDelay(); this.clearHighlight(); this.clearTravelHighlight();
    this.progressTimer?.remove(false); this.progressTimer = null;
    EventBus.off('crimeCityTutorialStep', this.onStepEventBound); this.scene.scale.off('resize', this.onResizeBound);
    if (!alreadyCompleted) EventBus.emit('crimeCityTutorialFinished', { skipped, tutorialState: { ...this.tutorialState } });
    if (!this.overlay?.scene) { this.destroyOverlay(); return; }
    this.scene.tweens.add({ targets: this.overlay, alpha: 0, duration: 300, ease: 'Sine.easeOut', onComplete: () => this.destroyOverlay() });
  }
  delayStep(delay, callback) {
    this.clearStepDelay();
    this.stepDelay = this.scene.time.delayedCall(delay, () => { this.stepDelay = null; if (!this.destroyed) callback(); });
  }
  clearStepDelay() { this.stepDelay?.remove(false); this.stepDelay = null; }
  showFeedback(message, type = 'warning') {
    if (!this.active || !this.feedbackText?.scene) return;
    this.feedbackTween?.stop(); this.feedbackTween = null;
    this.feedbackText.setText(message).setColor(type === 'success' ? '#8fb180' : '#d76d52').setAlpha(0).setVisible(true);
    this.feedbackTween = this.scene.tweens.add({
      targets: this.feedbackText, alpha: 1, duration: 160, yoyo: true, hold: 2200, ease: 'Sine.easeOut',
      onComplete: () => { this.feedbackText?.setVisible(false); this.feedbackTween = null; }
    });
  }
  createOverlay() {
    if (this.overlay?.scene) return;
    const collapsed = this.collapsed, { width } = this.scene.scale;
    const panelWidth = Math.min(Math.max(width - 48, 320), 860);
    const panelHeight = collapsed ? PANEL_HEIGHT_COLLAPSED : PANEL_HEIGHT_EXPANDED;
    const panelLeft = width / 2 - panelWidth / 2, panelTop = 20, panelCenterY = panelTop + panelHeight / 2;
    const textLeft = collapsed ? panelLeft + 16 : panelLeft + PORTRAIT_SIZE + 32;
    const textWrapWidth = Math.max(panelWidth - PORTRAIT_SIZE - 72, 80);
    this.overlay = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(10000);
    const panel = this.scene.add.rectangle(width / 2, panelCenterY, panelWidth, panelHeight, COLORS.panel, 0.95)
      .setScrollFactor(0).setStrokeStyle(3, COLORS.panelBorder, 0.92);
    this.panel = panel;
    const items = [panel];
    if (!collapsed) {
      const portraitX = panelLeft + 16 + PORTRAIT_SIZE / 2, portraitY = panelCenterY + 4;
      const frame = this.scene.add.rectangle(portraitX, portraitY, PORTRAIT_SIZE + 8, PORTRAIT_SIZE + 8, COLORS.panel, 0.98)
        .setScrollFactor(0).setStrokeStyle(2, COLORS.panelBorder, 0.85);
      const portrait = this.scene.textures.exists(PORTRAIT_KEY)
        ? this.scene.add.image(portraitX, portraitY, PORTRAIT_KEY).setScrollFactor(0).setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
        : this.scene.add.rectangle(portraitX, portraitY, PORTRAIT_SIZE, PORTRAIT_SIZE, 0xd7c58f, 0.3).setScrollFactor(0);
      const nameplate = this.scene.add.text(portraitX, portraitY + PORTRAIT_SIZE / 2 + 7, __dialogueText("tutorials/CrimeCityTutorial.js", "t_a688d83ae8586526909c"), { fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f2d477' }).setScrollFactor(0).setOrigin(0.5, 0);
      items.push(frame, portrait, nameplate);
    }
    this.stepNumberText = this.scene.add.text(textLeft, panelTop + (collapsed ? 9 : 12), '', { fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f2d477' }).setScrollFactor(0);
    this.titleText = this.scene.add.text(textLeft, panelTop + (collapsed ? 26 : 28), '', { fontFamily: FONT_PIXEL, fontSize: '9px', color: '#fff4d0' }).setScrollFactor(0);
    items.push(this.stepNumberText, this.titleText);
    if (!collapsed) {
      this.objectiveText = this.scene.add.text(textLeft, panelTop + 50, '', { fontFamily: FONT_TYPE, fontSize: '20px', color: '#fff4d0', wordWrap: { width: textWrapWidth } }).setScrollFactor(0);
      this.hintText = this.scene.add.text(textLeft, panelTop + 84, '', { fontFamily: FONT_TYPE, fontSize: '14px', color: '#d7c58f', wordWrap: { width: textWrapWidth } }).setScrollFactor(0);
      items.push(this.objectiveText, this.hintText);
    }
    const skipW = 136, skipH = 26, skipX = panelLeft + panelWidth - skipW / 2 - 10, skipY = panelTop + 8 + skipH / 2;
    const skipBorder = this.scene.add.rectangle(skipX, skipY, skipW, skipH, COLORS.panel, 0.35).setScrollFactor(0).setStrokeStyle(1, COLORS.accent, 0.72);
    const skipButton = this.scene.add.rectangle(skipX, skipY, skipW, skipH, 0, 0.001).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const skipText = this.scene.add.text(skipX, skipY, __dialogueText("tutorials/CrimeCityTutorial.js", "t_8cc97df53fb818d8aca7"), { fontFamily: FONT_PIXEL, fontSize: '7px', color: '#d7c58f' }).setScrollFactor(0).setOrigin(0.5);
    skipButton.on('pointerover', () => skipText.setColor('#f2d477'));
    skipButton.on('pointerout', () => skipText.setColor('#d7c58f'));
    skipButton.on('pointerdown', (pointer, lx, ly, event) => { event?.stopPropagation?.(); this.skip(); });
    const toggleSize = 26, toggleX = skipX - skipW / 2 - 8 - toggleSize / 2;
    const toggleBorder = this.scene.add.rectangle(toggleX, skipY, toggleSize, toggleSize, COLORS.panel, 0.35).setScrollFactor(0).setStrokeStyle(1, COLORS.accent, 0.72);
    const toggleButton = this.scene.add.rectangle(toggleX, skipY, toggleSize, toggleSize, 0, 0.001).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const toggleText = this.scene.add.text(toggleX, skipY, collapsed ? __dialogueText("tutorials/CrimeCityTutorial.js", "t_a318c24216defe206fee") : __dialogueText("tutorials/CrimeCityTutorial.js", "t_d4f85d36757c12f0c6da"), { fontFamily: FONT_PIXEL, fontSize: '12px', color: '#d7c58f' }).setScrollFactor(0).setOrigin(0.5);
    toggleButton.on('pointerover', () => toggleText.setColor('#f2d477'));
    toggleButton.on('pointerout', () => toggleText.setColor('#d7c58f'));
    toggleButton.on('pointerdown', (pointer, lx, ly, event) => { event?.stopPropagation?.(); this.toggleCollapsed(); });
    this.feedbackText = this.scene.add.text(width / 2, panelTop + panelHeight + 28, '', {
      fontFamily: FONT_TYPE, fontSize: '18px', color: '#d76d52', align: 'center', wordWrap: { width: Math.min(width - 96, 760) }
    }).setScrollFactor(0).setOrigin(0.5).setVisible(false);
    items.push(skipBorder, skipButton, skipText, toggleBorder, toggleButton, toggleText, this.feedbackText);
    this.overlay.add(items);
  }
  updateOverlay(step) {
    if (!this.overlay?.scene || !step) return;
    if (this.currentStep === 'suspect_grid' && this.sceneKey === 'SuspectGridScene') step = this.getDisplayStep();
    this.stepNumberText?.setText(`${__dialogueText("tutorials/CrimeCityTutorial.js", "t_3262bad163455d887a75")}${step.number}${__dialogueText("tutorials/CrimeCityTutorial.js", "t_8a5edab282632443219e")}${CRIME_TUTORIAL_STEPS.length}`);
    this.titleText?.setText(this.collapsed ? (step.objective || step.title) : step.title);
    if (this.collapsed && this.titleText && this.panel) {
      const width = Math.max(80, this.panel.width - 32);
      this.titleText.setFontFamily(FONT_TYPE).setFontSize(18);
      this.titleText.setWordWrapWidth(width);
      const top = this.panel.y - this.panel.height / 2;
      const height = Math.max(PANEL_HEIGHT_COLLAPSED, this.titleText.y - top + this.titleText.height + 12);
      this.panel.setSize(this.panel.width, height);
      this.panel.setY(top + height / 2);
      this.feedbackText?.setY(top + height + 28);
    }
    this.objectiveText?.setText(step.objective);
    this.hintText?.setText(step.hint);
  }
  highlightHotspot(hotspotId) {
    this.clearHighlight();
    if (this.currentStep === 'suspect_grid' && this.sceneKey === 'SuspectGridScene') {
      hotspotId = this.getDisplayStep()?.targetHotspot;
      if (hotspotId) {
        const { width, height } = this.scene.scale, returning = hotspotId === 'grid-return';
        const buttonWidth = returning ? 190 : 250, x = returning ? 110 : width - 135;
        this.hotspots.set(hotspotId, { scene: this.scene, scrollFactorX: 0, scrollFactorY: 0,
          hotspotData: { x: x - buttonWidth / 2, y: height - 50, width: buttonWidth, height: 38 } });
      }
    }
    if (!hotspotId || !this.active || (hotspotId === 'travel' && this.currentStep === 'pursuit')) return;
    const zone = this.hotspots.get(hotspotId);
    if (!zone?.scene || !zone.hotspotData) return;
    const data = zone.hotspotData;
    this.highlight = this.scene.add.rectangle(data.x + data.width / 2, data.y + data.height / 2, data.width + 14, data.height + 14)
      .setStrokeStyle(4, COLORS.accent, 1).setFillStyle(COLORS.accent, 0.08).setDepth(9999)
      .setScrollFactor(zone.scrollFactorX ?? 1, zone.scrollFactorY ?? 1);
    this.highlightTween = this.scene.tweens.add({ targets: this.highlight, alpha: { from: 0.28, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  clearHighlight() {
    this.highlightTween?.stop(); this.highlightTween?.remove?.(); this.highlightTween = null;
    this.highlight?.destroy(); this.highlight = null;
  }
  destroyOverlay() {
    this.feedbackTween?.stop(); this.feedbackTween = null;
    if (this.overlay?.scene) { this.scene.tweens.killTweensOf(this.overlay); this.overlay.destroy(true); }
    this.overlay = null; this.stepNumberText = null; this.titleText = null; this.objectiveText = null; this.hintText = null; this.feedbackText = null;
  }
  handleResize() {
    this.rebuildOverlay(); this.syncGridStep(true);
    if (this.currentStep === 'pursuit' && this.sceneKey === 'CrimeCityScene') this.syncTravelHighlight();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true; this.active = false; this.currentStep = null;
    EventBus.off('crimeCityTutorialStep', this.onStepEventBound); this.scene.scale.off('resize', this.onResizeBound);
    this.progressTimer?.remove(false); this.progressTimer = null;
    this.clearStepDelay(); this.clearHighlight(); this.clearTravelHighlight(); this.destroyOverlay(); this.hotspots.clear();
  }
}

export function advanceCrimeTutorial(state, stepId) {
  const tutorial = state?.onboarding?.crimeCity;
  if (!tutorial || tutorial.completed) return false;
  migrateTutorialState(state);
  stepId = normalizeRequestedStep(stepId);
  if (!CRIME_TUTORIAL_STEPS.includes(stepId) || tutorial.step !== stepId) return false;
  if (stepId === 'ticket_lab' && !hasTicketResult(state)) return false;
  if (!tutorial.doneSteps.includes(stepId)) tutorial.doneSteps.push(stepId);
  const index = CRIME_TUTORIAL_STEPS.indexOf(stepId), next = CRIME_TUTORIAL_STEPS[index + 1];
  if (next) tutorial.step = next;
  else Object.assign(tutorial, { step: 'finished', completed: true, active: false });
  requestAutosave();
  return true;
}