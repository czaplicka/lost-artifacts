import {
  loadGameState
} from '../gameStatePersistence.js';

import {
  MobileFullscreen
} from '../mobileFullscreen.js';

import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

import {
  loadSplitManifest
} from '../managers/ManifestLoader.js';

const FONT_LOAD_TIMEOUT_MS = 3000;
const STARTUP_FONTS = ['PressStart2P', 'SpecialElite'];

const STUDIO_FADE_IN_MS = 800;
const STUDIO_HOLD_MS = 1500;
const STUDIO_FADE_OUT_MS = 650;

export class BootScene extends BaseScene {
  constructor() {
    super({ key: 'BootScene' });

    this.fontTimeout = null;
    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;
    this.manifestAbort = null;
    this.bootToken = null;
    this.bootErrorText = null;

    this.studioRoot = null;
    this.studioTitle = null;
    this.studioSubtitle = null;
    this.studioTween = null;
    this.studioTimer = null;
    this.studioStarted = false;

    this.boundCleanupScene =
      this.cleanupScene.bind(this);

    this.boundStudioResize =
      this.resizeStudioCard.bind(this);
  }

  preload() {
    this.cameras.main.setBackgroundColor('#000000');

    this.load.audio(
      'themeMusic',
      './assets/audio/theme.mp3'
    );

    this.load.image(
      'cozyBackground',
      'assets/local/kitchen.webp'
    );

    this.cache.json.remove('assetManifestIndex');

    this.load.json(
      'assetManifestIndex',
      'assets/manifests/index.json'
    );
  }

  async create() {
    super.create();

    this._clearFontTimeout();
    this.clearStudioCard();

    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;
    this.bootErrorText = null;
    this.studioStarted = false;

    this.cameras.main.setBackgroundColor('#000000');

    this.manifestAbort?.abort();
    this.manifestAbort = new AbortController();

    const token = Symbol('boot-run');
    this.bootToken = token;

    this.events.off(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.off(
      'destroy',
      this.boundCleanupScene
    );

    this.events.once(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.once(
      'destroy',
      this.boundCleanupScene
    );

    EventBus.emit('hideHUD');

    try {
      const index = this.cache.json.get(
        'assetManifestIndex'
      );

      if (!index) {
        throw new Error(
          'Missing assets/manifests/index.json. ' +
          'Run node tools/split-manifest.cjs.'
        );
      }

      const manifest = await loadSplitManifest(
        index,
        this.manifestAbort.signal
      );

      if (
        this.bootToken !== token ||
        this._cleanupDone
      ) {
        return;
      }

      this.cache.json.remove('assetManifest');
      this.cache.json.add(
        'assetManifest',
        manifest
      );

      if (this.game.assets) {
        this.game.assets._catalog = null;
      }

      this.manifestAbort = null;

      this._initializeGameState();
      this._initializeMobileFullscreen();
      this._initializeDifficulty();
      this._loadLocalFonts();
    } catch (error) {
      if (
        this.bootToken !== token ||
        this._cleanupDone ||
        error.name === 'AbortError'
      ) {
        return;
      }

      this.manifestAbort?.abort();
      this.manifestAbort = null;

      console.error(
        '[BootScene] Manifest initialization failed:',
        error
      );

      this.cameras.main.setBackgroundColor(
        '#101010'
      );

      this.bootErrorText = this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        `CASE FILE ERROR\n\n${error.message}\n\n` +
        'Check the manifests and reload.',
        {
          fontFamily: 'monospace',
          fontSize: '20px',
          color: '#ffb4a2',
          align: 'center',
          wordWrap: {
            width: Math.max(
              200,
              this.scale.width - 80
            )
          }
        }
      ).setOrigin(0.5);
    }
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

      this.registry.set(
        'gameStateFailed',
        true
      );
    }
  }

  _initializeMobileFullscreen() {
    if (this.registry.has('mobileFS')) {
      return;
    }

    try {
      this.registry.set(
        'mobileFS',
        new MobileFullscreen()
      );
    } catch (error) {
      console.warn(
        '[BootScene] MobileFullscreen initialization failed:',
        error
      );
    }
  }

  _initializeDifficulty() {
    if (!this.registry.has('difficulty')) {
      this.registry.set(
        'difficulty',
        'field'
      );
    }
  }

  _loadLocalFonts() {
    if (
      this.fontLoadAttempted ||
      this._cleanupDone
    ) {
      return;
    }

    this.fontLoadAttempted = true;

    if (
      !document.fonts ||
      typeof document.fonts.load !== 'function'
    ) {
      this.showStudioCard();
      return;
    }

    const token = Symbol('boot-font-load');
    this.fontLoadToken = token;

    const isCurrent = () => (
      this.fontLoadToken === token &&
      !this._cleanupDone &&
      !this.isProceedingToPreloader
    );

    const finish = () => {
      if (!isCurrent()) return;

      this.fontLoadToken = null;
      this._clearFontTimeout();
      this.showStudioCard();
    };

    this.fontTimeout = window.setTimeout(
      () => {
        if (!isCurrent()) return;

        console.warn(
          '[BootScene] Font loading timed out. Continuing.'
        );

        finish();
      },
      FONT_LOAD_TIMEOUT_MS
    );

    const requests = STARTUP_FONTS.map(
      async family => {
        const faces = await document.fonts.load(
          `400 16px "${family}"`,
          'Czaplicki Industries presents'
        );

        if (
          !faces.length ||
          faces.some(
            face => face.status !== 'loaded'
          )
        ) {
          throw new Error(
            `Font ${family} unavailable.`
          );
        }

        return family;
      }
    );

    Promise.allSettled(requests)
      .then(results => {
        if (!isCurrent()) return;

        results.forEach(
          (result, index) => {
            if (
              result.status === 'rejected'
            ) {
              console.warn(
                `[BootScene] Font ${STARTUP_FONTS[index]}:`,
                result.reason
              );
            }
          }
        );

        finish();
      })
      .catch(error => {
        if (!isCurrent()) return;

        console.warn(
          '[BootScene] Font loading failed:',
          error
        );

        finish();
      });
  }

  showStudioCard() {
    if (
      this._cleanupDone ||
      this.studioStarted ||
      this.isProceedingToPreloader
    ) {
      return;
    }

    this.studioStarted = true;

    const token = this.bootToken;

    this.cameras.main.setBackgroundColor(
      '#000000'
    );

    this.studioRoot = this.add.container(
      this.scale.width / 2,
      this.scale.height / 2
    )
      .setDepth(10000)
      .setAlpha(0);

    this.studioTitle = this.add.text(
      0,
      -32,
      'Czaplicki Industries',
      {
        fontFamily: '"PressStart2P", monospace',
        fontSize: '38px',
        color: '#f4ebd9',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.studioSubtitle = this.add.text(
      0,
      48,
      'present',
      {
        fontFamily: '"SpecialElite", monospace',
        fontSize: '30px',
        color: '#c9aa70',
        align: 'center'
      }
    ).setOrigin(0.5);

    this.studioRoot.add([
      this.studioTitle,
      this.studioSubtitle
    ]);

    this.scale.off(
      'resize',
      this.boundStudioResize
    );

    this.scale.on(
      'resize',
      this.boundStudioResize
    );

    this.resizeStudioCard();

    this.studioTween = this.tweens.add({
      targets: this.studioRoot,
      alpha: 1,
      duration: STUDIO_FADE_IN_MS,
      ease: 'Sine.Out',

      onComplete: () => {
        this.studioTween = null;

        if (
          this.bootToken !== token ||
          this._cleanupDone
        ) {
          return;
        }

        this.studioTimer = this.time.delayedCall(
          STUDIO_HOLD_MS,
          () => {
            this.studioTimer = null;
            this.hideStudioCard(token);
          }
        );
      }
    });
  }

  resizeStudioCard() {
    if (!this.studioRoot?.scene) {
      return;
    }

    const { width, height } = this.scale;

    this.studioRoot.setPosition(
      width / 2,
      height / 2
    );

    this.studioRoot.setScale(1);

    const contentWidth = Math.max(
      this.studioTitle?.width || 0,
      this.studioSubtitle?.width || 0,
      1
    );

    const availableWidth = Math.max(
      1,
      width - 48
    );

    const availableHeight = Math.max(
      1,
      height - 48
    );

    this.studioRoot.setScale(
      Math.min(
        1,
        availableWidth / contentWidth,
        availableHeight / 160
      )
    );
  }

  hideStudioCard(token) {
    if (
      this.bootToken !== token ||
      this._cleanupDone ||
      !this.studioRoot?.scene
    ) {
      return;
    }

    this.studioTween = this.tweens.add({
      targets: this.studioRoot,
      alpha: 0,
      duration: STUDIO_FADE_OUT_MS,
      ease: 'Sine.In',

      onComplete: () => {
        this.studioTween = null;

        if (
          this.bootToken !== token ||
          this._cleanupDone
        ) {
          return;
        }

        this.clearStudioCard();
        this._proceedToPreloader();
      }
    });
  }

  clearStudioCard() {
    this.scale.off(
      'resize',
      this.boundStudioResize
    );

    this.studioTimer?.remove(false);
    this.studioTimer = null;

    this.studioTween?.stop();
    this.studioTween = null;

    if (this.studioRoot) {
      this.tweens.killTweensOf(
        this.studioRoot
      );

      this.studioRoot.destroy(true);
    }

    this.studioRoot = null;
    this.studioTitle = null;
    this.studioSubtitle = null;
  }

  _clearFontTimeout() {
    if (this.fontTimeout !== null) {
      window.clearTimeout(
        this.fontTimeout
      );

      this.fontTimeout = null;
    }
  }

  _proceedToPreloader() {
    if (
      this._cleanupDone ||
      this.isProceedingToPreloader
    ) {
      return;
    }

    if (!this.hasScene('PreloaderScene')) {
      console.error(
        '[BootScene] PreloaderScene is not registered.'
      );

      return;
    }

    this.isProceedingToPreloader = true;

    void this.goto('PreloaderScene')
      .then(started => {
        if (
          !started &&
          !this._cleanupDone
        ) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Could not start PreloaderScene.'
          );
        }
      })
      .catch(error => {
        if (!this._cleanupDone) {
          this.isProceedingToPreloader = false;

          console.error(
            '[BootScene] Transition failed:',
            error
          );
        }
      });
  }

  cleanupScene() {
    this.bootToken = null;

    this.manifestAbort?.abort();
    this.manifestAbort = null;

    this.fontLoadToken = null;

    this._clearFontTimeout();
    this.clearStudioCard();

    this.isProceedingToPreloader = false;

    this.events.off(
      'shutdown',
      this.boundCleanupScene
    );

    this.events.off(
      'destroy',
      this.boundCleanupScene
    );
  }
}