import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
// One place for jukebox music packs. Add new packs here and put "pack": "<pack id>" in assets/audio/music/tracks.json.
// Prices and the store product live in systems/StoreEntitlements.js (STORE_PRODUCTS.music_pack).
// productId = the row id in store_sandbox_products used by PayPal checkout.
export const MUSIC_PACKS = Object.freeze({
  noir_pack_1: Object.freeze({
    title: __dialogueText("config/musicPacks.js", "t_05b1f35d1d6e2a45b7ba"),
    productId: 'music_pack_noir_1'
  })
});

export function getMusicPack(packId) {
  return MUSIC_PACKS[packId] || null;
}
