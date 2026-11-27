import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
// One place for jukebox music packs. Add new packs here and put "pack": "<pack id>" in assets/audio/music/tracks.json.
// When PayPal goes live, change MUSIC_ENTITLEMENT_TABLE (and productId below) to the production values.
export const MUSIC_ENTITLEMENT_TABLE = 'store_sandbox_entitlements';

export const MUSIC_PACKS = Object.freeze({
  noir_pack_1: Object.freeze({
    title: __dialogueText("config/musicPacks.js", "t_05b1f35d1d6e2a45b7ba"),
    productId: 'music_pack_noir_1',
    priceEur: '9.99'
  })
});

export function getMusicPack(packId) {
  return MUSIC_PACKS[packId] || null;
}
