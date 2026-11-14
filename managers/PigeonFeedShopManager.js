import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {
  gameState
} from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  piInventoryManager as inventoryManager
} from './PIInventoryManager.js';

import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

export const PIGEON_FEED_PRICE = 2;
export const PIGEON_FEED_ID = 'pigeon_feed';

const MAX_STACK = 999;

let busy = false;

function validFeed(item) {
  return (
    item?.id === PIGEON_FEED_ID &&
    typeof item.name === 'string' &&
    item.name.length > 0 &&
    item.stackable === true &&
    item.metadata?.pigeonFeed === true &&
    item.metadata?.consumable !== true &&
    !item.metadata?.effect
  );
}

export function getPigeonFeedAvailability(item) {
  if (busy) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PigeonFeedShopManager.js", "t_882d4fae9788ba4165d5")
    };
  }

  if (!validFeed(item)) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PigeonFeedShopManager.js", "t_2de4b214d72cd1f12fa8")
    };
  }

  const existing =
    inventoryManager.getItem(PIGEON_FEED_ID);

  if (
    existing &&
    (
      !existing.stackable ||
      existing.quantity >= MAX_STACK
    )
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PigeonFeedShopManager.js", "t_f85a06638dea77da0c56")
    };
  }

  const capacity = inventoryManager.getCapacity();

  if (
    !existing &&
    capacity.current >= capacity.max
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PigeonFeedShopManager.js", "t_9234fa1b396b72d1e2f3")
    };
  }

  if (
    !moneyManager.canAfford(
      PIGEON_FEED_PRICE,
      MONEY_SOURCE.CASH
    )
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PigeonFeedShopManager.js", "t_6150b8bb4551d17850e2")
    };
  }

  return {
    enabled: true,
    reason: ''
  };
}

export function buyPigeonFeed(item) {
  const availability =
    getPigeonFeedAvailability(item);

  if (!availability.enabled) {
    return {
      ok: false,
      message: availability.reason
    };
  }

  const balances = JSON.parse(
    JSON.stringify(moneyManager.getState())
  );

  const inventory =
    inventoryManager.exportState();

  const selectedId =
    inventoryManager.getSelectedItem()?.id;

  busy = true;

  try {
    const result = moneyManager.spend(
      PIGEON_FEED_PRICE,
      {
        source: MONEY_SOURCE.CASH,
        category: ECONOMY_CATEGORY.OFFICE_UPGRADE,
        description: __dialogueText("managers/PigeonFeedShopManager.js", "t_410185c36331bbebd21a"),
        missionId: null,
        metadata: {
          itemId: PIGEON_FEED_ID,
          quantity: 1,
          pigeonSupplies: true
        }
      }
    );

    if (!result.ok) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonFeedShopManager.js", "t_6150b8bb4551d17850e2")
      };
    }

    const purchased = JSON.parse(
      JSON.stringify(item)
    );

    purchased.quantity = 1;

    delete purchased.addedAt;

    if (!inventoryManager.addItem(purchased)) {
      throw new Error(
        'Inventory rejected pigeon feed.'
      );
    }

    requestAutosave();

    return {
      ok: true,
      message:
        __dialogueText("managers/PigeonFeedShopManager.js", "t_6ae79f92ad3068e6ed91") +
        __dialogueText("managers/PigeonFeedShopManager.js", "t_748768d3490c50d723da")
    };
  } catch (error) {
    gameState.cash = balances.cash;
    gameState.moneyLog = balances.moneyLog;

    inventoryManager.importState(inventory);

    if (selectedId) {
      inventoryManager.selectItem(selectedId);
    }

    requestAutosave();

    console.error(
      '[PigeonFeedShop] Purchase failed:',
      error
    );

    return {
      ok: false,
      message: __dialogueText("managers/PigeonFeedShopManager.js", "t_79d9f866638dffd6775c")
    };
  } finally {
    busy = false;
  }
}