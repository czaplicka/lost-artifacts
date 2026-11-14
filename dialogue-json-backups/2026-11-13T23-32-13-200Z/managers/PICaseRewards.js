import { gameState } from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  moneyManager,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  progressionManager
} from './ProgressionManager.js';

import {
  ACHIEVEMENTS,
  checkAndAwardAchievements
} from './AchievementManager.js';

import {
  awardPICaseReputation
} from './PICaseStanding.js';

const DEFINITIONS = Object.freeze({
  pi_grand_conspiracy: Object.freeze({
    title: 'The Midnight Gardener',
    cash: 100,
    xpReward: 'pi_case_small',
    xp: 50,
    achievementId: 'pi_midnight_gardener',
    achievementTitle: 'Much Ado About Mulch',
    achievementDescription:
      'Solve The Midnight Gardener. Suspicion is not a fertiliser.'
  }),

  pi_moms_not_proud: Object.freeze({
    title: "Mom's Not Proud",
    cash: 150,
    xpReward: 'pi_case_small',
    xp: 50,
    achievementId: 'pi_phantom_artist',
    achievementTitle: 'Caught in the Paint',
    achievementDescription:
      'Solve the Phantom artist case. The writing was on the wall.'
  }),

  pi_short_shorts: Object.freeze({
    title: 'Who Wears Short Shorts?',
    cash: 200,
    xpReward: 'pi_case_medium',
    xp: 100,
    achievementId: 'pi_short_shorts',
    achievementTitle: 'The Full Picture',
    achievementDescription:
      'Resolve the insurance investigation using evidence, not assumptions.'
  })
});

const busy = new Set();

function definitionFor(caseId) {
  return Object.prototype.hasOwnProperty.call(
    DEFINITIONS,
    caseId
  )
    ? DEFINITIONS[caseId]
    : null;
}

function questFor(caseId) {
  const quests = gameState.piQuests?.quests;

  return Object.prototype.hasOwnProperty.call(
    quests || {},
    caseId
  )
    ? quests[caseId]
    : null;
}

function recordFor(caseId) {
  return questFor(caseId)?.rewardSettlement || {};
}

function updateQuest(caseId, patch) {
  const quest = questFor(caseId);

  if (!quest) {
    throw new Error(`Missing PI quest: ${caseId}`);
  }

  gameState.piQuests = {
    ...gameState.piQuests,

    quests: {
      ...gameState.piQuests.quests,

      [caseId]: {
        ...quest,
        ...patch
      }
    }
  };

  requestAutosave();
}

function updateRecord(caseId, patch) {
  updateQuest(caseId, {
    rewardSettlement: {
      ...recordFor(caseId),
      ...patch
    }
  });
}

function paymentId(caseId) {
  return `pi-case-reward:${caseId}`;
}

function paymentRecorded(caseId) {
  const log = Array.isArray(gameState.moneyLog)
    ? gameState.moneyLog
    : [];

  return log.some(entry =>
    entry?.type === 'income' &&
    entry.source === 'cash' &&
    entry.metadata?.piCaseRewardId === paymentId(caseId)
  );
}

function settleCash(caseId, definition) {
  if (
    recordFor(caseId).cashPaid === true ||
    paymentRecorded(caseId)
  ) {
    updateRecord(caseId, { cashPaid: true });
    return;
  }

  const before = moneyManager.getState();

  try {
    moneyManager.addCash(definition.cash, {
      category: ECONOMY_CATEGORY.SIDE_CASE,
      missionId: caseId,
      description: `PI case: ${definition.title}`,

      metadata: {
        piCaseRewardId: paymentId(caseId),
        questId: caseId
      }
    });
  } catch (error) {
    if (!paymentRecorded(caseId)) {
      gameState.cash = before.cash;
      gameState.moneyLog =
        JSON.parse(JSON.stringify(before.moneyLog));

      throw error;
    }

    console.error(
      '[PICaseRewards] Cash listener failed after payment:',
      error
    );
  }

  if (!paymentRecorded(caseId)) {
    throw new Error('PI payment was not recorded.');
  }

  updateRecord(caseId, { cashPaid: true });
}

function settleXP(caseId, definition) {
  // Ten sam scopeId co w istniejących rozliczeniach PI.
  const eventId = JSON.stringify([
    'reward',
    definition.xpReward,
    caseId
  ]);

  if (!progressionManager.hasReward(eventId)) {
    try {
      const result = progressionManager.grantReward(
        definition.xpReward,
        caseId,
        `PI case completed: ${definition.title}`
      );

      if (
        !result.success &&
        result.reason !== 'already_granted'
      ) {
        throw new Error(
          `PI XP failed: ${result.reason}`
        );
      }
    } catch (error) {
      if (!progressionManager.hasReward(eventId)) {
        throw error;
      }

      console.error(
        '[PICaseRewards] XP listener failed after commit:',
        error
      );
    }
  }

  if (!progressionManager.hasReward(eventId)) {
    throw new Error('PI XP was not recorded.');
  }

  updateRecord(caseId, { xpGranted: true });
}

function installAchievements() {
  for (
    const [caseId, definition]
    of Object.entries(DEFINITIONS)
  ) {
    ACHIEVEMENTS[definition.achievementId] = {
      id: definition.achievementId,
      icon: 'PI',
      title: definition.achievementTitle,
      description: definition.achievementDescription,

      isUnlocked: () =>
        recordFor(caseId).completed === true
    };
  }
}

installAchievements();

export function getPICaseRewardPreview(caseId) {
  const definition = definitionFor(caseId);

  if (!definition) return null;

  return {
    cash: definition.cash,
    xp: definition.xp,
    fame: 10,
    achievement: definition.achievementTitle
  };
}

/**
 * Wywołuje wyłącznie zweryfikowany finał sprawy.
 * Cele muszą być wcześniej oznaczone jako ukończone.
 * Integrity rozlicza finał przy konkretnej decyzji,
 * przez applyPIIntegrityDecision z PICaseStanding.js.
 */
export function settlePICaseRewards(caseId) {
  const definition = definitionFor(caseId);
  const quest = questFor(caseId);

  if (!definition || !quest) {
    return {
      ok: false,
      message: 'This PI case has no reward definition.'
    };
  }

  if (busy.has(caseId)) {
    return {
      ok: false,
      message: 'The case is being processed.'
    };
  }

  if (recordFor(caseId).completed === true) {
    checkAndAwardAchievements();

    return {
      ok: true,
      alreadySettled: true,
      message: 'This case has already been paid.'
    };
  }

  const objectivesComplete =
    Array.isArray(quest.objectives) &&
    quest.objectives.length > 0 &&
    quest.objectives.every(
      objective => objective.completed === true
    );

  if (
    !['active', 'settling'].includes(quest.status) ||
    !objectivesComplete
  ) {
    return {
      ok: false,
      message: 'Finish the investigation and report first.'
    };
  }

  busy.add(caseId);

  try {
    updateQuest(caseId, { status: 'settling' });

    settleCash(caseId, definition);
    settleXP(caseId, definition);

    awardPICaseReputation({
      caseId,
      title: definition.title
    });

    updateRecord(caseId, {
      reputationGranted: true
    });

    const completedAt = new Date().toISOString();

    updateQuest(caseId, {
      status: 'completed',
      completedAt,

      rewardSettlement: {
        ...recordFor(caseId),
        completed: true,
        completedAt,
        cash: definition.cash,
        xp: definition.xp,
        nominalFame: 10,
        achievementId: definition.achievementId
      }
    });

    checkAndAwardAchievements();
    requestAutosave();

    return {
      ok: true,
      alreadySettled: false,

      rewards: getPICaseRewardPreview(caseId),

      message:
        `Case closed. $${definition.cash} received. ` +
        `XP reward: ${definition.xp}. ` +
        'Reputation reward: +10 (maximum 100).'
    };
  } catch (error) {
    console.error(
      '[PICaseRewards] Settlement interrupted:',
      error
    );

    requestAutosave();

    return {
      ok: false,
      message:
        'Settlement interrupted. Retry the report. ' +
        'Recorded rewards will not be repeated.'
    };
  } finally {
    busy.delete(caseId);
  }
}