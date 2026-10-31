export function normalizePursuitCityId(value) {
  const id = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ({ new_dehli: 'new_delhi', newdelhi: 'new_delhi', new_york: 'new_york_city', newyorkcity: 'new_york_city' })[id] || id || null;
}

export function getPursuitCityContext(state, cityId) {
  const city = normalizePursuitCityId(cityId);
  const manager = state.routeManager;
  const route = (Array.isArray(manager?.route) ? manager.route : state.escapeRoute || []).map(normalizePursuitCityId);
  const crimeCity = normalizePursuitCityId(manager?.crimeCityId || state.crimeCityId);
  const phase = manager?.state;
  const progress = Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : Math.max(0, state.routeIndex || 0);
  const index = route.indexOf(city);
  const isCrimeCity = Boolean(city && city === crimeCity);
  const expected = normalizePursuitCityId(typeof manager?.getNextExpectedCity === 'function'
    ? manager.getNextExpectedCity() : state.nextTargetCityId);
  const accepted = index >= 0 && (phase === 'DONE' || index < progress ||
    city === normalizePursuitCityId(state.justReachedCorrectCityId));
  const isNextTargetCity = Boolean(city && city === expected);
  return {
    isCrimeCity, isNextTargetCity, isJustReachedCorrectCity: Boolean(city && city === normalizePursuitCityId(state.justReachedCorrectCityId)),
    isOnEscapeRoute: index >= 0, isCurrentVisitedRouteCity: accepted,
    isCorrectCity: isCrimeCity || accepted || isNextTargetCity,
    targetCityId: isCrimeCity ? route[0] || null : index >= 0 ? route[index + 1] || null : null
  };
}
