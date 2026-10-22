import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getUnifiedTravelManager } from '../../managers/UnifiedTravelManager.js';



const ENERGY_BASE_COSTS = {
  travel: {
    taxi: 3
  },
  activity: {
    crime_scene: 8,
    csi_lab: 12,
    apartment_visit: 6
  }
};



const ALIBI_DEBUNKED_STATUS = 'contradicted';



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
      `${this.scene?.cityId}_${mission.artifact || 'default'}`
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



    requestAutosave();



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



    requestAutosave();



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



  /**
   * Alibi jest obalone, gdy gracz poprawnie rozwiązał zagadkę osi czasu
   * (resolveAlibiTimelineSuccess ustawia deductionState.alibiStatus).
   */
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



    return suspect?.deductionState?.alibiStatus === ALIBI_DEBUNKED_STATUS;
  }



  hasAnyDebunkedAlibi() {
    const suspects = Array.isArray(gameState.caseSuspects)
      ? gameState.caseSuspects
      : [];



    return suspects.some(
      suspect =>
        suspect?.deductionState?.alibiStatus === ALIBI_DEBUNKED_STATUS
    );
  }



    trySpendEnergy(category, key) {
    const energyManager = getEnergyManager();

    if (category === 'travel') {
      const travelManager = getUnifiedTravelManager();
      const rule = travelManager.getTransportRule(key);

      if (!rule) {
        console.error(
          `[CrimeCityProgressService] Unknown transport type for travel energy: "${key}"`
        );

        return false;
      }

      // Koszt bazowy to próbka jednej godziny podróży.
      const baseEnergyCost = Math.max(
        2,
        Math.round(1 * rule.energyPerHour)
      );

      const cost = energyManager.scaleCost(baseEnergyCost);

      if (energyManager.getCurrentEnergy() < cost) {
        this.scene?.showNoEnergyPopup();
        return false;
      }

      const travelResult = energyManager.consumeCustom(
        cost,
        `Travel (${key}): -${cost}`,
        { requireFullAmount: true, activityType: `travel_${key}` }
      );

      if (!travelResult?.success) {
        this.scene?.showNoEnergyPopup();
        return false;
      }

      requestAutosave();
      return true;
    }

    if (category === 'activity') {
      const baseCost = ENERGY_BASE_COSTS.activity?.[key];

      if (!Number.isFinite(baseCost)) {
        console.error(
          `[CrimeCityProgressService] Unknown energy cost: category="${category}", key="${key}". Allowed: ${Object.keys(ENERGY_BASE_COSTS.activity).join(', ')}`
        );

        return false;
      }

      const cost = energyManager.scaleCost(baseCost);

      if (energyManager.getCurrentEnergy() < cost) {
        this.scene?.showNoEnergyPopup();
        return false;
      }

      const result = energyManager.consumeActivity(key);

      if (!result?.success) {
        this.scene?.showNoEnergyPopup();
        return false;
      }

      requestAutosave();
      return true;
    }

    console.error(
      `[CrimeCityProgressService] Unknown energy category: "${category}"`
    );

    return false;
  }



  destroy() {
    this.scene = null;
  }
}