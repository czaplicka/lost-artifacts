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

const AUDIO_HOST_KEY = '__LostArtifactsAudioHost';

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
    // Preferencje audio działają również bez localStorage.
  }
}

function clamp01(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.min(1, Math.max(0, number))
    : 0;
}

function loadNumber(key, fallback) {
  const raw = safeGet(key);

  if (raw === null) {
    return fallback;
  }

  const number = Number(raw);

  return Number.isFinite(number)
    ? clamp01(number)
    : fallback;
}

class AudioHostScene extends Phaser.Scene {
  constructor() {
    super({
      key: AUDIO_HOST_KEY
    });
  }
}

class AudioManager {
  constructor() {
    this.scene = null;
    this.game = null;

    this.musicVolume = loadNumber(
      STORAGE.MUSIC,
      DEFAULTS.MUSIC
    );

    this.sfxVolume = loadNumber(
      STORAGE.SFX,
      DEFAULTS.SFX
    );

    const savedMute = safeGet(STORAGE.MUTED);

    this.muted = savedMute === null
      ? DEFAULTS.MUTED
      : savedMute === 'true';

    this.activeMusic = new Map();
    this.activeAmbient = new Map();

    this.activeSfx = new Set();
    this.activeVoice = new Set();
    this.activeOneShots = new Set();

    this._keyOwner = new Map();

    this._activeTweens = new Set();
    this._fades = new Map();

    this._playingOneShots = new Map();
    this._playingSfx = new Map();

    this._sceneBindings = new Map();
    this._soundOwners = new WeakMap();
    this._destroyingSounds = new WeakSet();

    this._audioHost = null;
    this._hostRequested = false;

    this._boundGameDestroy = () => {
      this._destroyForGame();
    };
  }

  init(scene) {
    if (!scene?.game) {
      console.warn(
        '[AudioManager] init() requires a Phaser scene.'
      );

      return this;
    }

    if (this.game && this.game !== scene.game) {
      this._destroyForGame();
    }

    if (!this.game) {
      this.game = scene.game;

      this.game.events.once(
        Phaser.Core.Events.DESTROY,
        this._boundGameDestroy
      );
    }

    this.scene = scene;

    this._bindScene(scene);
    this._ensureAudioHost();
    this._applyGlobalAudioState();

    return this;
  }

  _ensureAudioHost() {
    if (!this.game?.scene) {
      return null;
    }

    const manager = this.game.scene;
    const registered = manager.keys?.[AUDIO_HOST_KEY];

    if (registered) {
      this._audioHost = registered;

      if (registered.sys?.isSleeping?.()) {
        registered.scene.wake();
      } else if (registered.sys?.isPaused?.()) {
        registered.scene.resume();
      }

      return registered;
    }

    if (this._hostRequested) {
      return this._audioHost;
    }

    this._hostRequested = true;

    const host = new AudioHostScene();
    this._audioHost = host;

    try {
      manager.add(
        AUDIO_HOST_KEY,
        host,
        true
      );
    } catch (error) {
      this._audioHost = null;
      this._hostRequested = false;

      console.warn(
        '[AudioManager] Could not create audio host:',
        error
      );
    }

    return this._audioHost;
  }

  _bindScene(scene) {
    if (
      !scene.events ||
      this._sceneBindings.has(scene)
    ) {
      return;
    }

    const onSleep = () => {
      this._sceneShutdown(scene);
    };

    const onShutdown = () => {
      this._sceneShutdown(scene);
      this._unbindScene(scene);

      if (this.scene === scene) {
        this.scene = null;
      }
    };

    const onDestroy = () => {
      this._sceneShutdown(scene);
      this._unbindScene(scene);

      if (this.scene === scene) {
        this.scene = null;
      }
    };

    this._sceneBindings.set(scene, {
      onSleep,
      onShutdown,
      onDestroy
    });

    scene.events.on(
      Phaser.Scenes.Events.SLEEP,
      onSleep
    );

    scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      onShutdown
    );

    scene.events.once(
      Phaser.Scenes.Events.DESTROY,
      onDestroy
    );
  }

  _unbindScene(scene) {
    const binding = this._sceneBindings.get(scene);

    if (!binding) {
      return;
    }

    scene.events.off(
      Phaser.Scenes.Events.SLEEP,
      binding.onSleep
    );

    scene.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      binding.onShutdown
    );

    scene.events.off(
      Phaser.Scenes.Events.DESTROY,
      binding.onDestroy
    );

    this._sceneBindings.delete(scene);
  }

  _sceneShutdown(scene = this.scene) {
    if (!scene) {
      return;
    }

    // Muzyka pozostaje globalna.
    // Pozostałe kanały sprzątamy tylko dla wskazanej sceny.
    const sounds = [
      ...this.activeAmbient.values(),
      ...this.activeSfx,
      ...this.activeVoice,
      ...this.activeOneShots
    ];

    for (const sound of sounds) {
      if (this._soundOwners.get(sound) === scene) {
        this._destroySound(sound);
      }
    }
  }

  _canPlay(key) {
    return Boolean(
      this.game?.sound &&
      this.game?.cache?.audio?.exists(key)
    );
  }

  _isValidSound(sound) {
    return Boolean(
      sound &&
      !sound.pendingRemove &&
      sound.manager
    );
  }

  _applySoundState(sound, volume) {
    if (!this._isValidSound(sound)) {
      return;
    }

    sound.setMute?.(this.muted);
    sound.setVolume?.(clamp01(volume));
  }

  _applyGlobalAudioState() {
    if (this.game?.sound) {
      this.game.sound.mute = this.muted;
    }

    const sync = (sounds, volume) => {
      for (const sound of [...sounds]) {
        if (!this._isValidSound(sound)) {
          continue;
        }

        sound.setMute?.(this.muted);

        const fade = this._fades.get(sound);

        if (fade?.stopAfter) {
          // Zміна налаштувань не скасовує завершення fade-out.
          continue;
        }

        this._cancelFade(sound);
        sound.setVolume?.(volume);
      }
    };

    sync(this.activeMusic.values(), this.musicVolume);
    sync(this.activeAmbient.values(), this.sfxVolume);
    sync(this.activeSfx, this.sfxVolume);
    sync(this.activeVoice, this.sfxVolume);
    sync(this.activeOneShots, this.sfxVolume);
  }

  _cancelFade(sound) {
    const record = this._fades.get(sound);

    if (!record) {
      return;
    }

    this._fades.delete(sound);

    const tween = record.tween;

    if (!tween) {
      return;
    }

    this._activeTweens.delete(tween);

    try {
      tween.stop?.();
      tween.remove?.();
    } catch {
      // Tween mógł zostać usunięty wraz z grą.
    }
  }

  _stopAllTweens() {
    for (const sound of [...this._fades.keys()]) {
      this._cancelFade(sound);
    }

    this._activeTweens.clear();
  }

  _destroySound(sound) {
    if (
      !sound ||
      this._destroyingSounds.has(sound)
    ) {
      return;
    }

    this._destroyingSounds.add(sound);

    this._cancelFade(sound);

    try {
      if (this._isValidSound(sound)) {
        sound.stop?.();
        sound.destroy?.();
      }
    } finally {
      this._destroyingSounds.delete(sound);
    }
  }

  _watchSound(sound, store, key = null) {
    let cleaned = false;

    const cleanup = () => {
      if (cleaned) {
        return;
      }

      cleaned = true;

      this._cancelFade(sound);
      this._soundOwners.delete(sound);

      if (store instanceof Map) {
        if (store.get(key) === sound) {
          store.delete(key);
        }
      } else {
        store.delete(sound);
      }

      if (this._keyOwner.get(key)?.sound === sound) {
        this._keyOwner.delete(key);
      }

      if (this._playingSfx.get(key) === sound) {
        this._playingSfx.delete(key);
      }

      if (this._playingOneShots.get(key) === sound) {
        this._playingOneShots.delete(key);
      }
    };

    sound.once('destroy', cleanup);
  }

  _releaseKeyOwnership(key, requestingStore) {
    const owner = this._keyOwner.get(key);

    if (!owner || owner.store === requestingStore) {
      return;
    }

    this._destroySound(owner.sound);
  }

  _createOrReuse(
    key,
    config,
    store,
    volume,
    loop = true
  ) {
    if (!this._canPlay(key)) {
      return null;
    }

    this._releaseKeyOwnership(key, store);

    let sound = store.get(key);

    if (!this._isValidSound(sound)) {
      store.delete(key);
      sound = null;
    }

    if (sound) {
      this._cancelFade(sound);

      sound.setLoop?.(loop);
      this._applySoundState(sound, volume);

      this._soundOwners.set(sound, this.scene);

      if (!sound.isPlaying) {
        sound.play();
      }

      return sound;
    }

    sound = this.game.sound.add(key, {
      ...config,
      loop,
      volume: clamp01(volume),
      mute: this.muted
    });

    store.set(key, sound);

    this._keyOwner.set(key, {
      store,
      sound
    });

    this._soundOwners.set(sound, this.scene);
    this._watchSound(sound, store, key);

    sound.play();

    return sound;
  }

  _fadeTo(
    sound,
    targetVolume,
    duration = 300,
    stopAfter = false
  ) {
    if (!this._isValidSound(sound)) {
      return null;
    }

    this._cancelFade(sound);

    const target = clamp01(targetVolume);
    const milliseconds = Math.max(
      0,
      Number(duration) || 0
    );

    const host = this._ensureAudioHost();

    const finishImmediately = () => {
      if (stopAfter) {
        this._destroySound(sound);
      } else {
        sound.setVolume?.(target);
      }
    };

    if (
      milliseconds === 0 ||
      !host?.sys?.isActive?.() ||
      typeof host.tweens?.addCounter !== 'function'
    ) {
      finishImmediately();
      return null;
    }

    const record = {
      tween: null,
      stopAfter
    };

    this._fades.set(sound, record);

    try {
      const tween = host.tweens.addCounter({
        from: Number(sound.volume) || 0,
        to: target,
        duration: milliseconds,
        ease: 'Sine.easeInOut',

        onUpdate: currentTween => {
          if (
            this._fades.get(sound) === record &&
            this._isValidSound(sound)
          ) {
            sound.setVolume(
              currentTween.getValue()
            );
          }
        },

        onComplete: () => {
          if (this._fades.get(sound) !== record) {
            return;
          }

          this._fades.delete(sound);
          this._activeTweens.delete(record.tween);

          if (stopAfter) {
            this._destroySound(sound);
          } else if (this._isValidSound(sound)) {
            sound.setVolume(target);
          }
        }
      });

      record.tween = tween;
      this._activeTweens.add(tween);

      return tween;
    } catch (error) {
      this._fades.delete(sound);

      console.warn(
        '[AudioManager] Fade failed:',
        error
      );

      finishImmediately();
      return null;
    }
  }

  setMusicVolume(value) {
    this.musicVolume = clamp01(value);

    safeSet(
      STORAGE.MUSIC,
      String(this.musicVolume)
    );

    this._applyGlobalAudioState();
  }

  setSfxVolume(value) {
    this.sfxVolume = clamp01(value);

    safeSet(
      STORAGE.SFX,
      String(this.sfxVolume)
    );

    this._applyGlobalAudioState();
  }

  toggleMute() {
    return this.setMute(!this.muted);
  }

  setMute(value) {
    this.muted = Boolean(value);

    safeSet(
      STORAGE.MUTED,
      String(this.muted)
    );

    this._applyGlobalAudioState();

    return this.muted;
  }

  playMusic(key, config = {}) {
    const {
      stopAmbient = false,
      ...soundConfig
    } = config;

    if (stopAmbient) {
      this.stopAllAmbient();
    }

    return this._createOrReuse(
      key,
      soundConfig,
      this.activeMusic,
      soundConfig.volume ?? this.musicVolume,
      soundConfig.loop ?? true
    );
  }

  playAmbient(key, config = {}) {
    return this._createOrReuse(
      key,
      config,
      this.activeAmbient,
      config.volume ?? this.sfxVolume,
      config.loop ?? true
    );
  }

  playPersistentLoop(key, config = {}) {
    return this.playAmbient(key, {
      ...config,
      loop: true
    });
  }

  playLoopSfx(key, config = {}) {
    return this.playAmbient(key, {
      ...config,
      loop: true
    });
  }

  _playTemporary(key, config, store, recent = null) {
    if (!this._canPlay(key)) {
      return null;
    }

    if (recent) {
      this._destroySound(recent.get(key));
    }

    const sound = this.game.sound.add(key, {
      ...config,
      loop: false,
      volume: clamp01(
        config.volume ?? this.sfxVolume
      ),
      mute: this.muted
    });

    store.add(sound);
    recent?.set(key, sound);

    this._soundOwners.set(sound, this.scene);
    this._watchSound(sound, store, key);

    const finish = () => {
      this._destroySound(sound);
    };

    // Rejestrujemy przed play(), aby nie zgubić
    // zdarzenia bardzo krótkiego dźwięku.
    sound.once('complete', finish);
    sound.once('stop', finish);

    sound.play();

    return sound;
  }

  playSfx(key, config = {}) {
    return this._playTemporary(
      key,
      config,
      this.activeSfx,
      this._playingSfx
    );
  }

  playOneShot(key, config = {}) {
    return this._playTemporary(
      key,
      config,
      this.activeOneShots,
      this._playingOneShots
    );
  }

  playVoice(key, config = {}) {
    return this._playTemporary(
      key,
      config,
      this.activeVoice
    );
  }

  fadeInMusic(key, config = {}, duration = 500) {
    const sound = this.playMusic(key, {
      ...config,
      volume: 0
    });

    if (sound) {
      this._fadeTo(
        sound,
        config.volume ?? this.musicVolume,
        duration
      );
    }

    return sound;
  }

  fadeInAmbient(key, config = {}, duration = 500) {
    const sound = this.playAmbient(key, {
      ...config,
      volume: 0
    });

    if (sound) {
      this._fadeTo(
        sound,
        config.volume ?? this.sfxVolume,
        duration
      );
    }

    return sound;
  }

  fadeOutAndStop(soundOrKey, duration = 400) {
    let sound = soundOrKey;

    if (typeof soundOrKey === 'string') {
      sound =
        this.activeMusic.get(soundOrKey) ||
        this.activeAmbient.get(soundOrKey) ||
        this._playingSfx.get(soundOrKey) ||
        this._playingOneShots.get(soundOrKey) ||
        [...this.activeVoice].find(
          item => item.key === soundOrKey
        );
    }

    if (!this._isValidSound(sound)) {
      return;
    }

    this._fadeTo(
      sound,
      0,
      duration,
      true
    );
  }

  _stopStored(store, key) {
    const sound = store.get(key);

    this._destroySound(sound);
    store.delete(key);
  }

  _stopAllStored(store) {
    for (const sound of [...store.values()]) {
      this._destroySound(sound);
    }

    store.clear();
  }

  _stopAllSet(set) {
    for (const sound of [...set]) {
      this._destroySound(sound);
    }

    set.clear();
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

  stopSfx(key) {
    this._destroySound(
      this._playingSfx.get(key)
    );

    this._playingSfx.delete(key);
  }

  stopVoice(key) {
    for (const sound of [...this.activeVoice]) {
      if (sound.key === key) {
        this._destroySound(sound);
      }
    }
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

  isMusicPlaying(key) {
    return Boolean(
      this.activeMusic.get(key)?.isPlaying
    );
  }

  isAmbientPlaying(key) {
    return Boolean(
      this.activeAmbient.get(key)?.isPlaying
    );
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

  _destroyForGame() {
    this._stopAllTweens();

    this.stopAllMusic();
    this.stopAllNonMusic();

    for (const scene of [
      ...this._sceneBindings.keys()
    ]) {
      this._unbindScene(scene);
    }

    this.game?.events?.off(
      Phaser.Core.Events.DESTROY,
      this._boundGameDestroy
    );

    this._keyOwner.clear();
    this._playingSfx.clear();
    this._playingOneShots.clear();

    this.scene = null;
    this.game = null;

    this._audioHost = null;
    this._hostRequested = false;
  }
}

export const audioManager = new AudioManager();