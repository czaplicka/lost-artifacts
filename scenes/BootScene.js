import { loadGameState } from '../gameStatePersistence.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

const FONT_LOAD_TIMEOUT_MS = 3000;

const STARTUP_FONTS = [
  'PressStart2P',
  'SpecialElite'
];

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });

    this.fontTimeout = null;
    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;

    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  preload() {
    this.load.audio(
      'themeMusic',
      './assets/audio/theme.mp3'
    );

    this.load.image(
      'cozyBackground',
      'assets/local/kitchen.jpg'
    );

    this.load.json(
      'assetManifest',
      'assets/data/assetManifest.json'
    );
  }

  create() {
    super.create();

    this._clearFontTimeout();

    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;

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
    this._loadLocalFonts();
  }

  _initializeGameState() {
    try {
      loadGameState();
      this.registry.remove('gameStateFailed');
    } catch (error) {
      console.error(
        '[BootScene] loadGameState failed:',
        error
      );

      console.warn(
        '[BootScene] Continuing after game state loading failed.'
      );

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

  _loadLocalFonts() {
    if (this.fontLoadAttempted || this._cleanupDone) {
      return;
    }

    this.fontLoadAttempted = true;

    if (
      !document.fonts ||
      typeof document.fonts.load !== 'function'
    ) {
      console.warn(
        '[BootScene] Font Loading API is unavailable. ' +
        'Continuing with fallback fonts.'
      );

      this._proceedToPreloader();
      return;
    }

    const token = Symbol('boot-font-load');
    this.fontLoadToken = token;

    const isCurrentAttempt = () => {
      return (
        this.fontLoadToken === token &&
        !this._cleanupDone &&
        !this.isProceedingToPreloader
      );
    };

    const finish = () => {
      if (!isCurrentAttempt()) {
        return;
      }

      this.fontLoadToken = null;
      this._clearFontTimeout();
      this._proceedToPreloader();
    };

    this.fontTimeout = window.setTimeout(() => {
      if (!isCurrentAttempt()) {
        return;
      }

      console.warn(
        `[BootScene] Font loading exceeded ` +
        `${FONT_LOAD_TIMEOUT_MS} ms. ` +
        'Continuing without waiting any longer.'
      );

      finish();
    }, FONT_LOAD_TIMEOUT_MS);

    const requests = STARTUP_FONTS.map(async (family) => {
      const faces = await document.fonts.load(
        `400 16px "${family}"`,
        'Mark Agency'
      );

      if (faces.length === 0) {
        throw new Error(
          `No matching @font-face found for "${family}".`
        );
      }

      if (faces.some((face) => face.status !== 'loaded')) {
        throw new Error(
          `Font "${family}" did not finish loading.`
        );
      }

      return family;
    });

    Promise.allSettled(requests)
      .then((results) => {
        if (!isCurrentAttempt()) {
          return;
        }

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.warn(
              `[BootScene] Could not load font ` +
              `"${STARTUP_FONTS[index]}":`,
              result.reason
            );
          }
        });

        finish();
      })
      .catch((error) => {
        if (!isCurrentAttempt()) {
          return;
        }

        console.warn(
          '[BootScene] Unexpected font loading error:',
          error
        );

        finish();
      });
  }

  _clearFontTimeout() {
    if (this.fontTimeout !== null) {
      window.clearTimeout(this.fontTimeout);
      this.fontTimeout = null;
    }
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
    this.fontLoadToken = null;
    this._clearFontTimeout();
    this.isProceedingToPreloader = false;
  }
}