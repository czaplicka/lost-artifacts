import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getTicketCaseKey } from './TicketAnalysisService.js';

export function markApartmentVisited(state = gameState) {
  const key = getTicketCaseKey(state);
  if (state.caseData?.apartmentVisits?.[key] === true) return;
  state.updateState({ caseData: {
    ...(state.caseData || {}), apartmentVisits: { ...(state.caseData?.apartmentVisits || {}), [key]: true }
  }});
  requestAutosave();
}

export function hasVisitedApartment(state = gameState) {
  if (state.caseData?.apartmentVisits?.[getTicketCaseKey(state)] === true) return true;
  // Compatibility with visits saved by the earlier room-pack system.
  // A ticket in inventory alone is deliberately NOT proof of a visit.
  const caseId = state.currentCaseId ?? null;
  const start = state.investigationStartTime ?? null;
  if (caseId === null && !Number.isFinite(start)) return false;
  const key = state.currentMission?.artifactKey || state.currentMission?.artifact?.artifactKey || '';
  return Object.values(state.apartmentProgress || {}).some(progress =>
    Object.keys(progress?.roomPackSelections || {}).some(raw => {
      try {
        const identity = JSON.parse(raw);
        return Array.isArray(identity) && identity.length === 5 &&
          identity[2] === key && identity[3] === caseId && identity[4] === start;
      } catch { return false; }
    })
  );
}
