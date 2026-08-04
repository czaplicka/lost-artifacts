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
        this.activeSfx = new Set();
        this.activeVoice = new Set();
    }

    init(scene) {
        this.scene = scene;

        if (this.scene?.sound) {
            this.scene.sound.mute = this.muted;
        }

        this.activeMusic.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setMute(this.muted);
                sound.setVolume(this.musicVolume);
            }
        });

        this.activeSfx.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setMute(this.muted);
                sound.setVolume(this.sfxVolume);
            }
        });

        this.activeVoice.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setMute(this.muted);
                sound.setVolume(this.sfxVolume);
            }
        });
    }

    setMusicVolume(value) {
        this.musicVolume = Phaser.Math.Clamp(value, 0, 1);
        safeSet(STORAGE.MUSIC, String(this.musicVolume));

        this.activeMusic.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setVolume(this.musicVolume);
            }
        });
    }

    setSfxVolume(value) {
        this.sfxVolume = Phaser.Math.Clamp(value, 0, 1);
        safeSet(STORAGE.SFX, String(this.sfxVolume));

        this.activeSfx.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setVolume(this.sfxVolume);
            }
        });

        this.activeVoice.forEach(sound => {
            if (sound && !sound.pendingRemove) {
                sound.setVolume(this.sfxVolume);
            }
        });
    }

    toggleMute() {
        this.muted = !this.muted;

        if (this.scene?.sound) {
            this.scene.sound.mute = this.muted;
        }

        safeSet(STORAGE.MUTED, String(this.muted));
        return this.muted;
    }

    playMusic(key, config = {}) {
        if (!this.scene || !this.scene.cache.audio.exists(key)) return null;

        let sound = this.activeMusic.get(key);

        if (!sound) {
            sound = this.scene.sound.get(key);
        }

        if (sound) {
            sound.setLoop(config.loop ?? true);
            sound.setMute(this.muted);
            sound.setVolume(config.volume ?? this.musicVolume);

            this.activeMusic.set(key, sound);

            if (!sound.isPlaying) {
                sound.play();
            }

            return sound;
        }

        sound = this.scene.sound.add(key, {
            ...config,
            loop: config.loop ?? true,
            volume: config.volume ?? this.musicVolume,
            mute: this.muted
        });

        this.activeMusic.set(key, sound);
        sound.play();

        sound.once('destroy', () => {
            if (this.activeMusic.get(key) === sound) {
                this.activeMusic.delete(key);
            }
        });

        return sound;
    }

    stopMusic(key) {
        let sound = this.activeMusic.get(key);

        if (!sound && this.scene?.sound) {
            sound = this.scene.sound.get(key);
        }

        if (sound) {
            if (sound.isPlaying) {
                sound.stop();
            }
            if (!sound.pendingRemove) {
                sound.destroy();
            }
        }

        this.activeMusic.delete(key);
    }

    stopAllMusic() {
        this.activeMusic.forEach(sound => {
            if (sound) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });

        this.activeMusic.clear();
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
        sound.once('destroy', () => {
            this.activeSfx.delete(sound);
        });

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
        sound.once('destroy', () => {
            this.activeVoice.delete(sound);
        });

        return sound;
    }

    stopAllSfx() {
        this.activeSfx.forEach(sound => {
            if (sound) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });

        this.activeSfx.clear();
    }

    stopAllVoice() {
        this.activeVoice.forEach(sound => {
            if (sound) {
                if (sound.isPlaying) {
                    sound.stop();
                }
                if (!sound.pendingRemove) {
                    sound.destroy();
                }
            }
        });

        this.activeVoice.clear();
    }

    stopAllNonMusic() {
        this.stopAllSfx();
        this.stopAllVoice();
    }

    isMusicPlaying(key) {
        const sound = this.activeMusic.get(key) || this.scene?.sound?.get(key);
        return !!(sound && sound.isPlaying);
    }

    getMusic(key) {
        return this.activeMusic.get(key) || this.scene?.sound?.get(key) || null;
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