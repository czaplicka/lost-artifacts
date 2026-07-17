import { loadGameState } from './gamedata.js'; // Upewnij się, że masz ten import na górze!

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Tylko wrzucanie plików do cache/kolejki ładowania
        this.load.audio('themeMusic', 'assets/audio/theme.mp3');
    }

    create() {
        // 1. Odtworzenie stanu z localStorage
        // Robimy to w create(), kiedy scena jest już zbudowana
        loadGameState();

        // 2. Dodajemy muzykę
        const music = this.sound.add('themeMusic', {
            loop: true,
            volume: 0.5
        });

        // Opcjonalnie: upewnij się, że muzyka jeszcze nie gra
        if (!this.registry.has('bgMusic')) {
            this.registry.set('bgMusic', music);
            // music.play(); // Zakomentuj jeśli muzyka ma grać, albo przenieś play() do MenuScene
        }

        // 3. Przejście do głównego paska ładowania zasobów gry
        this.scene.start('PreloaderScene');
    }
}