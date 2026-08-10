const MAX_TRANSACTION_HISTORY = 100;

export const MONEY_SOURCE = Object.freeze({
    CASH: 'cash',
    AGENCY: 'agency',
});

export const ECONOMY_CATEGORY = Object.freeze({
    TRAVEL: 'travel',
    HOTEL: 'hotel',
    FOOD: 'food',
    DRINK: 'drink',
    NEWSPAPER: 'newspaper',
    PHONE: 'phone',
    TAXI: 'taxi',
    INFORMANT: 'informant',
    SIDE_CASE: 'side_case',
    MISSION_REWARD: 'mission_reward',
    OFFICE_UPGRADE: 'office_upgrade',
    ITEM: 'item',
    AGENCY_ADVANCE: 'agency_advance',
    REFUND: 'refund',
});

export const TRAVEL_OPTIONS = Object.freeze({
    agency: { id: 'agency', label: 'Agency Ticket', source: MONEY_SOURCE.AGENCY, cost: 0, timeCost: 8 },
    express: { id: 'express', label: 'Express Ticket', source: MONEY_SOURCE.CASH, cost: 40, timeCost: 3 },
    overnight: { id: 'overnight', label: 'Night Train', source: MONEY_SOURCE.CASH, cost: 55, timeCost: 5, energyRestore: 25 },
});

export const HOTEL_OPTIONS = Object.freeze({
    agency: { id: 'agency', label: 'Agency Motel', source: MONEY_SOURCE.AGENCY, cost: 0, energyRestore: 40 },
    boardingHouse: { id: 'boardingHouse', label: 'Boarding House', source: MONEY_SOURCE.CASH, cost: 25, energyRestore: 65 },
    business: { id: 'business', label: 'Business Hotel', source: MONEY_SOURCE.CASH, cost: 60, energyRestore: 100, researchBonus: 1 },
    grand: { id: 'grand', label: 'Grand Hotel', source: MONEY_SOURCE.CASH, cost: 110, energyRestore: 100, contactBonus: 1 },
});

function assertPositiveInteger(value, name) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer.`);
    }
}

function cloneTransaction(transaction) {
    return { ...transaction };
}

export class MoneyManager {
    constructor(savedState = {}) {
        this.load(savedState);
    }

    load(savedState = {}) {
        this.cash = Math.max(0, Number.parseInt(savedState.cash, 10) || 0);
        this.agencyBudget = Math.max(0, Number.parseInt(savedState.agencyBudget, 10) || 0);
        this.agencyDebt = Math.max(0, Number.parseInt(savedState.agencyDebt, 10) || 0);
        this.currentMissionId = savedState.currentMissionId || null;
        this.transactions = Array.isArray(savedState.transactions)
            ? savedState.transactions.slice(0, MAX_TRANSACTION_HISTORY).map(cloneTransaction)
            : [];
        this.emitChange('loaded');
        return this.getState();
    }

    reset({ cash = 120, agencyBudget = 0 } = {}) {
        this.cash = Math.max(0, cash);
        this.agencyBudget = Math.max(0, agencyBudget);
        this.agencyDebt = 0;
        this.currentMissionId = null;
        this.transactions = [];
        this.record({ type: 'reset', description: 'New detective account opened.' });
        return this.getState();
    }

    beginMission({ missionId, agencyAdvance = 0, description = 'Agency mission advance' }) {
        if (!missionId) throw new Error('missionId is required.');
        if (!Number.isInteger(agencyAdvance) || agencyAdvance < 0) {
            throw new Error('agencyAdvance must be a non-negative integer.');
        }

        this.currentMissionId = missionId;
        this.agencyBudget = agencyAdvance;
        this.record({
            type: 'mission_started',
            source: MONEY_SOURCE.AGENCY,
            amount: agencyAdvance,
            category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
            description,
        });
        return this.getState();
    }

    addCash(amount, { category = ECONOMY_CATEGORY.SIDE_CASE, description = 'Cash received' } = {}) {
        assertPositiveInteger(amount, 'amount');
        this.cash += amount;
        this.record({ type: 'income', source: MONEY_SOURCE.CASH, amount, category, description });
        return this.getState();
    }

    addAgencyBudget(amount, { category = ECONOMY_CATEGORY.AGENCY_ADVANCE, description = 'Additional agency funds' } = {}) {
        assertPositiveInteger(amount, 'amount');
        this.agencyBudget += amount;
        this.record({ type: 'income', source: MONEY_SOURCE.AGENCY, amount, category, description });
        return this.getState();
    }

    canAfford(amount, source = MONEY_SOURCE.CASH) {
        if (!Number.isFinite(amount) || amount < 0) return false;
        return this.getBalance(source) >= amount;
    }

    spend(amount, { source = MONEY_SOURCE.CASH, category = ECONOMY_CATEGORY.ITEM, description = 'Purchase', metadata = {} } = {}) {
        assertPositiveInteger(amount, 'amount');
        const balance = this.getBalance(source);

        if (balance < amount) {
            return { ok: false, reason: 'insufficient_funds', required: amount, available: balance, state: this.getState() };
        }

        if (source === MONEY_SOURCE.CASH) this.cash -= amount;
        else if (source === MONEY_SOURCE.AGENCY) this.agencyBudget -= amount;
        else throw new Error(`Unknown money source: ${source}`);

        this.record({ type: 'expense', source, amount, category, description, metadata });
        return { ok: true, state: this.getState() };
    }

    takeAgencyAdvance(amount, description = 'Emergency agency advance') {
        assertPositiveInteger(amount, 'amount');
        this.cash += amount;
        this.agencyDebt += amount;
        this.record({
            type: 'debt',
            source: MONEY_SOURCE.CASH,
            amount,
            category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
            description,
        });
        return this.getState();
    }

    settleMission({ reward = 0, description = 'Mission completed' } = {}) {
        if (!Number.isInteger(reward) || reward < 0) throw new Error('reward must be a non-negative integer.');
        const debtPaid = Math.min(reward, this.agencyDebt);
        const cashPaid = reward - debtPaid;

        this.agencyDebt -= debtPaid;
        this.cash += cashPaid;
        this.agencyBudget = 0;
        this.currentMissionId = null;
        this.record({
            type: 'mission_settled',
            source: MONEY_SOURCE.CASH,
            amount: cashPaid,
            category: ECONOMY_CATEGORY.MISSION_REWARD,
            description,
            metadata: { debtPaid },
        });
        return { cashPaid, debtPaid, state: this.getState() };
    }

    getBalance(source) {
        if (source === MONEY_SOURCE.CASH) return this.cash;
        if (source === MONEY_SOURCE.AGENCY) return this.agencyBudget;
        throw new Error(`Unknown money source: ${source}`);
    }

    getState() {
        return {
            cash: this.cash,
            agencyBudget: this.agencyBudget,
            agencyDebt: this.agencyDebt,
            currentMissionId: this.currentMissionId,
            transactions: this.transactions.map(cloneTransaction),
        };
    }

    record({ type, source = null, amount = 0, category = null, description = '', metadata = {} }) {
        this.transactions.unshift({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type,
            source,
            amount,
            category,
            description,
            metadata,
            missionId: this.currentMissionId,
            createdAt: new Date().toISOString(),
        });
        this.transactions.length = Math.min(this.transactions.length, MAX_TRANSACTION_HISTORY);
        this.emitChange(type);
    }

    emitChange(reason) {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
        window.dispatchEvent(new CustomEvent('lost-artifacts:money-changed', {
            detail: { reason, state: this.getState() },
        }));
    }
}

export const moneyManager = new MoneyManager();
