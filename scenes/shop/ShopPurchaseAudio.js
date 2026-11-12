import { audioManager } from '../../managers/AudioManager.js';

const KEY = 'sfx_shop_purchase';
export function preloadShopPurchaseAudio(scene) {
  if (!scene.cache.audio.exists(KEY)) scene.load.audio(KEY, 'assets/audio/kaching.mp3');
}
export function playShopPurchaseAudio(scene) {
  if (scene._cleanupDone || scene.disposed || scene.exiting || scene.navigating ||
      !scene.sys?.isActive() || !scene.cache.audio.exists(KEY)) return null;
  try {
    audioManager.init(scene);
    return audioManager.playSfx(KEY, { volume: audioManager.getSfxVolume() * 0.4 });
  } catch (error) {
    console.debug('[ShopPurchaseAudio] Sound unavailable:', error);
    return null;
  }
}
