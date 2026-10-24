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

export function isCurrentCaseEvidence(item, state = gameState) {
  if (!item?.id) return false;
  const mission = state.currentMission || {};
  const missionId = String(mission.id || mission.missionId || 'unknown_mission');
  const apartment = item.metadata?.apartment;
  if (apartment?.caseKey && apartment.caseKey !== getTicketCaseKey(state)) return false;
  if (apartment?.missionId != null && String(apartment.missionId) !== missionId) return false;
  return true;
}

export function isTicketEvidence(item) {
  const originalId = item?.metadata?.apartment?.originalId || item?.id;
  return Boolean(item && (TICKET_IDS.has(originalId) || item.metadata?.ticketEvidence === true));
}

export function findCaseTicket(state = gameState, inventory = inventoryManager) {
  return inventory.getAllItems().find(item =>
    isTicketEvidence(item) && isCurrentCaseEvidence(item, state)) || null;
}

export function getTicketTravelBlock(destinationId, state = gameState) {
  if (state.caseFailed) return 'case_failed';
  if (!state.isGameActive || !state.currentMission || state.caseResolved) return null;
  if (destinationId === 'hq' || destinationId === state.crimeCityId || destinationId === state.currentCityId) return null;
  if (state.escapePhaseActive === true) return null;
  return 'ticket_analysis_required';
}

export function getEvidenceExamination(itemId, state = gameState) {
  return state.caseData?.labEvidenceExaminations?.[getTicketCaseKey(state)]?.[itemId] || null;
}

function recordExamination(item, text, useful, state) {
  const key = getTicketCaseKey(state);
  const all = state.caseData?.labEvidenceExaminations || {};
  state.updateState({ caseData: {
    ...(state.caseData || {}),
    labEvidenceExaminations: {
      ...all,
      [key]: { ...(all[key] || {}), [item.id]: {
        itemId: item.id, text, useful, examinedAt: new Date().toISOString()
      }}
    }
  }});
  requestAutosave();
}

function refusalFor(item) {
  if (item.isArtifact || item.type === 'artifact') {
    return 'A recovered artefact belongs in the case records, not my centrifuge. The museum has already had a difficult week.';
  }
  if (item.isRedHerring || item.metadata?.isRedHerring) {
    return 'Examined. No useful travel information. This object is innocent, which is more than I can say for my coffee machine.';
  }
  if (item.isEscapeFragment || item.metadata?.isEscapeFragment) {
    return 'This appears to be part of something. Try combining the matching pieces before asking me to perform a miracle.';
  }
  if (item.isEscapeClue || item.metadata?.isEscapeClue) {
    return 'This may be a travel lead, but I have no reliable analysis for it yet. I will not invent a destination.';
  }
  return 'No useful destination information. I can examine the object, detective. I cannot make it confess.';
}

function resolveLead(item, target, state) {
  if (!isCurrentCaseEvidence(item, state)) {
    return { ok: false, message: 'This evidence belongs to another case. Please keep the paperwork in its own crime.' };
  }
  if (item.isRedHerring || item.metadata?.isRedHerring) {
    return { ok: false, message: refusalFor(item), examined: true };
  }
  if (isTicketEvidence(item)) {
    const airportCode = getTicketAirportCode(target);
    if (!airportCode) return { ok: false, message: 'This destination has no valid airport code in the case configuration.' };
    return {
      ok: true, kind: 'airport_code', airportCode, value: airportCode,
      clueText: `Damaged ticket analysis: destination airport code ${airportCode}.`,
      assistantText: `The destination code is ${airportCode}.\n\nThe ink survived. The passenger's travel plans did not.\nI have recorded the code in your notebook.`
    };
  }
  // Non-ticket clues must provide authored text for the actual first route city.
  // metadata.escapeEvidence = { kind: 'location_hint', hintsByCity: { city_id: '...' } }
  const definition = item.metadata?.escapeEvidence;
  const hint = definition?.kind === 'location_hint' ? definition.hintsByCity?.[target.id] : null;
  if (typeof hint === 'string' && hint.trim()) {
    return {
      ok: true, kind: 'location_hint', value: hint.trim(),
      clueText: hint.trim(),
      assistantText: `${hint.trim()}\n\nI have recorded the finding in your notebook.`
    };
  }
  return { ok: false, message: refusalFor(item), examined: true };
}

export function analyseEscapeEvidence(locations, options = {}) {
  const state = options.state || gameState;
  const inventory = options.inventory || inventoryManager;
  if (!state.isGameActive || state.caseFailed || state.caseResolved) {
    return { ok: false, message: 'This case is no longer active.' };
  }
  const item = inventory.getAllItems().find(entry => entry?.id === options.itemId);
  if (!item) return { ok: false, message: 'That item is no longer in your inventory.' };
  if (!isCurrentCaseEvidence(item, state)) {
    return { ok: false, message: 'This evidence belongs to another case.' };
  }
  const examination = getEvidenceExamination(item.id, state);
  const previous = getTicketAnalysis(state);
  if (examination && (!examination.useful || previous?.completed)) {
    return { ok: examination.useful, alreadyAnalysed: true, message: examination.text,
      result: examination.useful ? previous : null };
  }
  if (previous?.completed && previous.sourceItemId === item.id) {
    const text = previous.assistantText || (previous.airportCode
      ? `The destination code is ${previous.airportCode}. It is already in your notebook.`
      : previous.clueText || 'The finding is already in your notebook.');
    recordExamination(item, text, true, state);
    return { ok: true, alreadyAnalysed: true, message: text, result: previous };
  }
  if (isTotalTimeExpired(state) || (!state.escapePhaseActive && isCrimePhaseExpired(state))) {
    return { ok: false, message: 'The investigation deadline has expired.' };
  }
  const manager = options.routeManager || getRouteManager();
  const list = Array.isArray(locations) ? locations : locations?.locations;
  if (!Array.isArray(list) || !manager || !Array.isArray(manager.route) || !manager.route.length) {
    return { ok: false, message: 'The existing escape route is missing. No new route has been generated.' };
  }
  if (!manager.route.every(id => typeof id === 'string' && id !== state.crimeCityId &&
      id !== 'hq' && list.some(location => location?.id === id))) {
    return { ok: false, message: 'The saved escape route contains an invalid destination. It has not been replaced.' };
  }
  const targetId = manager.route[0];
  const target = list.find(location => location?.id === targetId);
  const lead = resolveLead(item, target, state);
  if (!lead.ok) {
    if (lead.examined) recordExamination(item, lead.message, false, state);
    return lead;
  }
  // Additional useful items may confirm the same first destination, never restart the clock.
  if (!previous?.completed) {
    const inCrimeCityPhase = manager.isCrimeCityPhase();
    if (inCrimeCityPhase && manager.getCrimeCity() !== state.crimeCityId) {
      return { ok: false, message: 'The route belongs to a different crime city.' };
    }
    if (!inCrimeCityPhase && (!manager.isRoutePhase() || manager.currentRouteIndex !== 0)) {
      return { ok: false, message: 'This route has already advanced beyond the first escape destination.' };
    }
    const routeBefore = manager.serialize();
    if (inCrimeCityPhase && !manager.enterCity(state.crimeCityId).ok) {
      return { ok: false, message: 'The pursuit route could not be unlocked.' };
    }
    if (!beginEscapePhaseClock(state)) {
      manager.restore(routeBefore);
      return { ok: false, message: 'The case clock could not be started. No extra time has been granted.' };
    }
  }
  const result = {
    completed: true, analysisType: lead.kind, targetCityId: targetId,
    sourceItemId: item.id, analysedAt: new Date().toISOString(),
    analysisMinutes: 0, route: [...manager.route],
    clueText: lead.clueText, assistantText: lead.assistantText,
    ...(lead.airportCode ? { airportCode: lead.airportCode } : {})
  };
  if (!previous?.completed) {
    state.updateState({ caseData: {
      ...(state.caseData || {}),
      ticketAnalyses: { ...(state.caseData?.ticketAnalyses || {}), [getTicketCaseKey(state)]: result }
    }, crimeSceneVisited: true, escapeRoute: [...manager.route] });
  }
  state.addClue({
    id: `escape_evidence_${getTicketCaseKey(state)}_${item.id}`,
    type: lead.kind === 'airport_code' ? 'ticket_analysis' : 'escape_evidence_analysis',
    category: 'travel', source: 'crime_lab', key: lead.kind, value: lead.value,
    text: lead.clueText, cityId: state.crimeCityId,
    missionId: state.currentMission?.id || state.currentMission?.missionId || null
  });
  recordExamination(item, lead.assistantText, true, state);
  if (!previous?.completed) {
    if (options.sync) options.sync(list, manager);
    else {
      syncInvestigationState(list);
      state.currentDestinations = generateDestinationsForCurrentCity(list);
    }
    advanceCrimeTutorial(state, 'search_apartment');
  }
  requestAutosave();
  return { ok: true, alreadyAnalysed: false, message: lead.assistantText, result };
}

// Compatibility API. Explicit itemId is checked; it never falls back to a different ticket.
export function analyseCaseTicket(locations, options = {}) {
  const state = options.state || gameState;
  const inventory = options.inventory || inventoryManager;
  const ticket = options.itemId != null
    ? inventory.getAllItems().find(item => item?.id === options.itemId)
    : findCaseTicket(state, inventory);
  if (!ticket || !isTicketEvidence(ticket) || !isCurrentCaseEvidence(ticket, state)) {
    return { ok: false, message: 'Bring the damaged ticket from the suspect apartment to the lab first.' };
  }
  return analyseEscapeEvidence(locations, { ...options, state, inventory, itemId: ticket.id });
}