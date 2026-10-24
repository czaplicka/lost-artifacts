import {
  gameState,
  createDefaultReconstructedHeist
} from './GameData.js';

import {
  saveGameState,
  requestAutosave
} from './gameStatePersistence.js';

function toClueSlug(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'unknown';
}

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export class HiddenObjectsState {
  constructor(sceneContext) {
    this.scene = sceneContext;
  }

  ensureStateStructure() {
    [
      'specialScenesVisited',
      'specialScenesCompleted',
      'crimeBoardData'
    ].forEach((key) => {
      if (!isRecord(gameState[key])) {
        gameState[key] = {};
      }
    });

    if (!Array.isArray(gameState.hiddenObjectHistory)) {
      gameState.hiddenObjectHistory = [];
    }

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (
      !Array.isArray(
        gameState.crimeBoardData.visitedCrimeScenes
      )
    ) {
      gameState.crimeBoardData.visitedCrimeScenes = [];
    }

    if (
      !Array.isArray(
        gameState.crimeBoardData.sceneFoundObjects
      )
    ) {
      gameState.crimeBoardData.sceneFoundObjects = [];
    }

    if (!isRecord(gameState.reconstructedHeist)) {
      gameState.reconstructedHeist =
        createDefaultReconstructedHeist();
    }
  }

  getVisitKey() {
    const missionId = gameState.currentMission?.id;

    const missionCity =
      gameState.currentMission?.city ||
      this.scene.cityId ||
      'unknown';

    const artifact =
      gameState.currentMission?.artifact ||
      gameState.currentArtifact ||
      'artifact';

    if (missionId) {
      return `${this.scene.sceneId}_${missionId}`;
    }

    return (
      `${this.scene.sceneId}_` +
      `${missionCity}_${artifact}`
    );
  }

  isQuestAlreadyDone() {
    const completed = gameState.specialScenesCompleted;

    return Boolean(
      isRecord(completed) &&
      completed[this.getVisitKey()]
    );
  }

  storeHiddenObjectClue(
    itemData,
    clueType = 'soft_clue'
  ) {
    if (
      !itemData ||
      itemData.id === undefined ||
      itemData.id === null
    ) {
      return;
    }

    this.ensureStateStructure();

    const itemId = String(itemData.id);

    const alreadyStoredObject =
      gameState.hiddenObjectHistory.some((entry) => {
        return (
          entry &&
          String(entry.id) === itemId &&
          entry.scene === this.scene.sceneId &&
          entry.cityId === this.scene.cityId
        );
      });

    const skills =
      this.scene.normalizeSkills(itemData.skills);

    if (!alreadyStoredObject) {
      gameState.addHiddenObjectAttempt({
        id: itemData.id,
        item: itemData.item,
        scene: this.scene.sceneId,
        cityId: this.scene.cityId,
        clueType,
        skills,
        heistExplanation:
          itemData.heistExplanation || '',
        trueExplanation:
          itemData.trueExplanation || '',
        foundAt: Date.now()
      });
    }

    skills.forEach((skill) => {
      const normalizedSkill = String(skill).trim();

      if (!normalizedSkill) return;

      const alreadyExists =
        gameState.cluesCollected.some((clue) => {
          return (
            clue?.type === 'suspect' &&
            clue?.category === 'skills' &&
            String(clue.value).toLowerCase() ===
              normalizedSkill.toLowerCase()
          );
        });

      if (alreadyExists) return;

      gameState.addClue({
        id: `hidden_skill_${toClueSlug(normalizedSkill)}`,
        type: 'suspect',
        category: 'skills',
        value: normalizedSkill,
        source: 'hidden_object',
        itemId: itemData.id,
        cityId: this.scene.cityId,
        text: `Skill: ${normalizedSkill}`
      });
    });

    requestAutosave();
  }

  saveFoundObjectsToCrimeBoard() {
    this.ensureStateStructure();

    const scene = this.scene;
    const objects =
      gameState.crimeBoardData.sceneFoundObjects;

    scene.foundItems.forEach((rawItemId) => {
      const itemId = String(rawItemId);
      const itemData = scene.itemsById[itemId];

      if (!itemData) return;

      const uniqueKey =
        `${scene.sceneId}_${scene.cityId}_${itemId}`;

      const alreadySaved = objects.some((entry) => {
        return entry?.uniqueKey === uniqueKey;
      });

      if (alreadySaved) return;

      objects.push({
        uniqueKey,
        id: itemId,
        item: itemData.item || itemId,
        description:
          itemData.heistExplanation ||
          itemData.trueExplanation ||
          '',
        sceneId: scene.sceneId,
        cityId: scene.cityId,
        isRedHerring: Boolean(itemData.isRedHerring),
        isMissionRelevant:
          scene.missionRelevantItemIds.has(itemId),
        clueType: itemData.clueType || 'soft_clue',
        foundAt: Date.now()
      });
    });
  }

  saveCrimeBoardPhoto(success = false) {
    this.ensureStateStructure();

    const scene = this.scene;
    const visitKey = this.getVisitKey();
    const completed = Boolean(success);

    const photos =
      gameState.crimeBoardData.visitedCrimeScenes;

    const existingPhoto = photos.find((entry) => {
      return entry?.visitKey === visitKey;
    });

    if (existingPhoto) {
      // Sukces aktualizuje wcześniejszą porażkę.
      // Późniejsza porażka nie usuwa sukcesu.
      existingPhoto.success =
        existingPhoto.success === true || completed;

      return;
    }

    photos.push({
      visitKey,
      sceneId: scene.sceneId,
      cityId: scene.cityId,
      displayName: scene.title,
      assetKey: scene.backgroundKey,
      imagePath: scene.backgroundPath,
      missionId: gameState.currentMission?.id || null,
      success: completed,
      visitedAt: Date.now()
    });
  }

  markSceneVisited(success = false) {
    this.ensureStateStructure();

    const visitKey = this.getVisitKey();
    const completed = Boolean(success);

    gameState.specialScenesVisited[visitKey] = true;

    if (completed) {
      gameState.specialScenesCompleted[visitKey] = true;
    }

    this.saveCrimeBoardPhoto(completed);
    this.saveFoundObjectsToCrimeBoard();

    saveGameState();
  }

  saveReconstructionCards(reconstructionData) {
    if (!isRecord(reconstructionData)) {
      throw new Error(
        '[HiddenObjectsState] ' +
        'Reconstruction data must be an object.'
      );
    }

    gameState.reconstructedHeist = reconstructionData;
    saveGameState();
  }
}