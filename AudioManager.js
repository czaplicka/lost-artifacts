const STORAGE = {
  MUSIC: 'la_musicVol',
  SFX: 'la_sfxVol',
  MUTED: 'la_muted'
};

const DEFAULTS = {
  MUSIC: 0.2,
  SFX: 0.8,
  MUTED: false
};

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function loadNumber(key, fallback) {
  const raw = safeGet(key);
  const v = parseFloat(raw);
  return Number.isNaN(v) ? fallback : v;
}

function clamp01(value) {
  return Phaser.Math.Clamp(Number(value) || 0, 0, 1);
}

class AudioManager {
  constructor() {
    this.scene = null;
    this.musicVolume = loadNumber(STORAGE.MUSIC, DEFAULTS.MUSIC);
    this.sfxVolume = loadNumber(STORAGE.SFX, DEFAULTS.SFX);
    this.muted = safeGet(STORAGE.MUTED) === 'true';

    this.activeMusic = new Map();
    this.activeAmbient = new Map();
    this.activeSfx = new Set();
    this.activeVoice = new Set();
    this.activeOneShots = new Set();
  }

  init(scene) {
    this.scene = scene;
    this._applyGlobalAudioState();
  }

  _canPlay(key) {
    return !!(this.scene && this.scene.cache && this.scene.cache.audio && this.scene.cache.audio.exists(key));
  }

  _isValidSound(sound) {
    return !!(sound && !sound.pendingRemove);
  }

  _applySoundState(sound, volume) {
    if (!this._isValidSound(sound)) return;
    if (typeof sound.setMute === 'function') sound.setMute(this.muted);
    if (typeof sound.setVolume === 'function') sound.setVolume(volume);
  }

  _syncMap(map, volume) {
    map.forEach(sound => this._applySoundState(sound, volume));
  }

  _syncSet(set, volume) {
    set.forEach(sound => this._applySoundState(sound, volume));
  }

  _applyGlobalAudioState() {
    if (this.scene?.sound) {
      this.scene.sound.mute = this.muted;
    }

    this._syncMap(this.activeMusic, this.musicVolume);
    this._syncMap(this.activeAmbient, this.sfxVolume);
    this._syncSet(this.activeSfx, this.sfxVolume);
    this._syncSet(this.activeVoice, this.sfxVolume);
    this._syncSet(this.activeOneShots, this.sfxVolume);
  }

  _createOrReuse(key, config, store, volume, loop = true) {
    if (!this._canPlay(key)) return null;

    let sound = store.get(key);

    if (!this._isValidSound(sound)) {
      sound = this.scene.sound.get(key);
    }

    if (this._isValidSound(sound)) {
      store.set(key, sound);

      if (typeof sound.setLoop === 'function') sound.setLoop(loop);
      this._applySoundState(sound, volume);

      if (!sound.isPlaying && typeof sound.play === 'function') {
        sound.play();
      }

      return sound;
    }

    sound = this.scene.sound.add(key, {
      ...config,
      loop,
      volume,
      mute: this.muted
    });

    store.set(key, sound);

    sound.once('destroy', () => {
      if (store.get(key) === sound) store.delete(key);
    });

    sound.play();
    return sound;
  }

  _fadeTo(sound, targetVolume, duration = 300) {
    if (!this._isValidSound(sound)) return;

    const start = typeof sound.volume === 'number' ? sound.volume : 0;
    const tweenScene = this.scene;

    if (!tweenScene?.tweens) {
      if (typeof sound.setVolume === 'function') sound.setVolume(targetVolume);
      return;
    }

    tweenScene.tweens.addCounter({
      from: start,
      to: targetVolume,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: tween => {
        if (this._isValidSound(sound) && typeof sound.setVolume === 'function') {
          sound.setVolume(tween.getValue());
        }
      }
    });
  }

  setMusicVolume(value) {
    this.musicVolume = clamp01(value);
    safeSet(STORAGE.MUSIC, String(this.musicVolume));
    this._applyGlobalAudioState();
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp01(value);
    safeSet(STORAGE.SFX, String(this.sfxVolume));
    this._applyGlobalAudioState();
  }

  toggleMute() {
    this.muted = !this.muted;
    safeSet(STORAGE.MUTED, String(this.muted));
    this._applyGlobalAudioState();
    return this.muted;
  }

  setMute(value) {
    this.muted = !!value;
    safeSet(STORAGE.MUTED, String(this.muted));
    this._applyGlobalAudioState();
    return this.muted;
  }

  playMusic(key, config = {}) {
    return this._createOrReuse(
      key,
      {
        ...config,
        volume: config.volume ?? this.musicVolume,
        mute: this.muted
      },
      this.activeMusic,
      config.volume ?? this.musicVolume,
      config.loop ?? true
    );
  }

  playAmbient(key, config = {}) {
    return this._createOrReuse(
      key,
      {
        ...config,
        volume: config.volume ?? this.sfxVolume,
        mute: this.muted
      },
      this.activeAmbient,
      config.volume ?? this.sfxVolume,
      config.loop ?? true
    );
  }

  playPersistentLoop(key, config = {}) {
    return this.playAmbient(key, { ...config, loop: true });
  }

  playLoopSfx(key, config = {}) {
    return this.playAmbient(key, { ...config, loop: true });
  }

  playSfx(key, config = {}) {
    if (!this._canPlay(key)) return null;

    const sound = this.scene.sound.add(key, {
      ...config,
      loop: false,
      volume: config.volume ?? this.sfxVolume,
      mute: this.muted
    });

    this.activeSfx.add(sound);
    sound.play();

    const cleanup = () => {
      this.activeSfx.delete(sound);
      if (this._isValidSound(sound)) sound.destroy();
    };

    sound.once('complete', cleanup);
    sound.once('stop', cleanup);
    sound.once('destroy', () => this.activeSfx.delete(sound));

    return sound;
  }

  playOneShot(key, config = {}) {
    if (!this._canPlay(key)) return null;

    const sound = this.scene.sound.add(key, {
      ...config,
      loop: false,
      volume: config.volume ?? this.sfxVolume,
      mute: this.muted
    });

    this.activeOneShots.add(sound);
    sound.play();

    const cleanup = () => {
      this.activeOneShots.delete(sound);
      if (this._isValidSound(sound)) sound.destroy();
    };

    sound.once('complete', cleanup);
    sound.once('stop', cleanup);
    sound.once('destroy', () => this.activeOneShots.delete(sound));

    return sound;
  }

  playVoice(key, config = {}) {
    if (!this._canPlay(key)) return null;

    const sound = this.scene.sound.add(key, {
      ...config,
      loop: false,
      volume: config.volume ?? this.sfxVolume,
      mute: this.muted
    });

    this.activeVoice.add(sound);
    sound.play();

    const cleanup = () => {
      this.activeVoice.delete(sound);
      if (this._isValidSound(sound)) sound.destroy();
    };

    sound.once('complete', cleanup);
    sound.once('stop', cleanup);
    sound.once('destroy', () => this.activeVoice.delete(sound));

    return sound;
  }

  fadeInMusic(key, config = {}, duration = 500) {
    const sound = this.playMusic(key, { ...config, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.musicVolume, duration);
    return sound;
  }

  fadeInAmbient(key, config = {}, duration = 500) {
    const sound = this.playAmbient(key, { ...config, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.sfxVolume, duration);
    return sound;
  }

  fadeOutAndStop(soundOrKey, duration = 400) {
    const sound = typeof soundOrKey === 'string'
      ? this.activeMusic.get(soundOrKey)
        || this.activeAmbient.get(soundOrKey)
        || [...this.activeSfx].find(s => s?.key === soundOrKey)
        || [...this.activeVoice].find(s => s?.key === soundOrKey)
        || this.scene?.sound?.get(soundOrKey)
      : soundOrKey;

    if (!this._isValidSound(sound)) return;

    this._fadeTo(sound, 0, duration);

    this.scene?.time?.delayedCall(duration + 20, () => {
      if (this._isValidSound(sound)) {
        if (sound.isPlaying) sound.stop();
        sound.destroy();
      }
    });
  }

  stopMusic(key) {
    this._stopStored(this.activeMusic, key);
  }

  stopAmbient(key) {
    this._stopStored(this.activeAmbient, key);
  }

  stopPersistentLoop(key) {
    this.stopAmbient(key);
  }

  stopAllMusic() {
    this._stopAllStored(this.activeMusic);
  }

  stopAllAmbient() {
    this._stopAllStored(this.activeAmbient);
  }

  stopAllPersistent() {
    this.stopAllAmbient();
  }

  _stopStored(store, key) {
    const sound = store.get(key) || this.scene?.sound?.get(key);

    if (this._isValidSound(sound)) {
      if (sound.isPlaying) sound.stop();
      sound.destroy();
    }

    store.delete(key);
  }

  _stopAllStored(store) {
    store.forEach(sound => {
      if (!this._isValidSound(sound)) return;
      if (sound.isPlaying) sound.stop();
      sound.destroy();
    });
    store.clear();
  }

  stopSfx(key) {
    [...this.activeSfx].forEach(sound => {
      if (sound && sound.key === key) {
        if (sound.isPlaying) sound.stop();
        if (this._isValidSound(sound)) sound.destroy();
      }
    });
  }

  stopVoice(key) {
    [...this.activeVoice].forEach(sound => {
      if (sound && sound.key === key) {
        if (sound.isPlaying) sound.stop();
        if (this._isValidSound(sound)) sound.destroy();
      }
    });
  }

  stopAllSfx() {
    this._stopAllSet(this.activeSfx);
  }

  stopAllVoice() {
    this._stopAllSet(this.activeVoice);
  }

  stopAllOneShots() {
    this._stopAllSet(this.activeOneShots);
  }

  stopAllNonMusic() {
    this.stopAllSfx();
    this.stopAllVoice();
    this.stopAllOneShots();
    this.stopAllAmbient();
  }

  _stopAllSet(set) {
    [...set].forEach(sound => {
      if (!sound) return;
      if (sound.isPlaying) sound.stop();
      if (this._isValidSound(sound)) sound.destroy();
    });
    set.clear();
  }

  isMusicPlaying(key) {
    const sound = this.activeMusic.get(key) || this.scene?.sound?.get(key);
    return !!(sound && sound.isPlaying);
  }

  isAmbientPlaying(key) {
    const sound = this.activeAmbient.get(key) || this.scene?.sound?.get(key);
    return !!(sound && sound.isPlaying);
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  getSfxVolume() {
    return this.sfxVolume;
  }

  getMuted() {
    return this.muted;
  }
}

export const audioManager = new AudioManager();