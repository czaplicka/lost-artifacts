import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { resourcefulnessManager } from './ResourcefulnessManager.js';

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
  agency: {
    id: 'agency', label: 'Agency Motel', source: MONEY_SOURCE.AGENCY,
    cost: 0, energyRestore: 40, description: 'A bed. Allegedly.'
  },
  boardingHouse: {
    id: 'boardingHouse', label: 'Boarding House', source: MONEY_SOURCE.CASH,
    cost: 25, energyRestore: 65, description: 'Decent sleep and alarming wallpaper.'
  },
  business: {
    id: 'business', label: 'Business Hotel', source: MONEY_SOURCE.CASH,
    cost: 60, energyRestore: 100, researchBonus: 1,
    description: 'Reliable Wi-Fi, clean sheets, and one useful newspaper.'
  },
  grand: {
    id: 'grand', label: 'Grand Hotel', source: MONEY_SOURCE.CASH,
    cost: 110, energyRestore: 100, contactBonus: 1,
    description: 'You are not rich. You are undercover.'
  }
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

  // amount zawsze oznacza cene PRZED rabatem.
  getExpenseQuote(amount, { category = ECONOMY_CATEGORY.ITEM } = {}) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new TypeError('MoneyManager.getExpenseQuote requires a non-negative integer amount.');
    }
    if (category === ECONOMY_CATEGORY.TAXI) {
      return {
        ...resourcefulnessManager.getLocalTransportMoneyQuote(amount),
        category, eligible: true
      };
    }
    return {
      category, eligible: false, originalCost: amount, finalCost: amount,
      saved: 0, applied: false, discountPercent: 0
    };
  }

  // Stare wywolania z dwoma argumentami zachowuja poprzednie dzialanie.
  // Dla taxi przekaż trzeci argument { category: ECONOMY_CATEGORY.TAXI }.
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
    const transaction = this.addLogEntry({
      type: 'reset', description: 'New detective account opened.',
      metadata: { cash: gameState.cash, agencyBudget: gameState.agencyBudget, agencyDebt: gameState.agencyDebt }
    });
    this.persist('reset', transaction);
    return this.getState();
  }

  beginMission({ missionId, agencyAdvance = MONEY_DEFAULTS.agencyBudget,
    description = 'Mark Agency mission advance' } = {}) {
    if (!missionId) throw new Error('MoneyManager.beginMission requires missionId.');
    const normalizedAdvance = normalizeAmount(agencyAdvance);
    gameState.agencyBudget = normalizedAdvance;
    const transaction = this.addLogEntry({
      type: 'mission_started', source: MONEY_SOURCE.AGENCY, amount: normalizedAdvance,
      category: ECONOMY_CATEGORY.AGENCY_ADVANCE, description, missionId
    });
    this.persist('mission_started', transaction);
    return this.getState();
  }

  addCash(amount, { category = ECONOMY_CATEGORY.SIDE_CASE, description = 'Cash received',
    missionId = gameState.currentMission?.id ?? null, metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.addCash requires a positive integer amount.');
    gameState.cash = this.getBalance(MONEY_SOURCE.CASH) + amount;
    const transaction = this.addLogEntry({
      type: 'income', source: MONEY_SOURCE.CASH, amount, category, description, missionId, metadata
    });
    this.persist('cash_added', transaction);
    return this.getState();
  }

  addAgencyBudget(amount, { category = ECONOMY_CATEGORY.AGENCY_ADVANCE,
    description = 'Additional Mark Agency funds', missionId = gameState.currentMission?.id ?? null,
    metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.addAgencyBudget requires a positive integer amount.');
    gameState.agencyBudget = this.getBalance(MONEY_SOURCE.AGENCY) + amount;
    const transaction = this.addLogEntry({
      type: 'income', source: MONEY_SOURCE.AGENCY, amount, category, description, missionId, metadata
    });
    this.persist('agency_budget_added', transaction);
    return this.getState();
  }

  spend(amount, { source = MONEY_SOURCE.CASH, category = ECONOMY_CATEGORY.ITEM,
    description = 'Purchase', missionId = gameState.currentMission?.id ?? null, metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.spend requires a positive integer amount.');
    const quote = this.getExpenseQuote(amount, { category });
    const chargedAmount = quote.finalCost;
    const available = this.getBalance(source);
    if (available < chargedAmount) {
      return {
        ok: false, reason: 'insufficient_funds', source,
        required: chargedAmount, available, costDetails: quote, state: this.getState()
      };
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
    const transaction = this.addLogEntry({
      type: 'expense', source, amount: chargedAmount, category,
      description, missionId, metadata: transactionMetadata
    });
    this.persist('money_spent', transaction);
    return { ok: true, transaction, costDetails: quote, state: this.getState() };
  }

  buyHotel(hotelOption, { cityId = gameState.currentCityId ?? null, description = null } = {}) {
    if (!hotelOption?.id) throw new Error('MoneyManager.buyHotel requires a hotel option.');
    const cost = normalizeAmount(hotelOption.cost);
    const metadata = {
      hotelOptionId: hotelOption.id, cityId, energyRestore: normalizeAmount(hotelOption.energyRestore),
      researchBonus: normalizeAmount(hotelOption.researchBonus), contactBonus: normalizeAmount(hotelOption.contactBonus)
    };
    if (cost === 0) {
      const transaction = this.addLogEntry({
        type: 'expense', source: hotelOption.source ?? MONEY_SOURCE.AGENCY,
        amount: 0, category: ECONOMY_CATEGORY.HOTEL,
        description: description ?? `Hotel: ${hotelOption.label}`,
        missionId: gameState.currentMission?.id ?? null, metadata
      });
      this.persist('free_hotel_used', transaction);
      return { ok: true, transaction, hotelOption, state: this.getState() };
    }
    const result = this.spend(cost, {
      source: hotelOption.source ?? MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.HOTEL,
      description: description ?? `Hotel: ${hotelOption.label}`, metadata
    });
    if (!result.ok) return result;
    return { ...result, hotelOption };
  }

  takeAgencyAdvance(amount, { description = 'Emergency agency advance',
    missionId = gameState.currentMission?.id ?? null } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.takeAgencyAdvance requires a positive integer amount.');
    const balances = this.getBalances();
    gameState.cash = balances.cash + amount;
    gameState.agencyDebt = balances.agencyDebt + amount;
    const transaction = this.addLogEntry({
      type: 'debt', source: MONEY_SOURCE.CASH, amount, category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
      description, missionId, metadata: { debtAfterAdvance: gameState.agencyDebt }
    });
    this.persist('agency_advance_taken', transaction);
    return this.getState();
  }

  settleMission({ reward = 0, nextMissionAgencyBudget = MONEY_DEFAULTS.agencyBudget,
    description = 'Mission completed', missionId = gameState.currentMission?.id ?? null } = {}) {
    const balances = this.getBalances();
    const normalizedReward = normalizeAmount(reward);
    const debtBeforeSettlement = balances.agencyDebt;
    const debtPaid = Math.min(normalizedReward, debtBeforeSettlement);
    const cashPaid = normalizedReward - debtPaid;
    gameState.agencyDebt = debtBeforeSettlement - debtPaid;
    gameState.cash = balances.cash + cashPaid;
    gameState.agencyBudget = normalizeAmount(nextMissionAgencyBudget);
    const transaction = this.addLogEntry({
      type: 'mission_settled', source: MONEY_SOURCE.CASH, amount: cashPaid,
      category: ECONOMY_CATEGORY.MISSION_REWARD, description, missionId,
      metadata: {
        totalReward: normalizedReward, debtPaid, remainingDebt: gameState.agencyDebt,
        nextMissionAgencyBudget: gameState.agencyBudget
      }
    });
    this.persist('mission_settled', transaction);
    return { cashPaid, debtPaid, remainingDebt: gameState.agencyDebt, state: this.getState() };
  }

  refund(amount, { source = MONEY_SOURCE.CASH, category = ECONOMY_CATEGORY.REFUND,
    description = 'Refund received', missionId = gameState.currentMission?.id ?? null,
    metadata = {} } = {}) {
    if (!isPositiveInteger(amount)) throw new Error('MoneyManager.refund requires a positive integer amount.');
    const available = this.getBalance(source);
    if (source === MONEY_SOURCE.CASH) gameState.cash = available + amount;
    else if (source === MONEY_SOURCE.AGENCY) gameState.agencyBudget = available + amount;
    else throw new Error(`Unknown money source: ${source}`);
    const transaction = this.addLogEntry({
      type: 'refund', source, amount, category, description, missionId, metadata
    });
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
    const transaction = {
      id: createTransactionId(), type, source, amount: normalizeAmount(amount), category,
      description, missionId, createdAt: new Date().toISOString(), metadata: cloneMetadata(metadata)
    };
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
