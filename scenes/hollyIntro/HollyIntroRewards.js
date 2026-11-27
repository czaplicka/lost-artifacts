import { gameState } from '../../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../../managers/MoneyManager.js';
import { inventoryManager } from '../../managers/InventoryManager.js';
import { ItemsLoader } from '../../ItemsLoader.js';
import hintManager from '../../managers/HintManager.js';
import { T, REWARD_CHOICES } from './HollyIntroText.js';

const REST_VOUCHER_FALLBACK = {
  id: 'rest_voucher',
  name: 'Rest Voucher',
  icon: '🛏️',
  description: 'Permission to stop working. Temporarily. Restores full energy, costs no case time.',
  type: 'item',
  stackable: true,
  metadata: {
    restVoucher: true,
    useMessage: 'Permission to stop working. Temporarily. I feel suspiciously rested.'
  }
};

export function hasCompletedHollyIntro() {
  return (
    gameState.hollyIntroSeen === true ||
    REWARD_CHOICES.some(
      choice => choice.id === gameState.hollyIntroChoice
    )
  );
}

export function grantHollyChoiceReward(choiceId) {
  const fullState = gameState.getState
    ? gameState.getState()
    : {};

  switch (choiceId) {
    case 'cash':
      moneyManager.addCash(250, {
        category: ECONOMY_CATEGORY.AGENCY_ADVANCE,
        description: T('t_a7ef26be8904c900b45f'),
        missionId: 'black-lady-main-case',
        metadata: {
          source: 'holly_intro_choice',
          choiceId
        }
      });
      break;

    case 'rest': {
      const definition =
        ItemsLoader.get?.('consumables', 'restVoucher') || REST_VOUCHER_FALLBACK;
      const added = inventoryManager.addItem({
        ...structuredClone(definition),
        quantity: 2
      });
      if (!added) {
        throw new Error('[HollyIntroScene] Could not add Rest Vouchers to the inventory.');
      }
      break;
    }

    case 'kit':
      hintManager.grantOnce(
        'holly_intro_field_support',
        2,
        T('t_0da52c91c65a43f635d8')
      );
      break;

    case 'travel':
      gameState.updateState({
        freeTransfers: Number(fullState.freeTransfers || 0) + 2
      });
      break;

    default:
      throw new Error(
        `[HollyIntroScene] Unknown reward choice: ${choiceId}`
      );
  }
}