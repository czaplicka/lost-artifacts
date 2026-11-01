import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { resourcefulnessManager } from './ResourcefulnessManager.js';
import { HQExhaustionCallUI } from '../ui/HQExhaustionCallUI.js';
import { DEFAULT_DIFFICULTY, getDifficultyConfig, isValidDifficulty } from '../DifficultySettings.js';

const FORCED_SLEEP_HOURS = 6;
const FORCED_SLEEP_ANIMATION_MS = 2000;
const FORCED_SLEEP_PERCENT = 1;
const ENERGY_COSTS = {
    interaction: { interview_short: 3, interview_medium: 4, interview_long: 5 },
    activity: { crime_scene: 8, hidden_objects: 10, minigame_forensic: 8,
        minigame_mastermind: 6, csi_lab: 12, apartment_visit: 6 }
};
const ENERGY_RECOVERY = {
    sleep_short: 40, sleep_medium: 60, sleep_full: 100,
    food_cheap: 10, food_normal: 15, food_expensive: 20,
    drink_cheap: 5, drink_normal: 8, drink_expensive: 10
};
function cloneData(data) {
    if (data == null) return data;
    if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(data);
    return JSON.parse(JSON.stringify(data));
}
function nonNegativeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : fallback;
}
function incidentCount(value) { return Math.floor(nonNegativeNumber(value)); }

class EnergyManager {
    constructor() {
        this.currentEnergy = 100;
        this.maxEnergy = 100;
        this.difficulty = DEFAULT_DIFFICULTY;
        this.energyLog = [];
        this.lastEnergyChange = null;
        this.energyModifiers = [];
        this.isSleepingForced = false;
        this.isSleepingManual = false;
        this.forcedSleepTimer = null;
        this.forcedSleepRemainingMs = 0;
        this.forcedSleepTimerStartedAt = 0;
        this.forcedSleepSession = null;
        this.forcedSleepOverlay = null;
        this.restoreSleepTimer = null;
        this.hqExhaustionIncidents = 0;
        this.hqExhaustionCallPending = false;
        this.hqExhaustionWarningSeen = false;
        this.hqCallUI = new HQExhaustionCallUI();
        this._onVisibilityChange = this._onVisibilityChange.bind(this);
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._onVisibilityChange);
    }
    destroy() {
        if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._onVisibilityChange);
        clearTimeout(this.restoreSleepTimer);
        this.restoreSleepTimer = null;
        this._clearForcedSleepTimer();
        this._removeForcedSleepOverlay();
        this.hqCallUI.destroy();
    }
    init(difficulty = DEFAULT_DIFFICULTY) {
        if (!isValidDifficulty(difficulty)) difficulty = DEFAULT_DIFFICULTY;
        clearTimeout(this.restoreSleepTimer);
        this.restoreSleepTimer = null;
        this._clearForcedSleepTimer();
        this._removeForcedSleepOverlay();
        this.hqCallUI.destroy();
        this.difficulty = difficulty;
        this.currentEnergy = this.maxEnergy;
        this.energyLog = [];
        this.lastEnergyChange = null;
        this.energyModifiers = [];
        this.isSleepingForced = false;
        this.isSleepingManual = false;
        this.forcedSleepSession = null;
        this.hqExhaustionIncidents = 0;
        this.hqExhaustionCallPending = false;
        this.hqExhaustionWarningSeen = false;
        this._syncToGameState();
        EventBus.emit('energyInitialized', {
            energy: this.currentEnergy, difficulty: this.difficulty, status: this.getEnergyStatus()
        });
    }
    getDifficultyMultiplier() { return getDifficultyConfig(this.difficulty).energyCostMultiplier; }
    getTemporaryEnergyMultiplier() {
        return this.energyModifiers.reduce((value, modifier) => value * modifier.multiplier, 1);
    }
    getEffectiveEnergyMultiplier() { return this.getDifficultyMultiplier() * this.getTemporaryEnergyMultiplier(); }
    scaleCost(cost) { return Math.ceil(nonNegativeNumber(cost) * this.getEffectiveEnergyMultiplier()); }
    addEnergyModifier({ id, label = 'Temporary energy effect', multiplier, durationHours, group = null } = {}) {
        const safeId = typeof id === 'string' ? id.trim() : '';
        const safeMultiplier = Number(multiplier), safeDuration = Number(durationHours);
        if (!safeId || !Number.isFinite(safeMultiplier) || safeMultiplier <= 0 ||
            !Number.isFinite(safeDuration) || safeDuration <= 0) {
            return { success: false, reason: 'invalid_energy_modifier' };
        }
        const safeGroup = typeof group === 'string' && group.trim() ? group.trim() : null;
        this.energyModifiers = this.energyModifiers.filter(m => m.id !== safeId && (!safeGroup || m.group !== safeGroup));
        const modifier = { id: safeId, label: String(label), multiplier: safeMultiplier,
            remainingHours: safeDuration, group: safeGroup };
        this.energyModifiers.push(modifier);
        this._notifyModifiersChanged();
        return { success: true, modifier: cloneData(modifier) };
    }
    removeEnergyModifier(id) {
        const before = this.energyModifiers.length;
        this.energyModifiers = this.energyModifiers.filter(m => m.id !== id);
        const removed = before !== this.energyModifiers.length;
        if (removed) this._notifyModifiersChanged();
        return removed;
    }
    getEnergyModifiers() { return cloneData(this.energyModifiers); }
    advanceModifierTime(hours) {
        const elapsed = Number(hours);
        if (!Number.isFinite(elapsed) || elapsed <= 0 || !this.energyModifiers.length) return [];
        const expired = [], active = [];
        for (const modifier of this.energyModifiers) {
            const remainingHours = Math.max(0, modifier.remainingHours - elapsed);
            if (remainingHours <= 0) expired.push(modifier.id);
            else active.push({ ...modifier, remainingHours });
        }
        this.energyModifiers = active;
        this._notifyModifiersChanged();
        for (const id of expired) EventBus.emit('energyModifierExpired', { id });
        return expired;
    }
    applyIllness() {
        const s = getDifficultyConfig(this.difficulty).randomEvents.illness;
        return this.addEnergyModifier({ id: 'illness', label: 'Working while sick',
            multiplier: s.workEnergyMultiplier, durationHours: s.workDurationHours, group: 'illness' });
    }
    applyIllnessRecovery() {
        const s = getDifficultyConfig(this.difficulty).randomEvents.illness;
        return this.addEnergyModifier({ id: 'illness_recovery', label: 'Recovered and rested',
            multiplier: s.recoveryEnergyMultiplier, durationHours: s.recoveryDurationHours, group: 'illness' });
    }
    _notifyModifiersChanged() {
        this._syncToGameState();
        this._emitEnergyChanged();
        EventBus.emit('energyModifiersChanged', {
            modifiers: this.getEnergyModifiers(), multiplier: this.getTemporaryEnergyMultiplier()
        });
    }
    getTravelCost(type = 'plane') {
        const hours = { plane: 3, train: 6, bus: 8, ship: 12, taxi: .5, cheap_flight: 4, expensive_flight: 2 }[type] || 3;
        return this.scaleCost(Math.max(2, Math.round(hours * .8)));
    }
    consumeTravel(type = 'plane') {
        const cost = this.getTravelCost(type);
        return this._consumeEnergy(cost, `Travel (${type}): -${cost}`);
    }
    getActivityCostDetails(type = 'minigame_forensic') {
        const baseCost = ENERGY_COSTS.activity[type] || ENERGY_COSTS.activity.minigame_forensic;
        const scaledCost = this.scaleCost(baseCost);
        return { ...resourcefulnessManager.getSearchEnergyQuote(type, scaledCost), baseCost, scaledCost };
    }
    getActivityCost(type = 'minigame_forensic') { return this.getActivityCostDetails(type).finalCost; }
    getActivityCostDescription(type = 'minigame_forensic') {
        return resourcefulnessManager.formatSearchEnergyQuote(this.getActivityCostDetails(type));
    }
    getInterviewCost(duration = 'medium') {
        return this.scaleCost(ENERGY_COSTS.interaction[`interview_${duration}`] || ENERGY_COSTS.interaction.interview_medium);
    }
    isCriticalEnergy() { return this.currentEnergy / this.maxEnergy * 100 <= FORCED_SLEEP_PERCENT; }
    _blockReason() {
        if (this.isSleepingForced) return 'forced_sleep_active';
        if (this.isSleepingManual) return 'manual_sleep_active';
        if (this.hqExhaustionCallPending || this.hqCallUI.isOpen) return 'hq_call_active';
        return null;
    }
    canAfford(cost) {
        const required = Math.round(nonNegativeNumber(cost));
        const reason = this._blockReason() || (this.currentEnergy < required ? 'insufficient_energy' : null);
        return { ok: !reason, currentEnergy: this.currentEnergy, requiredEnergy: required,
            missingEnergy: Math.max(0, required - this.currentEnergy), reason };
    }
    canPerformActivity(type = 'minigame_forensic') {
        const costDetails = this.getActivityCostDetails(type), cost = costDetails.finalCost;
        return { ...this.canAfford(cost), activityType: type, cost, costDetails };
    }
    canPerformInterview(duration = 'medium') {
        const cost = this.getInterviewCost(duration);
        return { ...this.canAfford(cost), duration, cost };
    }
    getInsufficientEnergyMessage(requiredEnergy) {
        if (this.isSleepingForced || this.isSleepingManual) return 'You are currently asleep. Even brilliant deductions can wait.';
        if (this.hqExhaustionCallPending) return 'HQ is calling. Answer the phone first.';
        const required = Math.round(nonNegativeNumber(requiredEnergy));
        if (required <= this.currentEnergy) return 'You have enough energy for this activity.';
        return `You need ${required} energy for this activity. You have ${this.currentEnergy}. Rest, eat, or drink first.`;
    }
    getEnergyStatus() { return this.currentEnergy >= 61 ? 'Fresh' : this.currentEnergy >= 31 ? 'Tired' : 'Exhausted'; }
    getEnergyColor() { return this.currentEnergy >= 61 ? 0x4CAF50 : this.currentEnergy >= 31 ? 0xFF9800 : 0xF44336; }
    getEnergyTooltip() {
        if (this.currentEnergy >= 80) return 'Functioning adult.';
        if (this.currentEnergy >= 50) return 'Running on coffee and denial.';
        if (this.currentEnergy >= 20) return 'Questionable detective choices ahead.';
        return 'Legally too tired to solve crimes.';
    }
    _failedConsumption(cost, type, extra = {}) {
        const affordability = this.canAfford(cost);
        if (affordability.ok) return null;
        if (this.isCriticalEnergy() && !this._blockReason()) this._triggerForcedSleep();
        return { success: false, reason: affordability.reason, activityType: type,
            amount: cost, cost, currentEnergy: this.currentEnergy, requiredEnergy: cost,
            missingEnergy: affordability.missingEnergy, message: this.getInsufficientEnergyMessage(cost), ...extra };
    }
    consumeInterview(duration = 'medium') {
        const cost = this.getInterviewCost(duration), activityType = `interview_${duration}`;
        return this._failedConsumption(cost, activityType, { duration }) ||
            this._consumeEnergy(cost, `Interview: -${cost}`, { requireFullAmount: true, activityType });
    }
    consumeActivity(type = 'minigame_forensic') {
        const costDetails = this.getActivityCostDetails(type), cost = costDetails.finalCost;
        const failed = this._failedConsumption(cost, type, { costDetails });
        if (failed) return failed;
        const saving = costDetails.applied ? ` (Resourcefulness: saved ${costDetails.saved})` : '';
        return { ...this._consumeEnergy(cost, `Activity (${type}): -${cost}${saving}`, {
            requireFullAmount: true, activityType: type }), cost, costDetails };
    }
    consumeCustom(cost, label = 'Energy changed.', options = {}) {
        return this._consumeEnergy(Math.round(nonNegativeNumber(cost)), label, {
            requireFullAmount: Boolean(options.requireFullAmount), activityType: options.activityType || 'custom' });
    }
    startManualSleep(sleepHours = 8) {
        const hours = Number(sleepHours);
        if (!Number.isFinite(hours) || hours <= 0) return { success: false, reason: 'invalid_sleep_duration' };
        if (this._blockReason()) return { success: false, reason: this._blockReason() };
        this.isSleepingManual = true;
        EventBus.emit('manualSleepStarted', { sleepHours: hours });
        return { success: true, sleepHours: hours };
    }
    completeManualSleep(sleepHours = 8) {
        const hours = Number(sleepHours);
        if (!Number.isFinite(hours) || hours <= 0) {
            this.isSleepingManual = false;
            return { success: false, reason: 'invalid_sleep_duration' };
        }
        let amount = ENERGY_RECOVERY.sleep_full, type = 'full';
        if (hours <= 2) { amount = ENERGY_RECOVERY.sleep_short; type = 'short'; }
        else if (hours <= 4) { amount = ENERGY_RECOVERY.sleep_medium; type = 'medium'; }
        amount = Math.ceil(amount * getDifficultyConfig(this.difficulty).sleepRecoveryMultiplier);
        EventBus.emit('advanceTime', hours, 0);
        const result = this._recoverEnergy(amount, `Sleep (${hours}h): +${amount}`, 'sleep', type);
        this.isSleepingManual = false;
        EventBus.emit('manualSleepFinished', { sleepHours: hours, recovered: result.amount, energy: this.currentEnergy });
        return result;
    }
    sleep(hours = 8) {
        const started = this.startManualSleep(hours);
        return started.success ? this.completeManualSleep(hours) : started;
    }
    cancelManualSleep() { this.isSleepingManual = false; }
    eat(quality = 'normal') {
        const amount = ENERGY_RECOVERY[`food_${quality}`] || ENERGY_RECOVERY.food_normal;
        return this._recoverEnergy(amount, `Food (${quality}): +${amount}`, 'food', quality);
    }
    drink(quality = 'normal') {
        const amount = ENERGY_RECOVERY[`drink_${quality}`] || ENERGY_RECOVERY.drink_normal;
        return this._recoverEnergy(amount, `Drink (${quality}): +${amount}`, 'drink', quality);
    }
    recoverCustom(amount, label = 'Energy restored.', options = {}) {
        const value = Math.round(nonNegativeNumber(amount));
        if (value <= 0) return { success: false, reason: 'invalid_amount' };
        if (this._blockReason()) return { success: false, reason: this._blockReason(), message: this.getInsufficientEnergyMessage(0) };
        if (this.currentEnergy >= this.maxEnergy) return { success: false, reason: 'energy_full' };
        return this._recoverEnergy(value, label, options.recoveryType || 'custom', options.recoverySubtype || '');
    }
    _consumeEnergy(amount, label, options = {}) {
        const cost = Math.round(nonNegativeNumber(amount));
        if (cost <= 0) return { success: false, reason: 'invalid_amount' };
        if (this._blockReason()) return { success: false, reason: this._blockReason(), amount: cost,
            currentEnergy: this.currentEnergy, message: this.getInsufficientEnergyMessage(cost) };
        if (options.requireFullAmount && this.currentEnergy < cost) return this._failedConsumption(cost, options.activityType || 'custom');
        const before = this.currentEnergy;
        this.currentEnergy = Math.max(0, before - cost);
        this.lastEnergyChange = { type: 'consume', amount: -cost, label, activityType: options.activityType || null,
            beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
        const forcedSleepTriggered = this.isCriticalEnergy();
        if (forcedSleepTriggered) this.isSleepingForced = true;
        this._recordAndEmit();
        if (forcedSleepTriggered) this._beginForcedSleep();
        else if (before > 20 && this.currentEnergy <= 20) EventBus.emit('energyWarning', {
            energy: this.currentEnergy, status: this.getEnergyStatus() });
        return { success: true, amount: cost, label, activityType: options.activityType || null,
            energyReachedZero: this.currentEnergy === 0, forcedSleepTriggered,
            status: forcedSleepTriggered ? 'Sleeping at Agency Motel' : this.getEnergyStatus() };
    }
    _recoverEnergy(amount, label, recoveryType = 'unknown', recoverySubtype = '') {
        const value = nonNegativeNumber(amount);
        if (value <= 0) return { success: false, reason: 'invalid_amount' };
        if (this.isSleepingForced) return { success: false, reason: 'forced_sleep_active' };
        const before = this.currentEnergy;
        this.currentEnergy = Math.min(this.maxEnergy, before + value);
        const recovered = this.currentEnergy - before;
        this.lastEnergyChange = { type: 'recover', amount: recovered, label, recoveryType, recoverySubtype,
            beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
        this._recordAndEmit();
        return { success: true, amount: recovered, label, status: this.getEnergyStatus() };
    }
    _triggerForcedSleep() {
        if (this._blockReason()) return;
        this.isSleepingForced = true;
        this._beginForcedSleep();
    }
    _beginForcedSleep() {
        if (this.forcedSleepSession) return;
        this.hqExhaustionIncidents += 1;
        this.forcedSleepSession = { hotelId: 'agency', hotelLabel: 'Agency Motel',
            cityId: gameState.currentCityId || gameState.crimeCityId || null,
            sleepHours: FORCED_SLEEP_HOURS, cost: 0, timeCharged: false };
        this._showForcedSleepOverlay();
        const first = gameState.hollyFirstSleepSeen !== true;
        if (first) {
            gameState.hollyFirstSleepSeen = true;
            EventBus.emit('firstForcedSleepStory', { sceneKey: 'HollyIntroScene',
                sleepHours: FORCED_SLEEP_HOURS, energy: this.currentEnergy });
        }
        EventBus.emit('energyZero', { energy: this.currentEnergy, status: 'Exhausted',
            sleepHours: FORCED_SLEEP_HOURS, hotelId: 'agency', hotelLabel: 'Agency Motel', cost: 0,
            message: 'Emergency check-in at Agency Motel. Six hours of sleep. No charge.', firstSleepStory: first });
        this.forcedSleepSession.timeCharged = true;
        this._syncToGameState();
        EventBus.emit('advanceTime', FORCED_SLEEP_HOURS, 0);
        this._startForcedSleepTimer(FORCED_SLEEP_ANIMATION_MS);
    }
    _showForcedSleepOverlay() {
        this._removeForcedSleepOverlay();
        if (typeof document === 'undefined' || !document.body) return;
        const root = document.createElement('div');
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');
        Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '2147483647',
            background: 'rgba(9,7,6,.97)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', boxSizing: 'border-box', color: '#f1e6b8', pointerEvents: 'auto' });
        const card = document.createElement('div');
        Object.assign(card.style, { maxWidth: '620px', width: '100%', textAlign: 'center',
            border: '3px solid #d4af37', padding: '32px 22px', background: '#17110e', boxSizing: 'border-box' });
        const title = document.createElement('div');
        title.textContent = 'AGENCY MOTEL';
        Object.assign(title.style, { fontFamily: 'PressStart2P, monospace', fontSize: 'clamp(14px,3vw,22px)',
            lineHeight: '1.8', color: '#f6dc8c', marginBottom: '20px' });
        const body = document.createElement('div');
        body.textContent = 'Your body has closed the case for the evening. The mattress denies all allegations.';
        Object.assign(body.style, { fontFamily: 'SpecialElite, serif', fontSize: '22px', lineHeight: '1.5' });
        const details = document.createElement('div');
        details.textContent = '6 HOURS OF SLEEP | $0 | NO DEBT';
        Object.assign(details.style, { fontFamily: 'SpecialElite, serif', fontSize: '19px', color: '#b5ed9d', marginTop: '24px' });
        card.append(title, body, details); root.append(card); document.body.append(root);
        this.forcedSleepOverlay = root;
    }
    _removeForcedSleepOverlay() { this.forcedSleepOverlay?.remove(); this.forcedSleepOverlay = null; }
    _startForcedSleepTimer(ms) {
        this._clearForcedSleepTimer();
        this.forcedSleepRemainingMs = Math.max(0, ms);
        if (typeof document !== 'undefined' && document.hidden) return;
        this._scheduleForcedSleepTimer();
    }
    _scheduleForcedSleepTimer() {
        if (this.forcedSleepTimer) clearTimeout(this.forcedSleepTimer);
        this.forcedSleepTimerStartedAt = Date.now();
        this.forcedSleepTimer = setTimeout(() => {
            this.forcedSleepTimer = null; this.forcedSleepRemainingMs = 0; this._finishForcedSleep();
        }, this.forcedSleepRemainingMs);
    }
    _clearForcedSleepTimer() {
        if (this.forcedSleepTimer) clearTimeout(this.forcedSleepTimer);
        this.forcedSleepTimer = null; this.forcedSleepRemainingMs = 0; this.forcedSleepTimerStartedAt = 0;
    }
    _onVisibilityChange() {
        if (!this.isSleepingForced || typeof document === 'undefined') return;
        if (document.hidden) {
            if (!this.forcedSleepTimer) return;
            this.forcedSleepRemainingMs = Math.max(0, this.forcedSleepRemainingMs - (Date.now() - this.forcedSleepTimerStartedAt));
            clearTimeout(this.forcedSleepTimer); this.forcedSleepTimer = null;
        } else if (!this.forcedSleepTimer && this.forcedSleepSession) this._scheduleForcedSleepTimer();
    }
    _finishForcedSleep() {
        if (!this.isSleepingForced || !this.forcedSleepSession) return;
        this._clearForcedSleepTimer();
        const before = this.currentEnergy, stay = { ...this.forcedSleepSession, completed: true };
        this.currentEnergy = this.maxEnergy;
        this.lastEnergyChange = { type: 'recover', amount: this.maxEnergy - before,
            label: `Agency Motel (${FORCED_SLEEP_HOURS}h, free): +${this.maxEnergy - before}`,
            recoveryType: 'forced_sleep', recoverySubtype: 'agency_motel',
            beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
        this.forcedSleepSession = null;
        this.isSleepingForced = false;
        this.hqExhaustionCallPending = true;
        this._removeForcedSleepOverlay();
        this._recordAndEmit();
        EventBus.emit('energyRecovered', { energy: this.currentEnergy, sleepHours: FORCED_SLEEP_HOURS,
            reason: 'forced_sleep', hotelId: 'agency', hotelLabel: 'Agency Motel', cost: 0, stay });
        this._openHQCall();
        this._requestAutosave();
    }
    _openHQCall() {
        if (!this.hqExhaustionCallPending || this.isSleepingForced || this.hqCallUI.isOpen) return;
        this.hqCallUI.open({ incidentCount: this.hqExhaustionIncidents, onDone: () => {
            this.hqExhaustionCallPending = false;
            this.hqExhaustionWarningSeen = true;
            this._syncToGameState();
            this._emitEnergyChanged();
            this._requestAutosave();
        } });
    }
    _requestAutosave() {
        void import('../gameStatePersistence.js').then(m => m.requestAutosave())
            .catch(error => console.warn('[EnergyManager] Autosave request failed:', error));
    }
    _recordAndEmit() { this._logEnergyChange(); this._syncToGameState(); this._emitEnergyChanged(); }
    _logEnergyChange() {
        if (!this.lastEnergyChange) return;
        this.energyLog.push(cloneData(this.lastEnergyChange));
        if (this.energyLog.length > 50) this.energyLog.shift();
    }
    _syncToGameState() {
        gameState.updateState({ energy: this.currentEnergy, maxEnergy: this.maxEnergy,
            difficulty: this.difficulty, energyModifiers: this.getEnergyModifiers(),
            forcedSleepSession: cloneData(this.forcedSleepSession),
            hqExhaustionIncidents: this.hqExhaustionIncidents,
            hqExhaustionCallPending: this.hqExhaustionCallPending,
            hqExhaustionWarningSeen: this.hqExhaustionWarningSeen });
    }
    _emitEnergyChanged() {
        EventBus.emit('energyChanged', { current: this.currentEnergy, max: this.maxEnergy,
            percent: Math.round(this.currentEnergy / this.maxEnergy * 100), status: this.getEnergyStatus(),
            color: this.getEnergyColor(), tooltip: this.getEnergyTooltip(), lastChange: this.getLastEnergyChange(),
            modifiers: this.getEnergyModifiers(), energyMultiplier: this.getEffectiveEnergyMultiplier() });
    }
    getCurrentEnergy() { return this.currentEnergy; }
    getMaxEnergy() { return this.maxEnergy; }
    getEnergyLog(limit = null) {
        if (limit == null) return cloneData(this.energyLog);
        const count = Math.floor(Number(limit));
        return Number.isFinite(count) && count > 0 ? cloneData(this.energyLog.slice(-count)) : [];
    }
    getLastEnergyChange() { return cloneData(this.lastEnergyChange); }
    isForcedSleepActive() { return this.isSleepingForced; }
    isManualSleepActive() { return this.isSleepingManual; }
    reset(difficulty = DEFAULT_DIFFICULTY) { this.init(difficulty); }
    restore(data = {}) {
        clearTimeout(this.restoreSleepTimer); this.restoreSleepTimer = null;
        this._clearForcedSleepTimer(); this._removeForcedSleepOverlay(); this.hqCallUI.destroy();
        this.forcedSleepSession = null; this.isSleepingForced = false; this.isSleepingManual = false;
        const max = Number(data.maxEnergy), energy = Number(data.energy);
        if (Number.isFinite(max) && max > 0) this.maxEnergy = Math.max(1, Math.round(max));
        if (Number.isFinite(energy)) this.currentEnergy = Math.max(0, Math.min(this.maxEnergy, Math.round(energy)));
        else this.currentEnergy = Math.min(this.currentEnergy, this.maxEnergy);
        if (isValidDifficulty(data.difficulty)) this.difficulty = data.difficulty;
        this.energyLog = Array.isArray(data.energyLog) ? cloneData(data.energyLog).slice(-50) : [];
        this.energyModifiers = [];
        for (const saved of Array.isArray(data.energyModifiers) ? data.energyModifiers : []) {
            if (!saved || typeof saved.id !== 'string' || !saved.id.trim()) continue;
            const multiplier = Number(saved.multiplier), remainingHours = Number(saved.remainingHours);
            if (!Number.isFinite(multiplier) || multiplier <= 0 || !Number.isFinite(remainingHours) || remainingHours <= 0) continue;
            const id = saved.id.trim(), group = typeof saved.group === 'string' && saved.group.trim() ? saved.group.trim() : null;
            this.energyModifiers = this.energyModifiers.filter(m => m.id !== id && (!group || m.group !== group));
            this.energyModifiers.push({ id, label: typeof saved.label === 'string' ? saved.label : 'Temporary energy effect',
                multiplier, remainingHours, group });
        }
        this.lastEnergyChange = null;
        this.hqExhaustionIncidents = incidentCount(data.hqExhaustionIncidents);
        this.hqExhaustionCallPending = data.hqExhaustionCallPending === true;
        this.hqExhaustionWarningSeen = data.hqExhaustionWarningSeen === true;
        const saved = data.forcedSleepSession;
        const resume = saved?.hotelId === 'agency' && saved.timeCharged === true;
        if (resume) {
            this.forcedSleepSession = { hotelId: 'agency', hotelLabel: 'Agency Motel',
                cityId: typeof saved.cityId === 'string' ? saved.cityId : null,
                sleepHours: FORCED_SLEEP_HOURS, cost: 0, timeCharged: true };
            this.hqExhaustionIncidents = Math.max(1, this.hqExhaustionIncidents);
            this.isSleepingForced = true;
        }
        this._syncToGameState(); this._emitEnergyChanged();
        if (resume || this.hqExhaustionCallPending || this.isCriticalEnergy()) {
            this.restoreSleepTimer = setTimeout(() => {
                this.restoreSleepTimer = null;
                if (resume && this.isSleepingForced && this.forcedSleepSession) {
                    this._showForcedSleepOverlay(); this._startForcedSleepTimer(FORCED_SLEEP_ANIMATION_MS);
                } else if (this.hqExhaustionCallPending) this._openHQCall();
                else if (this.isCriticalEnergy()) this._triggerForcedSleep();
            }, 0);
        }
        return this.currentEnergy;
    }
    serialize() {
        return { energy: this.currentEnergy, maxEnergy: this.maxEnergy, difficulty: this.difficulty,
            energyLog: cloneData(this.energyLog), energyModifiers: this.getEnergyModifiers(),
            forcedSleepSession: cloneData(this.forcedSleepSession),
            hqExhaustionIncidents: this.hqExhaustionIncidents,
            hqExhaustionCallPending: this.hqExhaustionCallPending,
            hqExhaustionWarningSeen: this.hqExhaustionWarningSeen };
    }
}
let energyManagerInstance = null;
export function getEnergyManager() {
    if (!energyManagerInstance) energyManagerInstance = new EnergyManager();
    return energyManagerInstance;
}
export function createEnergyManager() {
    if (energyManagerInstance) energyManagerInstance.destroy();
    energyManagerInstance = new EnergyManager();
    return energyManagerInstance;
}
export default EnergyManager;
