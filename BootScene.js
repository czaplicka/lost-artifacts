import { loadGameState } from './GameData.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.audio('themeMusic', 'assets/audio/theme.mp3');
    }

    create() {
        this.scene.sleep('UIScene');
        try {
            loadGameState();
        } catch (error) {
            console.error('loadGameState failed:', error);
        }

        if (!this.registry.has('bgMusic')) {
            const music = this.sound.add('themeMusic', {
                loop: true,
                volume: 0.5
            });
            this.registry.set('bgMusic', music);
        }

        if (this.scene.get('PreloaderScene')) {
            this.scene.start('PreloaderScene');
        } else {
            console.error('PreloaderScene is not registered');
        }
    }
}