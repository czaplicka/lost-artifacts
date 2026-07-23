import { BootScene } from './BootScene.js';
import { PreloaderScene } from './PreloaderScene.js';
import { MenuScene } from './MenuScene.js';
import { SettingsScene } from './SettingsScene.js';
import { GameOverScene } from './GameOverScene.js';
import { GameScene } from './GameScene.js';
import { OfficeScene } from './OfficeScene.js';
import { HighscoreScene } from './HighscoreScene.js';
import { CityScene } from './CityScene.js';
import { LocationScene } from './LocationScene.js';
import { TravelTransitionScene } from './TravelTransitionScene.js';
import { PlayerHudScene } from './PlayerHudScene.js';
import { ArrestSelectionScene } from './ArrestSelectionScene.js';
import { AgainScene } from './AgainScene.js';
import { SuccessScene } from './SuccessScene.js';
import UIScene from './ui/UIScene.js';
import HiddenObjectsScene from './HiddenObjectsScene.js';
import { PhoneCallScene } from './PhoneCallScene.js';
import HypothesisScene from './HypothesisScene.js';

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