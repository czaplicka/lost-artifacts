import { dialogueText as __dialogueText, formatDialogueText } from '../dialogues/DialogueText.js';
import { inventoryManager } from './InventoryManager.js';
import { thiefdokuService } from '../systems/thiefdoku/ThiefdokuService.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { supabase } from '../supabase-client.js';
import {
  MEDAL_SLOT_OFFERS, EURO_SLOT_PACKS, EURO_SLOTS_MAX, EURO_CHECKOUT_ENABLED, SLOT_GRANTS_TABLE
} from '../config/inventorySlots.js';

let refreshTask = null;

// The next medal offer, or null when every medal upgrade has been bought.
export function getNextMedalOffer() {
  let covered = 0;
  for (const offer of MEDAL_SLOT_OFFERS) {
    if (covered >= inventoryManager.medalSlots) return offer;
    covered += offer.slots;
  }
  return null;
}

export function getSlotsOverview() {
  const medals = thiefdokuService.getMedals();
  const offer = getNextMedalOffer();
  const room = Math.max(0, EURO_SLOTS_MAX - inventoryManager.paidSlots);
  return {
    capacity: inventoryManager.getCapacity(),
    medals,
    medalOffer: offer ? { ...offer, affordable: medals >= offer.medals } : null,
    paidSlots: inventoryManager.paidSlots,
    euroMax: EURO_SLOTS_MAX,
    euroPacks: EURO_SLOT_PACKS.map(pack => ({
      ...pack,
      state: pack.slots > room ? 'max' : (EURO_CHECKOUT_ENABLED ? 'available' : 'soon')
    }))
  };
}

export function buyWithMedals() {
  const offer = getNextMedalOffer();
  if (!offer) return { ok: false, message: __dialogueText("managers/InventorySlotsService.js", "t_807af7ea6ec42ad66960") };
  const medals = thiefdokuService.getMedals();
  if (medals < offer.medals) return { ok: false, message: formatDialogueText(__dialogueText("managers/InventorySlotsService.js", "t_c8b9b72a7ba8e3ad71b1"), { need: offer.medals, have: medals }) };
  const spent = thiefdokuService.spendMedals(offer.medals);
  if (!spent?.ok) return { ok: false, message: spent?.message || __dialogueText("managers/InventorySlotsService.js", "t_eab7cb8d81d67b17a4d9") };
  inventoryManager.setMedalSlots(inventoryManager.medalSlots + offer.slots);
  requestAutosave();
  return { ok: true, message: formatDialogueText(__dialogueText("managers/InventorySlotsService.js", "t_429f07984a11f83c329d"), { slots: offer.slots }) };
}

// Euro purchase entry point. When PayPal is connected, start the checkout for the pack here
// and return { ok: true } after the payment is confirmed.
export async function startEuroPurchase(packId) {
  const pack = EURO_SLOT_PACKS.find(item => item.id === packId);
  if (!pack) return { ok: false, message: __dialogueText("managers/InventorySlotsService.js", "t_38f5b50071d0cf99307a") };
  if (pack.slots > EURO_SLOTS_MAX - inventoryManager.paidSlots) return { ok: false, message: __dialogueText("managers/InventorySlotsService.js", "t_385b28f74ca402ef1fbc") };
  return { ok: false, message: __dialogueText("managers/InventorySlotsService.js", "t_b0533f8a1d1e8645e5bf") };
}

// Reads the euro slots bought by the signed-in player. Returns true when they were read.
export function refreshPaidSlots() {
  if (refreshTask) return refreshTask;
  refreshTask = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) { inventoryManager.setPaidSlots(0); return false; }
      const { data, error } = await supabase.from(SLOT_GRANTS_TABLE).select('slots').is('revoked_at', null);
      if (error) throw new Error(error.message);
      const total = (data || []).reduce((sum, row) => sum + Math.max(0, Math.floor(Number(row.slots)) || 0), 0);
      inventoryManager.setPaidSlots(Math.min(EURO_SLOTS_MAX, total));
      return true;
    } catch (error) {
      console.warn('[InventorySlots] Could not read purchased slots:', error);
      return false;
    }
  })().finally(() => { refreshTask = null; });
  return refreshTask;
}
