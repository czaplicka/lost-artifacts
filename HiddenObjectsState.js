import { gameState, saveGameState } from '../GameData.js';

export class HiddenObjectsState {
  /**
   * @param {Object} sceneContext - Odniesienie do instancji HiddenObjectsScene
   */
  constructor(sceneContext) {
    this.scene = sceneContext;
  }

  /**
   * Inicjalizuje wymagane struktury w gameState, jeśli jeszcze nie istnieją.
   */
  ensureStateStructure() {
    if (!gameState.specialScenesVisited || typeof gameState.specialScenesVisited !== 'object') {
      gameState.specialScenesVisited = {};
    }

    if (!gameState.specialScenesCompleted || typeof gameState.specialScenesCompleted !== 'object') {
      gameState.specialScenesCompleted = {};
    }

    if (!Array.isArray(gameState.hiddenObjectHistory)) {
      gameState.hiddenObjectHistory = [];
    }

    if (!Array.isArray(gameState.cluesCollected)) {
      gameState.cluesCollected = [];
    }

    if (!gameState.crimeBoardData || typeof gameState.crimeBoardData !== 'object') {
      gameState.crimeBoardData = {};
    }

    if (!Array.isArray(gameState.crimeBoardData.visitedCrimeScenes)) {
      gameState.crimeBoardData.visitedCrimeScenes = [];
    }

    if (!Array.isArray(gameState.crimeBoardData.sceneFoundObjects)) {
      gameState.crimeBoardData.sceneFoundObjects = [];
    }

    if (!gameState.reconstructedHeist || typeof gameState.reconstructedHeist !== 'object') {
      gameState.reconstructedHeist = {
        cityId: null,
        sceneId: null,
        thiefId: null,
        thiefName: null,
        thiefSkills: [],
        allCards: [],
        correctCardIds: [],
        correctSequence: [],
        selectedCards: [],
        playerOrderedCards: [],
        playerOrderedSentences: [],
        playerFinalText: '',
        playerSkills: [],
        playerTheoryScore: 0,
        playerTheoryResult: null,
        playerSlotFeedback: [],
        playerAttemptsLeft: 3
      };
    }
  }

  /**
   * Generuje unikalny klucz wizyty na podstawie misji, miasta i artefaktu.
   */
  getVisitKey() {
    const missionId = gameState.currentMission?.id;
    const missionCity = gameState.currentMission?.city || this.scene.cityId || 'unknown';
    const artifact = gameState.currentMission?.artifact || gameState.currentArtifact || 'artifact';

    if (missionId) {
      return `${this.scene.sceneId}_${missionId}`;
    }

    return `${this.scene.sceneId}_${missionCity}_${artifact}`;
  }

  /**
   * Sprawdza, czy to zadanie zostało już ukończone.
   */
  isQuestAlreadyDone() {
    const completed = gameState.specialScenesCompleted;
    return !!(completed && completed[this.getVisitKey()]);
  }

  /**
   * Zapisuje zebraną poszlakę/dowód do gameState.
   */
  storeHiddenObjectClue(itemData, clueType = 'soft_clue') {
    if (!itemData) return;

    this.ensureStateStructure();

    const alreadyStoredObject = gameState.hiddenObjectHistory.some(
      entry =>
        entry?.id === itemData.id &&
        entry?.scene === this.scene.sceneId &&
        entry?.cityId === this.scene.cityId
    );

    if (!alreadyStoredObject) {
      gameState.hiddenObjectHistory.push({
        id: itemData.id,
        item: itemData.item,
        scene: this.scene.sceneId,
        cityId: this.scene.cityId,
        clueType,
        skills: this.scene.normalizeSkills(itemData.skills),
        heistExplanation: itemData.heistExplanation || '',
        trueExplanation: itemData.trueExplanation || '',
        foundAt: Date.now()
      });
    }

    const skills = this.scene.normalizeSkills(itemData.skills);

    skills.forEach((skill) => {
      const normalizedSkill = String(skill).trim();
      if (!normalizedSkill) return;

      const alreadyExists = gameState.cluesCollected.some(
        clue =>
          clue?.type === 'suspect' &&
          clue?.category === 'skills' &&
          String(clue?.value).toLowerCase() === normalizedSkill.toLowerCase()
      );

      if (!alreadyExists) {
        gameState.cluesCollected.push({
          type: 'suspect',
          category: 'skills',
          value: normalizedSkill,
          source: 'hidden_object',
          itemId: itemData.id,
          cityId: this.scene.cityId,
          text: `Skill: ${normalizedSkill}`
        });
      }
    });

    saveGameState();
  }

  /**
   * Zapisuje znalezione obiekty do tablicy dowodów (Crime Board).
   */
  saveFoundObjectsToCrimeBoard() {
    this.ensureStateStructure();

    this.scene.foundItems.forEach((itemId) => {
      const itemData = this.scene.itemsById[itemId];
      if (!itemData) return;

      const uniqueKey = `${this.scene.sceneId}_${this.scene.cityId}_${itemId}`;

      const alreadySaved = gameState.crimeBoardData.sceneFoundObjects.some(
        entry => entry.uniqueKey === uniqueKey
      );

      if (alreadySaved) return;

      gameState.crimeBoardData.sceneFoundObjects.push({
        uniqueKey,
        id: itemId,
        item: itemData.item || itemId,
 description: itemData.heistExplanation || itemData.trueExplanation || '',
        sceneId: this.scene.sceneId,
        cityId: this.scene.cityId,
        isRedHerring: !!itemData.isRedHerring,
        isMissionRelevant: this.scene.missionRelevantItemIds.has(itemId),
        clueType: itemData.clueType || 'soft_clue',
        foundAt: Date.now()
      });
    });
  }

  /**
   * Przypina zdjęcie/wpis miejsca zbrodni do Crime Board.
   */
  saveCrimeBoardPhoto(success = false) {
    this.ensureStateStructure();

    const visitKey = this.getVisitKey();

    const alreadyPinned = gameState.crimeBoardData.visitedCrimeScenes.some(
      entry => entry.visitKey === visitKey
    );

    if (alreadyPinned) return;

    gameState.crimeBoardData.visitedCrimeScenes.push({
      visitKey,
      sceneId: this.scene.sceneId,
      cityId: this.scene.cityId,
      displayName: this.scene.title,
      assetKey: this.scene.backgroundKey,
      imagePath: this.scene.backgroundPath,
      missionId: gameState.currentMission?.id || null,
      success,
      visitedAt: Date.now()
    });
  }

  /**
   * Oznacza scenę jako odwiedzoną / zaliczoną i wywołuje zapis stanu.
   */
  markSceneVisited(success = false) {
    this.ensureStateStructure();

    const visitKey = this.getVisitKey();
    gameState.specialScenesVisited[visitKey] = true;

    if (success) {
      gameState.specialScenesCompleted[visitKey] = true;
    }

    this.saveCrimeBoardPhoto(success);
    this.saveFoundObjectsToCrimeBoard();

    saveGameState();
  }

  /**
   * Zapisuje przygotowane dane do rekonstrukcji kradzieży.
   */
  saveReconstructionCards(reconstructionData) {
    gameState.reconstructedHeist = reconstructionData;
    saveGameState();
  }
}