import { gameState } from '../../GameData.js';

export class HiddenObjectsReconstructionSync {
  constructor(scene) {
    this.scene = scene;
  }

  synchronize() {
    const scene = this.scene;
    const reconstruction =
      gameState.reconstructedHeist;

    const generatedCardIds =
      this.getGeneratedCardIds();

    if (
      !reconstruction ||
      generatedCardIds.length === 0
    ) {
      this.createLegacyReconstructionData();

      return;
    }

    this.synchronizeGeneratedReconstruction(
      reconstruction
    );
  }

  createLegacyReconstructionData() {
    const scene = this.scene;

    const legacyData =
      scene.resolver.buildReconstructionCardsFromActiveItems(
        scene.activeItems,
        scene.cityId,
        scene.sceneId
      );

    legacyData.requiredSkills = Array.isArray(
      gameState.hypothesisEvidence?.requiredSkills
    )
      ? [
          ...gameState.hypothesisEvidence.requiredSkills
        ]
      : [];

    legacyData.hiddenObjectsCompleted = false;
    legacyData.hiddenObjectsCompletedAt = null;
    legacyData.collectedCardIds = [];

    scene.stateManager.saveReconstructionCards(
      legacyData
    );

    console.log(
      '[HiddenObjectsReconstructionSync] Legacy reconstruction created.',
      {
        sceneId: scene.sceneId,
        cityId: scene.cityId,
        foundCardIds: legacyData.foundCardIds,
        solutionCardIds: legacyData.solutionCardIds
      }
    );
  }

  synchronizeGeneratedReconstruction(reconstruction) {
    const scene = this.scene;

    reconstruction.cityId =
      reconstruction.cityId || scene.cityId;

    reconstruction.sceneId =
      reconstruction.sceneId || scene.sceneId;

    reconstruction.foundCardIds = scene.activeItems.map(
      (item) => String(item.id)
    );

    reconstruction.solutionCardIds = Array.isArray(
      reconstruction.solutionCardIds
    )
      ? reconstruction.solutionCardIds.map((id) =>
          String(id)
        )
      : [];

    reconstruction.collectedCardIds = Array.isArray(
      reconstruction.collectedCardIds
    )
      ? reconstruction.collectedCardIds.filter((id) =>
          reconstruction.foundCardIds.includes(String(id))
        )
      : [];

    reconstruction.requiredSkills = Array.isArray(
      gameState.hypothesisEvidence?.requiredSkills
    )
      ? [
          ...gameState.hypothesisEvidence.requiredSkills
        ]
      : [];

    reconstruction.hiddenObjectsCompleted ??= false;
    reconstruction.hiddenObjectsCompletedAt ??= null;

    if (
      !Array.isArray(reconstruction.allCards) ||
      reconstruction.allCards.length === 0
    ) {
      reconstruction.allCards = scene.activeItems.map(
        (item) => this.createReconstructionCard(item)
      );
    }

    console.log(
      '[HiddenObjectsReconstructionSync] Reconstruction synchronized.',
      {
        foundCardIds: reconstruction.foundCardIds,
        solutionCardIds:
          reconstruction.solutionCardIds,
        requiredSkills:
          reconstruction.requiredSkills,
        collectedCardIds:
          reconstruction.collectedCardIds
      }
    );
  }

  createReconstructionCard(item) {
    const scene = this.scene;
    const itemId = String(item.id);

    return {
      id: itemId,
      item: item.item,
      text: item.item,

      skills: Array.isArray(item.skills)
        ? [...item.skills]
        : [],

      scene: scene.sceneId,
      cityId: scene.cityId,

      correctOrder: Number.isInteger(
        item.correctOrder
      )
        ? item.correctOrder
        : -1,

      isCorrect: scene.missionRelevantItemIds.has(
        itemId
      ),

      isRedHerring: Boolean(item.isRedHerring),

      trueExplanation:
        item.trueExplanation || '',

      heistExplanation:
        item.heistExplanation || '',

      reconstructionUses: Array.isArray(
        item.reconstructionUses
      )
        ? [...item.reconstructionUses]
        : []
    };
  }

  recordCollectedCard(id) {
    const scene = this.scene;
    const reconstruction =
      gameState.reconstructedHeist;

    if (
      !reconstruction ||
      typeof reconstruction !== 'object'
    ) {
      return false;
    }

    const cardId = String(id);

    reconstruction.collectedCardIds = Array.isArray(
      reconstruction.collectedCardIds
    )
      ? reconstruction.collectedCardIds
      : [];

    if (!reconstruction.collectedCardIds.includes(cardId)) {
      reconstruction.collectedCardIds.push(cardId);
    }

    reconstruction.collectedEvidence ??= {};

    const foundItem = scene.itemsById[cardId];

    reconstruction.collectedEvidence[cardId] = {
      id: cardId,
      item: foundItem?.item || cardId,
      collectedAt: Date.now(),
      isMissionRelevant:
        scene.missionRelevantItemIds.has(cardId),
      clueType:
        foundItem?.clueType || 'soft_clue'
    };

    return true;
  }

  emitClueFound(itemData) {
    const scene = this.scene;

    if (!itemData) {
      return;
    }

    scene.events.emit('clue-found', {
      id: itemData.id,
      item: itemData.item,

      skills: this.normalizeSkills(itemData.skills),

      suspectAffinity:
        itemData.suspectAffinity || [],

      affinityWeight:
        itemData.affinityWeight || 0,

      clueType:
        itemData.clueType || 'soft_clue'
    });
  }

  getGeneratedCardIds() {
    const scene = this.scene;

    if (
      scene.dataLoader &&
      typeof scene.dataLoader.getGeneratedCardIds ===
        'function'
    ) {
      return scene.dataLoader.getGeneratedCardIds();
    }

    if (
      typeof scene.getGeneratedCardIds ===
      'function'
    ) {
      return scene.getGeneratedCardIds();
    }

    const rawIds =
      gameState.reconstructedHeist?.foundCardIds;

    if (!Array.isArray(rawIds)) {
      return [];
    }

    return [
      ...new Set(
        rawIds
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    ];
  }

  normalizeSkills(value) {
    const scene = this.scene;

    if (
      scene.resolver &&
      typeof scene.resolver.normalizeSkills ===
        'function'
    ) {
      return scene.resolver.normalizeSkills(value);
    }

    if (Array.isArray(value)) {
      return value
        .map((skill) => String(skill).trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean);
    }

    return [];
  }
}