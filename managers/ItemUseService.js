// managers/ItemUseService.js
import { inventoryManager } from './InventoryManager.js';
import { getEnergyManager } from './EnergyManager.js';
import { ItemsLoader } from '../ItemsLoader.js';
import {
  APARTMENT_OBJECTS_POOL,
  RED_HERRING_CONTENTS,
  ESCAPE_CLUES,
  ESCAPE_COMBINATION_ITEMS,
  COMBINE_RULES,
  APARTMENT_ADDITIONAL_ITEMS
} from '../scenes/apartament/ApartmentObjectsPool.js';

await ItemsLoader.load();

const WASTE_WARNING_RATIO = 0.5;
const CONFIRM_WINDOW_MS = 4000;
let pendingConfirm = null;

const apartmentDefinitions = new Map();

for (const entry of [
  ...Object.values(APARTMENT_OBJECTS_POOL)
    .flatMap(object => object.possibleContents || []),
  ...RED_HERRING_CONTENTS,
  ...Object.values(ESCAPE_CLUES),
  ...Object.values(ESCAPE_COMBINATION_ITEMS),
  ...Object.values(COMBINE_RULES).map(rule => rule.produces),
  ...Object.values(APARTMENT_ADDITIONAL_ITEMS)
]) {
  if (entry?.id) apartmentDefinitions.set(String(entry.id), entry);
}

function getDefinition(item) {
  const apartment = item?.metadata?.apartment;

  if (apartment) {
    const originalId = apartment.originalId ?? apartment.item?.id;
    return originalId == null
      ? null
      : apartmentDefinitions.get(String(originalId)) || null;
  }

  for (const category of Object.values(ItemsLoader.catalog || {})) {
    const definition = Object.values(category).find(
      entry => entry?.id === item?.id
    );
    if (definition) return definition;
  }

  return null;
}

function getUseMessage(item) {
  const candidates = [
    item?.metadata?.useMessage,
    item?.metadata?.apartment?.item?.metadata?.useMessage,
    getDefinition(item)?.metadata?.useMessage
  ];

  return candidates.find(
    text => typeof text === 'string' && text.trim()
  )?.trim() || '';
}

function clearPending() {
  pendingConfirm = null;
}

function isPendingFor(itemId) {
  return Boolean(
    pendingConfirm
    && pendingConfirm.itemId === itemId
    && Date.now() - pendingConfirm.timestamp <= CONFIRM_WINDOW_MS
  );
}

function restoresEnergy(item) {
  const amount = Number(item?.metadata?.effect?.energy);
  return Boolean(
    item?.metadata?.consumable
    && Number.isFinite(amount)
    && amount > 0
  );
}

export function canUseItem(item) {
  return item?.id !== undefined && item?.id !== null;
}

export function useItem(itemId) {
  const item = inventoryManager.getItem(itemId);

  if (!item) {
    clearPending();
    return { ok: false, message: 'You do not have that item.' };
  }

  if (!restoresEnergy(item)) {
    clearPending();
    return {
      ok: true,
      commentOnly: true,
      consumed: false,
      message: getUseMessage(item) || 'Better keep this for the right moment.'
    };
  }

  const energy = getEnergyManager();
  const current = energy.getCurrentEnergy();
  const max = energy.getMaxEnergy();

  if (current >= max) {
    clearPending();
    return {
      ok: false,
      message: 'You are already full of energy. Save it for later.'
    };
  }

  const amount = Number(item.metadata.effect.energy);
  const missing = max - current;
  const wasted = Math.max(0, amount - missing);

  if (missing < amount * WASTE_WARNING_RATIO && !isPendingFor(item.id)) {
    pendingConfirm = { itemId: item.id, timestamp: Date.now() };
    return {
      ok: false,
      needsConfirm: true,
      message:
        `Are you sure? ${item.name} gives +${amount}, ` +
        `but you only miss ${missing}. ${wasted} would go to waste. ` +
        'Click USE again to confirm.'
    };
  }

  clearPending();

  const result = energy.recoverCustom(
    amount,
    `${item.name}: +${amount}`,
    { recoveryType: 'item', recoverySubtype: item.id }
  );

  if (!result.success) {
    return { ok: false, message: result.message || 'Nothing happened.' };
  }

  inventoryManager.removeQuantity(item.id, 1);

  return {
    ok: true,
    consumed: true,
    recovered: result.amount,
    message: `${getUseMessage(item) || `You use ${item.name}.`} (+${result.amount} energy)`
  };
}