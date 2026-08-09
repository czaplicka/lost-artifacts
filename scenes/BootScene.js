import { loadGameState } from '../GameData.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';

export class BootScene extends BaseScene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.audio('themeMusic', './assets/audio/theme.mp3');
        this.load.image('cozyBackground', 'assets/local/kitchen.jpg');
    }

    create() {
            super.create();
        try {
            loadGameState();
        } catch (error) {
            console.error('loadGameState failed:', error);
        }
if (!this.registry.has('difficulty')) {
            this.registry.set('difficulty', 'field');
        }
    // Inicjalizacja MobileFullscreen — tworzy overlay i listenery
    if (!this.registry.has('mobileFS')) {
        const mobileFS = new MobileFullscreen();
        this.registry.set('mobileFS', mobileFS);
    }

    if (this.scene.get('PreloaderScene')) {
        this.scene.start('PreloaderScene');
    } else {
        console.error('PreloaderScene is not registered');
    }
}
}