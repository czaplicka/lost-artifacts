import { audioManager } from './AudioManager.js';

const KEY = 'startupTheme';
const SOURCE_KEY = 'themeMusic';
const bindings = new WeakMap();

export function installStartupTheme(scene) {
  const sceneKey = scene.sys.settings.key;
  if (sceneKey === 'EnterScene') {
    audioManager.stopMusic(KEY);
    return;
  }
  if (sceneKey !== 'BootScene' && sceneKey !== 'PreloaderScene') return;
  bindings.get(scene)?.();
  audioManager.init(scene);
  const cached = scene.cache.audio.get(SOURCE_KEY);
  if (!scene.cache.audio.exists(KEY) && cached !== undefined && cached !== null) {
    scene.cache.audio.add(KEY, cached);
  }
  if (!scene.cache.audio.exists(KEY)) {
    console.warn('[StartupTheme] Missing assets/audio/theme.mp3 in audio cache.');
    return;
  }
  let live = true;
  const play = () => {
    if (!live || scene._cleanupDone || scene.sound.locked) return;
    if (!audioManager.isMusicPlaying(KEY)) {
      audioManager.playMusic(KEY, { loop: true });
    }
  };
  const unlock = () => {
    if (!live || scene._cleanupDone) return;
    scene.sound.unlock?.();
    play();
  };
  const cleanup = () => {
    live = false;
    scene.input?.off('pointerdown', unlock);
    scene.input?.keyboard?.off('keydown', unlock);
    scene.sound.off('unlocked', play);
    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);
    bindings.delete(scene);
  };
  bindings.set(scene, cleanup);
  scene.input?.on('pointerdown', unlock);
  scene.input?.keyboard?.on('keydown', unlock);
  scene.sound.on('unlocked', play);
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
  play();
}
