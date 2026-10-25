import { gameState } from '../../GameData.js';

export class HiddenObjectsDataLoader {
  constructor(scene) {
    this.scene = scene;
  }

  preloadAssets() {
    const scene = this.scene;
    if (!scene.objectsDataPath || scene.objectsDataPath === 'assets/data/objects.json') {
      scene.objectsDataKey = 'objects-data:' + scene.sceneId;
      scene.objectsDataPath = 'assets/data/objects/' + scene.sceneId + '.json';
    }
    if (scene.backgroundPath && !scene.textures.exists(scene.backgroundKey)) {
      scene.load.image(scene.backgroundKey, scene.backgroundPath);
    }
    if (scene.mapPath && !scene.cache.tilemap.exists(scene.mapKey)) {
      scene.load.tilemapTiledJSON(scene.mapKey, scene.mapPath);
    }
    if (scene.objectsDataPath && !scene.cache.json.exists(scene.objectsDataKey)) {
      scene.load.json(scene.objectsDataKey, scene.objectsDataPath);
    }
  }

  loadObjectsData() {
    const scene = this.scene;
    const rawData = scene.cache.json.get(scene.objectsDataKey);
    if (!Array.isArray(rawData)) {
      console.error(`[HiddenObjectsDataLoader] Objects data "${scene.objectsDataKey}" is missing or not an array.`, rawData);
      return false;
    }
    scene.itemsData = rawData;
    scene.itemsById = {};
    rawData.forEach((item) => {
      if (!item || item.id === undefined || item.id === null) return;
      scene.itemsById[String(item.id)] = item;
    });
    scene.sceneItems = rawData.filter((item) => item && Array.isArray(item.scene) && item.scene.includes(scene.sceneId));
    this.debugLog('Objects loaded.', {
      sceneId: scene.sceneId,
      totalItems: scene.itemsData.length,
      sceneItemsCount: scene.sceneItems.length
    });
    return true;
  }

  getGeneratedCardIds() {
    const rawIds = gameState.reconstructedHeist?.foundCardIds;
    if (!Array.isArray(rawIds)) return [];
    return [...new Set(rawIds.map((id) => String(id).trim()).filter(Boolean))];
  }

  pickActiveItems(legacyCount = 6) {
    const generatedIds = this.getGeneratedCardIds();
    if (generatedIds.length > 0) return this.pickGeneratedItems(generatedIds);
    return this.pickLegacyItems(legacyCount);
  }

  pickGeneratedItems(generatedIds) {
    const scene = this.scene;
    const sceneItemMap = new Map(scene.sceneItems.map((item) => [String(item.id), item]));
    const missingIds = generatedIds.filter((id) => !sceneItemMap.has(id));
    if (missingIds.length > 0) {
      this.handleSetupFailure(`Generated reconstruction contains IDs unavailable in scene "${scene.sceneId}": ${missingIds.join(', ')}.`);
      return false;
    }
    scene.activeItems = generatedIds.map((id) => sceneItemMap.get(id));
    scene.activeCount = scene.activeItems.length;
    scene.activeItemIds = new Set(generatedIds);
    scene.missionRelevantItemIds = new Set((gameState.reconstructedHeist?.solutionCardIds || []).map((id) => String(id)));
    this.debugLog('Using generated reconstruction cards.', {
      sceneId: scene.sceneId,
      generatedIds,
      solutionCardIds: [...scene.missionRelevantItemIds]
    });
    return true;
  }

  pickLegacyItems(legacyCount = 6) {
    const scene = this.scene;
    console.warn('[HiddenObjectsDataLoader] No generated foundCardIds. Using legacy candidate pool.', {
      sceneId: scene.sceneId, legacyCount
    });
    scene.activeItems = scene.resolver.buildCandidatePool(scene.sceneItems, legacyCount);
    scene.activeItemIds = new Set(scene.activeItems.map((item) => String(item.id)));
    scene.missionRelevantItemIds = new Set(scene.activeItems.filter((item) => item.isCorrect).map((item) => String(item.id)));
    if (!scene.activeItems.length) {
      this.handleSetupFailure(`No active objects selected for scene "${scene.sceneId}".`);
      return false;
    }
    return true;
  }

  debugLog(message, details) {
    if (this.scene.debugHiddenObjects === true) {
      console.debug(`[HiddenObjectsDataLoader] ${message}`, details);
    }
  }

  handleSetupFailure(message) {
    const scene = this.scene;
    if (typeof scene.flow?.handleSceneSetupFailure === 'function') {
      scene.flow.handleSceneSetupFailure(message);
      return;
    }
    if (typeof scene.handleSceneSetupFailure === 'function') {
      scene.handleSceneSetupFailure(message);
      return;
    }
    console.error('[HiddenObjectsDataLoader] Setup failure could not be handled.', { message, sceneKey: scene.scene.key });
  }
}
