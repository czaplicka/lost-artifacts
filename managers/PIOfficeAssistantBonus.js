import { gameState } from '../GameData.js';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const positive = value => Number.isSafeInteger(value) && value > 0;

/** Pure quote: no cash, ownership or quest state is changed here. */
export function getPIOfficeAssistantBonus(amount, options = {}) {
  const empty = { bonus: 0, baseReward: 0, percent: 0 };
  if (!positive(amount) || options.category !== 'side_case') return empty;
  const metadata = options.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return empty;
  if (metadata.passiveIncome || metadata.officeAssistant ||
      metadata.refund || metadata.advance || metadata.reimbursement) return empty;
  const owned = gameState.piOfficeShop?.owned;
  if (!owned || !hasOwn(owned, 'office_assistant')) return empty;
  const percent = owned.office_assistant?.rewardBonusPercent;
  if (!positive(percent) || percent > 100) return empty;

  const id = metadata.questId;
  const quests = gameState.piQuests?.quests;
  if (typeof id !== 'string' || !quests || !hasOwn(quests, id)) return empty;
  const quest = quests[id];
  if (!quest || !['active', 'completed'].includes(quest.status) ||
      !positive(quest.reward) || options.missionId !== id) return empty;

  // Only identified PI settlement payments qualify, not arbitrary side income.
  const recognised =
    (id === 'pi_two_glasses' && typeof metadata.reedSettlementId === 'string' && metadata.reedSettlementId.length > 0) ||
    (id === 'pi_stolen_alibi' && typeof metadata.alibiSettlementId === 'string' && metadata.alibiSettlementId.length > 0) ||
    (id === 'pi_dead_men_calling' && typeof metadata.deadMenSettlementId === 'string' && metadata.deadMenSettlementId.length > 0) ||
    (metadata.piJobCompletion === true && typeof metadata.piSettlementId === 'string' && metadata.piSettlementId.length > 0);
  if (!recognised) return empty;

  let baseReward = Math.min(amount, quest.reward);
  if (id === 'pi_stolen_alibi') {
    if (!Number.isSafeInteger(metadata.contractFee) || metadata.contractFee < 0 ||
        !Number.isSafeInteger(metadata.silencePayment) || metadata.silencePayment < 0 ||
        metadata.contractFee + metadata.silencePayment !== amount) return empty;
    baseReward = Math.min(baseReward, metadata.contractFee);
  }
  const bonus = Math.floor(baseReward * percent / 100);
  if (!Number.isSafeInteger(bonus) || bonus <= 0 || !Number.isSafeInteger(amount + bonus)) return empty;
  return { bonus, baseReward, percent };
}
