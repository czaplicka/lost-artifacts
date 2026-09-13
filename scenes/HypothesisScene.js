import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { getScoreManager } from '../InvestigationManager.js';
import { BaseScene } from './BaseScene.js';
import { getEnergyManager } from '../EnergyManager.js';
import { HypothesisEvaluator } from '../HypothesisEvaluator.js';
import { HypothesisState } from '../HypothesisState.js';
import { HypothesisResultService } from '../HypothesisResultService.js';
import { HypothesisBoardUI } from '../ui/HypothesisBoardUI.js';

export class HypothesisScene extends BaseScene {
  constructor() {
    super({ key: 'HypothesisScene' });

    this.sourceScene = 'CityScene';
    this.cityId = null;
    this.sceneId = null;

    this.claims = [];
    this.slotLabels = [];
    this.slotQuestionIds = [];

    this.availableCards = [];
    this.correctCards = [];
    this.distractorCards = [];

    this.energyManager = null;
    this.scoreManager = null;

    this.hypothesisState = null;
    this.resultService = null;
    this.boardUI = null;

    this.shutdownHandler = null;
    this.isReturning = false;
    this.isLaunchingResult = false;
  }

  init(data = {}) {
    this.sourceScene = data.sourceScene || 'CityScene';

    this.cityId =
      data.cityId ||
      gameState.currentCityId ||
      gameState.crimeCityId ||
      gameState.reconstructedHeist?.cityId ||
      null;

    this.sceneId =
      data.sceneId ||
      gameState.reconstructedHeist?.sceneId ||
      null;

    this.isReturning = false;
    this.isLaunchingResult = false;

    this.ensureReconstructionState();

    this.claims = Array.isArray(
      gameState.reconstructedHeist.claims
    )
      ? gameState.reconstructedHeist.claims
      : [];

    if (this.claims.length !== 3) {
      console.warn(
        '[HypothesisScene] Expected exactly 3 reconstruction claims.',
        {
          claims: this.claims,
          reconstruction: gameState.reconstructedHeist
        }
      );
    }

    this.slotLabels = this.claims.length > 0
      ? this.claims.map(
        (claim) =>
          claim.prompt ||
          claim.questionId ||
          'UNKNOWN QUESTION'
      )
      : [
        'HOW DID THEY GET IN?',
        'HOW DID THEY DO IT?',
        'HOW DID THEY GET AWAY?'
      ];

    this.slotQuestionIds = this.claims.length > 0
      ? this.claims.map(
        (claim) => claim.questionId || null
      )
      : [null, null, null];

    this.scoreManager = getScoreManager();

    this.hypothesisState = new HypothesisState({
      reconstruction: gameState.reconstructedHeist,
      activeSlotCount: 3,
      attempts: 3
    });

    this.resultService = new HypothesisResultService({
      cityId: this.cityId,
      sceneId: this.sceneId,
      scoreManager: this.scoreManager
    });

    this.availableCards = [];
    this.correctCards = [];
    this.distractorCards = [];

    this.energyManager = null;
    this.boardUI = null;
    this.shutdownHandler = null;

    console.log('[HypothesisScene] init', {
      cityId: this.cityId,
      sceneId: this.sceneId,
      claims: this.claims,
      slotLabels: this.slotLabels,
      slotQuestionIds: this.slotQuestionIds
    });
  }

  create() {
    super.create();

    this.energyManager = getEnergyManager();

    this.prepareCards();

    if (this.availableCards.length < 6) {
      console.error(
        '[HypothesisScene] Not enough clue cards to start reconstruction.',
        {
          availableCards: this.availableCards,
          reconstruction: gameState.reconstructedHeist
        }
      );

      this.returnToSourceScene();
      return;
    }

    this.hypothesisState.setCards(this.availableCards);

    this.boardUI = new HypothesisBoardUI(this, {
      state: this.hypothesisState,
      cards: this.availableCards,
      slotLabels: this.slotLabels,

      buildSlotSentence: (card, slotIndex) =>
        this.buildSlotSentence(card, slotIndex),

      onCardTap: (cardIndex) =>
        this.handleCardTap(cardIndex),

      onSlotTap: (slotIndex) =>
        this.handleSlotTap(slotIndex),

      onSlotRemove: (slotIndex) =>
        this.handleSlotRemove(slotIndex),

      onConfirm: () =>
        this.confirmTheory(),

      onClose: () =>
        this.closeScene()
    });

    this.boardUI.create();

    this.shutdownHandler = () => {
      this.onShutdown();
    };

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.shutdownHandler
    );
  }

  ensureReconstructionState() {
    if (
      !gameState.reconstructedHeist ||
      typeof gameState.reconstructedHeist !== 'object'
    ) {
      gameState.reconstructedHeist = {};
    }
  }

  prepareCards() {
    const {
      correctCards,
      distractorCards,
      availableCards
    } = HypothesisEvaluator.prepareCards(
      gameState.reconstructedHeist,
      this.sceneId,
      this.cityId
    );

    this.correctCards = correctCards;
    this.distractorCards = distractorCards;
    this.availableCards = availableCards;

    console.log(
      '[HypothesisScene] Prepared reconstruction cards.',
      {
        correctCardIds: correctCards.map(
          (card) => card.id
        ),
        distractorCardIds: distractorCards.map(
          (card) => card.id
        ),
        availableCardIds: availableCards.map(
          (card) => card.id
        )
      }
    );
  }

  getQuestionId(slotIndex) {
    return this.slotQuestionIds[slotIndex] || null;
  }

  getClaim(slotIndex) {
    return this.claims[slotIndex] || null;
  }

  getReconstructionUse(card, slotIndex) {
    const questionId = this.getQuestionId(slotIndex);

    if (!card || !questionId) {
      return null;
    }

    const uses = Array.isArray(card.reconstructionUses)
      ? card.reconstructionUses
      : [];

    const matchingUse = uses.find((use) => {
      if (!use || typeof use !== 'object') {
        return false;
      }

      return use.questionId === questionId;
    });

    if (matchingUse) {
      return matchingUse;
    }

    if (card.questionId === questionId) {
      return {
        questionId,
        slotSentence:
          card.slotSentence ||
          card.answer ||
          card.item ||
          null,
        answer:
          card.answer ||
          card.slotSentence ||
          card.item ||
          null,
        heistExplanation:
          card.heistExplanation ||
          card.trueExplanation ||
          ''
      };
    }

    return null;
  }

  buildSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    const use = this.getReconstructionUse(
      card,
      slotIndex
    );

    if (use?.slotSentence) {
      return use.slotSentence;
    }

    if (use?.answer) {
      return use.answer;
    }

    if (use?.text) {
      return use.text;
    }

    if (use?.label) {
      return use.label;
    }

    if (card.slotSentence) {
      return card.slotSentence;
    }

    if (card.answer) {
      return card.answer;
    }

    return card.item || '[ clue ]';
  }

  handleCardTap(cardIndex) {
    if (this.hypothesisState?.uiLocked) {
      return;
    }

    const result = this.hypothesisState.selectCard(
      cardIndex
    );

    if (!result.ok) {
      this.handleMoveFailure(result);
      return;
    }

    const card = this.availableCards[cardIndex];

    this.boardUI?.refresh();

    this.boardUI?.showFeedback(
      result.selected
        ? `"${card?.item || 'Clue'}" selected. Now click a question.`
        : 'Clue selection cleared.',
      result.selected
        ? '#ffd966'
        : '#ccb98c'
    );
  }

  handleSlotTap(slotIndex) {
    if (this.hypothesisState?.uiLocked) {
      return;
    }

    const cardAlreadyInSlot =
      this.hypothesisState.getPlacedCardIndex(slotIndex);

    if (cardAlreadyInSlot !== null) {
      this.handleSlotRemove(slotIndex);
      return;
    }

    const selectedCardIndex =
      this.hypothesisState.selectedCardIndex;

    if (
      selectedCardIndex !== null &&
      selectedCardIndex !== undefined
    ) {
      const result =
        this.hypothesisState.placeSelectedCard(slotIndex);

      if (!result.ok) {
        this.handleMoveFailure(result);
        return;
      }

      this.boardUI?.refresh();

      this.boardUI?.showFeedback(
        `"${this.slotLabels[slotIndex]}" answered.`,
        '#f0ddb0'
      );

      return;
    }

    const result =
      this.hypothesisState.toggleSelectedSlot(slotIndex);

    if (!result.ok) {
      this.handleMoveFailure(result);
      return;
    }

    this.boardUI?.refresh();

    this.boardUI?.showFeedback(
      result.selected
        ? `"${this.slotLabels[slotIndex]}" selected. Choose a clue below.`
        : 'Question selection cleared.',
      result.selected
        ? '#ffd966'
        : '#ccb98c'
    );
  }

  handleSlotRemove(slotIndex) {
    if (this.hypothesisState?.uiLocked) {
      return;
    }

    const result =
      this.hypothesisState.removeCard(slotIndex);

    if (!result.ok) {
      if (result.reason === 'slot_locked') {
        this.boardUI?.showFeedback(
          'That answer is confirmed and cannot be changed.',
          '#7CFC00'
        );
      } else if (result.reason === 'slot_empty') {
        this.boardUI?.showFeedback(
          'Nothing to remove there.',
          '#ffb347'
        );
      }

      return;
    }

    this.boardUI?.flashSlot(slotIndex);
    this.boardUI?.refresh();

    this.boardUI?.showFeedback(
      `Answer removed from "${this.slotLabels[slotIndex]}".`,
      '#f0ddb0'
    );
  }

  handleMoveFailure(result = {}) {
    const messages = {
      ui_locked:
        'The reconstruction has already been submitted.',

      invalid_card:
        'That clue is unavailable.',

      no_available_slot:
        'Every question already has an answer. Remove one first.',

      target_slot_locked:
        'That answer is confirmed. Choose another question.',

      card_locked:
        'This clue is locked into a confirmed answer.',

      card_already_used:
        'That clue has already been assigned to a question.',

      no_card_selected:
        'Select a clue from the evidence tray first.',

      slot_occupied:
        'That question already has an answer. Remove it first.',

      slot_locked:
        'That answer is confirmed and cannot be changed.',

      invalid_slot:
        'That question is unavailable.',

      slot_unavailable:
        'That question is locked or already has an answer.'
    };

    this.boardUI?.showFeedback(
      messages[result.reason] ||
      'That move is not possible.',
      '#ffb347'
    );
  }

  confirmTheory() {
    if (
      this.hypothesisState?.uiLocked ||
      !this.hypothesisState?.isTimelineComplete()
    ) {
      return;
    }

    const orderedCards =
      this.hypothesisState.getOrderedCards();

    const feedback =
      HypothesisEvaluator.evaluateGuess(
        orderedCards,
        this.hypothesisState.activeSlotCount
      );

    this.hypothesisState.setFeedback(feedback);

    const newlyLockedSlots =
      this.hypothesisState.lockGreenSlots(feedback);

    this.boardUI?.refresh();

    newlyLockedSlots.forEach((slotIndex, index) => {
      const card = orderedCards[slotIndex];

      const use = this.getReconstructionUse(
        card,
        slotIndex
      );

      const narrative =
        use?.heistExplanation ||
        card?.heistExplanation ||
        card?.trueExplanation ||
        '';

      if (narrative) {
        this.boardUI?.showGreenNarrative(
          slotIndex,
          narrative,
          (index + 1) * 450
        );
      }
    });

    const energyResult =
      this.energyManager?.consumeActivity(
        'minigame_mastermind'
      );

    if (energyResult?.energyReachedZero) {
      saveGameState();
      this.returnToSourceScene();
      return;
    }

    const evaluation =
      HypothesisEvaluator.determineResult(
        feedback,
        this.hypothesisState.attemptsLeft - 1
      );

    if (!evaluation.isFinal) {
      this.hypothesisState.consumeAttempt();

      const redHerringCard = orderedCards.find(
        (card, index) =>
          feedback[index] === 'red' &&
          card?.isRedHerring
      );

      let message = evaluation.message;

      if (redHerringCard) {
        message += `\n\n${HypothesisEvaluator.getFunnyLine(
          redHerringCard
        )}`;
      }

      this.boardUI?.refresh();

      this.boardUI?.showFeedback(
        message,
        evaluation.color
      );

      return;
    }

    if (evaluation.resultLabel !== 'exact') {
      this.hypothesisState.consumeAttempt();
    }

    this.finalizeTheory(
      orderedCards,
      evaluation
    );
  }

finalizeTheory(orderedCards, evaluation) {
  this.hypothesisState.setUiLocked(true);

  const result =
    this.resultService.finalizeTheory({
        orderedCards,
        slotFeedback:
          this.hypothesisState.slotFeedback,
        attemptsLeft:
          this.hypothesisState.attemptsLeft,
        resultLabel:
          evaluation.resultLabel,
        score:
          evaluation.score
      });

    this.boardUI?.refresh();

    const feedbackMessage =
      evaluation.resultLabel === 'exact'
        ? evaluation.message
        : `${evaluation.message} +${evaluation.score} score`;

    this.boardUI?.showFeedback(
      feedbackMessage,
      evaluation.color
    );

    this.time.delayedCall(900, () => {
      if (!this.sys.isActive()) {
        return;
      }

      void this.launchResultCommentScene();
    });

    return result;
  }

  restoreSourceScene() {
    const source = this.sourceScene || 'CityScene';

    if (!this.hasScene(source)) {
      console.warn(
        '[HypothesisScene] Source scene does not exist.',
        { source }
      );

      return false;
    }

    if (this.isSceneSleeping(source)) {
      this.scene.wake(source);
    }

    if (this.isScenePaused(source)) {
      this.scene.resume(source);
    }

    const sourceSceneRef =
      this.scene.manager.keys[source];

    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true;
      sourceSceneRef.input.setTopOnly(true);
    }

    return true;
  }

  returnToSourceScene() {
    if (this.isReturning) {
      return;
    }

    this.isReturning = true;

    saveGameState();

    this.restoreSourceScene();

    this.scene.stop();
  }

  async launchResultCommentScene() {
    if (this.isLaunchingResult) {
      return;
    }

    this.isLaunchingResult = true;

    saveGameState();

    const source = this.sourceScene || 'CityScene';

    if (!this.hasScene(source)) {
      console.error(
        '[HypothesisScene] Cannot launch result scene: source is missing.',
        { source }
      );

      this.scene.stop();
      return;
    }

    if (this.isSceneSleeping(source)) {
      this.scene.wake(source);
    }

    if (
      this.isSceneActive(source) &&
      !this.isScenePaused(source)
    ) {
      this.scene.pause(source);
    }

    const launched = await this.launchOverlay(
      'TheoryResultCallScene',
      {
        sourceScene: source,
        mode: 'hq',
        result:
          gameState.reconstructedHeist
            ?.playerTheoryResult ||
          'weak'
      }
    );

    if (!launched) {
      console.error(
        '[HypothesisScene] TheoryResultCallScene could not be launched.'
      );

      this.restoreSourceScene();
      this.isLaunchingResult = false;
      return;
    }

    if (this.sys.isActive()) {
      this.scene.stop();
    }
  }

  closeScene() {
    this.returnToSourceScene();
  }

  onShutdown() {
    this.boardUI?.destroy();

    this.boardUI = null;
    this.energyManager = null;
    this.hypothesisState = null;
    this.resultService = null;

    this.availableCards = [];
    this.correctCards = [];
    this.distractorCards = [];

    this.claims = [];
    this.slotLabels = [];
    this.slotQuestionIds = [];

    this.shutdownHandler = null;
    this.isReturning = false;
    this.isLaunchingResult = false;

    this.game.events.emit('setHudVisible', true);
  }
}