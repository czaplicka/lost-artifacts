import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { saveManager } from '../saveGameService.js';
import { validChase } from './chaseLogic.js';

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

const PREFIX = 'lost-artefacts:chase-checkpoint:v2:';

const SLOT_KEYS = [
  'slot_1',
  'slot_2',
  'slot_3'
];

const sameId = (a, b) =>
  a != null &&
  b != null &&
  String(a) === String(b);

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function checkpointSlot(record) {
  if (SLOT_KEYS.includes(record?.slotKey)) {
    return record.slotKey;
  }

  const lastUsedSlot = saveManager.getLastUsedSlot();

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
  // Przygotowujemy niezależną kopię przed zmianą stanu gry.
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

    gameState.chaseState =
      structuredClone(record);

    const mainSaveWritten = saveGameState();

    // Pełny stan zawiera również courtState,
    // jeżeli rozpoczęła się już rozprawa.
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

    // Sukces oznacza zapis autosave'a i checkpointu.
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

    // Automatyczne odtworzenie nie może przełączyć
    // gracza do innej sprawy lub kampanii.
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

    // Nie cofamy nowszego wczytanego stanu.
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

  // Zwolnienie przez sąd nie jest ucieczką.
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

  // Awaryjny komunikat nie sugeruje,
  // że podejrzany uciekł, jeśli brak takiego wyniku.
  return {
    title: 'MISSION FAILED',
    reasonCode: 'mission_failed',
    caseId: record?.caseId ?? gameState.currentCaseId,
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
      // Uszkodzony checkpoint nie blokuje
      // odczytu pozostałych slotów.
    }
  }

  candidates.sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return candidates[0] || null;
}

export function restoreExplicitChaseCheckpoint(payload) {
  try {
    if (!validCheckpoint(payload)) {
      return false;
    }

    // Jawny wybór checkpointu może przywrócić
    // jego sprawę i kampanię.
    return applyCheckpoint(payload);
  } catch (error) {
    console.warn(
      '[Chase] Explicit checkpoint restore failed:',
      error
    );

    return false;
  }
}