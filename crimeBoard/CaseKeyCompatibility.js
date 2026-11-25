import { getCaseKey, scalarCasePart } from '../crimeCaseKey.js';

const own = (value, key) => value != null && Object.hasOwn(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));

// Compatibility aliases are read-only. New records always use crimeCaseKey.js.
export function getLegacyCaseKeys(state, cityId = null) {
  const m = state?.currentMission || {};
  const keys = new Set();
  const add = value => { if (typeof value === 'string') keys.add(value); };
  add(String(m.id ?? m.caseId ?? m.caseIndex ??
    `${state?.caseSuspectCityId ?? state?.crimeCityId ?? state?.crimeCity ?? m.city ?? 'unknown'}_${m.artifactKey ?? m.artifact ?? 'default'}`));
  const cities = [cityId, state?.crimeCityId, state?.caseSuspectCityId, m.city,
    state?.crimeCity, state?.currentCityId, undefined];
  for (const city of cities) {
    add(String(m.id || m.caseId || `${city}_${m.artifact || 'default'}`));
  }
  return [...keys];
}

function scopeParts(value, kind) {
  const meta = record(value?.meta) ? value.meta : {};
  // Board meta.caseId is an artifact key, not the investigation instance.
  const cases = kind === 'crimeBoardWorkspaces'
    ? [value?.caseInstanceId, meta.caseInstanceId]
    : [value?.caseId, value?.caseInstanceId, meta.caseInstanceId];
  return { cases: cases.filter(v => v != null),
    campaigns: [value?.campaignId, meta.campaignId].filter(v => v != null) };
}
export function hasConflictingCaseScope(value, state, kind = 'crimeBoardWorkspaces') {
  const parts = scopeParts(value, kind), expected = scalarCasePart(state?.currentCaseId);
  return parts.cases.some(v => scalarCasePart(v) !== expected) ||
    parts.campaigns.some(v => v !== state?._createdAt);
}
export function hasProvenCaseScope(value, state, kind = 'crimeBoardWorkspaces') {
  if (!record(value) || scalarCasePart(state?.currentCaseId) === null ||
      scalarCasePart(state?._createdAt) === null) return false;
  const parts = scopeParts(value, kind);
  return parts.cases.length > 0 && parts.campaigns.length > 0 &&
    !hasConflictingCaseScope(value, state, kind);
}

export function migrateLegacyCaseRecords(state, cityId = null,
  { collections = ['crimeBoardWorkspaces', 'caseTheories', 'suspectExclusionState'] } = {}) {
  const key = getCaseKey(state, cityId), result = { key, copied: [], conflicts: [] };
  if (!record(state) || !record(state.currentMission)) return result;
  const aliases = getLegacyCaseKeys(state, cityId).filter(alias => alias !== key);
  const plans = [];
  for (const collection of collections) {
    if (!['crimeBoardWorkspaces', 'caseTheories', 'suspectExclusionState'].includes(collection)) continue;
    const map = record(state[collection]) ? state[collection] : {};
    // An existing canonical entry is authoritative, even if null or unfinished.
    if (own(map, key)) continue;
    const candidates = aliases.filter(alias => own(map, alias) &&
      hasProvenCaseScope(map[alias], state, collection)).map(alias => ({ alias, value: map[alias] }));
    if (collection === 'crimeBoardWorkspaces') {
      const legacy = state.crimeBoardData;
      if (hasProvenCaseScope(legacy, state, collection) && Array.isArray(legacy.items) &&
          (!legacy.meta?.workspaceKey || legacy.meta.workspaceKey === key || aliases.includes(legacy.meta.workspaceKey))) {
        candidates.push({ alias: legacy.meta?.workspaceKey || 'crimeBoardData', value: legacy });
      }
    }
    if (!candidates.length) continue;
    const comparable = value => {
      const copy = clone(value);
      if (collection === 'crimeBoardWorkspaces') copy.meta = { ...copy.meta, workspaceKey: key };
      return JSON.stringify(copy);
    };
    const contents = candidates.map(c => comparable(c.value));
    if (new Set(contents).size !== 1) { result.conflicts.push(collection); continue; }
    const source = candidates[0], copied = JSON.parse(contents[0]);
    const panel = collection === 'crimeBoardWorkspaces' &&
      record(state.crimeBoardPanelSettings) && !own(state.crimeBoardPanelSettings, key) &&
      own(state.crimeBoardPanelSettings, source.alias) && record(state.crimeBoardPanelSettings[source.alias])
      ? clone(state.crimeBoardPanelSettings[source.alias]) : null;
    plans.push({ collection, sourceKey: source.alias, value: copied, panel });
  }
  // Prepare every clone before touching state. Never delete a legacy slot.
  for (const plan of plans) {
    state[plan.collection] = { ...(record(state[plan.collection]) ? state[plan.collection] : {}), [key]: plan.value };
    result.copied.push(plan.collection);
    if (plan.panel !== null) {
      state.crimeBoardPanelSettings = { ...state.crimeBoardPanelSettings, [key]: plan.panel };
    }
  }
  return result;
}
