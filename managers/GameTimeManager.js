import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { getTimeChangedPayload } from '../CaseTimeHelper.js';
import { requestAutosave } from '../gameStatePersistence.js';

const OWNER_KEY = 'GameTimeManager';

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;

const DEFAULT_TIME_STATE = Object.freeze({
  day: 1,
  hour: 8,
  minute: 0,
  partOfDay: 'Morning'
});

let timeManagerInstance = null;

function toFiniteNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}

function toNonNegativeInteger(value, fallback = 0) {
  return Math.max(
    0,
    Math.floor(toFiniteNumber(value, fallback))
  );
}

function extractTimeFields(savedState) {
  if (!savedState) {
    return null;
  }

  return {
    day: savedState.currentDay ?? savedState.day,
    hour: savedState.currentHour ?? savedState.hour,
    minute: savedState.currentMinute ?? savedState.minute,
    partOfDay:
      savedState.currentPartOfDay ??
      savedState.partOfDay
  };
}

function readTimeFromGameState() {
  if (!Number.isFinite(gameState.currentDay)) {
    return null;
  }

  return {
    currentDay: gameState.currentDay,
    currentHour: gameState.currentHour,
    currentMinute: gameState.currentMinute,
    currentPartOfDay: gameState.currentPartOfDay
  };
}

function normalizeTimeState(savedState = null) {
  const fields = extractTimeFields(savedState);

  const rawDay = toNonNegativeInteger(
    fields?.day,
    DEFAULT_TIME_STATE.day
  );

  const rawHour = toNonNegativeInteger(
    fields?.hour,
    DEFAULT_TIME_STATE.hour
  );

  const rawMinute = toNonNegativeInteger(
    fields?.minute,
    DEFAULT_TIME_STATE.minute
  );

  const totalMinutes =
    rawHour * MINUTES_PER_HOUR + rawMinute;

  const additionalDays = Math.floor(
    totalMinutes / MINUTES_PER_DAY
  );

  const minutesWithinDay = totalMinutes % MINUTES_PER_DAY;

  return {
    day: Math.max(1, rawDay) + additionalDays,
    hour: Math.floor(minutesWithinDay / MINUTES_PER_HOUR),
    minute: minutesWithinDay % MINUTES_PER_HOUR
  };
}

export class GameTimeManager {
  constructor(savedState = null) {
    this.handleAdvanceTime = this.handleAdvanceTime.bind(this);

    this.applyState(
      savedState ?? readTimeFromGameState(),
      { silent: true }
    );

    EventBus.clearScope(OWNER_KEY);

    EventBus.on(
      'advanceTime',
      this.handleAdvanceTime,
      this,
      OWNER_KEY
    );
  }

  applyState(savedState = null, { silent = false } = {}) {
    const normalized = normalizeTimeState(savedState);

    this.currentDay = normalized.day;
    this.currentHour = normalized.hour;
    this.currentMinute = normalized.minute;

    this.updatePartOfDay();
    this.syncGameState();

    if (!silent) {
      this.publishTimeChanged();
    }

    return this.getState();
  }

  getState() {
    return {
      day: this.currentDay,
      hour: this.currentHour,
      minute: this.currentMinute,
      partOfDay: this.partOfDay
    };
  }

  syncGameState() {
    gameState.currentDay = this.currentDay;
    gameState.currentHour = this.currentHour;
    gameState.currentMinute = this.currentMinute;
    gameState.currentPartOfDay = this.partOfDay;
  }

  publishTimeChanged() {
    const payload = getTimeChangedPayload(gameState);

    EventBus.emit('timeChanged', payload);

    return payload;
  }

  handleAdvanceTime(hours = 0, minutes = 0) {
    const safeHours = toNonNegativeInteger(hours);
    const safeMinutes = toNonNegativeInteger(minutes);

    const addedTotalMinutes =
      safeHours * MINUTES_PER_HOUR + safeMinutes;

    const totalMinutes =
      this.currentHour * MINUTES_PER_HOUR +
      this.currentMinute +
      addedTotalMinutes;

    const additionalDays = Math.floor(
      totalMinutes / MINUTES_PER_DAY
    );

    const minutesWithinDay = totalMinutes % MINUTES_PER_DAY;

    this.currentDay += additionalDays;
    this.currentHour = Math.floor(
      minutesWithinDay / MINUTES_PER_HOUR
    );
    this.currentMinute = minutesWithinDay % MINUTES_PER_HOUR;

    this.updatePartOfDay();
    this.syncGameState();

    // Zlecamy zapis przed emisją. CaseTimeWatcher może go anulować,
    // jeśli ten krok czasu zakończy sprawę przegraną.
    if (addedTotalMinutes > 0 && gameState.isGameActive) {
      requestAutosave();
    }

    return this.publishTimeChanged();
  }

  updatePartOfDay() {
    if (this.currentHour >= 6 && this.currentHour < 12) {
      this.partOfDay = 'Morning';
      return;
    }

    if (this.currentHour >= 12 && this.currentHour < 18) {
      this.partOfDay = 'Afternoon';
      return;
    }

    if (this.currentHour >= 18 && this.currentHour < 22) {
      this.partOfDay = 'Evening';
      return;
    }

    this.partOfDay = 'Night';
  }

  destroy() {
    EventBus.clearScope(OWNER_KEY);

    if (timeManagerInstance === this) {
      timeManagerInstance = null;
    }
  }
}

export function getGameTimeManager(savedState = null) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(savedState);
  }

  return timeManagerInstance;
}

export function hydrateGameTimeManager(savedState = null) {
  const source = savedState ?? readTimeFromGameState();

  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(source);
    return timeManagerInstance;
  }

  timeManagerInstance.applyState(source);

  return timeManagerInstance;
}

export function resetGameTimeManager() {
  timeManagerInstance?.destroy();
  timeManagerInstance = null;
}