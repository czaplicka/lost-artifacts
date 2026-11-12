import { audioManager } from '../../managers/AudioManager.js';

const EFFECTS = {
  click_sound: ['sfx_alarm_click', 'assets/audio/click.mp3', 0.2],
  sfx_screw: ['sfx_alarm_click', 'assets/audio/click.mp3', 0.15],
  sfx_ok: ['sfx_alarm_correct', 'assets/audio/correct.mp3', 0.25],
  sfx_buzz: ['sfx_alarm_wrong', 'assets/audio/wrong.mp3', 0.3],
  sfx_success: ['sfx_alarm_success', 'assets/audio/success.mp3', 0.35],
  sfx_paper: ['sfx_alarm_paper', 'assets/audio/paper_rustle.mp3', 0.25]
};
export function preloadAlarmPanelAudio(scene) {
  const queued = new Set();
  for (const [key, url] of Object.values(EFFECTS)) {
    if (!queued.has(key) && !scene.cache.audio.exists(key)) scene.load.audio(key, url);
    queued.add(key);
  }
}
export function playAlarmPanelAudio(scene, name) {
  const entry = EFFECTS[name];
  if (!entry || scene.closing || scene._cleanupDone || !scene.sys?.isActive() ||
      !scene.cache.audio.exists(entry[0])) return null;
  try {
    audioManager.init(scene);
    return audioManager.playSfx(entry[0], { volume: audioManager.getSfxVolume() * entry[2] });
  } catch (error) {
    console.debug('[AlarmPanelAudio] Sound unavailable:', error);
    return null;
  }
}
