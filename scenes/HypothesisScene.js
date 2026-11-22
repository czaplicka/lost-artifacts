import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { saveGameState, flushAutosave } from '../gameStatePersistence.js';
import { getScoreManager } from '../managers/InvestigationManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../managers/EnergyManager.js';
import { HypothesisEvaluator } from '../HypothesisEvaluator.js';
import { HypothesisState } from '../HypothesisState.js';
import { HypothesisResultService } from '../HypothesisResultService.js';
import { HypothesisBoardUI } from '../ui/HypothesisBoardUI.js';
import { CrimeCityTutorial, advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { recordHeistAttempt } from '../systems/InvestigationAudit.js';

const text = key => __dialogueText('scenes/HypothesisScene.js', key);
const transientSource = key => ['PhoneCallScene', 'HypothesisScene', 'TheoryResultCallScene'].includes(key);

export class HypothesisScene extends BaseScene {
  constructor() {
    super({ key: 'HypothesisScene' });
    this.sourceScene = 'CityScene'; this.returnScene = 'CityScene'; this.returnData = {};
    this.cityId = null; this.sceneId = null;
    this.claims = []; this.slotLabels = []; this.slotQuestionIds = [];
    this.availableCards = []; this.correctCards = []; this.distractorCards = [];
    this.energyManager = null; this.scoreManager = null; this.hypothesisState = null;
    this.resultService = null; this.boardUI = null; this.crimeTutorial = null;
    this._hypothesisRun = null; this._resultTimer = null;
    this.isReturning = false; this.isLaunchingResult = false; this.energyConsumed = false;
    this._finalized = false; this._confirming = false; this._committing = false; this._commitFailed = false;
  }
  init(data = {}) {
    this.destroyCrimeTutorial(); this._resultTimer?.remove(false); this._resultTimer = null;
    this._hypothesisRun = Symbol('hypothesis');
    this.cityId = data.cityId || gameState.currentCityId || gameState.crimeCityId || gameState.reconstructedHeist?.cityId || null;
    this.sceneId = data.sceneId || gameState.reconstructedHeist?.sceneId || null;
    const requested = data.returnScene || data.sourceScene || 'CityScene';
    this.returnScene = transientSource(requested) ? 'CrimeCityScene' : requested;
    this.sourceScene = this.returnScene;
    this.returnData = { ...(data.returnData || {}) };
    if (this.cityId != null) this.returnData.cityId = this.cityId;
    this.isReturning = false; this.isLaunchingResult = false; this.energyConsumed = false;
    this._finalized = false; this._confirming = false; this._committing = false; this._commitFailed = false;
    this.ensureReconstructionState();
    this.claims = Array.isArray(gameState.reconstructedHeist.claims) ? gameState.reconstructedHeist.claims : [];
    if (this.claims.length !== 3) console.warn('[HypothesisScene] Expected exactly 3 reconstruction claims.', this.claims);
    this.slotLabels = this.claims.length ? this.claims.map(c => c.prompt || c.questionId || text('t_3d4821e17b5677673e55')) :
      [text('t_fee8181d07a55905cd68'), text('t_810fa3b5d9418487cfa9'), text('t_aa53cb64f826209cc1ec')];
    this.slotQuestionIds = this.claims.length ? this.claims.map(c => c.questionId || null) : [null, null, null];
    this.scoreManager = getScoreManager();
    this.hypothesisState = new HypothesisState({ reconstruction: gameState.reconstructedHeist, activeSlotCount: 3, attempts: 3 });
    this.resultService = new HypothesisResultService({ cityId: this.cityId, sceneId: this.sceneId, scoreManager: this.scoreManager });
    this.availableCards = []; this.correctCards = []; this.distractorCards = [];
    this.energyManager = null; this.boardUI = null;
  }
  isCurrentHypothesisRun(token) {
    return token === this._hypothesisRun && token != null && !this._cleanupDone && this.sys.isActive();
  }
  create() {
    super.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.energyManager = getEnergyManager();
    if (!this.energyManager) console.warn('[HypothesisScene] EnergyManager unavailable.');
    // An automatically opened phone leaves the city running underneath.
    if (this.isSceneActive(this.returnScene)) this.scene.pause(this.returnScene);
    this.prepareCards();
    if (this.availableCards.length < 6) {
      console.error('[HypothesisScene] Not enough clue cards.', this.availableCards);
      void this.returnToSourceScene(); return;
    }
    this.hypothesisState.setCards(this.availableCards);
    this.boardUI = new HypothesisBoardUI(this, {
      state: this.hypothesisState, cards: this.availableCards, slotLabels: this.slotLabels,
      buildSlotSentence: (card, index) => this.buildSlotSentence(card, index),
      onCardTap: index => this.handleCardTap(index), onSlotTap: index => this.handleSlotTap(index),
      onSlotRemove: index => this.handleSlotRemove(index), onConfirm: () => this.confirmTheory(),
      onClose: () => this.closeScene()
    });
    this.boardUI.create(); this.startCrimeTutorial();
  }
  startCrimeTutorial() {
    this.destroyCrimeTutorial(); const saved = gameState.onboarding?.crimeCity;
    if (!saved || saved.completed || saved.step !== 'hypothesis') return;
    this.crimeTutorial = new CrimeCityTutorial(this, gameState); this.crimeTutorial.start();
  }
  destroyCrimeTutorial() {
    if (!this.crimeTutorial) return;
    try { this.crimeTutorial.destroy(); } catch (error) { console.warn('[HypothesisScene] Tutorial cleanup failed:', error); }
    this.crimeTutorial = null;
  }
  ensureReconstructionState() {
    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') gameState.reconstructedHeist = {};
  }
  prepareCards() {
    const data = HypothesisEvaluator.prepareCards(gameState.reconstructedHeist, this.sceneId, this.cityId);
    this.correctCards = data.correctCards; this.distractorCards = data.distractorCards; this.availableCards = data.availableCards;
  }
  getQuestionId(index) { return this.slotQuestionIds[index] || null; }
  getClaim(index) { return this.claims[index] || null; }
  getReconstructionUse(card, index) {
    const questionId = this.getQuestionId(index); if (!card || !questionId) return null;
    const uses = Array.isArray(card.reconstructionUses) ? card.reconstructionUses : [];
    const match = uses.find(u => u && typeof u === 'object' && u.questionId === questionId);
    if (match) return match;
    if (card.questionId === questionId) return { questionId, slotSentence: card.slotSentence || card.answer || card.item || null,
      answer: card.answer || card.slotSentence || card.item || null, heistExplanation: card.heistExplanation || card.trueExplanation || '' };
    return null;
  }
  buildSlotSentence(card, index) {
    if (!card) return text('t_41953e69788775d57264');
    const use = this.getReconstructionUse(card, index);
    return use?.slotSentence || use?.answer || use?.text || use?.label || card.slotSentence || card.answer || card.item || text('t_fc550bcc0aacb76e2101');
  }
  canEditBoard() { return Boolean(this.hypothesisState && !this.hypothesisState.uiLocked && !this._finalized && !this._commitFailed); }
  handleCardTap(index) {
    if (!this.canEditBoard()) return;
    const result = this.hypothesisState.selectCard(index); if (!result.ok) { this.handleMoveFailure(result); return; }
    const card = this.availableCards[index]; this.boardUI?.refresh();
    this.boardUI?.showFeedback(result.selected ? `${text('t_8a331fdde7032f33a71e')}${card?.item || text('t_4faf9cda1911b5d77cee')}${text('t_d1174dfaf3a4d15405ba')}` : text('t_0f27a5c97b23a680c024'), result.selected ? '#ffd966' : '#ccb98c');
  }
  handleSlotTap(index) {
    if (!this.canEditBoard()) return;
    if (this.hypothesisState.getPlacedCardIndex(index) !== null) { this.handleSlotRemove(index); return; }
    const selected = this.hypothesisState.selectedCardIndex;
    if (selected !== null && selected !== undefined) {
      const result = this.hypothesisState.placeSelectedCard(index); if (!result.ok) { this.handleMoveFailure(result); return; }
      this.boardUI?.refresh(); this.boardUI?.showFeedback(`${text('t_8a331fdde7032f33a71e')}${this.slotLabels[index]}${text('t_2d05ba1c749040be03b8')}`, '#f0ddb0'); return;
    }
    const result = this.hypothesisState.toggleSelectedSlot(index); if (!result.ok) { this.handleMoveFailure(result); return; }
    this.boardUI?.refresh(); this.boardUI?.showFeedback(result.selected ? `${text('t_8a331fdde7032f33a71e')}${this.slotLabels[index]}${text('t_1247a72bebb12f4944d9')}` : text('t_4128268b4fd04d62ee05'), result.selected ? '#ffd966' : '#ccb98c');
  }
  handleSlotRemove(index) {
    if (!this.canEditBoard()) return;
    const result = this.hypothesisState.removeCard(index);
    if (!result.ok) {
      if (result.reason === 'slot_locked') this.boardUI?.showFeedback(text('t_fcbf48f2a4419b240e37'), '#7CFC00');
      else if (result.reason === 'slot_empty') this.boardUI?.showFeedback(text('t_314db98846d962650a52'), '#ffb347');
      return;
    }
    this.boardUI?.flashSlot(index); this.boardUI?.refresh();
    this.boardUI?.showFeedback(`${text('t_eddff93b68907f304232')}${this.slotLabels[index]}${text('t_1e4a1452ad4db45827a1')}`, '#f0ddb0');
  }
  handleMoveFailure(result = {}) {
    const messages = { ui_locked: text('t_45e5dc057742c591e23b'), invalid_card: text('t_e65022e757f394b5d378'),
      no_available_slot: text('t_85e09551dfe0bb1d32d8'), target_slot_locked: text('t_720049dcf48f15a5a85f'),
      card_locked: text('t_f4daee963fa0dd3cafc2'), card_already_used: text('t_79d6876e1c53e0fe5a17'),
      no_card_selected: text('t_caf688e6b5146e4de198'), slot_occupied: text('t_27b3283f30d767e13a68'),
      slot_locked: text('t_fcbf48f2a4419b240e37'), invalid_slot: text('t_da75dedab035ad2c9638'), slot_unavailable: text('t_3e09a0d43b927ad09dcf') };
    this.boardUI?.showFeedback(messages[result.reason] || text('t_ea75bdc0365577055b9f'), '#ffb347');
  }
  showEnergyFailure(result = {}) {
    const message = result.message || 'Not enough energy to submit the reconstruction. Rest, then try again.';
    this.boardUI?.showFeedback(message, '#ffb347');
  }
  confirmTheory() {
    if (this._confirming || this._committing || this._finalized || this._commitFailed || this.isReturning ||
      this.hypothesisState?.uiLocked || !this.hypothesisState?.isTimelineComplete() || gameState.caseFailed) return false;
    this._confirming = true;
    try {
      const orderedCards = this.hypothesisState.getOrderedCards();
      const feedback = HypothesisEvaluator.evaluateGuess(orderedCards, this.hypothesisState.activeSlotCount);
      const allGreen = feedback.every(color => color === 'green');
      const remaining = allGreen ? this.hypothesisState.attemptsLeft : Math.max(0, this.hypothesisState.attemptsLeft - 1);
      const evaluation = HypothesisEvaluator.determineResult(feedback, remaining);
      // Pay before changing attempts/locks, so a failed final submission is retryable.
      if (evaluation.isFinal) {
        const payment = this.consumeMastermindEnergy();
        if (!payment?.success) { this.showEnergyFailure(payment); return false; }
        if (gameState.caseFailed) return false;
      }
      recordHeistAttempt(gameState, { cityId: this.cityId, sceneId: this.sceneId, orderedCards, feedback, claims: this.claims });
      saveGameState();
      this.hypothesisState.setFeedback(feedback);
      const locked = this.hypothesisState.lockGreenSlots(feedback); this.boardUI?.refresh();
      locked.forEach((slotIndex, index) => {
        const card = orderedCards[slotIndex], use = this.getReconstructionUse(card, slotIndex);
        const narrative = use?.heistExplanation || card?.heistExplanation || card?.trueExplanation || '';
        if (narrative) this.boardUI?.showGreenNarrative(slotIndex, narrative, (index + 1) * 450);
      });
      if (!allGreen) this.hypothesisState.consumeAttempt();
      if (!evaluation.isFinal) {
        const redHerring = orderedCards.find((card, index) => feedback[index] === 'red' && card?.isRedHerring);
        let message = evaluation.message;
        if (redHerring) message += `\n\n${HypothesisEvaluator.getFunnyLine(redHerring)}`;
        this.boardUI?.refresh(); this.boardUI?.showFeedback(message, evaluation.color); return true;
      }
      return this.finalizeTheory(orderedCards, evaluation);
    } finally { this._confirming = false; }
  }
  consumeMastermindEnergy() {
    if (this.energyConsumed) return { success: true, skipped: true, reason: 'already_consumed' };
    if (!this.energyManager) return { success: false, reason: 'energy_manager_unavailable' };
    const result = this.energyManager.consumeActivity('minigame_mastermind');
    if (result?.success) this.energyConsumed = true;
    return result;
  }
  finalizeTheory(orderedCards, evaluation) {
    if (this._finalized || this._committing || this._commitFailed || gameState.caseFailed) return false;
    const payment = this.consumeMastermindEnergy();
    if (!payment?.success) { this.showEnergyFailure(payment); return false; }
    if (gameState.caseFailed) return false;
    this._committing = true; this.hypothesisState.setUiLocked(true);
    try {
      const before = this.scoreManager.getSessionPoints();
      const result = this.resultService.finalizeTheory({ orderedCards, slotFeedback: this.hypothesisState.slotFeedback,
        attemptsLeft: this.hypothesisState.attemptsLeft, resultLabel: evaluation.resultLabel, score: evaluation.score });
      this._finalized = true;
      const delta = this.scoreManager.getSessionPoints() - before;
      this.destroyCrimeTutorial(); advanceCrimeTutorial(gameState, 'hypothesis'); this.boardUI?.refresh();
      const message = evaluation.message + `${text('t_c2d850d8e4c374db099f')}${delta > 0 ? '+' : ''}${delta}`;
      this.boardUI?.showFeedback(message, evaluation.color); saveGameState();
      const token = this._hypothesisRun;
      this._resultTimer = this.time.delayedCall(900, () => {
        this._resultTimer = null;
        if (this.isCurrentHypothesisRun(token)) void this.launchResultCommentScene();
      });
      return result;
    } catch (error) {
      // A result-service exception may have partially changed state: do not repeat awards.
      this._commitFailed = true;
      console.error('[HypothesisScene] Could not finalize reconstruction:', error);
      this.hypothesisState?.setUiLocked(false); this.boardUI?.refresh();
      this.boardUI?.showFeedback('The reconstruction could not be finalized. Close the board to return to the city.', '#ffb347');
      return false;
    } finally { this._committing = false; }
  }

  async restoreSourceScene({ pause = false } = {}) {
    const token = this._hypothesisRun, source = this.returnScene || 'CrimeCityScene';
    try {
      if (this.isSceneSleeping(source)) this.scene.wake(source, this.returnData);
      else if (!this.isSceneActive(source) && !this.isScenePaused(source)) {
        // Covers both a registered-but-stopped source and a lazy-loaded source.
        const opened = await this.launchOverlay(source, { ...this.returnData });
        if (!opened || !this.isCurrentHypothesisRun(token)) return false;
      }
      if (!this.isCurrentHypothesisRun(token)) return false;
      // Queue behind a possible launch/wake; do not assume CREATE has already run.
      if (pause) this.scene.pause(source);
      else this.scene.resume(source, this.returnData);
      const ref = this.scene.manager.keys[source];
      if (!pause && ref?.input) { ref.input.enabled = true; ref.input.setTopOnly(true); }
      return true;
    } catch (error) { console.error('[HypothesisScene] Return scene preparation failed:', error); return false; }
  }
  async returnToSourceScene() {
    if (this.isReturning || this.isLaunchingResult || this._committing) return false;
    const token = this._hypothesisRun;
    this.isReturning = true; this._resultTimer?.remove(false); this._resultTimer = null;
    flushAutosave();
    const restored = await this.restoreSourceScene();
    if (!this.isCurrentHypothesisRun(token)) return false;
    if (!restored) {
      this.isReturning = false; this.hypothesisState?.setUiLocked(false); this.boardUI?.refresh();
      this.scene.bringToTop(this.sys.settings.key);
      this.boardUI?.showFeedback('Could not return to the city. Please try closing the board again.', '#ffb347');
      return false;
    }
    this.destroyCrimeTutorial(); this.scene.stop(); return true;
  }
  async launchResultCommentScene() {
    if (this.isLaunchingResult || this.isReturning || !this._finalized) return false;
    const token = this._hypothesisRun;
    this.isLaunchingResult = true; flushAutosave();
    try {
      const ready = await this.restoreSourceScene({ pause: true });
      if (!this.isCurrentHypothesisRun(token)) return false;
      if (!ready) throw new Error('Return scene is unavailable.');
      const launched = await this.launchOverlay('TheoryResultCallScene', {
        sourceScene: this.returnScene, mode: 'hq', result: gameState.reconstructedHeist?.playerTheoryResult || 'weak'
      });
      if (!this.isCurrentHypothesisRun(token)) return false;
      if (!launched) throw new Error('Assessment scene could not be launched.');
      this.scene.stop(); return true;
    } catch (error) {
      if (!this.isCurrentHypothesisRun(token)) return false;
      console.error('[HypothesisScene] Assessment launch failed:', error);
      if (this.hasScene(this.returnScene)) this.scene.resume(this.returnScene, this.returnData);
      this.scene.bringToTop(this.sys.settings.key);
      this.hypothesisState?.setUiLocked(false); this.boardUI?.refresh();
      this.boardUI?.showFeedback('Your reconstruction is saved. Close the board to return to the city.', '#ffb347');
      return false;
    } finally { if (this._hypothesisRun === token) this.isLaunchingResult = false; }
  }
  closeScene() { void this.returnToSourceScene(); }
  onShutdown() {
    if (this._hypothesisRun === null) return;
    this._hypothesisRun = null;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this._resultTimer?.remove(false); this._resultTimer = null;
    this.destroyCrimeTutorial(); this.boardUI?.destroy(); this.boardUI = null;
    this.energyManager = null; this.hypothesisState = null; this.resultService = null;
    this.availableCards = []; this.correctCards = []; this.distractorCards = [];
    this.claims = []; this.slotLabels = []; this.slotQuestionIds = [];
    this.energyConsumed = false; this.game.events.emit('setHudVisible', true);
  }
}
