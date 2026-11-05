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
      reason: 'Another transaction is in progress.'
    };
  }

  if (!validFeed(item)) {
    return {
      enabled: false,
      reason: 'Pigeon feed catalog data is unavailable.'
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
      reason: 'Pigeon feed stack is full.'
    };
  }

  const capacity = inventoryManager.getCapacity();

  if (
    !existing &&
    capacity.current >= capacity.max
  ) {
    return {
      enabled: false,
      reason: 'Inventory full. Make room for pigeon feed.'
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
      reason: 'Not enough personal cash.'
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
        description: 'Internet shop: Pigeon Feed (1 portion)',
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
        message: 'Not enough personal cash.'
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
        'One portion of pigeon feed added to your PI inventory. ' +
        'The pigeons approve this expense.'
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
      message: 'Purchase failed. Your cash and inventory were restored.'
    };
  } finally {
    busy = false;
  }
}