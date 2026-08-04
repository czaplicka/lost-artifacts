const STORAGE = {
    MUSIC: 'la_musicVol',
    SFX: 'la_sfxVol',
    MUTED: 'la_muted'
};

const DEFAULTS = {
    MUSIC: 0.5,
    SFX: 0.8,
    MUTED: false
};

function loadNumber(key, fallback) {
    const v = parseFloat(localStorage.getItem(key));
    return isNaN(v) ? fallback : v;
}

class AudioManager {
    constructor() {
        this.scene = null;
        this.musicVolume = loadNumber(STORAGE.MUSIC, DEFAULTS.MUSIC);
        this.sfxVolume = loadNumber(STORAGE.SFX, DEFAULTS.SFX);
        this.muted = localStorage.getItem(STORAGE.MUTED) === 'true';
        this.activeMusic = new Map();
        this.activeSfx = new Map();
    }

    init(scene) {
        this.scene = scene;
        scene.sound.mute = this.muted;
        this.activeMusic.forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.setVolume(this.musicVolume);
            }
        });
        this.activeSfx.forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.setVolume(this.sfxVolume);
            }
        });
    }

    setMusicVolume(value) {
        this.musicVolume = Phaser.Math.Clamp(value, 0, 1);
        localStorage.setItem(STORAGE.MUSIC, String(this.musicVolume));
        this.activeMusic.forEach(sound => {
            if (sound && sound.isPlaying) sound.setVolume(this.musicVolume);
        });
    }

    setSfxVolume(value) {
        this.sfxVolume = Phaser.Math.Clamp(value, 0, 1);
        localStorage.setItem(STORAGE.SFX, String(this.sfxVolume));
        this.activeSfx.forEach(sound => {
            if (sound && sound.isPlaying) sound.setVolume(this.sfxVolume);
        });
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.scene) this.scene.sound.mute = this.muted;
        localStorage.setItem(STORAGE.MUTED, String(this.muted));
        return this.muted;
    }

    playMusic(key, config = {}) {
        if (!this.scene || !this.scene.cache.audio.get(key)) return null;
        this.stopMusic(key);
        const sound = this.scene.sound.add(key, {
            ...config,
            loop: config.loop ?? true,
            volume: this.musicVolume
        });
        this.activeMusic.set(key, sound);
        sound.play();
        return sound;
    }

    stopMusic(key) {
        const sound = this.activeMusic.get(key);
        if (sound) {
            sound.stop();
            sound.destroy();
            this.activeMusic.delete(key);
        }
    }

    stopAllMusic() {
        this.activeMusic.forEach(sound => {
            sound.stop();
            sound.destroy();
        });
        this.activeMusic.clear();
    }

    playSfx(key, config = {}) {
        if (!this.scene || !this.scene.cache.audio.get(key)) return null;
        this.stopSfx(key);
        const sound = this.scene.sound.add(key, {
            ...config,
            volume: this.sfxVolume
        });
        this.activeSfx.set(key, sound);
        sound.play();
        sound.once('complete', () => {
            sound.destroy();
            this.activeSfx.delete(key);
        });
        return sound;
    }

    stopSfx(key) {
        const sound = this.activeSfx.get(key);
        if (sound) {
            sound.stop();
            sound.destroy();
            this.activeSfx.delete(key);
        }
    }

    stopAllSfx() {
        this.activeSfx.forEach(sound => {
            sound.stop();
            sound.destroy();
        });
        this.activeSfx.clear();
    }

    getMusicVolume() { return this.musicVolume; }
    getSfxVolume() { return this.sfxVolume; }
    getMuted() { return this.muted; }
}

export const audioManager = new AudioManager();