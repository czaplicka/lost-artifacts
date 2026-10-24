import { audioManager } from '../../managers/AudioManager.js';
import { DW, DH, FONT_TEXT, FONT_PIXEL, SFX, ART, AMBER, AMBER_CSS, GREEN, GREEN_CSS, RED, CREAM_CSS, FAINT_CSS, SCREEN_TEXT, DIAL_X, DIAL_Y, STOP_ANGLE, HOLE_RING, MON_X, MON_Y, MON_W, MON_H, SCREEN_X, SCREEN_Y, SCREEN_W, SCREEN_H, LEDS, VU_BARS, mulberry32 } from './PhoneConfig.js';

export const PhoneAudio = {
  _hasAudio(key) {
    return Boolean(key && this.scene.cache.audio.exists(key));
  }
,
  playOnce(key, volume = 0.6) {
    if (!this._hasAudio(key)) return null;

    try {
      return audioManager.playSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });
    } catch (e) {
      return null;
    }
  }
,
  startLoop(key, volume = 0.6) {
    if (!this._hasAudio(key)) return false;

    try {
      const sound = audioManager.playLoopSfx(key, {
        volume: audioManager.getSfxVolume() * volume
      });

      if (sound) {
        this.loops.add(key);
        return true;
      }
    } catch (e) {
      // dźwięk nigdy nie powinien wywalać UI
    }

    return false;
  }
,
  stopLoops() {
    this.loops.forEach(key => {
      try {
        audioManager.stopAmbient(key);
      } catch (e) {
        // ignoruj
      }
    });

    this.loops.clear();
  }
,
  sfxClick() {
    this.playOnce(SFX.click, 0.5);
  }

  // Syntetyczny dźwięk: fallback, gdy brakuje pliku.
,
  tone(frequency, duration = 0.12, volume = 0.025) {
    const sound = this.scene.sound;
    const context = sound?.context;

    if (!context || sound.mute) return;

    try {
      if (context.state === 'suspended') {
        void context.resume().catch(() => {});
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const masterVolume = Number.isFinite(sound.volume)
        ? sound.volume
        : 1;

      gain.gain.setValueAtTime(
        Math.max(0.0001, volume * masterVolume),
        now
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      const entry = { oscillator, gain };
      this.tones.add(entry);

      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.tones.delete(entry);
      };

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.warn('[PIOfficePhoneUI] Audio unavailable:', error);
    }
  }

  // ─── Otwieranie / zamykanie ───────────────────────────────────────────────
};
