import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { resourcefulnessManager } from './ResourcefulnessManager.js';
import { HQExhaustionCallUI } from '../ui/HQExhaustionCallUI.js';
import { DEFAULT_DIFFICULTY, getDifficultyConfig, isValidDifficulty } from '../DifficultySettings.js';

const FORCED_SLEEP_HOURS = 6;
const COSTS = {
  interview_short: 5, interview_medium: 7, interview_long: 10,
  crime_scene: 24, hidden_objects: 18, minigame_forensic: 12,
  minigame_mastermind: 10, csi_lab: 32, apartment_visit: 15
};
const RECOVERY = { sleep_short: 40, sleep_medium: 60, sleep_full: 100,
  food_cheap: 10, food_normal: 15, food_expensive: 20,
  drink_cheap: 5, drink_normal: 8, drink_expensive: 10 };
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const positive = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;

class EnergyManager {
  constructor() {
    this.currentEnergy = 100; this.maxEnergy = 100;
    this.difficulty = DEFAULT_DIFFICULTY;
    this.energyLog = []; this.energyModifiers = []; this.lastEnergyChange = null;
    this.isSleepingForced = false; this.isSleepingManual = false;
    this.forcedSleepSession = null; this.forcedSleepTimer = null;
    this.forcedSleepRemainingMs = 0; this.forcedSleepTimerStartedAt = 0;
    this.forcedSleepOverlay = null; this.restoreSleepTimer = null;
    this.hqExhaustionIncidents = 0; this.hqExhaustionCallPending = false;
    this.hqExhaustionWarningSeen = false; this.restClockPending = false;
    this.exhaustionGameOverPending = false;
    this.hqCallUI = new HQExhaustionCallUI();
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._onTimeAdvanced = this._onTimeAdvanced.bind(this);
    this._onSleepFinished = this._onSleepFinished.bind(this);
    EventBus.on('gameTime:advanced', this._onTimeAdvanced);
    EventBus.on('manualSleepFinished', this._onSleepFinished);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this._onVisibilityChange);
  }
  destroy() {
    EventBus.off('gameTime:advanced', this._onTimeAdvanced);
    EventBus.off('manualSleepFinished', this._onSleepFinished);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this._onVisibilityChange);
    clearTimeout(this.restoreSleepTimer); this._clearForcedSleepTimer();
    this._removeForcedSleepOverlay(); this.hqCallUI.destroy();
  }
  init(difficulty = DEFAULT_DIFFICULTY) {
    clearTimeout(this.restoreSleepTimer); this._clearForcedSleepTimer();
    this._removeForcedSleepOverlay(); this.hqCallUI.destroy();
    this.difficulty = isValidDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
    this.currentEnergy = this.maxEnergy; this.energyLog = []; this.energyModifiers = [];
    this.lastEnergyChange = null; this.isSleepingForced = false; this.isSleepingManual = false;
    this.forcedSleepSession = null; this.restClockPending = false;
    this.hqExhaustionIncidents = 0; this.hqExhaustionCallPending = false;
    this.hqExhaustionWarningSeen = false; this.exhaustionGameOverPending = false;
    this._saveBalance({ awakeMinutes: 0, fatigueRemainder: 0, lastSleepMinutes: null });
    this._syncToGameState();
    EventBus.emit('energyInitialized', { energy: this.currentEnergy, difficulty: this.difficulty, status: this.getEnergyStatus() });
  }
  _balance() {
    return gameState.currentMission?.energyBalance || { awakeMinutes: 0, fatigueRemainder: 0, lastSleepMinutes: null };
  }
  _saveBalance(values) {
    if (gameState.currentMission) gameState.currentMission.energyBalance = { ...this._balance(), ...values };
  }
  _onTimeAdvanced({ addedMinutes = 0 } = {}) {
    const minutes = positive(addedMinutes);
    if (!minutes) return;
    if (this.isSleepingForced || this.isSleepingManual || this.restClockPending) {
      this.restClockPending = false; return;
    }
    if (!gameState.isGameActive || gameState.caseFailed || gameState.caseResolved) return;
    const before = this._balance();
    const awakeMinutes = positive(before.awakeMinutes) + minutes;
    const total = positive(before.fatigueRemainder) + minutes * 3 / 60 * this.getEffectiveEnergyMultiplier();
    const cost = Math.floor(total);
    this._saveBalance({ awakeMinutes, fatigueRemainder: total - cost });
    if (cost) this._consumeEnergy(cost, `${__dialogueText("managers/EnergyManager.js", "t_7170e28511adddffcd72")}${cost}`, { activityType: 'time_fatigue' });
    if (positive(before.awakeMinutes) < 16 * 60 && awakeMinutes >= 16 * 60) {
      EventBus.emit('energyWarning', { energy: this.currentEnergy, status: 'Time to sleep',
        message: __dialogueText("managers/EnergyManager.js", "t_96ac6996ab86f6d762fe") });
    }
  }
  _onSleepFinished({ sleepHours = 0 } = {}) {
    this.restClockPending = false;
    const restedMinutes = positive(sleepHours) * 60;
    this._saveBalance({ awakeMinutes: restedMinutes >= 240 ? 0 : Math.max(0, positive(this._balance().awakeMinutes) - restedMinutes * 2),
      fatigueRemainder: 0, lastSleepMinutes: restedMinutes });
    this._requestAutosave();
  }
  getDifficultyMultiplier() { return getDifficultyConfig(this.difficulty).energyCostMultiplier; }
  getTemporaryEnergyMultiplier() { return this.energyModifiers.reduce((v, m) => v * m.multiplier, 1); }
  getEffectiveEnergyMultiplier() { return this.getDifficultyMultiplier() * this.getTemporaryEnergyMultiplier(); }
  scaleCost(cost) { return Math.ceil(positive(cost) * this.getEffectiveEnergyMultiplier()); }
  addEnergyModifier({ id, label = __dialogueText("managers/EnergyManager.js", "t_8bbfd56be5584eeccf62"), multiplier, durationHours, group = null } = {}) {
    if (typeof id !== 'string' || !id.trim() || !Number.isFinite(Number(multiplier)) || Number(multiplier) <= 0 ||
        !Number.isFinite(Number(durationHours)) || Number(durationHours) <= 0) return { success: false, reason: 'invalid_energy_modifier' };
    id = id.trim();
    const safeGroup = typeof group === 'string' && group.trim() ? group.trim() : null;
    this.energyModifiers = this.energyModifiers.filter(m => m.id !== id && (!safeGroup || m.group !== safeGroup));
    const modifier = { id, label: String(label), multiplier: Number(multiplier), remainingHours: Number(durationHours), group: safeGroup };
    this.energyModifiers.push(modifier); this._notifyModifiersChanged();
    return { success: true, modifier: clone(modifier) };
  }
  removeEnergyModifier(id) {
    const length = this.energyModifiers.length;
    this.energyModifiers = this.energyModifiers.filter(m => m.id !== id);
    if (length !== this.energyModifiers.length) this._notifyModifiersChanged();
    return length !== this.energyModifiers.length;
  }
  getEnergyModifiers() { return clone(this.energyModifiers); }
  advanceModifierTime(hours) {
    if (!positive(hours)) return [];
    const expired = [];
    this.energyModifiers = this.energyModifiers.filter(m => {
      m.remainingHours = Math.max(0, m.remainingHours - hours);
      if (!m.remainingHours) expired.push(m.id);
      return m.remainingHours > 0;
    });
    if (expired.length || this.energyModifiers.length) this._notifyModifiersChanged();
    expired.forEach(id => EventBus.emit('energyModifierExpired', { id }));
    return expired;
  }
  applyIllness() {
    const s = getDifficultyConfig(this.difficulty).randomEvents.illness;
    return this.addEnergyModifier({ id: 'illness', label: __dialogueText("managers/EnergyManager.js", "t_efb378b41adcefe0baf1"), multiplier: s.workEnergyMultiplier,
      durationHours: s.workDurationHours, group: 'illness' });
  }
  applyIllnessRecovery() {
    const s = getDifficultyConfig(this.difficulty).randomEvents.illness;
    return this.addEnergyModifier({ id: 'illness_recovery', label: __dialogueText("managers/EnergyManager.js", "t_38628658593e5d90df7f"), multiplier: s.recoveryEnergyMultiplier,
      durationHours: s.recoveryDurationHours, group: 'illness' });
  }
  _notifyModifiersChanged() {
    this._syncToGameState(); this._emitEnergyChanged();
    EventBus.emit('energyModifiersChanged', { modifiers: this.getEnergyModifiers(), multiplier: this.getTemporaryEnergyMultiplier() });
  }
  getTravelCost(type = 'plane') {
    return this.scaleCost(({ plane: 3, train: 5, bus: 8, ship: 6, taxi: 2, cheap_flight: 4, expensive_flight: 2 })[type] ?? 3);
  }
  consumeTravel(type = 'plane') { const cost = this.getTravelCost(type); return this._consumeEnergy(cost, `${__dialogueText("managers/EnergyManager.js", "t_592efc34d9485f9ae821")}${type}${__dialogueText("managers/EnergyManager.js", "t_24e778466d407e0a9e47")}${cost}`, { activityType: `travel_${type}` }); }
  getActivityCostDetails(type = 'minigame_forensic') {
    const baseCost = COSTS[type] ?? COSTS.minigame_forensic, scaledCost = this.scaleCost(baseCost);
    return { ...resourcefulnessManager.getSearchEnergyQuote(type, scaledCost), baseCost, scaledCost };
  }
  getActivityCost(type = 'minigame_forensic') { return this.getActivityCostDetails(type).finalCost; }
  getActivityCostDescription(type = 'minigame_forensic') { return resourcefulnessManager.formatSearchEnergyQuote(this.getActivityCostDetails(type)); }
  getInterviewCost(duration = 'medium') { return this.scaleCost(COSTS[`interview_${duration}`] ?? COSTS.interview_medium); }
  isCriticalEnergy() { return this.currentEnergy / this.maxEnergy * 100 <= 1; }
  _needsSleep() { return positive(this._balance().awakeMinutes) >= 20 * 60; }
  _blockReason() {
    if (this.exhaustionGameOverPending || gameState.caseFailed && gameState.gameOverReason === 'exhaustion_repeat') return 'case_failed';
    if (this.isSleepingForced) return 'forced_sleep_active';
    if (this.isSleepingManual) return 'manual_sleep_active';
    if (this.hqExhaustionCallPending || this.hqCallUI.isOpen) return 'hq_call_active';
    return null;
  }
  canAfford(cost) {
    const required = Math.round(positive(cost));
    const reason = this._blockReason() || (this.currentEnergy < required ? 'insufficient_energy' : null);
    return { ok: !reason, currentEnergy: this.currentEnergy, requiredEnergy: required,
      missingEnergy: Math.max(0, required - this.currentEnergy), reason };
  }
  canPerformActivity(type = 'minigame_forensic') {
    const costDetails = this.getActivityCostDetails(type), cost = costDetails.finalCost;
    return { ...this.canAfford(cost), ...(this._needsSleep() ? { ok: false, reason: 'sleep_required' } : {}), activityType: type, cost, costDetails };
  }
  canPerformInterview(duration = 'medium') { const cost = this.getInterviewCost(duration); return { ...this.canAfford(cost), duration, cost }; }
  getInsufficientEnergyMessage(requiredEnergy) {
    if (this.isSleepingForced || this.isSleepingManual) return __dialogueText("managers/EnergyManager.js", "t_22df3f8db80a505b276e");
    if (this.hqExhaustionCallPending) return __dialogueText("managers/EnergyManager.js", "t_348f2d3582f6bbee97d8");
    if (this._needsSleep()) return __dialogueText("managers/EnergyManager.js", "t_ef3a81d24e02ac1223f5");
    const required = Math.round(positive(requiredEnergy));
    return required <= this.currentEnergy ? __dialogueText("managers/EnergyManager.js", "t_110c490f35f1c1a9992e")
      : `${__dialogueText("managers/EnergyManager.js", "t_98ac13ef339b53a527fd")}${required}${__dialogueText("managers/EnergyManager.js", "t_2a66717619a9c838cbcb")}${this.currentEnergy}${__dialogueText("managers/EnergyManager.js", "t_fb9237199c8cf1259fe0")}`;
  }
  getEnergyStatus() { return this.currentEnergy >= 61 ? __dialogueText("managers/EnergyManager.js", "t_f810b66877419ce9b801") : this.currentEnergy >= 31 ? __dialogueText("managers/EnergyManager.js", "t_3c4ce44c14d1e177cbe3") : __dialogueText("managers/EnergyManager.js", "t_a51ee30495b32b9124d1"); }
  getEnergyColor() { return this.currentEnergy >= 61 ? 0x4CAF50 : this.currentEnergy >= 31 ? 0xFF9800 : 0xF44336; }
  getEnergyTooltip() { return this.currentEnergy >= 80 ? __dialogueText("managers/EnergyManager.js", "t_acb77bb6ffbbc367f2ad") : this.currentEnergy >= 50 ? __dialogueText("managers/EnergyManager.js", "t_ab5dc21e9c010e696638") : this.currentEnergy >= 20 ? __dialogueText("managers/EnergyManager.js", "t_c48b83ecdbef77f900ee") : __dialogueText("managers/EnergyManager.js", "t_71dd8e79e1b629a84189"); }
  _failedConsumption(cost, type, extra = {}) {
    const check = this.canAfford(cost);
    if (check.ok) return null;
    if (this.isCriticalEnergy() && !this._blockReason()) this._triggerForcedSleep();
    return { success: false, reason: check.reason, activityType: type, amount: cost, cost,
      currentEnergy: this.currentEnergy, requiredEnergy: cost, missingEnergy: check.missingEnergy,
      message: this.getInsufficientEnergyMessage(cost), ...extra };
  }
  consumeInterview(duration = 'medium') {
    const cost = this.getInterviewCost(duration), activityType = `interview_${duration}`;
    return this._failedConsumption(cost, activityType, { duration }) || this._consumeEnergy(cost, `${__dialogueText("managers/EnergyManager.js", "t_b172161f84bb105ad30b")}${cost}`, { requireFullAmount: true, activityType });
  }
  consumeActivity(type = 'minigame_forensic') {
    const costDetails = this.getActivityCostDetails(type), cost = costDetails.finalCost;
    return this._failedConsumption(cost, type, { costDetails }) || {
      ...this._consumeEnergy(cost, `${__dialogueText("managers/EnergyManager.js", "t_bb3f4a885d70875ca1ef")}${type}${__dialogueText("managers/EnergyManager.js", "t_24e778466d407e0a9e47")}${cost}`, { requireFullAmount: true, activityType: type }), cost, costDetails };
  }
  consumeCustom(cost, label = __dialogueText("managers/EnergyManager.js", "t_be987d3c4a19256ef8b1"), options = {}) {
    return this._consumeEnergy(Math.round(positive(cost)), label, { requireFullAmount: Boolean(options.requireFullAmount), activityType: options.activityType || 'custom' });
  }
  startManualSleep(hours = 8) {
    hours = Number(hours);
    if (!Number.isFinite(hours) || hours <= 0) return { success: false, reason: 'invalid_sleep_duration' };
    if (this._blockReason()) return { success: false, reason: this._blockReason() };
    this.isSleepingManual = true;
    EventBus.emit('manualSleepStarted', { sleepHours: hours });
    return { success: true, sleepHours: hours };
  }
  completeManualSleep(hours = 8) {
    hours = Number(hours);
    if (!Number.isFinite(hours) || hours <= 0) { this.isSleepingManual = false; return { success: false, reason: 'invalid_sleep_duration' }; }
    const type = hours <= 2 ? 'short' : hours <= 4 ? 'medium' : 'full';
    const amount = Math.ceil(RECOVERY[`sleep_${type}`] * getDifficultyConfig(this.difficulty).sleepRecoveryMultiplier);
    EventBus.emit('advanceTime', hours, 0);
    const result = this._recoverEnergy(amount, `${__dialogueText("managers/EnergyManager.js", "t_dbebd86508d7008777d3")}${hours}${__dialogueText("managers/EnergyManager.js", "t_50a8dbfd0ac693918647")}${amount}`, 'sleep', type);
    this.isSleepingManual = false;
    EventBus.emit('manualSleepFinished', { sleepHours: hours, recovered: result.amount, energy: this.currentEnergy });
    return result;
  }
  sleep(hours = 8) { const result = this.startManualSleep(hours); return result.success ? this.completeManualSleep(hours) : result; }
  cancelManualSleep() { this.isSleepingManual = false; this.restClockPending = false; }
  eat(quality = 'normal') { const amount = RECOVERY[`food_${quality}`] || RECOVERY.food_normal; return this._recoverEnergy(amount, `${__dialogueText("managers/EnergyManager.js", "t_e33b22d735a971a3768f")}${quality}${__dialogueText("managers/EnergyManager.js", "t_d493c91e60f3456a26a0")}${amount}`, 'food', quality); }
  drink(quality = 'normal') { const amount = RECOVERY[`drink_${quality}`] || RECOVERY.drink_normal; return this._recoverEnergy(amount, `${__dialogueText("managers/EnergyManager.js", "t_0ec17a9bd703aa2e4975")}${quality}${__dialogueText("managers/EnergyManager.js", "t_d493c91e60f3456a26a0")}${amount}`, 'drink', quality); }
  recoverCustom(amount, label = __dialogueText("managers/EnergyManager.js", "t_abb65df236c300aea224"), options = {}) {
    const value = Math.round(positive(amount));
    if (!value) return { success: false, reason: 'invalid_amount' };
    if (this._blockReason()) return { success: false, reason: this._blockReason(), message: this.getInsufficientEnergyMessage(0) };
    // HotelSleep cancels its manual lock before recovery and advances the clock next.
    if (options.recoveryType === 'sleep') this.restClockPending = true;
    if (this.currentEnergy >= this.maxEnergy) return { success: false, reason: 'energy_full' };
    return this._recoverEnergy(value, label, options.recoveryType || 'custom', options.recoverySubtype || '');
  }
  _consumeEnergy(amount, label, options = {}) {
    const cost = Math.round(positive(amount));
    if (this._needsSleep() && options.activityType !== 'time_fatigue' && options.activityType !== 'travel_taxi') {
      return { success: false, reason: 'sleep_required', amount: cost, currentEnergy: this.currentEnergy,
        message: __dialogueText("managers/EnergyManager.js", "t_e1c0e90b0da7f6b3d976") };
    }
    if (!cost) return { success: false, reason: 'invalid_amount' };
    if (this._blockReason()) return { success: false, reason: this._blockReason(), amount: cost, currentEnergy: this.currentEnergy, message: this.getInsufficientEnergyMessage(cost) };
    if (options.requireFullAmount && this.currentEnergy < cost) return this._failedConsumption(cost, options.activityType || 'custom');
    const before = this.currentEnergy;
    this.currentEnergy = Math.max(0, before - cost);
    this.lastEnergyChange = { type: 'consume', amount: this.currentEnergy - before, label,
      activityType: options.activityType || null, beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
    const forcedSleepTriggered = this.isCriticalEnergy();
    this._recordAndEmit();
    if (forcedSleepTriggered) this._triggerForcedSleep();
    else if (before > 25 && this.currentEnergy <= 25) EventBus.emit('energyWarning', { energy: this.currentEnergy, status: this.getEnergyStatus(), message: __dialogueText("managers/EnergyManager.js", "t_1cec0f15d8e36ad746ee") });
    return { success: true, amount: cost, label, activityType: options.activityType || null,
      energyReachedZero: this.currentEnergy === 0, forcedSleepTriggered,
      status: this.exhaustionGameOverPending ? 'Game over' : forcedSleepTriggered ? 'Sleeping at Agency Motel' : this.getEnergyStatus() };
  }
  _recoverEnergy(amount, label, recoveryType = 'unknown', recoverySubtype = '') {
    if (this.isSleepingForced || this.exhaustionGameOverPending) return { success: false, reason: 'forced_sleep_active' };
    const before = this.currentEnergy;
    this.currentEnergy = Math.min(this.maxEnergy, before + positive(amount));
    this.lastEnergyChange = { type: 'recover', amount: this.currentEnergy - before, label,
      recoveryType, recoverySubtype, beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
    this._recordAndEmit();
    return { success: true, amount: this.currentEnergy - before, label, status: this.getEnergyStatus() };
  }
  _triggerForcedSleep() {
    if (this._blockReason()) return;
    this.hqExhaustionIncidents++;
    if (this.hqExhaustionIncidents >= 2) { this._failRepeatedExhaustion(); return; }
    this.isSleepingForced = true; this._beginForcedSleep();
  }
  _beginForcedSleep() {
    if (this.forcedSleepSession) return;
    this.forcedSleepSession = { hotelId: 'agency', hotelLabel: __dialogueText("managers/EnergyManager.js", "t_c4c28e65f9cb467fb8c0"), cityId: gameState.currentCityId || gameState.crimeCityId || null,
      sleepHours: FORCED_SLEEP_HOURS, cost: 0, timeCharged: false };
    this._showForcedSleepOverlay();
    const first = gameState.hollyFirstSleepSeen !== true;
    if (first) {
      gameState.hollyFirstSleepSeen = true;
      EventBus.emit('firstForcedSleepStory', { sceneKey: 'HollyIntroScene', sleepHours: FORCED_SLEEP_HOURS, energy: this.currentEnergy });
    }
    EventBus.emit('energyZero', { energy: this.currentEnergy, status: 'Exhausted', sleepHours: FORCED_SLEEP_HOURS,
      hotelId: 'agency', hotelLabel: __dialogueText("managers/EnergyManager.js", "t_c4c28e65f9cb467fb8c0"), cost: 0, message: __dialogueText("managers/EnergyManager.js", "t_66dae48af5bfa314b2b2"), firstSleepStory: first });
    this.forcedSleepSession.timeCharged = true; this._syncToGameState();
    EventBus.emit('advanceTime', FORCED_SLEEP_HOURS, 0);
    this._startForcedSleepTimer(2000);
  }
  _failRepeatedExhaustion() {
    this.exhaustionGameOverPending = true;
    this._clearForcedSleepTimer(); this._removeForcedSleepOverlay(); this.hqCallUI.destroy();
    this.isSleepingForced = false; this.isSleepingManual = false; this.forcedSleepSession = null;
    this.hqExhaustionCallPending = false;
    gameState.updateState({ caseFailed: true, caseResolved: false, isGameActive: false,
      finalArrestResult: 'FAILURE', gameOverReason: 'exhaustion_repeat' });
    this._syncToGameState(); this._requestAutosave();
    const mission = gameState.currentMission;
    // Leave the current action's stack before changing Phaser scenes.
    setTimeout(async () => {
      if (!this.exhaustionGameOverPending || gameState.currentMission !== mission || gameState.gameOverReason !== 'exhaustion_repeat') return;
      const game = typeof window !== 'undefined' ? window.game : null;
      if (!game?.scene) { console.error('[EnergyManager] Game over recorded, but Phaser game is unavailable.'); return; }
      const data = { reasonCode: 'exhaustion_repeat', title: __dialogueText("managers/EnergyManager.js", "t_9ba34a109b0280daa2c3"),
        message: __dialogueText("managers/EnergyManager.js", "t_d04d0f60a36164ba9b13"),
        caseId: gameState.currentCaseId };
      const ignored = new Set(['UIScene', 'NewsHud', 'PlayerHudScene', 'GameOverScene', '__LostArtifactsAudioHost']);
      const scene = game.scene.getScenes(true).find(s => !ignored.has(s.sys.settings.key) && typeof s.goto === 'function');
      try {
        const opened = scene ? await scene.goto('GameOverScene', data) : false;
        if (!opened && this.exhaustionGameOverPending && gameState.gameOverReason === 'exhaustion_repeat') {
          await game.sceneLoader?.ensure('GameOverScene');
          if (!this.exhaustionGameOverPending || gameState.currentMission !== mission || gameState.gameOverReason !== 'exhaustion_repeat') return;
          game.scene.start('GameOverScene', data);
        }
      } catch (error) { console.error('[EnergyManager] Could not open GameOverScene:', error); }
    }, 0);
  }
  _showForcedSleepOverlay() {
    this._removeForcedSleepOverlay();
    if (typeof document === 'undefined' || !document.body) return;
    const root = document.createElement('div');
    root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
    Object.assign(root.style, { position: 'fixed', inset: '0', zIndex: '2147483647', background: __dialogueText("managers/EnergyManager.js", "t_dce3ee4484a0dbaa5793"), display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px', boxSizing: 'border-box', color: '#f1e6b8', pointerEvents: 'auto' });
    const card = document.createElement('div');
    Object.assign(card.style, { maxWidth: '620px', textAlign: 'center', border: __dialogueText("managers/EnergyManager.js", "t_118e22550bbdf5311a15"), padding: __dialogueText("managers/EnergyManager.js", "t_c9babe61ea14bd1f903b"),
      background: '#17110e', fontFamily: 'SpecialElite, serif', fontSize: '22px', lineHeight: '1.7', whiteSpace: 'pre-line' });
    card.textContent = __dialogueText("managers/EnergyManager.js", "t_a4c1604c45e6f2d96655");
    root.append(card); document.body.append(root); this.forcedSleepOverlay = root;
  }
  _removeForcedSleepOverlay() { this.forcedSleepOverlay?.remove(); this.forcedSleepOverlay = null; }
  _clearForcedSleepTimer() { clearTimeout(this.forcedSleepTimer); this.forcedSleepTimer = null; this.forcedSleepRemainingMs = 0; this.forcedSleepTimerStartedAt = 0; }
  _startForcedSleepTimer(ms) {
    this._clearForcedSleepTimer(); this.forcedSleepRemainingMs = Math.max(0, ms);
    if (typeof document === 'undefined' || !document.hidden) this._scheduleForcedSleepTimer();
  }
  _scheduleForcedSleepTimer() {
    this.forcedSleepTimerStartedAt = Date.now();
    this.forcedSleepTimer = setTimeout(() => { this.forcedSleepTimer = null; this.forcedSleepRemainingMs = 0; this._finishForcedSleep(); }, this.forcedSleepRemainingMs);
  }
  _onVisibilityChange() {
    if (!this.isSleepingForced || typeof document === 'undefined') return;
    if (document.hidden && this.forcedSleepTimer) {
      this.forcedSleepRemainingMs = Math.max(0, this.forcedSleepRemainingMs - (Date.now() - this.forcedSleepTimerStartedAt));
      clearTimeout(this.forcedSleepTimer); this.forcedSleepTimer = null;
    } else if (!document.hidden && !this.forcedSleepTimer && this.forcedSleepSession) this._scheduleForcedSleepTimer();
  }
  _finishForcedSleep() {
    if (!this.isSleepingForced || !this.forcedSleepSession) return;
    this._clearForcedSleepTimer();
    const before = this.currentEnergy, stay = { ...this.forcedSleepSession, completed: true };
    this.currentEnergy = this.maxEnergy;
    this.lastEnergyChange = { type: 'recover', amount: this.maxEnergy - before, label: __dialogueText("managers/EnergyManager.js", "t_14ef2ba2e78cbe627c39"),
      recoveryType: 'forced_sleep', recoverySubtype: 'agency_motel', beforeEnergy: before, afterEnergy: this.currentEnergy, timestamp: Date.now() };
    this.forcedSleepSession = null; this.isSleepingForced = false; this.hqExhaustionCallPending = true;
    this._saveBalance({ awakeMinutes: 0, fatigueRemainder: 0, lastSleepMinutes: 360 });
    this._removeForcedSleepOverlay(); this._recordAndEmit();
    EventBus.emit('energyRecovered', { energy: this.currentEnergy, sleepHours: 6, reason: 'forced_sleep', hotelId: 'agency', hotelLabel: __dialogueText("managers/EnergyManager.js", "t_c4c28e65f9cb467fb8c0"), cost: 0, stay });
    this._openHQCall(); this._requestAutosave();
  }
  _openHQCall() {
    if (!this.hqExhaustionCallPending || this.isSleepingForced || this.hqCallUI.isOpen) return;
    this.hqCallUI.open({ incidentCount: this.hqExhaustionIncidents, onDone: () => {
      this.hqExhaustionCallPending = false; this.hqExhaustionWarningSeen = true;
      this._syncToGameState(); this._emitEnergyChanged(); this._requestAutosave();
    } });
  }
  _requestAutosave() {
    void import('../gameStatePersistence.js').then(m => m.requestAutosave()).catch(error => console.warn('[EnergyManager] Autosave failed:', error));
  }
  _recordAndEmit() {
    if (this.lastEnergyChange) this.energyLog.push(clone(this.lastEnergyChange));
    if (this.energyLog.length > 50) this.energyLog.shift();
    this._syncToGameState(); this._emitEnergyChanged();
  }
  _syncToGameState() {
    gameState.updateState({ energy: this.currentEnergy, maxEnergy: this.maxEnergy, difficulty: this.difficulty,
      energyModifiers: this.getEnergyModifiers(), forcedSleepSession: clone(this.forcedSleepSession),
      hqExhaustionIncidents: this.hqExhaustionIncidents, hqExhaustionCallPending: this.hqExhaustionCallPending,
      hqExhaustionWarningSeen: this.hqExhaustionWarningSeen });
  }
  _emitEnergyChanged() {
    EventBus.emit('energyChanged', { current: this.currentEnergy, max: this.maxEnergy,
      percent: Math.round(this.currentEnergy / this.maxEnergy * 100), status: this.getEnergyStatus(), color: this.getEnergyColor(),
      tooltip: this.getEnergyTooltip(), lastChange: this.getLastEnergyChange(), modifiers: this.getEnergyModifiers(), energyMultiplier: this.getEffectiveEnergyMultiplier() });
  }
  getCurrentEnergy() { return this.currentEnergy; }
  getMaxEnergy() { return this.maxEnergy; }
  getEnergyLog(limit = null) { return clone(limit == null ? this.energyLog : Number(limit) > 0 ? this.energyLog.slice(-Math.floor(limit)) : []); }
  getLastEnergyChange() { return clone(this.lastEnergyChange); }
  isForcedSleepActive() { return this.isSleepingForced; }
  isManualSleepActive() { return this.isSleepingManual; }
  reset(difficulty = DEFAULT_DIFFICULTY) { this.init(difficulty); }
  restore(data = {}) {
    clearTimeout(this.restoreSleepTimer); this._clearForcedSleepTimer(); this._removeForcedSleepOverlay(); this.hqCallUI.destroy();
    this.maxEnergy = Math.max(1, Math.round(positive(data.maxEnergy, 100)));
    this.currentEnergy = Math.min(this.maxEnergy, Math.round(positive(data.energy, this.maxEnergy)));
    this.difficulty = isValidDifficulty(data.difficulty) ? data.difficulty : DEFAULT_DIFFICULTY;
    this.energyLog = Array.isArray(data.energyLog) ? clone(data.energyLog).slice(-50) : [];
    this.lastEnergyChange = data.lastEnergyChange ? clone(data.lastEnergyChange) : null;
    this.energyModifiers = (Array.isArray(data.energyModifiers) ? clone(data.energyModifiers) : [])
      .filter(m => typeof m?.id === 'string' && m.id.trim() && Number.isFinite(m.multiplier) && m.multiplier > 0 && Number.isFinite(m.remainingHours) && m.remainingHours > 0);
    this.hqExhaustionIncidents = Math.floor(positive(data.hqExhaustionIncidents));
    this.hqExhaustionCallPending = data.hqExhaustionCallPending === true;
    this.hqExhaustionWarningSeen = data.hqExhaustionWarningSeen === true;
    this.forcedSleepSession = null; this.isSleepingForced = false; this.isSleepingManual = false;
    this.restClockPending = false; this.exhaustionGameOverPending = false;
    const saved = data.forcedSleepSession;
    if (saved?.hotelId === 'agency' && saved.timeCharged === true && this.hqExhaustionIncidents < 2) {
      this.forcedSleepSession = { ...clone(saved), sleepHours: 6, cost: 0, timeCharged: true };
      this.hqExhaustionIncidents = Math.max(1, this.hqExhaustionIncidents); this.isSleepingForced = true;
    }
    this._syncToGameState(); this._emitEnergyChanged();
    this.restoreSleepTimer = setTimeout(() => {
      this.restoreSleepTimer = null;
      if (this.hqExhaustionIncidents >= 2 && gameState.caseFailed) this._failRepeatedExhaustion();
      else if (this.forcedSleepSession) { this._showForcedSleepOverlay(); this._startForcedSleepTimer(2000); }
      else if (this.hqExhaustionCallPending) this._openHQCall();
      else if (this.isCriticalEnergy() && !gameState.caseFailed) this._triggerForcedSleep();
    }, 0);
  }
  serialize() {
    return { energy: this.currentEnergy, maxEnergy: this.maxEnergy, difficulty: this.difficulty,
      energyLog: this.getEnergyLog(), lastEnergyChange: this.getLastEnergyChange(), energyModifiers: this.getEnergyModifiers(),
      forcedSleepSession: clone(this.forcedSleepSession), hqExhaustionIncidents: this.hqExhaustionIncidents,
      hqExhaustionCallPending: this.hqExhaustionCallPending, hqExhaustionWarningSeen: this.hqExhaustionWarningSeen };
  }
}
let energyManagerInstance = null;
export function getEnergyManager() { if (!energyManagerInstance) energyManagerInstance = new EnergyManager(); return energyManagerInstance; }
export function resetEnergyManager() { energyManagerInstance?.destroy(); energyManagerInstance = null; }
export default EnergyManager;
