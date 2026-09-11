import { loadGameState } from '../GameStatePersistence.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });

    this.webFontTimeout = null;
    this.webFontAttempted = false;
    this.isProceedingToPreloader = false;

    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  preload() {
    this.load.audio('themeMusic', './assets/audio/theme.mp3');
    this.load.image('cozyBackground', 'assets/local/kitchen.jpg');
    this.load.json(
      'assetManifest',
      'assets/data/assetManifest.json'
    );
  }

  create() {
    super.create();

    this.webFontTimeout = null;
    this.webFontAttempted = false;
    this.isProceedingToPreloader = false;

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    const manifest = this.cache.json.get('assetManifest');

    if (!manifest) {
      console.error(
        '[BootScene] assetManifest.json could not be loaded.'
      );

      return;
    }

    EventBus.emit('hideHUD');

    this._initializeGameState();
    this._initializeMobileFullscreen();
    this._initializeDifficulty();
    this._loadWebFonts();
  }

  _initializeGameState() {
    try {
      loadGameState();
      this.registry.remove('gameStateFailed');
    } catch (error) {
      console.error('[BootScene] loadGameState failed:', error);
      console.warn('[BootScene] Falling back to default game state.');
      this.registry.set('gameStateFailed', true);
    }
  }

  _initializeMobileFullscreen() {
    if (this.registry.has('mobileFS')) {
      return;
    }

    try {
      const mobileFS = new MobileFullscreen();
      this.registry.set('mobileFS', mobileFS);
    } catch (error) {
      console.warn(
        '[BootScene] MobileFullscreen initialization failed:',
        error
      );
    }
  }

  _initializeDifficulty() {
    if (!this.registry.has('difficulty')) {
      this.registry.set('difficulty', 'field');
    }
  }

  _loadWebFonts() {
    if (this.webFontAttempted || this._cleanupDone) {
      return;
    }

    this.webFontAttempted = true;

    if (!window.WebFont || typeof window.WebFont.load !== 'function') {
      console.warn(
        '[BootScene] WebFont is unavailable. Using fallback fonts.'
      );

      this._proceedToPreloader();
      return;
    }

    this.webFontTimeout = this.time.delayedCall(30000, () => {
      this.webFontTimeout = null;

      if (this._cleanupDone || this.isProceedingToPreloader) {
        return;
      }

      console.warn(
        '[BootScene] WebFont loading timed out. Proceeding with fallback fonts.'
      );

      this._proceedToPreloader();
    });

    window.WebFont.load({
      google: {
        families: [
          'SpecialElite',
          'PressStart2P'
        ]
      },

      active: () => {
        this._onWebFontReady();
      },

      inactive: () => {
        console.warn(
          '[BootScene] Web fonts failed to load. Continuing with fallback fonts.'
        );

        this._onWebFontReady();
      }
    });
  }

  _onWebFontReady() {
    if (this._cleanupDone || this.isProceedingToPreloader) {
      return;
    }

    if (this.webFontTimeout) {
      this.webFontTimeout.remove(false);
      this.webFontTimeout = null;
    }

    this._proceedToPreloader();
  }

  _proceedToPreloader() {
    if (this._cleanupDone || this.isProceedingToPreloader) {
      return;
    }

    if (!this.hasScene('PreloaderScene')) {
      console.error(
        '[BootScene] PreloaderScene not registered. Aborting boot.'
      );

      return;
    }

    this.isProceedingToPreloader = true;

    void this.goto('PreloaderScene')
      .then((started) => {
        if (!started && !this._cleanupDone) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Could not start PreloaderScene.'
          );
        }
      })
      .catch((error) => {
        if (!this._cleanupDone) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Transition to PreloaderScene failed:',
            error
          );
        }
      });
  }

  cleanupScene() {
    if (this.webFontTimeout) {
      this.webFontTimeout.remove(false);
      this.webFontTimeout = null;
    }

    this.isProceedingToPreloader = false;
  }
}