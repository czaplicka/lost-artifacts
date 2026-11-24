import { gameState } from '../../GameData.js';
import { moneyManager, ECONOMY_CATEGORY } from '../../managers/MoneyManager.js';
import hintManager from '../../managers/HintManager.js';
import { T, REWARD_CHOICES } from './HollyIntroText.js';

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

    case 'rest':
      gameState.updateState({
        restVouchers: Number(fullState.restVouchers || 0) + 2
      });
      break;

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
