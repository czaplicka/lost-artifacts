// config/TravelNodeCoordinates.js
// [longitude, latitude] for every node of TravelNetwork.js.
//
// TRAVEL_NODES keep their legacy pixel positions: the balance model
// (hoursPerMapPixel, fares) depends on them, so they must NOT change.
// This table is used ONLY to place the travel animation on the painted
// world map (ui/DestinationMapPainter.js).
//
// New node in TravelNetwork.js? Add it here as well, otherwise the animation
// falls back to CITY_COORDINATES / the location's "coordinates" field.

import { CITY_COORDINATES, getCityLonLat, normalizeCityId } from '../ui/DestinationMeta.js';

export const TRAVEL_NODE_LONLAT = {
  london: [-0.1276, 51.5072],
  paris: [2.3522, 48.8566],
  berlin: [13.405, 52.52],
  warsaw: [21.0122, 52.2297],
  new_delhi: [77.209, 28.6139],
  islamabad: [73.0479, 33.6844],
  kotte: [79.9, 6.9],
  nairobi: [36.8219, -1.2921],
  tokyo: [139.6917, 35.6895],
  new_york_city: [-74.006, 40.7128],
  toronto: [-79.3832, 43.6532],
  dover: [1.3134, 51.1279],
  calais: [1.8587, 50.9513],
  istanbul: [28.9784, 41.0082],
  tehran: [51.389, 35.6892],
  lahore: [74.3587, 31.5204],
  cairo: [31.2357, 30.0444],
  khartoum: [32.5599, 15.5007],
  addis_ababa: [38.7578, 8.9806],
  mombasa: [39.6682, -4.0435],
  mumbai: [72.8777, 19.076],
  karachi: [67.0011, 24.8607],
  colombo: [79.8612, 6.9271],
  nagapattinam: [79.8428, 10.7672],
  kankesanthurai: [80.0333, 9.8167],
  singapore: [103.8198, 1.3521],
  yokohama: [139.638, 35.4437],
  southampton: [-1.4044, 50.9097],
  le_havre: [0.1079, 49.4944],
  hamburg: [9.9937, 53.5511],
  gdansk: [18.6466, 54.352]
};

const isLonLat = (value) =>
  Array.isArray(value) &&
  value.length === 2 &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

/**
 * Best-effort lon/lat for a leg endpoint.
 * Priority: locations.json "coordinates" -> travel node table -> CITY_COORDINATES.
 */
export function resolveTravelLonLat(nodeId, cityName, locations = []) {
  const id = String(nodeId || '').trim().toLowerCase();
  const cityId = normalizeCityId(cityName);

  const location = locations.find((entry) => {
    const entryId = String(entry?.id || '').toLowerCase();
    const entryCity = String(entry?.city || '').toLowerCase();

    return (
      (id && (entryId === id || entryCity.replace(/\s+/g, '_') === id)) ||
      (cityName && entryCity === String(cityName).toLowerCase())
    );
  });

  const fromLocation = getCityLonLat(location);

  if (isLonLat(fromLocation)) return fromLocation;
  if (isLonLat(TRAVEL_NODE_LONLAT[id])) return TRAVEL_NODE_LONLAT[id];
  if (isLonLat(CITY_COORDINATES[id])) return CITY_COORDINATES[id];
  if (cityId && isLonLat(TRAVEL_NODE_LONLAT[cityId])) return TRAVEL_NODE_LONLAT[cityId];
  if (cityId && isLonLat(CITY_COORDINATES[cityId])) return CITY_COORDINATES[cityId];

  return null;
}