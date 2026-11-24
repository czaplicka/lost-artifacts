// Single mission-scoped case key used by the crime-city map, CSI lab,
// alibi, crime board and case theory.
// Do not replace this with campaign IDs in just one consumer.
export function scalarCasePart(value) {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function getArtifactCasePart(value, fallback = 'default') {
  const scalar = scalarCasePart(value);
  if (scalar !== null) return scalar;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const field of ['label', 'name', 'artifactKey', 'id']) {
      const part = scalarCasePart(value[field]);
      if (part !== null) return part;
    }
  }
  return fallback;
}

export function getCaseKey(state, cityId = null) {
  const mission = state?.currentMission || {};
  // Missions created by artifactDraw always have an id; the fallback is only a safety net.
  for (const value of [mission.id, mission.caseId, mission.caseIndex]) {
    const id = scalarCasePart(value);
    if (id !== null) return id;
  }
  let city = 'unknown_city';
  for (const value of [cityId, mission.city, state?.crimeCityId, state?.caseSuspectCityId,
    state?.crimeCity, state?.currentCityId]) {
    const part = scalarCasePart(value);
    if (part !== null) { city = part; break; }
  }
  const artifact = getArtifactCasePart(mission.artifact,
    scalarCasePart(mission.artifactKey) ?? 'default');
  return `${city}_${artifact}`;
}

// Compatibility name for existing imports.
export const getMissionCaseKey = getCaseKey;
