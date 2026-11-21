// City-first case selection. History travels with currentMission in existing saves.
const text = value => typeof value === 'string' ? value.trim() : '';
export function artifactIdentity(mission) {
  return text(mission?.artifactKey) || text(mission?.artifact?.artifactKey) ||
    text(mission?.artifactId) || text(mission?.artifact?.id) ||
    text(mission?.artifact?.name) || text(mission?.artifact) ||
    text(mission?.id) || text(mission?.missionId);
}
function pick(items, random) {
  if (!items.length) throw new Error('[ArtifactDraw] No eligible entries.');
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('[ArtifactDraw] Invalid random value.');
  }
  return items[Math.floor(value * items.length)];
}
export function drawArtifactCase(missions, locations, state = {}, options = {}) {
  const random = options.random || Math.random;
  const fresh = options.fresh === true;
  const groups = new Map();
  for (const city of locations) {
    if (city?.isCrimeCity !== true) continue;
    const cityId = text(city.id) || text(city.city);
    if (!cityId || groups.has(cityId)) continue;
    const artifacts = new Map();
    for (const mission of missions) {
      const matches = mission?.cityId
        ? mission.cityId === city.id
        : mission?.city === city.city;
      const identity = artifactIdentity(mission);
      if (!matches || !identity) continue;
      if (!artifacts.has(identity)) artifacts.set(identity, []);
      artifacts.get(identity).push(mission);
    }
    if (artifacts.size) groups.set(cityId, { cityId, city, artifacts });
  }
  if (!groups.size) throw new Error('[ArtifactDraw] No crime cities with artifacts.');
  const previous = fresh ? null : state.currentMission;
  const saved = previous?.artifactDrawHistory;
  const history = { version: 1, lastCityId: null, cities: [] };
  if (saved?.version === 1 && Array.isArray(saved.cities)) {
    for (const group of groups.values()) {
      const record = saved.cities.find(entry => entry?.cityId === group.cityId);
      if (!record) continue;
      history.cities.push({
        cityId: group.cityId,
        usedArtifacts: [...new Set((Array.isArray(record.usedArtifacts)
          ? record.usedArtifacts : []).filter(key => group.artifacts.has(key)))],
        lastArtifact: group.artifacts.has(record.lastArtifact) ? record.lastArtifact : null
      });
    }
    if (groups.has(saved.lastCityId)) history.lastCityId = saved.lastCityId;
  }
  if (previous) {
    const group = [...groups.values()].find(entry => previous.cityId
      ? entry.city.id === previous.cityId
      : entry.city.city === previous.city);
    if (group) {
      history.lastCityId = group.cityId;
      const key = artifactIdentity(previous);
      if (group.artifacts.has(key)) {
        let record = history.cities.find(entry => entry.cityId === group.cityId);
        if (!record) {
          record = { cityId: group.cityId, usedArtifacts: [], lastArtifact: null };
          history.cities.push(record);
        }
        if (!record.usedArtifacts.includes(key)) record.usedArtifacts.push(key);
        record.lastArtifact = key;
      }
    }
  }
  const allCities = [...groups.values()];
  const otherCities = allCities.filter(entry => entry.cityId !== history.lastCityId);
  const group = pick(otherCities.length ? otherCities : allCities, random);
  let record = history.cities.find(entry => entry.cityId === group.cityId);
  if (!record) {
    record = { cityId: group.cityId, usedArtifacts: [], lastArtifact: null };
    history.cities.push(record);
  }
  const keys = [...group.artifacts.keys()];
  let available = keys.filter(key => !record.usedArtifacts.includes(key));
  if (!available.length) {
    record.usedArtifacts = [];
    available = keys.filter(key => key !== record.lastArtifact);
    if (!available.length) available = keys;
  }
  const key = pick(available, random);
  const variants = group.artifacts.get(key);
  const source = variants.length === 1 ? variants[0] : pick(variants, random);
  record.usedArtifacts.push(key);
  record.lastArtifact = key;
  history.lastCityId = group.cityId;
  const fallbackId = 'artifact_case_' + encodeURIComponent(group.cityId) + '_' + encodeURIComponent(key);
  const mission = {
    ...structuredClone(source),
    id: source.id ?? source.missionId ?? fallbackId,
    missionId: source.missionId ?? source.id ?? fallbackId,
    artifactDrawHistory: history
  };
  return { mission, crimeCityData: group.city };
}
