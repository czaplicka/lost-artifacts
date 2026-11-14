import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

import {
  requestAutosave,
  saveGameState
} from '../gameStatePersistence.js';

import { hintManager } from './HintManager.js';

import {
  STAT_IDS,
  getEffectiveStats
} from '../ui/characterCreation/CharacterCreationData.js';

export const PROGRESSION_CHANGED = 'progression:changed';
export const XP_GRANTED = 'progression:xpGranted';
export const LEVEL_UP = 'progression:levelUp';

export const XP_REWARDS = Object.freeze({
  crime_scene_completed: 20,
  csi_completed: 30,
  reconstruction_submitted: 20,
  alibi_completed: 30,
  apartment_completed: 20,
  artifact_recovered: 30,
  correct_arrest: 50,
  court_won: 100,

  pi_case_small: 50,
  pi_case_medium: 100,
  pi_case_large: 150,

  story_puzzle_small: 30,
  story_puzzle_large: 50
});

const VERSION = 1;
const MAX_LEVEL = 10000;

function integer(value, fallback = 0) {
  return Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback;
}

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function validId(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 500
  );
}

function stableId(value) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return null;
  }

  if (
    typeof value === 'number' &&
    !Number.isFinite(value)
  ) {
    return null;
  }

  const id = String(value).trim();

  if (
    !id ||
    id.length > 400 ||
    id === 'unknown_mission' ||
    id === 'default_case'
  ) {
    return null;
  }

  return id;
}

function defaultState() {
  return {
    version: VERSION,
    totalXP: 0,
    spentPoints: 0,
    appliedEventIds: [],
    history: []
  };
}

/**
 * Łączne XP wymagane do osiągnięcia poziomu:
 * 1: 0
 * 2: 200
 * 3: 500
 * 4: 900
 * 5: 1400
 */
export function totalXPForLevel(level) {
  if (
    !Number.isSafeInteger(level) ||
    level < 1 ||
    level > MAX_LEVEL
  ) {
    throw new RangeError('Invalid progression level.');
  }

  return 50 * (level - 1) * (level + 2);
}

export const MAX_TOTAL_XP = totalXPForLevel(MAX_LEVEL);

export function levelForTotalXP(totalXP) {
  const xp = Math.min(integer(totalXP), MAX_TOTAL_XP);

  let low = 1;
  let high = MAX_LEVEL;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);

    if (totalXPForLevel(middle) <= xp) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return low;
}

class ProgressionManager {
  readState() {
    const saved = gameState.progressionState;

    if (saved == null) {
      return defaultState();
    }

    if (
      !isObject(saved) ||
      saved.version !== VERSION
    ) {
      throw new Error(
        '[Progression] Unsupported or damaged progression state.'
      );
    }

    const totalXP = Math.min(
      integer(saved.totalXP),
      MAX_TOTAL_XP
    );

    const earnedPoints =
      levelForTotalXP(totalXP) - 1;

    return {
      version: VERSION,
      totalXP,

      spentPoints: Math.min(
        integer(saved.spentPoints),
        earnedPoints
      ),

      appliedEventIds: [
        ...new Set(
          (
            Array.isArray(saved.appliedEventIds)
              ? saved.appliedEventIds
              : []
          ).filter(validId)
        )
      ],

      history: Array.isArray(saved.history)
        ? copy(saved.history)
        : []
    };
  }

  buildSummary(state) {
    const level = levelForTotalXP(state.totalXP);
    const earnedPoints = level - 1;
    const isMaxLevel = level >= MAX_LEVEL;

    const levelStartXP = totalXPForLevel(level);

    const nextLevelXP = isMaxLevel
      ? levelStartXP
      : totalXPForLevel(level + 1);

    const requiredXP = isMaxLevel
      ? 0
      : nextLevelXP - levelStartXP;

    const currentLevelXP = isMaxLevel
      ? 0
      : state.totalXP - levelStartXP;

    return {
      version: VERSION,
      level,
      totalXP: state.totalXP,

      earnedPoints,
      spentPoints: state.spentPoints,

      availablePoints: Math.max(
        0,
        earnedPoints - state.spentPoints
      ),

      levelStartXP,
      nextLevelXP,
      currentLevelXP,
      requiredXP,

      xpToNextLevel: isMaxLevel
        ? 0
        : nextLevelXP - state.totalXP,

      progress: isMaxLevel
        ? 1
        : currentLevelXP / requiredXP,

      isMaxLevel
    };
  }

  getSummary() {
    return this.buildSummary(this.readState());
  }

  initialize() {
    if (gameState.progressionState == null) {
      gameState.progressionState = defaultState();
    }

    return this.getSummary();
  }

  hasReward(eventId) {
    return this.readState()
      .appliedEventIds.includes(eventId);
  }

  publish(eventName, payload) {
    try {
      EventBus.emit(eventName, payload);
    } catch (error) {
      console.error(
        `[Progression] Listener failed: ${eventName}`,
        error
      );
    }
  }

  commit(state) {
    gameState.progressionState = copy(state);
    requestAutosave();

    const summary = this.buildSummary(state);

    this.publish(PROGRESSION_CHANGED, summary);

    return summary;
  }

  grantReward(rewardId, scopeId, label = '') {
    if (
      !Object.prototype.hasOwnProperty.call(
        XP_REWARDS,
        rewardId
      )
    ) {
      return {
        success: false,
        reason: 'unknown_reward'
      };
    }

    if (!validId(scopeId)) {
      return {
        success: false,
        reason: 'missing_scope_id'
      };
    }

    const eventId = JSON.stringify([
      'reward',
      rewardId,
      scopeId
    ]);

    return this.grantXP({
      eventId,
      amount: XP_REWARDS[rewardId],
      label: label || rewardId,
      source: rewardId,
      scopeId
    });
  }

  grantXP({
    eventId,
    amount,
    label = '',
    source = 'custom',
    scopeId = null
  } = {}) {
    if (!validId(eventId)) {
      return {
        success: false,
        reason: 'invalid_event_id'
      };
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1
    ) {
      return {
        success: false,
        reason: 'invalid_amount'
      };
    }

    const state = this.readState();
    const before = this.buildSummary(state);

    if (state.appliedEventIds.includes(eventId)) {
      return {
        success: false,
        reason: 'already_granted',
        ...before
      };
    }

    const grantedXP = Math.min(
      amount,
      MAX_TOTAL_XP - state.totalXP
    );

    state.totalXP += grantedXP;
    state.appliedEventIds.push(eventId);

    state.history.push({
      type: 'xp',
      eventId,
      amount: grantedXP,
      label: String(label || source),
      source: String(source),
      scopeId,
      createdAt: new Date().toISOString()
    });

    const after = this.commit(state);
    const gainedLevels =
      after.level - before.level;

    const result = {
      success: true,
      eventId,
      grantedXP,
      gainedLevels,
      gainedPoints: gainedLevels,
      before,
      after
    };

    this.publish(XP_GRANTED, result);

    if (gainedLevels > 0) {
      this.publish(LEVEL_UP, {
        ...result,
        title: __dialogueText("managers/ProgressionManager.js", "t_ec89a5737cd9d82fe273"),
        message:
          __dialogueText("managers/ProgressionManager.js", "t_403a5c2f1f2be4cef9ba")
      });
    }

    return result;
  }

  getBaseStats() {
    const saved = gameState.detectiveStats;

    if (!isObject(saved)) {
      return null;
    }

    const stats = { ...saved };

    for (const statId of STAT_IDS) {
      if (
        !Number.isSafeInteger(stats[statId]) ||
        stats[statId] < 1
      ) {
        return null;
      }
    }

    return stats;
  }

  getStatsSummary() {
    const baseStats = this.getBaseStats();

    if (!baseStats) {
      return {
        success: false,
        reason: 'character_stats_missing'
      };
    }

    return {
      success: true,
      baseStats,

      effectiveStats: getEffectiveStats({
        profile:
          gameState.detectiveProfile || 'analyst',

        stats: baseStats
      }),

      ...this.getSummary()
    };
  }

  spendPoint(statId) {
    if (!STAT_IDS.includes(statId)) {
      return {
        success: false,
        reason: 'unknown_stat'
      };
    }

    const state = this.readState();
    const summary = this.buildSummary(state);

    if (summary.availablePoints < 1) {
      return {
        success: false,
        reason: 'no_skill_points'
      };
    }

    const baseStats = this.getBaseStats();

    if (!baseStats) {
      return {
        success: false,
        reason: 'character_stats_missing'
      };
    }

    if (
      baseStats[statId] >= Number.MAX_SAFE_INTEGER
    ) {
      return {
        success: false,
        reason: 'stat_limit'
      };
    }

    const previousValue = baseStats[statId];

    const nextStats = {
      ...baseStats,
      [statId]: previousValue + 1
    };

    state.spentPoints += 1;

    state.history.push({
      type: 'skill_point',
      statId,
      previousValue,
      newValue: nextStats[statId],
      createdAt: new Date().toISOString()
    });

    gameState.detectiveStats = nextStats;
    gameState.progressionState = copy(state);

    if (statId === 'observation') {
      try {
        hintManager.syncObservation();
      } catch (error) {
        console.error(
          '[Progression] Observation hint sync failed.',
          error
        );
      }
    }

    requestAutosave();

    const after = this.getStatsSummary();

    this.publish('agentStatsChanged', {
      source: 'progression',
      statId,
      stats: { ...nextStats },
      effectiveStats: after.effectiveStats
    });

    this.publish(
      PROGRESSION_CHANGED,
      this.buildSummary(state)
    );

    return {
      success: true,
      statId,
      previousValue,
      newValue: nextStats[statId],
      ...after
    };
  }

  grantArtifactRecoveryXP(payload = {}) {
    if (!isObject(payload)) {
      return {
        success: false,
        reason: 'invalid_recovery_event'
      };
    }

    const missionId = stableId(payload.missionId);
    const artifactId = stableId(payload.artifact?.id);

    if (!missionId || !artifactId) {
      return {
        success: false,
        reason: 'missing_recovery_identity'
      };
    }

    // Zdarzenie samo w sobie nie wystarcza.
    // W kolekcji musi istnieć pasujący wpis.
    const recoveredArtifacts =
      Array.isArray(gameState.recoveredArtifacts)
        ? gameState.recoveredArtifacts
        : [];

    const registered = recoveredArtifacts.find(
      entry =>
        stableId(entry?.missionId) === missionId &&
        stableId(entry?.artifactId) === artifactId
    );

    if (!registered) {
      console.warn(
        '[Progression] Artifact XP skipped: no matching recovery record.',
        {
          missionId,
          artifactId
        }
      );

      return {
        success: false,
        reason: 'artifact_not_registered'
      };
    }

    // Klucz misji z wpisu kolekcji nie zmienia się
    // zależnie od miejsca odzyskania artefaktu.
    const result = this.grantReward(
      'artifact_recovered',
      missionId,
      __dialogueText("managers/ProgressionManager.js", "t_56624f34f008c43571f4")
    );

    if (result.success) {
      // Sceny mogą zapisać odzyskanie jeszcze przed
      // wysłaniem zdarzenia. Zapisujemy więc również XP.
      const saveSucceeded = saveGameState();

      if (!saveSucceeded) {
        console.warn(
          '[Progression] Artifact XP granted in memory, but saving failed.'
        );
      }

      return {
        ...result,
        saveSucceeded
      };
    }

    return result;
  }

  getHistory() {
    return copy(this.readState().history);
  }
}

export const progressionManager =
  new ProgressionManager();

function handleArtifactRecovered(payload) {
  try {
    progressionManager.grantArtifactRecoveryXP(
      payload
    );
  } catch (error) {
    console.error(
      '[Progression] Artifact recovery XP failed:',
      error
    );
  }
}

// Rejestracja dla całej sesji gry, nie dla konkretnej sceny.
// Zmiana sceny ani zamknięcie HUD-u jej nie usuwa.
EventBus.on(
  'artifactRecovered',
  handleArtifactRecovered,
  null,
  progressionManager
);

export default progressionManager;