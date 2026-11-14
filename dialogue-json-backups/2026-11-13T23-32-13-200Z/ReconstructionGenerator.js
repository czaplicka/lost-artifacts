const DEFAULT_QUESTION_META = {
  beat_security: {
    phase: 'setup',
    exclusiveGroup: 'security'
  },
  disable_system: {
    phase: 'setup',
    exclusiveGroup: 'security'
  },
  create_blind_spot: {
    phase: 'setup',
    exclusiveGroup: 'security'
  },
  gain_access: {
    phase: 'setup',
    exclusiveGroup: 'access'
  },
  identify_target: {
    phase: 'setup',
    exclusiveGroup: 'target'
  },
  move_unnoticed: {
    phase: 'execution',
    exclusiveGroup: 'movement'
  },
  avoid_attention: {
    phase: 'execution',
    exclusiveGroup: 'cover'
  },
  distract_guards: {
    phase: 'execution',
    exclusiveGroup: 'distraction'
  },
  reach_target: {
    phase: 'execution',
    exclusiveGroup: 'vertical_access'
  },
  overcome_guard: {
    phase: 'execution',
    exclusiveGroup: 'confrontation'
  },
  remove_artifact: {
    phase: 'execution',
    exclusiveGroup: 'removal'
  },
  hide_theft: {
    phase: 'exit',
    exclusiveGroup: 'cover_up'
  },
  escape_route: {
    phase: 'exit',
    exclusiveGroup: 'escape'
  }
};

export class ReconstructionGenerator {
  static generate({
    items,
    questions,
    sceneId,
    cityId = null,
    thiefId = null,
    thiefSkills,
    missionId = null,
    cardCount = 6,
    claimCount = 3,
    rng = Math.random
  } = {}) {
    if (
      !Number.isInteger(claimCount) ||
      claimCount < 1
    ) {
      throw new Error(
        'ReconstructionGenerator: claimCount must be a positive integer.'
      );
    }

    if (
      !Number.isInteger(cardCount) ||
      cardCount < claimCount * 2
    ) {
      throw new Error(
        'ReconstructionGenerator: cardCount must allow one solution and one distinct alternative per claim.'
      );
    }

    if (typeof rng !== 'function') {
      throw new Error(
        'ReconstructionGenerator: rng must be a function.'
      );
    }

    const normalizedItems = this.normalizeItems(items);
    const normalizedQuestions =
      this.normalizeQuestions(questions);
    const skills = this.uniqueStrings(thiefSkills);
    const normalizedSceneId = this.normalize(sceneId);

    if (!normalizedSceneId) {
      throw new Error(
        'ReconstructionGenerator: sceneId is required.'
      );
    }

    if (skills.length < claimCount) {
      throw new Error(
        `ReconstructionGenerator: expected at least ${claimCount} distinct thief skills, received ${skills.length}.`
      );
    }

    const sceneItems = normalizedItems.filter((item) =>
      item.scene.some(
        (scene) =>
          this.normalize(scene) === normalizedSceneId
      )
    );

    if (sceneItems.length === 0) {
      throw new Error(
        `ReconstructionGenerator: no items found for scene "${sceneId}".`
      );
    }

    if (sceneItems.length < cardCount) {
      throw new Error(
        `ReconstructionGenerator: scene "${sceneId}" needs ${cardCount} distinct cards, but contains only ${sceneItems.length}.`
      );
    }

    if (normalizedQuestions.length === 0) {
      throw new Error(
        'ReconstructionGenerator: no valid reconstruction questions found.'
      );
    }

    const questionMap = new Map(
      normalizedQuestions.map((question) => [
        question.id,
        question
      ])
    );

    const candidatesBySkill = this.shuffle(
      skills,
      rng
    ).map((skill) => ({
      skill,
      candidates: this.shuffle(
        this.findSolutionCandidates(
          sceneItems,
          skill,
          questionMap
        ).filter((candidate) =>
          this.hasAlternativeForQuestion(
            sceneItems,
            candidate.question.id,
            candidate.item.id
          )
        ),
        rng
      )
    }));

    // Search the most constrained skills first.
    candidatesBySkill.sort(
      (a, b) =>
        a.candidates.length - b.candidates.length
    );

    let selectedAlternatives = null;
    let completeClaimSetsChecked = 0;

    const rejectedSets = new Set();

    const claims = this.findValidClaims(
      candidatesBySkill,
      claimCount,
      (candidateClaims) => {
        const signature = JSON.stringify(
          candidateClaims
            .map((claim) => [
              claim.questionId,
              claim.solutionItemId
            ])
            .sort((a, b) =>
              JSON.stringify(a).localeCompare(
                JSON.stringify(b)
              )
            )
        );

        if (rejectedSets.has(signature)) {
          return false;
        }

        completeClaimSetsChecked += 1;

        const solutionIds = new Set(
          candidateClaims.map(
            (claim) => claim.solutionItemId
          )
        );

        const alternatives = this.buildAlternatives(
          sceneItems,
          candidateClaims,
          solutionIds,
          rng,
          cardCount - candidateClaims.length
        );

        if (!alternatives) {
          rejectedSets.add(signature);
          return false;
        }

        selectedAlternatives = alternatives;
        return true;
      }
    );

    if (!claims || !selectedAlternatives) {
      const candidateSummary = candidatesBySkill
        .map(({ skill, candidates }) => {
          const groups = [
            ...new Set(
              candidates.map(
                (candidate) =>
                  candidate.question.exclusiveGroup
              )
            )
          ];

          return (
            `${skill}: ${candidates.length} candidates` +
            ` [groups: ${groups.join(', ') || 'none'}]`
          );
        })
        .join('; ');

      const reason = completeClaimSetsChecked > 0
        ? 'Distinct claims were found, but none allowed enough distinct alternatives with one alternative per question.'
        : 'No valid combination of distinct skills, solution items, and question groups was found.';

      const message =
        `ReconstructionGenerator: could not build reconstruction ` +
        `for scene "${sceneId}", thief "${thiefId || 'unknown'}". ` +
        `${reason} Candidate counts: ${candidateSummary}.`;

      const error = new Error(message);

      error.details = {
        sceneId,
        cityId,
        thiefId,
        thiefSkills: [...skills],
        claimCount,
        cardCount,
        sceneItemsCount: sceneItems.length,
        completeClaimSetsChecked,
        candidatesBySkill: candidatesBySkill.map(
          ({ skill, candidates }) => ({
            skill,
            count: candidates.length,
            questionIds: [
              ...new Set(
                candidates.map(
                  (candidate) =>
                    candidate.question.id
                )
              )
            ],
            groups: [
              ...new Set(
                candidates.map(
                  (candidate) =>
                    candidate.question.exclusiveGroup
                )
              )
            ]
          })
        )
      };

      // Keep the cause readable even when a caller logs
      // the Error inside a collapsed object.
      console.error(message, error.details);

      throw error;
    }

    const itemMap = new Map(
      sceneItems.map((item) => [item.id, item])
    );

    const foundCardIds = this.shuffle(
      [
        ...claims.map(
          (claim) => claim.solutionItemId
        ),
        ...selectedAlternatives.map(
          (item) => item.id
        )
      ],
      rng
    );

    if (
      foundCardIds.length !== cardCount ||
      new Set(foundCardIds).size !== cardCount
    ) {
      throw new Error(
        'ReconstructionGenerator: internal error — selected cards are not distinct or have an invalid count.'
      );
    }

    const foundCards = foundCardIds.map((id) => {
      const card = itemMap.get(id);

      if (!card) {
        throw new Error(
          `ReconstructionGenerator: selected card "${id}" was not found in scene "${sceneId}".`
        );
      }

      return this.cloneCard(card);
    });

    return {
      missionId,
      cityId,
      sceneId,
      thiefId,
      thiefSkills: [...skills],
      claims,
      solutionCardIds: claims.map(
        (claim) => claim.solutionItemId
      ),
      foundCardIds,
      foundCards,
      allCards: this.buildHypothesisCards(
        foundCards,
        claims
      ),
      playerAttemptsLeft: 3,
      playerClaimAssignments: [],
      playerTheoryResult: null,
      playerSkills: []
    };
  }

  static findValidClaims(
    candidatesBySkill,
    claimCount,
    acceptClaims = () => true
  ) {
    const search = (
      skillIndex,
      claims,
      usedItemIds,
      usedQuestionGroups,
      usedSkills
    ) => {
      if (claims.length === claimCount) {
        return acceptClaims(claims)
          ? claims
          : null;
      }

      if (skillIndex >= candidatesBySkill.length) {
        return null;
      }

      const remainingSkills =
        candidatesBySkill.length - skillIndex;

      if (
        claims.length + remainingSkills <
        claimCount
      ) {
        return null;
      }

      const { skill, candidates } =
        candidatesBySkill[skillIndex];

      const skillKey = this.normalize(skill);

      if (!usedSkills.has(skillKey)) {
        for (const candidate of candidates) {
          const itemId = candidate.item.id;
          const groupId =
            candidate.question.exclusiveGroup;

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
            revealedSkills: [skill],
            thiefSkill: skill
          };

          const nextItemIds = new Set(
            usedItemIds
          );
          nextItemIds.add(itemId);

          const nextGroups = new Set(
            usedQuestionGroups
          );
          nextGroups.add(groupId);

          const nextSkills = new Set(
            usedSkills
          );
          nextSkills.add(skillKey);

          const result = search(
            skillIndex + 1,
            [...claims, claim],
            nextItemIds,
            nextGroups,
            nextSkills
          );

          if (result) {
            return result;
          }
        }
      }

      return search(
        skillIndex + 1,
        claims,
        usedItemIds,
        usedQuestionGroups,
        usedSkills
      );
    };

    return search(
      0,
      [],
      new Set(),
      new Set(),
      new Set()
    );
  }

  static findSolutionCandidates(
    sceneItems,
    thiefSkill,
    questionMap
  ) {
    const normalizedSkill =
      this.normalize(thiefSkill);

    const candidates = [];

    sceneItems.forEach((item) => {
      const seenQuestions = new Set();

      item.reconstructionUses.forEach(
        (use, useIndex) => {
          const question =
            questionMap.get(use.questionId);

          if (!question) {
            return;
          }

          const useSkills = use.skills.length > 0
            ? use.skills
            : item.skills;

          const matchesSkill = useSkills.some(
            (skill) =>
              this.normalize(skill) ===
              normalizedSkill
          );

          if (
            !matchesSkill ||
            seenQuestions.has(question.id)
          ) {
            return;
          }

          seenQuestions.add(question.id);

          candidates.push({
            item,
            use,
            useIndex,
            question
          });
        }
      );
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
          (use) =>
            use.questionId === questionId
        )
    );
  }

  static buildAlternatives(
    sceneItems,
    claims,
    solutionIds,
    rng = Math.random,
    requiredCount = claims.length
  ) {
    if (requiredCount < claims.length) {
      return null;
    }

    const pools = claims.map(
      (claim, claimIndex) => ({
        claimIndex,
        candidates: this.shuffle(
          sceneItems.filter(
            (item) =>
              !solutionIds.has(item.id) &&
              item.reconstructionUses.some(
                (use) =>
                  use.questionId ===
                  claim.questionId
              )
          ),
          rng
        )
      })
    );

    if (
      pools.some(
        (pool) =>
          pool.candidates.length === 0
      )
    ) {
      return null;
    }

    const allAlternatives = new Map();

    pools.forEach((pool) => {
      pool.candidates.forEach((item) => {
        allAlternatives.set(item.id, item);
      });
    });

    if (
      allAlternatives.size < requiredCount
    ) {
      return null;
    }

    pools.sort(
      (a, b) =>
        a.candidates.length -
        b.candidates.length
    );

    // Find a distinct alternative for each question.
    const match = (
      poolIndex,
      selected,
      usedIds
    ) => {
      if (poolIndex === pools.length) {
        return selected;
      }

      const pool = pools[poolIndex];

      for (const item of pool.candidates) {
        if (usedIds.has(item.id)) {
          continue;
        }

        const nextUsedIds = new Set(
          usedIds
        );
        nextUsedIds.add(item.id);

        const result = match(
          poolIndex + 1,
          [...selected, item],
          nextUsedIds
        );

        if (result) {
          return result;
        }
      }

      return null;
    };

    const matched = match(
      0,
      [],
      new Set()
    );

    if (!matched) {
      return null;
    }

    const selectedIds = new Set(
      matched.map((item) => item.id)
    );

    const extras = this.shuffle(
      [...allAlternatives.values()].filter(
        (item) =>
          !selectedIds.has(item.id)
      ),
      rng
    ).slice(
      0,
      requiredCount - matched.length
    );

    const result = [
      ...matched,
      ...extras
    ];

    return result.length === requiredCount
      ? result
      : null;
  }

  static buildHypothesisCards(
    foundCards,
    claims
  ) {
    const solutionByItemId = new Map(
      claims.map((claim, index) => [
        claim.solutionItemId,
        { claim, index }
      ])
    );

    return foundCards.map((card) => {
      const solution =
        solutionByItemId.get(card.id);

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
        correctOrder: solution
          ? solution.index
          : -1,
        questionId:
          solution?.claim.questionId ||
          null,
        heistExplanation:
          matchingUse?.heistExplanation ||
          card.heistExplanation ||
          '',
        trueExplanation:
          card.trueExplanation || '',
        reconstructionUses:
          card.reconstructionUses.map(
            (use) => ({
              ...use,
              skills: [...use.skills]
            })
          )
      };
    });
  }

  static normalizeItems(source) {
    const rawItems = this.getArray(
      source,
      [
        'objects',
        'items',
        'hiddenObjects'
      ]
    );

    const seenIds = new Set();

    return rawItems
      .filter((item) => item && item.id)
      .map((item) => {
        const id = String(item.id).trim();

        if (!id) {
          return null;
        }

        if (seenIds.has(id)) {
          throw new Error(
            `ReconstructionGenerator: duplicate item id "${id}".`
          );
        }

        seenIds.add(id);

        return {
          id,
          item: String(
            item.item || id
          ),
          skills:
            this.uniqueStrings(item.skills),
          scene:
            this.uniqueStrings(item.scene),
          tags:
            this.uniqueStrings(item.tags),
          trueExplanation: String(
            item.trueExplanation || ''
          ),
          heistExplanation: String(
            item.heistExplanation || ''
          ),
          reconstructionUses:
            Array.isArray(
              item.reconstructionUses
            )
              ? item.reconstructionUses
                  .filter(
                    (use) =>
                      use?.questionId
                  )
                  .map((use) => ({
                    questionId: String(
                      use.questionId
                    ).trim(),
                    skills:
                      this.uniqueStrings(
                        use.skills
                      ),
                    heistExplanation:
                      String(
                        use.heistExplanation ||
                        ''
                      )
                  }))
                  .filter(
                    (use) =>
                      use.questionId
                  )
              : []
        };
      })
      .filter(Boolean);
  }

  static normalizeQuestions(source) {
    const rawQuestions = this.getArray(
      source,
      [
        'reconstructionQuestions',
        'questions'
      ]
    );

    const seenIds = new Set();

    return rawQuestions
      .filter(
        (question) =>
          question?.id &&
          question?.prompt
      )
      .map((question) => {
        const id = String(
          question.id
        ).trim();

        const prompt = String(
          question.prompt
        ).trim();

        if (!id || !prompt) {
          return null;
        }

        if (seenIds.has(id)) {
          throw new Error(
            `ReconstructionGenerator: duplicate question id "${id}".`
          );
        }

        seenIds.add(id);

        const defaults =
          DEFAULT_QUESTION_META[id] || {};

        return {
          id,
          prompt,
          phase:
            String(
              question.phase || ''
            ).trim() ||
            defaults.phase ||
            'execution',
          exclusiveGroup:
            String(
              question.exclusiveGroup || ''
            ).trim() ||
            defaults.exclusiveGroup ||
            id
        };
      })
      .filter(Boolean);
  }

  static getArray(source, keys) {
    if (Array.isArray(source)) {
      return source;
    }

    for (const key of keys) {
      if (
        Array.isArray(source?.[key])
      ) {
        return source[key];
      }
    }

    return [];
  }

  static cloneCard(card) {
    return {
      ...card,
      skills: [...card.skills],
      scene: [...card.scene],
      tags: [...card.tags],
      reconstructionUses:
        card.reconstructionUses.map(
          (use) => ({
            ...use,
            skills: [...use.skills]
          })
        )
    };
  }

  static uniqueStrings(value) {
    const values = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [];

    const seen = new Set();

    return values.reduce(
      (result, entry) => {
        const text = String(
          entry ?? ''
        ).trim();

        const key =
          this.normalize(text);

        if (
          !text ||
          seen.has(key)
        ) {
          return result;
        }

        seen.add(key);
        result.push(text);

        return result;
      },
      []
    );
  }

  static normalize(value) {
    const normalized = String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const aliases = {
      pickpocketing: 'pickpocket',
      'pick pocketing': 'pickpocket',
      pickpocket: 'pickpocket'
    };

    return (
      aliases[normalized] ||
      normalized
    );
  }

  static shuffle(
    array,
    rng = Math.random
  ) {
    const result = [...array];

    for (
      let index = result.length - 1;
      index > 0;
      index -= 1
    ) {
      const randomValue = rng();

      if (
        !Number.isFinite(randomValue) ||
        randomValue < 0 ||
        randomValue >= 1
      ) {
        throw new Error(
          'ReconstructionGenerator: rng must return a finite number greater than or equal to 0 and less than 1.'
        );
      }

      const swapIndex = Math.floor(
        randomValue * (index + 1)
      );

      [
        result[index],
        result[swapIndex]
      ] = [
        result[swapIndex],
        result[index]
      ];
    }

    return result;
  }
}