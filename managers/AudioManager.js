import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';

const STORAGE = {
  MUSIC: 'la_musicVol', SFX: 'la_sfxVol', VOICE: 'la_voiceVol', MUTED: 'la_muted',
  TRACK: 'la_jukeboxTrack', MODE: 'la_jukeboxMode'
};
const DEFAULTS = { MUSIC: 0.1, SFX: 0.8, MUTED: false };
const AUDIO_HOST_KEY = '__LostArtifactsAudioHost';
const BACKGROUND_KEYS = new Set(['themeMusic', 'themeGame']);
const CATALOG_URL = new URL('../assets/audio/music/tracks.json', import.meta.url);
const CATALOG_RETRY_MS = 10000;
export let JUKEBOX_TRACKS = Object.freeze([]);
let catalogError = '';
let catalogTask = null;
let catalogRetryAt = 0;

async function fetchJukeboxCatalog() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(CATALOG_URL, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error('Expected a non-empty array of tracks.');
    const used = new Set();
    return Object.freeze(data.map((track, index) => {
      if (!track || typeof track.id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(track.id)) {
        throw new Error(`Track ${index + 1}: id must contain only letters, numbers, underscores or hyphens.`);
      }
      if (used.has(track.id)) throw new Error(`Duplicate track id: ${track.id}`);
      if (typeof track.title !== 'string' || !track.title.trim()) throw new Error(`Track ${index + 1}: title is required.`);
      used.add(track.id);
      return Object.freeze({
        id: track.id, title: track.title.trim(), key: `jukebox_${track.id}`,
        url: new URL(`${encodeURIComponent(track.id)}.mp3`, CATALOG_URL).href
      });
    }));
  } finally { clearTimeout(timer); }
}

function ensureCatalog({ retry = false } = {}) {
  if (JUKEBOX_TRACKS.length) return Promise.resolve(JUKEBOX_TRACKS);
  if (catalogTask) return catalogTask;
  if (catalogError && !retry && Date.now() < catalogRetryAt) return Promise.reject(new Error(catalogError));
  catalogError = '';
  const task = fetchJukeboxCatalog().then(tracks => {
    JUKEBOX_TRACKS = tracks; catalogError = ''; catalogRetryAt = 0;
    return tracks;
  }).catch(error => {
    catalogError = `${__dialogueText('managers/AudioManager.js', 't_3510ce16934aa9687fbd')}${error.name === 'AbortError' ? __dialogueText('managers/AudioManager.js', 't_93deb3798f1b6a3ee1a0') : error.message}`;
    catalogRetryAt = Date.now() + CATALOG_RETRY_MS;
    console.error('[Jukebox]', catalogError);
    throw new Error(catalogError);
  }).finally(() => { if (catalogTask === task) catalogTask = null; });
  catalogTask = task;
  return task;
}

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
    this.voiceVolume = loadNumber(STORAGE.VOICE, this.sfxVolume);
    const muted = safeGet(STORAGE.MUTED);
    this.muted = muted === null ? DEFAULTS.MUTED : muted === 'true';
    this.activeMusic = new Map(); this.activeAmbient = new Map();
    this.activeSfx = new Set(); this.activeVoice = new Set(); this.activeOneShots = new Set();
    this._keyOwner = new Map(); this._activeTweens = new Set(); this._fades = new Map();
    this._playingOneShots = new Map(); this._playingSfx = new Map();
    this._sceneBindings = new Map(); this._soundOwners = new WeakMap(); this._soundMix = new WeakMap();
    this._ambientSlots = new WeakMap(); this._sleepPausedSounds = new WeakSet();
    this._destroyingSounds = new WeakSet(); this._audioHost = null; this._hostRequested = false;
    this._boundGameDestroy = () => this._destroyForGame();
    this.selectedTrack = safeGet(STORAGE.TRACK) || null;
    const mode = safeGet(STORAGE.MODE);
    this.jukeboxMode = ['playing', 'paused', 'stopped'].includes(mode) ? mode : 'playing';
    this.jukeboxStatus = 'stopped'; this.jukeboxError = '';
    this._requestId = 0; this._loads = new Map(); this._loadCancels = new Set();
    this._unlockCancels = new Set(); this._jukeboxTask = null; this._jukeboxCompletion = null;
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
    const manager = this.game.scene, registered = manager.keys?.[AUDIO_HOST_KEY];
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
  _isOwnerUsable(scene) {
    const status = scene?.sys?.settings?.status;
    return Boolean(scene?.game && scene.events && !scene._cleanupDone && !scene._destroyCleanupDone &&
      status !== Phaser.Scenes.SHUTDOWN && status !== Phaser.Scenes.DESTROYED);
  }
  _resolveOwner(config) {
    const explicit = Object.prototype.hasOwnProperty.call(config, 'scene');
    const owner = explicit ? config.scene : this.scene;
    if (!this._isOwnerUsable(owner)) {
      console.warn('[AudioManager] Scene-bound sound skipped: pass a live scene in { scene }.');
      return null;
    }
    if (!this.game || this.game !== owner.game) this.init(owner);
    else this._bindScene(owner);
    return owner;
  }
  _ambientSlot(scene, key) {
    let slots = this._ambientSlots.get(scene);
    if (!slots) { slots = new Map(); this._ambientSlots.set(scene, slots); }
    if (!slots.has(key)) slots.set(key, Symbol(key));
    return slots.get(key);
  }
  _bindScene(scene) {
    if (!scene.events || this._sceneBindings.has(scene)) return;
    const onSleep = () => this._sceneSleep(scene);
    const onWake = () => this._sceneWake(scene);
    const finish = () => {
      this._sceneShutdown(scene); this._unbindScene(scene);
      if (this.scene === scene) this.scene = null;
    };
    this._sceneBindings.set(scene, { onSleep, onWake, finish });
    scene.events.on('sleep', onSleep); scene.events.on('wake', onWake);
    scene.events.once('shutdown', finish); scene.events.once('destroy', finish);
  }
  _unbindScene(scene) {
    const b = this._sceneBindings.get(scene); if (!b) return;
    scene.events.off('sleep', b.onSleep); scene.events.off('wake', b.onWake);
    scene.events.off('shutdown', b.finish); scene.events.off('destroy', b.finish);
    this._sceneBindings.delete(scene); this._ambientSlots.delete(scene);
  }
  _sceneSleep(scene) {
    for (const sound of this.activeAmbient.values()) {
      if (this._soundOwners.get(sound) !== scene || !this._isValidSound(sound) || !sound.isPlaying) continue;
      if (sound.pause?.() !== false && sound.isPaused) this._sleepPausedSounds.add(sound);
    }
    for (const sound of [...this.activeSfx, ...this.activeVoice, ...this.activeOneShots]) {
      if (this._soundOwners.get(sound) === scene) this._destroySound(sound);
    }
  }
  _sceneWake(scene) {
    for (const sound of this.activeAmbient.values()) {
      if (this._soundOwners.get(sound) !== scene || !this._sleepPausedSounds.has(sound)) continue;
      this._sleepPausedSounds.delete(sound);
      if (this._isValidSound(sound) && sound.isPaused) {
        this._renderMix(sound); sound.resume?.();
      }
    }
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
  _mixMaster(mix) {
    if (mix.channel === 'music') return this.musicVolume;
    if (mix.channel === 'voice') return this.voiceVolume;
    return this.sfxVolume;
  }
  _resolveGain(config, master, volume = config.volume ?? master) {
    if (config.gain !== undefined && Number.isFinite(Number(config.gain))) return Math.max(0, Number(config.gain));
    if (config.volume == null || master <= 0) return 1;
    return clamp01(volume) / master;
  }
  _trackMix(sound, config, store, volume) {
    const channel = store === this.activeMusic ? 'music' : store === this.activeVoice ? 'voice' : 'sfx';
    const master = this._mixMaster({ channel });
    this._soundMix.set(sound, { channel, gain: this._resolveGain(config, master, volume), lastMaster: master, lastVolume: null });
    return clamp01(master * this._soundMix.get(sound).gain);
  }
  _captureMix(sound) {
    const mix = this._soundMix.get(sound);
    if (!mix) return null;
    if (!this._fades.has(sound) && mix.lastVolume !== null && Number.isFinite(sound.volume) &&
        Math.abs(sound.volume - mix.lastVolume) > 1e-9 && mix.lastMaster > 0) {
      mix.gain = clamp01(sound.volume) / mix.lastMaster;
    }
    return mix;
  }
  _renderMix(sound) {
    if (!this._isValidSound(sound)) return;
    const mix = this._soundMix.get(sound); if (!mix) return;
    mix.lastMaster = this._mixMaster(mix); mix.lastVolume = clamp01(mix.lastMaster * mix.gain);
    sound.setVolume?.(mix.lastVolume);
  }
  _syncChannelVolumes(sounds, volume) {
    for (const sound of [...sounds]) {
      if (!this._isValidSound(sound)) continue;
      if (this._captureMix(sound)) this._renderMix(sound); else sound.setVolume?.(clamp01(volume));
    }
  }
  _applyGlobalAudioState() {
    this._applyMuteState(); this._syncChannelVolumes(this.activeMusic.values(), this.musicVolume);
    for (const sounds of [this.activeAmbient.values(), this.activeSfx, this.activeOneShots]) this._syncChannelVolumes(sounds, this.sfxVolume);
    this._syncChannelVolumes(this.activeVoice, this.voiceVolume);
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
    if (this._jukeboxCompletion?.sound === sound) this._detachJukeboxCompletion();
    this._sleepPausedSounds.delete(sound); this._destroyingSounds.add(sound); this._cancelFade(sound);
    try { if (this._isValidSound(sound)) { sound.stop?.(); sound.destroy?.(); } }
    finally { this._destroyingSounds.delete(sound); }
  }
  _watchSound(sound, store, storageKey = null, audioKey = storageKey) {
    let cleaned = false;
    sound.once('destroy', () => {
      if (cleaned) return; cleaned = true;
      this._cancelFade(sound); this._soundOwners.delete(sound); this._soundMix.delete(sound); this._sleepPausedSounds.delete(sound);
      if (store instanceof Map) { if (store.get(storageKey) === sound) store.delete(storageKey); } else store.delete(sound);
      if (this._keyOwner.get(audioKey)?.sound === sound) this._keyOwner.delete(audioKey);
      if (this._playingSfx.get(audioKey) === sound) this._playingSfx.delete(audioKey);
      if (this._playingOneShots.get(audioKey) === sound) this._playingOneShots.delete(audioKey);
    });
  }
  _releaseKeyOwnership(key, requestingStore) {
    for (const store of [this.activeMusic, this.activeAmbient]) {
      if (store === requestingStore) continue;
      for (const sound of [...store.values()]) if (sound.key === key) this._destroySound(sound);
    }
  }
  _playConfigured(sound, config, volume, loop) {
    const { gain, scene, overlap, ...phaserConfig } = config;
    const playback = { ...phaserConfig, volume: clamp01(volume), loop, mute: this.muted };
    this._applySoundState(sound, playback.volume);
    const started = sound.play(playback); this._applySoundState(sound, playback.volume); this._renderMix(sound);
    return started;
  }
  _createOrReuse(key, config, store, volume, loop = true) {
    const owner = store === this.activeAmbient ? this._resolveOwner(config) : null;
    if (store === this.activeAmbient && !owner) return null;
    if (!this._canPlay(key)) return null;
    this._releaseKeyOwnership(key, store);
    const storageKey = owner ? this._ambientSlot(owner, key) : key;
    let sound = store.get(storageKey);
    if (!this._isValidSound(sound)) { store.delete(storageKey); sound = null; }
    if (sound) {
      this._cancelFade(sound); this._sleepPausedSounds.delete(sound);
      volume = this._trackMix(sound, config, store, volume);
      sound.setLoop?.(loop); this._applySoundState(sound, volume); this._renderMix(sound);
      if (!sound.isPlaying) this._playConfigured(sound, config, volume, loop);
      return sound;
    }
    const { gain, scene, overlap, ...phaserConfig } = config;
    sound = this.game.sound.add(key, { ...phaserConfig, loop, volume: clamp01(volume), mute: this.muted });
    volume = this._trackMix(sound, config, store, volume);
    store.set(storageKey, sound); this._keyOwner.set(key, { store, sound });
    if (owner) this._soundOwners.set(sound, owner);
    this._watchSound(sound, store, storageKey, key);
    this._playConfigured(sound, config, volume, loop); return sound;
  }
  _fadeTo(sound, targetVolume, duration = 300, stopAfter = false, startVolume = null, targetGain = null) {
    if (!this._isValidSound(sound)) return null;
    let mix = this._captureMix(sound);
    if (!mix) {
      const store = [...this.activeMusic.values()].includes(sound) ? this.activeMusic : this.activeVoice.has(sound) ? this.activeVoice : this.activeSfx;
      this._trackMix(sound, { volume: sound.volume }, store, sound.volume); mix = this._soundMix.get(sound);
    }
    this._cancelFade(sound);
    const master = this._mixMaster(mix);
    const from = startVolume === null ? mix.gain : master > 0 ? clamp01(startVolume) / master : 0;
    const target = targetGain !== null ? Math.max(0, Number(targetGain) || 0) :
      clamp01(targetVolume) === 0 ? 0 : master > 0 ? clamp01(targetVolume) / master : clamp01(targetVolume);
    mix.gain = from; this._renderMix(sound);
    const milliseconds = Math.max(0, Number(duration) || 0), host = this._ensureAudioHost();
    const finish = () => {
      if (stopAfter) this._destroySound(sound);
      else if (this._isValidSound(sound)) { mix.gain = target; this._renderMix(sound); }
    };
    if (!milliseconds || !host?.sys?.isActive?.() || !host.tweens?.addCounter) { finish(); return null; }
    const record = { tween: null, stopAfter }; this._fades.set(sound, record);
    try {
      record.tween = host.tweens.addCounter({ from, to: target, duration: milliseconds, ease: 'Sine.easeInOut',
        onUpdate: tween => {
          if (this._fades.get(sound) === record && this._isValidSound(sound)) {
            const value = tween.getValue(); if (Number.isFinite(value)) { mix.gain = Math.max(0, value); this._renderMix(sound); }
          }
        },
        onComplete: () => {
          if (this._fades.get(sound) !== record) return;
          this._fades.delete(sound); this._activeTweens.delete(record.tween); finish();
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
    this.sfxVolume = clamp01(value); safeSet(STORAGE.SFX, String(this.sfxVolume)); this._applyMuteState();
    for (const sounds of [this.activeAmbient.values(), this.activeSfx, this.activeOneShots]) this._syncChannelVolumes(sounds, this.sfxVolume);
  }
  setVoiceVolume(value) {
    this.voiceVolume = clamp01(value); safeSet(STORAGE.VOICE, String(this.voiceVolume));
    this._applyMuteState(); this._syncChannelVolumes(this.activeVoice, this.voiceVolume);
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
    const owner = this._resolveOwner(config);
    if (!owner || !this._canPlay(key)) return null;
    const { overlap = false, ...soundConfig } = config, trackRecent = recent && !overlap;
    if (trackRecent) this._destroySound(recent.get(key));
    const master = store === this.activeVoice ? this.voiceVolume : this.sfxVolume;
    let volume = clamp01(soundConfig.volume ?? master);
    const { gain, scene, ...phaserConfig } = soundConfig;
    const sound = this.game.sound.add(key, { ...phaserConfig, loop: false, volume, mute: this.muted });
    volume = this._trackMix(sound, soundConfig, store, volume);
    store.add(sound); if (trackRecent) recent.set(key, sound);
    this._soundOwners.set(sound, owner); this._watchSound(sound, store, null, key);
    const finish = () => this._destroySound(sound);
    sound.once('complete', finish); sound.once('stop', finish);
    this._playConfigured(sound, soundConfig, volume, false); return sound;
  }
  playSfx(key, config = {}) { return this._playTemporary(key, config, this.activeSfx, this._playingSfx); }
  playOneShot(key, config = {}) { return this._playTemporary(key, config, this.activeOneShots, this._playingOneShots); }
  playVoice(key, config = {}) { return this._playTemporary(key, config, this.activeVoice); }
  fadeInMusic(key, config = {}, duration = 500) {
    if (BACKGROUND_KEYS.has(key)) return this.playMusic(key, config);
    const targetGain = this._resolveGain(config, this.musicVolume);
    const sound = this.playMusic(key, { ...config, gain: 0, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.musicVolume, duration, false, 0, targetGain);
    return sound;
  }
  fadeInAmbient(key, config = {}, duration = 500) {
    const targetGain = this._resolveGain(config, this.sfxVolume);
    const sound = this.playAmbient(key, { ...config, gain: 0, volume: 0 });
    if (sound) this._fadeTo(sound, config.volume ?? this.sfxVolume, duration, false, 0, targetGain);
    return sound;
  }
  fadeOutAndStop(soundOrKey, duration = 400) {
    if (BACKGROUND_KEYS.has(soundOrKey)) return;
    const sound = typeof soundOrKey === 'string'
      ? this.activeMusic.get(soundOrKey) || [...this.activeAmbient.values()].find(s => s.key === soundOrKey) || this._playingSfx.get(soundOrKey) || this._playingOneShots.get(soundOrKey) || [...this.activeVoice].find(s => s.key === soundOrKey)
      : soundOrKey;
    if (this._isValidSound(sound)) this._fadeTo(sound, 0, duration, true);
  }
  _stopStored(store, key) { this._destroySound(store.get(key)); store.delete(key); }
  _stopAllStored(store) { for (const sound of [...store.values()]) this._destroySound(sound); store.clear(); }
  _stopAllSet(set) { for (const sound of [...set]) this._destroySound(sound); set.clear(); }
  stopMusic(key) { this._stopStored(this.activeMusic, key); }
  stopAmbient(key, { scene = null } = {}) {
    for (const sound of [...this.activeAmbient.values()]) {
      if (sound.key === key && (!scene || this._soundOwners.get(sound) === scene)) this._destroySound(sound);
    }
  }
  stopPersistentLoop(key, config = {}) { this.stopAmbient(key, config); }
  stopAllMusic() {
    this._detachJukeboxCompletion(); this._cancelUnlockWaits();
    ++this._requestId; this._jukeboxTask = null;
    this._stopAllStored(this.activeMusic); this.jukeboxStatus = 'stopped';
  }
  stopAllAmbient() { this._stopAllStored(this.activeAmbient); }
  stopAllPersistent() { this.stopAllAmbient(); }
  stopSfx(key) { this._destroySound(this._playingSfx.get(key)); this._playingSfx.delete(key); }
  stopVoice(key) { for (const s of [...this.activeVoice]) if (s.key === key) this._destroySound(s); }
  stopAllSfx() { this._stopAllSet(this.activeSfx); this._playingSfx.clear(); }
  stopAllVoice() { this._stopAllSet(this.activeVoice); }
  stopAllOneShots() { this._stopAllSet(this.activeOneShots); this._playingOneShots.clear(); }
  stopAllNonMusic() { this.stopAllSfx(); this.stopAllVoice(); this.stopAllOneShots(); this.stopAllAmbient(); }
  isMusicPlaying(key) { return !this.game?.sound?.locked && Boolean((BACKGROUND_KEYS.has(key) ? this._jukeboxSound() : this.activeMusic.get(key))?.isPlaying); }
  isAmbientPlaying(key, { scene = null } = {}) {
    return [...this.activeAmbient.values()].some(s => s.key === key && s.isPlaying && (!scene || this._soundOwners.get(s) === scene));
  }
  getMusicVolume() { return this.musicVolume; }
  getSfxVolume() { return this.sfxVolume; }
  getVoiceVolume() { return this.voiceVolume; }
  getMuted() { return this.muted; }
  getJukeboxTracks() { return JUKEBOX_TRACKS.map(t => ({ ...t })); }
  async loadJukeboxCatalog(options = {}) {
    const previousError = catalogError;
    const tracks = await ensureCatalog(options);
    if (!tracks.some(t => t.id === this.selectedTrack)) this.selectedTrack = tracks[0]?.id || null;
    if (this.jukeboxError === previousError) this.jukeboxError = '';
    if (this.jukeboxStatus === 'error' && previousError) this.jukeboxStatus = this.jukeboxMode === 'paused' ? 'paused' : 'stopped';
    return this.getJukeboxTracks();
  }
  _jukeboxSound() {
    const track = JUKEBOX_TRACKS.find(t => t.id === this.selectedTrack);
    return track ? this.activeMusic.get(track.key) : null;
  }
  getJukeboxState() {
    const sound = this._jukeboxSound(), locked = Boolean(this.game?.sound?.locked);
    const status = locked && this.jukeboxMode === 'playing' && ['playing', 'locked'].includes(this.jukeboxStatus) ? 'locked' : this.jukeboxStatus;
    return { selectedId: this.selectedTrack, mode: this.jukeboxMode, status,
      playing: !locked && Boolean(sound?.isPlaying), paused: Boolean(sound?.isPaused),
      volume: this.musicVolume, muted: this.muted, error: this.jukeboxError || catalogError, locked,
      catalogStatus: catalogTask ? 'loading' : JUKEBOX_TRACKS.length ? 'ready' : catalogError ? 'error' : 'idle',
      trackCount: JUKEBOX_TRACKS.length };
  }
  _setJukeboxMode(mode) { this.jukeboxMode = mode; safeSet(STORAGE.MODE, mode); }
  _loadTrack(track) {
    if (this._canPlay(track.key)) return Promise.resolve();
    if (this._loads.has(track.key)) return this._loads.get(track.key);
    const host = this._ensureAudioHost();
    if (!host) return Promise.reject(new Error(__dialogueText('managers/AudioManager.js', 't_247ba4a8509927aa1baa')));
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
      const cancel = () => finish(new Error(__dialogueText('managers/AudioManager.js', 't_afc44a0b2eab47657ca4')));
      const done = () => finish();
      const failed = file => { if (file?.key === track.key) finish(new Error(`${__dialogueText('managers/AudioManager.js', 't_1706f34e03ed1a78c892')}${track.url}`)); };
      const begin = () => {
        if (finished) return;
        try {
          if (this._canPlay(track.key)) return finish();
          host.load.once(completeEvent, done); host.load.on('loaderror', failed); host.load.audio(track.key, track.url);
          if (!host.load.isLoading()) host.load.start();
        } catch (error) { finish(error); }
      };
      this._loadCancels.add(cancel);
      timer = setTimeout(() => finish(new Error(`${__dialogueText('managers/AudioManager.js', 't_568d6944b0ff0cd339eb')}${track.url}`)), 45000);
      if (host.sys.isActive() && host.load) begin(); else host.events.once('create', begin);
    });
    this._loads.set(track.key, promise);
    promise.then(() => this._loads.delete(track.key), () => this._loads.delete(track.key));
    return promise;
  }
  _cancelUnlockWaits() { for (const cancel of [...this._unlockCancels]) cancel(); }
  _waitForUnlock(game) {
    const audio = game.sound;
    if (!audio.locked) return Promise.resolve(true);
    return new Promise(resolve => {
      let done = false;
      const finish = result => {
        if (done) return; done = true;
        audio.off('unlocked', unlocked); this._unlockCancels.delete(cancel); resolve(result);
      };
      const unlocked = () => finish(true), cancel = () => finish(false);
      this._unlockCancels.add(cancel); audio.once('unlocked', unlocked);
      if (!audio.locked) finish(true);
    });
  }
  _detachJukeboxCompletion() {
    const b = this._jukeboxCompletion; if (!b) return;
    this._jukeboxCompletion = null; b.sound.off('complete', b.onComplete);
  }
  _watchJukeboxCompletion(sound, track, request, game) {
    this._detachJukeboxCompletion();
    const binding = { sound, onComplete: null };
    binding.onComplete = () => {
      if (this._jukeboxCompletion !== binding) return;
      this._detachJukeboxCompletion();
      if (request !== this._requestId || game !== this.game || this.jukeboxMode !== 'playing' ||
          this.selectedTrack !== track.id || this.activeMusic.get(track.key) !== sound) return;
      const index = JUKEBOX_TRACKS.findIndex(t => t.id === track.id);
      const next = JUKEBOX_TRACKS[(index + 1) % JUKEBOX_TRACKS.length];
      if (next) this.playJukebox(next.id).catch(error => console.warn('[Jukebox] Next track failed:', error));
    };
    this._jukeboxCompletion = binding; sound.once('complete', binding.onComplete);
  }
  ensureJukebox({ retry = false } = {}) {
    if (!this.game || this.jukeboxMode !== 'playing') return Promise.resolve(null);
    if (this._jukeboxTask) return this._jukeboxTask;
    if (this._jukeboxSound()?.isPlaying && !this.game.sound.locked) return Promise.resolve(this._jukeboxSound());
    if (!retry && catalogError && Date.now() < catalogRetryAt) return Promise.resolve(null);
    return this.playJukebox(null, { retry }).catch(error => { console.warn('[Jukebox]', error); return null; });
  }
  playJukebox(id = null, { retry = true } = {}) {
    if (!this.game) return Promise.reject(new Error(__dialogueText('managers/AudioManager.js', 't_087ac6af55623406694d')));
    this._detachJukeboxCompletion(); this._cancelUnlockWaits();
    const request = ++this._requestId, game = this.game;
    this._setJukeboxMode('playing'); this.jukeboxError = ''; this.jukeboxStatus = 'loading';
    const current = () => request === this._requestId && game === this.game && this.jukeboxMode === 'playing';
    const task = (async () => {
      try {
        await this.loadJukeboxCatalog({ retry });
        if (!current()) return null;
        const selected = id ?? this.selectedTrack;
        const track = JUKEBOX_TRACKS.find(t => t.id === selected);
        if (!track) throw new Error(`${__dialogueText('managers/AudioManager.js', 't_c11ee2b6a648b4590c03')}${selected}`);
        this.selectedTrack = track.id; safeSet(STORAGE.TRACK, track.id);
        await this._loadTrack(track);
        if (!current()) return null;
        if (game.sound.locked) {
          this.jukeboxStatus = 'locked';
          if (!await this._waitForUnlock(game) || !current()) return null;
        }
        for (const key of BACKGROUND_KEYS) { this._stopStored(this.activeMusic, key); game.sound.stopByKey?.(key); }
        for (const t of JUKEBOX_TRACKS) if (t.id !== track.id) this._stopStored(this.activeMusic, t.key);
        let sound = this.activeMusic.get(track.key);
        if (this._isValidSound(sound) && sound.isPaused) {
          sound.setLoop(false); this._renderMix(sound); this._applySoundState(sound, sound.volume); sound.resume();
        } else sound = this._createOrReuse(track.key, { loop: false }, this.activeMusic, this.musicVolume, false);
        if (!sound || !sound.isPlaying) throw new Error(`Cannot start audio: ${track.title}`);
        this._watchJukeboxCompletion(sound, track, request, game);
        this.jukeboxStatus = 'playing'; return sound;
      } catch (error) {
        if (!current()) return null;
        this.jukeboxStatus = 'error'; this.jukeboxError = error.message; throw error;
      } finally { if (request === this._requestId) this._jukeboxTask = null; }
    })();
    this._jukeboxTask = task; return task;
  }
  pauseJukebox() {
    this._detachJukeboxCompletion(); ++this._requestId; this._cancelUnlockWaits();
    this._jukeboxTask = null; this._setJukeboxMode('paused');
    this._jukeboxSound()?.pause(); this.jukeboxStatus = 'paused';
  }
  stopJukebox() {
    this._detachJukeboxCompletion(); ++this._requestId; this._cancelUnlockWaits();
    this._jukeboxTask = null; this._setJukeboxMode('stopped');
    for (const track of JUKEBOX_TRACKS) this._stopStored(this.activeMusic, track.key);
    this.jukeboxStatus = 'stopped'; this.jukeboxError = '';
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