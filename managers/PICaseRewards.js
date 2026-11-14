import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    title: __dialogueText("managers/PICaseRewards.js", "t_71a2c6ba30280bbece40"),
    cash: 100,
    xpReward: 'pi_case_small',
    xp: 50,
    achievementId: 'pi_midnight_gardener',
    achievementTitle: __dialogueText("managers/PICaseRewards.js", "t_71971b9e8bb96ff99ba4"),
    achievementDescription:
      __dialogueText("managers/PICaseRewards.js", "t_5532691fccc8a42fdb8e")
  }),

  pi_moms_not_proud: Object.freeze({
    title: __dialogueText("managers/PICaseRewards.js", "t_988e6ec5492baf05487d"),
    cash: 150,
    xpReward: 'pi_case_small',
    xp: 50,
    achievementId: 'pi_phantom_artist',
    achievementTitle: __dialogueText("managers/PICaseRewards.js", "t_d2669a5b9ac1be474332"),
    achievementDescription:
      __dialogueText("managers/PICaseRewards.js", "t_83a67ab9caae026887e4")
  }),

  pi_short_shorts: Object.freeze({
    title: __dialogueText("managers/PICaseRewards.js", "t_38c4bff985b025984966"),
    cash: 200,
    xpReward: 'pi_case_medium',
    xp: 100,
    achievementId: 'pi_short_shorts',
    achievementTitle: __dialogueText("managers/PICaseRewards.js", "t_a4d86efb396273f92b56"),
    achievementDescription:
      __dialogueText("managers/PICaseRewards.js", "t_91b8d28082cbc5ef43e4")
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
      description: `${__dialogueText("managers/PICaseRewards.js", "t_4b5212bb2acdab23e8a4")}${definition.title}`,

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
        `${__dialogueText("managers/PICaseRewards.js", "t_e51810bc4200869d7993")}${definition.title}`
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
      message: __dialogueText("managers/PICaseRewards.js", "t_bd73721aff86b6ef9f45")
    };
  }

  if (busy.has(caseId)) {
    return {
      ok: false,
      message: __dialogueText("managers/PICaseRewards.js", "t_6e6e9bd9c6134527ed6c")
    };
  }

  if (recordFor(caseId).completed === true) {
    checkAndAwardAchievements();

    return {
      ok: true,
      alreadySettled: true,
      message: __dialogueText("managers/PICaseRewards.js", "t_9b14ac060d679278ba18")
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
      message: __dialogueText("managers/PICaseRewards.js", "t_749c27e267387bf6a6ae")
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
        `${__dialogueText("managers/PICaseRewards.js", "t_6f0f63bb129c1b150714")}${definition.cash}${__dialogueText("managers/PICaseRewards.js", "t_4ef97769ac591dab769f")}` +
        `${__dialogueText("managers/PICaseRewards.js", "t_6a2928e587fca3e638f6")}${definition.xp}${__dialogueText("managers/PICaseRewards.js", "t_8dccf256f6d5783e62bb")}` +
        __dialogueText("managers/PICaseRewards.js", "t_30359846dfbc8db59fe3")
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
        __dialogueText("managers/PICaseRewards.js", "t_59dd928c3257aa7003c9") +
        __dialogueText("managers/PICaseRewards.js", "t_ce9eb3707406a7f8f47f")
    };
  } finally {
    busy.delete(caseId);
  }
}