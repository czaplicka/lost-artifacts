import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';

// ============================================================
// EnergyManager.js
// Singleton manager energii. Stan energii jest niezależny od HUD.
// Przy 0% gracz zasypia na 6 godzin CZASU GRY.
// GameTimeManager słucha eventu: advanceTime(hours, minutes).
// ============================================================

const FORCED_SLEEP_HOURS = 6;
const FORCED_SLEEP_ANIMATION_MS = 2000;

const DIFFICULTY_MULTIPLIERS = {
  rookie: 0.7,
  field: 1.0,
  master: 1.4
};

const ENERGY_COSTS = {
  travel: {
    taxi: 8,
    train: 12,
    cheap_flight: 20,
    expensive_flight: 10,
  plane: 10,
  train: 12,
  bus: 16,
  ship: 12
},
  interaction: {
    interview_short: 3,
    interview_medium: 4,
    interview_long: 5
  },
  activity: {
    crime_scene: 8,
    hidden_objects: 10,
    minigame_forensic: 8,
    minigame_mastermind: 6,
    csi_lab: 12
  }
};

const ENERGY_RECOVERY = {
  sleep_short: 40,
  sleep_medium: 60,
  sleep_full: 100,
  food_cheap: 10,
  food_normal: 15,
  food_expensive: 20,
  drink_cheap: 5,
  drink_normal: 8,
  drink_expensive: 10
};

const ENERGY_THRESHOLDS = {
  fresh: { min: 61, status: 'Fresh', color: 0x4CAF50 },
  tired: { min: 31, status: 'Tired', color: 0xFF9800 },
  exhausted: { min: 0, status: 'Exhausted', color: 0xF44336 }
};

const ENERGY_TOOLTIPS = {
  high: 'Functioning adult.',
  medium: 'Running on coffee and denial.',
  low: 'Questionable detective choices ahead.',
  critical: 'Legally too tired to solve crimes.'
};

class EnergyManager {
  constructor() {
    this.currentEnergy = 100;
    this.maxEnergy = 100;
    this.difficulty = 'field';
    this.energyLog = [];
    this.lastEnergyChange = null;
    this.isSleepingForced = false;
    this.forcedSleepTimer = null;
  }

  init(difficulty = 'field') {
    if (!DIFFICULTY_MULTIPLIERS[difficulty]) {
      console.warn(`Unknown difficulty: ${difficulty}, defaulting to field`);
      difficulty = 'field';
    }

    this.difficulty = difficulty;
    this.currentEnergy = this.maxEnergy;
    this.energyLog = [];
    this.lastEnergyChange = null;
    this.isSleepingForced = false;

    if (this.forcedSleepTimer) {
      clearTimeout(this.forcedSleepTimer);
      this.forcedSleepTimer = null;
    }

    this._syncToGameState();
    EventBus.emit('energyInitialized', {
      energy: this.currentEnergy,
      difficulty: this.difficulty,
      status: this.getEnergyStatus()
    });
  }

getTravelCost(transportType = 'train') {
  const fallbackType = 'train';

  const baseCost =
    ENERGY_COSTS.travel[transportType] ??
    ENERGY_COSTS.travel[fallbackType] ??
    0;

  return this.scaleCost(baseCost);
}

consumeTravel(transportType = 'train') {
  const cost = this.getTravelCost(transportType);

  return this._consumeEnergy(
    cost,
    `Travel (${transportType}): -${cost}`
  );
}

consumeCustom(cost, label = 'Energy changed.') {
  const safeCost = Math.max(
    0,
    Math.round(Number(cost) || 0)
  );

  return this._consumeEnergy(safeCost, label);
}

  getDifficultyMultiplier() {
    return DIFFICULTY_MULTIPLIERS[this.difficulty] || 1.0;
  }

  scaleCost(baseCost) {
    return Math.ceil(baseCost * this.getDifficultyMultiplier());
  }

  getEnergyStatus() {
    if (this.currentEnergy >= ENERGY_THRESHOLDS.fresh.min) {
      return ENERGY_THRESHOLDS.fresh.status;
    }
    if (this.currentEnergy >= ENERGY_THRESHOLDS.tired.min) {
      return ENERGY_THRESHOLDS.tired.status;
    }
    return ENERGY_THRESHOLDS.exhausted.status;
  }

  getEnergyColor() {
    if (this.currentEnergy >= ENERGY_THRESHOLDS.fresh.min) {
      return ENERGY_THRESHOLDS.fresh.color;
    }
    if (this.currentEnergy >= ENERGY_THRESHOLDS.tired.min) {
      return ENERGY_THRESHOLDS.tired.color;
    }
    return ENERGY_THRESHOLDS.exhausted.color;
  }

  getEnergyTooltip() {
    if (this.currentEnergy >= 80) return ENERGY_TOOLTIPS.high;
    if (this.currentEnergy >= 50) return ENERGY_TOOLTIPS.medium;
    if (this.currentEnergy >= 20) return ENERGY_TOOLTIPS.low;
    return ENERGY_TOOLTIPS.critical;
  }

  consumeInterview(duration = 'medium') {
    const baseCost = ENERGY_COSTS.interaction[`interview_${duration}`] || ENERGY_COSTS.interaction.interview_medium;
    const cost = this.scaleCost(baseCost);
    return this._consumeEnergy(cost, `Interview: -${cost}`);
  }

  consumeActivity(activityType = 'minigame_forensic') {
    const baseCost = ENERGY_COSTS.activity[activityType] || ENERGY_COSTS.activity.minigame_forensic;
    const cost = this.scaleCost(baseCost);
    return this._consumeEnergy(cost, `Activity (${activityType}): -${cost}`);
  }

  sleep(sleepHours = 8) {
    if (sleepHours <= 0) return { success: false, reason: 'invalid_sleep_duration' };

    let recoveryAmount = ENERGY_RECOVERY.sleep_full;
    let sleepType = 'full';

    if (sleepHours <= 2) {
      recoveryAmount = ENERGY_RECOVERY.sleep_short;
      sleepType = 'short';
    } else if (sleepHours <= 4) {
      recoveryAmount = ENERGY_RECOVERY.sleep_medium;
      sleepType = 'medium';
    }

    if (this.difficulty === 'rookie') {
      recoveryAmount = Math.ceil(recoveryAmount * 1.15);
    }

    return this._recoverEnergy(
      recoveryAmount,
      `Sleep (${sleepHours}h): +${recoveryAmount}`,
      'sleep',
      sleepType
    );
  }

  eat(foodQuality = 'normal') {
    const recovery = ENERGY_RECOVERY[`food_${foodQuality}`] || ENERGY_RECOVERY.food_normal;
    return this._recoverEnergy(recovery, `Food (${foodQuality}): +${recovery}`, 'food', foodQuality);
  }

  drink(drinkQuality = 'normal') {
    const recovery = ENERGY_RECOVERY[`drink_${drinkQuality}`] || ENERGY_RECOVERY.drink_normal;
    return this._recoverEnergy(recovery, `Drink (${drinkQuality}): +${recovery}`, 'drink', drinkQuality);
  }

  _consumeEnergy(amount, label) {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };
    if (this.isSleepingForced) return { success: false, reason: 'forced_sleep_active' };

    const previousEnergy = this.currentEnergy;
    this.currentEnergy = Math.max(0, this.currentEnergy - amount);

    this.lastEnergyChange = {
      type: 'consume',
      amount: -amount,
      label,
      beforeEnergy: previousEnergy,
      afterEnergy: this.currentEnergy,
      timestamp: Date.now()
    };

    this._recordAndEmit();

    if (this.currentEnergy === 0) {
      this._triggerForcedSleep();
      return {
        success: true,
        amount,
        label,
        energyReachedZero: true,
        status: 'Exhausted and collapsed'
      };
    }

    if (previousEnergy > 20 && this.currentEnergy <= 20) {
      EventBus.emit('energyWarning', {
        energy: this.currentEnergy,
        status: this.getEnergyStatus()
      });
    }

    return {
      success: true,
      amount,
      label,
      energyReachedZero: false,
      status: this.getEnergyStatus()
    };
  }

  _recoverEnergy(amount, label, recoveryType = 'unknown', recoverySubtype = '') {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };

    const previousEnergy = this.currentEnergy;
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + amount);
    const actualRecovery = this.currentEnergy - previousEnergy;

    this.lastEnergyChange = {
      type: 'recover',
      amount: actualRecovery,
      label,
      recoveryType,
      recoverySubtype,
      beforeEnergy: previousEnergy,
      afterEnergy: this.currentEnergy,
      timestamp: Date.now()
    };

    this.isSleepingForced = false;
    this._recordAndEmit();

    return {
      success: true,
      amount: actualRecovery,
      label,
      status: this.getEnergyStatus()
    };
  }

  _triggerForcedSleep() {
    if (this.isSleepingForced) return;

    this.isSleepingForced = true;

    EventBus.emit('energyZero', {
      energy: 0,
      status: 'Exhausted',
      sleepHours: FORCED_SLEEP_HOURS,
      message: `You collapse from exhaustion and sleep for ${FORCED_SLEEP_HOURS} hours...`
    });

    // GameTimeManager już słucha tego eventu i wykonuje handleAdvanceTime.
    // 6 godzin może zmienić dzień; wtedy zwykły kalendarz i deadline
    // zostaną automatycznie zaktualizowane przez timeChanged.
    EventBus.emit('advanceTime', FORCED_SLEEP_HOURS, 0);

    // Te 2 sekundy są tylko czasem na animację / komunikat dla gracza.
    this.forcedSleepTimer = setTimeout(() => {
      if (!this.isSleepingForced) return;

      const previousEnergy = this.currentEnergy;
      this.currentEnergy = this.maxEnergy;
      this.lastEnergyChange = {
        type: 'recover',
        amount: this.maxEnergy - previousEnergy,
        label: `Forced sleep (${FORCED_SLEEP_HOURS}h): +${this.maxEnergy - previousEnergy}`,
        recoveryType: 'forced_sleep',
        recoverySubtype: 'collapse',
        beforeEnergy: previousEnergy,
        afterEnergy: this.currentEnergy,
        timestamp: Date.now()
      };
      this.isSleepingForced = false;
      this.forcedSleepTimer = null;
      this._recordAndEmit();

      EventBus.emit('energyRecovered', {
        energy: this.currentEnergy,
        sleepHours: FORCED_SLEEP_HOURS,
        reason: 'forced_sleep'
      });
    }, FORCED_SLEEP_ANIMATION_MS);
  }

  _recordAndEmit() {
    this._logEnergyChange();
    this._syncToGameState();
    this._emitEnergyChanged();
  }

  _logEnergyChange() {
    if (!this.lastEnergyChange) return;
    this.energyLog.push(structuredClone(this.lastEnergyChange));
    if (this.energyLog.length > 50) this.energyLog.shift();
  }

_syncToGameState() {
  gameState.energy = this.currentEnergy;
  gameState.maxEnergy = this.maxEnergy;
  gameState.energyLog = [...this.energyLog];
  gameState.difficulty = this.difficulty;
}

  _emitEnergyChanged() {
    EventBus.emit('energyChanged', {
      current: this.currentEnergy,
      max: this.maxEnergy,
      percent: Math.round((this.currentEnergy / this.maxEnergy) * 100),
      status: this.getEnergyStatus(),
      color: this.getEnergyColor(),
      tooltip: this.getEnergyTooltip(),
      lastChange: this.lastEnergyChange
    });
  }

  getCurrentEnergy() {
    return this.currentEnergy;
  }

  getEnergyLog() {
    return [...this.energyLog];
  }

  reset(difficulty = 'field') {
    this.init(difficulty);
  }

restore(data = {}) {
  const savedMaxEnergy = Number(data.maxEnergy);

  if (Number.isFinite(savedMaxEnergy) && savedMaxEnergy > 0) {
    this.maxEnergy = Math.round(savedMaxEnergy);
  }

  const savedEnergy = Number(data.energy);

  if (Number.isFinite(savedEnergy)) {
    this.currentEnergy = Math.max(
      0,
      Math.min(this.maxEnergy, Math.round(savedEnergy))
    );
  } else {
    console.warn(
      '[EnergyManager] Save has no valid energy value; keeping current energy.',
      {
        savedEnergy: data.energy,
        currentEnergy: this.currentEnergy
      }
    );
  }

  if (
    typeof data.difficulty === 'string' &&
    DIFFICULTY_MULTIPLIERS[data.difficulty]
  ) {
    this.difficulty = data.difficulty;
  }

  if (Array.isArray(data.energyLog)) {
    this.energyLog = structuredClone(data.energyLog);
  } else {
    this.energyLog = [];
  }

  this.lastEnergyChange = null;
  this.isSleepingForced = false;

  if (this.forcedSleepTimer) {
    clearTimeout(this.forcedSleepTimer);
    this.forcedSleepTimer = null;
  }

  this._syncToGameState();
  this._emitEnergyChanged();

  console.log('[EnergyManager] Energy restored from save.', {
    energy: this.currentEnergy,
    maxEnergy: this.maxEnergy,
    difficulty: this.difficulty
  });

  return this.currentEnergy;
}

  serialize() {
    return {
      energy: this.currentEnergy,
      maxEnergy: this.maxEnergy,
      difficulty: this.difficulty,
      energyLog: structuredClone(this.energyLog)
    };
  }
}

let energyManagerInstance = null;

export function getEnergyManager() {
  if (!energyManagerInstance) {
    energyManagerInstance = new EnergyManager();
  }
  return energyManagerInstance;
}

export function createEnergyManager() {
  energyManagerInstance = new EnergyManager();
  return energyManagerInstance;
}

export default EnergyManager;