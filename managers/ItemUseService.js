// managers/ItemUseService.js
import { inventoryManager } from './InventoryManager.js';
import { getEnergyManager } from './EnergyManager.js';


// Ostrzeżenie, gdy brakuje mniej niż ta część efektu przedmiotu (0.5 = połowa).
const WASTE_WARNING_RATIO = 0.5;
const CONFIRM_WINDOW_MS = 4000;


let pendingConfirm = null;


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


export function canUseItem(item) {
  return Boolean(
    item?.metadata?.consumable
    && Number(item?.metadata?.effect?.energy) > 0
  );
}


export function useItem(itemId) {
  const item = inventoryManager.getItem(itemId);


  if (!item) {
    clearPending();
    return { ok: false, message: 'You do not have that item.' };
  }


  if (!canUseItem(item)) {
    clearPending();
    return {
      ok: false,
      message: `You can't use ${item.name} that way. Believe me, you'd know.`
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


  const needsWarning = missing < amount * WASTE_WARNING_RATIO;


  if (needsWarning && !isPendingFor(item.id)) {
    pendingConfirm = {
      itemId: item.id,
      timestamp: Date.now()
    };


    return {
      ok: false,
      needsConfirm: true,
      message:
        `Are you sure? ${item.name} gives +${amount}, but you only miss ${missing}. ` +
        `${wasted} would go to waste. Click USE again to confirm.`
    };
  }


  clearPending();


  const result = energy.recoverCustom(
    amount,
    `${item.name}: +${amount}`,
    {
      recoveryType: 'item',
      recoverySubtype: item.id
    }
  );


  if (!result.success) {
    return {
      ok: false,
      message: result.message || 'Nothing happened.'
    };
  }


  inventoryManager.removeQuantity(item.id, 1);


  return {
    ok: true,
    recovered: result.amount,
    message: `${item.metadata.useMessage || `You use ${item.name}.`} (+${result.amount} energy)`
  };
}