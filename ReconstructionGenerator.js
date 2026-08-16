const DEFAULT_QUESTION_META = {
  beat_security: { phase: 'setup', exclusiveGroup: 'security' },
  disable_system: { phase: 'setup', exclusiveGroup: 'security' },
  create_blind_spot: { phase: 'setup', exclusiveGroup: 'security' },
  gain_access: { phase: 'setup', exclusiveGroup: 'access' },
  identify_target: { phase: 'setup', exclusiveGroup: 'target' },
  move_unnoticed: { phase: 'execution', exclusiveGroup: 'movement' },
  avoid_attention: { phase: 'execution', exclusiveGroup: 'cover' },
  distract_guards: { phase: 'execution', exclusiveGroup: 'distraction' },
  reach_target: { phase: 'execution', exclusiveGroup: 'vertical_access' },
  overcome_guard: { phase: 'execution', exclusiveGroup: 'confrontation' },
  remove_artifact: { phase: 'execution', exclusiveGroup: 'removal' },
  hide_theft: { phase: 'exit', exclusiveGroup: 'cover_up' },
  escape_route: { phase: 'exit', exclusiveGroup: 'escape' }
};

export class ReconstructionGenerator {
  static generate({
    items,
    questions,
    sceneId,
    thiefId = null,
    thiefSkills,
    missionId = null,
    cardCount = 6,
    claimCount = 3,
    rng = Math.random
  } = {}) {
    const normalizedItems = this.normalizeItems(items);
    const normalizedQuestions = this.normalizeQuestions(questions);
    const skills = this.uniqueStrings(thiefSkills);
    const normalizedSceneId = this.normalize(sceneId);

    if (!normalizedSceneId) {
      throw new Error('ReconstructionGenerator: sceneId is required.');
    }

    if (skills.length < claimCount) {
      throw new Error(
        `ReconstructionGenerator: expected at least ${claimCount} thief skills, received ${skills.length}.`
      );
    }

    if (cardCount < claimCount * 2) {
      throw new Error(
        'ReconstructionGenerator: cardCount must allow one solution and one alternative per claim.'
      );
    }

    const sceneItems = normalizedItems.filter((item) =>
      item.scene.some(
        (scene) => this.normalize(scene) === normalizedSceneId
      )
    );

    if (sceneItems.length === 0) {
      throw new Error(
        `ReconstructionGenerator: no items found for scene "${sceneId}".`
      );
    }

    const questionMap = new Map(
      normalizedQuestions.map((question) => [question.id, question])
    );

    const skillPool = this.shuffle([...skills], rng);

    const candidatesBySkill = skillPool.map((skill) => ({
      skill,
      candidates: this.shuffle(
        this.findSolutionCandidates(sceneItems, skill, questionMap).filter(
          (candidate) =>
            this.hasAlternativeForQuestion(
              sceneItems,
              candidate.question.id,
              candidate.item.id
            )
        ),
        rng
      )
    }));

    const claims = this.findValidClaims(
      candidatesBySkill,
      claimCount
    );

    if (!claims || claims.length < claimCount) {
      const candidateSummary = candidatesBySkill
        .map(
          ({ skill, candidates }) =>
            `${skill}: ${candidates.length}`
        )
        .join(', ');

      throw new Error(
        `ReconstructionGenerator: could not build ${claimCount} distinct claims ` +
        `for scene "${sceneId}". Candidate counts: ${candidateSummary}. ` +
        'Check skill aliases, question groups, and reconstructionUses.'
      );
    }

    const solutionIds = new Set(
      claims.map((claim) => claim.solutionItemId)
    );

    const alternatives = this.buildAlternatives(
      sceneItems,
      claims,
      solutionIds,
      rng
    );

    const requiredAlternatives = cardCount - claims.length;

    if (alternatives.length < requiredAlternatives) {
      throw new Error(
        `ReconstructionGenerator: scene "${sceneId}" needs ${requiredAlternatives} plausible alternatives, but only ${alternatives.length} are available.`
      );
    }

    const chosenAlternatives = this.shuffle(
      alternatives,
      rng
    ).slice(0, requiredAlternatives);

    const foundCardIds = this.shuffle(
      [
        ...claims.map((claim) => claim.solutionItemId),
        ...chosenAlternatives.map((item) => item.id)
      ],
      rng
    );

    const foundCards = foundCardIds.map((id) => {
      const card = sceneItems.find((item) => item.id === id);

      if (!card) {
        throw new Error(
          `ReconstructionGenerator: selected card "${id}" was not found in scene "${sceneId}".`
        );
      }

      return this.cloneCard(card);
    });

    return {
      missionId,
      cityId: null,
      sceneId,
      thiefId,
      thiefSkills: [...skills],
      claims,
      solutionCardIds: claims.map(
        (claim) => claim.solutionItemId
      ),
      foundCardIds,
      foundCards,
      allCards: this.buildHypothesisCards(foundCards, claims),
      playerAttemptsLeft: 3,
      playerClaimAssignments: [],
      playerTheoryResult: null,
      playerSkills: []
    };
  }

  static findValidClaims(candidatesBySkill, claimCount) {
    const search = (
      skillIndex,
      claims,
      usedItemIds,
      usedQuestionGroups
    ) => {
      if (claims.length === claimCount) {
        return claims;
      }

      if (skillIndex >= candidatesBySkill.length) {
        return null;
      }

      const remainingSkills = candidatesBySkill.length - skillIndex;

      if (claims.length + remainingSkills < claimCount) {
        return null;
      }

      const { skill, candidates } = candidatesBySkill[skillIndex];

      for (const candidate of candidates) {
        const itemId = candidate.item.id;
        const groupId = candidate.question.exclusiveGroup;

        if (
          usedItemIds.has(itemId) ||
          usedQuestionGroups.has(groupId)
        ) {
          continue;
        }

        const claim = {
          id: candidate.question.id,
          questionId: candidate.question.id,
          prompt: candidate.question.prompt,
          phase: candidate.question.phase,
          exclusiveGroup: groupId,
          solutionItemId: itemId,
          solutionUseIndex: candidate.useIndex,
          solutionExplanation:
            candidate.use.heistExplanation ||
            candidate.item.heistExplanation ||
            '',
          revealedSkills: this.uniqueStrings(
            candidate.use.skills.length > 0
              ? candidate.use.skills
              : [skill]
          ),
          thiefSkill: skill
        };

        const nextUsedItemIds = new Set(usedItemIds);
        nextUsedItemIds.add(itemId);

        const nextUsedQuestionGroups = new Set(
          usedQuestionGroups
        );
        nextUsedQuestionGroups.add(groupId);

        const result = search(
          skillIndex + 1,
          [...claims, claim],
          nextUsedItemIds,
          nextUsedQuestionGroups
        );

        if (result) {
          return result;
        }
      }

      return search(
        skillIndex + 1,
        claims,
        usedItemIds,
        usedQuestionGroups
      );
    };

    return search(
      0,
      [],
      new Set(),
      new Set()
    );
  }

  static findSolutionCandidates(sceneItems, thiefSkill, questionMap) {
    const normalizedSkill = this.normalize(thiefSkill);
    const candidates = [];

    sceneItems.forEach((item) => {
      item.reconstructionUses.forEach((use, useIndex) => {
        const question = questionMap.get(use.questionId);

        if (!question) {
          return;
        }

        const useSkills =
          use.skills.length > 0
            ? use.skills
            : item.skills;

        const matchesSkill = useSkills.some(
          (skill) => this.normalize(skill) === normalizedSkill
        );

        if (!matchesSkill) {
          return;
        }

        candidates.push({
          item,
          use,
          useIndex,
          question
        });
      });
    });

    return candidates;
  }

  static hasAlternativeForQuestion(
    sceneItems,
    questionId,
    solutionItemId
  ) {
    return sceneItems.some(
      (item) =>
        item.id !== solutionItemId &&
        item.reconstructionUses.some(
          (use) => use.questionId === questionId
        )
    );
  }

  static buildAlternatives(sceneItems, claims, solutionIds, rng) {
    const alternativeMap = new Map();

    claims.forEach((claim) => {
      const candidates = this.shuffle(
        sceneItems.filter(
          (item) =>
            !solutionIds.has(item.id) &&
            item.reconstructionUses.some(
              (use) => use.questionId === claim.questionId
            )
        ),
        rng
      );

      const first = candidates[0];

      if (first) {
        alternativeMap.set(first.id, first);
      }
    });

    claims.forEach((claim) => {
      sceneItems
        .filter(
          (item) =>
            !solutionIds.has(item.id) &&
            item.reconstructionUses.some(
              (use) => use.questionId === claim.questionId
            )
        )
        .forEach((item) => alternativeMap.set(item.id, item));
    });

    return [...alternativeMap.values()];
  }

  static buildHypothesisCards(foundCards, claims) {
    const solutionByItemId = new Map(
      claims.map((claim, index) => [
        claim.solutionItemId,
        { claim, index }
      ])
    );

    return foundCards.map((card) => {
      const solution = solutionByItemId.get(card.id);

      const matchingUse = solution
        ? card.reconstructionUses[
            solution.claim.solutionUseIndex
          ]
        : null;

      return {
        id: card.id,
        item: card.item,
        text: card.item,
        skills: [...card.skills],
        scene: [...card.scene],
        isCorrect: Boolean(solution),
        correctOrder: solution ? solution.index : -1,
        questionId: solution?.claim.questionId || null,
        heistExplanation:
          matchingUse?.heistExplanation ||
          card.heistExplanation ||
          '',
        trueExplanation: card.trueExplanation || '',
        reconstructionUses: card.reconstructionUses.map(
          (use) => ({
            ...use,
            skills: [...use.skills]
          })
        )
      };
    });
  }

  static normalizeItems(source) {
    const rawItems = Array.isArray(source)
      ? source
      : Array.isArray(source?.items)
        ? source.items
        : [];

    return rawItems
      .filter((item) => item && item.id)
      .map((item) => ({
        id: String(item.id),
        item: String(item.item || item.id),
        skills: this.uniqueStrings(item.skills),
        scene: this.uniqueStrings(item.scene),
        tags: this.uniqueStrings(item.tags),
        trueExplanation: String(item.trueExplanation || ''),
        heistExplanation: String(item.heistExplanation || ''),
        reconstructionUses: Array.isArray(
          item.reconstructionUses
        )
          ? item.reconstructionUses
              .filter((use) => use?.questionId)
              .map((use) => ({
                questionId: String(use.questionId),
                skills: this.uniqueStrings(use.skills),
                heistExplanation: String(
                  use.heistExplanation || ''
                )
              }))
          : []
      }));
  }

  static normalizeQuestions(source) {
    const rawQuestions = Array.isArray(source)
      ? source
      : Array.isArray(source?.reconstructionQuestions)
        ? source.reconstructionQuestions
        : [];

    return rawQuestions
      .filter(
        (question) => question?.id && question?.prompt
      )
      .map((question) => {
        const defaults =
          DEFAULT_QUESTION_META[question.id] || {};

        return {
          id: String(question.id),
          prompt: String(question.prompt),
          phase:
            question.phase ||
            defaults.phase ||
            'execution',
          exclusiveGroup:
            question.exclusiveGroup ||
            defaults.exclusiveGroup ||
            question.id
        };
      });
  }

  static cloneCard(card) {
    return {
      ...card,
      skills: [...card.skills],
      scene: [...card.scene],
      tags: [...card.tags],
      reconstructionUses: card.reconstructionUses.map(
        (use) => ({
          ...use,
          skills: [...use.skills]
        })
      )
    };
  }

  static uniqueStrings(value) {
    const values = Array.isArray(value) ? value : [];
    const seen = new Set();

    return values.reduce((result, entry) => {
      const text = String(entry || '').trim();
      const key = this.normalize(text);

      if (!text || seen.has(key)) {
        return result;
      }

      seen.add(key);
      result.push(text);

      return result;
    }, []);
  }

  static normalize(value) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const aliases = {
      pickpocketing: 'pickpocket',
      'pick pocketing': 'pickpocket',
      pickpocket: 'pickpocket'
    };

    return aliases[normalized] || normalized;
  }

  static shuffle(array, rng = Math.random) {
    const result = [...array];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(
        rng() * (index + 1)
      );

      [result[index], result[swapIndex]] = [
        result[swapIndex],
        result[index]
      ];
    }

    return result;
  }
}