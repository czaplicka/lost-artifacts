import { audioManager } from '../../managers/AudioManager.js';

const SOUNDS = {
  paper: { key: 'sfx_puzzle_paper', url: 'assets/audio/card.mp3' },
  stamp: { key: 'sfx_puzzle_stamp', url: 'assets/audio/stamp.mp3' },
  page: { key: 'sfx_puzzle_page', url: 'assets/audio/page.mp3' }
};

export function preloadPuzzleSfx(scene, names = ['paper']) {
  for (const name of names) {
    const sound = SOUNDS[name];
    if (sound && !scene.cache.audio.exists(sound.key)) scene.load.audio(sound.key, sound.url);
  }
}

export function playPuzzleSfx(scene, name, volume = 0.3) {
  const sound = SOUNDS[name];
  if (!sound || scene.closing || scene._cleanupDone || !scene.sys?.isActive() ||
      !scene.cache.audio.exists(sound.key)) return null;
  audioManager.init(scene);
  return audioManager.playSfx(sound.key, {
    volume: audioManager.getSfxVolume() * Math.max(0, Math.min(1, Number(volume) || 0))
  });
}

export function playPuzzlePaperChange(scene, before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) return;
  if (before.length === after.length && before.every((id, i) => id === after[i])) return;
  playPuzzleSfx(scene, 'paper');
}
