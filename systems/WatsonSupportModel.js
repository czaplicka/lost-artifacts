export const WATSON_SUPPORT = Object.freeze({ cost: 100, bonusMinutes: 360 });
export function watsonCaseKey(state) {
  const mission = state?.currentMission;
  if (!mission || state._createdAt == null || state.currentCaseId == null || mission.id == null) return null;
  return JSON.stringify([state._createdAt, state.currentCaseId, mission.id, state.investigationStartTime ?? null]);
}
export function getWatsonSupportReceipt(state) {
  const key = watsonCaseKey(state);
  if (!key) return null;
  const r = state.caseData?.watsonPoliceSupport?.[key];
  return r?.version === 1 && r.used === true && r.caseKey === key &&
    r.cost === WATSON_SUPPORT.cost && r.bonusMinutes === WATSON_SUPPORT.bonusMinutes &&
    r.source === 'agency' && Number.isFinite(r.baseEscapeDeadline) && r.baseEscapeDeadline > 0
    ? r : null;
}
