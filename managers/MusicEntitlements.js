import { audioManager } from './AudioManager.js';
import { EventBus } from '../EventBus.js';
import { ownedMusicPacks, refreshStoreEntitlements } from '../systems/StoreEntitlements.js';

// Unlocks the jukebox packs the player owns (bought with medals or PayPal).
export function syncMusicPacks() {
  audioManager.setUnlockedPacks(ownedMusicPacks());
}

// Reads PayPal purchases again, then unlocks the matching jukebox packs.
// Returns true when the server purchases were read, false when they could not be read.
export async function refreshMusicEntitlements() {
  const ok = await refreshStoreEntitlements();
  syncMusicPacks();
  return ok;
}

EventBus.on('storeEntitlementsChanged', syncMusicPacks);
