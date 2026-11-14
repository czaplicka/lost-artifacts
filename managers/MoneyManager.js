import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { resourcefulnessManager } from './ResourcefulnessManager.js';
import { getPIOfficeAssistantBonus } from './PIOfficeAssistantBonus.js';

const MAX_MONEY_LOG_ENTRIES = 100;
const MONEY_CHANGED_EVENT = 'lost-artifacts:money-changed';
export const MONEY_DEFAULTS = Object.freeze({ cash: 100, agencyBudget: 650, agencyDebt: 0 });
export const MONEY_SOURCE = Object.freeze({ CASH: 'cash', AGENCY: 'agency' });
export const ECONOMY_CATEGORY = Object.freeze({
  TRAVEL: 'travel', HOTEL: 'hotel', FOOD: 'food', DRINK: 'drink',
  NEWSPAPER: 'newspaper', PHONE: 'phone', TAXI: 'taxi', INFORMANT: 'informant',
  SIDE_CASE: 'side_case', MISSION_REWARD: 'mission_reward', OFFICE_UPGRADE: 'office_upgrade',
  ITEM: 'item', AGENCY_ADVANCE: 'agency_advance', REFUND: 'refund'
});
export const HOTEL_OPTIONS = Object.freeze({
  agency: { id: 'agency', label: __dialogueText("managers/MoneyManager.js", "t_c4c28e65f9cb467fb8c0"), source: MONEY_SOURCE.AGENCY,
    cost: 0, energyRestore: 40, description: __dialogueText("managers/MoneyManager.js", "t_9aabb86a0afee1960cd7") },
  boardingHouse: { id: 'boardingHouse', label: __dialogueText("managers/MoneyManager.js", "t_849d78dbf7763d8d6779"), source: MONEY_SOURCE.CASH,
    cost: 25, energyRestore: 65, description: __dialogueText("managers/MoneyManager.js", "t_b983b718375bd7a1cddc") },
  business: { id: 'business', label: __dialogueText("managers/MoneyManager.js", "t_872980322d9d10eba400"), source: MONEY_SOURCE.CASH,
    cost: 60, energyRestore: 100, researchBonus: 1,
    description: __dialogueText("managers/MoneyManager.js", "t_4317f3ac7ee982cc16db") },
  grand: { id: 'grand', label: __dialogueText("managers/MoneyManager.js", "t_5f61e4a8177ff6eb5e1f"), source: MONEY_SOURCE.CASH,
    cost: 110, energyRestore: 100, contactBonus: 1,
    description: __dialogueText("managers/MoneyManager.js", "t_49790323f0d974b83d82") }
});
function isPositiveInteger(value) { return Number.isInteger(value) && value > 0; }
function normalizeAmount(value) { return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; }
function createTransactionId() {
  return `money-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function cloneMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  if (typeof structuredClone === 'function') return structuredClone(metadata);
  return JSON.parse(JSON.stringify(metadata));
}
function dispatchMoneyChange(reason, transaction, balances) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(MONEY_CHANGED_EVENT, {
    detail: { reason, transaction, state: balances }
  }));
}

export class MoneyManager {
  ensureState() {
    gameState.cash = normalizeAmount(gameState.cash ?? MONEY_DEFAULTS.cash);
    gameState.agencyBudget = normalizeAmount(gameState.agencyBudget ?? MONEY_DEFAULTS.agencyBudget);
    gameState.agencyDebt = normalizeAmount(gameState.agencyDebt ?? MONEY_DEFAULTS.agencyDebt);
    if (!Array.isArray(gameState.moneyLog)) gameState.moneyLog = [];
  }
  getBalances() {
    this.ensureState();
    return { cash: gameState.cash, agencyBudget: gameState.agencyBudget, agencyDebt: gameState.agencyDebt };
  }
  getState() { return { ...this.getBalances(), moneyLog: [...gameState.moneyLog] }; }
  getBalance(source = MONEY_SOURCE.CASH) {
    this.ensureState();
    if (source === MONEY_SOURCE.CASH) return gameState.cash;
    if (source === MONEY_SOURCE.AGENCY) return gameState.agencyBudget;
    throw new Error(`Unknown money source: ${source}`);
  }
  getExpenseQuote(amount, { category = ECONOMY_CATEGORY.ITEM } = {}) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new TypeError('MoneyManager.getExpenseQuote requires a non-negative integer amount.');
    }
    if (category === ECONOMY_CATEGORY.TAXI) {
      return { ...resourcefulnessManager.getLocalTransportMoneyQuote(amount), category, eligible: true };
    }
    return { category, eligible: false, originalCost: amount, finalCost: amount,
      saved: 0, applied: false, discountPercent: 0 };
  }
  canAfford(amount, source = MONEY_SOURCE.CASH, { category = ECONOMY_CATEGORY.ITEM } = {}) {
    const normalizedAmount = normalizeAmount(amount);
    const quote = this.getExpenseQuote(normalizedAmount, { category });
    return this.getBalance(source) >= quote.finalCost;
  }
  reset({ cash = MONEY_DEFAULTS.cash, agencyBudget = MONEY_DEFAULTS.agencyBudget,
    agencyDebt = MONEY_DEFAULTS.agencyDebt } = {}) {
    gameState.cash = normalizeAmount(cash);
    gameState.agencyBudget = normalizeAmount(agencyBudget);
    gameState.agencyDebt = normalizeAmount(agencyDebt);
    gameState.moneyLog = [];
    const transaction = this.addLogEntry({ type: 'reset', description: __dialogueText("managers/MoneyManager.js", "t_65c4f2f8a95540e9a141"),
      metadata: { cash: gameState.cash, agencyBudget: gameState.agencyBudget, agencyDebt: gameState.agencyDebt } });
    this.persist('reset', transaction);
    return this.getState();
  }
  beginMission({ missionId, agencyAdvance = MONEY_DEFAULTS.agencyBudget,
    description = __dialogueText("managers/MoneyManager.js", "t_c726eaa822bbd7a7d800") } = {}) {
    if (!missionId) throw new Error('MoneyManager.beginMission requires missionId.');
    const normalizedAdvance = normalizeAmount(agencyAdvance);
    gameState.agencyBudget = normalizedAdvance;
    const transaction = this.addLogEntry({ type: 'mission_started', source: MONEY_SOURCE.AGENCY,
      amount: normalizedAdvance, category: ECONOMY_CATEGORY.AGENCY_ADVANCE, description, missionId });
    this.persist('mission_started', transaction);
    return this.getState();
  }

  addCash(amount, { category = ECONOMY_CATEGORY.SIDE_CASE, description = __dialogueText("managers/MoneyManager.js", "t_0c8c1eb08f4f72d651fb"),
    missionId = gameState.currentMission?.id ?? null, metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.addCash requires a positive integer amount.');
    const transactionMetadata = cloneMetadata(metadata);
    const quote = getPIOfficeAssistantBonus(amount, { category, missionId, metadata: transactionMetadata });
    const paidAmount = amount + quote.bonus;
    if (quote.bonus > 0) {
      transactionMetadata.officeAssistant = {
        itemId: 'office_assistant', baseReward: quote.baseReward,
        bonusPercent: quote.percent, bonusAmount: quote.bonus,
        originalAmount: amount, paidAmount
      };
    }
    gameState.cash = this.getBalance(MONEY_SOURCE.CASH) + paidAmount;
    const transaction = this.addLogEntry({
      type: 'income', source: MONEY_SOURCE.CASH, amount: paidAmount, category,
      description: quote.bonus > 0 ? `${description}${__dialogueText("managers/MoneyManager.js", "t_5c59214bd68c226bded1")}${quote.bonus}${__dialogueText("managers/MoneyManager.js", "t_ef1bf6c4c1c2f71b2761")}` : description,
      missionId, metadata: transactionMetadata
    });
    // Base payment and bonus share one transaction and the existing settlement ID.
    this.persist('cash_added', transaction);
    return this.getState();
  }

  addAgencyBudget(amount, { category = ECONOMY_CATEGORY.AGENCY_ADVANCE,
    description = __dialogueText("managers/MoneyManager.js", "t_4f775fe576e18cfdebef"), missionId = gameState.currentMission?.id ?? null,
    metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.addAgencyBudget requires a positive integer amount.');
    gameState.agencyBudget = this.getBalance(MONEY_SOURCE.AGENCY) + amount;
    const transaction = this.addLogEntry({ type: 'income', source: MONEY_SOURCE.AGENCY,
      amount, category, description, missionId, metadata });
    this.persist('agency_budget_added', transaction);
    return this.getState();
  }
  spend(amount, { source = MONEY_SOURCE.CASH, category = ECONOMY_CATEGORY.ITEM,
    description = __dialogueText("managers/MoneyManager.js", "t_5b5e9c65b400565c2cd8"), missionId = gameState.currentMission?.id ?? null, metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.spend requires a positive integer amount.');
    const quote = this.getExpenseQuote(amount, { category });
    const chargedAmount = quote.finalCost;
    const available = this.getBalance(source);
    if (available < chargedAmount) {
      return { ok: false, reason: 'insufficient_funds', source,
        required: chargedAmount, available, costDetails: quote, state: this.getState() };
    }
    if (source === MONEY_SOURCE.CASH) gameState.cash = available - chargedAmount;
    else if (source === MONEY_SOURCE.AGENCY) gameState.agencyBudget = available - chargedAmount;
    else throw new Error(`Unknown money source: ${source}`);
    const transactionMetadata = cloneMetadata(metadata);
    if (quote.eligible) {
      transactionMetadata.resourcefulness = {
        points: quote.resourcefulness, discountPercent: quote.discountPercent,
        originalCost: quote.originalCost, finalCost: quote.finalCost, saved: quote.saved
      };
    }
    const transaction = this.addLogEntry({ type: 'expense', source, amount: chargedAmount,
      category, description, missionId, metadata: transactionMetadata });
    this.persist('money_spent', transaction);
    return { ok: true, transaction, costDetails: quote, state: this.getState() };
  }
  buyHotel(hotelOption, { cityId = gameState.currentCityId ?? null, description = null } = {}) {
    if (!hotelOption?.id) throw new Error('MoneyManager.buyHotel requires a hotel option.');
    const cost = normalizeAmount(hotelOption.cost);
    const metadata = { hotelOptionId: hotelOption.id, cityId,
      energyRestore: normalizeAmount(hotelOption.energyRestore),
      researchBonus: normalizeAmount(hotelOption.researchBonus), contactBonus: normalizeAmount(hotelOption.contactBonus) };
    if (cost === 0) {
      const transaction = this.addLogEntry({ type: 'expense', source: hotelOption.source ?? MONEY_SOURCE.AGENCY,
        amount: 0, category: ECONOMY_CATEGORY.HOTEL, description: description ?? `${__dialogueText("managers/MoneyManager.js", "t_3582c73bb7b03dad841e")}${hotelOption.label}`,
        missionId: gameState.currentMission?.id ?? null, metadata });
      this.persist('free_hotel_used', transaction);
      return { ok: true, transaction, hotelOption, state: this.getState() };
    }
    const result = this.spend(cost, { source: hotelOption.source ?? MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.HOTEL, description: description ?? `${__dialogueText("managers/MoneyManager.js", "t_3582c73bb7b03dad841e")}${hotelOption.label}`, metadata });
    if (!result.ok) return result;
    return { ...result, hotelOption };
  }
  takeAgencyAdvance(amount, { description = __dialogueText("managers/MoneyManager.js", "t_ea297d74828bb2e9b47a"),
    missionId = gameState.currentMission?.id ?? null } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.takeAgencyAdvance requires a positive integer amount.');
    const balances = this.getBalances();
    gameState.cash = balances.cash + amount;
    gameState.agencyDebt = balances.agencyDebt + amount;
    const transaction = this.addLogEntry({ type: 'debt', source: MONEY_SOURCE.CASH, amount,
      category: ECONOMY_CATEGORY.AGENCY_ADVANCE, description, missionId, metadata: { debtAfterAdvance: gameState.agencyDebt } });
    this.persist('agency_advance_taken', transaction);
    return this.getState();
  }
  settleMission({ reward = 0, nextMissionAgencyBudget = MONEY_DEFAULTS.agencyBudget,
    description = __dialogueText("managers/MoneyManager.js", "t_a89a519d50ecf810336d"), missionId = gameState.currentMission?.id ?? null } = {}) {
    const balances = this.getBalances();
    const normalizedReward = normalizeAmount(reward);
    const debtBeforeSettlement = balances.agencyDebt;
    const debtPaid = Math.min(normalizedReward, debtBeforeSettlement);
    const cashPaid = normalizedReward - debtPaid;
    gameState.agencyDebt = debtBeforeSettlement - debtPaid;
    gameState.cash = balances.cash + cashPaid;
    gameState.agencyBudget = normalizeAmount(nextMissionAgencyBudget);
    const transaction = this.addLogEntry({ type: 'mission_settled', source: MONEY_SOURCE.CASH, amount: cashPaid,
      category: ECONOMY_CATEGORY.MISSION_REWARD, description, missionId,
      metadata: { totalReward: normalizedReward, debtPaid, remainingDebt: gameState.agencyDebt,
        nextMissionAgencyBudget: gameState.agencyBudget } });
    this.persist('mission_settled', transaction);
    return { cashPaid, debtPaid, remainingDebt: gameState.agencyDebt, state: this.getState() };
  }
  refund(amount, { source = MONEY_SOURCE.CASH, category = ECONOMY_CATEGORY.REFUND,
    description = __dialogueText("managers/MoneyManager.js", "t_e1e8aaeab3dbf5897054"), missionId = gameState.currentMission?.id ?? null, metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.refund requires a positive integer amount.');
    const available = this.getBalance(source);
    if (source === MONEY_SOURCE.CASH) gameState.cash = available + amount;
    else if (source === MONEY_SOURCE.AGENCY) gameState.agencyBudget = available + amount;
    else throw new Error(`Unknown money source: ${source}`);
    const transaction = this.addLogEntry({ type: 'refund', source, amount, category, description, missionId, metadata });
    this.persist('money_refunded', transaction);
    return this.getState();
  }
  getRecentTransactions(limit = 10) {
    this.ensureState();
    const normalizedLimit = Math.max(1, Math.floor(Number(limit) || 10));
    return gameState.moneyLog.slice(0, normalizedLimit);
  }
  addLogEntry({ type, source = null, amount = 0, category = null,
    description = '', missionId = null, metadata = {} }) {
    this.ensureState();
    const transaction = { id: createTransactionId(), type, source, amount: normalizeAmount(amount),
      category, description, missionId, createdAt: new Date().toISOString(), metadata: cloneMetadata(metadata) };
    gameState.moneyLog.unshift(transaction);
    gameState.moneyLog.length = Math.min(gameState.moneyLog.length, MAX_MONEY_LOG_ENTRIES);
    return transaction;
  }
  persist(reason, transaction = null) {
    requestAutosave();
    dispatchMoneyChange(reason, transaction, this.getBalances());
  }
}
export const moneyManager = new MoneyManager();
