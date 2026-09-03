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

    // Global registry of who owns which key
    this._keyOwner = new Map(); // key -> { store, sound }

    // ✅ Track tweens dla cleanup
    this._activeTweens = new Set();

    // ✅ Deduplikacja — prevent multiple instances of same key
    this._playingOneShots = new Map(); // key -> sound (most recent)
    this._playingSfx = new Map();      // key -> sound (most recent)
  }

  init(scene) {
    this.scene = scene;
    
    // ✅ Scene lifecycle cleanup
    if (scene?.events) {
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._sceneShutdown());
      scene.events.once(Phaser.Scenes.Events.SLEEP, () => this._sceneShutdown());
    }

    this._applyGlobalAudioState();
  }

  /**
   * ✅ Clean up all audio when scene shuts down
   */
  _sceneShutdown() {
    this._stopAllTweens();
    this.stopAllNonMusic();
    // ← Music typically persists between scenes
  }

  _canPlay(key) {
    return !!(this.scene && this.scene.cache && this.scene.cache.audio && this.scene.cache.audio.exists(key));
  }

  _isValidSound(sound) {
    return !!(sound && !sound.pendingRemove && sound.scene !== null);
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

  _purgeAllInstancesOfKey(key, exceptSound = null) {
    if (!this.scene?.sound?.getAll) return;

    const instances = this.scene.sound.getAll(key) || [];
    instances.forEach(sound => {
      if (sound === exceptSound) return;
      if (!this._isValidSound(sound)) return;
      if (sound.isPlaying) sound.stop();
      sound.destroy();
    });
  }

  _releaseKeyOwnership(key, requestingStore) {
    const owner = this._keyOwner.get(key);
    if (!owner) return;

    if (owner.store === requestingStore) return;

    if (owner.store instanceof Map) {
      owner.store.delete(key);
    } else if (owner.store instanceof Set) {
      owner.store.delete(owner.sound);
    }

    if (this._isValidSound(owner.sound)) {
      if (owner.sound.isPlaying) owner.sound.stop();
      owner.sound.destroy();
    }

    this._keyOwner.delete(key);
  }

  /**
   * ✅ Create tween i track go dla cleanup
   */
  _createTrackedTween(tweenConfig) {
    if (!this.scene?.tweens) return null;

    const tween = this.scene.tweens.addCounter(tweenConfig);

    if (tween) {
      this._activeTweens.add(tween);
      tween.once('complete', () => this._activeTweens.delete(tween));
      tween.once('stop', () => this._activeTweens.delete(tween));
    }

    return tween;
  }

  /**
   * ✅ Stop all active tweens
   */
  _stopAllTweens() {
    this._activeTweens.forEach(tween => {
      if (tween && !tween.isDestroyed) {
        tween.stop();
      }
    });
    this._activeTweens.clear();
  }

  _createOrReuse(key, config, store, volume, loop = true) {
    if (!this._canPlay(key)) return null;

    this._releaseKeyOwnership(key, store);

    let sound = store.get(key);

    if (!this._isValidSound(sound)) {
      sound = null;
      store.delete(key);
    }

    if (this._isValidSound(sound)) {
      store.set(key, sound);
      this._keyOwner.set(key, { store, sound });

      if (typeof sound.setLoop === 'function') sound.setLoop(loop);
      this._applySoundState(sound, volume);

      if (!sound.isPlaying && typeof sound.play === 'function') {
        sound.play();
      }

      return sound;
    }

    this._purgeAllInstancesOfKey(key);

    sound = this.scene.sound.add(key, {
      ...config,
      loop,
      volume,
      mute: this.muted
    });

    store.set(key, sound);
    this._keyOwner.set(key, { store, sound });

    sound.once('destroy', () => {
      if (store.get(key) === sound) store.delete(key);
      if (this._keyOwner.get(key)?.sound === sound) this._keyOwner.delete(key);
    });

    sound.play();
    return sound;
  }

  /**
   * ✅ Fade to volume z tracked tweens
   */
  _fadeTo(sound, targetVolume, duration = 300) {
    if (!this._isValidSound(sound)) return;

    const start = typeof sound.volume === 'number' ? sound.volume : 0;

    if (!this.scene?.tweens) {
      if (typeof sound.setVolume === 'function') sound.setVolume(targetVolume);
      return;
    }

    this._createTrackedTween({
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
    // ✅ Stop ambient jeśli gramy muzykę (prevent overlap w Crime Lab)
    this.stopAllAmbient();

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

  /**
   * ✅ Deduplikacja SFX — tylko jeden instance na key
   */
  playSfx(key, config = {}) {
    if (!this._canPlay(key)) return null;

    // ✅ Stop previous SFX z tym samym key, jeśli gra
    const prevSound = this._playingSfx.get(key);
    if (this._isValidSound(prevSound) && prevSound.isPlaying) {
      prevSound.stop();
      prevSound.destroy();
    }

    const sound = this.scene.sound.add(key, {
      ...config,
      loop: false,
      volume: config.volume ?? this.sfxVolume,
      mute: this.muted
    });

    this.activeSfx.add(sound);
    this._playingSfx.set(key, sound);  // ✅ Track most recent
    sound.play();

    const cleanup = () => {
      this.activeSfx.delete(sound);
      if (this._playingSfx.get(key) === sound) {
        this._playingSfx.delete(key);
      }
      if (this._isValidSound(sound)) sound.destroy();
    };

    sound.once('complete', cleanup);
    sound.once('stop', cleanup);
    sound.once('destroy', () => this.activeSfx.delete(sound));

    return sound;
  }

  /**
   * ✅ Deduplikacja one-shots
   */
  playOneShot(key, config = {}) {
    if (!this._canPlay(key)) return null;

    // ✅ Stop previous one-shot z tym key (prevent stacking)
    const prevSound = this._playingOneShots.get(key);
    if (this._isValidSound(prevSound) && prevSound.isPlaying) {
      prevSound.stop();
      prevSound.destroy();
    }

    const sound = this.scene.sound.add(key, {
      ...config,
      loop: false,
      volume: config.volume ?? this.sfxVolume,
      mute: this.muted
    });

    this.activeOneShots.add(sound);
    this._playingOneShots.set(key, sound);  // ✅ Track most recent
    sound.play();

    const cleanup = () => {
      this.activeOneShots.delete(sound);
      if (this._playingOneShots.get(key) === sound) {
        this._playingOneShots.delete(key);
      }
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

  /**
   * ✅ Faster lookup (O(1) instead of O(n))
   */
  fadeOutAndStop(soundOrKey, duration = 400) {
    let sound = null;

    if (typeof soundOrKey === 'string') {
      // ✅ O(1) direct lookup
      sound = this.activeMusic.get(soundOrKey)
        || this.activeAmbient.get(soundOrKey)
        || this._playingSfx.get(soundOrKey)
        || this._playingOneShots.get(soundOrKey);

      // Fallback only if not found
      if (!sound) {
        sound = [...this.activeVoice].find(s => s?.key === soundOrKey)
          || this.scene?.sound?.get(soundOrKey);
      }
    } else {
      sound = soundOrKey;
    }

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
    if (this._keyOwner.get(key)?.store === store) this._keyOwner.delete(key);
  }

  _stopAllStored(store) {
    store.forEach((sound, key) => {
      if (this._isValidSound(sound)) {
        if (sound.isPlaying) sound.stop();
        sound.destroy();
      }
      if (this._keyOwner.get(key)?.store === store) this._keyOwner.delete(key);
    });
    store.clear();
  }

  stopSfx(key) {
    const sound = this._playingSfx.get(key);
    if (sound && sound.key === key) {
      if (sound.isPlaying) sound.stop();
      if (this._isValidSound(sound)) sound.destroy();
      this._playingSfx.delete(key);
    }
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
    this._playingSfx.clear();
  }

  stopAllVoice() {
    this._stopAllSet(this.activeVoice);
  }

  stopAllOneShots() {
    this._stopAllSet(this.activeOneShots);
    this._playingOneShots.clear();
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