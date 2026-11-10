import {
  gameState,
  createDefaultReconstructedHeist
} from './GameData.js';

import {
  saveGameState
} from './gameStatePersistence.js';

import {
  getScoreManager
} from './managers/InvestigationManager.js';

import {
  progressionManager
} from './managers/ProgressionManager.js';

import {
  applyHypothesisSkills,
  getSuspectCaseSummary
} from './ui/suspectUtils.js';

function stableCaseId(value) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  if (
    typeof value === 'number' &&
    !Number.isFinite(value)
  ) {
    return null;
  }

  const id = String(value).trim();

  return id && id.length <= 400
    ? id
    : null;
}

export class HypothesisResultService {
  constructor({
    cityId = null,
    sceneId = null,
    scoreManager = null
  } = {}) {
    this.cityId = cityId;
    this.sceneId = sceneId;

    this.scoreManager =
      scoreManager || getScoreManager();
  }

  finalizeTheory({
    orderedCards = [],
    slotFeedback = [],
    attemptsLeft = 0,
    resultLabel = 'weak',
    score = 0
  } = {}) {
    const reconstruction =
      this.ensureReconstructionState();

    this.scoreManager.getLedger();

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

      correctOrder:
        Number.isInteger(card.correctOrder)
          ? card.correctOrder
          : -1,

      questionId: card.questionId || null,
      heistExplanation: card.heistExplanation || '',
      trueExplanation: card.trueExplanation || '',

      reconstructionUses:
        Array.isArray(card.reconstructionUses)
          ? card.reconstructionUses.map(use => ({
              questionId: use.questionId || null,

              skills: Array.isArray(use.skills)
                ? [...use.skills]
                : [],

              heistExplanation:
                use.heistExplanation || ''
            }))
          : []
    }));

    const finalText =
      orderedSentences.join(' → ');

    const playerSkills =
      this.collectUniqueSkills(safeCards);

    const narrativeLines =
      this.buildNarrativeLines(
        safeCards,
        reconstruction
      );

    Object.assign(reconstruction, {
      playerOrderedCards: orderedItems,
      playerOrderedSentences: orderedSentences,
      playerFinalText: finalText,
      playerSkills,

      playerTheoryScore: score,
      playerTheoryResult: resultLabel,

      playerSlotFeedback:
        Array.isArray(slotFeedback)
          ? [...slotFeedback]
          : [],

      playerAttemptsLeft: Math.max(
        0,
        Number(attemptsLeft) || 0
      ),

      playerNarrative: narrativeLines,

      confirmedSkills: [],
      confirmedItemIds: [],
      hypothesisConfirmed: false,
      hypothesisSuspectFilterResult: null
    });

    const confirmedSkills =
      this.getConfirmedSkills(reconstruction);

    const confirmedItemIds =
      this.getConfirmedItemIds(
        safeCards,
        reconstruction
      );

    const canConfirmTheory =
      resultLabel === 'exact' &&
      confirmedSkills.length === 3 &&
      confirmedItemIds.length === 3;

    if (canConfirmTheory) {
      this.applyExactResult({
        reconstruction,
        confirmedSkills,
        confirmedItemIds,
        narrativeLines,
        finalText
      });
    } else if (resultLabel === 'exact') {
      console.error(
        '[HypothesisResultService] Exact theory has incomplete confirmation data.',
        {
          confirmedSkills,
          confirmedItemIds,
          reconstruction
        }
      );

      this.clearConfirmedHypothesisEvidence();
    }

    const skillsForClue = canConfirmTheory
      ? confirmedSkills
      : playerSkills;

    this.storeReconstructionClue({
      finalText,
      skills: skillsForClue,
      resultLabel,
      narrativeLines,
      confirmed: canConfirmTheory,

      confirmedItemIds: canConfirmTheory
        ? confirmedItemIds
        : [],

      reconstruction
    });

    this.storeTheorySkills(skillsForClue);

    const finalScore =
      resultLabel === 'exact' && !canConfirmTheory
        ? this.scoreManager.getSessionPoints()
        : this.applyScore(
            score,
            resultLabel,
            attemptsLeft
          );

    const xpResult = this.grantCompletionXP({
      cards: safeCards,
      resultLabel,
      attemptsLeft,
      canConfirmTheory
    });

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
        reconstruction.hypothesisSuspectFilterResult,

      xpResult
    };
  }

  getProgressionCaseId() {
    const candidates = [
      gameState.currentCaseId,
      gameState.currentMission?.caseId,
      gameState.currentMission?.id
    ];

    for (const candidate of candidates) {
      const id = stableCaseId(candidate);

      if (id !== null) {
        return id;
      }
    }

    return null;
  }

  grantCompletionXP({
    cards = [],
    resultLabel,
    attemptsLeft,
    canConfirmTheory
  } = {}) {
    // Nagroda wymaga pełnego, trzykartowego układu.
    if (
      !Array.isArray(cards) ||
      cards.length !== 3
    ) {
      return {
        success: false,
        reason: 'incomplete_reconstruction'
      };
    }

    const cardIds = cards.map(card =>
      stableCaseId(card?.id)
    );

    if (
      cardIds.some(id => id === null) ||
      new Set(cardIds).size !== 3
    ) {
      return {
        success: false,
        reason: 'invalid_reconstruction_cards'
      };
    }

    const remainingAttempts = Number(attemptsLeft);

    const exhausted =
      (
        resultLabel === 'partial' ||
        resultLabel === 'weak'
      ) &&
      Number.isFinite(remainingAttempts) &&
      remainingAttempts <= 0;

    const exact =
      resultLabel === 'exact' &&
      canConfirmTheory === true;

    // Nie przyznajemy XP za próbę pośrednią.
    // Poprawny finał i finał po porażce dają tyle samo.
    if (!exact && !exhausted) {
      return {
        success: false,
        reason: 'reconstruction_not_finished'
      };
    }

    const caseId = this.getProgressionCaseId();

    if (!caseId) {
      console.warn(
        '[HypothesisResultService] XP skipped: no stable case ID.'
      );

      return {
        success: false,
        reason: 'missing_case_id'
      };
    }

    try {
      return progressionManager.grantReward(
        'reconstruction_submitted',
        caseId,
        'Heist reconstruction submitted'
      );
    } catch (error) {
      console.error(
        '[HypothesisResultService] Could not grant reconstruction XP:',
        error
      );

      return {
        success: false,
        reason: 'progression_error'
      };
    }
  }

  ensureReconstructionState() {
    if (
      !gameState.reconstructedHeist ||
      typeof gameState.reconstructedHeist !== 'object'
    ) {
      gameState.reconstructedHeist =
        createDefaultReconstructedHeist();
    }

    return gameState.reconstructedHeist;
  }

  getConfirmedSkills(reconstruction = null) {
    const data =
      reconstruction &&
      typeof reconstruction === 'object'
        ? reconstruction
        : gameState.reconstructedHeist || {};

    const legacy =
      gameState.hypothesisEvidence?.requiredSkills;

    const generated = data.requiredSkills;

    const thief = Array.isArray(data.thiefSkills)
      ? data.thiefSkills
      : typeof data.thiefSkills === 'string'
        ? data.thiefSkills
            .split(',')
            .map(skill => skill.trim())
            .filter(Boolean)
        : [];

    const source =
      Array.isArray(legacy) && legacy.length
        ? legacy
        : Array.isArray(generated) && generated.length
          ? generated
          : thief;

    const skills = [
      ...new Set(
        source
          .filter(Boolean)
          .map(skill => String(skill).trim())
          .filter(Boolean)
      )
    ].slice(0, 3);

    if (skills.length === 3) {
      gameState.hypothesisEvidence = {
        ...(gameState.hypothesisEvidence || {}),
        requiredSkills: [...skills],
        missionId: data.missionId || null,

        cityId:
          data.cityId || this.cityId || null,

        sceneId:
          data.sceneId || this.sceneId || null,

        source: 'hypothesis_reconstruction'
      };
    }

    return skills;
  }

  getConfirmedItemIds(
    cards = [],
    reconstruction = {}
  ) {
    const safeCards = Array.isArray(cards)
      ? cards.filter(Boolean)
      : [];

    const generated = [
      ...this.asArray(reconstruction.solutionItemIds),
      ...this.asArray(reconstruction.correctItemIds),
      ...this.asArray(reconstruction.requiredItemIds),
      ...this.asArray(reconstruction.confirmedItemIds)
    ]
      .map(id => this.safeId(id))
      .filter(Boolean);

    if (generated.length >= 3) {
      return this.uniqueStrings(generated).slice(0, 3);
    }

    return this.uniqueStrings(
      safeCards
        .filter(
          card =>
            card.isCorrect !== false &&
            Boolean(card.id)
        )
        .map(card => this.safeId(card.id))
        .filter(Boolean)
    ).slice(0, 3);
  }

  applyExactResult({
    reconstruction,
    confirmedSkills,
    confirmedItemIds,
    narrativeLines = [],
    finalText = ''
  }) {
    if (
      confirmedSkills.length !== 3 ||
      confirmedItemIds.length !== 3
    ) {
      console.error(
        '[HypothesisResultService] Incomplete exact theory.'
      );

      return;
    }

    const completedAt = Date.now();

    Object.assign(reconstruction, {
      confirmedSkills: [...confirmedSkills],
      confirmedItemIds: [...confirmedItemIds],
      hypothesisConfirmed: true,
      hypothesisCompletedAt: completedAt
    });

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
      narrative: [...narrativeLines],
      finalText,

      missionId: reconstruction.missionId || null,

      cityId:
        reconstruction.cityId ||
        this.cityId ||
        null,

      sceneId:
        reconstruction.sceneId ||
        this.sceneId ||
        null,

      source: 'hypothesis_reconstruction',
      completedAt
    };

    gameState.hypothesisEvidence = {
      ...(gameState.hypothesisEvidence || {}),
      requiredSkills: [...confirmedSkills],
      confirmedItemIds: [...confirmedItemIds],
      completed: true,
      status: 'confirmed',

      missionId: reconstruction.missionId || null,

      cityId:
        reconstruction.cityId ||
        this.cityId ||
        null,

      sceneId:
        reconstruction.sceneId ||
        this.sceneId ||
        null,

      source: 'hypothesis_reconstruction',
      completedAt
    };

    if (!gameState.csiLabCompleted) {
      return;
    }

    reconstruction.hypothesisSuspectFilterResult = {
      ...applyHypothesisSkills(confirmedSkills),
      appliedAt: Date.now()
    };

    gameState.suspectCaseSummary =
      getSuspectCaseSummary();
  }

  clearConfirmedHypothesisEvidence() {
    const existing =
      gameState.hypothesisEvidenceResult;

    if (
      existing &&
      typeof existing === 'object'
    ) {
      gameState.hypothesisEvidenceResult = {
        ...existing,
        completed: false,
        success: false,
        status: 'pending',
        confirmedItemIds: [],
        requiredSkills: []
      };
    }
  }

  applyScore(
    score,
    resultLabel,
    attemptsLeft = null
  ) {
    if (resultLabel === 'exact') {
      const attempt = Number.isFinite(attemptsLeft)
        ? Math.max(
            1,
            4 - Math.max(0, attemptsLeft)
          )
        : 3;

      return this.scoreManager.addHypothesisScore(
        attempt
      );
    }

    if (
      resultLabel === 'partial' ||
      resultLabel === 'weak'
    ) {
      return this.scoreManager
        .penalizeHypothesisExhausted();
    }

    return this.scoreManager.getSessionPoints();
  }

  storeReconstructionClue({
    finalText = '',
    skills = [],
    resultLabel,
    narrativeLines = [],
    confirmed = false,
    confirmedItemIds = [],
    reconstruction = {}
  } = {}) {
    const titleMap = {
      exact: 'Heist reconstruction',
      partial: 'Partial heist theory',
      weak: 'Uncertain heist theory'
    };

    const uniqueSkills =
      this.uniqueStrings(skills);

    const sceneId =
      reconstruction.sceneId ||
      this.sceneId ||
      null;

    const cityId =
      reconstruction.cityId ||
      this.cityId ||
      null;

    const missionId =
      reconstruction.missionId || null;

    const text = [
      narrativeLines.length
        ? narrativeLines
            .map(
              (line, index) =>
                `${index + 1}. ${line}`
            )
            .join('\n')
        : finalText,

      uniqueSkills.length
        ? `Likely skills: ${uniqueSkills.join(', ')}.`
        : ''
    ]
      .filter(Boolean)
      .join('\n\n');

    const clue = {
      id: `heist_reconstruction_${
        this.toSlug(
          missionId ||
          sceneId ||
          cityId ||
          'case'
        )
      }`,

      type: 'reconstruction',
      category: 'heist',
      value: resultLabel,

      title:
        titleMap[resultLabel] ||
        'Heist hypothesis',

      text,
      finalText,
      narrative: [...narrativeLines],
      skills: [...uniqueSkills],
      confirmed: Boolean(confirmed),
      confirmedItemIds: [...confirmedItemIds],

      source: 'heist_hypothesis',
      missionId,
      cityId,
      sceneId
    };

    const existing =
      Array.isArray(gameState.cluesCollected)
        ? gameState.cluesCollected.find(
            entry => entry?.id === clue.id
          )
        : null;

    if (existing) {
      Object.assign(existing, clue);
      return existing;
    }

    gameState.addClue(clue);

    return clue;
  }

  storeTheorySkills(skills = []) {
    this.uniqueStrings(skills).forEach(skill => {
      const exists =
        gameState.cluesCollected.some(
          clue =>
            clue?.type === 'suspect' &&
            clue?.category === 'skills' &&
            String(clue?.value)
              .trim()
              .toLowerCase() === skill.toLowerCase()
        );

      if (exists) {
        return;
      }

      gameState.addClue({
        id: `hypothesis_skill_${this.toSlug(skill)}`,
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
    const claims =
      Array.isArray(reconstruction.claims)
        ? reconstruction.claims
        : [];

    return orderedCards
      .map((card, slotIndex) => {
        const questionId =
          claims[slotIndex]?.questionId;

        const use =
          Array.isArray(card.reconstructionUses)
            ? card.reconstructionUses.find(
                entry =>
                  entry?.questionId === questionId
              )
            : null;

        return (
          use?.heistExplanation ||
          card.heistExplanation ||
          ''
        );
      })
      .filter(Boolean);
  }

  collectUniqueSkills(cards = []) {
    const all = [];

    cards.forEach(card => {
      if (Array.isArray(card?.skills)) {
        all.push(...card.skills);
      }
    });

    return this.uniqueStrings(all);
  }

  uniqueStrings(values = []) {
    const seen = new Set();

    return (
      Array.isArray(values) ? values : []
    ).reduce((result, value) => {
      const text = String(value || '').trim();
      const key = text.toLowerCase();

      if (text && !seen.has(key)) {
        seen.add(key);
        result.push(text);
      }

      return result;
    }, []);
  }

  asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  safeId(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  toSlug(value) {
    return (
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      'unknown'
    );
  }
}