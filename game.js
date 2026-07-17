import { HighscoreScene } from './HighscoreScene.js';
import { MenuScene } from './MenuScene.js';
import { GameScene } from './GameScene.js';
import { BootScene } from './BootScene.js';
import { GameOverScene } from './GameOverScene.js';
import { PreloaderScene } from './PreloaderScene.js';
import { ScoreManager } from './ScoreManager.js';
import { SettingsScene } from './SettingsScene.js';

const config = {
    type: Phaser.AUTO,
    pixelArt: true,
    width: 1920,
    height: 1080,
    parent: document.body,
    scale: {
        mode: Phaser.Scale.FIT,        // Dopasuje grę, zachowując proporcje
        autoCenter: Phaser.Scale.CENTER_BOTH, // Wycentruje grę na środku
       // parent: 'phaser-game'          // Opcjonalnie, jeśli chcesz mieć kontener
    },
    dom: {
        createContainer: true // Wymagane dla playerInputDOM w NotesUI
    },
        scene: [BootScene, PreloaderScene, MenuScene, HighscoreScene, SettingsScene, GameOverScene, GameScene]
};
const game = new Phaser.Game(config);