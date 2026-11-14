export * from './DeadMailFinaleManagerCore.js';

import {
  canStartDeadMailFinale,
  getDeadMailFinale
} from './DeadMailFinaleManagerCore.js';

import {
  gameState
} from '../GameData.js';

import {
  requestAutosave,
  saveGameState
} from '../gameStatePersistence.js';

import {
  piInventoryManager
} from './PIInventoryManager.js';

import {
  DEAD_MAIL_REWARD
} from '../assets/data/deadMailFinaleData.js';

export function claimDeadMailReward() {
  if (
    !canStartDeadMailFinale() ||
    !getDeadMailFinale().completed
  ) {
    return {
      ok: false,
      message: 'Finish the report first.'
    };
  }

  const state = getDeadMailFinale();

  if (state.rewardClaimed) {
    return {
      ok: true,
      alreadyClaimed: true,
      message:
        'The Last Ringtone has already been claimed. ' +
        'No duplicate item was added.'
    };
  }

  let added = piInventoryManager.hasItem(
    DEAD_MAIL_REWARD.id
  );

  if (!added) {
    try {
      added = piInventoryManager.addItem(
        JSON.parse(
          JSON.stringify(DEAD_MAIL_REWARD)
        )
      ) === true;
    } catch (error) {
      added = piInventoryManager.hasItem(
        DEAD_MAIL_REWARD.id
      );

      console.error(
        '[Dead Mail] PI inventory notification failed:',
        error
      );
    }
  }

  if (!added) {
    return {
      ok: false,
      pending: true,
      message:
        'PI inventory full or unavailable. ' +
        'The phone remains waiting here. ' +
        'Make room and claim it later.'
    };
  }

  gameState.deadMailPreview = {
    ...gameState.deadMailPreview,
    finale: {
      ...state,
      rewardClaimed: true
    }
  };

  requestAutosave();

  let saved = false;

  try {
    saved = saveGameState() === true;
  } catch (error) {
    console.error(
      '[Dead Mail] Reward save failed:',
      error
    );
  }

  return {
    ok: true,
    saved,
    message: saved
      ? 'The Last Ringtone added to PI inventory. Its messages remain replayable here.'
      : 'Phone added, but saving failed. Use SAVE AGAIN before leaving.'
  };
}