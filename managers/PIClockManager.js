import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { PI_CLOCK_START_MINUTES, PI_LOCATION_HOURS, PI_NPC_HOURS } from '../config/piTimeConfig.js';

const DAY = 1440;
const MAX = Number.MAX_SAFE_INTEGER - DAY;
export function getPIClock() {
  const saved = gameState.piClock;
  const totalMinutes = Number.isSafeInteger(saved?.totalMinutes) && saved.totalMinutes >= 0 && saved.totalMinutes <= MAX
    ? saved.totalMinutes : PI_CLOCK_START_MINUTES;
  if (saved?.version !== 1 || saved.totalMinutes !== totalMinutes) {
    gameState.piClock = { version: 1, totalMinutes };
  }
  return describePITime(totalMinutes);
}
export function describePITime(totalMinutes) {
  const minuteOfDay = totalMinutes % DAY;
  const hour = Math.floor(minuteOfDay / 60), minute = minuteOfDay % 60;
  return { totalMinutes, day: Math.floor(totalMinutes / DAY) + 1, minuteOfDay, hour, minute,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    period: hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : hour < 22 ? 'Evening' : 'Night' };
}
export function formatPIClock() {
  const now = getPIClock();
  return `PI / DAY ${now.day} / ${now.time} / ${now.period}`;
}
export function advancePITime(minutes, reason = 'activity', { autosave = true } = {}) {
  if (!Number.isSafeInteger(minutes) || minutes < 0) throw new RangeError('PI time requires non-negative integer minutes.');
  const before = getPIClock();
  if (before.totalMinutes + minutes > MAX) throw new RangeError('PI time overflow.');
  if (!minutes) return before;
  gameState.piClock = { version: 1, totalMinutes: before.totalMinutes + minutes };
  const after = getPIClock();
  EventBus.emit('pi:timeChanged', { before, after, minutes, reason });
  if (autosave && gameState.isGameActive) requestAutosave();
  return after;
}
export function isInPIWindows(windows, total = getPIClock().totalMinutes) {
  const m = total % DAY;
  return windows.some(([start, end]) => start === 0 && end === DAY
    || start < end && m >= start && m < end
    || start > end && (m >= start || m < end));
}
export function getPIAvailability(windows, total = getPIClock().totalMinutes) {
  if (isInPIWindows(windows, total)) return { available: true, waitMinutes: 0, next: describePITime(total) };
  for (let wait = 1; wait <= DAY; wait++) {
    if (isInPIWindows(windows, total + wait)) return { available: false, waitMinutes: wait, next: describePITime(total + wait) };
  }
  return { available: false, waitMinutes: null, next: null };
}
export function getPILocationStatus(id, total = getPIClock().totalMinutes) {
  return getPIAvailability(PI_LOCATION_HOURS[id] ?? [[0, DAY]], total);
}
export function getPINpcStatus(id, total = getPIClock().totalMinutes) {
  const schedule = PI_NPC_HOURS[id];
  if (!schedule) return getPIAvailability([[0, DAY]], total);
  const venue = PI_LOCATION_HOURS[schedule.location] ?? [[0, DAY]];
  const availableAt = t => isInPIWindows(schedule.windows, t) && isInPIWindows(venue, t);
  if (availableAt(total)) return { available: true, waitMinutes: 0, next: describePITime(total) };
  for (let wait = 1; wait <= DAY; wait++) {
    if (availableAt(total + wait)) return { available: false, waitMinutes: wait, next: describePITime(total + wait) };
  }
  return { available: false, waitMinutes: null, next: null };
}
export function describePIWait(status) {
  if (!status.next) return 'No scheduled opening.';
  const now = getPIClock();
  return `${status.next.day > now.day ? `Day ${status.next.day}, ` : ''}${status.next.time}`;
}
