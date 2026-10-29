import { EventBus } from './EventBus.js';
import { PlayerMenuUI } from './ui/PlayerMenuUI.js';
import { getEvidenceCaseKey } from './managers/ApartmentEvidenceModel.js';
import { requestAutosave } from './gameStatePersistence.js';

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
    title: 'EVERYTHING IS EVIDENCE',
    objective: 'Search the crime scene and find the hidden objects.',
    hint: 'Every object matters until you know how the crime happened. Free hint: slow and safe. Legal hint: costs money. Illegal hint: HQ will pretend it never saw it.',
    targetHotspot: 'crime-scene', success: 'Lots of objects, zero context. Perfect. That is what the lab is for.'
  },
  crime_lab: {
    title: 'SCIENCE DOES THE BORING PART',
    objective: 'Go to the Crime Lab and collect the forensic result.',
    hint: 'For this first case, the lab has already analysed the evidence. Later, you will have to do it yourself.',
    targetHotspot: 'crime-lab', success: 'The lab found something useful. Naturally, they will explain it over the phone.'
  },
  phone_lab: {
    title: 'THE NERDS CALL BACK',
    objective: 'Answer the Crime Lab call and hear the reconstruction.',
    hint: 'The report explains how the theft was carried out. Listen carefully: the method will matter later.',
    targetHotspot: 'phone', success: 'Now you know what kind of thief you are looking for.'
  },
  hypothesis: {
    title: 'HOW DID THEY DO IT?', objective: 'Reconstruct the theft.',
    hint: 'Place the elements in the slots. The system tells you what fits, what almost fits, and what is nonsense. Three tries, then it costs points.',
    targetHotspot: 'hypothesis', success: 'Now you know what skills the thief needed.'
  },
  suspects: {
    title: 'TEN PEOPLE, ONE THIEF',
    objective: 'Open the Evidence Grid to compare the suspects with the evidence.',
    hint: 'Use the forensic clues and the reconstruction to narrow down your suspects. You decide who does not fit.',
    targetHotspot: 'suspect-grid', success: 'The files are open. Time to see whose story survives the evidence.'
  },
  suspect_grid: {
    title: 'THE GRID', objective: 'Use the remaining clues to narrow your shortlist to two people.',
    hint: 'Combine the forensic clues with the skills needed for the theft. Click SEND TO ALIBIS to submit your shortlist, then return to Crime City.',
    targetHotspot: 'suspect-grid', success: 'Two suspects remain. Evidence got us this far. Now we need their stories.'
  },
  talk_to_npcs: {
    title: 'SMALL TALK, BIG ALIBIS', objective: 'Talk to the witnesses and collect their accounts.',
    hint: 'Ask about the remaining suspects and where they were during the theft. Everybody has an alibi. Some of them are even true.',
    targetHotspot: 'city-npc', success: 'Witness accounts collected. Trust issues unlocked.'
  },
  find_liar: {
    title: 'SOMEBODY IS LYING', objective: 'Compare the testimonies with the timeline and expose the false alibi.',
    hint: 'Check the stories against each other. Someone is covering for a suspect. Their confidence is not supporting evidence.',
    targetHotspot: 'alibi-board', success: 'The alibi has collapsed. Time to visit the apartment.'
  },
  visit_apartment: {
    title: 'FOLLOW THE ADDRESS', objective: "Visit the suspect's apartment.",
    hint: 'The false alibi gives you your next lead. You still need more information before issuing an arrest warrant.',
    targetHotspot: 'apartment', success: 'Nobody home. How considerate of them to leave the evidence.'
  },
  search_apartment: {
    title: 'HOME SWEET CRIME SCENE', objective: 'Search the apartment and collect the escape evidence.',
    hint: 'Inspect the objects and collect useful items. Keep the ticket: the Crime Lab can examine it. Then return to Crime City.',
    targetHotspot: null, success: 'Next stop: the Crime Lab. Your ticket needs a second opinion.'
  },
  ticket_lab: {
    title: 'A TICKET TO SOMEWHERE', objective: 'Return to the Crime Lab and have the ticket examined.',
    hint: 'Ask the lab to examine the ticket from your inventory. A damaged destination is still a destination. Just less cooperative.',
    targetHotspot: 'crime-lab', success: 'Destination clue recovered. Time to put the travel budget in danger.'
  },
  pursuit: {
    title: 'THE CHASE IS ON', objective: 'Open Travel in the bottom menu and follow the destination clue.',
    hint: 'Use the lab result to choose your next city. The thief has a head start. Do not give them a sightseeing allowance.',
    targetHotspot: 'travel', success: 'Tutorial complete. Follow the trail, detective.'
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
      ...base, title: 'THE GRID / RETURN',
      objective: 'Shortlist sent. Return to Crime City.',
      hint: 'Click the glowing CRIME CITY button at the bottom left. Next, we will check the witnesses and their alibis.',
      targetHotspot: 'grid-return', gridPhase: 'return'
    };
    if (remaining === 2) return {
      ...base, title: 'THE GRID / SEND',
      objective: 'Two suspects remain. Click SEND TO ALIBIS.',
      hint: 'Use the glowing button at the bottom right to submit your shortlist. Then return to Crime City.',
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
    this.showFeedback(message ?? this.stepContent[stepId]?.success ?? 'Good work, detective.', 'success');
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
    const items = [panel];
    if (!collapsed) {
      const portraitX = panelLeft + 16 + PORTRAIT_SIZE / 2, portraitY = panelCenterY + 4;
      const frame = this.scene.add.rectangle(portraitX, portraitY, PORTRAIT_SIZE + 8, PORTRAIT_SIZE + 8, COLORS.panel, 0.98)
        .setScrollFactor(0).setStrokeStyle(2, COLORS.panelBorder, 0.85);
      const portrait = this.scene.textures.exists(PORTRAIT_KEY)
        ? this.scene.add.image(portraitX, portraitY, PORTRAIT_KEY).setScrollFactor(0).setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE)
        : this.scene.add.rectangle(portraitX, portraitY, PORTRAIT_SIZE, PORTRAIT_SIZE, 0xd7c58f, 0.3).setScrollFactor(0);
      const nameplate = this.scene.add.text(portraitX, portraitY + PORTRAIT_SIZE / 2 + 7, 'HQ', { fontFamily: FONT_PIXEL, fontSize: '8px', color: '#f2d477' }).setScrollFactor(0).setOrigin(0.5, 0);
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
    const skipText = this.scene.add.text(skipX, skipY, 'SKIP TUTORIAL ▸', { fontFamily: FONT_PIXEL, fontSize: '7px', color: '#d7c58f' }).setScrollFactor(0).setOrigin(0.5);
    skipButton.on('pointerover', () => skipText.setColor('#f2d477'));
    skipButton.on('pointerout', () => skipText.setColor('#d7c58f'));
    skipButton.on('pointerdown', (pointer, lx, ly, event) => { event?.stopPropagation?.(); this.skip(); });
    const toggleSize = 26, toggleX = skipX - skipW / 2 - 8 - toggleSize / 2;
    const toggleBorder = this.scene.add.rectangle(toggleX, skipY, toggleSize, toggleSize, COLORS.panel, 0.35).setScrollFactor(0).setStrokeStyle(1, COLORS.accent, 0.72);
    const toggleButton = this.scene.add.rectangle(toggleX, skipY, toggleSize, toggleSize, 0, 0.001).setScrollFactor(0).setInteractive({ useHandCursor: true });
    const toggleText = this.scene.add.text(toggleX, skipY, collapsed ? '+' : '–', { fontFamily: FONT_PIXEL, fontSize: '12px', color: '#d7c58f' }).setScrollFactor(0).setOrigin(0.5);
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
    this.stepNumberText?.setText(`CRIME CITY ${step.number}/${CRIME_TUTORIAL_STEPS.length}`);
    this.titleText?.setText(step.title); this.objectiveText?.setText(step.objective); this.hintText?.setText(step.hint);
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