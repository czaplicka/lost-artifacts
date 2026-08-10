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
import { DifficultyScene } from './scenes/DifficultyScene.js';
import { HotelScene } from './scenes/HotelScene.js';

import { UIScene } from './ui/UIScene.js';
import { NewsHud } from './ui/NewsHud.js';

import { HiddenObjectsScene } from './scenes/HiddenObjectsScene.js';
import { PhoneCallScene } from './scenes/PhoneCallScene.js';
import { HypothesisScene } from './scenes/HypothesisScene.js';
import { TheoryResultCallScene } from './scenes/TheoryResultCallScene.js';
import { WantedDatabaseScene } from './scenes/WantedDatabaseScene.js';
import { RecoveredArtifactsScene } from './scenes/RecoveredArtifactsScene.js';

import { CrimeLabScene } from './scenes/CSI/CrimeLabScene.js';
import { HairAnalysisScene } from './scenes/CSI/HairAnalysisScene.js';
import { ToolmarkAnalysisScene } from './scenes/CSI/ToolmarkAnalysisScene.js';
import { FiberAnalysisScene } from './scenes/CSI/FiberAnalysisScene.js';
import { FingerprintScene } from './scenes/CSI/FingerprintScene.js';
import { ShoeprintScene } from './scenes/CSI/ShoeprintScene.js';

import { NewsstandScene } from './scenes/NewsstandScene.js';
import { NewspaperOverlayScene } from './scenes/NewspaperOverlayScene.js';
import { EnterScene } from './scenes/EnterScene.js';
import { TvBroadcastScene } from './scenes/TvBroadcastScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
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
    DifficultyScene,
    HotelScene,

    HiddenObjectsScene,
    PhoneCallScene,
    HypothesisScene,
    TheoryResultCallScene,
    WantedDatabaseScene,
    RecoveredArtifactsScene,

    NewsstandScene,
    NewspaperOverlayScene,
    EnterScene,
    TvBroadcastScene,

    UIScene,
    NewsHud,

    CrimeLabScene,

    HairAnalysisScene,
    ToolmarkAnalysisScene,
    FiberAnalysisScene,
    FingerprintScene,
    ShoeprintScene
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

const BUILD_VERSION = '0.9.1';

window.game = new Phaser.Game(config);