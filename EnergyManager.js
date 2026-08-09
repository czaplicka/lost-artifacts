import { EventBus } from './EventBus.js';
import { gameState } from './GameData.js';

// ============================================================
// EnergyManager.js
// Singleton manager systemu energii dla Lost Artifacts
// - Zarządza poziomem energii gracza (0-100)
// - Skaluje zużycie energii w zależności od poziomu trudności
// - Emituje eventy dla UI i logów
// - Obsługuje zasyspianie na 0% (time penalty)
// ============================================================

const DIFFICULTY_MULTIPLIERS = {
  rookie: 0.7,    // -30% zużycia
  field: 1.0,     // baseline
  master: 1.4     // +40% zużycia
};

// Wartości bazowe (dla difficulty: field)
const ENERGY_COSTS = {
  travel: {
    taxi: 8,
    train: 12,
    cheap_flight: 20,
    expensive_flight: 10
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
  sleep_short: 40,      // 2h
  sleep_medium: 60,     // 4h
  sleep_full: 100,      // 8h+
  food_cheap: 10,
  food_normal: 15,
  food_expensive: 20,
  drink_cheap: 5,
  drink_normal: 8,
  drink_expensive: 10
};

const ENERGY_THRESHOLDS = {
  fresh: { min: 61, max: 100, status: 'Fresh', color: 0x4CAF50 },
  tired: { min: 31, max: 60, status: 'Tired', color: 0xFF9800 },
  exhausted: { min: 0, max: 30, status: 'Exhausted', color: 0xF44336 }
};

const ENERGY_TOOLTIPS = {
  '80-100': 'Functioning adult.',
  '50-79': 'Running on coffee and denial.',
  '20-49': 'Questionable detective choices ahead.',
  '0-19': 'Legally too tired to solve crimes.'
};

class EnergyManager {
  constructor() {
    this.currentEnergy = 100;
    this.maxEnergy = 100;
    this.difficulty = 'field'; // rookie, field, master
    this.energyLog = [];
    this.lastEnergyChange = null;
    this.isSleepingForced = false;
  }

  /**
   * Inicjalizuje manager na początek gry
   */
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

    gameState.energy = this.maxEnergy;
    gameState.energyLog = [];
    gameState.difficulty = difficulty;

    EventBus.emit('energyInitialized', {
      energy: this.currentEnergy,
      difficulty: this.difficulty,
      status: this.getEnergyStatus()
    });
  }

  /**
   * Pobiera mnożnik trudności
   */
  getDifficultyMultiplier() {
    return DIFFICULTY_MULTIPLIERS[this.difficulty] || 1.0;
  }

  /**
   * Pobrania skalowanego kosztu energii
   */
  scaleCost(baseCost) {
    return Math.ceil(baseCost * this.getDifficultyMultiplier());
  }

  /**
   * Pobiera status energii (Fresh, Tired, Exhausted)
   */
  getEnergyStatus() {
    const energy = this.currentEnergy;
    if (energy >= ENERGY_THRESHOLDS.fresh.min) {
      return ENERGY_THRESHOLDS.fresh.status;
    } else if (energy >= ENERGY_THRESHOLDS.tired.min) {
      return ENERGY_THRESHOLDS.tired.status;
    } else {
      return ENERGY_THRESHOLDS.exhausted.status;
    }
  }

  /**
   * Pobiera kolor statusu energii
   */
  getEnergyColor() {
    const energy = this.currentEnergy;
    if (energy >= ENERGY_THRESHOLDS.fresh.min) {
      return ENERGY_THRESHOLDS.fresh.color;
    } else if (energy >= ENERGY_THRESHOLDS.tired.min) {
      return ENERGY_THRESHOLDS.tired.color;
    } else {
      return ENERGY_THRESHOLDS.exhausted.color;
    }
  }

  /**
   * Pobiera tooltip dla bieżącego poziomu energii
   */
  getEnergyTooltip() {
    const energy = this.currentEnergy;
    if (energy >= 80) return ENERGY_TOOLTIPS['80-100'];
    if (energy >= 50) return ENERGY_TOOLTIPS['50-79'];
    if (energy >= 20) return ENERGY_TOOLTIPS['20-49'];
    return ENERGY_TOOLTIPS['0-19'];
  }

  /**
   * Zużywa energię dla podróży
   */
  consumeTravel(transportType = 'train') {
    const baseCost = ENERGY_COSTS.travel[transportType] || ENERGY_COSTS.travel.train;
    const scaledCost = this.scaleCost(baseCost);
    const label = `Travel (${transportType}): -${scaledCost}`;

    return this._consumeEnergy(scaledCost, label);
  }

  /**
   * Zużywa energię dla rozmowy
   */
  consumeInterview(duration = 'medium') {
    const baseCost = ENERGY_COSTS.interaction[`interview_${duration}`] || 4;
    const scaledCost = this.scaleCost(baseCost);
    const label = `Interview: -${scaledCost}`;

    return this._consumeEnergy(scaledCost, label);
  }

  /**
   * Zużywa energię dla aktywności
   */
  consumeActivity(activityType = 'minigame_forensic') {
    const baseCost = ENERGY_COSTS.activity[activityType] || 8;
    const scaledCost = this.scaleCost(baseCost);
    const label = `Activity (${activityType}): -${scaledCost}`;

    return this._consumeEnergy(scaledCost, label);
  }

  /**
   * Zużywa energię (wewnętrzna metoda)
   */
  _consumeEnergy(amount, label = 'Energy consumed') {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };

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

    this._logEnergyChange();
    this._syncToGameState();
    this._emitEnergyChanged();

    // Sprawdzenie czy gracz zapada w sen na stojąco
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

    // Warning przy 20%
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

  /**
   * Regeneruje energię (spanie)
   */
  sleep(sleepHours = 8) {
    if (sleepHours <= 0) {
      return { success: false, reason: 'invalid_sleep_duration' };
    }

    let recoveryAmount;
    let sleepType;

    if (sleepHours <= 2) {
      recoveryAmount = ENERGY_RECOVERY.sleep_short;
      sleepType = 'short';
    } else if (sleepHours <= 4) {
      recoveryAmount = ENERGY_RECOVERY.sleep_medium;
      sleepType = 'medium';
    } else {
      recoveryAmount = ENERGY_RECOVERY.sleep_full;
      sleepType = 'full';
    }

    // Skalowanie dla trudności (spanie się nie skaluje negatywnie dla Master)
    // ale zwiększamy regenerację dla Rookie
    const diffMultiplier = this.difficulty === 'rookie' ? 1.15 : 1.0;
    recoveryAmount = Math.ceil(recoveryAmount * diffMultiplier);

    const label = `Sleep (${sleepHours}h): +${recoveryAmount}`;
    return this._recoverEnergy(recoveryAmount, label, sleepType, sleepHours);
  }

  /**
   * Regeneruje energię (jedzenie)
   */
  eat(foodQuality = 'normal') {
    const recoveryAmount = ENERGY_RECOVERY[`food_${foodQuality}`] || 15;
    const label = `Food (${foodQuality}): +${recoveryAmount}`;

    return this._recoverEnergy(recoveryAmount, label, 'food', foodQuality);
  }

  /**
   * Regeneruje energię (picie)
   */
  drink(drinkQuality = 'normal') {
    const recoveryAmount = ENERGY_RECOVERY[`drink_${drinkQuality}`] || 8;
    const label = `Drink (${drinkQuality}): +${recoveryAmount}`;

    return this._recoverEnergy(recoveryAmount, label, 'drink', drinkQuality);
  }

  /**
   * Regeneruje energię (wewnętrzna metoda)
   */
  _recoverEnergy(amount, label = 'Energy recovered', type = 'unknown', subtype = '') {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };

    const previousEnergy = this.currentEnergy;
    this.currentEnergy = Math.min(this.maxEnergy, this.currentEnergy + amount);

    const actualRecovery = this.currentEnergy - previousEnergy;

    this.lastEnergyChange = {
      type: 'recover',
      amount: actualRecovery,
      label,
      recoveryType: type,
      recoverySubtype: subtype,
      beforeEnergy: previousEnergy,
      afterEnergy: this.currentEnergy,
      timestamp: Date.now()
    };

    this._logEnergyChange();
    this._syncToGameState();
    this._emitEnergyChanged();
    this.isSleepingForced = false;

    return {
      success: true,
      amount: actualRecovery,
      label,
      status: this.getEnergyStatus()
    };
  }

  /**
   * Wewnętrzny handler dla wymuszenia snu na 0% energii
   */
  _triggerForcedSleep() {
    this.isSleepingForced = true;

    EventBus.emit('energyZero', {
      energy: 0,
      status: 'Exhausted',
      message: 'You collapse from exhaustion and sleep for 8 hours...'
    });

    // Gracz śpi 8 godzin i regeneruje do 100
    setTimeout(() => {
      if (this.isSleepingForced) {
        this.currentEnergy = this.maxEnergy;
        this._syncToGameState();
        this._emitEnergyChanged();
        this.isSleepingForced = false;

        EventBus.emit('energyRecovered', {
          energy: this.maxEnergy,
          reason: 'forced_sleep'
        });
      }
    }, 2000);
  }

  /**
   * Loguje zmianę energii
   */
  _logEnergyChange() {
    if (!this.lastEnergyChange) return;

    this.energyLog.push(structuredClone(this.lastEnergyChange));

    // Limit logu do ostatnich 50 wpisów
    if (this.energyLog.length > 50) {
      this.energyLog.shift();
    }
  }

  /**
   * Synchronizuje do gameState
   */
  _syncToGameState() {
    gameState.energy = this.currentEnergy;
    gameState.energyLog = [...this.energyLog];
    gameState.difficulty = this.difficulty;
  }

  /**
   * Emituje event o zmianie energii
   */
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

  /**
   * Pobiera bieżący poziom energii
   */
  getCurrentEnergy() {
    return this.currentEnergy;
  }

  /**
   * Pobiera log energii
   */
  getEnergyLog() {
    return [...this.energyLog];
  }

  /**
   * Resetuje energię (nowa gra)
   */
  reset(difficulty = 'field') {
    this.init(difficulty);
  }

  /**
   * Restoruje energię z savedata
   */
  restore(data = {}) {
    if (Number.isFinite(data.energy)) {
      this.currentEnergy = Math.max(0, Math.min(this.maxEnergy, data.energy));
    }
    if (typeof data.difficulty === 'string' && DIFFICULTY_MULTIPLIERS[data.difficulty]) {
      this.difficulty = data.difficulty;
    }
    if (Array.isArray(data.energyLog)) {
      this.energyLog = structuredClone(data.energyLog);
    }

    this._syncToGameState();
    this._emitEnergyChanged();
  }

  /**
   * Serializuje do save data
   */
  serialize() {
    return {
      energy: this.currentEnergy,
      maxEnergy: this.maxEnergy,
      difficulty: this.difficulty,
      energyLog: structuredClone(this.energyLog)
    };
  }
}

// Singleton instance
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