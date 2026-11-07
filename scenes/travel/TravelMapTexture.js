// scenes/travel/TravelMapTexture.js
// Gives the travel transition the SAME painted world map as the Destinations
// screen (agency = spy grid, pi = expedition parchment).
//
// - If the Destinations screen already painted its texture, it is reused
//   (no extra memory, identical look).
// - Otherwise a private texture is painted here with the same painter
//   and refreshed when the country boundaries arrive.

import { GAME_COUNTRIES_ISO3 } from '../../ui/DestinationMeta.js';
import {
  MAP_H,
  MAP_W,
  PROJECTION,
  ensureFonts,
  loadCountries,
  paintMap
} from '../../ui/DestinationMapPainter.js';

export { MAP_H, MAP_W, PROJECTION };

// Scenes from which the PI (expedition) map is opened.
const PI_SOURCE_SCENES = new Set(['DetectiveOfficeScene']);

/** Which of the two map themes should the transition use? */
export function resolveMapTheme(data = {}, registry = null) {
  if (data.mapTheme === 'pi' || data.mapTheme === 'agency') {
    return data.mapTheme;
  }

  if (data.returnToPIOffice) return 'pi';
  if (PI_SOURCE_SCENES.has(data.fromScene)) return 'pi';

  const sourceKey = registry?.get?.('currentSceneKey');

  return PI_SOURCE_SCENES.has(sourceKey) ? 'pi' : 'agency';
}

function paint(record) {
  const { texture, themeId } = record;
  const ctx = texture.getContext?.() || texture.context;

  if (!ctx) return;

  try {
    paintMap(ctx, themeId, {
      projection: PROJECTION,
      countries: record.countries,
      highlight: new Set(GAME_COUNTRIES_ISO3),
      failed: record.failed
    });
  } catch (error) {
    console.warn('[TravelMapTexture] Painting failed:', error);
  }

  texture.refresh();
}

/**
 * @returns {string|null} texture key (null -> caller should use its fallback)
 */
export function ensureTravelMapTexture(scene, themeId) {
  const shared = `destination_map_${themeId}`;

  if (scene.textures.exists(shared)) {
    return shared;
  }

  const key = `travel_map_${themeId}`;

  if (scene.textures.exists(key)) {
    return key;
  }

  let texture = null;

  try {
    texture = scene.textures.createCanvas(key, MAP_W, MAP_H);
  } catch (error) {
    console.warn('[TravelMapTexture] Could not create the map texture:', error);
    return null;
  }

  if (!texture) {
    return null;
  }

  const record = {
    texture,
    themeId,
    countries: null,
    failed: false
  };

  // Instant placeholder, then the real map as soon as the data is ready.
  paint(record);

  Promise.all([
    loadCountries().catch((error) => {
      console.warn('[TravelMapTexture] Boundary loading failed:', error);
      return null;
    }),
    ensureFonts()
  ]).then(([countries]) => {
    if (
      !scene.textures.exists(key) ||
      scene.textures.get(key) !== texture
    ) {
      return;
    }

    if (countries) record.countries = countries;
    else record.failed = true;

    paint(record);
  });

  return key;
}