import { audioManager } from '../../managers/AudioManager.js';
const KEY = 'sfx_pi_computer_button';
const pending = new WeakSet();
export function prepareComputerUiAudio(scene) {
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
    load.audio(KEY, 'assets/audio/click.mp3');
    if (!load.isLoading()) load.start();
  } catch (error) { cleanup(); console.debug('[ComputerUiAudio] Load unavailable:', error); }
}
export function computerUiCanInteract(ui) {
  return Boolean(ui && !ui.destroyed && ui.isOpen && !ui.suspended && !ui.scene?._cleanupDone && ui.scene?.sys?.isActive());
}
export function playComputerUiClick(ui) {
  if (!computerUiCanInteract(ui) || !ui.scene.cache?.audio?.exists(KEY)) return;
  try {
    audioManager.init(ui.scene);
    audioManager.playSfx(KEY, { volume: audioManager.getSfxVolume() * 0.2 });
  } catch (error) { console.debug('[ComputerUiAudio] Sound unavailable:', error); }
}
