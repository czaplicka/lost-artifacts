import { gameState } from '../../GameData.js';
import { LOCATION_HOURS, MINUTES_PER_DAY } from './CityConfig.js';

export class CityClock {
  getCityClock() {
    const rawHour = Number(
      gameState.currentHour ?? gameState.hour ?? 8
    );

    const rawMinute = Number(
      gameState.currentMinute ?? gameState.minute ?? 0
    );

    const hour = Number.isFinite(rawHour)
      ? Math.max(0, Math.floor(rawHour))
      : 8;

    const minute = Number.isFinite(rawMinute)
      ? Math.max(0, Math.floor(rawMinute))
      : 0;

    const total = (hour * 60 + minute) % MINUTES_PER_DAY;

    return {
      hour: Math.floor(total / 60),
      minute: total % 60,
      totalMinutes: total
    };
  }

  getPartOfDayForHour(hour) {
    if (hour >= 6 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 18) return 'Afternoon';
    if (hour >= 18 && hour < 22) return 'Evening';
    return 'Night';
  }

  isLocationOpen(locationId, clock = this.getCityClock()) {
    const allowed = LOCATION_HOURS[locationId];

    return !allowed || allowed.includes(
      this.getPartOfDayForHour(clock.hour)
    );
  }

  getMinutesUntilOpening(locationId) {
    const clock = this.getCityClock();

    if (this.isLocationOpen(locationId, clock)) return 0;

    for (let minutes = 1; minutes <= MINUTES_PER_DAY; minutes++) {
      const total =
        (clock.totalMinutes + minutes) % MINUTES_PER_DAY;

      if (this.isLocationOpen(locationId, {
        hour: Math.floor(total / 60),
        minute: total % 60
      })) {
        return minutes;
      }
    }

    return null;
  }

  formatCityClock(clock) {
    return (
      `${String(clock.hour).padStart(2, '0')}:` +
      `${String(clock.minute).padStart(2, '0')}`
    );
  }

  formatWaitDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (hours && remaining) return `${hours}h ${remaining}m`;
    if (hours) return `${hours}h`;

    return `${remaining}m`;
  }
}
