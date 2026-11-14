import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { getEffectiveStats } from '../ui/characterCreation/CharacterCreationData.js';

const SEARCH_ACTIVITIES = new Set(['crime_scene', 'hidden_objects', 'apartment_visit']);

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function normalizeCost(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError('[ResourcefulnessManager] Cost must be a non-negative number.');
  }
  return Math.ceil(number);
}

class ResourcefulnessManager {
  getEffectiveResourcefulness() {
    const stats = getEffectiveStats({
      profile: gameState.detectiveProfile || 'analyst',
      stats: gameState.detectiveStats || {}
    });
    return nonNegativeInteger(stats.resourcefulness);
  }

  getBonuses() {
    const resourcefulness = this.getEffectiveResourcefulness();
    let localTransportDiscountPercent = 0;
    let searchEnergyReduction = 0;
    if (resourcefulness >= 6) {
      localTransportDiscountPercent = 25;
      searchEnergyReduction = 3;
    } else if (resourcefulness === 5) {
      localTransportDiscountPercent = 20;
      searchEnergyReduction = 3;
    } else if (resourcefulness === 4) {
      localTransportDiscountPercent = 15;
      searchEnergyReduction = 2;
    } else if (resourcefulness === 3) {
      localTransportDiscountPercent = 10;
      searchEnergyReduction = 1;
    }
    return {
      resourcefulness, unlocked: resourcefulness >= 3,
      localTransportDiscountPercent, searchEnergyReduction
    };
  }

  getSearchEnergyQuote(activityType, costBeforeDiscount) {
    const originalCost = normalizeCost(costBeforeDiscount);
    const bonuses = this.getBonuses();
    const eligible = SEARCH_ACTIVITIES.has(activityType);
    const maximumReduction = originalCost > 0
      ? Math.min(Math.floor(originalCost / 2), originalCost - 1) : 0;
    const saved = eligible ? Math.min(bonuses.searchEnergyReduction, maximumReduction) : 0;
    return {
      activityType, resourcefulness: bonuses.resourcefulness,
      eligible, originalCost, finalCost: originalCost - saved, saved, applied: saved > 0
    };
  }

  getLocalTransportMoneyQuote(costBeforeDiscount) {
    const originalCost = normalizeCost(costBeforeDiscount);
    const bonuses = this.getBonuses();
    const discountedCost = Math.ceil(originalCost * (100 - bonuses.localTransportDiscountPercent) / 100);
    const finalCost = originalCost === 0 ? 0 : Math.max(1, discountedCost);
    const saved = originalCost - finalCost;
    return {
      resourcefulness: bonuses.resourcefulness,
      discountPercent: bonuses.localTransportDiscountPercent,
      originalCost, finalCost, saved, applied: saved > 0
    };
  }

  formatSearchEnergyQuote(quote) {
    if (!quote.applied) return `${__dialogueText("managers/ResourcefulnessManager.js", "t_9b9ab12dc1fbf453b5dc")}${quote.finalCost}`;
    return `${__dialogueText("managers/ResourcefulnessManager.js", "t_9b9ab12dc1fbf453b5dc")}${quote.originalCost}${__dialogueText("managers/ResourcefulnessManager.js", "t_592f6fd0750e870cf487")}${quote.finalCost}${__dialogueText("managers/ResourcefulnessManager.js", "t_714306a9abb47918f938")}${quote.saved}`;
  }

  formatLocalTransportMoneyQuote(quote, currency = '') {
    const suffix = currency ? ` ${currency}` : '';
    if (!quote.applied) return `${__dialogueText("managers/ResourcefulnessManager.js", "t_a76476b4d438a3b012b1")}${quote.finalCost}${suffix}`;
    return `${__dialogueText("managers/ResourcefulnessManager.js", "t_a76476b4d438a3b012b1")}${quote.originalCost}${__dialogueText("managers/ResourcefulnessManager.js", "t_592f6fd0750e870cf487")}${quote.finalCost}${suffix}${__dialogueText("managers/ResourcefulnessManager.js", "t_714306a9abb47918f938")}${quote.discountPercent}${__dialogueText("managers/ResourcefulnessManager.js", "t_bbf3f11cb5b43e700273")}`;
  }
}

export const resourcefulnessManager = new ResourcefulnessManager();
export default resourcefulnessManager;
