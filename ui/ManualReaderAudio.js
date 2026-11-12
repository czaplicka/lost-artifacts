import { audioManager } from '../managers/AudioManager.js';
const SOUNDS = {
  paper: ['sfx_manual_reader_paper', 'assets/audio/paper_rustle.mp3', 0.3],
  page: ['sfx_manual_reader_page', 'assets/audio/page.mp3', 0.25]
};
const pending = new WeakMap();
export function prepareManualReaderAudio(scene) {
  if (!scene?.load || !scene?.events || !scene.cache?.audio) return;
  const loader = scene.load;
  let keys = pending.get(loader);
  if (!keys) { keys = new Set(); pending.set(loader, keys); }
  let added = false;
  for (const [key, url] of Object.values(SOUNDS)) {
    if (scene.cache.audio.exists(key) || keys.has(key)) continue;
    keys.add(key); added = true;
    const event = `filecomplete-audio-${key}`;
    const cleanup = () => {
      keys.delete(key);
      if (!keys.size && pending.get(loader) === keys) pending.delete(loader);
      loader.off(event, cleanup); loader.off('loaderror', failed);
      scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
    };
    const failed = file => { if (file?.key === key) cleanup(); };
    loader.once(event, cleanup); loader.on('loaderror', failed);
    scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
    try { loader.audio(key, url); }
    catch (error) { cleanup(); console.warn('[ManualReaderAudio] Load failed:', error); }
  }
  if (added) {
    try { if (!loader.isLoading()) loader.start(); }
    catch (error) { console.warn('[ManualReaderAudio] Loader could not start:', error); }
  }
}
export function playManualReaderAudio(scene, name) {
  const entry = SOUNDS[name];
  if (!scene || !entry || scene.closing || scene._cleanupDone || !scene.sys?.isActive() ||
      !scene.cache?.audio?.exists(entry[0])) return null;
  try {
    audioManager.init(scene);
    return audioManager.playSfx(entry[0], { volume: audioManager.getSfxVolume() * entry[2] });
  } catch (error) { console.debug('[ManualReaderAudio] Sound unavailable:', error); return null; }
}
