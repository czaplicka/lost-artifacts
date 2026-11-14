// scenes/crimeCity/CrimeCityProgressService.js
import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { CrimeLabManager } from '../CSI/CrimeLabManager.js';
import { isCompletedLabResult } from '../CSI/LabResultState.js';
import { getFiledAlibiConclusion } from '../../alibi/AlibiConclusion.js';

const ALLOWED_LOCAL_TRANSPORTS = new Set(['taxi']);
const ALLOWED_ACTIVITIES = new Set(['crime_scene', 'csi_lab', 'apartment_visit']);
const ALIBI_FINAL_STATUSES = new Set(['confirmed', 'contradicted']);
const ALIBI_DEBUNKED_STATUS = 'contradicted';

export class CrimeCityProgressService {
  constructor(scene) {
    this.scene = scene;
  }

  getCaseKey() {
    const mission = gameState.currentMission || {};
    return String(
      mission.id || mission.caseId ||
      `${this.scene?.cityId}_${mission.artifact || 'default'}`
    );
  }

  getLabCaseKey() {
    const manager = new CrimeLabManager(gameState, this.scene?.cityId);
    return manager.getCaseKey();
  }

  getCrimeSceneVisitKey() {
    const mission = gameState.currentMission || {};
    const sceneId = mission.scene || 'unknown_scene';
    const missionId = mission.id;
    const missionCity = mission.city || this.scene?.cityId || 'unknown';
    const artifact = mission.artifact || gameState.currentArtifact || 'artifact';
    if (missionId) return `${sceneId}_${missionId}`;
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
    if (!gameState.crimeCityCurrentNodes || typeof gameState.crimeCityCurrentNodes !== 'object') {
      gameState.crimeCityCurrentNodes = {};
    }
    if (!gameState.crimeCityCurrentNodes[caseKey]) {
      gameState.crimeCityCurrentNodes[caseKey] = 'arrival';
    }
    return gameState.crimeCityCurrentNodes[caseKey];
  }

  getCurrentNode() {
    return gameState.crimeCityCurrentNodes?.[this.getCaseKey()] || 'arrival';
  }

  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') {
    if (!targetNodeId) {
      console.warn('[CrimeCityProgressService] Missing target node ID.');
      return false;
    }
    if (targetNodeId === 'apartment' && !this.hasAnyDebunkedAlibi()) {
      this.showUnresolvedAlibisMessage();
      return false;
    }
    const caseKey = this.getCaseKey();
    const currentNodeId = gameState.crimeCityCurrentNodes?.[caseKey] || 'arrival';
    if (currentNodeId === targetNodeId) return true;
    const spent = this.trySpendEnergy('travel', transportType, { autosave: false });
    if (!spent) return false;
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
    return Boolean(this.getCrimeCityProgress().crimeLabEntryPaid);
  }

  payCrimeLabEntryOnce() {
    const progress = this.getCrimeCityProgress();
    if (progress.crimeLabEntryPaid) return true;
    const spent = this.trySpendEnergy('activity', 'csi_lab', { autosave: false });
    if (!spent) return false;
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
    return Boolean(gameState.specialScenesCompleted?.[this.getCrimeSceneVisitKey()]);
  }

  isCrimeLabCompleted() {
    if (this.getCrimeCityProgress().crimeLabCompleted) return true;
    const labCaseKey = this.getLabCaseKey();
    const labProgress = gameState.crimeCityProgress?.[labCaseKey];
    if (labProgress?.crimeLabCompleted !== true) return false;
    const forensics = gameState.caseForensics?.[labCaseKey];
    if (!forensics) return false;
    const results = [
      forensics.identityEvidenceResult,
      forensics.traceEvidenceResults?.[0],
      forensics.traceEvidenceResults?.[1]
    ];
    const cityId = this.scene?.cityId;
    return results.every(result => {
      if (!isCompletedLabResult(result, { caseKey: labCaseKey })) return false;
      if (result.cityId != null && cityId != null && result.cityId !== cityId) return false;
      return true;
    });
  }

  isGridCompleted() {
    const reconstruction = gameState.reconstructedHeists?.[this.getCaseKey()] ||
      gameState.reconstructedHeist;
    return Boolean(
      reconstruction && typeof reconstruction.playerTheoryResult === 'string' &&
      reconstruction.playerTheoryResult.length > 0
    );
  }

  getAlibiResolutionProgress() {
    const caseKey = this.getCaseKey();
    const incomplete = { ready: false, total: 0, resolved: 0, pendingIds: [], conclusions: [] };
    if (!caseKey || gameState.suspectExclusionState?.[caseKey]?.finished !== true) {
      return incomplete;
    }
    // The original generated subject list remains authoritative after one alibi is confirmed.
    // Filtering current surviving suspects here could silently drop an unresolved alibi.
    const subjects = gameState.caseData?.alibiCases?.[caseKey]?.suspects;
    if (!Array.isArray(subjects) || subjects.length === 0) return incomplete;
    const ids = subjects.map(subject => subject?.suspectId);
    if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) {
      return incomplete;
    }
    const conclusions = ids.map(suspectId => {
      const filed = getFiledAlibiConclusion(caseKey, suspectId);
      const final = filed?.locked === true && ALIBI_FINAL_STATUSES.has(filed.status);
      return { suspectId, status: final ? filed.status : 'pending', final };
    });
    const pendingIds = conclusions.filter(item => !item.final).map(item => item.suspectId);
    return {
      ready: pendingIds.length === 0,
      total: conclusions.length,
      resolved: conclusions.length - pendingIds.length,
      pendingIds,
      conclusions
    };
  }

  areAllAlibisResolved() {
    return this.getAlibiResolutionProgress().ready;
  }

  // These methods are the map/dispatch eligibility gate; they do not change filed alibi statuses.
  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;
    const progress = this.getAlibiResolutionProgress();
    return progress.ready && progress.conclusions.some(item =>
      item.suspectId === suspectId && item.status === ALIBI_DEBUNKED_STATUS
    );
  }

  hasAnyDebunkedAlibi() {
    const progress = this.getAlibiResolutionProgress();
    return progress.ready && progress.conclusions.some(item =>
      item.status === ALIBI_DEBUNKED_STATUS
    );
  }

  showUnresolvedAlibisMessage() {
    this.scene?.showMessage?.(
      'Resolve every suspect alibi before dispatching the arrest team.\n' +
      'Interview the witnesses and file a conclusion for each suspect.',
      3500,
      '#5d2a00'
    );
  }

  showNoEnergyPopup() {
    this.scene?.showNoEnergyPopup?.();
  }

  requestProgressAutosave() {
    if (!gameState.caseFailed) requestAutosave();
  }

  trySpendEnergy(category, key, { autosave = true } = {}) {
    if (category === 'activity' && key === 'apartment_visit' && !this.hasAnyDebunkedAlibi()) {
      this.showUnresolvedAlibisMessage();
      return false;
    }
    const energyManager = getEnergyManager();
    if (category === 'travel') {
      if (!ALLOWED_LOCAL_TRANSPORTS.has(key)) {
        console.error('[CrimeCityProgressService] ' + `Unknown local transport: "${key}".`);
        return false;
      }
      const cost = energyManager.getTravelCost(key);
      const affordability = energyManager.canAfford(cost);
      if (!affordability.ok) { this.showNoEnergyPopup(); return false; }
      const result = energyManager.consumeCustom(cost, `Travel (${key}): -${cost}`, {
        requireFullAmount: true, activityType: `travel_${key}`
      });
      if (!result?.success) { this.showNoEnergyPopup(); return false; }
      if (autosave) this.requestProgressAutosave();
      return true;
    }
    if (category === 'activity') {
      if (!ALLOWED_ACTIVITIES.has(key)) {
        console.error('[CrimeCityProgressService] ' + `Unknown activity: "${key}".`);
        return false;
      }
      const affordability = energyManager.canPerformActivity(key);
      if (!affordability.ok) { this.showNoEnergyPopup(); return false; }
      const result = energyManager.consumeActivity(key);
      if (!result?.success) { this.showNoEnergyPopup(); return false; }
      if (autosave) this.requestProgressAutosave();
      return true;
    }
    console.error('[CrimeCityProgressService] ' + `Unknown energy category: "${category}".`);
    return false;
  }

  destroy() {
    this.scene = null;
  }
}