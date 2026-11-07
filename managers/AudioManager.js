const STORAGE = {
  MUSIC: 'la_musicVol', SFX: 'la_sfxVol', MUTED: 'la_muted',
  TRACK: 'la_jukeboxTrack', MODE: 'la_jukeboxMode'
};
const DEFAULTS = { MUSIC: 0.2, SFX: 0.8, MUTED: false };
const AUDIO_HOST_KEY = '__LostArtifactsAudioHost';
const BACKGROUND_KEYS = new Set(['themeMusic', 'themeGame']);
const CATALOG_URL = new URL('../assets/audio/music/tracks.json', import.meta.url);
let catalogError = '';

async function loadJukeboxCatalog() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(CATALOG_URL, {
      cache: 'no-cache', signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Expected a non-empty array of tracks.');
    }
    const used = new Set();
    return Object.freeze(data.map((track, index) => {
      if (!track || typeof track.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(track.id)) {
        throw new Error(`Track ${index + 1}: id must contain only letters, numbers, underscores or hyphens.`);
      }
      if (used.has(track.id)) throw new Error(`Duplicate track id: ${track.id}`);
      if (typeof track.title !== 'string' || !track.title.trim()) {
        throw new Error(`Track ${index + 1}: title is required.`);
      }
      used.add(track.id);
      return Object.freeze({
        id: track.id,
        title: track.title.trim(),
        key: `jukebox_${track.id}`,
        url: new URL(`${encodeURIComponent(track.id)}.mp3`, CATALOG_URL).href
      });
    }));
  } catch (error) {
    catalogError = `Cannot load assets/audio/music/tracks.json: ${error.name === 'AbortError' ? 'request timed out' : error.message}`;
    console.error('[Jukebox]', catalogError);
    return Object.freeze([]);
  } finally {
    clearTimeout(timer);
  }
}

export const JUKEBOX_TRACKS = await loadJukeboxCatalog();

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch {} }
function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
function loadNumber(key, fallback) {
  const value = safeGet(key);
  return value !== null && Number.isFinite(Number(value)) ? clamp01(value) : fallback;
}
class AudioHostScene extends Phaser.Scene {
  constructor() { super({ key: AUDIO_HOST_KEY }); }
}
class AudioManager {
  constructor() {
    this.scene = null; this.game = null;
    this.musicVolume = loadNumber(STORAGE.MUSIC, DEFAULTS.MUSIC);
    this.sfxVolume = loadNumber(STORAGE.SFX, DEFAULTS.SFX);
    const muted = safeGet(STORAGE.MUTED);
    this.muted = muted === null ? DEFAULTS.MUTED : muted === 'true';
    this.activeMusic = new Map(); this.activeAmbient = new Map();
    this.activeSfx = new Set(); this.activeVoice = new Set(); this.activeOneShots = new Set();
    this._keyOwner = new Map(); this._activeTweens = new Set(); this._fades = new Map();
    this._playingOneShots = new Map(); this._playingSfx = new Map();
    this._sceneBindings = new Map(); this._soundOwners = new WeakMap();
    this._destroyingSounds = new WeakSet(); this._audioHost = null; this._hostRequested = false;
    this._boundGameDestroy = () => this._destroyForGame();
    this.selectedTrack = JUKEBOX_TRACKS.find(t => t.id === safeGet(STORAGE.TRACK))?.id || JUKEBOX_TRACKS[0]?.id || null;
    const mode = safeGet(STORAGE.MODE);
    this.jukeboxMode = ['playing', 'paused', 'stopped'].includes(mode) ? mode : 'playing';
    this.jukeboxStatus = catalogError ? 'error' : 'stopped'; this.jukeboxError = catalogError;
    this._requestId = 0; this._loads = new Map(); this._loadCancels = new Set();
    this._jukeboxTask = null;
  }
  init(scene) {
    if (!scene?.game) { console.warn('[AudioManager] init() requires a Phaser scene.'); return this; }
    if (this.game && this.game !== scene.game) this._destroyForGame();
    if (!this.game) {
      this.game = scene.game;
      this.game.events.once(Phaser.Core.Events.DESTROY, this._boundGameDestroy);
    }
    this.scene = scene; this._bindScene(scene); this._ensureAudioHost(); this._applyMuteState();
    return this;
  }
  _ensureAudioHost() {
    if (!this.game?.scene) return null;
    const manager = this.game.scene;
    const registered = manager.keys?.[AUDIO_HOST_KEY];
    if (registered) {
      this._audioHost = registered;
      if (registered.sys.isSleeping()) registered.scene.wake();
      else if (registered.sys.isPaused()) registered.scene.resume();
      return registered;
    }
    if (this._hostRequested) return this._audioHost;
    this._hostRequested = true; this._audioHost = new AudioHostScene();
    try { manager.add(AUDIO_HOST_KEY, this._audioHost, true); }
    catch (error) {
      this._audioHost = null; this._hostRequested = false;
      console.warn('[AudioManager] Could not create audio host:', error);
    }
    return this._audioHost;
  }
  _bindScene(scene) {
    if (!scene.events || this._sceneBindings.has(scene)) return;
    const onSleep = () => this._sceneShutdown(scene);
    const finish = () => {
      this._sceneShutdown(scene); this._unbindScene(scene);
      if (this.scene === scene) this.scene = null;
    };
    this._sceneBindings.set(scene, { onSleep, finish });
    scene.events.on('sleep', onSleep);
    scene.events.once('shutdown', finish); scene.events.once('destroy', finish);
  }
  _unbindScene(scene) {
    const b = this._sceneBindings.get(scene); if (!b) return;
    scene.events.off('sleep', b.onSleep); scene.events.off('shutdown', b.finish);
    scene.events.off('destroy', b.finish); this._sceneBindings.delete(scene);
  }
  _sceneShutdown(scene = this.scene) {
    if (!scene) return;
    for (const sound of [...this.activeAmbient.values(), ...this.activeSfx, ...this.activeVoice, ...this.activeOneShots]) {
      if (this._soundOwners.get(sound) === scene) this._destroySound(sound);
    }
  }
  _canPlay(key) { return Boolean(this.game?.sound && this.game?.cache?.audio?.exists(key)); }
  _isValidSound(sound) { return Boolean(sound && !sound.pendingRemove && sound.manager); }
  _applySoundState(sound, volume) {
    if (!this._isValidSound(sound)) return;
    sound.setMute?.(this.muted); sound.setVolume?.(clamp01(volume));
  }
  _applyMuteState() {
    if (this.game?.sound) this.game.sound.mute = this.muted;
    for (const s of [...this.activeMusic.values(), ...this.activeAmbient.values(), ...this.activeSfx, ...this.activeVoice, ...this.activeOneShots]) {
      if (this._isValidSound(s)) s.setMute?.(this.muted);
    }
  }
  _syncChannelVolumes(sounds, volume) {
    for (const s of [...sounds]) {
      if (!this._isValidSound(s) || this._fades.get(s)?.stopAfter) continue;
      this._cancelFade(s); s.setVolume?.(clamp01(volume));
    }
  }
  _applyGlobalAudioState() {
    this._applyMuteState();
    this._syncChannelVolumes(this.activeMusic.values(), this.musicVolume);
    for (const sounds of [this.activeAmbient.values(), this.activeSfx, this.activeVoice, this.activeOneShots])
      this._syncChannelVolumes(sounds, this.sfxVolume);
  }
  _cancelFade(sound) {
    const r = this._fades.get(sound); if (!r) return;
    this._fades.delete(sound); this._activeTweens.delete(r.tween);
    try { r.tween?.stop?.(); r.tween?.remove?.(); } catch {}
  }
  _stopAllTweens() {
    for (const sound of [...this._fades.keys()]) this._cancelFade(sound);
    this._activeTweens.clear();
  }
  _destroySound(sound) {
    if (!sound || this._destroyingSounds.has(sound)) return;
    this._destroyingSounds.add(sound); this._cancelFade(sound);
    try { if (this._isValidSound(sound)) { sound.stop?.(); sound.destroy?.(); } }
    finally { this._destroyingSounds.delete(sound); }
  }
  _watchSound(sound, store, key = null) {
    let cleaned = false;
    sound.once('destroy', () => {
      if (cleaned) return; cleaned = true;
      this._cancelFade(sound); this._soundOwners.delete(sound);
      if (store instanceof Map) { if (store.get(key) === sound) store.delete(key); }
      else store.delete(sound);
      if (this._keyOwner.get(key)?.sound === sound) this._keyOwner.delete(key);
      if (this._playingSfx.get(key) === sound) this._playingSfx.delete(key);
      if (this._playingOneShots.get(key) === sound) this._playingOneShots.delete(key);
    });
  }
  _releaseKeyOwnership(key, requestingStore) {
    const owner = this._keyOwner.get(key);
    if (owner && owner.store !== requestingStore) this._destroySound(owner.sound);
  }
  _playConfigured(sound, config, volume, loop) {
    const playback = { ...config, volume: clamp01(volume), loop, mute: this.muted };
    this._applySoundState(sound, playback.volume);
    const started = sound.play(playback); this._applySoundState(sound, playback.volume);
    return started;
  }
  _createOrReuse(key, config, store, volume, loop = true) {
    if (!this._canPlay(key)) return null;
    this._releaseKeyOwnership(key, store);
    let sound = store.get(key);
    if (!this._isValidSound(sound)) { store.delete(key); sound = null; }
    if (sound) {
      this._cancelFade(sound); sound.setLoop?.(loop); this._applySoundState(sound, volume);
      this._soundOwners.set(sound, this.scene);
      if (!sound.isPlaying) this._playConfigured(sound, config, volume, loop);
      return sound;
    }
    sound = this.game.sound.add(key, { ...config, loop, volume: clamp01(volume), mute: this.muted });
    store.set(key, sound); this._keyOwner.set(key, { store, sound });
    this._soundOwners.set(sound, this.scene); this._watchSound(sound, store, key);
    this._playConfigured(sound, config, volume, loop); return sound;
  }
  _fadeTo(sound, targetVolume, duration = 300, stopAfter = false, startVolume = null) {
    if (!this._isValidSound(sound)) return null;
    this._cancelFade(sound);
    const target = clamp01(targetVolume), from = clamp01(startVolume ?? sound.volume);
    sound.setVolume?.(from);
    const milliseconds = Math.max(0, Number(duration) || 0), host = this._ensureAudioHost();
    const finish = () => { if (stopAfter) this._destroySound(sound); else sound.setVolume?.(target); };
    if (!milliseconds || !host?.sys?.isActive?.() || !host.tweens?.addCounter) { finish(); return null; }
    const record = { tween: null, stopAfter }; this._fades.set(sound, record);
    try {
      record.tween = host.tweens.addCounter({ from, to: target, duration: milliseconds, ease: 'Sine.easeInOut',
        onUpdate: tween => {
          if (this._fades.get(sound) === record && this._isValidSound(sound)) {
            const value = tween.getValue(); if (Number.isFinite(value)) sound.setVolume(clamp01(value));
          }
        },
        onComplete: () => {
          if (this._fades.get(sound) !== record) return;
          this._fades.delete(sound); this._activeTweens.delete(record.tween);
          if (stopAfter) this._destroySound(sound);
          else if (this._isValidSound(sound)) sound.setVolume(target);
        }
      });
      this._activeTweens.add(record.tween); return record.tween;
    } catch (error) { this._fades.delete(sound); console.warn('[AudioManager] Fade failed:', error); finish(); return null; }
  }
  fadeSound(sound, volume, duration = 300, stopAfter = false) { return this._fadeTo(sound, volume, duration, stopAfter); }
  releaseSound(sound) { this._destroySound(sound); }
  setMusicVolume(value) {
    this.musicVolume = clamp01(value); safeSet(STORAGE.MUSIC, String(this.musicVolume));
    this._applyMuteState(); this._syncChannelVolumes(this.activeMusic.values(), this.musicVolume);
  }
  setSfxVolume(value) {
    this.sfxVolume = clamp01(value); safeSet(STORAGE.SFX, String(this.sfxVolume));
    this._applyMuteState();
    for (const sounds of [this.activeAmbient.values(), this.activeSfx, this.activeVoice, this.activeOneShots])
      this._syncChannelVolumes(sounds, this.sfxVolume);
  }
  toggleMute() { return this.setMute(!this.muted); }
  setMute(value) { this.muted = Boolean(value); safeSet(STORAGE.MUTED, String(this.muted)); this._applyMuteState(); return this.muted; }
  playMusic(key, config = {}) {
    if (BACKGROUND_KEYS.has(key)) {
      if (config.stopAmbient) this.stopAllAmbient();
      this.ensureJukebox(); return this._jukeboxSound();
    }
    const { stopAmbient = false, ...soundConfig } = config;
    if (stopAmbient) this.stopAllAmbient();
    return this._createOrReuse(key, soundConfig, this.activeMusic, soundConfig.volume ?? this.musicVolume, soundConfig.loop ?? true);
  }
  playAmbient(key, config = {}) { return this._createOrReuse(key, config, this.activeAmbient, config.volume ?? this.sfxVolume, config.loop ?? true); }
  playPersistentLoop(key, config = {}) { return this.playAmbient(key, { ...config, loop: true }); }
  playLoopSfx(key, config = {}) { return this.playAmbient(key, { ...config, loop: true }); }
  _playTemporary(key, config, store, recent = null) {
    if (!this._canPlay(key)) return null;
    const { overlap = false, ...soundConfig } = config, trackRecent = recent && !overlap;
    if (trackRecent) this._destroySound(recent.get(key));
    const volume = clamp01(soundConfig.volume ?? this.sfxVolume);
    const sound = this.game.sound.add(key, { ...soundConfig, loop: false, volume, mute: this.muted });
    store.add(sound); if (trackRecent) recent.set(key, sound);
    this._soundOwners.set(sound, this.scene); this._watchSound(sound, store, key);
    const finish = () => this._destroySound(sound);
    sound.once('complete', finish); sound.once('stop', finish);
    this._playConfigured(sound, soundConfig, volume, false); return sound;
  }
  playSfx(key, config = {}) { return this._playTemporary(key, config, this.activeSfx, this._playingSfx); }
  playOneShot(key, config = {}) { return this._playTemporary(key, config, this.activeOneShots, this._playingOneShots); }
  playVoice(key, config = {}) { return this._playTemporary(key, config, this.activeVoice); }
  fadeInMusic(key, config = {}, duration = 500) {
    if (BACKGROUND_KEYS.has(key)) return this.playMusic(key, config);
    const sound = this.playMusic(key, { ...config, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.musicVolume, duration, false, 0);
    return sound;
  }
  fadeInAmbient(key, config = {}, duration = 500) {
    const sound = this.playAmbient(key, { ...config, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.sfxVolume, duration, false, 0);
    return sound;
  }
  fadeOutAndStop(soundOrKey, duration = 400) {
    if (BACKGROUND_KEYS.has(soundOrKey)) return;
    const sound = typeof soundOrKey === 'string'
      ? this.activeMusic.get(soundOrKey) || this.activeAmbient.get(soundOrKey) || this._playingSfx.get(soundOrKey) || this._playingOneShots.get(soundOrKey) || [...this.activeVoice].find(s => s.key === soundOrKey)
      : soundOrKey;
    if (this._isValidSound(sound)) this._fadeTo(sound, 0, duration, true);
  }
  _stopStored(store, key) { this._destroySound(store.get(key)); store.delete(key); }
  _stopAllStored(store) { for (const sound of [...store.values()]) this._destroySound(sound); store.clear(); }
  _stopAllSet(set) { for (const sound of [...set]) this._destroySound(sound); set.clear(); }
  stopMusic(key) { this._stopStored(this.activeMusic, key); }
  stopAmbient(key) { this._stopStored(this.activeAmbient, key); }
  stopPersistentLoop(key) { this.stopAmbient(key); }
  stopAllMusic() {
    ++this._requestId; this._jukeboxTask = null;
    this._stopAllStored(this.activeMusic); this.jukeboxStatus = catalogError ? 'error' : 'stopped';
  }
  stopAllAmbient() { this._stopAllStored(this.activeAmbient); }
  stopAllPersistent() { this.stopAllAmbient(); }
  stopSfx(key) { this._destroySound(this._playingSfx.get(key)); this._playingSfx.delete(key); }
  stopVoice(key) { for (const s of [...this.activeVoice]) if (s.key === key) this._destroySound(s); }
  stopAllSfx() { this._stopAllSet(this.activeSfx); this._playingSfx.clear(); }
  stopAllVoice() { this._stopAllSet(this.activeVoice); }
  stopAllOneShots() { this._stopAllSet(this.activeOneShots); this._playingOneShots.clear(); }
  stopAllNonMusic() { this.stopAllSfx(); this.stopAllVoice(); this.stopAllOneShots(); this.stopAllAmbient(); }
  isMusicPlaying(key) { return Boolean((BACKGROUND_KEYS.has(key) ? this._jukeboxSound() : this.activeMusic.get(key))?.isPlaying); }
  isAmbientPlaying(key) { return Boolean(this.activeAmbient.get(key)?.isPlaying); }
  getMusicVolume() { return this.musicVolume; }
  getSfxVolume() { return this.sfxVolume; }
  getMuted() { return this.muted; }
  getJukeboxTracks() { return JUKEBOX_TRACKS.map(t => ({ ...t })); }
  _jukeboxSound() {
    const track = JUKEBOX_TRACKS.find(t => t.id === this.selectedTrack);
    return track ? this.activeMusic.get(track.key) : null;
  }
  getJukeboxState() {
    const sound = this._jukeboxSound();
    return { selectedId: this.selectedTrack, mode: this.jukeboxMode, status: this.jukeboxStatus,
      playing: Boolean(sound?.isPlaying), paused: Boolean(sound?.isPaused),
      volume: this.musicVolume, muted: this.muted, error: this.jukeboxError,
      locked: Boolean(this.game?.sound?.locked) };
  }
  _setJukeboxMode(mode) { this.jukeboxMode = mode; safeSet(STORAGE.MODE, mode); }
  _loadTrack(track) {
    if (this._canPlay(track.key)) return Promise.resolve();
    if (this._loads.has(track.key)) return this._loads.get(track.key);
    const host = this._ensureAudioHost();
    if (!host) return Promise.reject(new Error('Audio host is unavailable.'));
    const promise = new Promise((resolve, reject) => {
      let finished = false, timer;
      const completeEvent = `filecomplete-audio-${track.key}`;
      const finish = error => {
        if (finished) return; finished = true;
        clearTimeout(timer); host.events.off('create', begin);
        host.load?.off(completeEvent, done); host.load?.off('loaderror', failed);
        this._loadCancels.delete(cancel);
        if (error) reject(error); else resolve();
      };
      const cancel = () => finish(new Error('Audio loading cancelled.'));
      const done = () => finish();
      const failed = file => {
        if (file.key === track.key) finish(new Error(`Cannot load ${track.url}`));
      };
      const begin = () => {
        if (finished) return;
        try {
          if (this._canPlay(track.key)) return finish();
          host.load.once(completeEvent, done); host.load.on('loaderror', failed);
          host.load.audio(track.key, track.url);
          if (!host.load.isLoading()) host.load.start();
        } catch (error) { finish(error); }
      };
      this._loadCancels.add(cancel);
      timer = setTimeout(() => finish(new Error(`Loading timed out: ${track.url}`)), 45000);
      if (host.sys.isActive() && host.load) begin();
      else host.events.once('create', begin);
    });
    this._loads.set(track.key, promise);
    promise.then(() => this._loads.delete(track.key), () => this._loads.delete(track.key));
    return promise;
  }
  ensureJukebox() {
    if (!JUKEBOX_TRACKS.length || this.jukeboxMode !== 'playing' || this._jukeboxSound()?.isPlaying || this._jukeboxTask || this.jukeboxStatus === 'error') return;
    this.playJukebox(this.selectedTrack).catch(error => console.warn('[Jukebox]', error));
  }
  playJukebox(id = this.selectedTrack) {
    if (catalogError) {
      this.jukeboxStatus = 'error'; this.jukeboxError = catalogError;
      return Promise.reject(new Error(catalogError));
    }
    const track = JUKEBOX_TRACKS.find(t => t.id === id);
    if (!track) return Promise.reject(new Error(`Unknown jukebox track: ${id}`));
    if (!this.game) return Promise.reject(new Error('Initialize AudioManager first.'));
    const request = ++this._requestId, game = this.game;
    this.selectedTrack = id; safeSet(STORAGE.TRACK, id);
    this._setJukeboxMode('playing'); this.jukeboxError = ''; this.jukeboxStatus = 'loading';
    for (const key of BACKGROUND_KEYS) {
      this._stopStored(this.activeMusic, key); game.sound.stopByKey(key);
    }
    for (const t of JUKEBOX_TRACKS) if (t.id !== id) this._stopStored(this.activeMusic, t.key);
    const task = (async () => {
      try {
        await this._loadTrack(track);
        if (request !== this._requestId || game !== this.game) return null;
        let sound = this.activeMusic.get(track.key);
        if (this._isValidSound(sound) && sound.isPaused) {
          this._applySoundState(sound, this.musicVolume); sound.resume();
        } else sound = this._createOrReuse(track.key, { loop: true }, this.activeMusic, this.musicVolume, true);
        if (!sound) throw new Error(`Cannot create audio: ${track.title}`);
        this.jukeboxStatus = 'playing'; return sound;
      } catch (error) {
        if (request === this._requestId && game === this.game) {
          this.jukeboxStatus = 'error'; this.jukeboxError = error.message;
        }
        throw error;
      } finally { if (request === this._requestId) this._jukeboxTask = null; }
    })();
    this._jukeboxTask = task; return task;
  }
  pauseJukebox() {
    ++this._requestId; this._jukeboxTask = null; this._setJukeboxMode('paused');
    this._jukeboxSound()?.pause(); this.jukeboxStatus = catalogError ? 'error' : 'paused';
  }
  stopJukebox() {
    ++this._requestId; this._jukeboxTask = null; this._setJukeboxMode('stopped');
    for (const track of JUKEBOX_TRACKS) this._stopStored(this.activeMusic, track.key);
    this.jukeboxStatus = catalogError ? 'error' : 'stopped'; this.jukeboxError = catalogError;
  }
  _destroyForGame() {
    this._stopAllTweens(); this.stopAllMusic(); this.stopAllNonMusic();
    for (const cancel of [...this._loadCancels]) cancel();
    this._loads.clear();
    for (const scene of [...this._sceneBindings.keys()]) this._unbindScene(scene);
    this.game?.events?.off(Phaser.Core.Events.DESTROY, this._boundGameDestroy);
    this._keyOwner.clear(); this._playingSfx.clear(); this._playingOneShots.clear();
    this.scene = null; this.game = null; this._audioHost = null; this._hostRequested = false;
  }
}
export const audioManager = new AudioManager();
