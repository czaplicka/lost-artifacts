import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_microfilm_transport';
const playing = new WeakMap();
export function preloadMicrofilmTransport(scene) {
  if (!scene.cache.audio.exists(KEY)) scene.load.audio(KEY, 'assets/audio/film-advance.mp3');
}
export function stopMicrofilmTransport(scene) {
  const sound = playing.get(scene);
  playing.delete(scene);
  if (sound) { try { audioManager.releaseSound(sound); } catch {} }
}
export function playMicrofilmTransport(scene) {
  if (scene.closing || scene._cleanupDone || !scene.sys.isActive() || !scene.cache.audio.exists(KEY)) return;
  try {
    audioManager.init(scene);
    stopMicrofilmTransport(scene);
    const sound = audioManager.playSfx(KEY, { volume: audioManager.getSfxVolume() * 0.3 });
    if (sound) {
      playing.set(scene, sound);
      sound.once('destroy', () => { if (playing.get(scene) === sound) playing.delete(scene); });
    }
  } catch (error) { console.debug('[MicrofilmTransportAudio] Sound unavailable:', error); }
}
