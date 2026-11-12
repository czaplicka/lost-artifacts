import { audioManager } from '../../managers/AudioManager.js';

const SOUNDS = {
  paper: ['sfx_gordon_paper', 'assets/audio/paper_rustle.mp3'],
  page: ['sfx_gordon_page', 'assets/audio/page.mp3']
};
const pending = new WeakMap();

export function prepareGordonPaperAudio(scene, start = false) {
  const loader = scene.load;
  if (!loader) return;
  let queued = false;
  for (const [key, url] of Object.values(SOUNDS)) {
    if (scene.cache.audio.exists(key)) continue;
    let keys = pending.get(loader);
    if (!keys) { keys = new Set(); pending.set(loader, keys); }
    if (keys.has(key)) continue;
    keys.add(key); queued = true;
    const completeEvent = `filecomplete-audio-${key}`;
    const cleanup = () => {
      keys.delete(key);
      if (!keys.size) pending.delete(loader);
      loader.off(completeEvent, cleanup); loader.off('loaderror', failed);
      scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
    };
    const failed = file => { if (file?.key === key) cleanup(); };
    loader.once(completeEvent, cleanup); loader.on('loaderror', failed);
    scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
    try { loader.audio(key, url); }
    catch (error) { cleanup(); console.warn('[GordonPaperAudio] Load failed:', error); }
  }
  if (queued && start) {
    try { if (!loader.isLoading()) loader.start(); }
    catch (error) { console.warn('[GordonPaperAudio] Loader could not start:', error); }
  }
}

export function playGordonPaperAudio(scene, name) {
  const entry = SOUNDS[name];
  if (!entry || scene.closing || scene._cleanupDone || !scene.sys?.isActive() ||
      !scene.cache.audio.exists(entry[0])) return null;
  try {
    audioManager.init(scene);
    return audioManager.playSfx(entry[0], {
      volume: audioManager.getSfxVolume() * (name === 'page' ? 0.25 : 0.3)
    });
  } catch (error) {
    console.debug('[GordonPaperAudio] Sound unavailable:', error);
    return null;
  }
}
