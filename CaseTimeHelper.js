import { gameState } from './GameData.js';
import { EventBus } from './EventBus.js';

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;

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