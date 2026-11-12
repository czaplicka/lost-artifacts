import { audioManager } from '../../managers/AudioManager.js';

const AUDIO = {
  paper: ['sfx_document_paper', 'assets/audio/paper_rustle.mp3'],
  page: ['sfx_document_page', 'assets/audio/page.mp3'],
  click: ['sfx_document_click', 'assets/audio/click.mp3']
};
export function preloadDocumentSfx(scene, names = ['paper']) {
  for (const name of names) {
    const entry = AUDIO[name];
    if (entry && !scene.cache.audio.exists(entry[0])) scene.load.audio(entry[0], entry[1]);
  }
}
export function playDocumentSfx(scene, name, volume = 0.3) {
  const entry = AUDIO[name];
  if (!entry || scene.closing || scene._cleanupDone || !scene.sys?.isActive() ||
      !scene.cache.audio.exists(entry[0])) return null;
  audioManager.init(scene);
  return audioManager.playSfx(entry[0], {
    volume: audioManager.getSfxVolume() * Math.max(0, Math.min(1, Number(volume) || 0))
  });
}
