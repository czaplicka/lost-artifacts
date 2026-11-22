// Mission-scoped keys shared by the crime-city map and CSI.
// Do not replace these with campaign IDs in just one consumer.
export function scalarCasePart(value) {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

export function getArtifactCasePart(value, fallback = 'default') {
  const scalar = scalarCasePart(value);
  if (scalar !== null) return scalar;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    // Display names preserve the historical string-based fallback after recovery.
    for (const field of ['label', 'name', 'artifactKey', 'id']) {
      const part = scalarCasePart(value[field]);
      if (part !== null) return part;
    }
  }
  return fallback;
}

export function getMissionCaseKey(state, cityId = null) {
  const mission = state?.currentMission || {};
  for (const value of [mission.id, mission.caseId, mission.caseIndex]) {
    const id = scalarCasePart(value);
    if (id !== null) return id;
  }
  const city = scalarCasePart(cityId) ?? scalarCasePart(mission.city) ??
    scalarCasePart(state?.crimeCityId) ?? scalarCasePart(state?.currentCityId) ?? 'unknown_city';
  const artifact = getArtifactCasePart(mission.artifact,
    scalarCasePart(mission.artifactKey) ?? 'default');
  return `${city}_${artifact}`;
}
