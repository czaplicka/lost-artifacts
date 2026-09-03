// main.js
// Only Tier-0 scenes are imported eagerly. Everything else is registered
// on demand by SceneLoader the first time a scene calls this.goto('Key').

import { BootScene } from './scenes/BootScene.js';
import { PreloaderScene } from './scenes/PreloaderScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { EnterScene } from './scenes/EnterScene.js';
import { PlayerHudScene } from './scenes/PlayerHudScene.js';
import { UIScene } from './ui/UIScene.js';
import { NewsHud } from './ui/NewsHud.js';
import { LoadingOverlayScene } from './scenes/LoadingOverlayScene.js';

import { SceneLoader } from './SceneLoader.js';
import { sceneRegistry } from './sceneRegistry.js';

const BUILD_VERSION = '0.10.0';

// ---------------------------------------------------------------------
// Scale handling
// ---------------------------------------------------------------------
// We keep Phaser.Scale.FIT on purpose: the game is a fixed 1920x1080
// painted-scene adventure (Indiana Jones-style backgrounds with
// absolutely positioned hotspots/UI). Phaser.Scale.RESIZE would change
// the *logical* game dimensions on every viewport change, which breaks
// every hand-placed hotspot/coordinate in HiddenObjectsScene, CrimeBoard,
// SuspectGridScene, etc. FIT only applies a CSS transform to the canvas —
// it does NOT re-render your scene graph, so it isn't the actual cost here.
//
// The real mobile cost is usually the ScaleManager recomputing on every
// 'resize' event — which mobile browsers fire repeatedly while the
// address bar / virtual keyboard animates in and out. We debounce that.

const RESIZE_DEBOUNCE_MS = 120;

function installResizeDebounce(game) {
  let timer = null;
  const scaleManager = game.scale;

  // Phaser already listens on window 'resize' internally; we just make sure
  // our own downstream layout code (HUD reflow, crime board recenter, etc.)
  // does not run on every single intermediate event.
  window.addEventListener('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      scaleManager.refresh();
      game.events.emit('game-resize-settled', scaleManager.gameSize);
    }, RESIZE_DEBOUNCE_MS);
  }, { passive: true });

  // iOS Safari address bar collapsing fires visualViewport resize, not
  // window resize, in some versions — cover that too.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => scaleManager.refresh(), RESIZE_DEBOUNCE_MS);
    }, { passive: true });
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#000000',

  // Tier 0 only — the boot chain, menu/auth flow and persistent overlays.
  // Everything else is added at runtime via SceneLoader.ensure().
  scene: [
    BootScene,
    PreloaderScene,
    MenuScene,
    SettingsScene,
    EnterScene,
    PlayerHudScene,
    UIScene,
    NewsHud,
    LoadingOverlayScene
  ],

  dom: {
    createContainer: true
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true
  },

  audio: {
    disableWebAudio: false
  }
};

window.game = new Phaser.Game(config);
window.game.sceneLoader = new SceneLoader(window.game, sceneRegistry);
window.game.buildVersion = BUILD_VERSION;

installResizeDebounce(window.game);

// Once the player is past login/character creation, warm the cache for the
// core office/city loop in the background so the first this.goto('OfficeScene')
// call resolves instantly instead of showing the loading overlay.
window.game.events.once('player-authenticated', () => {
  window.game.sceneLoader.prefetchTier('TIER_1');
});

// Similarly, once a case reaches the crime-scene stage, warm up the CSI lab
// bundle while the player is still doing hidden-objects, not when they walk
// into the lab door.
window.game.events.once('case-crime-scene-entered', () => {
  window.game.sceneLoader.prefetchTier('TIER_3');
});