import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

// Zasady czasu sprawy.
export const CRIME_PHASE_DAYS = 4;
export const TOTAL_CASE_DAYS = 7;

export function getGameTimeInSeconds(state = gameState) {
  const day = Math.max(1, Math.floor(Number(state.currentDay) || 1));
  const hour = Math.max(0, Math.min(23, Math.floor(Number(state.currentHour) || 0)));
  const minute = Math.max(0, Math.min(59, Math.floor(Number(state.currentMinute) || 0)));

  return (
    (day - 1) * SECONDS_PER_DAY +
    hour * SECONDS_PER_HOUR +
    minute * SECONDS_PER_MINUTE
  );
}

export function getMissionDeadlineInSeconds(state = gameState) {
  const deadline = state.currentMission?.deadline;

  if (!deadline) {
    return null;
  }

  const day = Math.max(1, Math.floor(Number(deadline.day) || 1));
  const hour = Math.max(0, Math.min(23, Math.floor(Number(deadline.hour) || 0)));
  const minute = Math.max(0, Math.min(59, Math.floor(Number(deadline.minute) || 0)));

  return (
    (day - 1) * SECONDS_PER_DAY +
    hour * SECONDS_PER_HOUR +
    minute * SECONDS_PER_MINUTE
  );
}

export function getCaseTimeRemaining(state = gameState) {
  const deadlineSeconds = getMissionDeadlineInSeconds(state);

  if (deadlineSeconds === null) {
    return null;
  }

  return Math.max(0, deadlineSeconds - getGameTimeInSeconds(state));
}

export function isCaseTimeExpired(state = gameState) {
  const remaining = getCaseTimeRemaining(state);

  return remaining !== null && remaining <= 0;
}

export function refreshCaseDeadline(state = gameState) {
  const remainingSeconds = getCaseTimeRemaining(state);

  EventBus.emit('caseTimeChanged', {
    remainingSeconds,
    expired: remainingSeconds !== null && remainingSeconds <= 0,
    deadline: state.currentMission?.deadline || null
  });

  return remainingSeconds;
}

export function createMissionDeadline(days = 4, state = gameState) {
  const safeDays = Math.max(1, Math.floor(Number(days) || 4));

  return {
    day: Math.max(1, Number(state.currentDay) || 1) + safeDays,
    hour: Math.max(0, Math.min(23, Number(state.currentHour) || 0)),
    minute: Math.max(0, Math.min(59, Number(state.currentMinute) || 0))
  };
}

// ---------------------------------------------------------------
// Fazy sprawy: miasto zbrodni (max 4 dni) i pościg (do końca 7 dni).
// Terminy w stanie gry to bezwzględne minuty zegara gry.
// ---------------------------------------------------------------

export function getClockMinutes(state = gameState) {
  return Math.floor(getGameTimeInSeconds(state) / SECONDS_PER_MINUTE);
}

export function minutesToClock(totalMinutes) {
  const safe = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const day = Math.floor(safe / MINUTES_PER_DAY) + 1;
  const withinDay = safe % MINUTES_PER_DAY;

  return {
    day,
    hour: Math.floor(withinDay / MINUTES_PER_HOUR),
    minute: withinDay % MINUTES_PER_HOUR
  };
}

// Termin aktualnej fazy zapisujemy w currentMission.deadline,
// z którego korzysta HUD i reszta funkcji powyżej.
export function syncMissionDeadline(state = gameState) {
  const minutes = state.escapePhaseActive
    ? state.escapeDeadline
    : state.investigationDeadline;

  if (!Number.isFinite(minutes) || !state.currentMission) {
    return null;
  }

  const deadline = minutesToClock(minutes);
  const current = state.currentMission.deadline;

  const unchanged =
    current &&
    current.day === deadline.day &&
    current.hour === deadline.hour &&
    current.minute === deadline.minute;

  if (!unchanged) {
    state.currentMission = {
      ...state.currentMission,
      deadline
    };
  }

  return deadline;
}

// Start sprawy (nowa gra i kolejna sprawa).
export function startCaseClock(state = gameState) {
  const now = getClockMinutes(state);

  state.updateState({
    investigationPhaseActive: true,
    investigationStartTime: now,
    investigationDeadline: now + CRIME_PHASE_DAYS * MINUTES_PER_DAY,

    escapePhaseActive: false,
    escapeStartTime: null,
    // Termin końcowy całej sprawy jest ustalony od razu i się nie przesuwa.
    escapeDeadline: now + TOTAL_CASE_DAYS * MINUTES_PER_DAY,

    timeWastedOnMistakes: 0
  });

  return syncMissionDeadline(state);
}

// Początek pościgu: termin końcowy zostaje ten sam, więc pościg
// dostaje to, co zostało z 7 dni.
export function beginEscapePhaseClock(state = gameState) {
  if (!state.escapePhaseActive) {
    const now = getClockMinutes(state);

    const fallbackDeadline = Number.isFinite(state.investigationStartTime)
      ? state.investigationStartTime + TOTAL_CASE_DAYS * MINUTES_PER_DAY
      : now + (TOTAL_CASE_DAYS - CRIME_PHASE_DAYS) * MINUTES_PER_DAY;

    state.updateState({
      investigationPhaseActive: false,
      escapePhaseActive: true,
      escapeStartTime: now,
      escapeDeadline: Number.isFinite(state.escapeDeadline)
        ? state.escapeDeadline
        : fallbackDeadline
    });
  }

  return syncMissionDeadline(state);
}

// Minął limit całej sprawy (7 dni).
export function isTotalTimeExpired(state = gameState) {
  return (
    Number.isFinite(state.escapeDeadline) &&
    getClockMinutes(state) >= state.escapeDeadline
  );
}

// Minęły 4 dni w mieście zbrodni, a pościg jeszcze się nie zaczął.
export function isCrimePhaseExpired(state = gameState) {
  return (
    !state.escapePhaseActive &&
    Number.isFinite(state.investigationDeadline) &&
    getClockMinutes(state) >= state.investigationDeadline
  );
}