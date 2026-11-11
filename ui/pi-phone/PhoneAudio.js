import { audioManager } from '../../managers/AudioManager.js';
import { SFX } from './PhoneConfig.js';

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export const PhoneAudio = {
  _hasAudio(key) {
    return Boolean(key && this.scene?.cache?.audio?.exists(key));
  },

  playOnce(key, volume = 0.6) {
    if (!this._hasAudio(key)) return null;
    try {
      audioManager.init(this.scene);
      return audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * clamp01(volume)
      });
    } catch { return null; }
  },

  startLoop(key, volume = 0.6) {
    if (!this._hasAudio(key)) return false;
    try {
      audioManager.init(this.scene);
      const sound = audioManager.playLoopSfx(key, {
        volume: audioManager.getSfxVolume() * clamp01(volume)
      });
      if (sound) {
        this.loops.add(key);
        return true;
      }
    } catch {}
    return false;
  },

  stopLoops() {
    this.loops?.forEach(key => {
      try { audioManager.stopAmbient(key); } catch {}
    });
    this.loops?.clear();
  },

  sfxClick() {
    this.playOnce(SFX.click, 0.5);
  },

  tone(frequency, duration = 0.12, volume = 0.025) {
    const manager = this.scene?.sound;
    const context = manager?.context;
    const hz = Number(frequency);
    const seconds = Number(duration);
    if (!context || !Number.isFinite(hz) || hz <= 0 ||
        !Number.isFinite(seconds) || seconds <= 0 ||
        manager.mute || audioManager.getMuted() || audioManager.getSfxVolume() <= 0) return;
    let oscillator, gain, entry;
    const cleanup = () => {
      if (entry) this.tones?.delete(entry);
      try { oscillator?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
    };
    try {
      if (context.state === 'suspended') void context.resume().catch(() => {});
      oscillator = context.createOscillator();
      gain = context.createGain();
      const now = context.currentTime;
      const master = Number.isFinite(manager.volume) ? clamp01(manager.volume) : 1;
      const level = clamp01(volume) * master * audioManager.getSfxVolume();
      if (level <= 0) { cleanup(); return; }
      oscillator.type = 'sine';
      oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(Math.max(0.000001, level), now);
      gain.gain.exponentialRampToValueAtTime(0.000001, now + seconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      entry = { oscillator, gain };
      this.tones.add(entry);
      oscillator.onended = cleanup;
      oscillator.start(now);
      oscillator.stop(now + seconds);
    } catch (error) {
      try { oscillator?.stop(); } catch {}
      cleanup();
      console.warn('[PIOfficePhoneUI] Audio unavailable:', error);
    }
  }
};
