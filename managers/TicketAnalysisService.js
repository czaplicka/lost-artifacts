import { gameState } from '../GameData.js';
import { inventoryManager } from './InventoryManager.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { beginEscapePhaseClock, isCrimePhaseExpired, isTotalTimeExpired } from '../CaseTimeHelper.js';
import { getRouteManager, syncInvestigationState, generateDestinationsForCurrentCity } from './InvestigationManager.js';
import { advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { getTicketAirportCode } from '../config/TicketAirports.js';

const TICKET_IDS = new Set(['torn_ticket', 'plane_ticket_receipt', 'plane_booking', 'ticket_identity_matched']);

export function getTicketCaseKey(state = gameState) {
  const mission = state.currentMission || {};
  return JSON.stringify([
    state.currentCaseId ?? mission.id ?? mission.missionId ?? null,
    state.crimeCityId ?? null, mission.artifactKey ?? null,
    state.investigationStartTime ?? null
  ]);
}
export function getTicketAnalysis(state = gameState) {
  return state.caseData?.ticketAnalyses?.[getTicketCaseKey(state)] || null;
}
export function findCaseTicket(state = gameState, inventory = inventoryManager) {
  const mission = state.currentMission || {};
  const missionId = String(mission.id || mission.missionId || 'unknown_mission');
  return inventory.getAllItems().find(item => {
    const apartment = item.metadata?.apartment;
    const originalId = apartment?.originalId || item.id;
    if (!TICKET_IDS.has(originalId) && item.metadata?.ticketEvidence !== true) return false;
    if (apartment?.caseKey && apartment.caseKey !== getTicketCaseKey(state)) return false;
    if (apartment?.missionId != null && String(apartment.missionId) !== missionId) return false;
    return true;
  }) || null;
}

// A central travel guard. HQ and the crime city stay available for normal returns.
// Existing saves already in pursuit remain playable without a retroactive ticket gate.
export function getTicketTravelBlock(destinationId, state = gameState) {
  if (state.caseFailed) return 'case_failed';
  if (!state.isGameActive || !state.currentMission || state.caseResolved) return null;
  if (destinationId === 'hq' || destinationId === state.crimeCityId || destinationId === state.currentCityId) return null;
  if (state.escapePhaseActive === true) return null;
  return 'ticket_analysis_required';
}

export function analyseCaseTicket(locations, options = {}) {
  const state = options.state || gameState;
  const inventory = options.inventory || inventoryManager;
  if (!state.isGameActive || state.caseFailed || state.caseResolved) {
    return { ok: false, message: 'This case is no longer active.' };
  }
  const previous = getTicketAnalysis(state);
  if (previous?.completed === true) return { ok: true, alreadyAnalysed: true, result: previous };
  if (isTotalTimeExpired(state) || isCrimePhaseExpired(state)) {
    return { ok: false, message: 'The investigation deadline has expired.' };
  }
  const ticket = findCaseTicket(state, inventory);
  if (!ticket) return { ok: false, message: 'Bring the damaged ticket from the suspect apartment to the lab first.' };
  const manager = options.routeManager || getRouteManager();
  const list = Array.isArray(locations) ? locations : locations?.locations;
  if (!Array.isArray(list) || !manager || !Array.isArray(manager.route) || !manager.route.length) {
    return { ok: false, message: 'The existing escape route is missing. No new route has been generated.' };
  }
  if (!manager.route.every(id => typeof id === 'string' && id !== state.crimeCityId && id !== 'hq' && list.some(location => location?.id === id))) {
    return { ok: false, message: 'The saved escape route contains an invalid destination. It has not been replaced.' };
  }
  const targetId = manager.route[0];
  const target = list.find(location => location?.id === targetId);
  const code = getTicketAirportCode(target);
  if (!target || !code || targetId === state.crimeCityId || targetId === 'hq') {
    return { ok: false, message: 'The first escape destination has no valid airport code. Check the case configuration.' };
  }
  const inCrimeCityPhase = manager.isCrimeCityPhase();
  if (inCrimeCityPhase && manager.getCrimeCity() !== state.crimeCityId) {
    return { ok: false, message: 'The route belongs to a different crime city.' };
  }
  if (!inCrimeCityPhase && (!manager.isRoutePhase() || manager.currentRouteIndex !== 0)) {
    return { ok: false, message: 'This route has already advanced beyond the ticket destination.' };
  }
  const routeBefore = manager.serialize();
  if (inCrimeCityPhase) {
    const entered = manager.enterCity(state.crimeCityId);
    if (!entered.ok) return { ok: false, message: 'The pursuit route could not be unlocked.' };
  }
  // No navigation and no extra time. Restore the route if the clock cannot start.
  const clockStarted = beginEscapePhaseClock(state);
  if (!clockStarted) {
    manager.restore(routeBefore);
    return { ok: false, message: 'The case clock could not be started. No extra time has been granted.' };
  }
  const result = {
    completed: true, airportCode: code, targetCityId: targetId,
    sourceItemId: ticket.id, analysedAt: new Date().toISOString(),
    analysisMinutes: 0, route: [...manager.route]
  };
  state.updateState({
    caseData: {
      ...(state.caseData || {}),
      ticketAnalyses: { ...(state.caseData?.ticketAnalyses || {}), [getTicketCaseKey(state)]: result }
    },
    crimeSceneVisited: true, escapeRoute: [...manager.route]
  });
  state.addClue({
    id: `ticket_analysis_${getTicketCaseKey(state)}`,
    type: 'ticket_analysis', category: 'travel', source: 'crime_lab',
    key: 'airport_code', value: code,
    text: `Damaged ticket analysis: destination airport code ${code}.`,
    cityId: state.crimeCityId, missionId: state.currentMission?.id || state.currentMission?.missionId || null
  });
  // Production sync uses the application's shared state. Tests can supply a sync adapter.
  if (options.sync) options.sync(list, manager);
  else {
    syncInvestigationState(list);
    state.currentDestinations = generateDestinationsForCurrentCity(list);
  }
  advanceCrimeTutorial(state, 'search_apartment');
  requestAutosave();
  return { ok: true, alreadyAnalysed: false, result };
}
