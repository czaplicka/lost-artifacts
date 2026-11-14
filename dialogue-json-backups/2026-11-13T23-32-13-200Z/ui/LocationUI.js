import { planTravel, travelNodeId } from '../config/TravelNetwork.js';

export function normalizeCityId(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim().toLowerCase().replace(/\s+/g, '_') : null;
}
export function resolveLocationId(location, context = 'location') {
  const id = location?.id || normalizeCityId(location?.city);
  if (!id) console.error(`[LocationUtils] Missing id for ${context}:`, location);
  return id;
}
export function getLocationByCity(cityName, locations) {
  return Array.isArray(locations)
    ? locations.find(location => location.city === cityName) || null : null;
}
export function getLocationById(cityId, locations) {
  if (!Array.isArray(locations) || !cityId) return null;
  return locations.find(location => resolveLocationId(location, 'lookup') === cityId)
    || locations.find(location => travelNodeId(location) === travelNodeId({ id: cityId })) || null;
}
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
export function getTravelDistance(fromName, toName, locations) {
  const from = getLocationByCity(fromName, locations);
  const to = getLocationByCity(toName, locations);
  return from?.map && to?.map
    ? Math.hypot(to.map.x - from.map.x, to.map.y - from.map.y) : 250;
}
export function canTravelByLand(from, to) {
  return ['train', 'bus'].some(type => {
    const route = planTravel(from, to, type);
    return route && route.legs.every(leg => leg.transportType !== 'ship');
  });
}
export function isTransportAvailable(from, to, type) {
  return Boolean(planTravel(from, to, type));
}
