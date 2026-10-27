import { gameState } from './GameData.js';

export function debugCaseRoute(locationsData, template) {
  const locations = Array.isArray(locationsData) ? locationsData : [];
  const route = Array.isArray(gameState.escapeRoute)
    ? [...gameState.escapeRoute]
    : [];

  const getCityName = (cityId) => {
    const location = locations.find(
      (entry) => entry.id === cityId || entry.city === cityId
    );

    return location?.city || cityId;
  };

  const stops = route.map((cityId, index) => ({
    stop: index + 1,
    city: getCityName(cityId),
    cityId
  }));

  console.groupCollapsed(
    `[CASE DEBUG] Escape route — ${route.length} cities`
  );

  console.log(
    '[CASE DEBUG] Crime city:',
    gameState.crimeCity,
    `(${gameState.crimeCityId})`
  );

  console.log(
    '[CASE DEBUG] Escape route:',
    stops.length
      ? stops.map(({ stop, city }) => `${stop}. ${city}`).join(' → ')
      : 'No escape cities for this case.'
  );

  console.table(stops);

  console.log(
    '[CASE DEBUG] Configured city count:',
    template?.stages?.cityChain?.cityCount ?? 'Default'
  );

  console.log(
    '[CASE DEBUG] Case stages:',
    structuredClone(template?.stages ?? {})
  );

  console.groupEnd();
}