import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';


const FORCED_SLEEP_HOURS = 6;
const FORCED_SLEEP_ANIMATION_MS = 2000;


const DIFFICULTY_MULTIPLIERS = {
  rookie: 0.7,
  field: 1.0,
  master: 1.4
};


const ENERGY_COSTS = {
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


function cloneData(data) {
  if (data === undefined || data === null) {
    return data;
  }


  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(data);
  }


  return JSON.parse(JSON.stringify(data));
}


class EnergyManager {
  constructor() {
    this.currentEnergy = 100;
    this.maxEnergy = 100;
    this.difficulty = 'field';
    this.energyLog = [];
    this.lastEnergyChange = null;
    this.isSleepingForced = false;
    this.isSleepingManual = false;
    this.forcedSleepTimer = null;
  }


  init(difficulty = 'field') {
    if (!DIFFICULTY_MULTIPLIERS[difficulty]) {
      console.warn(
        `Unknown difficulty: ${difficulty}, defaulting to field`
      );
      difficulty = 'field';
    }


    this.difficulty = difficulty;
    this.currentEnergy = this.maxEnergy;
    this.energyLog = [];
    this.lastEnergyChange = null;
    this.isSleepingForced = false;
    this.isSleepingManual = false;


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


  getTravelCost(transportType = 'plane') {
    const approximateHours = {
      plane: 3,
      train: 6,
      bus: 8,
      ship: 12,
      taxi: 0.5,
      cheap_flight: 4,
      expensive_flight: 2
    };


    const hours = approximateHours[transportType] || 3;
    const baseCost = Math.max(2, Math.round(hours * 0.8));


    return this.scaleCost(baseCost);
  }


  consumeTravel(transportType = 'plane') {
    const cost = this.getTravelCost(transportType);


    return this._consumeEnergy(
      cost,
      `Travel (${transportType}): -${cost}`
    );
  }


  getDifficultyMultiplier() {
    return DIFFICULTY_MULTIPLIERS[this.difficulty] || 1.0;
  }


  scaleCost(baseCost) {
    return Math.ceil(
      Number(baseCost || 0) * this.getDifficultyMultiplier()
    );
  }


  getActivityCost(activityType = 'minigame_forensic') {
    const baseCost =
      ENERGY_COSTS.activity[activityType] ||
      ENERGY_COSTS.activity.minigame_forensic;


    return this.scaleCost(baseCost);
  }


  getInterviewCost(duration = 'medium') {
    const baseCost =
      ENERGY_COSTS.interaction[`interview_${duration}`] ||
      ENERGY_COSTS.interaction.interview_medium;


    return this.scaleCost(baseCost);
  }


  canAfford(cost) {
    const safeCost = Math.max(
      0,
      Math.round(Number(cost) || 0)
    );


    return {
      ok:
        !this.isSleepingForced &&
        !this.isSleepingManual &&
        this.currentEnergy >= safeCost,
      currentEnergy: this.currentEnergy,
      requiredEnergy: safeCost,
      missingEnergy: Math.max(
        0,
        safeCost - this.currentEnergy
      ),
      reason: this.isSleepingForced
        ? 'forced_sleep_active'
        : this.isSleepingManual
          ? 'manual_sleep_active'
          : this.currentEnergy >= safeCost
            ? null
            : 'insufficient_energy'
    };
  }


  canPerformActivity(activityType = 'minigame_forensic') {
    const cost = this.getActivityCost(activityType);
    const affordability = this.canAfford(cost);


    return {
      ...affordability,
      activityType,
      cost
    };
  }


  canPerformInterview(duration = 'medium') {
    const cost = this.getInterviewCost(duration);
    const affordability = this.canAfford(cost);


    return {
      ...affordability,
      duration,
      cost
    };
  }


  getInsufficientEnergyMessage(requiredEnergy) {
    const required = Math.max(
      0,
      Math.round(Number(requiredEnergy) || 0)
    );


    const missing = Math.max(
      0,
      required - this.currentEnergy
    );


    if (this.isSleepingForced || this.isSleepingManual) {
      return 'You are currently asleep. Even brilliant deductions can wait.';
    }


    if (missing <= 0) {
      return 'You have enough energy for this activity.';
    }


    return (
      `You need ${required} energy for this activity. ` +
      `You have ${this.currentEnergy}. ` +
      `Rest, eat, or drink first.`
    );
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
    if (this.currentEnergy >= 80) {
      return ENERGY_TOOLTIPS.high;
    }


    if (this.currentEnergy >= 50) {
      return ENERGY_TOOLTIPS.medium;
    }


    if (this.currentEnergy >= 20) {
      return ENERGY_TOOLTIPS.low;
    }


    return ENERGY_TOOLTIPS.critical;
  }


  consumeInterview(duration = 'medium') {
    const cost = this.getInterviewCost(duration);
    const affordability = this.canAfford(cost);


    if (!affordability.ok) {
      return {
        success: false,
        reason: affordability.reason,
        duration,
        activityType: `interview_${duration}`,
        amount: cost,
        cost,
        currentEnergy: this.currentEnergy,
        requiredEnergy: cost,
        missingEnergy: affordability.missingEnergy,
        message: this.getInsufficientEnergyMessage(cost)
      };
    }


    return this._consumeEnergy(
      cost,
      `Interview: -${cost}`,
      {
        requireFullAmount: true,
        activityType: `interview_${duration}`
      }
    );
  }


  consumeActivity(activityType = 'minigame_forensic') {
    const cost = this.getActivityCost(activityType);
    const affordability = this.canAfford(cost);


    if (!affordability.ok) {
      return {
        success: false,
        reason: affordability.reason,
        activityType,
        amount: cost,
        cost,
        currentEnergy: this.currentEnergy,
        requiredEnergy: cost,
        missingEnergy: affordability.missingEnergy,
        message: this.getInsufficientEnergyMessage(cost)
      };
    }


    return this._consumeEnergy(
      cost,
      `Activity (${activityType}): -${cost}`,
      {
        requireFullAmount: true,
        activityType
      }
    );
  }


  consumeCustom(cost, label = 'Energy changed.', options = {}) {
    const safeCost = Math.max(
      0,
      Math.round(Number(cost) || 0)
    );


    return this._consumeEnergy(
      safeCost,
      label,
      {
        requireFullAmount: Boolean(options.requireFullAmount),
        activityType: options.activityType || 'custom'
      }
    );
  }


  startManualSleep(sleepHours = 8) {
    if (sleepHours <= 0) {
      return {
        success: false,
        reason: 'invalid_sleep_duration'
      };
    }


    if (this.isSleepingForced || this.isSleepingManual) {
      return {
        success: false,
        reason: 'sleep_already_active'
      };
    }


    this.isSleepingManual = true;


    EventBus.emit('manualSleepStarted', {
      sleepHours
    });


    return {
      success: true,
      sleepHours
    };
  }


  completeManualSleep(sleepHours = 8) {
    if (sleepHours <= 0) {
      this.isSleepingManual = false;
      return {
        success: false,
        reason: 'invalid_sleep_duration'
      };
    }


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


    EventBus.emit('advanceTime', sleepHours, 0);


    const result = this._recoverEnergy(
      recoveryAmount,
      `Sleep (${sleepHours}h): +${recoveryAmount}`,
      'sleep',
      sleepType
    );


    this.isSleepingManual = false;


    EventBus.emit('manualSleepFinished', {
      sleepHours,
      recovered: result.amount,
      energy: this.currentEnergy
    });


    return result;
  }


  sleep(sleepHours = 8) {
    const started = this.startManualSleep(sleepHours);


    if (!started.success) {
      return started;
    }


    return this.completeManualSleep(sleepHours);
  }


  cancelManualSleep() {
    this.isSleepingManual = false;
  }


  eat(foodQuality = 'normal') {
    const recovery =
      ENERGY_RECOVERY[`food_${foodQuality}`] ||
      ENERGY_RECOVERY.food_normal;


    return this._recoverEnergy(
      recovery,
      `Food (${foodQuality}): +${recovery}`,
      'food',
      foodQuality
    );
  }


  drink(drinkQuality = 'normal') {
    const recovery =
      ENERGY_RECOVERY[`drink_${drinkQuality}`] ||
      ENERGY_RECOVERY.drink_normal;


    return this._recoverEnergy(
      recovery,
      `Drink (${drinkQuality}): +${recovery}`,
      'drink',
      drinkQuality
    );
  }


  /**
   * Publiczne odzyskiwanie energii o dowolną wartość.
   * Używane przez przedmioty z katalogu (metadata.effect.energy).
   *
   * options.recoveryType    - np. 'item'
   * options.recoverySubtype - np. id przedmiotu
   */
  recoverCustom(amount, label = 'Energy restored.', options = {}) {
    const safeAmount = Math.max(
      0,
      Math.round(Number(amount) || 0)
    );


    if (safeAmount <= 0) {
      return {
        success: false,
        reason: 'invalid_amount'
      };
    }


    if (this.isSleepingForced || this.isSleepingManual) {
      return {
        success: false,
        reason: this.isSleepingForced
          ? 'forced_sleep_active'
          : 'manual_sleep_active',
        message: this.getInsufficientEnergyMessage(0)
      };
    }


    if (this.currentEnergy >= this.maxEnergy) {
      return {
        success: false,
        reason: 'energy_full'
      };
    }


    return this._recoverEnergy(
      safeAmount,
      label,
      options.recoveryType || 'custom',
      options.recoverySubtype || ''
    );
  }


  _consumeEnergy(amount, label, options = {}) {
    const safeAmount = Math.max(
      0,
      Math.round(Number(amount) || 0)
    );


    const requireFullAmount = Boolean(options.requireFullAmount);


    if (safeAmount <= 0) {
      return {
        success: false,
        reason: 'invalid_amount'
      };
    }


    if (this.isSleepingForced || this.isSleepingManual) {
      return {
        success: false,
        reason: this.isSleepingForced
          ? 'forced_sleep_active'
          : 'manual_sleep_active',
        amount: safeAmount,
        currentEnergy: this.currentEnergy,
        message: this.getInsufficientEnergyMessage(safeAmount)
      };
    }


    if (
      requireFullAmount &&
      this.currentEnergy < safeAmount
    ) {
      return {
        success: false,
        reason: 'insufficient_energy',
        amount: safeAmount,
        cost: safeAmount,
        currentEnergy: this.currentEnergy,
        requiredEnergy: safeAmount,
        missingEnergy: safeAmount - this.currentEnergy,
        message: this.getInsufficientEnergyMessage(safeAmount)
      };
    }


    const previousEnergy = this.currentEnergy;


    this.currentEnergy = Math.max(
      0,
      this.currentEnergy - safeAmount
    );


    this.lastEnergyChange = {
      type: 'consume',
      amount: -safeAmount,
      label,
      activityType: options.activityType || null,
      beforeEnergy: previousEnergy,
      afterEnergy: this.currentEnergy,
      timestamp: Date.now()
    };


    this._recordAndEmit();


    if (this.currentEnergy === 0) {
      this._triggerForcedSleep();


      return {
        success: true,
        amount: safeAmount,
        label,
        activityType: options.activityType || null,
        energyReachedZero: true,
        status: 'Exhausted and collapsed'
      };
    }


    if (
      previousEnergy > 20 &&
      this.currentEnergy <= 20
    ) {
      EventBus.emit('energyWarning', {
        energy: this.currentEnergy,
        status: this.getEnergyStatus()
      });
    }


    return {
      success: true,
      amount: safeAmount,
      label,
      activityType: options.activityType || null,
      energyReachedZero: false,
      status: this.getEnergyStatus()
    };
  }


  _recoverEnergy(
    amount,
    label,
    recoveryType = 'unknown',
    recoverySubtype = ''
  ) {
    if (amount <= 0) {
      return {
        success: false,
        reason: 'invalid_amount'
      };
    }


    const previousEnergy = this.currentEnergy;


    this.currentEnergy = Math.min(
      this.maxEnergy,
      this.currentEnergy + amount
    );


    const actualRecovery =
      this.currentEnergy - previousEnergy;


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
    if (this.isSleepingForced || this.isSleepingManual) {
      return;
    }


    this.isSleepingForced = true;


    const shouldShowHollyIntro =
      gameState.hollyFirstSleepSeen !== true;


    if (shouldShowHollyIntro) {
      gameState.hollyFirstSleepSeen = true;


      EventBus.emit('firstForcedSleepStory', {
        sceneKey: 'HollyIntroScene',
        sleepHours: FORCED_SLEEP_HOURS,
        energy: 0
      });
    }


    EventBus.emit('energyZero', {
      energy: 0,
      status: 'Exhausted',
      sleepHours: FORCED_SLEEP_HOURS,
      message:
        'You collapse from exhaustion and sleep for ' +
        `${FORCED_SLEEP_HOURS} hours...`,
      firstSleepStory: shouldShowHollyIntro
    });


    EventBus.emit(
      'advanceTime',
      FORCED_SLEEP_HOURS,
      0
    );


    this.forcedSleepTimer = setTimeout(() => {
      if (!this.isSleepingForced) {
        return;
      }


      const previousEnergy = this.currentEnergy;


      this.currentEnergy = this.maxEnergy;


      this.lastEnergyChange = {
        type: 'recover',
        amount: this.maxEnergy - previousEnergy,
        label:
          `Forced sleep (${FORCED_SLEEP_HOURS}h): ` +
          `+${this.maxEnergy - previousEnergy}`,
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
    if (!this.lastEnergyChange) {
      return;
    }


    this.energyLog.push(
      cloneData(this.lastEnergyChange)
    );


    if (this.energyLog.length > 50) {
      this.energyLog.shift();
    }
  }


  _syncToGameState() {
    gameState.updateState({
      energy: this.currentEnergy,
      maxEnergy: this.maxEnergy,
      difficulty: this.difficulty
    });
  }


  _emitEnergyChanged() {
    EventBus.emit('energyChanged', {
      current: this.currentEnergy,
      max: this.maxEnergy,
      percent: Math.round(
        (this.currentEnergy / this.maxEnergy) * 100
      ),
      status: this.getEnergyStatus(),
      color: this.getEnergyColor(),
      tooltip: this.getEnergyTooltip(),
      lastChange: cloneData(this.lastEnergyChange)
    });
  }


  getCurrentEnergy() {
    return this.currentEnergy;
  }


  getMaxEnergy() {
    return this.maxEnergy;
  }


  getEnergyLog() {
    return cloneData(this.energyLog);
  }


  isForcedSleepActive() {
    return this.isSleepingForced;
  }


  isManualSleepActive() {
    return this.isSleepingManual;
  }


  reset(difficulty = 'field') {
    this.init(difficulty);
  }


  restore(data = {}) {
    const savedMaxEnergy = Number(data.maxEnergy);


    if (
      Number.isFinite(savedMaxEnergy) &&
      savedMaxEnergy > 0
    ) {
      this.maxEnergy = Math.round(savedMaxEnergy);
    }


    const savedEnergy = Number(data.energy);


    if (Number.isFinite(savedEnergy)) {
      this.currentEnergy = Math.max(
        0,
        Math.min(
          this.maxEnergy,
          Math.round(savedEnergy)
        )
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
      this.energyLog = cloneData(
        data.energyLog
      ).slice(-50);
    } else {
      this.energyLog = [];
    }


    this.lastEnergyChange = null;
    this.isSleepingForced = false;
    this.isSleepingManual = false;


    if (this.forcedSleepTimer) {
      clearTimeout(this.forcedSleepTimer);
      this.forcedSleepTimer = null;
    }


    this._syncToGameState();
    this._emitEnergyChanged();


    console.log(
      '[EnergyManager] Energy restored from save.',
      {
        energy: this.currentEnergy,
        maxEnergy: this.maxEnergy,
        difficulty: this.difficulty
      }
    );


    return this.currentEnergy;
  }


  serialize() {
    return {
      energy: this.currentEnergy,
      maxEnergy: this.maxEnergy,
      difficulty: this.difficulty,
      energyLog: cloneData(this.energyLog)
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