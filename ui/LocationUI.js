import { HQ_ID } from '../TransportConfig.js';

/**
 * Normalizuje nazwę miasta do spójnego identyfikatora (np. "New York" -> "new_york")
 */
export function normalizeCityId(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase().replace(/\s+/g, '_')
    : null;
}

/**
 * Zwraca bezpieczny identyfikator lokacji
 */
export function resolveLocationId(location, context = 'location') {
  const id = location?.id || normalizeCityId(location?.city);
  if (!id) console.error(`[LocationUtils] Missing id for ${context}:`, location);
  return id;
}

/**
 * Znajduje obiekt lokacji w tablicy po nazwie miasta
 */
export function getLocationByCity(cityName, locations) {
  return Array.isArray(locations)
    ? locations.find(location => location.city === cityName) || null
    : null;
}

/**
 * Znajduje obiekt lokacji w tablicy po ID
 */
export function getLocationById(cityId, locations) {
  return Array.isArray(locations) && cityId
    ? locations.find(location => resolveLocationId(location, 'lookup') === cityId) || null
    : null;
}

/**
 * Waliduje poprawność danych lokacji, misji i podejrzanych przy starcie gry
 */
export function validateSetupData(suspects, missions, locations) {
  if (!Array.isArray(suspects) || !suspects.length) throw new Error('No suspects data available.');
  if (!Array.isArray(missions) || !missions.length) throw new Error('No missions data available.');
  if (!Array.isArray(locations) || !locations.length) throw new Error('No locations data available.');

  const ids = new Set();
  locations.forEach(location => {
    const id = resolveLocationId(location, 'setup validation');
    if (!id) throw new Error('A location is missing both id and city.');
    if (ids.has(id)) throw new Error(`Duplicate location id: ${id}`);
    ids.add(id);
  });
}

/**
 * Oblicza odległość w pikselach mapy między dwoma miastami
 */
export function getTravelDistance(fromName, toName, locations) {
  const from = getLocationByCity(fromName, locations);
  const to = getLocationByCity(toName, locations);
  return from?.map && to?.map
    ? Math.hypot(to.map.x - from.map.x, to.map.y - from.map.y)
    : 250;
}

/**
 * Sprawdza, czy między miastami możliwy jest transport lądowy (pociąg / autobus)
 */
export function canTravelByLand(from, to) {
  if (from.country === to.country) return true;
  return (
    from.travelRegion === to.travelRegion &&
    ['europe', 'north_america'].includes(from.travelRegion)
  );
}

/**
 * Sprawdza, czy dany środek transportu jest dostępny między dwoma lokacjami
 */
export function isTransportAvailable(from, to, type) {
  if (type === 'plane') return Boolean(from.airport && to.airport);
  if (type === 'train') return Boolean(from.trainStation && to.trainStation && canTravelByLand(from, to));
  if (type === 'bus') return Boolean(from.busStation && to.busStation && canTravelByLand(from, to));
  if (type === 'ship') return Boolean(from.harbor && to.harbor);
  return false;
}