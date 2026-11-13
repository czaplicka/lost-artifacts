import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_pi_new_mail';
const pending = new WeakSet();
export function prepareComputerMailAudio(scene) {
  const load = scene?.load;
  if (!load || !scene.cache?.audio || !scene.events || scene.cache.audio.exists(KEY) || pending.has(load)) return;
  pending.add(load);
  const event = `filecomplete-audio-${KEY}`;
  const cleanup = () => {
    pending.delete(load); load.off(event, cleanup); load.off('loaderror', failed);
    scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
  };
  const failed = file => { if (file?.key === KEY) cleanup(); };
  load.once(event, cleanup); load.on('loaderror', failed);
  scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
  try {
    load.audio(KEY, 'assets/audio/new_mail.mp3');
    if (!load.isLoading()) load.start();
  } catch (error) { cleanup(); console.debug('[ComputerMailAudio] Load unavailable:', error); }
}
export function playComputerMailAudio(scene) {
  if (!scene || scene._cleanupDone || !scene.sys?.isActive() || !scene.cache?.audio?.exists(KEY)) return;
  const sound = scene.sound;
  if (!sound || sound.locked || sound.mute || sound.volume === 0 ||
      audioManager.getMuted() || audioManager.getSfxVolume() <= 0) return;
  try {
    audioManager.init(scene);
    audioManager.playSfx(KEY, { volume: audioManager.getSfxVolume() * 0.4 });
  } catch (error) { console.debug('[ComputerMailAudio] Sound unavailable:', error); }
}
