import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../EnergyManager.js';
import { saveGameState } from '../../GameStatePersistence.js';

const ENERGY_BASE_COSTS = {
  travel: {
    taxi: 8
  },
  activity: {
    crime_scene: 8,
    csi_lab: 12
  }
};

export class CrimeCityProgressService {
  constructor(scene) {
    this.scene = scene;
  }

  getCaseKey() {
    const mission =
      gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.scene.cityId}_${mission.artifact || 'default'}`
    );
  }

  getCrimeSceneVisitKey() {
    const mission =
      gameState.currentMission || {};

    const sceneId =
      mission.scene || 'unknown_scene';

    const missionId = mission.id;

    const missionCity =
      mission.city ||
      this.scene.cityId ||
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

    /*
     * Remaining in the same location should not cost energy.
     */
    if (currentNodeId === targetNodeId) {
      return true;
    }

    if (!this.trySpendEnergy('travel', transportType)) {
      return false;
    }

    gameState.crimeCityCurrentNodes ??= {};

    gameState.crimeCityCurrentNodes[caseKey] =
      targetNodeId;

    saveGameState();

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

    const paidSuccessfully = this.trySpendEnergy(
      'activity',
      'csi_lab'
    );

    if (!paidSuccessfully) {
      return false;
    }

    progress.crimeLabEntryPaid = true;
    progress.crimeLabEntryPaidAt = Date.now();

    saveGameState();

    return true;
  }

  isCrimeSceneCompleted() {
    const visitKey =
      this.getCrimeSceneVisitKey();

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

  trySpendEnergy(category, key) {
    const energyManager = getEnergyManager();

    const baseCost =
      ENERGY_BASE_COSTS[category]?.[key];

    if (!Number.isFinite(baseCost)) {
      console.error(
        '[CrimeCityProgressService] Unknown energy cost.',
        {
          category,
          key
        }
      );

      return false;
    }

    const cost =
      energyManager.scaleCost(baseCost);

    if (
      energyManager.getCurrentEnergy() < cost
    ) {
      this.scene.showNoEnergyPopup();

      return false;
    }

    if (category === 'travel') {
      energyManager.consumeTravel(key);
    }

    if (category === 'activity') {
      energyManager.consumeActivity(key);
    }

    saveGameState();

    return true;
  }

  destroy() {
    this.scene = null;
  }
}