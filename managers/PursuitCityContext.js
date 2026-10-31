export function normalizePursuitCityId(value) {
  const id = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ({ new_dehli: 'new_delhi', newdelhi: 'new_delhi', new_york: 'new_york_city', newyorkcity: 'new_york_city' })[id] || id || null;
}

export function getPursuitCityContext(state, cityId) {
  const city = normalizePursuitCityId(cityId);
  const manager = state.routeManager;
  const rawRoute = Array.isArray(manager?.route) ? manager.route : state.escapeRoute || [];
  const route = rawRoute.map(normalizePursuitCityId);
  const crimeCity = normalizePursuitCityId(manager?.crimeCityId || state.crimeCityId);
  const phase = manager?.state;
  const progress = Number.isInteger(manager?.currentRouteIndex)
    ? Math.max(0, manager.currentRouteIndex) : Math.max(0, state.routeIndex || 0);
  const index = city ? route.indexOf(city) : -1;
  const isCrimeCity = Boolean(city && city === crimeCity);
  const expectedRaw = typeof manager?.getNextExpectedCity === 'function'
    ? manager.getNextExpectedCity()
    : phase === 'DONE' ? null
    : phase === 'CRIME_CITY' ? manager?.crimeCityId || state.crimeCityId
    : phase === 'ROUTE' ? rawRoute[progress] || null
    : state.nextTargetCityId;
  const expected = normalizePursuitCityId(expectedRaw);
  const accepted = index >= 0 && (phase === 'DONE' || index < progress);
  const isNextTargetCity = Boolean(city && city === expected);
  const future = index >= 0 && !accepted && !isNextTargetCity;
  // Witnesses remember the historical next stop, not the player's current progress.
  const targetCityId = isCrimeCity ? rawRoute[0] || null
    : accepted || isNextTargetCity ? rawRoute[index + 1] || null : null;
  return {
    isCrimeCity, isNextTargetCity,
    isJustReachedCorrectCity: Boolean(accepted && city === normalizePursuitCityId(state.justReachedCorrectCityId)),
    isOnEscapeRoute: index >= 0, isCurrentVisitedRouteCity: accepted,
    isFutureRouteCity: future,
    isCorrectCity: isCrimeCity || accepted || isNextTargetCity,
    targetCityId
  };
}

export function classifyPursuitArrival(state, cityId) {
  const context = getPursuitCityContext(state, cityId);
  if (normalizePursuitCityId(cityId) === 'hq') return 'HEADQUARTERS';
  if (context.isCrimeCity) return 'CRIME_CITY';
  if (context.isCurrentVisitedRouteCity) return 'RETURN_VISIT';
  if (context.isNextTargetCity) return 'NEXT_ROUTE_CITY';
  if (context.isFutureRouteCity) return 'ROUTE_OUT_OF_ORDER';
  return 'FALSE_LEAD';
}
