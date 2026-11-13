import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_apartment_identity_collect';
const pending = new WeakSet();
export function prepareApartmentEvidenceAudio(scene) {
  const load = scene?.load;
  if (!load || !scene.cache?.audio || !scene.events || scene.cache.audio.exists(KEY) || pending.has(load)) return;
  pending.add(load);
  const event = `filecomplete-audio-${KEY}`;
  const cleanup = () => {
    pending.delete(load);
    load.off(event, cleanup); load.off('loaderror', failed);
    scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
  };
  const failed = file => { if (file?.key === KEY) cleanup(); };
  load.once(event, cleanup); load.on('loaderror', failed);
  scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
  try {
    load.audio(KEY, 'assets/audio/evidence_collect.mp3');
    if (!load.isLoading()) load.start();
  } catch (error) { cleanup(); console.debug('[ApartmentEvidenceAudio] Load unavailable:', error); }
}
export function playApartmentEvidenceAudio(scene) {
  if (!scene || scene._cleanupDone || scene.isTransitioning || !scene.sys?.isActive() || !scene.cache?.audio?.exists(KEY)) return;
  try {
    audioManager.init(scene);
    audioManager.playSfx(KEY, { volume: audioManager.getSfxVolume() * 0.3 });
  } catch (error) { console.debug('[ApartmentEvidenceAudio] Sound unavailable:', error); }
}
