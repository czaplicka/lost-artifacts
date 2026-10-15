import { gameState } from './GameData.js';
import { saveGameState } from './GameStatePersistence.js';
import { getScoreManager } from './managers/InvestigationManager.js';
import {
  applyHypothesisSkills,
  getSuspectCaseSummary
} from '../ui/suspectUtils.js';

export class HypothesisResultService {
  constructor({
    cityId = null,
    sceneId = null,
    scoreManager = null
  } = {}) {
    this.cityId = cityId;
    this.sceneId = sceneId;
    this.scoreManager = scoreManager || getScoreManager();
  }

  finalizeTheory({
    orderedCards = [],
    slotFeedback = [],
    attemptsLeft = 0,
    resultLabel = 'weak',
    score = 0
  } = {}) {
    const reconstruction = this.ensureReconstructionState();

    const safeCards = Array.isArray(orderedCards)
      ? orderedCards.filter(Boolean)
      : [];

    const orderedSentences = safeCards.map(
      card => card.item || 'Unknown clue'
    );

    const orderedItems = safeCards.map(card => ({
      id: card.id,
      item: card.item,
      text: card.item,
      skills: Array.isArray(card.skills)
        ? [...card.skills]
        : [],
      isCorrect: Boolean(card.isCorrect),
      correctOrder: Number.isInteger(card.correctOrder)
        ? card.correctOrder
        : -1,
      questionId: card.questionId || null,
      heistExplanation: card.heistExplanation || '',
      trueExplanation: card.trueExplanation || '',
      reconstructionUses: Array.isArray(card.reconstructionUses)
        ? card.reconstructionUses.map(use => ({
            questionId: use.questionId || null,
            skills: Array.isArray(use.skills)
              ? [...use.skills]
              : [],
            heistExplanation: use.heistExplanation || ''
          }))
        : []
    }));

    const finalText = orderedSentences.join(' → ');
    const playerSkills = this.collectUniqueSkills(safeCards);
    const narrativeLines = this.buildNarrativeLines(
      safeCards,
      reconstruction
    );

    reconstruction.playerOrderedCards = orderedItems;
    reconstruction.playerOrderedSentences = orderedSentences;
    reconstruction.playerFinalText = finalText;
    reconstruction.playerSkills = playerSkills;
    reconstruction.playerTheoryScore = score;
    reconstruction.playerTheoryResult = resultLabel;
    reconstruction.playerSlotFeedback = Array.isArray(slotFeedback)
      ? [...slotFeedback]
      : [];
    reconstruction.playerAttemptsLeft = Math.max(
      0,
      Number(attemptsLeft) || 0
    );
    reconstruction.playerNarrative = narrativeLines;

    reconstruction.confirmedSkills = [];
    reconstruction.confirmedItemIds = [];
    reconstruction.hypothesisConfirmed = false;
    reconstruction.hypothesisSuspectFilterResult = null;

    const confirmedSkills = this.getConfirmedSkills(
      reconstruction
    );

    const hasConfirmedSkills =
      confirmedSkills.length === 3;

    const confirmedItemIds = this.getConfirmedItemIds(
      safeCards,
      reconstruction
    );

    const hasConfirmedItems =
      confirmedItemIds.length === 3;

    const isExactTheory =
      resultLabel === 'exact';

    const canConfirmTheory =
      isExactTheory &&
      hasConfirmedSkills &&
      hasConfirmedItems;

    if (canConfirmTheory) {
      this.applyExactResult({
        reconstruction,
        confirmedSkills,
        confirmedItemIds
      });
    } else if (isExactTheory) {
      console.error(
        '[HypothesisResultService] Exact theory completed, but confirmation data are incomplete.',
        {
          confirmedSkills,
          confirmedItemIds,
          hypothesisEvidence: gameState.hypothesisEvidence,
          reconstruction,
          orderedCards: safeCards
        }
      );

      /*
       * Nie uznajemy hipotezy za potwierdzoną, jeżeli nie mamy:
       * - trzech skillów sprawcy,
       * - trzech ID rzeczywiście użytych przedmiotów.
       *
       * Dzięki temu Crime Board nie ukryje dowodów na podstawie
       * niepełnych danych.
       */
      reconstruction.confirmedSkills = [];
      reconstruction.confirmedItemIds = [];
      reconstruction.hypothesisConfirmed = false;

      this.clearConfirmedHypothesisEvidence();
    }

    const skillsForNotes = canConfirmTheory
      ? confirmedSkills
      : playerSkills;

    this.appendTheoryToNotes(
      finalText,
      skillsForNotes,
      resultLabel,
      narrativeLines
    );

    this.storeTheorySkills(skillsForNotes);

    const finalScore = this.applyScore(
      score,
      resultLabel
    );

    saveGameState();

    return {
      reconstruction,
      resultLabel,
      score,
      finalScore,
      finalText,
      orderedCards: orderedItems,
      playerSkills,
      confirmedSkills: canConfirmTheory
        ? confirmedSkills
        : [],
      confirmedItemIds: canConfirmTheory
        ? confirmedItemIds
        : [],
      narrativeLines,
      suspectFilterResult:
        reconstruction.hypothesisSuspectFilterResult
    };
  }

  ensureReconstructionState() {
    if (
      !gameState.reconstructedHeist ||
      typeof gameState.reconstructedHeist !== 'object'
    ) {
      gameState.reconstructedHeist = {};
    }

    return gameState.reconstructedHeist;
  }

  getConfirmedSkills(reconstruction = null) {
    const safeReconstruction =
      reconstruction &&
      typeof reconstruction === 'object'
        ? reconstruction
        : gameState.reconstructedHeist || {};

    const legacySkills =
      gameState.hypothesisEvidence?.requiredSkills;

    const generatedSkills =
      safeReconstruction.requiredSkills;

    const thiefSkills =
      Array.isArray(safeReconstruction.thiefSkills)
        ? safeReconstruction.thiefSkills
        : typeof safeReconstruction.thiefSkills === 'string'
          ? safeReconstruction.thiefSkills
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean)
          : [];

    const sourceSkills =
      Array.isArray(legacySkills) && legacySkills.length > 0
        ? legacySkills
        : Array.isArray(generatedSkills) &&
          generatedSkills.length > 0
          ? generatedSkills
          : thiefSkills;

    const confirmedSkills = [
      ...new Set(
        sourceSkills
          .filter(Boolean)
          .map(skill => String(skill).trim())
          .filter(Boolean)
      )
    ].slice(0, 3);

    /*
     * Kompatybilność ze starszymi systemami:
     * SuspectUtils i inne sceny mogą nadal czytać
     * gameState.hypothesisEvidence.requiredSkills.
     */
    if (confirmedSkills.length === 3) {
      gameState.hypothesisEvidence = {
        ...(gameState.hypothesisEvidence || {}),
        requiredSkills: [...confirmedSkills],
        missionId: safeReconstruction.missionId || null,
        cityId: safeReconstruction.cityId || this.cityId || null,
        sceneId: safeReconstruction.sceneId || this.sceneId || null,
        source: 'hypothesis_reconstruction'
      };
    }

    return confirmedSkills;
  }

  getConfirmedItemIds(cards = [], reconstruction = {}) {
    const safeCards = Array.isArray(cards)
      ? cards.filter(Boolean)
      : [];

    /*
     * Najpierw próbujemy odczytać ID rozwiązania wygenerowanego
     * przez ReconstructionGenerator / dane misji.
     */
    const generatedSolutionIds = [
      ...this.asArray(reconstruction.solutionItemIds),
      ...this.asArray(reconstruction.correctItemIds),
      ...this.asArray(reconstruction.requiredItemIds),
      ...this.asArray(reconstruction.confirmedItemIds)
    ]
      .map(id => this.safeId(id))
      .filter(Boolean);

    if (generatedSolutionIds.length >= 3) {
      return this.uniqueStrings(generatedSolutionIds).slice(0, 3);
    }

    /*
     * Fallback dla obecnej sceny:
     * skoro wynik jest "exact", trzy karty w orderedCards są
     * właściwą sekwencją ENTRY → ACCESS → ESCAPE.
     */
    const exactCards = safeCards
      .filter(card => {
        if (card.isCorrect === false) {
          return false;
        }

        return Boolean(card.id);
      })
      .map(card => this.safeId(card.id))
      .filter(Boolean);

    return this.uniqueStrings(exactCards).slice(0, 3);
  }

  applyExactResult({
    reconstruction,
    confirmedSkills,
    confirmedItemIds
  }) {
    if (
      confirmedSkills.length !== 3 ||
      confirmedItemIds.length !== 3
    ) {
      console.error(
        '[HypothesisResultService] Exact theory completed, but confirmation data are incomplete.',
        {
          confirmedSkills,
          confirmedItemIds,
          hypothesisEvidence: gameState.hypothesisEvidence,
          reconstruction
        }
      );

      return;
    }

    const completedAt = Date.now();

    reconstruction.confirmedSkills = [...confirmedSkills];
    reconstruction.confirmedItemIds = [...confirmedItemIds];
    reconstruction.hypothesisConfirmed = true;
    reconstruction.hypothesisCompletedAt = completedAt;

    /*
     * To jest nowy, trwały wynik używany przez Crime Board.
     *
     * buildCrimeBoard.js używa:
     * - completed,
     * - confirmedItemIds,
     * - requiredSkills.
     *
     * Dzięki temu po przejściu hipotezy:
     * - red herringi znikną,
     * - na tablicy zostaną tylko 3 właściwe dowody,
     * - pojawi się METHOD PROFILE.
     */
    gameState.hypothesisEvidenceResult = {
      ...(gameState.hypothesisEvidenceResult || {}),
      id: 'hypothesis-skills',
      completed: true,
      success: true,
      status: 'confirmed',
      resultLabel: 'exact',
      confirmedItemIds: [...confirmedItemIds],
      requiredSkills: [...confirmedSkills],
      skills: [...confirmedSkills],
      missionId: reconstruction.missionId || null,
      cityId: reconstruction.cityId || this.cityId || null,
      sceneId: reconstruction.sceneId || this.sceneId || null,
      source: 'hypothesis_reconstruction',
      completedAt
    };

    /*
     * Zachowujemy też kompatybilność z kodem, który nadal korzysta
     * z gameState.hypothesisEvidence.
     */
    gameState.hypothesisEvidence = {
      ...(gameState.hypothesisEvidence || {}),
      requiredSkills: [...confirmedSkills],
      confirmedItemIds: [...confirmedItemIds],
      completed: true,
      status: 'confirmed',
      missionId: reconstruction.missionId || null,
      cityId: reconstruction.cityId || this.cityId || null,
      sceneId: reconstruction.sceneId || this.sceneId || null,
      source: 'hypothesis_reconstruction',
      completedAt
    };

    /*
     * Najpierw Crime Lab powinien wykonać swoje wykluczenia.
     * Jeżeli lab jest już ukończony, umiejętności z rekonstrukcji
     * eliminują kolejną grupę niepasujących podejrzanych.
     */
    if (!gameState.csiLabCompleted) {
      console.log(
        '[HypothesisResultService] Correct skills and confirmed items stored. Crime Lab will apply skills later.',
        {
          confirmedSkills,
          confirmedItemIds
        }
      );

      return;
    }

    const suspectFilterResult =
      applyHypothesisSkills(confirmedSkills);

    reconstruction.hypothesisSuspectFilterResult = {
      ...suspectFilterResult,
      appliedAt: Date.now()
    };

    gameState.suspectCaseSummary =
      getSuspectCaseSummary();

    console.log(
      '[HypothesisResultService] Hypothesis skill filter applied.',
      {
        confirmedSkills,
        confirmedItemIds,
        excludedSuspectIds:
          suspectFilterResult.excludedSuspectIds,
        remainingSuspects:
          suspectFilterResult.remainingSuspects
      }
    );
  }

  clearConfirmedHypothesisEvidence() {
    const existingResult =
      gameState.hypothesisEvidenceResult;

    if (
      existingResult &&
      typeof existingResult === 'object'
    ) {
      gameState.hypothesisEvidenceResult = {
        ...existingResult,
        completed: false,
        success: false,
        status: 'pending',
        confirmedItemIds: [],
        requiredSkills: []
      };
    }
  }

  applyScore(score, resultLabel) {
    const safeScore = Math.round(
      Number(score) || 0
    );

    if (
      this.scoreManager &&
      typeof this.scoreManager.addScoreEvent === 'function'
    ) {
      this.scoreManager.addScoreEvent(
        safeScore,
        `Heist theory: ${resultLabel}`
      );

      gameState.score = Math.max(
        0,
        this.scoreManager.getSessionPoints()
      );

      return gameState.score;
    }

    gameState.score = Math.max(
      0,
      (Number(gameState.score) || 0) + safeScore
    );

    return gameState.score;
  }

  appendTheoryToNotes(
    finalText,
    skills = [],
    resultLabel = 'weak',
    narrativeLines = []
  ) {
    const headerMap = {
      exact: 'Heist reconstruction:',
      partial: 'Partial heist theory:',
      weak: 'Uncertain heist theory:'
    };

    const header =
      headerMap[resultLabel] ||
      'Heist hypothesis:';

    const uniqueSkills = this.uniqueStrings(skills);

    const skillLine = uniqueSkills.length > 0
      ? `\nLikely skills: ${uniqueSkills.join(', ')}.`
      : '';

    const storyLine = narrativeLines.length > 0
      ? `\n\n${narrativeLines
        .map(
          (line, index) =>
            `${index + 1}. ${line}`
        )
        .join('\n')}`
      : '';

    const noteBlock =
      `${header}${storyLine}${skillLine}`;

    const existingNotes =
      typeof gameState.playerNotes === 'string'
        ? gameState.playerNotes
        : '';

    /*
     * finalText służy wyłącznie jako klucz chroniący przed
     * powtarzaniem tej samej notatki po wielokrotnym wejściu do sceny.
     */
    if (
      finalText &&
      existingNotes.includes(finalText)
    ) {
      return false;
    }

    gameState.playerNotes = existingNotes
      ? `${existingNotes}\n\n${noteBlock}`
      : noteBlock;

    return true;
  }

  storeTheorySkills(skills = []) {
    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    const uniqueSkills = this.uniqueStrings(skills);

    uniqueSkills.forEach(skill => {
      const alreadyExists =
        gameState.cluesCollected.some(clue =>
          clue?.type === 'suspect' &&
          clue?.category === 'skills' &&
          String(clue?.value)
            .trim()
            .toLowerCase() ===
            skill.toLowerCase()
        );

      if (alreadyExists) {
        return;
      }

      gameState.cluesCollected.push({
        type: 'suspect',
        category: 'skills',
        value: skill,
        source: 'heist_hypothesis',
        cityId: this.cityId,
        sceneId: this.sceneId,
        text: `Skill: ${skill}`
      });
    });
  }

  buildNarrativeLines(
    orderedCards = [],
    reconstruction = {}
  ) {
    const claims = Array.isArray(reconstruction.claims)
      ? reconstruction.claims
      : [];

    return orderedCards
      .map((card, slotIndex) => {
        const claim = claims[slotIndex];
        const questionId = claim?.questionId;

        const use = Array.isArray(card.reconstructionUses)
          ? card.reconstructionUses.find(
            entry =>
              entry?.questionId === questionId
          )
          : null;

        return use?.heistExplanation ||
          card.heistExplanation ||
          '';
      })
      .filter(Boolean);
  }

  collectUniqueSkills(cards = []) {
    const allSkills = [];

    cards.forEach(card => {
      if (!Array.isArray(card?.skills)) {
        return;
      }

      card.skills.forEach(skill => {
        allSkills.push(skill);
      });
    });

    return this.uniqueStrings(allSkills);
  }

  uniqueStrings(values = []) {
    const source = Array.isArray(values)
      ? values
      : [];

    const seen = new Set();

    return source.reduce((result, value) => {
      const skill = String(value || '').trim();
      const normalized = skill.toLowerCase();

      if (!skill || seen.has(normalized)) {
        return result;
      }

      seen.add(normalized);
      result.push(skill);

      return result;
    }, []);
  }

  asArray(value) {
    return Array.isArray(value)
      ? value
      : [];
  }

  safeId(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}