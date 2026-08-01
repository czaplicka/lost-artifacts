import { BootScene } from './scenes/BootScene.js';
import { PreloaderScene } from './scenes/PreloaderScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { GameScene } from './scenes/GameScene.js';
import { OfficeScene } from './scenes/OfficeScene.js';
import { HighscoreScene } from './scenes/HighscoreScene.js';
import { CityScene } from './scenes/CityScene.js';
import { LocationScene } from './scenes/LocationScene.js';
import { TravelTransitionScene } from './scenes/TravelTransitionScene.js';
import { PlayerHudScene } from './scenes/PlayerHudScene.js';
import { ArrestSelectionScene } from './scenes/ArrestSelectionScene.js';
import { AgainScene } from './scenes/AgainScene.js';
import { SuccessScene } from './scenes/SuccessScene.js';
import UIScene from './ui/UIScene.js';
import HiddenObjectsScene from './scenes/HiddenObjectsScene.js';
import { PhoneCallScene } from './scenes/PhoneCallScene.js';
import HypothesisScene from './scenes/HypothesisScene.js';
import WantedDatabaseScene from './scenes/WantedDatabaseScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-root',
    backgroundColor: '#000000',
    scene: [
        BootScene,
        PreloaderScene,
        MenuScene,
        SettingsScene,
        GameOverScene,
        GameScene,
        OfficeScene,
        HighscoreScene,
        CityScene,
        LocationScene,
        TravelTransitionScene,
        PlayerHudScene,
        ArrestSelectionScene,
        SuccessScene,
        AgainScene,
        HiddenObjectsScene,
        UIScene,
        PhoneCallScene,
        HypothesisScene,
        WantedDatabaseScene,
    ],
    dom: {
        createContainer: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false
    }
};

new Phaser.Game(config);
window.game = new Phaser.Game(config);