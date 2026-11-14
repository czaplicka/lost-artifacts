import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  applyReputationEvent,
  getReputation
} from './ReputationManager.js';

const INTEGRITY_EVENTS = Object.freeze({
  honest_report: 'honest_pi_report',
  concealed_findings: 'concealed_pi_findings',
  fabricated_evidence: 'fabricated_evidence',
  framed_innocent: 'framed_innocent',
  accepted_bribe: 'bribe_accepted',
  returned_money: 'returned_money'
});

function validCaseId(value) {
  return (
    typeof value === 'string' &&
    /^[a-zA-Z0-9_-]+$/.test(value) &&
    !['__proto__', 'prototype', 'constructor']
      .includes(value)
  );
}

function hasEvent(eventId) {
  return getReputation()
    .appliedEventIds.includes(eventId);
}

function applyOnce(type, options) {
  try {
    return applyReputationEvent(type, options);
  } catch (error) {
    if (!hasEvent(options.eventId)) {
      throw error;
    }

    console.error(
      '[PICaseStanding] Listener failed after commit:',
      error
    );

    return {
      applied: false,
      reason: 'recorded_before_listener_error',
      state: getReputation()
    };
  }
}

/**
 * Wywołuj dopiero po zweryfikowaniu zakończenia sprawy.
 * Funkcja nie sprawdza celów ani nie wypłaca pieniędzy / XP.
 */
export function awardPICaseReputation({
  caseId,
  title
} = {}) {
  if (
    !validCaseId(caseId) ||
    typeof title !== 'string' ||
    !title.trim()
  ) {
    throw new Error(
      '[PICaseStanding] A valid caseId and title are required.'
    );
  }

  try {
    return applyOnce('case_solved', {
      eventId: `pi:${caseId}:case-solved`,

      headline:
        `${__dialogueText("managers/PICaseStanding.js", "t_7acc3b6f9c0c1fd35b0b")}${title.trim()}${__dialogueText("managers/PICaseStanding.js", "t_1e4a1452ad4db45827a1")}`,

      context: {
        caseId,
        missionId: caseId,
        system: 'pi'
      }
    });
  } finally {
    requestAutosave();
  }
}

/**
 * decisionId identyfikuje konkretny wybór fabularny.
 * Jeden wybór można rozliczyć tylko raz,
 * również przy ponownym otwarciu raportu.
 *
 * effect:
 * honest_report
 * concealed_findings
 * fabricated_evidence
 * framed_innocent
 * accepted_bribe
 * returned_money
 */
export function applyPIIntegrityDecision({
  caseId,
  decisionId,
  effect
} = {}) {
  if (
    !validCaseId(caseId) ||
    !validCaseId(decisionId)
  ) {
    throw new Error(
      '[PICaseStanding] Valid caseId and decisionId are required.'
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      INTEGRITY_EVENTS,
      effect
    )
  ) {
    throw new Error(
      `[PICaseStanding] Unknown integrity effect: ${effect}`
    );
  }

  const eventId =
    `pi:${caseId}:decision:${decisionId}`;

  try {
    return applyOnce(INTEGRITY_EVENTS[effect], {
      eventId,
      headline: null,

      context: {
        caseId,
        missionId: caseId,
        decisionId,
        effect,
        system: 'pi'
      }
    });
  } finally {
    requestAutosave();
  }
}