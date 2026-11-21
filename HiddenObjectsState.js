import { dialogueText as __dialogueText } from './dialogues/DialogueText.js';
import { gameState, createDefaultReconstructedHeist } from './GameData.js';
import { saveGameState, requestAutosave } from './gameStatePersistence.js';
import { getCrimeSceneVisitKey } from './crimeSceneVisitKey.js';

function toClueSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}
function isRecord(value) { return Boolean(value && typeof value === 'object' && !Array.isArray(value)); }

export class HiddenObjectsState {
  constructor(sceneContext) { this.scene = sceneContext; }

  ensureStateStructure({ autosave = true } = {}) {
    const updates = {};
    for (const key of ['specialScenesVisited', 'specialScenesCompleted']) {
      if (!isRecord(gameState[key])) updates[key] = {};
    }
    if (!Array.isArray(gameState.hiddenObjectHistory)) updates.hiddenObjectHistory = [];
    if (!Array.isArray(gameState.cluesCollected)) updates.cluesCollected = [];
    if (!isRecord(gameState.reconstructedHeist)) updates.reconstructedHeist = createDefaultReconstructedHeist();

    const board = isRecord(gameState.crimeBoardData) ? gameState.crimeBoardData : {};
    const repairPhotos = !Array.isArray(board.visitedCrimeScenes);
    const repairObjects = !Array.isArray(board.sceneFoundObjects);
    if (!isRecord(gameState.crimeBoardData) || repairPhotos || repairObjects) {
      updates.crimeBoardData = {
        ...board,
        visitedCrimeScenes: repairPhotos ? [] : board.visitedCrimeScenes,
        sceneFoundObjects: repairObjects ? [] : board.sceneFoundObjects
      };
    }
    if (!Object.keys(updates).length) return false;
    const changed = gameState.updateState(updates);
    if (changed && autosave) requestAutosave();
    return changed;
  }

  getVisitKey() { return getCrimeSceneVisitKey(gameState); }

  isQuestAlreadyDone() {
    return Boolean(isRecord(gameState.specialScenesCompleted) && gameState.specialScenesCompleted[this.getVisitKey()]);
  }

  storeHiddenObjectClue(itemData, clueType = 'soft_clue') {
    if (!itemData || itemData.id === undefined || itemData.id === null) return;
    // This operation requests its own autosave once all changes are complete.
    this.ensureStateStructure({ autosave: false });
    const itemId = String(itemData.id);
    const alreadyStoredObject = gameState.hiddenObjectHistory.some(entry => entry && String(entry.id) === itemId &&
      entry.scene === this.scene.sceneId && entry.cityId === this.scene.cityId);
    const skills = this.scene.normalizeSkills(itemData.skills);
    if (!alreadyStoredObject) {
      gameState.addHiddenObjectAttempt({
        id: itemData.id, item: itemData.item, scene: this.scene.sceneId, cityId: this.scene.cityId,
        clueType, skills, heistExplanation: itemData.heistExplanation || '',
        trueExplanation: itemData.trueExplanation || '', foundAt: Date.now()
      });
    }
    skills.forEach(skill => {
      const normalizedSkill = String(skill).trim();
      if (!normalizedSkill) return;
      const alreadyExists = gameState.cluesCollected.some(clue => clue?.type === 'suspect' &&
        clue?.category === 'skills' && String(clue.value).toLowerCase() === normalizedSkill.toLowerCase());
      if (alreadyExists) return;
      gameState.addClue({
        id: `hidden_skill_${toClueSlug(normalizedSkill)}`, type: 'suspect', category: 'skills',
        value: normalizedSkill, source: 'hidden_object', itemId: itemData.id, cityId: this.scene.cityId,
        text: `${__dialogueText('HiddenObjectsState.js', 't_951f93164ad0f63643af')}${normalizedSkill}`
      });
    });
    requestAutosave();
  }

  saveFoundObjectsToCrimeBoard() {
    this.ensureStateStructure();
    const scene = this.scene;
    const board = gameState.crimeBoardData;
    const objects = [...board.sceneFoundObjects];
    let changed = false;
    scene.foundItems.forEach(rawItemId => {
      const itemId = String(rawItemId), itemData = scene.itemsById[itemId];
      if (!itemData) return;
      const uniqueKey = `${scene.sceneId}_${scene.cityId}_${itemId}`;
      if (objects.some(entry => entry?.uniqueKey === uniqueKey)) return;
      objects.push({
        uniqueKey, id: itemId, item: itemData.item || itemId,
        description: itemData.heistExplanation || itemData.trueExplanation || '',
        sceneId: scene.sceneId, cityId: scene.cityId, isRedHerring: Boolean(itemData.isRedHerring),
        isMissionRelevant: scene.missionRelevantItemIds.has(itemId),
        clueType: itemData.clueType || 'soft_clue', foundAt: Date.now()
      });
      changed = true;
    });
    if (changed) gameState.updateState({ crimeBoardData: { ...board, sceneFoundObjects: objects } });
  }

  saveCrimeBoardPhoto(success = false) {
    this.ensureStateStructure();
    const scene = this.scene, visitKey = this.getVisitKey(), completed = Boolean(success);
    const board = gameState.crimeBoardData;
    const photos = board.visitedCrimeScenes;
    const index = photos.findIndex(entry => entry?.visitKey === visitKey);
    if (index >= 0) {
      const nextSuccess = photos[index].success === true || completed;
      if (photos[index].success === nextSuccess) return;
      gameState.updateState({ crimeBoardData: {
        ...board,
        visitedCrimeScenes: photos.map((entry, i) => i === index ? { ...entry, success: nextSuccess } : entry)
      } });
      return;
    }
    gameState.updateState({ crimeBoardData: {
      ...board,
      visitedCrimeScenes: [...photos, {
        visitKey, sceneId: scene.sceneId, cityId: scene.cityId, displayName: scene.title,
        assetKey: scene.backgroundKey, imagePath: scene.backgroundPath,
        missionId: gameState.currentMission?.id || null, success: completed, visitedAt: Date.now()
      }]
    } });
  }

  markSceneVisited(success = false, { save = true } = {}) {
    // The caller owns the final save, including when repairs were necessary.
    this.ensureStateStructure({ autosave: false });
    const visitKey = this.getVisitKey(), completed = Boolean(success);
    const updates = { specialScenesVisited: { ...gameState.specialScenesVisited, [visitKey]: true } };
    if (completed) updates.specialScenesCompleted = { ...gameState.specialScenesCompleted, [visitKey]: true };
    gameState.updateState(updates);
    this.saveCrimeBoardPhoto(completed);
    this.saveFoundObjectsToCrimeBoard();
    if (save) saveGameState();
  }

  saveReconstructionCards(reconstructionData) {
    if (!isRecord(reconstructionData)) throw new Error('[HiddenObjectsState] Reconstruction data must be an object.');
    gameState.updateState({ reconstructedHeist: reconstructionData });
    saveGameState();
  }
}