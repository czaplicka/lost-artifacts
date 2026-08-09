/**
 * tvBroadcastData.js
 * Integruje się z gameState z GameData.js i tv-config.json:
 *   - gameState.crimeCityId     → dobiera kanał TV, reklamy, fillery
 *   - gameState.currentMission  → daje anchorowi artifact, city, scene
 *   - gameState.currentArtifact → backup jeśli mission null
 *   - tv-config.json            → treść reklam, programów, newsów, sekwencję
 */

// ─── CITY CONFIG ──────────────────────────────────────────────────────────────

const CITY_CONFIG = {
  paris: {
    name: 'Paris',
    channel: 'Canal Mystère 3',
    landmark: 'the Louvre',
    newspaper: 'Le Détective Quotidien',
    anchorName: 'Jean-Michel Dubois',
    anchorTitle: 'Correspondent for Cultural Affairs'
  },
  warsaw: {
    name: 'Warsaw',
    channel: 'TVP Kultura Extra',
    landmark: 'the Royal Castle',
    newspaper: 'Gazeta Śledcza',
    anchorName: 'Katarzyna Wysocka',
    anchorTitle: 'Senior Cultural Correspondent'
  },
  berlin: {
    name: 'Berlin',
    channel: 'RBB Spezial',
    landmark: 'Museum Island',
    newspaper: 'Berliner Kriminal-Post',
    anchorName: 'Helmut Schreiber',
    anchorTitle: 'Head of Cultural Heritage Desk'
  },
  london: {
    name: 'London',
    channel: 'BCC World Service',
    landmark: 'the Tower of London',
    newspaper: 'The Evening Standard-Bearer',
    anchorName: 'Nigel Ashworth',
    anchorTitle: 'Cultural Affairs Editor'
  },
  new_delhi: {
    name: 'New Delhi',
    channel: 'DD Heritage Plus',
    landmark: 'the National Museum',
    newspaper: 'Delhi Cultural Times',
    anchorName: 'Priya Sharma',
    anchorTitle: 'Special Correspondent, Heritage & Arts'
  },
  new_york_city: {
    name: 'New York',
    channel: 'WNYK News 4',
    landmark: 'the Metropolitan Museum',
    newspaper: 'The New York Investigator',
    anchorName: 'Sandra Brooks',
    anchorTitle: 'Investigative Reporter'
  }
};

const DEFAULT_CITY_CONFIG = {
  name: 'the City',
  channel: 'World News Network',
  landmark: 'the museum',
  newspaper: 'The Daily Record',
  anchorName: 'Alex Morgan',
  anchorTitle: 'Field Correspondent'
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function normalizeCrimeCityId(crimeCityId) {
  if (!crimeCityId) return null;
  const id = String(crimeCityId).toLowerCase();
  switch (id) {
    case 'paris':
    case 'warsaw':
    case 'berlin':
    case 'london':
    case 'new_delhi':
    case 'newdelhi':
    case 'new_york_city':
    case 'newyorkcity':
      return id.replace('newdelhi', 'new_delhi').replace('newyorkcity', 'new_york_city');
    default:
      return id;
  }
}

function getCityConfig(crimeCityId, tvConfigJson) {
  const normId = normalizeCrimeCityId(crimeCityId);
  const cityCfg = CITY_CONFIG[normId] || DEFAULT_CITY_CONFIG;

  // z tv-config.json mamy stationName per miasto
  const missionCityName = cityCfg.name;
  const cityConfigs = tvConfigJson?.cityConfigs || {};
  const cityConfigJson = cityConfigs[missionCityName] || {};

  const stationDefaults = tvConfigJson?.meta?.stationDefaults || {};
  const reporterName =
    stationDefaults.reporterName || cityCfg.anchorName || DEFAULT_CITY_CONFIG.anchorName;

  const stationName =
    cityConfigJson.stationName ||
    `${missionCityName} Night Report`;

  return {
    ...cityCfg,
    stationName,
    reporterName
  };
}

function pickRandom(array) {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

// wybierz reklamy/fillery dla danego miasta na bazie tv-config.json (pools.ads/fillers + cities[])
function filterPoolByCity(pool, cityName) {
  if (!Array.isArray(pool)) return [];
  return pool.filter(item => {
    if (!Array.isArray(item.cities) || item.cities.length === 0) return true;
    return item.cities.includes(cityName);
  });
}

// ─── NEWS SEGMENT BUILDER (z tv-config.json) ─────────────────────────────────

function buildNewsSegmentFromConfig(cityRuntimeConfig, mission, tvConfigJson) {
  const template = (tvConfigJson?.storySegments || []).find(seg => seg.id === 'news-main');
  if (!template) {
    // fallback do starego buildera, jeśli nie ma template'u w JSON
    return buildNewsSegmentLegacy(cityRuntimeConfig, mission);
  }

  const artifact = mission?.artifact || 'a priceless artefact';
  const crimeCity = mission?.city || cityRuntimeConfig.name;
  const scene = mission?.scene || 'the museum';
  const significance =
    mission?.significance || 'of immense historical value';

  const stationName = cityRuntimeConfig.stationName;
  const reporterName = cityRuntimeConfig.reporterName;

  const lines = (template.linesTemplate || []).map(line =>
    line
      .replaceAll('{city}', crimeCity)
      .replaceAll('{artifact}', artifact)
      .replaceAll('{suspectHint}', mission?.suspectHint || 'an unidentified figure in a pale trench coat')
      .replaceAll('{destinationHint}', mission?.destinationHint || '')
      .replaceAll('{thiefName}', mission?.thiefName || '')
      .replaceAll('{reporterName}', reporterName)
  );

  const theme = template.theme || {};

  return {
    type: template.type || 'news',
    title: template.titleTemplate
      ? template.titleTemplate.replaceAll('{stationName}', stationName)
      : stationName,
    anchorName: template.anchorNameTemplate
      ? template.anchorNameTemplate.replaceAll('{reporterName}', reporterName)
      : reporterName,
    label: template.label || 'BREAKING NEWS',
    badge: template.badge || 'URGENT',
    channel: template.channel || cityRuntimeConfig.channel,
    charDelay: template.charDelay || 17,
    linePause: template.linePause || 260,
    hold: template.hold || 1400,
    theme,
    lines
  };
}

// stary fallback (bez JSON-a), jeśli coś pójdzie nie tak
function buildNewsSegmentLegacy(cityConfig, mission) {
  const artifact = mission?.artifact || 'a priceless artefact';
  const crimeCity = mission?.city || cityConfig.name;
  const scene = mission?.scene || 'the museum';
  const significance = mission?.significance || 'of immense historical value';

  return {
    type: 'news',
    title: `${cityConfig.channel} — Evening Bulletin`,
    anchorName: cityConfig.anchorName,
    label: 'BREAKING NEWS',
    badge: 'URGENT',
    channel: cityConfig.channel,
    charDelay: 17,
    linePause: 260,
    hold: 1400,
    theme: {
      screenColor: '#1a2421',
      topBarColor: '#284c46',
      badgeColor: '#9b3043',
      bottomColor: '#09110f'
    },
    lines: [
      `Good evening. I'm ${cityConfig.anchorName}, ${cityConfig.anchorTitle}.`,
      `Breaking news from ${crimeCity}: the ${artifact} has disappeared.`,
      `The item — ${significance} — was reported missing from ${scene} in the early morning hours.`,
      `Police confirm the scene shows signs of a highly calculated entry. No suspects have been named. Officially.`,
      `Interpol called the theft, quote, "troublingly professional."`,
      `If you have information, contact the ${cityConfig.newspaper} tip line. Anonymity guaranteed. Mostly.`,
      `In other news: local pigeons continue to cause diplomatic tension near ${cityConfig.landmark}. More at eleven.`,
      `This has been ${cityConfig.anchorName}. Stay alert, ${crimeCity}. Someone among you knows something.`
    ]
  };
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Returns a full broadcast object for the TV scene.
 * Segments order: filler → ad → news
 *
 * @param {object} gameState - from GameData.js
 * @param {object} tvConfigJson - parsed tv-config.json from cache.json
 * @returns {{ channel, cityId, cityName, segments[] }}
 */
export function getTVBroadcast(gameState, tvConfigJson) {
  const crimeCityId = gameState?.crimeCityId || null;
  const normCrimeCityId = normalizeCrimeCityId(crimeCityId);
  const mission = gameState?.currentMission || null;

  // city runtime config (kanał z CITY_CONFIG + stationName/reporterName z JSON)
  const cityRuntimeConfig = getCityConfig(normCrimeCityId, tvConfigJson);

  // wybór ads/fillers z JSON per city
  const missionCityName = mission?.city || cityRuntimeConfig.name;
  const allAds = tvConfigJson?.pools?.ads || [];
  const allFillers = tvConfigJson?.pools?.fillers || [];

  const cityAds = filterPoolByCity(allAds, missionCityName);
  const cityFillers = filterPoolByCity(allFillers, missionCityName);

  const adSegment = pickRandom(cityAds);
  const fillerSegment = pickRandom(cityFillers);

  // news z template'u JSON
  const newsSegment = buildNewsSegmentFromConfig(
    cityRuntimeConfig,
    mission,
    tvConfigJson
  );

  // jeżeli nie udało się nic dobrać, fallback do defaultowych struktur
  const segments = [];

  if (fillerSegment) {
    segments.push({
      type: 'filler',
      ...fillerSegment
    });
  }

  if (adSegment) {
    segments.push({
      type: 'ad',
      ...adSegment
    });
  }

  segments.push(newsSegment);

  return {
    channel: cityRuntimeConfig.channel,
    cityId: normCrimeCityId,
    cityName: cityRuntimeConfig.name,
    segments
  };
}

// opcjonalne helpery, jeśli chcesz korzystać osobno z puli
export const getCityAds = (crimeCityId, tvConfigJson) => {
  const cfg = getCityConfig(normalizeCrimeCityId(crimeCityId), tvConfigJson);
  const cityName = cfg.name;
  return filterPoolByCity(tvConfigJson?.pools?.ads || [], cityName);
};

export const getCityFillers = (crimeCityId, tvConfigJson) => {
  const cfg = getCityConfig(normalizeCrimeCityId(crimeCityId), tvConfigJson);
  const cityName = cfg.name;
  return filterPoolByCity(tvConfigJson?.pools?.fillers || [], cityName);
};

export const getCityTVConfig = (crimeCityId, tvConfigJson) =>
  getCityConfig(normalizeCrimeCityId(crimeCityId), tvConfigJson);