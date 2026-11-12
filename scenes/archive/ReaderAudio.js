import { audioManager } from '../../managers/AudioManager.js';
const EFFECTS = {
  click: ['sfx_reader_click', 'assets/audio/click.mp3', 0.15],
  page: ['sfx_reader_page', 'assets/audio/page.mp3', 0.25],
  card: ['sfx_reader_card', 'assets/audio/card.mp3', 0.25],
  evidence: ['sfx_reader_evidence', 'assets/audio/evidence_collect.mp3', 0.3],
  success: ['sfx_reader_success', 'assets/audio/success.mp3', 0.35]
};
export function preloadReaderAudio(scene, names) {
  for (const name of names) {
    const entry = EFFECTS[name];
    if (entry && !scene.cache.audio.exists(entry[0])) scene.load.audio(entry[0], entry[1]);
  }
}
export function playReaderAudio(scene, name) {
  const entry = EFFECTS[name];
  if (!entry || scene.closing || scene._cleanupDone || !scene.sys?.isActive() || !scene.cache.audio.exists(entry[0])) return null;
  try {
    audioManager.init(scene);
    return audioManager.playSfx(entry[0], { volume: audioManager.getSfxVolume() * entry[2] });
  } catch (error) { console.debug('[ReaderAudio] Sound unavailable:', error); return null; }
}
