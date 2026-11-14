import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { inventoryManager } from './InventoryManager.js';
import { requestAutosave } from '../gameStatePersistence.js';

import {
  beginEscapePhaseClock,
  isCrimePhaseExpired,
  isTotalTimeExpired
} from '../CaseTimeHelper.js';

import {
  getRouteManager,
  syncInvestigationState,
  generateDestinationsForCurrentCity
} from './InvestigationManager.js';

import { advanceCrimeTutorial } from '../tutorials/CrimeCityTutorial.js';
import { getTicketAirportCode } from '../config/TicketAirports.js';

import {
  getEvidenceCaseKey,
  readApartmentEvidence,
  evidenceMatchesCase
} from './ApartmentEvidenceModel.js';

const TICKET_IDS = new Set([
  'torn_ticket',
  'plane_ticket_receipt',
  'plane_booking',
  'ticket_identity_matched'
]);

export function getTicketCaseKey(state = gameState) {
  return getEvidenceCaseKey(state);
}

export function getTicketAnalysis(state = gameState) {
  return (
    state.caseData?.ticketAnalyses?.[getTicketCaseKey(state)] ||
    null
  );
}

export function isCurrentCaseEvidence(item, state = gameState) {
  return evidenceMatchesCase(item, state);
}

export function isTicketEvidence(item) {
  const evidence = readApartmentEvidence(item);

  return Boolean(
    evidence &&
    (
      TICKET_IDS.has(evidence.originalId) ||
      evidence.metadata?.ticketEvidence === true
    )
  );
}

export function findCaseTicket(
  state = gameState,
  inventory = inventoryManager
) {
  return (
    inventory.getAllItems().find(
      item =>
        isTicketEvidence(item) &&
        isCurrentCaseEvidence(item, state)
    ) ||
    null
  );
}

export function getTicketTravelBlock(
  destinationId,
  state = gameState
) {
  if (state.caseFailed) {
    return 'case_failed';
  }

  // Evidence reveals where to go, but does not prevent blind travel.
  return null;
}

export function getEvidenceExamination(
  itemId,
  state = gameState
) {
  return (
    state.caseData?.labEvidenceExaminations?.[
      getTicketCaseKey(state)
    ]?.[itemId] ||
    null
  );
}

function recordExamination(item, text, useful, state) {
  const key = getTicketCaseKey(state);
  const all = state.caseData?.labEvidenceExaminations || {};

  state.updateState({
    caseData: {
      ...(state.caseData || {}),
      labEvidenceExaminations: {
        ...all,
        [key]: {
          ...(all[key] || {}),
          [item.id]: {
            itemId: item.id,
            text,
            useful,
            examinedAt: new Date().toISOString()
          }
        }
      }
    }
  });

  requestAutosave();
}

function refusalFor(item) {
  if (item.isArtifact || item.type === 'artifact') {
    return __dialogueText("managers/TicketAnalysisService.js", "t_20c08e0e81b8a550b562");
  }

  if (item.isRedHerring) {
    return __dialogueText("managers/TicketAnalysisService.js", "t_f5c15ce2421e5e6fdd25");
  }

  if (item.isEscapeFragment) {
    return __dialogueText("managers/TicketAnalysisService.js", "t_dc92d0cef18a83eaf9bc");
  }

  if (item.isEscapeClue) {
    return __dialogueText("managers/TicketAnalysisService.js", "t_45ad9f29871d30b11343");
  }

  return __dialogueText("managers/TicketAnalysisService.js", "t_3a85dd6bbcdffc8fdb78");
}

function resolveLead(item, target, state) {
  if (!isCurrentCaseEvidence(item, state)) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_6ce6367569a84791ed8e")
    };
  }

  if (item.isRedHerring || item.isArtifact) {
    return {
      ok: false,
      message: refusalFor(item),
      examined: true
    };
  }

  if (isTicketEvidence(item)) {
    const airportCode = getTicketAirportCode(target);

    if (!airportCode) {
      return {
        ok: false,
        message: __dialogueText("managers/TicketAnalysisService.js", "t_8813600b4c4d74d51b89")
      };
    }

    return {
      ok: true,
      kind: 'airport_code',
      airportCode,
      value: airportCode,
      clueText: `${__dialogueText("managers/TicketAnalysisService.js", "t_e07033aa62be1d47b4f9")}${airportCode}${__dialogueText("managers/TicketAnalysisService.js", "t_cdb4ee2aea69cc6a8333")}`,
      assistantText: `${__dialogueText("managers/TicketAnalysisService.js", "t_2fb1322f5ec14ca05b00")}${airportCode}${__dialogueText("managers/TicketAnalysisService.js", "t_f83367b6d4ef318f3909")}`
    };
  }

  const definition = item.metadata?.escapeEvidence;

  const hint =
    definition?.kind === 'location_hint'
      ? definition.hintsByCity?.[target.id]
      : null;

  if (typeof hint === 'string' && hint.trim()) {
    return {
      ok: true,
      kind: 'location_hint',
      value: hint.trim(),
      clueText: hint.trim(),
      assistantText: `${hint.trim()}${__dialogueText("managers/TicketAnalysisService.js", "t_724aff2f54382a9245b7")}`
    };
  }

  return {
    ok: false,
    message: refusalFor(item),
    examined: true
  };
}

export function analyseEscapeEvidence(
  locations,
  options = {}
) {
  const state = options.state || gameState;
  const inventory = options.inventory || inventoryManager;

  if (
    !state.isGameActive ||
    state.caseFailed ||
    state.caseResolved
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_7a18b0effb24df007cb4")
    };
  }

  const raw = inventory.getAllItems().find(
    entry => entry?.id === options.itemId
  );

  if (!raw) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_404b51781ed87b2948de")
    };
  }

  const item = readApartmentEvidence(raw);

  if (!isCurrentCaseEvidence(item, state)) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_acbdf0b2bdb81d9c3307")
    };
  }

  const examination = getEvidenceExamination(item.id, state);
  const previous = getTicketAnalysis(state);

  // Recheck useful travel evidence rejected by the old metadata reader.
  const travelEvidence =
    isTicketEvidence(item) ||
    item.isEscapeClue ||
    Boolean(item.metadata?.escapeEvidence);

  const retryLegacyNegative =
    examination &&
    !examination.useful &&
    travelEvidence &&
    !item.isRedHerring &&
    !item.isArtifact;

  if (
    examination &&
    !retryLegacyNegative &&
    (!examination.useful || previous?.completed)
  ) {
    return {
      ok: examination.useful,
      alreadyAnalysed: true,
      message: examination.text,
      result: examination.useful ? previous : null
    };
  }

  if (
    previous?.completed &&
    previous.sourceItemId === item.id
  ) {
    const text =
      previous.assistantText ||
      (
        previous.airportCode
          ? `${__dialogueText("managers/TicketAnalysisService.js", "t_2fb1322f5ec14ca05b00")}${previous.airportCode}${__dialogueText("managers/TicketAnalysisService.js", "t_aca93cc76fc99252558c")}`
          : previous.clueText ||
            __dialogueText("managers/TicketAnalysisService.js", "t_c60b04cf262e1ed39d32")
      );

    recordExamination(item, text, true, state);

    return {
      ok: true,
      alreadyAnalysed: true,
      message: text,
      result: previous
    };
  }

  if (
    isTotalTimeExpired(state) ||
    (
      !state.escapePhaseActive &&
      isCrimePhaseExpired(state)
    )
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_8c10ae4475fb392cd058")
    };
  }

  const manager = options.routeManager || getRouteManager();

  const list = Array.isArray(locations)
    ? locations
    : locations?.locations;

  if (
    !Array.isArray(list) ||
    !manager ||
    !Array.isArray(manager.route) ||
    !manager.route.length
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_1a536aec645d9e29c8a7")
    };
  }

  const validRoute = manager.route.every(
    id =>
      typeof id === 'string' &&
      id !== state.crimeCityId &&
      id !== 'hq' &&
      list.some(location => location?.id === id)
  );

  if (!validRoute) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_1af25932b62f7c6335e5")
    };
  }

  const targetId = manager.route[0];

  const target = list.find(
    location => location?.id === targetId
  );

  const lead = resolveLead(item, target, state);

  if (!lead.ok) {
    if (lead.examined) {
      recordExamination(item, lead.message, false, state);
    }

    return lead;
  }

  if (!previous?.completed) {
    const inCrimeCityPhase = manager.isCrimeCityPhase();

    if (
      inCrimeCityPhase &&
      manager.getCrimeCity() !== state.crimeCityId
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/TicketAnalysisService.js", "t_5dd216ce2bad69853553")
      };
    }

    if (
      !inCrimeCityPhase &&
      (
        !manager.isRoutePhase() ||
        manager.currentRouteIndex !== 0
      )
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/TicketAnalysisService.js", "t_6146142f3fd5e9d2af07")
      };
    }

    const routeBefore = manager.serialize();

    if (
      inCrimeCityPhase &&
      !manager.enterCity(state.crimeCityId).ok
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/TicketAnalysisService.js", "t_a9948c369b7dec635fa3")
      };
    }

    if (!beginEscapePhaseClock(state)) {
      manager.restore(routeBefore);

      return {
        ok: false,
        message: __dialogueText("managers/TicketAnalysisService.js", "t_9a8ea57324404ccd2834")
      };
    }
  }

  const result = {
    completed: true,
    analysisType: lead.kind,
    targetCityId: targetId,
    sourceItemId: item.id,
    analysedAt: new Date().toISOString(),
    analysisMinutes: 0,
    route: [...manager.route],
    clueText: lead.clueText,
    assistantText: lead.assistantText,
    ...(lead.airportCode
      ? { airportCode: lead.airportCode }
      : {})
  };

  if (!previous?.completed) {
    state.updateState({
      caseData: {
        ...(state.caseData || {}),
        ticketAnalyses: {
          ...(state.caseData?.ticketAnalyses || {}),
          [getTicketCaseKey(state)]: result
        }
      },
      crimeSceneVisited: true,
      escapeRoute: [...manager.route]
    });
  }

  state.addClue({
    id: `escape_evidence_${getTicketCaseKey(state)}_${item.id}`,
    type:
      lead.kind === 'airport_code'
        ? 'ticket_analysis'
        : 'escape_evidence_analysis',
    category: 'travel',
    source: 'crime_lab',
    key: lead.kind,
    value: lead.value,
    text: lead.clueText,
    cityId: state.crimeCityId,
    missionId:
      state.currentMission?.id ||
      state.currentMission?.missionId ||
      null
  });

  recordExamination(
    item,
    lead.assistantText,
    true,
    state
  );

  if (!previous?.completed) {
    if (options.sync) {
      options.sync(list, manager);
    } else {
      syncInvestigationState(list);

      state.currentDestinations =
        generateDestinationsForCurrentCity(list);
    }

    advanceCrimeTutorial(state, 'search_apartment');
  }

  requestAutosave();

  return {
    ok: true,
    alreadyAnalysed: false,
    message: lead.assistantText,
    result
  };
}

export function analyseCaseTicket(
  locations,
  options = {}
) {
  const state = options.state || gameState;
  const inventory = options.inventory || inventoryManager;

  const ticket =
    options.itemId != null
      ? inventory.getAllItems().find(
          item => item?.id === options.itemId
        )
      : findCaseTicket(state, inventory);

  if (
    !ticket ||
    !isTicketEvidence(ticket) ||
    !isCurrentCaseEvidence(ticket, state)
  ) {
    return {
      ok: false,
      message: __dialogueText("managers/TicketAnalysisService.js", "t_4234890ed1cfa43c2960")
    };
  }

  return analyseEscapeEvidence(locations, {
    ...options,
    state,
    inventory,
    itemId: ticket.id
  });
}