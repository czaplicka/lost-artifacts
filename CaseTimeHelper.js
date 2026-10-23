import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';

const MINUTES_PER_DAY = 1440;
export const CRIME_PHASE_DAYS = 4;
export const TOTAL_CASE_DAYS = 7;

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
function positiveDeadline(value) {
  const n = nonNegativeNumber(value);
  return n !== null && n > 0 ? n : null;
}
function clockPart(value, fallback, maximum) {
  const n = Number(value);
  return Math.max(0, Math.min(maximum, Math.floor(Number.isFinite(n) ? n : fallback)));
}

export function getGameTimeInSeconds(state = gameState) {
  const rawDay = Number(state.currentDay ?? state.day ?? 1);
  const day = Math.max(1, Math.floor(Number.isFinite(rawDay) ? rawDay : 1));
  const hour = clockPart(state.currentHour ?? state.hour ?? 0, 0, 23);
  const minute = clockPart(state.currentMinute ?? state.minute ?? 0, 0, 59);
  return ((day - 1) * MINUTES_PER_DAY + hour * 60 + minute) * 60;
}

export function getClockMinutes(state = gameState) {
  return Math.floor(getGameTimeInSeconds(state) / 60);
}

export function minutesToClock(totalMinutes) {
  const safe = Math.max(0, Math.floor(Number(totalMinutes) || 0));
  const withinDay = safe % MINUTES_PER_DAY;
  return { day: Math.floor(safe / MINUTES_PER_DAY) + 1,
    hour: Math.floor(withinDay / 60), minute: withinDay % 60 };
}

// Read the legacy mission field, but do not make it authoritative over the case clock.
export function getMissionDeadlineInSeconds(state = gameState) {
  const deadline = state.currentMission?.deadline;
  if (!deadline || !Number.isInteger(deadline.day) || deadline.day < 1 ||
      !Number.isInteger(deadline.hour) || deadline.hour < 0 || deadline.hour > 23 ||
      !Number.isInteger(deadline.minute) || deadline.minute < 0 || deadline.minute > 59) return null;
  return ((deadline.day - 1) * MINUTES_PER_DAY + deadline.hour * 60 + deadline.minute) * 60;
}

// Shared read-only decision for the HUD, time payloads and the game-over watcher.
// A known case start defines the agreed 4-day and 7-day boundaries.
// No read function restarts a clock, changes a phase or advances a scene.
export function getCaseClockStatus(state = gameState) {
  const now = getClockMinutes(state);
  const start = nonNegativeNumber(state.investigationStartTime);
  let investigationDeadline;
  let escapeDeadline;
  if (start !== null) {
    investigationDeadline = start + CRIME_PHASE_DAYS * MINUTES_PER_DAY;
    escapeDeadline = start + TOTAL_CASE_DAYS * MINUTES_PER_DAY;
  } else {
    investigationDeadline = positiveDeadline(state.investigationDeadline);
    escapeDeadline = positiveDeadline(state.escapeDeadline);
    // Older saves may contain only currentMission.deadline. Do not invent a start
    // or grant extra days based on the current time.
    const legacy = getMissionDeadlineInSeconds(state);
    if (legacy !== null && legacy > 0) {
      if (state.escapePhaseActive === true && escapeDeadline === null) escapeDeadline = legacy / 60;
      if (state.escapePhaseActive !== true && investigationDeadline === null) investigationDeadline = legacy / 60;
    }
  }
  const escapeActive = state.escapePhaseActive === true;
  const activeDeadline = escapeActive ? escapeDeadline : investigationDeadline;
  return {
    now, start, investigationDeadline, escapeDeadline, activeDeadline,
    escapeActive,
    valid: activeDeadline !== null,
    crimeExpired: !escapeActive && investigationDeadline !== null && now >= investigationDeadline,
    totalExpired: escapeDeadline !== null && now >= escapeDeadline,
    remainingSeconds: activeDeadline === null ? null : Math.max(0, (activeDeadline - now) * 60)
  };
}

export function getCaseTimeRemaining(state = gameState) {
  return getCaseClockStatus(state).remainingSeconds;
}
export function isCaseTimeExpired(state = gameState) {
  const remaining = getCaseTimeRemaining(state);
  return remaining !== null && remaining <= 0;
}
export function isTotalTimeExpired(state = gameState) {
  return getCaseClockStatus(state).totalExpired;
}
export function isCrimePhaseExpired(state = gameState) {
  return getCaseClockStatus(state).crimeExpired;
}

export function getTimeChangedPayload(state = gameState) {
  const status = getCaseClockStatus(state);
  const clock = minutesToClock(status.now);
  return {
    ...clock,
    partOfDay: state.currentPartOfDay ?? state.partOfDay ?? 'Morning',
    caseTimeRemaining: status.remainingSeconds,
    caseExpired: status.remainingSeconds !== null && status.remainingSeconds <= 0,
    caseClockValid: status.valid,
    deadline: status.activeDeadline === null ? null : minutesToClock(status.activeDeadline)
  };
}
export function refreshCaseDeadline(state = gameState) {
  const payload = getTimeChangedPayload(state);
  EventBus.emit('timeChanged', payload);
  return payload.caseTimeRemaining;
}
export function createMissionDeadline(days = 4, state = gameState) {
  const safeDays = Math.max(1, Math.floor(Number(days) || 4));
  return minutesToClock(getClockMinutes(state) + safeDays * MINUTES_PER_DAY);
}

function update(state, values) {
  if (typeof state.updateState === 'function') state.updateState(values);
  else Object.assign(state, values);
}

export function syncMissionDeadline(state = gameState) {
  const status = getCaseClockStatus(state);
  if (status.activeDeadline === null || !state.currentMission) return null;
  const deadline = minutesToClock(status.activeDeadline);
  const previous = state.currentMission.deadline;
  const changes = {};
  if (status.start !== null) {
    if (state.investigationDeadline !== status.investigationDeadline) changes.investigationDeadline = status.investigationDeadline;
    if (state.escapeDeadline !== status.escapeDeadline) changes.escapeDeadline = status.escapeDeadline;
  }
  if (!previous || previous.day !== deadline.day || previous.hour !== deadline.hour || previous.minute !== deadline.minute) {
    changes.currentMission = { ...state.currentMission, deadline };
  }
  if (Object.keys(changes).length) update(state, changes);
  return deadline;
}

// Call only when creating a genuinely new case, never on scene entry.
export function startCaseClock(state = gameState) {
  const now = getClockMinutes(state);
  update(state, {
    investigationPhaseActive: true, investigationStartTime: now,
    investigationDeadline: now + CRIME_PHASE_DAYS * MINUTES_PER_DAY,
    escapePhaseActive: false, escapeStartTime: null,
    escapeDeadline: now + TOTAL_CASE_DAYS * MINUTES_PER_DAY,
    timeWastedOnMistakes: 0
  });
  return syncMissionDeadline(state);
}

// Does not navigate. The ticket-analysis flow will decide when to call this.
// It never grants a fresh 3/7 days and never infers a new case start from "now".
export function beginEscapePhaseClock(state = gameState) {
  const status = getCaseClockStatus(state);
  if (status.escapeDeadline === null || status.totalExpired ||
      (!status.escapeActive && status.crimeExpired)) return null;
  if (!status.escapeActive) {
    update(state, {
      investigationPhaseActive: false, escapePhaseActive: true,
      escapeStartTime: status.now, escapeDeadline: status.escapeDeadline
    });
  }
  return syncMissionDeadline(state);
}
