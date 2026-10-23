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
import { GAME_VERSION } from './config/gameVersion.js';
import { RandomEventScene } from './scenes/RandomEventScene.js';
import { RandomEventSystem } from './systems/RandomEventSystem.js';
import { bindCaseTimeGame } from './managers/CaseTimeWatcher.js';

const RESIZE_DEBOUNCE_MS = 120;
function installResizeNotification(game) {
    let timer = null;
    let disposed = false;
    const viewport = window.visualViewport;
    const notifyResizeSettled = () => {
        if (disposed) return;
        if (timer !== null) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            timer = null;
            if (disposed || !game.scale) return;
            game.events.emit('game-resize-settled', game.scale.gameSize);
        }, RESIZE_DEBOUNCE_MS);
    };
    const cleanup = () => {
        if (disposed) return;
        disposed = true;
        if (timer !== null) { window.clearTimeout(timer); timer = null; }
        window.removeEventListener('resize', notifyResizeSettled);
        viewport?.removeEventListener('resize', notifyResizeSettled);
        game.events.off(Phaser.Core.Events.DESTROY, cleanup);
    };
    window.addEventListener('resize', notifyResizeSettled, { passive: true });
    viewport?.addEventListener('resize', notifyResizeSettled, { passive: true });
    game.events.once(Phaser.Core.Events.DESTROY, cleanup);
    return cleanup;
}
function installScenePrefetch(game) {
    const prefetch = tier => {
        if (!game.sceneLoader) return;
        void game.sceneLoader.prefetchTier(tier).catch(error => {
            console.warn(`[main] Could not prefetch "${tier}".`, error);
        });
    };
    const onPlayerAuthenticated = () => prefetch('TIER_1');
    const onCrimeSceneEntered = () => prefetch('TIER_3');
    const cleanup = () => {
        game.events.off('player-authenticated', onPlayerAuthenticated);
        game.events.off('case-crime-scene-entered', onCrimeSceneEntered);
        game.events.off(Phaser.Core.Events.DESTROY, cleanup);
    };
    game.events.once('player-authenticated', onPlayerAuthenticated);
    game.events.once('case-crime-scene-entered', onCrimeSceneEntered);
    game.events.once(Phaser.Core.Events.DESTROY, cleanup);
}
function installDevTools(game) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return;
    import('./tests/BaseSceneLeakTest.js').then(({ installLeakTest }) => {
        installLeakTest(game);
        console.info('[dev] leakTest("SceneKey", { cycles: 10 }) is ready.');
    }).catch(error => console.warn('[dev] Could not load BaseSceneLeakTest.', error));
}
const config = {
    type: Phaser.AUTO, width: 1920, height: 1080,
    parent: 'game-container', backgroundColor: '#000000',
    scene: [BootScene, PreloaderScene, MenuScene, SettingsScene, EnterScene,
        PlayerHudScene, UIScene, NewsHud, LoadingOverlayScene],
    dom: { createContainer: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound: true },
    audio: { disableWebAudio: false }
};
const game = new Phaser.Game(config);
window.game = game;
game.sceneLoader = new SceneLoader(game, sceneRegistry);
game.buildVersion = GAME_VERSION;
bindCaseTimeGame(game);
RandomEventSystem.install(game, RandomEventScene);
installResizeNotification(game);
installScenePrefetch(game);
installDevTools(game);
