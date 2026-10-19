import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import {
  getEffectiveStats
} from '../ui/characterCreation/CharacterCreationData.js';

const STATE_VERSION = 1;

const EASY_HINT_GRANT = {
  id: 'difficulty_rookie_starting_hints',
  amount: 2,
  label: 'Routine Case starting hints'
};

function nonNegativeInteger(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, Math.floor(number))
    : 0;
}

function createDefaultHintState() {
  return {
    version: STATE_VERSION,
    observationGranted: 0,
    bonusGrants: [],
    used: 0,
    usageHistory: []
  };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEntryId() {
  return globalThis.crypto?.randomUUID?.() ||
    `hint_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

class HintManager {
  readState() {
    const defaults = createDefaultHintState();
    const saved = gameState.hintState;

    if (
      !saved ||
      typeof saved !== 'object' ||
      Array.isArray(saved)
    ) {
      return defaults;
    }

    const grants = [];
    const seenIds = new Set();

    for (
      const entry of Array.isArray(saved.bonusGrants)
        ? saved.bonusGrants
        : []
    ) {
      if (
        typeof entry?.id !== 'string' ||
        !entry.id.trim() ||
        seenIds.has(entry.id)
      ) {
        continue;
      }

      seenIds.add(entry.id);

      grants.push({
        id: entry.id,
        amount: nonNegativeInteger(entry.amount),
        label: String(entry.label || entry.id)
      });
    }

    return {
      version: STATE_VERSION,

      observationGranted:
        nonNegativeInteger(saved.observationGranted),

      bonusGrants: grants,

      used: nonNegativeInteger(saved.used),

      usageHistory: Array.isArray(saved.usageHistory)
        ? copy(saved.usageHistory)
        : []
    };
  }

  writeState(state) {
    gameState.updateState({
      hintState: copy(state)
    });

    const saved = saveGameState();

    EventBus.emit(
      'hints:changed',
      this.buildSummary(state)
    );

    return saved;
  }

  getObservationBonus() {
    const stats = getEffectiveStats({
      profile: gameState.detectiveProfile || 'analyst',
      stats: gameState.detectiveStats || {}
    });

    // Bazowy punkt nie jest bonusem.
    return Math.max(
      0,
      nonNegativeInteger(stats.observation) - 1
    );
  }

  getObservationEntitlement() {
    // Bonus +3 = 1, +4 = 2, +5 = 3.
    return Math.max(
      0,
      this.getObservationBonus() - 2
    );
  }

  syncObservation() {
    const state = this.readState();
    const entitlement = this.getObservationEntitlement();

    let changed = false;

    if (entitlement > state.observationGranted) {
      state.observationGranted = entitlement;
      changed = true;
    }

    const easyBonusAlreadyGranted =
      state.bonusGrants.some(
        entry => entry.id === EASY_HINT_GRANT.id
      );

    if (
      gameState.difficulty === 'rookie' &&
      !easyBonusAlreadyGranted
    ) {
      state.bonusGrants.push({
        ...EASY_HINT_GRANT
      });

      changed = true;
    }

    if (changed) {
      this.writeState(state);
    }

    return state;
  }

  buildSummary(state) {
    const bonusGranted = state.bonusGrants.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );

    const totalGranted =
      state.observationGranted + bonusGranted;

    return {
      observationBonus: this.getObservationBonus(),
      observationGranted: state.observationGranted,
      bonusGranted,
      totalGranted,
      used: state.used,

      available: Math.max(
        0,
        totalGranted - state.used
      )
    };
  }

  getSummary() {
    return this.buildSummary(
      this.syncObservation()
    );
  }

  getAvailableCount() {
    return this.getSummary().available;
  }

  grantOnce(grantId, amount, label = '') {
    const id = String(grantId || '').trim();
    const safeAmount = nonNegativeInteger(amount);

    if (!id || safeAmount < 1) {
      return {
        success: false,
        reason: 'invalid_grant'
      };
    }

    const state = this.syncObservation();

    if (
      state.bonusGrants.some(entry => entry.id === id)
    ) {
      return {
        success: false,
        reason: 'already_granted',
        ...this.buildSummary(state)
      };
    }

    state.bonusGrants.push({
      id,
      amount: safeAmount,
      label: String(label || id)
    });

    const saved = this.writeState(state);

    return {
      success: true,
      saved,
      granted: safeAmount,
      ...this.buildSummary(state)
    };
  }

  useFreeHint(context = {}) {
    const state = this.syncObservation();
    const summary = this.buildSummary(state);

    if (summary.available < 1) {
      return {
        success: false,
        reason: 'no_free_hints',
        ...summary
      };
    }

    const entry = this.createHistoryEntry(
      'free_hint',
      context,
      {
        energy: 0,
        minutes: 0,
        cash: 0,
        moralDelta: 0
      }
    );

    state.used += 1;
    state.usageHistory.push(entry);

    const saved = this.writeState(state);

    return {
      success: true,
      saved,
      entry: copy(entry),
      ...this.buildSummary(state)
    };
  }

  recordPaidHint(method, context = {}, costs = {}) {
    if (
      !['cut_corners', 'squad_help', 'cash']
        .includes(method)
    ) {
      return {
        success: false,
        reason: 'invalid_method'
      };
    }

    const state = this.syncObservation();

    const entry = this.createHistoryEntry(
      method,
      context,
      {
        energy: nonNegativeInteger(costs.energy),
        minutes: nonNegativeInteger(costs.minutes),
        cash: nonNegativeInteger(costs.cash),

        moralDelta:
          method === 'cut_corners'
            ? -1
            : method === 'squad_help'
              ? 1
              : 0
      }
    );

    state.usageHistory.push(entry);

    const saved = this.writeState(state);

    return {
      success: true,
      saved,
      entry: copy(entry),
      ...this.buildSummary(state)
    };
  }

  createHistoryEntry(method, context, costs) {
    return {
      id: createEntryId(),
      method,

      caseId:
        context.caseId ??
        gameState.currentCaseId ??
        null,

      missionId:
        context.missionId ??
        gameState.currentMission?.id ??
        gameState.currentMission?.missionId ??
        null,

      sceneId: context.sceneId ?? null,
      itemId: context.itemId ?? null,

      proceduralIssue:
        method === 'cut_corners'
          ? 'evidence_handling_checklist_skipped'
          : null,

      documentedAssistance:
        method === 'squad_help',

      costs: {
        energy: costs.energy,
        minutes: costs.minutes,
        cash: costs.cash
      },

      moralDelta: costs.moralDelta,
      createdAt: new Date().toISOString()
    };
  }

  getHistory(caseId = null) {
    const history = this.readState().usageHistory;

    return copy(
      caseId === null
        ? history
        : history.filter(
            entry => entry.caseId === caseId
          )
    );
  }
}

export const hintManager = new HintManager();
export default hintManager;