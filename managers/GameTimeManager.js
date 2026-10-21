import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import {
  isCaseTimeExpired,
  refreshCaseDeadline
} from '../CaseTimeHelper.js';


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


/**
 * Zwraca liczbę skończoną albo fallback.
 * Nie używamy `Number(value) || fallback`, ponieważ 0 jest poprawną
 * wartością np. dla godziny i minut.
 */
function toFiniteNumber(value, fallback) {
  const numberValue = Number(value);


  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}


/**
 * Zwraca liczbę całkowitą nie mniejszą niż zero.
 */
function toNonNegativeInteger(value, fallback = 0) {
  return Math.max(
    0,
    Math.floor(toFiniteNumber(value, fallback))
  );
}


/**
 * Akceptuje oba formaty:
 *
 * { day, hour, minute, partOfDay }
 *
 * oraz format używany wewnętrznie przez gameState:
 *
 * { currentDay, currentHour, currentMinute, currentPartOfDay }
 */
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


/**
 * Czyta zegar zapisany w gameState (po wczytaniu zapisu).
 * Zwraca null dla nowej gry, gdy zegar jeszcze nie istnieje.
 */
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


/**
 * Normalizuje czas z save'a:
 * - day zaczyna się od 1,
 * - hour mieści się między 0 a 23,
 * - minute mieści się między 0 a 59,
 * - nadmiar minut i godzin przechodzi na kolejne dni.
 */
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


  const totalMinutes = (
    rawHour * MINUTES_PER_HOUR
  ) + rawMinute;


  const additionalDays = Math.floor(
    totalMinutes / MINUTES_PER_DAY
  );


  const minutesWithinDay = (
    totalMinutes % MINUTES_PER_DAY
  );


  return {
    day: Math.max(1, rawDay) + additionalDays,
    hour: Math.floor(
      minutesWithinDay / MINUTES_PER_HOUR
    ),
    minute: minutesWithinDay % MINUTES_PER_HOUR
  };
}


export class GameTimeManager {
  constructor(savedState = null) {
    this.handleAdvanceTime =
      this.handleAdvanceTime.bind(this);


    // Bez jawnego stanu bierzemy zegar z gameState (np. po wczytaniu zapisu),
    // a dopiero w ostateczności wartości domyślne nowej gry.
    this.applyState(
      savedState ?? readTimeFromGameState(),
      { silent: true }
    );


    /**
     * Przy restarcie gry, powrocie do menu lub ponownym utworzeniu
     * singletona usuń stare listenery, aby czas nie przesuwał się
     * wielokrotnie po jednym evencie.
     */
    EventBus.clearScope(OWNER_KEY);


    EventBus.on(
      'advanceTime',
      this.handleAdvanceTime,
      this,
      OWNER_KEY
    );


    this.syncGameState();
  }


  /**
   * Wczytuje czas z save'a albo wartości domyślne dla nowej gry.
   *
   * `silent: true` stosujemy podczas tworzenia singletona,
   * aby nie emitować eventów zanim UI i managerowie będą gotowi.
   */
  applyState(savedState = null, { silent = false } = {}) {
    const normalizedState = normalizeTimeState(savedState);


    this.currentDay = normalizedState.day;
    this.currentHour = normalizedState.hour;
    this.currentMinute = normalizedState.minute;


    this.updatePartOfDay();
    this.syncGameState();


    if (!silent) {
      const remainingCaseTime = refreshCaseDeadline(
        gameState
      );


      const caseExpired = isCaseTimeExpired(
        gameState
      );


      EventBus.emit('timeChanged', {
        ...this.getState(),
        caseTimeRemaining: remainingCaseTime,
        caseExpired
      });
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


  /**
   * Utrzymuje kompatybilność z dotychczasowym formatem GameData.js.
   */
  syncGameState() {
    gameState.currentDay = this.currentDay;
    gameState.currentHour = this.currentHour;
    gameState.currentMinute = this.currentMinute;
    gameState.currentPartOfDay = this.partOfDay;
  }


  /**
   * Główny punkt przesuwania czasu w grze.
   *
   * EventBus.emit('advanceTime', 2, 30) przesuwa grę o 2 h 30 min.
   */
  handleAdvanceTime(hours = 0, minutes = 0) {
    const safeHours = toNonNegativeInteger(hours);
    const safeMinutes = toNonNegativeInteger(minutes);


    const currentTotalMinutes = (
      this.currentHour * MINUTES_PER_HOUR
    ) + this.currentMinute;


    const addedTotalMinutes = (
      safeHours * MINUTES_PER_HOUR
    ) + safeMinutes;


    const totalMinutes = (
      currentTotalMinutes + addedTotalMinutes
    );


    const additionalDays = Math.floor(
      totalMinutes / MINUTES_PER_DAY
    );


    const minutesWithinDay = (
      totalMinutes % MINUTES_PER_DAY
    );


    this.currentDay += additionalDays;


    this.currentHour = Math.floor(
      minutesWithinDay / MINUTES_PER_HOUR
    );


    this.currentMinute = (
      minutesWithinDay % MINUTES_PER_HOUR
    );


    this.updatePartOfDay();
    this.syncGameState();


    /**
     * CaseTimeHelper nie przesuwa deadline'u.
     * Po zmianie globalnego czasu jedynie przelicza,
     * ile czasu pozostało do istniejącego deadline'u.
     */
    const remainingCaseTime = refreshCaseDeadline(
      gameState
    );


    const caseExpired = isCaseTimeExpired(
      gameState
    );


    const payload = {
      ...this.getState(),
      caseTimeRemaining: remainingCaseTime,
      caseExpired
    };


    EventBus.emit('timeChanged', payload);
    EventBus.emit('saveTimeState', payload);


    return payload;
  }


  /**
   * Ustala porę dnia tylko na podstawie bieżącej godziny.
   */
  updatePartOfDay() {
    if (
      this.currentHour >= 6 &&
      this.currentHour < 12
    ) {
      this.partOfDay = 'Morning';
      return;
    }


    if (
      this.currentHour >= 12 &&
      this.currentHour < 18
    ) {
      this.partOfDay = 'Afternoon';
      return;
    }


    if (
      this.currentHour >= 18 &&
      this.currentHour < 22
    ) {
      this.partOfDay = 'Evening';
      return;
    }


    this.partOfDay = 'Night';
  }


  /**
   * Usuwa listenery i pozwala utworzyć świeżą instancję.
   */
  destroy() {
    EventBus.clearScope(OWNER_KEY);


    if (timeManagerInstance === this) {
      timeManagerInstance = null;
    }
  }
}


/**
 * Zwraca jeden centralny manager czasu dla całej gry.
 *
 * Bez argumentu nowy singleton startuje od zegara zapisanego w gameState,
 * a nie od Day 1, 08:00.
 */
export function getGameTimeManager(savedState = null) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(
      savedState
    );
  }


  return timeManagerInstance;
}


/**
 * Synchronizuje menedżera czasu ze stanem gry.
 *
 * Wołaj BEZ ARGUMENTÓW po każdym wczytaniu zapisu
 * (gameState.importFromSave) i po resetGameState() przy nowej grze.
 * Zegar jest wtedy brany z gameState, a gdy go nie ma (nowa gra)
 * zaczyna od Day 1, 08:00.
 */
export function hydrateGameTimeManager(savedState = null) {
  const source = savedState ?? readTimeFromGameState();


  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(
      source
    );


    return timeManagerInstance;
  }


  timeManagerInstance.applyState(source);


  return timeManagerInstance;
}


/**
 * Resetuje singleton i usuwa event listenery.
 */
export function resetGameTimeManager() {
  timeManagerInstance?.destroy();
  timeManagerInstance = null;
}