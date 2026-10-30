import { gameState } from '../../GameData.js';
import { EventBus } from '../../EventBus.js';

import {
  saveGameState
} from '../../gameStatePersistence.js';

import {
  hintManager
} from '../../managers/HintManager.js';

import {
  getEnergyManager
} from '../../managers/EnergyManager.js';

import {
  getQuestHint
} from './QuestHintSystem.js';

const RECEIPTS_KEY = 'piQuestHintReceipts';

const COSTS = {
  cut_corners: {
    energy: 5,
    minutes: 10
  },

  squad_help: {
    energy: 10,
    minutes: 30
  }
};

function receiptKey(questId, stage, level) {
  return JSON.stringify([
    questId,
    stage,
    level
  ]);
}

function getReceipt(questId, stage, level) {
  return gameState[RECEIPTS_KEY]?.[
    receiptKey(questId, stage, level)
  ] || null;
}

export function getQuestHintOffer(questId) {
  const quest =
    gameState.piQuests?.quests?.[questId];

  if (!quest || quest.status === 'completed') {
    return null;
  }

  const initial = getQuestHint(questId, 0);

  if (!initial) return null;

  const receipts = [0, 1, 2].map(
    level => getReceipt(
      questId,
      initial.stage,
      level
    )
  );

  const latest = receipts
    .filter(Boolean)
    .at(-1) || null;

  const nextLevel = receipts.findIndex(
    receipt => !receipt
  );

  const next = nextLevel >= 0
    ? getQuestHint(questId, nextLevel)
    : null;

  return {
    questId,
    stage: initial.stage,
    level: nextLevel,
    next,
    latest,
    complete: nextLevel < 0,
    freeCount: hintManager.getAvailableCount()
  };
}

export function purchaseQuestHint(
  questId,
  method,
  expected,
  sceneId
) {
  if (
    !['free_hint', 'cut_corners', 'squad_help']
      .includes(method)
  ) {
    return {
      success: false,
      message: 'Choose an assistance method.'
    };
  }

  const offer = getQuestHintOffer(questId);

  if (
    !offer ||
    !offer.next ||
    offer.stage !== expected.stage ||
    offer.level !== expected.level
  ) {
    return {
      success: false,
      stale: true,
      message:
        'The investigation has moved on. Open hints again.'
    };
  }

  const energy = getEnergyManager();

  if (
    energy.isForcedSleepActive() ||
    energy.isManualSleepActive()
  ) {
    return {
      success: false,
      message:
        'Finish resting before requesting assistance.'
    };
  }

  const context = {
    caseId: questId,
    missionId: null,
    sceneId,

    itemId:
      `pi_hint:${offer.stage}:${offer.level}`
  };

  let result;

  if (method === 'free_hint') {
    result = hintManager.useFreeHint(context);
  } else {
    const cost = COSTS[method];

    if (!energy.canAfford(cost.energy).ok) {
      return {
        success: false,
        message:
          'Not enough energy. Rest or choose a free hint.'
      };
    }

    const payment = energy.consumeCustom(
      cost.energy,
      `PI assistance (${method})`,
      {
        requireFullAmount: true,
        activityType: 'pi_quest_hint'
      }
    );

    if (!payment.success) {
      return {
        success: false,
        message:
          payment.message ||
          'Unable to pay for assistance.'
      };
    }

    result = hintManager.recordPaidHint(
      method,
      context,
      {
        ...cost,
        cash: 0
      }
    );
  }

  if (!result?.success) {
    return {
      success: false,
      message:
        method === 'free_hint'
          ? 'No free hints remain. Choose another method.'
          : 'Assistance could not be obtained.'
    };
  }

  const receipt = {
    questId,
    stage: offer.stage,
    level: offer.level,
    text: offer.next.text,
    method,
    historyEntryId: result.entry.id,
    createdAt: result.entry.createdAt
  };

  const key = receiptKey(
    questId,
    receipt.stage,
    receipt.level
  );

  gameState.updateState({
    [RECEIPTS_KEY]: {
      ...(gameState[RECEIPTS_KEY] || {}),
      [key]: receipt
    },

    piQuestHints: {
      version: 1,

      quests: {
        ...(gameState.piQuestHints?.quests || {}),

        [questId]: {
          stage: receipt.stage,
          level: receipt.level
        }
      }
    }
  });

  if (COSTS[method]) {
    EventBus.emit(
      'advanceTime',
      0,
      COSTS[method].minutes
    );
  }

  const saved = saveGameState();

  return {
    success: true,
    receipt,
    saved
  };
}