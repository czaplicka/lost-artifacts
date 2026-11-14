import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
      message: __dialogueText("managers/DeadMailFinaleManager.js", "t_5ce8746779abf9a02adc")
    };
  }

  const state = getDeadMailFinale();

  if (state.rewardClaimed) {
    return {
      ok: true,
      alreadyClaimed: true,
      message:
        __dialogueText("managers/DeadMailFinaleManager.js", "t_46e0cfa6ca2818bee96c") +
        __dialogueText("managers/DeadMailFinaleManager.js", "t_0f3da9f3ce3d5c189a71")
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
        __dialogueText("managers/DeadMailFinaleManager.js", "t_799f9b32e66ad2d73147") +
        __dialogueText("managers/DeadMailFinaleManager.js", "t_694d33981c073088229c") +
        __dialogueText("managers/DeadMailFinaleManager.js", "t_81c14ca7e61ef54f97a5")
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
      ? __dialogueText("managers/DeadMailFinaleManager.js", "t_6eb9c7f43eb43a92d315")
      : __dialogueText("managers/DeadMailFinaleManager.js", "t_c9dddc06a1ed1a0b4965")
  };
}