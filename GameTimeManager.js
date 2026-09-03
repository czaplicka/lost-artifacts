import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import {
  isCaseTimeExpired,
  refreshCaseDeadline
} from './CaseTimeHelper.js';

const OWNER_KEY = 'GameTimeManager';

let timeManagerInstance = null;

// Bezpieczna konwersja na liczbę skończoną, z fallbackiem.
// Number(0) jest "falsy", więc zwykłe `Number(x) || fallback`
// psuje północ (0:00) i dzień 0 - stąd jawne sprawdzenie Number.isFinite.
function toFiniteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// Save zapisuje czas pod kluczami z prefiksem "current"
// (gameState.currentDay / currentHour / currentMinute / currentPartOfDay),
// bo tak robi syncGameState(). Ta funkcja czyta OBA warianty kluczy
// (z prefiksem i bez), żeby przyjąć zarówno surowy gameState,
// jak i "czysty" payload {day, hour, minute, partOfDay}
// (np. ten emitowany przez zdarzenie 'saveTimeState').
function extractTimeFields(savedState) {
  if (!savedState) {
    return null;
  }

  return {
    day: savedState.currentDay ?? savedState.day,
    hour: savedState.currentHour ?? savedState.hour,
    minute: savedState.currentMinute ?? savedState.minute,
    partOfDay: savedState.currentPartOfDay ?? savedState.partOfDay
  };
}

export class GameTimeManager {
  constructor(savedState = null) {
    this.applyState(savedState, { silent: true });

    EventBus.clearScope(OWNER_KEY);

    EventBus.on(
      'advanceTime',
      this.handleAdvanceTime,
      this,
      OWNER_KEY
    );

    this.syncGameState();
  }

  // Ustawia wewnętrzny stan zegara gry na podstawie zapisanych danych
  // (albo wartości domyślnych dla nowej gry, gdy savedState === null).
  // Wywoływana zarówno w konstruktorze, jak i przy hydratacji
  // już istniejącego singletona po wczytaniu save'a.
  applyState(savedState = null, { silent = false } = {}) {
    const fields = extractTimeFields(savedState);

    this.currentDay = toFiniteNumber(fields?.day, 1);
    this.currentHour = toFiniteNumber(fields?.hour, 8);
    this.currentMinute = toFiniteNumber(fields?.minute, 0);
    this.partOfDay = fields?.partOfDay || 'Morning';

    this.updatePartOfDay();

    if (!silent) {
      this.syncGameState();

      EventBus.emit('timeChanged', this.getState());
    }

    return this.getState();
  }

  // Publiczny, spójny "snapshot" stanu czasu - do zapisu i do
  // podpięcia pod eventy. Klucze BEZ prefiksu "current", zgodnie
  // z tym, co już emitowało 'saveTimeState'.
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

  handleAdvanceTime(hours = 0, minutes = 0) {
    const safeHours = Math.max(
      0,
      Math.floor(Number(hours) || 0)
    );

    const safeMinutes = Math.max(
      0,
      Math.floor(Number(minutes) || 0)
    );

    this.currentMinute += safeMinutes;

    if (this.currentMinute >= 60) {
      this.currentHour += Math.floor(
        this.currentMinute / 60
      );

      this.currentMinute %= 60;
    }

    this.currentHour += safeHours;

    while (this.currentHour >= 24) {
      this.currentHour -= 24;
      this.currentDay += 1;
    }

    this.updatePartOfDay();
    this.syncGameState();

    // Deadline nie jest zmieniany bezpośrednio.
    // Po zmianie czasu gry helper wylicza:
    // missionDeadline - currentGameTime.
    const remainingCaseTime = refreshCaseDeadline(gameState);

    const caseExpired = isCaseTimeExpired(gameState);

    const payload = {
      ...this.getState(),
      caseTimeRemaining: remainingCaseTime,
      caseExpired
    };

    EventBus.emit('timeChanged', payload);
    EventBus.emit('saveTimeState', payload);

    return payload;
  }

  updatePartOfDay() {
    if (this.currentHour >= 6 && this.currentHour < 12) {
      this.partOfDay = 'Morning';
    } else if (
      this.currentHour >= 12 &&
      this.currentHour < 18
    ) {
      this.partOfDay = 'Afternoon';
    } else if (
      this.currentHour >= 18 &&
      this.currentHour < 22
    ) {
      this.partOfDay = 'Evening';
    } else {
      this.partOfDay = 'Night';
    }
  }

  destroy() {
    EventBus.clearScope(OWNER_KEY);

    if (timeManagerInstance === this) {
      timeManagerInstance = null;
    }
  }
}

// Zwraca istniejący singleton albo tworzy nowy.
// UWAGA: jeśli singleton już istnieje, savedState jest IGNOROWANE
// (celowo - żeby zwykłe wywołania getGameTimeManager() w UI
// nie resetowały trwającego zegara gry). Do wczytywania save'a
// w trakcie sesji służy hydrateGameTimeManager() poniżej.
export function getGameTimeManager(savedState = null) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(savedState);
  }

  return timeManagerInstance;
}

// Wymuszone "wstrzyknięcie" wczytanego stanu do menedżera czasu.
// Wołać JAWNIE zaraz po SaveManager.load() (analogicznie do
// restoreEnergyManager w SaveManager.js), niezależnie od tego,
// czy singleton już istniał, czy trzeba go dopiero utworzyć.
export function hydrateGameTimeManager(savedState) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(savedState);
    return timeManagerInstance;
  }

  timeManagerInstance.applyState(savedState);
  return timeManagerInstance;
}

export function resetGameTimeManager() {
  timeManagerInstance?.destroy();
  timeManagerInstance = null;
}