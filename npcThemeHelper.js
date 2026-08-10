// npcThemeHelper.js
// Central place for resolving NPC textures/labels per city "theme"
// (ethnic/visual variant of the generic NPC sprite set).
//
// A city's theme is declared in locations.json via city.npcTheme, e.g.:
//   { "id": "new_delhi", "npcTheme": "hindu", ... }
//   { "id": "warsaw",    "npcTheme": "white", ... }
// If a city has no npcTheme (or an unknown one), we fall back to "white".
//
// Texture naming convention: `${npcId}_${themeSuffix}`, e.g. "bankier_h",
// "fence_b", "maid_a", "police_w". Only "_w" (white) and "_h" (hindu) have
// real assets right now — "_b" (black) and "_a" (asian, e.g. Japan-style)
// are wired up in code already so adding the art later needs zero code
// changes, just new spritesheets named with the right suffix.

const NPC_IDS = ['bankier', 'fence', 'knajpa', 'maid', 'parkingowy', 'police', 'stewardessa', 'bum'];

// One entry per visual theme: id -> texture suffix.
// Add a new theme (e.g. "latino", "arab", "slavic_dark") by adding one line
// here — no changes needed anywhere else (CityScene, LocationScene, etc.).
const THEME_SUFFIXES = {
  white: 'w',
  black: 'b',
  asian: 'a',
  south_asia: 'h'
};

const LOCATION_BACKGROUND_ALIASES = {
  hotel: 'hotel_maid',
  hotel_maid: 'hotel_maid',
  parking: 'parking',
  parking_bg: 'parking'
};

// Themes that currently have real texture assets in the game. Themes not
// listed here will still resolve texture keys (e.g. "fence_b"), but callers
// should expect textures.exists() to return false until art is added —
// CityScene already falls back to a default texture ('fence') when that
// happens, so nothing breaks, NPCs just render with a placeholder sprite.
const THEMES_WITH_ASSETS = ['white', 'south_asia', 'black', 'asian'];

// Legacy city -> theme map, kept only as a fallback for cities that don't
// yet have npcTheme set in locations.json. New cities should always set
// npcTheme explicitly and this map can eventually be deleted.
const LEGACY_CITY_THEME_FALLBACK = {
  new_delhi: 'south_asia',
  newdelhi: 'south_asia',
  london: 'white',
  paris: 'white',
  warsaw: 'white',
  berlin: 'white',
  new_york_city: 'white',
  newyorkcity: 'white',
  toronto: 'white'
};

// Human-readable NPC labels are theme-independent (same job title everywhere).
const NPC_LABELS = {
  bankier: 'Banker',
  fence: 'Fence',
  knajpa: 'Restaurant Manager',
  maid: 'Maid',
  parkingowy: 'Parking Worker',
  police: 'Police Officer',
  stewardessa: 'Flight Attendant',
  bum: 'Homeless Man'
};

/**
 * Resolves the visual theme id for a given city object (as loaded from
 * locations.json). Prefers city.npcTheme; falls back to the legacy id-based
 * map for cities that haven't been migrated yet; defaults to "white".
 * @param {object} city - city entry from locations.json
 * @returns {string} theme id, guaranteed to exist in THEME_SUFFIXES
 */
export function resolveCityNpcTheme(city) {
  if (!city) return 'white';

  const declaredTheme = city.npcTheme;
  if (declaredTheme && THEME_SUFFIXES[declaredTheme]) return declaredTheme;

  const fallbackTheme = LEGACY_CITY_THEME_FALLBACK[city.id];
  if (fallbackTheme && THEME_SUFFIXES[fallbackTheme]) return fallbackTheme;

  return 'white';
}

/**
 * Returns the texture key for a given NPC id under a given theme id.
 * Built from the `${npcId}_${suffix}` convention. Falls back to the
 * "white" theme's texture, then to "fence_w", so a typo or missing theme
 * never crashes the scene. Callers should still check textures.exists()
 * before use, since "black"/"asian" assets may not exist yet.
 * @param {string} npcId
 * @param {string} themeId
 * @returns {string}
 */
export function getNpcTextureKey(npcId, themeId = 'white') {
  const suffix = THEME_SUFFIXES[themeId] || THEME_SUFFIXES.white;
  const key = `${npcId}_${suffix}`;
  return key || `fence_${THEME_SUFFIXES.white}`;
}

/**
 * Human-readable label for an NPC id, independent of theme.
 * @param {string} npcId
 * @returns {string}
 */
export function getNpcLabel(npcId) {
  return NPC_LABELS[npcId] || 'Witness';
}

/**
 * Whether a given theme currently has real texture assets in the game.
 * Useful for dev warnings / asset-coverage checks, e.g. when adding a
 * new city with npcTheme "black" before the art is actually drawn.
 * @param {string} themeId
 * @returns {boolean}
 */
export function themeHasAssets(themeId) {
  return THEMES_WITH_ASSETS.includes(themeId);
}

/**
 * Convenience: returns all known NPC ids (useful for encounter pool validation).
 * @returns {string[]}
 */
export function getKnownNpcIds() {
  return [...NPC_IDS];
}

/**
 * Convenience: returns all known theme ids (useful for validating locations.json).
 * @returns {string[]}
 */
export function getKnownThemeIds() {
  return Object.keys(THEME_SUFFIXES);
}

export function getLocationBackgroundCandidates(locationId, themeId = 'white') {
  if (!locationId) return [];

  const normalizedLocationId =
    LOCATION_BACKGROUND_ALIASES[locationId] || locationId;

  const suffix = THEME_SUFFIXES[themeId] || THEME_SUFFIXES.white;
  const whiteSuffix = THEME_SUFFIXES.white;

  return [
    `${normalizedLocationId}_${suffix}`,
    `${normalizedLocationId}_${whiteSuffix}`,
    normalizedLocationId
  ];
}