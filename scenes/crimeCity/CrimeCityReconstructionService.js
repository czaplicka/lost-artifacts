import { ReconstructionGenerator } from '../../ReconstructionGenerator.js';

export class CrimeCityReconstructionService {
  constructor({
    cache,
    gameState,
    cityId,
    getCaseKey
  } = {}) {
    this.cache = cache || null;
    this.gameState = gameState || {};
    this.cityId = cityId || null;
    this.getCaseKey = typeof getCaseKey === 'function'
      ? getCaseKey
      : () => 'default_case';
  }

  getReconstructionData() {
    const rawObjectsData = this.cache?.json?.get('objects-data');
    const rawQuestionsData =
      this.cache?.json?.get('reconstruction_questions');

    const items = Array.isArray(rawObjectsData)
      ? rawObjectsData
      : rawObjectsData?.objects ||
        rawObjectsData?.items ||
        rawObjectsData?.hiddenObjects ||
        [];

    const questions = Array.isArray(rawQuestionsData)
      ? rawQuestionsData
      : rawQuestionsData?.reconstructionQuestions ||
        rawQuestionsData?.questions ||
        [];

    if (!Array.isArray(items) || items.length === 0) {
      console.error(
        '[CrimeCityReconstructionService] Reconstruction objects data is missing or invalid.',
        {
          cacheKey: 'objects-data',
          rawObjectsData,
          normalizedItems: items
        }
      );

      return null;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      console.error(
        '[CrimeCityReconstructionService] Reconstruction questions data is missing or invalid.',
        {
          cacheKey: 'reconstruction_questions',
          rawQuestionsData,
          normalizedQuestions: questions
        }
      );

      return null;
    }

    return {
      items,
      questions
    };
  }

  prepareReconstruction() {
    const caseKey = this.getCaseKey();

    if (
      !this.gameState.reconstructedHeists ||
      typeof this.gameState.reconstructedHeists !== 'object'
    ) {
      this.gameState.reconstructedHeists = {};
    }

    const existingReconstruction =
      this.gameState.reconstructedHeists[caseKey];

    if (
      existingReconstruction &&
      Array.isArray(existingReconstruction.foundCardIds) &&
      existingReconstruction.foundCardIds.length === 6
    ) {
      this.gameState.reconstructedHeist =
        existingReconstruction;

      console.log(
        '[CrimeCityReconstructionService] Reusing existing reconstruction.',
        {
          caseKey,
          sceneId: existingReconstruction.sceneId,
          foundCardIds: existingReconstruction.foundCardIds
        }
      );

      return existingReconstruction;
    }

    const mission = this.gameState.currentMission;

    if (!mission?.scene) {
      console.error(
        '[CrimeCityReconstructionService] Cannot generate reconstruction: mission or mission.scene is missing.',
        {
          mission
        }
      );

      return null;
    }

    const actualThief = this.resolveActualThief();

    if (!actualThief?.id) {
      console.error(
        '[CrimeCityReconstructionService] Cannot generate reconstruction: actual thief is missing.',
        {
          mission,
          currentThief: this.gameState.currentThief,
          currentThiefId: this.gameState.currentThiefId,
          actualThiefId:
            mission.actualThiefId ||
            mission.thiefId ||
            this.gameState.actualThiefId,
          suspectPool: this.gameState.suspectPool,
          currentSuspectPool:
            this.gameState.currentSuspectPool,
          thieves: this.gameState.thieves
        }
      );

      return null;
    }

    const thiefSkills = this.normalizeThiefSkills(
      actualThief.skills
    );

    if (thiefSkills.length < 3) {
      console.error(
        '[CrimeCityReconstructionService] Cannot generate reconstruction: thief has fewer than 3 skills.',
        {
          actualThiefId: actualThief.id,
          thiefSkills,
          actualThief
        }
      );

      return null;
    }

    const reconstructionData =
      this.getReconstructionData();

    if (!reconstructionData) {
      return null;
    }

    try {
      const reconstructedHeist =
        ReconstructionGenerator.generate({
          items: reconstructionData.items,
          questions: reconstructionData.questions,
          missionId: mission.id || caseKey,
          cityId:
            mission.cityId ||
            mission.city ||
            this.cityId,
          sceneId: mission.scene,
          thiefId: actualThief.id,
          thiefSkills,
          cardCount: 6,
          claimCount: 3
        });

      if (
        !reconstructedHeist ||
        !Array.isArray(reconstructedHeist.foundCardIds) ||
        reconstructedHeist.foundCardIds.length !== 6
      ) {
        console.error(
          '[CrimeCityReconstructionService] ReconstructionGenerator returned invalid data.',
          {
            caseKey,
            reconstructedHeist,
            itemsCount: reconstructionData.items.length,
            questionsCount:
              reconstructionData.questions.length
          }
        );

        return null;
      }

      this.gameState.reconstructedHeists[caseKey] =
        reconstructedHeist;

      this.gameState.reconstructedHeist =
        reconstructedHeist;

      console.log(
        '[CrimeCityReconstructionService] Reconstruction generated.',
        {
          caseKey,
          sceneId: reconstructedHeist.sceneId,
          thiefId: reconstructedHeist.thiefId,
          thiefSkills: reconstructedHeist.thiefSkills,
          claims: reconstructedHeist.claims?.map(
            (claim) => ({
              questionId: claim.questionId,
              solutionItemId: claim.solutionItemId,
              thiefSkill: claim.thiefSkill
            })
          ),
          foundCardIds: reconstructedHeist.foundCardIds
        }
      );

      return reconstructedHeist;
    } catch (error) {
      console.error(
        '[CrimeCityReconstructionService] ReconstructionGenerator failed.',
        {
          caseKey,
          sceneId: mission.scene,
          thiefId: actualThief.id,
          thiefSkills,
          error
        }
      );

      return null;
    }
  }

  resolveActualThief() {
    const mission =
      this.gameState.currentMission || {};

    if (this.gameState.currentThief?.id) {
      return this.gameState.currentThief;
    }

    if (mission.actualThief?.id) {
      return mission.actualThief;
    }

    const actualThiefId =
      this.gameState.currentThiefId ||
      mission.actualThiefId ||
      mission.thiefId ||
      this.gameState.actualThiefId;

    const possiblePools = [
      mission.suspectPool,
      this.gameState.suspectPool,
      this.gameState.currentSuspectPool,
      this.gameState.thieves,
      this.gameState.caseSuspects
    ];

    for (const pool of possiblePools) {
      if (!Array.isArray(pool)) {
        continue;
      }

      const thief = pool.find(
        (suspect) => suspect?.id === actualThiefId
      );

      if (thief) {
        return thief;
      }
    }

    return null;
  }

  normalizeThiefSkills(skills) {
    if (Array.isArray(skills)) {
      return skills
        .map((skill) => String(skill || '').trim())
        .filter(Boolean);
    }

    if (typeof skills === 'string') {
      return skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    return [];
  }
}