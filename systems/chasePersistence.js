import { gameState } from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import {
  saveManager
} from '../saveGameService.js';

import {
  progressionManager
} from '../managers/ProgressionManager.js';

import {
  validChase
} from './chaseLogic.js';

export const ESCAPE_MESSAGE =
  'You lost the suspect during the pursuit. ' +
  'The thief escaped with the artefact. ' +
  'Your shoes have declined to comment.';

const CHASE_FAILURES = Object.freeze({
  chase_escape: {
    title: 'SUSPECT ESCAPED',
    message: ESCAPE_MESSAGE
  },

  missing_warrant: {
    title: 'ARREST FAILED',
    message:
      'You caught the suspect, but had no arrest warrant. ' +
      'The arrest could not proceed. The mission has failed.'
  },

  warrant_mismatch: {
    title: 'ARREST FAILED',
    message:
      'You caught the suspect, but your warrant named another person. ' +
      'The arrest could not proceed. The mission has failed.'
  }
});

const COURT_RELEASE_MESSAGE =
  'The court released the defendant. ' +
  'The prosecution failed to establish the case.';

const PREFIX =
  'lost-artefacts:chase-checkpoint:v2:';

const SLOT_KEYS = [
  'slot_1',
  'slot_2',
  'slot_3'
];

const sameId = (first, second) =>
  first != null &&
  second != null &&
  String(first) === String(second);

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function stableProgressionId(value) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  if (
    typeof value === 'number' &&
    !Number.isFinite(value)
  ) {
    return null;
  }

  const id = String(value).trim();

  if (
    !id ||
    id.length > 400 ||
    id === 'default_case' ||
    id === 'unknown_mission'
  ) {
    return null;
  }

  return id;
}

function checkpointSlot(record) {
  if (SLOT_KEYS.includes(record?.slotKey)) {
    return record.slotKey;
  }

  const lastUsedSlot =
    saveManager.getLastUsedSlot();

  return SLOT_KEYS.includes(lastUsedSlot)
    ? lastUsedSlot
    : 'slot_1';
}

function validCheckpoint(payload) {
  try {
    if (
      !isObject(payload) ||
      payload.version !== 2 ||
      !isObject(payload.data) ||
      !Number.isFinite(payload.updatedAt) ||
      payload.updatedAt < 0 ||
      !sameId(
        payload.caseId,
        payload.data.currentCaseId
      ) ||
      payload.campaignId !== payload.data._createdAt
    ) {
      return false;
    }

    return validChase(
      payload.data.chaseState,
      payload.caseId,
      payload.campaignId
    );
  } catch {
    return false;
  }
}

function applyCheckpoint(payload) {
  const data = structuredClone(payload.data);

  const energyData = {
    energy: data.energy,
    maxEnergy: data.maxEnergy,
    difficulty: data.difficulty,

    energyLog: Array.isArray(data.energyLog)
      ? structuredClone(data.energyLog)
      : []
  };

  const applied = saveManager.applyState(data);

  if (applied === false) {
    throw new Error(
      'Applying the checkpoint state failed.'
    );
  }

  saveManager.restoreEnergyManager(energyData);

  return true;
}

export function currentChase() {
  const record = gameState.chaseState;

  return validChase(
    record,
    gameState.currentCaseId,
    gameState._createdAt
  )
    ? record
    : null;
}

export function chaseFailureCode(record) {
  if (!record) return null;

  if (
    Object.prototype.hasOwnProperty.call(
      CHASE_FAILURES,
      record.failureCode
    )
  ) {
    return record.failureCode;
  }

  if (record.phase === 'escaped') {
    return 'chase_escape';
  }

  return null;
}

function grantNewArrestXP(record, previousRecord) {
  if (
    record.phase !== 'review' ||
    record.failureCode ||
    record.arrestOutcome?.code !== 'arrested' ||
    record.arrestOutcome?.arrested !== true ||
    record.terminalScene !== 'CourtScene'
  ) {
    return {
      success: false,
      reason: 'arrest_not_completed'
    };
  }

  // Nie przyznajemy XP wstecz przy zapisywaniu
  // aresztowania już obecnego w starszym zapisie.
  const previouslyArrested =
    previousRecord &&
    sameId(previousRecord.caseId, record.caseId) &&
    previousRecord.campaignId === record.campaignId &&
    sameId(
      previousRecord.suspectId,
      record.suspectId
    ) &&
    previousRecord.arrestOutcome?.code === 'arrested' &&
    previousRecord.arrestOutcome?.arrested === true;

  if (previouslyArrested) {
    return {
      success: false,
      reason: 'arrest_already_recorded'
    };
  }

  if (
    record.distance !== 0 ||
    !gameState.arrestWarrantIssued ||
    !sameId(
      gameState.warrantSuspectId,
      record.suspectId
    )
  ) {
    return {
      success: false,
      reason: 'invalid_arrest'
    };
  }

  const thiefId =
    gameState.trueThiefCaseSuspectId ||
    gameState.realThiefSuspectId;

  // Porównujemy identyfikator podejrzanego w sprawie,
  // nie identyfikator jego profilu z bazy złodziei.
  if (!sameId(record.suspectId, thiefId)) {
    return {
      success: false,
      reason: 'not_the_case_thief'
    };
  }

  const caseId =
    stableProgressionId(record.caseId);

  if (!caseId) {
    console.warn(
      '[Chase] Arrest XP skipped: no stable case ID.'
    );

    return {
      success: false,
      reason: 'missing_case_id'
    };
  }

  try {
    return progressionManager.grantReward(
      'correct_arrest',
      caseId,
      'Correct suspect arrested'
    );
  } catch (error) {
    console.error(
      '[Chase] Could not grant arrest XP:',
      error
    );

    return {
      success: false,
      reason: 'progression_error'
    };
  }
}

export function persistChase(record) {
  try {
    if (
      !validChase(
        record,
        gameState.currentCaseId,
        gameState._createdAt
      )
    ) {
      return false;
    }

    const previousRecord =
      gameState.chaseState;

    const slot = checkpointSlot(record);
    const failureCode = chaseFailureCode(record);

    if (failureCode) {
      record.failureCode = failureCode;
      record.terminalScene = 'GameOverScene';

      gameState.finalArrestSuspectId =
        record.suspectId;

      gameState.finalArrestResult = 'FAILURE';

      gameState.caseFailed = true;
      gameState.caseResolved = false;
      gameState.isGameActive = false;

      gameState.gameOverReason =
        CHASE_FAILURES[failureCode].message;
    } else if (record.phase === 'caught') {
      gameState.finalArrestSuspectId =
        record.suspectId;
    }

    record.slotKey = slot;
    record.updatedAt = Date.now();

    // Sprawdzamy przejście do zatwierdzonego aresztowania,
    // zanim nadpiszemy poprzedni rekord.
    const isNewArrest =
      !failureCode &&
      record.phase === 'review' &&
      record.arrestOutcome?.code === 'arrested' &&
      record.arrestOutcome?.arrested === true;

    gameState.chaseState =
      structuredClone(record);

    if (isNewArrest) {
      grantNewArrestXP(
        record,
        previousRecord
      );
    }

    // XP zostało już dodane do stanu:
    // autosave i checkpoint zawierają tę samą nagrodę.
    const mainSaveWritten = saveGameState();

    const data = saveManager.getState();

    const payload = {
      version: 2,
      caseId: record.caseId,
      campaignId: record.campaignId,
      updatedAt: record.updatedAt,
      data
    };

    if (!validCheckpoint(payload)) {
      throw new Error(
        'Generated checkpoint is invalid.'
      );
    }

    localStorage.setItem(
      PREFIX + slot,
      JSON.stringify(payload)
    );

    return mainSaveWritten === true;
  } catch (error) {
    console.warn(
      '[Chase] Checkpoint could not be written:',
      error
    );

    return false;
  }
}

export function restoreLocalChaseCheckpoint(slotKey) {
  if (!SLOT_KEYS.includes(slotKey)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      localStorage.getItem(PREFIX + slotKey) ||
      'null'
    );

    if (!validCheckpoint(payload)) {
      return false;
    }

    if (
      !sameId(
        payload.caseId,
        gameState.currentCaseId
      ) ||
      payload.campaignId !== gameState._createdAt
    ) {
      return false;
    }

    const loaded = currentChase();

    if (
      loaded &&
      Number.isFinite(loaded.updatedAt) &&
      loaded.updatedAt > payload.updatedAt
    ) {
      return false;
    }

    return applyCheckpoint(payload);
  } catch (error) {
    console.warn(
      '[Chase] Could not restore checkpoint:',
      error
    );

    return false;
  }
}

export function terminalData(record) {
  const court = gameState.courtState;

  const releasedByCourt =
    record &&
    court &&
    sameId(court.caseId, record.caseId) &&
    court.campaignId === record.campaignId &&
    sameId(court.suspectId, record.suspectId) &&
    court.phase === 'verdict' &&
    court.verdict === 'released' &&
    court.resultCommitted === true;

  if (releasedByCourt) {
    return {
      title: 'DEFENDANT RELEASED',
      reasonCode: 'court_release',
      caseId: record.caseId,
      suspectId: record.suspectId,
      message: COURT_RELEASE_MESSAGE
    };
  }

  const reasonCode = chaseFailureCode(record);

  if (reasonCode) {
    const failure = CHASE_FAILURES[reasonCode];

    return {
      title: failure.title,
      reasonCode,
      caseId: record.caseId,
      suspectId: record.suspectId,
      message: failure.message
    };
  }

  return {
    title: 'MISSION FAILED',
    reasonCode: 'mission_failed',

    caseId:
      record?.caseId ??
      gameState.currentCaseId,

    suspectId:
      record?.suspectId ??
      gameState.finalArrestSuspectId,

    message:
      gameState.gameOverReason ||
      'The mission has failed.'
  };
}

export function settleChase(sceneKey) {
  const record = currentChase();

  if (
    !record ||
    ![
      'caught',
      'escaped',
      'review',
      'settled'
    ].includes(record.phase)
  ) {
    return false;
  }

  const settled = structuredClone(record);

  settled.phase = 'settled';
  settled.terminalScene = sceneKey;

  return persistChase(settled);
}

export function latestLocalChaseCheckpoint() {
  const candidates = [];

  for (const slot of SLOT_KEYS) {
    try {
      const payload = JSON.parse(
        localStorage.getItem(PREFIX + slot) ||
        'null'
      );

      if (!validCheckpoint(payload)) {
        continue;
      }

      if (
        payload.data.chaseState.phase === 'settled'
      ) {
        continue;
      }

      candidates.push(payload);
    } catch {
      // Uszkodzony slot nie blokuje pozostałych.
    }
  }

  candidates.sort(
    (first, second) =>
      second.updatedAt - first.updatedAt
  );

  return candidates[0] || null;
}

export function restoreExplicitChaseCheckpoint(payload) {
  try {
    if (!validCheckpoint(payload)) {
      return false;
    }

    return applyCheckpoint(payload);
  } catch (error) {
    console.warn(
      '[Chase] Explicit checkpoint restore failed:',
      error
    );

    return false;
  }
}