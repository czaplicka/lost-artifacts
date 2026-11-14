import { gameState } from './GameData.js';

export function debugCaseRoute(locationsData, template) {
  const locations = Array.isArray(locationsData) ? locationsData : locationsData?.locations || [];
  const stored = Array.isArray(gameState.escapeRoute) ? gameState.escapeRoute : [];
  const manager = gameState.routeManager;
  const route = Array.isArray(manager?.route) ? manager.route : stored;
  const phase = manager?.state || 'UNKNOWN';
  const progress = Number.isInteger(manager?.currentRouteIndex) ? manager.currentRouteIndex : 0;
  const expected = typeof manager?.getNextExpectedCity === 'function' ? manager.getNextExpectedCity()
    : phase === 'CRIME_CITY' ? manager?.crimeCityId || gameState.crimeCityId
    : phase === 'DONE' ? null : route[progress] || gameState.nextTargetCityId || null;
  const name = id => locations.find(entry => entry.id === id || entry.city === id)?.city || id || 'None';
  console.groupCollapsed(`[CASE DEBUG] Escape route — ${route.length} cities`);
  console.log('[CASE DEBUG] Crime city:', name(gameState.crimeCityId), gameState.crimeCityId);
  console.log('[CASE DEBUG] Current city:', name(gameState.currentCityId), gameState.currentCityId);
  console.log('[CASE DEBUG] Phase:', phase, '| Accepted escape stops:', progress);
  console.log('[CASE DEBUG] NEXT REQUIRED CITY:', name(expected), expected);
  console.log('[CASE DEBUG] Escape route:', route.map((id, i) => `${i + 1}. ${name(id)}`).join(' → ') || 'No escape cities.');
  console.table(route.map((id, index) => ({
    stop: index + 1, city: name(id), cityId: id,
    status: phase === 'DONE' || (phase === 'ROUTE' && index < progress) ? 'ACCEPTED'
      : id === expected ? 'NEXT REQUIRED' : 'NOT YET ACCEPTED'
  })));
  if (JSON.stringify(stored) !== JSON.stringify(route)) {
    console.error('[CASE DEBUG] ROUTE MISMATCH. Runtime manager and escapeRoute disagree.', {
      escapeRoute: [...stored], managerRoute: [...route]
    });
  }
  if (gameState.nextTargetCityId !== expected) {
    console.warn('[CASE DEBUG] Cached nextTargetCityId differs from manager target.', {
      cached: gameState.nextTargetCityId, managerTarget: expected
    });
  }
  console.log('[CASE DEBUG] Configured city count:', template?.stages?.cityChain?.cityCount ?? 'Default');
  console.log('[CASE DEBUG] Case stages:', structuredClone(template?.stages ?? {}));
  console.groupEnd();
}
