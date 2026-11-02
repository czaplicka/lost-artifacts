function validId(value) {
  return (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isFinite(value));
}

function hasMission(state) {
  return state?.currentMission && typeof state.currentMission === 'object';
}

export function beginCaseIdentity(state) {
  if (!hasMission(state)) throw new Error('Cannot identify a case without a mission.');
  if (!Number.isFinite(state._createdAt)) {
    throw new Error('Campaign identity is missing. Reload the game before starting a case.');
  }
  const token = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  state.currentCaseId = `case-${token}`;
  return state.currentCaseId;
}

// Legacy evidence keys already fall back to mission.id / mission.missionId.
// Use that same value: do not invalidate collected apartment evidence.
export function ensureCaseIdentity(state) {
  if (!hasMission(state)) throw new Error('Current mission is missing.');
  if (!Number.isFinite(state._createdAt)) {
    throw new Error('Campaign identity is missing. Reload the saved game.');
  }
  if (validId(state.currentCaseId)) return false;
  const missionId = state.currentMission.id ?? state.currentMission.missionId;
  if (!validId(missionId)) {
    throw new Error('Cannot restore the case ID: the mission has no stable ID.');
  }
  // Do not guess how an existing pursuit or trial belongs to a legacy save.
  if (state.chaseState != null || state.courtState != null) {
    throw new Error('Case ID is missing but pursuit or court data exists. Reload a valid save.');
  }
  state.currentCaseId = missionId;
  return true;
}
