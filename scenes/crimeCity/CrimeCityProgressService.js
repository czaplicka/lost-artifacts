import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { getEnergyManager } from '../../managers/EnergyManager.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { isCompletedLabResult } from '../CSI/LabResultState.js';
import { getFiledAlibiConclusion } from '../../alibi/AlibiConclusion.js';
import { getCrimeSceneVisitKey } from '../../crimeSceneVisitKey.js';
import { getMissionCaseKey } from '../../crimeCaseKey.js';

const ALLOWED_LOCAL_TRANSPORTS = new Set(['taxi']);
const ALLOWED_ACTIVITIES = new Set(['crime_scene', 'csi_lab', 'apartment_visit']);
const ALIBI_FINAL_STATUSES = new Set(['confirmed', 'contradicted']);
const ALIBI_DEBUNKED_STATUS = 'contradicted';
const EMPTY_PROGRESS = Object.freeze({});
const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const asRecord = value => isRecord(value) ? value : {};
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const validNode = value => typeof value === 'string' && value.trim().length > 0;
const FILE = 'scenes/crimeCity/CrimeCityProgressService.js';
const text = key => __dialogueText(FILE, key);

export class CrimeCityProgressService {
  constructor(scene) { this.scene = scene; }

  getCaseKey() { return getMissionCaseKey(gameState, this.scene?.cityId); }

  // This is a pure lookup. No CrimeLabManager instance is needed.
  getLabCaseKey() { return getMissionCaseKey(gameState, this.scene?.cityId); }

  getCrimeSceneVisitKey() { return getCrimeSceneVisitKey(gameState); }

  getCrimeCityProgress() {
    const records = asRecord(gameState.crimeCityProgress);
    const key = this.getCaseKey();
    return own(records, key) && isRecord(records[key]) ? records[key] : EMPTY_PROGRESS;
  }

  initializeCurrentNode({ autosave = true } = {}) {
    const caseKey = this.getCaseKey();
    const nodes = asRecord(gameState.crimeCityCurrentNodes);
    if (own(nodes, caseKey) && validNode(nodes[caseKey])) return nodes[caseKey];
    const changed = gameState.updateState({
      crimeCityCurrentNodes: { ...nodes, [caseKey]: 'arrival' }
    });
    if (changed && autosave) this.requestProgressAutosave();
    return this.getCurrentNode();
  }

  getCurrentNode() {
    const nodes = asRecord(gameState.crimeCityCurrentNodes), key = this.getCaseKey();
    return own(nodes, key) && validNode(nodes[key]) ? nodes[key] : 'arrival';
  }

  moveToCrimeCityNode(targetNodeId, transportType = 'taxi') {
    if (!validNode(targetNodeId)) {
      console.warn('[CrimeCityProgressService] Missing or invalid target node ID.');
      return false;
    }
    if (!ALLOWED_LOCAL_TRANSPORTS.has(transportType)) {
      console.error(`[CrimeCityProgressService] Unknown local transport: "${transportType}".`);
      return false;
    }
    if (targetNodeId === 'apartment' && !this.hasAnyDebunkedAlibi()) {
      this.showUnresolvedAlibisMessage(); return false;
    }
    const caseKey = this.getCaseKey();
    if (this.getCurrentNode() === targetNodeId) return true;
    if (!this.trySpendEnergy('travel', transportType, { autosave: false })) return false;
    gameState.updateState({
      crimeCityCurrentNodes: { ...asRecord(gameState.crimeCityCurrentNodes), [caseKey]: targetNodeId }
    });
    this.requestProgressAutosave();
    return true;
  }

  hasPaidCrimeLabEntry() { return Boolean(this.getCrimeCityProgress().crimeLabEntryPaid); }

  payCrimeLabEntryOnce() {
    const progress = this.getCrimeCityProgress();
    if (progress.crimeLabEntryPaid) return true;
    const caseKey = this.getCaseKey();
    if (!this.trySpendEnergy('activity', 'csi_lab', { autosave: false })) return false;
    gameState.updateState({
      crimeCityProgress: {
        ...asRecord(gameState.crimeCityProgress),
        [caseKey]: { ...progress, crimeLabEntryPaid: true, crimeLabEntryPaidAt: Date.now() }
      }
    });
    this.requestProgressAutosave();
    return true;
  }

  isCrimeSceneCompleted() {
    return Boolean(gameState.specialScenesCompleted?.[this.getCrimeSceneVisitKey()]);
  }

  isCrimeLabCompleted() {
    // Preserve the existing completion contract; this change does not redesign CSI.
    if (this.getCrimeCityProgress().crimeLabCompleted) return true;
    const labCaseKey = this.getLabCaseKey();
    const labProgress = gameState.crimeCityProgress?.[labCaseKey];
    if (labProgress?.crimeLabCompleted !== true) return false;
    const forensics = gameState.caseForensics?.[labCaseKey];
    if (!forensics) return false;
    const results = [forensics.identityEvidenceResult, forensics.traceEvidenceResults?.[0], forensics.traceEvidenceResults?.[1]];
    const cityId = this.scene?.cityId;
    return results.every(result => {
      if (!isCompletedLabResult(result, { caseKey: labCaseKey })) return false;
      if (result.cityId != null && cityId != null && result.cityId !== cityId) return false;
      return true;
    });
  }

  isGridCompleted() {
    const reconstruction = gameState.reconstructedHeists?.[this.getCaseKey()] || gameState.reconstructedHeist;
    return Boolean(reconstruction && typeof reconstruction.playerTheoryResult === 'string' && reconstruction.playerTheoryResult.length > 0);
  }

  getAlibiResolutionProgress() {
    const caseKey = this.getCaseKey();
    const incomplete = { ready: false, total: 0, resolved: 0, pendingIds: [], conclusions: [] };
    if (!caseKey || gameState.suspectExclusionState?.[caseKey]?.finished !== true) return incomplete;
    // Always check the original subject list, not just suspects surviving filtering.
    const subjects = gameState.caseData?.alibiCases?.[caseKey]?.suspects;
    if (!Array.isArray(subjects) || subjects.length === 0) return incomplete;
    const ids = subjects.map(subject => subject?.suspectId);
    if (ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) return incomplete;
    const conclusions = ids.map(suspectId => {
      const filed = getFiledAlibiConclusion(caseKey, suspectId);
      const final = filed?.locked === true && ALIBI_FINAL_STATUSES.has(filed.status);
      return { suspectId, status: final ? filed.status : 'pending', final };
    });
    const pendingIds = conclusions.filter(item => !item.final).map(item => item.suspectId);
    return { ready: pendingIds.length === 0, total: conclusions.length, resolved: conclusions.length - pendingIds.length, pendingIds, conclusions };
  }

  areAllAlibisResolved() { return this.getAlibiResolutionProgress().ready; }

  isAlibiDebunked(suspectId) {
    if (!suspectId) return false;
    const progress = this.getAlibiResolutionProgress();
    return progress.ready && progress.conclusions.some(item => item.suspectId === suspectId && item.status === ALIBI_DEBUNKED_STATUS);
  }

  hasAnyDebunkedAlibi() {
    const progress = this.getAlibiResolutionProgress();
    return progress.ready && progress.conclusions.some(item => item.status === ALIBI_DEBUNKED_STATUS);
  }

  showUnresolvedAlibisMessage() {
    this.scene?.showMessage?.(
      text('t_7bd1c7a25225aa66b887') + text('t_6578325017d726f4c4bf'),
      3500, text('t_e09afad9b0dfcb2294f9')
    );
  }

  showNoEnergyPopup() { this.scene?.showNoEnergyPopup?.(); }
  requestProgressAutosave() { if (!gameState.caseFailed) requestAutosave(); }

  trySpendEnergy(category, key, { autosave = true } = {}) {
    if (category === 'activity' && key === 'apartment_visit' && !this.hasAnyDebunkedAlibi()) {
      this.showUnresolvedAlibisMessage(); return false;
    }
    const energyManager = getEnergyManager();
    if (category === 'travel') {
      if (!ALLOWED_LOCAL_TRANSPORTS.has(key)) {
        console.error(`[CrimeCityProgressService] Unknown local transport: "${key}".`); return false;
      }
      const cost = energyManager.getTravelCost(key);
      const affordability = energyManager.canAfford(cost);
      if (!affordability.ok) { this.showNoEnergyPopup(); return false; }
      const result = energyManager.consumeCustom(cost,
        `${text('t_592efc34d9485f9ae821')}${key}${text('t_24e778466d407e0a9e47')}${cost}`,
        { requireFullAmount: true, activityType: `travel_${key}` });
      if (!result?.success) { this.showNoEnergyPopup(); return false; }
      if (autosave) this.requestProgressAutosave();
      return true;
    }
    if (category === 'activity') {
      if (!ALLOWED_ACTIVITIES.has(key)) {
        console.error(`[CrimeCityProgressService] Unknown activity: "${key}".`); return false;
      }
      const affordability = energyManager.canPerformActivity(key);
      if (!affordability.ok) { this.showNoEnergyPopup(); return false; }
      const result = energyManager.consumeActivity(key);
      if (!result?.success) { this.showNoEnergyPopup(); return false; }
      if (autosave) this.requestProgressAutosave();
      return true;
    }
    console.error(`[CrimeCityProgressService] Unknown energy category: "${category}".`);
    return false;
  }

  destroy() { this.scene = null; }
}
