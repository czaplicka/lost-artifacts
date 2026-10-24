import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { resourcefulnessManager } from './ResourcefulnessManager.js';
import {
    DEFAULT_DIFFICULTY,
    getDifficultyConfig,
    isValidDifficulty,
} from '../DifficultySettings.js';

const FORCED_SLEEP_HOURS = 6;
const FORCED_SLEEP_ANIMATION_MS = 2000;

const ENERGY_COSTS = {
    interaction: { interview_short: 3, interview_medium: 4, interview_long: 5 },
    activity: {
        crime_scene: 8, hidden_objects: 10, minigame_forensic: 8,
        minigame_mastermind: 6, csi_lab: 12, apartment_visit: 6,
    },
};
const ENERGY_RECOVERY = {
    sleep_short: 40, sleep_medium: 60, sleep_full: 100,
    food_cheap: 10, food_normal: 15, food_expensive: 20,
    drink_cheap: 5, drink_normal: 8, drink_expensive: 10,
};
const ENERGY_THRESHOLDS = {
    fresh: { min: 61, status: 'Fresh', color: 0x4CAF50 },
    tired: { min: 31, status: 'Tired', color: 0xFF9800 },
    exhausted: { min: 0, status: 'Exhausted', color: 0xF44336 },
};
const ENERGY_TOOLTIPS = {
    high: 'Functioning adult.',
    medium: 'Running on coffee and denial.',
    low: 'Questionable detective choices ahead.',
    critical: 'Legally too tired to solve crimes.',
};

function cloneData(data) {
    if (data === undefined || data === null) return data;
    if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(data);
    return JSON.parse(JSON.stringify(data));
}

function nonNegativeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

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
        this._onVisibilityChange = this._onVisibilityChange.bind(this);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this._onVisibilityChange);
        }
    }

    destroy() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._onVisibilityChange);
        }
        this._clearForcedSleepTimer();
    }

    init(difficulty = DEFAULT_DIFFICULTY) {
        if (!isValidDifficulty(difficulty)) {
            console.warn(`Unknown difficulty: ${difficulty}, defaulting to ${DEFAULT_DIFFICULTY}`);
            difficulty = DEFAULT_DIFFICULTY;
        }
        this.difficulty = difficulty;
        this.currentEnergy = this.maxEnergy;
        this.energyLog = [];
        this.lastEnergyChange = null;
        this.energyModifiers = [];
        this.isSleepingForced = false;
        this.isSleepingManual = false;
        this._clearForcedSleepTimer();
        this._syncToGameState();
        EventBus.emit('energyInitialized', {
            energy: this.currentEnergy, difficulty: this.difficulty, status: this.getEnergyStatus(),
        });
    }

    getDifficultyMultiplier() {
        return getDifficultyConfig(this.difficulty).energyCostMultiplier;
    }

    getTemporaryEnergyMultiplier() {
        return this.energyModifiers.reduce((multiplier, modifier) => multiplier * modifier.multiplier, 1);
    }

    getEffectiveEnergyMultiplier() {
        return this.getDifficultyMultiplier() * this.getTemporaryEnergyMultiplier();
    }

    scaleCost(baseCost) {
        return Math.ceil(nonNegativeNumber(baseCost) * this.getEffectiveEnergyMultiplier());
    }

    addEnergyModifier({ id, label = 'Temporary energy effect', multiplier, durationHours, group = null } = {}) {
        const safeId = typeof id === 'string' ? id.trim() : '';
        const safeMultiplier = Number(multiplier);
        const safeDuration = Number(durationHours);
        if (!safeId || !Number.isFinite(safeMultiplier) || safeMultiplier <= 0 ||
            !Number.isFinite(safeDuration) || safeDuration <= 0) {
            return { success: false, reason: 'invalid_energy_modifier' };
        }
        const safeGroup = typeof group === 'string' && group.trim() ? group.trim() : null;
        this.energyModifiers = this.energyModifiers.filter(modifier => {
            if (modifier.id === safeId) return false;
            if (safeGroup && modifier.group === safeGroup) return false;
            return true;
        });
        const modifier = {
            id: safeId, label: String(label), multiplier: safeMultiplier,
            remainingHours: safeDuration, group: safeGroup,
        };
        this.energyModifiers.push(modifier);
        this._notifyModifiersChanged();
        return { success: true, modifier: cloneData(modifier) };
    }

    removeEnergyModifier(id) {
        const previousCount = this.energyModifiers.length;
        this.energyModifiers = this.energyModifiers.filter(modifier => modifier.id !== id);
        const removed = previousCount !== this.energyModifiers.length;
        if (removed) this._notifyModifiersChanged();
        return removed;
    }

    getEnergyModifiers() { return cloneData(this.energyModifiers); }

    advanceModifierTime(hours) {
        const elapsed = Number(hours);
        if (!Number.isFinite(elapsed) || elapsed <= 0 || this.energyModifiers.length === 0) return [];
        const expired = [];
        const active = [];
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
        const settings = getDifficultyConfig(this.difficulty).randomEvents.illness;
        return this.addEnergyModifier({
            id: 'illness', label: 'Working while sick', multiplier: settings.workEnergyMultiplier,
            durationHours: settings.workDurationHours, group: 'illness',
        });
    }

    applyIllnessRecovery() {
        const settings = getDifficultyConfig(this.difficulty).randomEvents.illness;
        return this.addEnergyModifier({
            id: 'illness_recovery', label: 'Recovered and rested', multiplier: settings.recoveryEnergyMultiplier,
            durationHours: settings.recoveryDurationHours, group: 'illness',
        });
    }

    _notifyModifiersChanged() {
        this._syncToGameState();
        this._emitEnergyChanged();
        EventBus.emit('energyModifiersChanged', {
            modifiers: this.getEnergyModifiers(), multiplier: this.getTemporaryEnergyMultiplier(),
        });
    }

    getTravelCost(transportType = 'plane') {
        const approximateHours = {
            plane: 3, train: 6, bus: 8, ship: 12, taxi: 0.5, cheap_flight: 4, expensive_flight: 2,
        };
        const hours = approximateHours[transportType] || 3;
        const baseCost = Math.max(2, Math.round(hours * 0.8));
        return this.scaleCost(baseCost);
    }

    consumeTravel(transportType = 'plane') {
        const cost = this.getTravelCost(transportType);
        return this._consumeEnergy(cost, `Travel (${transportType}): -${cost}`);
    }

    // Modyfikatory trudnosci i efektow sa naliczane przed Resourcefulness.
    // To jedyne miejsce naliczania znizki energii dla aktywnosci.
    getActivityCostDetails(activityType = 'minigame_forensic') {
        const baseCost = ENERGY_COSTS.activity[activityType] || ENERGY_COSTS.activity.minigame_forensic;
        const scaledCost = this.scaleCost(baseCost);
        const quote = resourcefulnessManager.getSearchEnergyQuote(activityType, scaledCost);
        return { ...quote, baseCost, scaledCost };
    }

    getActivityCost(activityType = 'minigame_forensic') {
        return this.getActivityCostDetails(activityType).finalCost;
    }

    getActivityCostDescription(activityType = 'minigame_forensic') {
        return resourcefulnessManager.formatSearchEnergyQuote(this.getActivityCostDetails(activityType));
    }

    getInterviewCost(duration = 'medium') {
        const baseCost = ENERGY_COSTS.interaction[`interview_${duration}`] || ENERGY_COSTS.interaction.interview_medium;
        return this.scaleCost(baseCost);
    }

    canAfford(cost) {
        const safeCost = Math.round(nonNegativeNumber(cost));
        return {
            ok: !this.isSleepingForced && !this.isSleepingManual && this.currentEnergy >= safeCost,
            currentEnergy: this.currentEnergy, requiredEnergy: safeCost,
            missingEnergy: Math.max(0, safeCost - this.currentEnergy),
            reason: this.isSleepingForced ? 'forced_sleep_active'
                : this.isSleepingManual ? 'manual_sleep_active'
                : this.currentEnergy >= safeCost ? null : 'insufficient_energy',
        };
    }

    canPerformActivity(activityType = 'minigame_forensic') {
        const costDetails = this.getActivityCostDetails(activityType);
        const cost = costDetails.finalCost;
        return { ...this.canAfford(cost), activityType, cost, costDetails };
    }

    canPerformInterview(duration = 'medium') {
        const cost = this.getInterviewCost(duration);
        return { ...this.canAfford(cost), duration, cost };
    }

    getInsufficientEnergyMessage(requiredEnergy) {
        const required = Math.round(nonNegativeNumber(requiredEnergy));
        const missing = Math.max(0, required - this.currentEnergy);
        if (this.isSleepingForced || this.isSleepingManual) {
            return 'You are currently asleep. Even brilliant deductions can wait.';
        }
        if (missing <= 0) return 'You have enough energy for this activity.';
        return `You need ${required} energy for this activity. You have ${this.currentEnergy}. Rest, eat, or drink first.`;
    }

    getEnergyStatus() {
        if (this.currentEnergy >= ENERGY_THRESHOLDS.fresh.min) return ENERGY_THRESHOLDS.fresh.status;
        if (this.currentEnergy >= ENERGY_THRESHOLDS.tired.min) return ENERGY_THRESHOLDS.tired.status;
        return ENERGY_THRESHOLDS.exhausted.status;
    }

    getEnergyColor() {
        if (this.currentEnergy >= ENERGY_THRESHOLDS.fresh.min) return ENERGY_THRESHOLDS.fresh.color;
        if (this.currentEnergy >= ENERGY_THRESHOLDS.tired.min) return ENERGY_THRESHOLDS.tired.color;
        return ENERGY_THRESHOLDS.exhausted.color;
    }

    getEnergyTooltip() {
        if (this.currentEnergy >= 80) return ENERGY_TOOLTIPS.high;
        if (this.currentEnergy >= 50) return ENERGY_TOOLTIPS.medium;
        if (this.currentEnergy >= 20) return ENERGY_TOOLTIPS.low;
        return ENERGY_TOOLTIPS.critical;
    }

    consumeInterview(duration = 'medium') {
        const cost = this.getInterviewCost(duration);
        const affordability = this.canAfford(cost);
        if (!affordability.ok) {
            return {
                success: false, reason: affordability.reason, duration, activityType: `interview_${duration}`,
                amount: cost, cost, currentEnergy: this.currentEnergy, requiredEnergy: cost,
                missingEnergy: affordability.missingEnergy, message: this.getInsufficientEnergyMessage(cost),
            };
        }
        return this._consumeEnergy(cost, `Interview: -${cost}`, {
            requireFullAmount: true, activityType: `interview_${duration}`,
        });
    }

    consumeActivity(activityType = 'minigame_forensic') {
        const costDetails = this.getActivityCostDetails(activityType);
        const cost = costDetails.finalCost;
        const affordability = this.canAfford(cost);
        if (!affordability.ok) {
            return {
                success: false, reason: affordability.reason, activityType, amount: cost, cost, costDetails,
                currentEnergy: this.currentEnergy, requiredEnergy: cost,
                missingEnergy: affordability.missingEnergy, message: this.getInsufficientEnergyMessage(cost),
            };
        }
        const savingLabel = costDetails.applied
            ? ` (Resourcefulness: saved ${costDetails.saved})` : '';
        const result = this._consumeEnergy(cost, `Activity (${activityType}): -${cost}${savingLabel}`, {
            requireFullAmount: true, activityType,
        });
        return { ...result, cost, costDetails };
    }

    // Gotowy koszt: nie skalujemy ani nie stosujemy znizki ponownie.
    consumeCustom(cost, label = 'Energy changed.', options = {}) {
        const safeCost = Math.round(nonNegativeNumber(cost));
        return this._consumeEnergy(safeCost, label, {
            requireFullAmount: Boolean(options.requireFullAmount), activityType: options.activityType || 'custom',
        });
    }

    startManualSleep(sleepHours = 8) {
        const hours = Number(sleepHours);
        if (!Number.isFinite(hours) || hours <= 0) return { success: false, reason: 'invalid_sleep_duration' };
        if (this.isSleepingForced || this.isSleepingManual) return { success: false, reason: 'sleep_already_active' };
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
        let recoveryAmount = ENERGY_RECOVERY.sleep_full;
        let sleepType = 'full';
        if (hours <= 2) { recoveryAmount = ENERGY_RECOVERY.sleep_short; sleepType = 'short'; }
        else if (hours <= 4) { recoveryAmount = ENERGY_RECOVERY.sleep_medium; sleepType = 'medium'; }
        recoveryAmount = Math.ceil(recoveryAmount * getDifficultyConfig(this.difficulty).sleepRecoveryMultiplier);
        EventBus.emit('advanceTime', hours, 0);
        const result = this._recoverEnergy(recoveryAmount, `Sleep (${hours}h): +${recoveryAmount}`, 'sleep', sleepType);
        this.isSleepingManual = false;
        EventBus.emit('manualSleepFinished', {
            sleepHours: hours, recovered: result.amount, energy: this.currentEnergy,
        });
        return result;
    }

    sleep(sleepHours = 8) {
        const started = this.startManualSleep(sleepHours);
        if (!started.success) return started;
        return this.completeManualSleep(sleepHours);
    }

    cancelManualSleep() { this.isSleepingManual = false; }

    eat(foodQuality = 'normal') {
        const recovery = ENERGY_RECOVERY[`food_${foodQuality}`] || ENERGY_RECOVERY.food_normal;
        return this._recoverEnergy(recovery, `Food (${foodQuality}): +${recovery}`, 'food', foodQuality);
    }

    drink(drinkQuality = 'normal') {
        const recovery = ENERGY_RECOVERY[`drink_${drinkQuality}`] || ENERGY_RECOVERY.drink_normal;
        return this._recoverEnergy(recovery, `Drink (${drinkQuality}): +${recovery}`, 'drink', drinkQuality);
    }

    recoverCustom(amount, label = 'Energy restored.', options = {}) {
        const safeAmount = Math.round(nonNegativeNumber(amount));
        if (safeAmount <= 0) return { success: false, reason: 'invalid_amount' };
        if (this.isSleepingForced || this.isSleepingManual) {
            return {
                success: false, reason: this.isSleepingForced ? 'forced_sleep_active' : 'manual_sleep_active',
                message: this.getInsufficientEnergyMessage(0),
            };
        }
        if (this.currentEnergy >= this.maxEnergy) return { success: false, reason: 'energy_full' };
        return this._recoverEnergy(safeAmount, label, options.recoveryType || 'custom', options.recoverySubtype || '');
    }

    _consumeEnergy(amount, label, options = {}) {
        const safeAmount = Math.round(nonNegativeNumber(amount));
        const requireFullAmount = Boolean(options.requireFullAmount);
        if (safeAmount <= 0) return { success: false, reason: 'invalid_amount' };
        if (this.isSleepingForced || this.isSleepingManual) {
            return {
                success: false, reason: this.isSleepingForced ? 'forced_sleep_active' : 'manual_sleep_active',
                amount: safeAmount, currentEnergy: this.currentEnergy,
                message: this.getInsufficientEnergyMessage(safeAmount),
            };
        }
        if (requireFullAmount && this.currentEnergy < safeAmount) {
            return {
                success: false, reason: 'insufficient_energy', amount: safeAmount, cost: safeAmount,
                currentEnergy: this.currentEnergy, requiredEnergy: safeAmount,
                missingEnergy: safeAmount - this.currentEnergy,
                message: this.getInsufficientEnergyMessage(safeAmount),
            };
        }
        const previousEnergy = this.currentEnergy;
        this.currentEnergy = Math.max(0, this.currentEnergy - safeAmount);
        this.lastEnergyChange = {
            type: 'consume', amount: -safeAmount, label, activityType: options.activityType || null,
            beforeEnergy: previousEnergy, afterEnergy: this.currentEnergy, timestamp: Date.now(),
        };
        this._recordAndEmit();
        if (this.currentEnergy === 0) {
            this._triggerForcedSleep();
            return {
                success: true, amount: safeAmount, label, activityType: options.activityType || null,
                energyReachedZero: true, status: 'Exhausted and collapsed',
            };
        }
        if (previousEnergy > 20 && this.currentEnergy <= 20) {
            EventBus.emit('energyWarning', { energy: this.currentEnergy, status: this.getEnergyStatus() });
        }
        return {
            success: true, amount: safeAmount, label, activityType: options.activityType || null,
            energyReachedZero: false, status: this.getEnergyStatus(),
        };
    }

    _recoverEnergy(amount, label, recoveryType = 'unknown', recoverySubtype = '') {
        const safeAmount = nonNegativeNumber(amount);
        if (safeAmount <= 0) return { success: false, reason: 'invalid_amount' };
        const previousEnergy = this.currentEnergy;
        this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + safeAmount);
        const actualRecovery = this.currentEnergy - previousEnergy;
        this.lastEnergyChange = {
            type: 'recover', amount: actualRecovery, label, recoveryType, recoverySubtype,
            beforeEnergy: previousEnergy, afterEnergy: this.currentEnergy, timestamp: Date.now(),
        };
        this.isSleepingForced = false;
        this._clearForcedSleepTimer();
        this._recordAndEmit();
        return { success: true, amount: actualRecovery, label, status: this.getEnergyStatus() };
    }

    _triggerForcedSleep() {
        if (this.isSleepingForced || this.isSleepingManual) return;
        this.isSleepingForced = true;
        const shouldShowHollyIntro = gameState.hollyFirstSleepSeen !== true;
        if (shouldShowHollyIntro) {
            gameState.hollyFirstSleepSeen = true;
            EventBus.emit('firstForcedSleepStory', {
                sceneKey: 'HollyIntroScene', sleepHours: FORCED_SLEEP_HOURS, energy: 0,
            });
        }
        EventBus.emit('energyZero', {
            energy: 0, status: 'Exhausted', sleepHours: FORCED_SLEEP_HOURS,
            message: `You collapse from exhaustion and sleep for ${FORCED_SLEEP_HOURS} hours...`,
            firstSleepStory: shouldShowHollyIntro,
        });
        EventBus.emit('advanceTime', FORCED_SLEEP_HOURS, 0);
        this._startForcedSleepTimer(FORCED_SLEEP_ANIMATION_MS);
    }

    _startForcedSleepTimer(durationMs) {
        this._clearForcedSleepTimer();
        this.forcedSleepRemainingMs = Math.max(0, durationMs);
        if (typeof document !== 'undefined' && document.hidden) return;
        this._scheduleForcedSleepTimer();
    }

    _scheduleForcedSleepTimer() {
        if (this.forcedSleepTimer) clearTimeout(this.forcedSleepTimer);
        this.forcedSleepTimerStartedAt = Date.now();
        this.forcedSleepTimer = setTimeout(() => {
            this.forcedSleepTimer = null;
            this.forcedSleepRemainingMs = 0;
            this._finishForcedSleep();
        }, this.forcedSleepRemainingMs);
    }

    _clearForcedSleepTimer() {
        if (this.forcedSleepTimer) clearTimeout(this.forcedSleepTimer);
        this.forcedSleepTimer = null;
        this.forcedSleepRemainingMs = 0;
        this.forcedSleepTimerStartedAt = 0;
    }

    _onVisibilityChange() {
        if (!this.isSleepingForced || typeof document === 'undefined') return;
        if (document.hidden) {
            if (!this.forcedSleepTimer) return;
            const elapsed = Date.now() - this.forcedSleepTimerStartedAt;
            this.forcedSleepRemainingMs = Math.max(0, this.forcedSleepRemainingMs - elapsed);
            clearTimeout(this.forcedSleepTimer);
            this.forcedSleepTimer = null;
            return;
        }
        if (!this.forcedSleepTimer) this._scheduleForcedSleepTimer();
    }

    _finishForcedSleep() {
        if (!this.isSleepingForced) return;
        const previousEnergy = this.currentEnergy;
        this.currentEnergy = this.maxEnergy;
        this.lastEnergyChange = {
            type: 'recover', amount: this.maxEnergy - previousEnergy,
            label: `Forced sleep (${FORCED_SLEEP_HOURS}h): +${this.maxEnergy - previousEnergy}`,
            recoveryType: 'forced_sleep', recoverySubtype: 'collapse',
            beforeEnergy: previousEnergy, afterEnergy: this.currentEnergy, timestamp: Date.now(),
        };
        this.isSleepingForced = false;
        this._recordAndEmit();
        EventBus.emit('energyRecovered', {
            energy: this.currentEnergy, sleepHours: FORCED_SLEEP_HOURS, reason: 'forced_sleep',
        });
    }

    _recordAndEmit() {
        this._logEnergyChange();
        this._syncToGameState();
        this._emitEnergyChanged();
    }

    _logEnergyChange() {
        if (!this.lastEnergyChange) return;
        this.energyLog.push(cloneData(this.lastEnergyChange));
        if (this.energyLog.length > 50) this.energyLog.shift();
    }

    _syncToGameState() {
        gameState.updateState({
            energy: this.currentEnergy, maxEnergy: this.maxEnergy,
            difficulty: this.difficulty, energyModifiers: this.getEnergyModifiers(),
        });
    }

    _emitEnergyChanged() {
        EventBus.emit('energyChanged', {
            current: this.currentEnergy, max: this.maxEnergy,
            percent: Math.round((this.currentEnergy / this.maxEnergy) * 100),
            status: this.getEnergyStatus(), color: this.getEnergyColor(), tooltip: this.getEnergyTooltip(),
            lastChange: this.getLastEnergyChange(), modifiers: this.getEnergyModifiers(),
            energyMultiplier: this.getEffectiveEnergyMultiplier(),
        });
    }

    getCurrentEnergy() { return this.currentEnergy; }
    getMaxEnergy() { return this.maxEnergy; }

    getEnergyLog(limit = null) {
        if (limit === null || limit === undefined) return cloneData(this.energyLog);
        const count = Math.floor(Number(limit));
        if (!Number.isFinite(count) || count <= 0) return [];
        return cloneData(this.energyLog.slice(-count));
    }

    getLastEnergyChange() { return cloneData(this.lastEnergyChange); }
    isForcedSleepActive() { return this.isSleepingForced; }
    isManualSleepActive() { return this.isSleepingManual; }
    reset(difficulty = DEFAULT_DIFFICULTY) { this.init(difficulty); }

    restore(data = {}) {
        const savedMaxEnergy = Number(data.maxEnergy);
        if (Number.isFinite(savedMaxEnergy) && savedMaxEnergy > 0) {
            this.maxEnergy = Math.max(1, Math.round(savedMaxEnergy));
        }
        const savedEnergy = Number(data.energy);
        if (Number.isFinite(savedEnergy)) {
            this.currentEnergy = Math.max(0, Math.min(this.maxEnergy, Math.round(savedEnergy)));
        } else {
            console.warn('[EnergyManager] Save has no valid energy value; keeping current energy.', {
                savedEnergy: data.energy, currentEnergy: this.currentEnergy,
            });
            this.currentEnergy = Math.min(this.currentEnergy, this.maxEnergy);
        }
        if (isValidDifficulty(data.difficulty)) this.difficulty = data.difficulty;
        this.energyLog = Array.isArray(data.energyLog) ? cloneData(data.energyLog).slice(-50) : [];
        this.energyModifiers = [];
        const savedModifiers = Array.isArray(data.energyModifiers) ? data.energyModifiers : [];
        for (const saved of savedModifiers) {
            if (!saved || typeof saved.id !== 'string' || !saved.id.trim()) continue;
            const multiplier = Number(saved.multiplier);
            const remainingHours = Number(saved.remainingHours);
            if (!Number.isFinite(multiplier) || multiplier <= 0 || !Number.isFinite(remainingHours) || remainingHours <= 0) continue;
            const id = saved.id.trim();
            const group = typeof saved.group === 'string' && saved.group.trim() ? saved.group.trim() : null;
            this.energyModifiers = this.energyModifiers.filter(modifier =>
                modifier.id !== id && (!group || modifier.group !== group));
            this.energyModifiers.push({
                id, label: typeof saved.label === 'string' ? saved.label : 'Temporary energy effect',
                multiplier, remainingHours, group,
            });
        }
        this.lastEnergyChange = null;
        this.isSleepingForced = false;
        this.isSleepingManual = false;
        this._clearForcedSleepTimer();
        this._syncToGameState();
        this._emitEnergyChanged();
        console.log('[EnergyManager] Energy restored from save.', {
            energy: this.currentEnergy, maxEnergy: this.maxEnergy,
            difficulty: this.difficulty, modifiers: this.getEnergyModifiers(),
        });
        return this.currentEnergy;
    }

    serialize() {
        return {
            energy: this.currentEnergy, maxEnergy: this.maxEnergy,
            difficulty: this.difficulty, energyLog: cloneData(this.energyLog),
            energyModifiers: this.getEnergyModifiers(),
        };
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
