import { supabase } from '../supabase-client.js';
import { audioManager } from './AudioManager.js';
import { MUSIC_PACKS, MUSIC_ENTITLEMENT_TABLE } from '../config/musicPacks.js';

let task = null;

// Reads the purchases of the signed-in player and unlocks the matching jukebox packs.
// Returns true when the purchases were read, false when they could not be read.
export function refreshMusicEntitlements() {
  if (task) return task;
  task = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        audioManager.setUnlockedPacks([]);
        return false;
      }
      const { data, error } = await supabase
        .from(MUSIC_ENTITLEMENT_TABLE)
        .select('product_id')
        .is('revoked_at', null);
      if (error) throw new Error(error.message);
      const owned = new Set((data || []).map(row => row.product_id));
      const packs = Object.entries(MUSIC_PACKS)
        .filter(([, pack]) => owned.has(pack.productId))
        .map(([packId]) => packId);
      audioManager.setUnlockedPacks(packs);
      return true;
    } catch (error) {
      console.warn('[MusicEntitlements] Could not read purchases:', error);
      return false;
    }
  })().finally(() => { task = null; });
  return task;
}
