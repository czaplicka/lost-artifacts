import { audioManager } from '../../managers/AudioManager.js';

export const PAPER_KEY = 'sfx_paper_puzzle';

export function preloadPaper(scene) {
  if (!scene.cache.audio.exists(PAPER_KEY)) {
    scene.load.audio(PAPER_KEY, 'assets/audio/card.mp3');
  }
}

export function playPaperChange(scene, before, after) {
  if (scene.closing || !Array.isArray(before) || !Array.isArray(after)) return;
  if (before.length === after.length && before.every((id, index) => id === after[index])) return;
  audioManager.init(scene);
  const key = scene.cache.audio.exists(PAPER_KEY) ? PAPER_KEY : 'paper_rustle';
  audioManager.playSfx(key, { volume: audioManager.getSfxVolume() * 0.3 });
}
