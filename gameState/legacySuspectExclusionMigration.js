import { getMissionCaseKey } from '../crimeCaseKey.js';
import { isPlainObject } from './dataUtils.js';

const own = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

function isCityPart(value) {
  return (
    (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function mergeExclusionRecords(legacy, canonical) {
  const merged = {
    ...legacy,
    ...canonical
  };

  if (
    legacy.finished === true ||
    canonical.finished === true
  ) {
    merged.finished = true;
  }

  const timestamps = [
    legacy.finishedAt,
    canonical.finishedAt
  ].filter(
    value => typeof value === 'number' && Number.isFinite(value)
  );

  if (timestamps.length > 0) {
    merged.finishedAt = Math.max(...timestamps);
  }

  if (
    Array.isArray(legacy.manualExclusionIds) ||
    Array.isArray(canonical.manualExclusionIds)
  ) {
    merged.manualExclusionIds = [
      ...new Set([
        ...(Array.isArray(canonical.manualExclusionIds)
          ? canonical.manualExclusionIds
          : []),
        ...(Array.isArray(legacy.manualExclusionIds)
          ? legacy.manualExclusionIds
          : [])
      ])
    ];
  }

  return merged;
}

// Migrates the active mission only.
// Legacy entries remain intact because historical missions may share them.
export function migrateLegacySuspectExclusionState(state) {
  const mission = state?.currentMission;
  const records = state?.suspectExclusionState;

  if (
    !isPlainObject(mission) ||
    !isPlainObject(records)
  ) {
    return false;
  }

  const city = [
    mission.city,
    state.crimeCityId,
    state.caseSuspectCityId,
    state.crimeCity,
    state.currentCityId
  ].find(isCityPart);

  const canonicalKey = getMissionCaseKey(state, city);

  // Intentionally reproduces the old resolver:
  // no caseIndex, truthy IDs, and implicit artifact stringification.
  const legacyKey = String(
    mission.id ||
    mission.caseId ||
    `${city}_${mission.artifact || 'default'}`
  );

  if (
    legacyKey === canonicalKey ||
    !own(records, legacyKey) ||
    !isPlainObject(records[legacyKey])
  ) {
    return false;
  }

  const legacy = records[legacyKey];

  const canonical =
    own(records, canonicalKey) &&
    isPlainObject(records[canonicalKey])
      ? records[canonicalKey]
      : {};

  const merged = mergeExclusionRecords(legacy, canonical);

  Object.defineProperty(records, canonicalKey, {
    value: merged,
    enumerable: true,
    configurable: true,
    writable: true
  });

  return true;
}