import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';
import {
  isCaseTimeExpired,
  refreshCaseDeadline
} from './CaseTimeHelper.js';

const OWNER_KEY = 'GameTimeManager';

let timeManagerInstance = null;

export class GameTimeManager {
  constructor(savedState = null) {
    this.currentDay = Number(savedState?.day) || 1;
    this.currentHour = Number(savedState?.hour) || 8;
    this.currentMinute = Number(savedState?.minute) || 0;
    this.partOfDay = savedState?.partOfDay || 'Morning';
    this.updatePartOfDay();

    EventBus.clearScope(OWNER_KEY);

    EventBus.on(
      'advanceTime',
      this.handleAdvanceTime,
      this,
      OWNER_KEY
    );

    this.syncGameState();
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

    const spentCaseSeconds = safeHours * 60 * 60 + safeMinutes * 60;

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
    const remainingCaseTime = refreshCaseDeadline(gameState);
const caseExpired = isCaseTimeExpired(gameState);

    // Jeden centralny punkt: każde advanceTime obniża deadline sprawy.
    // Jeśli timer sprawy nie jest aktywny, helper niczego nie zmienia.
    const remainingCaseTime = spendCaseTime(spentCaseSeconds);

const payload = {
  day: this.currentDay,
  hour: this.currentHour,
  minute: this.currentMinute,
  partOfDay: this.partOfDay,
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

export function getGameTimeManager(savedState = null) {
  if (!timeManagerInstance) {
    timeManagerInstance = new GameTimeManager(
      savedState
    );
  }

  return timeManagerInstance;
}

export function resetGameTimeManager() {
  timeManagerInstance?.destroy();
  timeManagerInstance = null;
}