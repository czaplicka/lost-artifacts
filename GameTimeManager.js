import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import {
  isCaseTimeExpired,
  refreshCaseDeadline
} from './CaseTimeHelper.js';

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
 * Służy zarówno do normalizacji wartości z save'a,
 * jak i kosztów czasu przekazywanych przez EventBus.
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
 * Normalizuje czas z save'a:
 * - day zaczyna się od 1,
 * - hour mieści się między 0 a 23,
 * - minute mieści się między 0 a 59,
 * - nadmiar minut i godzin przechodzi na kolejne dni.
 *
 * Przykład:
 * { day: 2, hour: 25, minute: 75 }
 * stanie się:
 * { day: 3, hour: 2, minute: 15 }
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
    /**
     * Gdy metoda klasy jest przekazywana jako callback do EventBusa,
     * JavaScript może zgubić kontekst `this`.
     * Bind gwarantuje, że zawsze wskazuje on na tę instancję managera.
     */
    this.handleAdvanceTime =
      this.handleAdvanceTime.bind(this);

    this.applyState(savedState, {
      silent: true
    });

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

  /**
   * Zwraca obecny czas w formacie przeznaczonym dla:
   * - save managera,
   * - eventów,
   * - HUD-u,
   * - systemów scen i minigier.
   */
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
   * Wywołanie:
   * EventBus.emit('advanceTime', 2, 30);
   *
   * Przesuwa grę o 2 godziny i 30 minut.
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

    /**
     * HUD, mapy, sceny i system energii mogą odświeżyć swój stan.
     */
    EventBus.emit('timeChanged', payload);

    /**
     * SaveManager może przechwycić ten event i zapisać aktualny czas.
     * Nie emitujemy go przy samym loadzie, aby load nie uruchamiał
     * natychmiast kolejnego zapisu.
     */
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
   * Usuwa listenery i pozwala utworzyć świeżą instancję,
   * np. po wylogowaniu, rozpoczęciu nowej gry albo powrocie do menu.
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
 * `savedState` jest brany pod uwagę tylko przy pierwszym utworzeniu
 * singletona. Nie resetuje zegara przy zwykłym odczycie przez HUD.
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
 * Wczytuje stan czasu podczas ładowania save'a.
 *
 * Wołaj po SaveManager.load(), podobnie jak przy odtwarzaniu energii:
 *
 * hydrateGameTimeManager(saveData.timeState);
 */
export function hydrateGameTimeManager(savedState) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(
      savedState
    );

    return timeManagerInstance;
  }

  timeManagerInstance.applyState(savedState);

  return timeManagerInstance;
}

/**
 * Resetuje singleton i usuwa event listenery.
 * Użyj przed nową grą, przy powrocie do menu głównego
 * albo po wylogowaniu gracza.
 */
export function resetGameTimeManager() {
  timeManagerInstance?.destroy();
  timeManagerInstance = null;
}