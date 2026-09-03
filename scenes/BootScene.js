import { loadGameState } from '../GameStatePersistence.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class BootScene extends BaseScene {
    constructor() {
        super({ key: 'BootScene' });
        this.webFontTimeout = null;
        this.webFontAttempted = false;
    }

    preload() {
       this.load.audio('themeMusic', './assets/audio/theme.mp3');
        this.load.image('cozyBackground', 'assets/local/kitchen.jpg');
        this.load.json('assetManifest', 'assets/data/assetManifest.json');
    }

    create() {
        super.create();
const manifest = this.cache.json.get('assetManifest');

        if (!manifest) {
            console.error('[BootScene] assetManifest.json could not be loaded.');
            return;
        }
        // ✅ Hide HUD using scoped scene event (not global)
        EventBus.emit('hideHUD');

        // ✅ Initialize game state with error recovery
        this._initializeGameState();

        // ✅ Setup mobile fullscreen
        this._initializeMobileFullscreen();

        // ✅ Setup difficulty
        this._initializeDifficulty();

        // ✅ Load web fonts with timeout safety
        this._loadWebFonts();
    }

    /**
     * ✅ Initialize game state with fallback
     */
    _initializeGameState() {
        try {
            loadGameState();
        } catch (error) {
            console.error('[BootScene] loadGameState failed:', error);
            console.warn('[BootScene] Falling back to default game state');
            this.registry.set('gameStateFailed', true);
        }
    }

    /**
     * ✅ Setup mobile fullscreen with cleanup
     */
    _initializeMobileFullscreen() {
        if (this.registry.has('mobileFS')) {
            return;  // Already initialized
        }

        try {
            const mobileFS = new MobileFullscreen();
            this.registry.set('mobileFS', mobileFS);
        } catch (error) {
            console.warn('[BootScene] MobileFullscreen initialization failed:', error);
        }
    }

    /**
     * ✅ Setup difficulty if not exists
     */
    _initializeDifficulty() {
        if (!this.registry.has('difficulty')) {
            this.registry.set('difficulty', 'field');
        }
    }

    /**
     * ✅ Load web fonts with timeout & cleanup
     */
    _loadWebFonts() {
        if (this.webFontAttempted) return;
        this.webFontAttempted = true;

        if (!window.WebFont || typeof window.WebFont.load !== 'function') {
            console.warn('[BootScene] WebFont is unavailable. Using fallback fonts.');
            this._proceedToPreloader();
            return;
        }

        // ✅ Setup timeout safety (30 seconds max wait)
        this.webFontTimeout = this.time.delayedCall(30000, () => {
            console.warn('[BootScene] WebFont loading timed out. Proceeding with fallback fonts.');
            this._proceedToPreloader();
        });

        window.WebFont.load({
            google: {
                families: [
                    'Special Elite',
                    'Press Start 2P'
                ]
            },

            active: () => {
                this._onWebFontReady();
            },

            inactive: () => {
                console.warn('[BootScene] Web fonts failed to load. Continuing with fallback fonts.');
                this._onWebFontReady();
            }
        });
    }

    /**
     * ✅ Web fonts ready (or failed) — proceed to preloader
     */
    _onWebFontReady() {
        // ✅ Cancel timeout if still pending
        if (this.webFontTimeout) {
            this.webFontTimeout.remove();
            this.webFontTimeout = null;
        }

        this._proceedToPreloader();
    }

    /**
     * ✅ Transition to PreloaderScene using goto()
     */
    _proceedToPreloader() {
        if (!this.scene.manager.keys.PreloaderScene) {
            console.error('[BootScene] PreloaderScene not registered. Aborting boot.');
            return;
        }

        // ✅ Use goto() — your custom method
        this.goto('PreloaderScene');
    }

    /**
     * ✅ Cleanup on scene shutdown
     */
    shutdown() {
        if (this.webFontTimeout) {
            this.webFontTimeout.remove();
            this.webFontTimeout = null;
        }
        super.shutdown();
    }
}