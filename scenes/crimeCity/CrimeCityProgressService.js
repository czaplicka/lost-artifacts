// scenes/crimeCity/CrimeCityProgressService.js
import { gameState } from '../../GameData.js';

import {
  getEnergyManager
} from '../../managers/EnergyManager.js';

import {
  requestAutosave
} from '../../gameStatePersistence.js';

const ALLOWED_LOCAL_TRANSPORTS = new Set([
  'taxi'
]);

const ALLOWED_ACTIVITIES = new Set([
  'crime_scene',
  'csi_lab',
  'apartment_visit'
]);

const ALIBI_DEBUNKED_STATUS = 'contradicted';

export class CrimeCityProgressService {
  constructor(scene) {
    this.scene = scene;
  }

  getCaseKey() {
    const mission = gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.scene?.cityId}_${mission.artifact || 'default'}`
    );
  }

  getCrimeSceneVisitKey() {
    const mission = gameState.currentMission || {};
    const sceneId = mission.scene || 'unknown_scene';
    const missionId = mission.id;

    const missionCity =
      mission.city ||
      this.scene?.cityId ||
      'unknown';

    const artifact =
      mission.artifact ||
      gameState.currentArtifact ||
      'artifact';

    if (missionId) {
      return `${sceneId}_${missionId}`;
    }

    return `${sceneId}_${missionCity}_${artifact}`;
  }

  getCrimeCityProgress() {
    const caseKey = this.getCaseKey();

    gameState.crimeCityProgress ??= {};
    gameState.crimeCityProgress[caseKey] ??= {};

    return gameState.crimeCityProgress[caseKey];
  }

  initializeCurrentNode() {
    const caseKey = this.getCaseKey();

    if (
      !gameState.crimeCityCurrentNodes ||
      typeof gameState.crimeCityCurrentNodes !== 'object'
    ) {
      gameState.crimeCityCurrentNodes = {};
    }

    if (!gameState.crimeCityCurrentNodes[caseKey]) {
      gameState.crimeCityCurrentNodes[caseKey] = 'arrival';
    }

    return gameState.crimeCityCurrentNodes[caseKey];
  }

  getCurrentNode() {
    const caseKey = this.getCaseKey();

    return (
      gameState.crimeCityCurrentNodes?.[caseKey] ||
      'arrival'
    );
  }

  moveToCrimeCityNode(
    targetNodeId,
    transportType = 'taxi'
  ) {
    if (!targetNodeId) {
      console.warn(
        '[CrimeCityProgressService] Missing target node ID.'
      );

      return false;
    }

    const caseKey = this.getCaseKey();

    const currentNodeId =
      gameState.crimeCityCurrentNodes?.[caseKey] ||
      'arrival';

    if (currentNodeId === targetNodeId) {
      return true;
    }

    const spent = this.trySpendEnergy(
      'travel',
      transportType,
      { autosave: false }
    );

    if (!spent) {
      return false;
    }

    gameState.updateState({
      crimeCityCurrentNodes: {
        ...(gameState.crimeCityCurrentNodes || {}),
        [caseKey]: targetNodeId
      }
    });

    this.requestProgressAutosave();

    return true;
  }

  hasPaidCrimeLabEntry() {
    return Boolean(
      this.getCrimeCityProgress().crimeLabEntryPaid
    );
  }

  payCrimeLabEntryOnce() {
    const progress = this.getCrimeCityProgress();

    if (progress.crimeLabEntryPaid) {
      return true;
    }

    const spent = this.trySpendEnergy(
      'activity',
      'csi_lab',
      { autosave: false }
    );

    if (!spent) {
      return false;
    }

    const caseKey = this.getCaseKey();

    gameState.updateState({
      crimeCityProgress: {
        ...(gameState.crimeCityProgress || {}),
        [caseKey]: {
          ...progress,
          crimeLabEntryPaid: true,
          crimeLabEntryPaidAt: Date.now()
        }
      }
    });

    this.requestProgressAutosave();

    return true;
  }

  isCrimeSceneCompleted() {
    const visitKey = this.getCrimeSceneVisitKey();

    return Boolean(
      gameState.specialScenesCompleted?.[visitKey]
    );
  }

  isCrimeLabCompleted() {
    return Boolean(
      this.getCrimeCityProgress().crimeLabCompleted
    );
  }

  isGridCompleted() {
    const caseKey = this.getCaseKey();

    const reconstruction =
      gameState.reconstructedHeists?.[caseKey] ||
      gameState.reconstructedHeist;

    return Boolean(
      reconstruction &&
      typeof reconstruction.playerTheoryResult === 'string' &&
      reconstruction.playerTheoryResult.length > 0
    );
  }

  isAlibiDebunked(suspectId) {
    if (!suspectId) {
      return false;
    }

    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];

    const suspect = suspects.find(
      item => item?.id === suspectId
    );

    return (
      suspect?.deductionState?.alibiStatus ===
      ALIBI_DEBUNKED_STATUS
    );
  }

  hasAnyDebunkedAlibi() {
    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];

    return suspects.some(
      suspect =>
        suspect?.deductionState?.alibiStatus ===
        ALIBI_DEBUNKED_STATUS
    );
  }

  showNoEnergyPopup() {
    this.scene?.showNoEnergyPopup?.();
  }

  requestProgressAutosave() {
    if (!gameState.caseFailed) {
      requestAutosave();
    }
  }

  trySpendEnergy(category, key, { autosave = true } = {}) {
    const energyManager = getEnergyManager();

    if (category === 'travel') {
      if (!ALLOWED_LOCAL_TRANSPORTS.has(key)) {
        console.error(
          '[CrimeCityProgressService] ' +
          `Unknown local transport: "${key}".`
        );

        return false;
      }

      const cost = energyManager.getTravelCost(key);
      const affordability = energyManager.canAfford(cost);

      if (!affordability.ok) {
        this.showNoEnergyPopup();
        return false;
      }

      const result = energyManager.consumeCustom(
        cost,
        `Travel (${key}): -${cost}`,
        {
          requireFullAmount: true,
          activityType: `travel_${key}`
        }
      );

      if (!result?.success) {
        this.showNoEnergyPopup();
        return false;
      }

      if (autosave) {
        this.requestProgressAutosave();
      }

      return true;
    }

    if (category === 'activity') {
      if (!ALLOWED_ACTIVITIES.has(key)) {
        console.error(
          '[CrimeCityProgressService] ' +
          `Unknown activity: "${key}".`
        );

        return false;
      }

      const affordability =
        energyManager.canPerformActivity(key);

      if (!affordability.ok) {
        this.showNoEnergyPopup();
        return false;
      }

      const result =
        energyManager.consumeActivity(key);

      if (!result?.success) {
        this.showNoEnergyPopup();
        return false;
      }

      if (autosave) {
        this.requestProgressAutosave();
      }

      return true;
    }

    console.error(
      '[CrimeCityProgressService] ' +
      `Unknown energy category: "${category}".`
    );

    return false;
  }

  destroy() {
    this.scene = null;
  }
}