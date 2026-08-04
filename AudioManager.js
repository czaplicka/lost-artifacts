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

class AudioManager {
    constructor() {
        this.scene = null;
        this.musicVolume = loadNumber(STORAGE.MUSIC, DEFAULTS.MUSIC);
        this.sfxVolume = loadNumber(STORAGE.SFX, DEFAULTS.SFX);
        this.muted = safeGet(STORAGE.MUTED) === 'true';

        this.activeMusic = new Map();
        this.activePersistent = new Map();
        this.activeSfx = new Set();
        this.activeVoice = new Set();
    }

    init(scene) {
        this.scene = scene;

        if (this.scene?.sound) {
            this.scene.sound.mute = this.muted;
        }

        this._syncMap(this.activeMusic, this.musicVolume);
        this._syncMap(this.activePersistent, this.sfxVolume);
        this._syncSet(this.activeSfx, this.sfxVolume);
        this._syncSet(this.activeVoice, this.sfxVolume);
    }

    _syncMap(map, volume) {
        map.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setMute(this.muted);
                sound.setVolume(volume);
            }
        });
    }

    _syncSet(set, volume) {
        set.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setMute(this.muted);
                sound.setVolume(volume);
            }
        });
    }

    setMusicVolume(value) {
        this.musicVolume = Phaser.Math.Clamp(value, 0, 1);
        safeSet(STORAGE.MUSIC, String(this.musicVolume));
        this._syncMap(this.activeMusic, this.musicVolume);
    }

    setSfxVolume(value) {
        this.sfxVolume = Phaser.Math.Clamp(value, 0, 1);
        safeSet(STORAGE.SFX, String(this.sfxVolume));
        this._syncSet(this.activeSfx, this.sfxVolume);
        this._syncSet(this.activeVoice, this.sfxVolume);
        this._syncMap(this.activePersistent, this.sfxVolume);
    }

    toggleMute() {
        this.muted = !this.muted;

        if (this.scene?.sound) {
            this.scene.sound.mute = this.muted;
        }

        this._applyMuteToAll();
        safeSet(STORAGE.MUTED, String(this.muted));
        return this.muted;
    }

    _applyMuteToAll() {
        this._syncMap(this.activeMusic, this.musicVolume);
        this._syncMap(this.activePersistent, this.sfxVolume);
        this._syncSet(this.activeSfx, this.sfxVolume);
        this._syncSet(this.activeVoice, this.sfxVolume);
    }

    playMusic(key, config = {}) {
        return this._playLooped(this.activeMusic, key, {
            ...config,
            loop: config.loop ?? true,
            volume: config.volume ?? this.musicVolume
        }, true);
    }

    playPersistentLoop(key, config = {}) {
        return this._playLooped(this.activePersistent, key, {
            ...config,
            loop: config.loop ?? true,
            volume: config.volume ?? this.sfxVolume
        }, false);
    }

    _playLooped(store, key, config = {}, restartIfStopped = true) {
        if (!this.scene || !this.scene.cache.audio.exists(key)) return null;

        let sound = store.get(key) || this.scene.sound.get(key);

        if (sound) {
            sound.setLoop(config.loop ?? true);
            sound.setMute(this.muted);
            sound.setVolume(config.volume ?? 1);
            store.set(key, sound);

            if (restartIfStopped && !sound.isPlaying) {
                sound.play();
            }

            return sound;
        }

        sound = this.scene.sound.add(key, {
            ...config,
            mute: this.muted
        });

        store.set(key, sound);
        sound.play();

        sound.once('destroy', () => {
            if (store.get(key) === sound) {
                store.delete(key);
            }
        });

        return sound;
    }

    stopMusic(key) {
        this._stopStored(this.activeMusic, key);
    }

    stopPersistentLoop(key) {
        this._stopStored(this.activePersistent, key);
    }

    stopAllMusic() {
        this._stopAllStored(this.activeMusic);
    }

    stopAllPersistent() {
        this._stopAllStored(this.activePersistent);
    }

    _stopStored(store, key) {
        let sound = store.get(key) || this.scene?.sound?.get(key);

        if (sound) {
            if (sound.isPlaying) {
                sound.stop();
            }
            if (!sound.pendingRemove) {
                sound.destroy();
            }
        }

        store.delete(key);
    }

    _stopAllStored(store) {
        store.forEach(sound => {
            if (sound) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });
        store.clear();
    }

    playSfx(key, config = {}) {
        if (!this.scene || !this.scene.cache.audio.exists(key)) return null;

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
            if (!sound.pendingRemove) {
                sound.destroy();
            }
        };

        sound.once('complete', cleanup);
        sound.once('stop', cleanup);
        sound.once('destroy', () => this.activeSfx.delete(sound));

        return sound;
    }

    playVoice(key, config = {}) {
        if (!this.scene || !this.scene.cache.audio.exists(key)) return null;

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
            if (!sound.pendingRemove) {
                sound.destroy();
            }
        };

        sound.once('complete', cleanup);
        sound.once('stop', cleanup);
        sound.once('destroy', () => this.activeVoice.delete(sound));

        return sound;
    }

    stopSfx(key) {
        this.activeSfx.forEach(sound => {
            if (sound && sound.key === key) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });
    }

    stopAllSfx() {
        this._stopAllSet(this.activeSfx);
    }

    stopAllVoice() {
        this._stopAllSet(this.activeVoice);
    }

    stopAllNonMusic() {
        this.stopAllSfx();
        this.stopAllVoice();
    }

    _stopAllSet(set) {
        set.forEach(sound => {
            if (sound) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });
        set.clear();
    }

    isMusicPlaying(key) {
        const sound = this.activeMusic.get(key) || this.scene?.sound?.get(key);
        return !!(sound && sound.isPlaying);
    }

    isPersistentPlaying(key) {
        const sound = this.activePersistent.get(key) || this.scene?.sound?.get(key);
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