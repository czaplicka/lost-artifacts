import { gameState } from './GameData.js';
import { saveGameState } from './GameStatePersistence.js';
import { getScoreManager } from './InvestigationManager.js';
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
    reconstruction.hypothesisConfirmed = false;
    reconstruction.hypothesisSuspectFilterResult = null;

    const confirmedSkills = this.getConfirmedSkills(
  reconstruction
);

const hasConfirmedSkills =
  confirmedSkills.length === 3;

if (resultLabel === 'exact' && hasConfirmedSkills) {
  this.applyExactResult({
    reconstruction,
    confirmedSkills
  });
} else if (resultLabel === 'exact') {
  console.error(
    '[HypothesisResultService] Exact theory completed, but requiredSkills are missing.',
    {
      confirmedSkills,
      hypothesisEvidence: gameState.hypothesisEvidence,
      reconstruction
    }
  );

  /*
   * Nie ustawiamy hypothesisConfirmed = true,
   * jeżeli nie mamy kompletu trzech skillów.
   */
  reconstruction.confirmedSkills = [];
  reconstruction.hypothesisConfirmed = false;
}

const skillsForNotes =
  resultLabel === 'exact' && hasConfirmedSkills
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
confirmedSkills:
  resultLabel === 'exact' && hasConfirmedSkills
    ? confirmedSkills
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
   * Kompatybilność z SuspectUtils i starymi systemami,
   * które nadal czytają hypothesisEvidence.requiredSkills.
   */
  if (confirmedSkills.length === 3) {
    gameState.hypothesisEvidence = {
      ...(gameState.hypothesisEvidence || {}),
      requiredSkills: [...confirmedSkills],
      missionId: safeReconstruction.missionId || null,
      cityId: safeReconstruction.cityId || null,
      sceneId: safeReconstruction.sceneId || null,
      source: 'hypothesis_reconstruction'
    };
  }

  return confirmedSkills;
}


  applyExactResult({
    reconstruction,
    confirmedSkills
  }) {
    if (confirmedSkills.length !== 3) {
      console.error(
        '[HypothesisResultService] Exact theory completed, but requiredSkills are missing.',
        {
          hypothesisEvidence: gameState.hypothesisEvidence,
          reconstruction
        }
      );

      return;
    }

    reconstruction.confirmedSkills = [...confirmedSkills];
    reconstruction.hypothesisConfirmed = true;
    reconstruction.hypothesisCompletedAt = Date.now();

    /*
     * Crime Lab should run first and establish its initial suspect filter.
     * If it is already complete, applying the reconstruction skills here
     * removes the next group of incompatible suspects.
     *
     * If it is not complete, CrimeLabScene must detect
     * reconstruction.hypothesisConfirmed and call
     * applyHypothesisSkills(confirmedSkills) after its own filter.
     */
    if (!gameState.csiLabCompleted) {
      console.log(
        '[HypothesisResultService] Correct skills stored. Crime Lab will apply them later.',
        {
          confirmedSkills
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
        excludedSuspectIds:
          suspectFilterResult.excludedSuspectIds,
        remainingSuspects:
          suspectFilterResult.remainingSuspects
      }
    );
  }


  applyScore(score, resultLabel) {
    const safeScore = Math.max(
      0,
      Math.round(Number(score) || 0)
    );

    if (
      this.scoreManager &&
      typeof this.scoreManager.addScoreEvent === 'function'
    ) {
      this.scoreManager.addScoreEvent(
        safeScore,
        `Heist theory: ${resultLabel}`
      );

      gameState.score =
        this.scoreManager.getSessionPoints();

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
     * finalText is intentionally used only as a duplicate key.
     * The actual note remains readable prose built from explanations.
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

      if (alreadyExists) return;

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
      if (!Array.isArray(card?.skills)) return;

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
}