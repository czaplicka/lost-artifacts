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
    super('HypothesisScene');

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

    this.ensureReconstructionState();

    this.claims = Array.isArray(
      gameState.reconstructedHeist.claims
    )
      ? gameState.reconstructedHeist.claims
      : [];

    /*
     * Każda misja ma dokładnie trzy claims:
     * - każde pytanie odpowiada jednemu skillowi złodzieja,
     * - każdy claim ma questionId i prompt,
     * - kolejność claims odpowiada correctOrder kart rozwiązania.
     */
    if (this.claims.length !== 3) {
      console.warn(
        '[HypothesisScene] Expected 3 reconstruction claims.',
        {
          claims: this.claims,
          reconstruction: gameState.reconstructedHeist
        }
      );
    }

    this.slotLabels = this.claims.length > 0
      ? this.claims.map(claim =>
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
      ? this.claims.map(claim =>
        claim.questionId || null
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

      onCardTap: cardIndex =>
        this.handleCardTap(cardIndex),

      onSlotTap: slotIndex =>
        this.handleSlotTap(slotIndex),

      onSlotRemove: slotIndex =>
        this.handleSlotRemove(slotIndex),

      onConfirm: () =>
        this.confirmTheory(),

      onClose: () =>
        this.closeScene()
    });

    this.boardUI.create();

    this.shutdownHandler = () => this.onShutdown();

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

    console.log('[HypothesisScene] Prepared reconstruction cards.', {
      correctCardIds: correctCards.map(card => card.id),
      distractorCardIds: distractorCards.map(card => card.id),
      availableCardIds: availableCards.map(card => card.id)
    });
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

    return HypothesisEvaluator.findUseForQuestion(
      card,
      questionId
    );
  }


  buildSlotSentence(card, slotIndex) {
    if (!card) {
      return '[ empty ]';
    }

    const questionId = this.getQuestionId(slotIndex);

    /*
     * Fallback obsługuje stare save'y bez `claims`.
     * W aktualnej misji zawsze mamy 3 questionId.
     */
    if (!questionId) {
      return card.item || '[ clue ]';
    }

    return HypothesisEvaluator.buildSlotSentence(
      card,
      questionId
    );
  }


  handleCardTap(cardIndex) {
    if (this.hypothesisState.uiLocked) {
      return;
    }

    const movement = this.hypothesisState.placeCard(
      cardIndex
    );

    if (!movement.ok) {
      this.handleMoveFailure(movement);
      return;
    }

    this.boardUI.refresh({
      animateCards: true
    });
  }


  handleSlotTap(slotIndex) {
    if (this.hypothesisState.uiLocked) {
      return;
    }

    const cardIndex =
      this.hypothesisState.getPlacedCardIndex(
        slotIndex
      );

    /*
     * Kliknięcie slotu z kartą usuwa kartę.
     * Kliknięcie pustego slotu wybiera pytanie,
     * do którego następna karta zostanie przypisana.
     */
    if (cardIndex !== null) {
      this.handleSlotRemove(slotIndex);
      return;
    }

    const result =
      this.hypothesisState.toggleSelectedSlot(
        slotIndex
      );

    if (!result.ok) {
      if (result.reason === 'slot_unavailable') {
        this.boardUI.showFeedback(
          'That answer is locked or already occupied.',
          '#ffb347'
        );
      }

      return;
    }

    this.boardUI.refresh();

    if (result.selected) {
      this.boardUI.showFeedback(
        `"${this.slotLabels[slotIndex]}" selected. Now choose a clue.`,
        '#ffd966'
      );
    } else {
      this.boardUI.showFeedback(
        'Question selection cleared.',
        '#ccb98c'
      );
    }
  }


  handleSlotRemove(slotIndex) {
    if (this.hypothesisState.uiLocked) {
      return;
    }

    const result =
      this.hypothesisState.removeCard(slotIndex);

    if (!result.ok) {
      if (result.reason === 'slot_locked') {
        this.boardUI.showFeedback(
          'That answer is confirmed and cannot be changed.',
          '#7CFC00'
        );
      } else if (result.reason === 'slot_empty') {
        this.boardUI.showFeedback(
          'Nothing to remove there.',
          '#ffb347'
        );
      }

      return;
    }

    this.boardUI.flashSlot(slotIndex);

    this.boardUI.refresh({
      animateCards: true
    });

    this.boardUI.showFeedback(
      `Card removed from "${this.slotLabels[slotIndex]}".`,
      '#f0ddb0'
    );
  }


  handleMoveFailure(result) {
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
      invalid_slot:
        'That question is unavailable.'
    };

    this.boardUI.showFeedback(
      messages[result.reason] ||
      'That move is not possible.',
      '#ffb347'
    );
  }


  confirmTheory() {
    if (
      this.hypothesisState.uiLocked ||
      !this.hypothesisState.isTimelineComplete()
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
      this.hypothesisState.lockGreenSlots(
        feedback
      );

    this.boardUI.refresh();

    /*
     * Zielony slot od razu ujawnia właściwe zdanie dla konkretnego pytania.
     * Dla annotated_floor_plan może to być inne zdanie przy
     * create_blind_spot i inne przy move_unnoticed.
     */
    newlyLockedSlots.forEach((slotIndex, index) => {
      const card = orderedCards[slotIndex];

      const use = this.getReconstructionUse(
        card,
        slotIndex
      );

      const narrative =
        use?.heistExplanation ||
        card?.heistExplanation ||
        '';

      if (narrative) {
        this.boardUI.showGreenNarrative(
          slotIndex,
          narrative,
          (index + 1) * 450
        );
      }
    });

    /*
     * Zużycie energii zostaje w scenie, ponieważ scena decyduje,
     * kiedy gracz faktycznie wykonał próbę minigry.
     */
    const energyResult =
      this.energyManager.consumeActivity(
        'minigame_mastermind'
      );

    if (energyResult.energyReachedZero) {
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
        message += `\n\n${
          HypothesisEvaluator.getFunnyLine(
            redHerringCard
          )
        }`;
      }

      this.boardUI.refresh();

      this.boardUI.showFeedback(
        message,
        evaluation.color
      );

      return;
    }

    /*
     * Ostatnia nieudana próba zużywa próbę,
     * ale przy exact nie odejmujemy jej po sukcesie.
     */
    if (evaluation.resultLabel !== 'exact') {
      this.hypothesisState.consumeAttempt();
    }

    this.finalizeTheory(
      orderedCards,
      evaluation
    );
  }


  finalizeTheory(orderedCards, evaluation) {
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

    this.hypothesisState.setUiLocked(true);

    this.boardUI.refresh();

    const feedbackMessage =
      evaluation.resultLabel === 'exact'
        ? evaluation.message
        : `${evaluation.message} +${evaluation.score} score`;

    this.boardUI.showFeedback(
      feedbackMessage,
      evaluation.color
    );

    this.time.delayedCall(900, () => {
      this.launchResultCommentScene();
    });

    return result;
  }


  restoreSourceScene() {
    const source =
      this.sourceScene || 'CityScene';

    if (!this.scene.manager.keys[source]) {
      console.warn(
        '[HypothesisScene] Source scene does not exist.',
        { source }
      );

      return;
    }

    if (this.scene.isSleeping(source)) {
      this.scene.wake(source);
    }

    if (this.scene.isPaused(source)) {
      this.scene.resume(source);
    }

    const sourceSceneRef = this.scene.get(source);

    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true;
      sourceSceneRef.input.setTopOnly(true);
    }
  }


  returnToSourceScene() {
    saveGameState();
    this.restoreSourceScene();
    this.scene.stop();
  }


  launchResultCommentScene() {
    saveGameState();

    const source =
      this.sourceScene || 'CityScene';

    if (!this.scene.manager.keys[source]) {
      console.error(
        '[HypothesisScene] Cannot launch result scene: source is missing.',
        { source }
      );

      this.scene.stop();
      return;
    }

    /*
     * TheoryResultCallScene działa nad sceną źródłową.
     * Najpierw ją budzimy, potem pauzujemy jej logikę,
     * aby tło było widoczne, ale nieinteraktywne.
     */
    if (this.scene.isSleeping(source)) {
      this.scene.wake(source);
    }

    if (
      this.scene.isActive(source) &&
      !this.scene.isPaused(source)
    ) {
      this.scene.pause(source);
    }

    this.scene.launch('TheoryResultCallScene', {
      sourceScene: source,
      mode: 'hq',
      result:
        gameState.reconstructedHeist
          ?.playerTheoryResult ||
        'weak'
    });

    this.scene.stop();
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
  }
}