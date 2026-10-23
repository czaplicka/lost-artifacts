import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { getTimeChangedPayload } from '../CaseTimeHelper.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getEnergyManager } from './EnergyManager.js';

const OWNER_KEY = 'GameTimeManager';
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;
const DEFAULT_TIME_STATE = Object.freeze({ day: 1, hour: 8, minute: 0, partOfDay: 'Morning' });
let timeManagerInstance = null;
function toFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function toNonNegativeInteger(value, fallback = 0) {
    return Math.max(0, Math.floor(toFiniteNumber(value, fallback)));
}
function extractTimeFields(saved) {
    if (!saved) return null;
    return { day: saved.currentDay ?? saved.day, hour: saved.currentHour ?? saved.hour,
        minute: saved.currentMinute ?? saved.minute,
        partOfDay: saved.currentPartOfDay ?? saved.partOfDay };
}
function readTimeFromGameState() {
    if (!Number.isFinite(gameState.currentDay)) return null;
    return { currentDay: gameState.currentDay, currentHour: gameState.currentHour,
        currentMinute: gameState.currentMinute, currentPartOfDay: gameState.currentPartOfDay };
}
function normalizeTimeState(saved = null) {
    const f = extractTimeFields(saved);
    const day = toNonNegativeInteger(f?.day, DEFAULT_TIME_STATE.day);
    const hour = toNonNegativeInteger(f?.hour, DEFAULT_TIME_STATE.hour);
    const minute = toNonNegativeInteger(f?.minute, DEFAULT_TIME_STATE.minute);
    const total = hour * MINUTES_PER_HOUR + minute;
    return { day: Math.max(1, day) + Math.floor(total / MINUTES_PER_DAY),
        hour: Math.floor(total % MINUTES_PER_DAY / MINUTES_PER_HOUR), minute: total % MINUTES_PER_HOUR };
}
export class GameTimeManager {
    constructor(savedState = null) {
        this.handleAdvanceTime = this.handleAdvanceTime.bind(this);
        this.applyState(savedState ?? readTimeFromGameState(), { silent: true });
        EventBus.clearScope(OWNER_KEY);
        EventBus.on('advanceTime', this.handleAdvanceTime, this, OWNER_KEY);
    }
    applyState(savedState = null, { silent = false } = {}) {
        const time = normalizeTimeState(savedState);
        this.currentDay = time.day;
        this.currentHour = time.hour;
        this.currentMinute = time.minute;
        this.updatePartOfDay();
        this.syncGameState();
        if (!silent) this.publishTimeChanged();
        return this.getState();
    }
    getState() {
        return { day: this.currentDay, hour: this.currentHour, minute: this.currentMinute, partOfDay: this.partOfDay };
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
        // Nie wracamy do starego zegara managera po wczytaniu ręcznego zapisu.
        const saved = readTimeFromGameState();
        if (saved && (saved.currentDay !== this.currentDay || saved.currentHour !== this.currentHour ||
            saved.currentMinute !== this.currentMinute)) this.applyState(saved, { silent: true });
        const fromDay = this.currentDay;
        const h = Math.max(0, toFiniteNumber(hours, 0));
        const m = Math.max(0, toFiniteNumber(minutes, 0));
        const addedTotalMinutes = Math.floor(h * MINUTES_PER_HOUR + m);
        const total = this.currentHour * MINUTES_PER_HOUR + this.currentMinute + addedTotalMinutes;
        this.currentDay += Math.floor(total / MINUTES_PER_DAY);
        this.currentHour = Math.floor(total % MINUTES_PER_DAY / MINUTES_PER_HOUR);
        this.currentMinute = total % MINUTES_PER_HOUR;
        this.updatePartOfDay();
        this.syncGameState();
        if (addedTotalMinutes > 0) {
            getEnergyManager().advanceModifierTime(addedTotalMinutes / MINUTES_PER_HOUR);
            if (gameState.isGameActive) requestAutosave();
        }
        // Zachowujemy nowe zabezpieczenia CaseTimeWatcher: najpierw przegrana, potem losowanie.
        const payload = this.publishTimeChanged();
        if (addedTotalMinutes > 0) EventBus.emit('gameTime:advanced', {
            fromDay, toDay: this.currentDay, addedMinutes: addedTotalMinutes
        });
        return payload;
    }
    updatePartOfDay() {
        if (this.currentHour >= 6 && this.currentHour < 12) this.partOfDay = 'Morning';
        else if (this.currentHour >= 12 && this.currentHour < 18) this.partOfDay = 'Afternoon';
        else if (this.currentHour >= 18 && this.currentHour < 22) this.partOfDay = 'Evening';
        else this.partOfDay = 'Night';
    }
    destroy() {
        EventBus.clearScope(OWNER_KEY);
        if (timeManagerInstance === this) timeManagerInstance = null;
    }
}
export function getGameTimeManager(savedState = null) {
    if (!timeManagerInstance) timeManagerInstance = new GameTimeManager(savedState);
    return timeManagerInstance;
}
export function hydrateGameTimeManager(savedState = null) {
    const source = savedState ?? readTimeFromGameState();
    if (!timeManagerInstance) timeManagerInstance = new GameTimeManager(source);
    else timeManagerInstance.applyState(source);
    return timeManagerInstance;
}
export function resetGameTimeManager() { timeManagerInstance?.destroy(); timeManagerInstance = null; }
