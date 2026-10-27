const NPC_IDS = [
  'bankier',
  'fence',
  'knajpa',
  'maid',
  'parkingowy',
  'police',
  'stewardessa',
  'bum',
  'sailor'
];

const THEME_SUFFIXES = {
  white: 'w',
  black: 'b',
  asian: 'a',
  south_asia: 'h'
};

const THEME_ALIASES = {
  south_asian: 'south_asia',
  hindu: 'south_asia'
};

const LOCATION_BACKGROUND_ALIASES = {
  hotel: 'hotel_maid',
  hotel_maid: 'hotel_maid',
  parking: 'parking',
  parking_bg: 'parking'
};

const THEMES_WITH_ASSETS = [
  'white',
  'south_asia',
  'black',
  'asian'
];

const LEGACY_CITY_THEME_FALLBACK = {
  new_delhi: 'south_asia',
  newdelhi: 'south_asia',
  kotte: 'south_asia',
  islamabad: 'south_asia',
  nairobi: 'black',
  tokyo: 'asian',
  london: 'white',
  paris: 'white',
  warsaw: 'white',
  berlin: 'white',
  new_york_city: 'white',
  newyorkcity: 'white',
  toronto: 'white'
};

const NPC_LABELS = {
  bankier: 'Banker',
  fence: 'Fence',
  knajpa: 'Restaurant Manager',
  maid: 'Maid',
  parkingowy: 'Parking Worker',
  police: 'Police Officer',
  stewardessa: 'Flight Attendant',
  bum: 'Homeless Man',
  sailor: 'Sailor'
};

function normalizeTheme(themeId) {
  return THEME_ALIASES[themeId] || themeId;
}

export function resolveCityNpcTheme(city) {
  if (!city) return 'white';

  const declaredTheme = normalizeTheme(city.npcTheme);

  if (declaredTheme && THEME_SUFFIXES[declaredTheme]) {
    return declaredTheme;
  }

  const fallbackTheme = LEGACY_CITY_THEME_FALLBACK[city.id];

  if (fallbackTheme && THEME_SUFFIXES[fallbackTheme]) {
    return fallbackTheme;
  }

  return 'white';
}

export function getNpcTextureKey(npcId, themeId = 'white') {
  const normalizedTheme = normalizeTheme(themeId);
  const suffix =
    THEME_SUFFIXES[normalizedTheme] || THEME_SUFFIXES.white;

  return `${npcId}_${suffix}`;
}

export function getNpcLabel(npcId) {
  return NPC_LABELS[npcId] || 'Witness';
}

export function themeHasAssets(themeId) {
  return THEMES_WITH_ASSETS.includes(normalizeTheme(themeId));
}

export function getKnownNpcIds() {
  return [...NPC_IDS];
}

export function getKnownThemeIds() {
  return Object.keys(THEME_SUFFIXES);
}

export function getLocationBackgroundCandidates(
  locationId,
  themeId = 'white'
) {
  if (!locationId) return [];

  const normalizedLocationId =
    LOCATION_BACKGROUND_ALIASES[locationId] || locationId;

  const normalizedTheme = normalizeTheme(themeId);

  const suffix =
    THEME_SUFFIXES[normalizedTheme] || THEME_SUFFIXES.white;

  return [...new Set([
    `${normalizedLocationId}_${suffix}`,
    `${normalizedLocationId}_${THEME_SUFFIXES.white}`,
    normalizedLocationId
  ])];
}