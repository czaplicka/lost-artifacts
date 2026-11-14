import { audioManager } from '../../managers/AudioManager.js';
import { SFX } from './PhoneConfig.js';

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const AUDIO = {
  sfx_pickup: ['pi_phone_audio_pickup', 'phone-pick.mp3'],
  sfx_ringing: ['pi_phone_audio_ringback', 'phone-ringing.mp3'],
  sfx_busy: ['pi_phone_audio_busy', 'phone-busy.mp3'],
  click_sound: ['pi_phone_audio_click', 'click.mp3'],
  pagesound: ['pi_phone_audio_page', 'page.mp3'],
  paper_rustle: ['pi_phone_audio_paper', 'paper_rustle.mp3']
};
const pendingLoads = new WeakMap();
const resolveKey = key => AUDIO[key]?.[0] || key;

export const PhoneAudio = {
  preparePhoneAudio() {
    const scene = this.scene, loader = scene?.load;
    if (!loader || !scene.cache?.audio || !scene.events) return;
    let pending = pendingLoads.get(loader);
    if (!pending) { pending = new Set(); pendingLoads.set(loader, pending); }
    let queued = false;
    for (const [key, file] of Object.values(AUDIO)) {
      if (scene.cache.audio.exists(key) || pending.has(key)) continue;
      pending.add(key);
      const complete = `filecomplete-audio-${key}`;
      const cleanup = () => {
        pending.delete(key);
        if (!pending.size && pendingLoads.get(loader) === pending) pendingLoads.delete(loader);
        loader.off(complete, cleanup); loader.off('loaderror', failed);
        scene.events.off('shutdown', cleanup); scene.events.off('destroy', cleanup);
      };
      const failed = item => { if (item?.key === key) cleanup(); };
      loader.once(complete, cleanup); loader.on('loaderror', failed);
      scene.events.once('shutdown', cleanup); scene.events.once('destroy', cleanup);
      try { loader.audio(key, `assets/audio/${file}`); queued = true; }
      catch (error) { cleanup(); console.warn('[PIOfficePhoneUI] Audio load failed:', error); }
    }
    if (queued) {
      try { if (!loader.isLoading()) loader.start(); }
      catch (error) { console.warn('[PIOfficePhoneUI] Audio loader unavailable:', error); }
    }
  },
  _hasAudio(key) {
    return Boolean(key && this.scene?.cache?.audio?.exists(resolveKey(key)));
  },
  playOnce(key, volume = 0.6) {
    if (this.destroyed || !this.isOpen || !this._hasAudio(key)) return null;
    try {
      audioManager.init(this.scene);
      const sound = audioManager.playSfx(resolveKey(key), {
        gain: clamp01(volume),
        volume: audioManager.getSfxVolume() * clamp01(volume)
      });
      if (sound) {
        this.phoneOneShots ??= new Set();
        this.phoneOneShots.add(sound);
        const forget = () => this.phoneOneShots?.delete(sound);
        sound.once('destroy', forget);
      }
      return sound;
    } catch { return null; }
  },
  startLoop(key, volume = 0.6) {
    if (this.destroyed || !this.isOpen || !this._hasAudio(key)) return false;
    const resolved = resolveKey(key);
    try {
      audioManager.init(this.scene);
      const sound = audioManager.playLoopSfx(resolved, {
        gain: clamp01(volume),
        volume: audioManager.getSfxVolume() * clamp01(volume)
      });
      if (sound) { this.loops.add(resolved); return true; }
    } catch {}
    return false;
  },
  stopLoops() {
    this.loops?.forEach(key => { try { audioManager.stopAmbient(key); } catch {} });
    this.loops?.clear();
    for (const sound of this.phoneOneShots || []) {
      try { audioManager.releaseSound(sound); } catch {}
    }
    this.phoneOneShots?.clear();
  },
  sfxClick() { this.playOnce(SFX.click, 0.5); },
  tone(frequency, duration = 0.12, volume = 0.025) {
    if (this.destroyed || !this.isOpen) return;
    const manager = this.scene?.sound, context = manager?.context;
    const hz = Number(frequency), seconds = Number(duration);
    if (!context || !Number.isFinite(hz) || hz <= 0 || !Number.isFinite(seconds) || seconds <= 0 ||
        manager.mute || audioManager.getMuted() || audioManager.getSfxVolume() <= 0) return;
    let oscillator, gain, entry;
    const cleanup = () => {
      if (entry) this.tones?.delete(entry);
      try { oscillator?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
    };
    try {
      if (context.state === 'suspended') void context.resume().catch(() => {});
      oscillator = context.createOscillator(); gain = context.createGain();
      const now = context.currentTime;
      const master = Number.isFinite(manager.volume) ? clamp01(manager.volume) : 1;
      const level = clamp01(volume) * master * audioManager.getSfxVolume();
      if (level <= 0) { cleanup(); return; }
      oscillator.type = 'sine'; oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(Math.max(0.000001, level), now);
      gain.gain.exponentialRampToValueAtTime(0.000001, now + seconds);
      oscillator.connect(gain); gain.connect(context.destination);
      entry = { oscillator, gain }; this.tones.add(entry); oscillator.onended = cleanup;
      oscillator.start(now); oscillator.stop(now + seconds);
    } catch (error) {
      try { oscillator?.stop(); } catch {}
      cleanup(); console.warn('[PIOfficePhoneUI] Audio unavailable:', error);
    }
  }
};
