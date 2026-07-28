// city-encounter-generator.js

export function createMulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStringToSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function shuffle(array, rng = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildEncounterId(cityId, pairId, slotId) {
  return `${cityId}__${pairId}__${slotId}`;
}

export function filterEncounterPool(cityData, options = {}) {
  const {
    blockedEncounterIds = [],
    blockedNpcIds = [],
    blockedLocationIds = [],
    requiredNpcIds = [],
    requiredLocationIds = []
  } = options;

  let pool = [...(cityData.encounterPool || [])];

  if (blockedEncounterIds.length) {
    pool = pool.filter(item => !blockedEncounterIds.includes(item.id));
  }

  if (blockedNpcIds.length) {
    pool = pool.filter(item => !blockedNpcIds.includes(item.npcId));
  }

  if (blockedLocationIds.length) {
    pool = pool.filter(item => !blockedLocationIds.includes(item.locationId));
  }

  if (requiredNpcIds.length) {
    pool = pool.filter(item => requiredNpcIds.includes(item.npcId));
  }

  if (requiredLocationIds.length) {
    pool = pool.filter(item => requiredLocationIds.includes(item.locationId));
  }

  return pool;
}

export function pickEncounterPairs(cityData, rng = Math.random, options = {}) {
  const rules = cityData.encounterRules || {};
  const uniqueNpc = rules.uniqueNpc !== false;
  const uniqueLocation = rules.uniqueLocation !== false;
  const count = rules.count ?? 3;

  const filteredPool = shuffle(filterEncounterPool(cityData, options), rng);
  const chosen = [];
  const usedNpcIds = new Set();
  const usedLocationIds = new Set();

  for (const pair of filteredPool) {
    if (chosen.length >= count) break;
    if (uniqueNpc && usedNpcIds.has(pair.npcId)) continue;
    if (uniqueLocation && usedLocationIds.has(pair.locationId)) continue;

    chosen.push(pair);
    usedNpcIds.add(pair.npcId);
    usedLocationIds.add(pair.locationId);
  }

  return chosen;
}

export function generateCityEncounters(cityData, rng = Math.random, options = {}) {
  const enabledSlots = (cityData.encounterSlots || []).filter(slot => slot.enabled);
  const shuffledSlots = shuffle(enabledSlots, rng);
  const selectedPairs = pickEncounterPairs(cityData, rng, options);

  const maxCount = Math.min(shuffledSlots.length, selectedPairs.length);

  return Array.from({ length: maxCount }, (_, index) => {
    const slot = shuffledSlots[index];
    const pair = selectedPairs[index];

    return {
      id: buildEncounterId(cityData.id, pair.id, slot.id),
      baseEncounterId: pair.id,
      cityId: cityData.id,
      cityX: slot.cityX,
      cityY: slot.cityY,
      slotId: slot.id,
      npcId: pair.npcId,
      locationId: pair.locationId,
      enabled: true
    };
  });
}

export function generateCaseCityState(cities, caseId, overridesByCity = {}) {
  const state = {};
  const baseSeed = hashStringToSeed(caseId);

  for (const city of cities) {
    if (!city.encounterPool || !city.encounterPool.length) {
      state[city.id] = [];
      continue;
    }

    const citySeed = hashStringToSeed(`${caseId}::${city.id}::${baseSeed}`);
    const rng = createMulberry32(citySeed);
    const cityOverrides = overridesByCity[city.id] || {};

    state[city.id] = generateCityEncounters(city, rng, cityOverrides);
  }

  return state;
}