import { EVIDENCE_GRID_ENERGY_COST } from '../../suspectsBoard/SuspectExclusion.mixin.js';

const INSTALLED = new WeakSet();
const GRID_NODE = 'evidence_grid';

export function getEvidenceGridMapCost(state, cityId) {
  // Same payment key as SuspectsScene.getCaseKey(). No state is created here.
  const mission = state.currentMission || {};
  const caseKey = String(mission.id || mission.caseId ||
    `${cityId}_${mission.artifact || 'default'}`);
  const session = state.suspectExclusionState?.[caseKey];
  const paid = session?.energyPaid === true;
  const finished = session?.finished === true;
  return { energy: paid || finished ? 0 : EVIDENCE_GRID_ENERGY_COST,
    money: 0, paid, finished };
}

function gridStatus(cost) {
  return cost.finished ? 'GRID COMPLETE' : cost.paid ? 'ALREADY PAID' : 'GRID: ONE-TIME COST';
}

export function installEvidenceGridMapCosts(mapUI, state) {
  if (!mapUI || INSTALLED.has(mapUI)) return mapUI;
  const createMapIcon = mapUI.createMapIcon;
  const getDisplayCost = mapUI.getDisplayCost;
  const getLocationCostLabel = mapUI.getLocationCostLabel;
  const refreshCostLabels = mapUI.refreshCostLabels;

  mapUI.createMapIcon = function(options) {
    return createMapIcon.call(this, options?.textureKey === 'policja'
      ? { ...options, costNodeId: GRID_NODE } : options);
  };

  mapUI.getDisplayCost = function(nodeId, ...args) {
    if (nodeId === GRID_NODE) return getEvidenceGridMapCost(state, this.scene?.cityId);
    return getDisplayCost.call(this,nodeId,...args);
  };

  mapUI.getLocationCostLabel = function(title,nodeId,...args) {
    if (nodeId !== GRID_NODE) return getLocationCostLabel.call(this,title,nodeId,...args);
    const cost = getEvidenceGridMapCost(state,this.scene?.cityId);
    return `${title}\nEvidence Grid: ${cost.energy} ENERGY / $${cost.money}\n${gridStatus(cost)}\n` +
      'Personnel files are free. The one-time grid fee is charged only when the grid opens.';
  };

  mapUI.refreshCostLabels = function(...args) {
    const result = refreshCostLabels.apply(this,args);
    if (!this.scene || this.scene._cleanupDone) return result;
    for (const entry of this.costLabels) {
      if (entry.nodeId !== GRID_NODE || !entry.label?.scene || entry.label.active === false) continue;
      const cost = getEvidenceGridMapCost(state,this.scene.cityId);
      const label = `${entry.title}\n${gridStatus(cost)}`;
      if (entry.label.text !== label) {
        entry.label.setText(label);
        this.positionCostLabel(entry);
      }
    }
    return result;
  };

  INSTALLED.add(mapUI);
  return mapUI;
}
