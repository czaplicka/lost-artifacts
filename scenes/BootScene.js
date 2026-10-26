import { loadGameState } from '../gameStatePersistence.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { loadSplitManifest } from '../managers/ManifestLoader.js';

const FONT_LOAD_TIMEOUT_MS = 3000;
const STARTUP_FONTS = ['PressStart2P', 'SpecialElite'];

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
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  preload() {
    this.load.audio('themeMusic', './assets/audio/theme.mp3');
    this.load.image('cozyBackground', 'assets/local/kitchen.jpg');
    this.cache.json.remove('assetManifestIndex');
    this.load.json('assetManifestIndex', 'assets/manifests/index.json');
  }

  async create() {
    super.create();
    this._clearFontTimeout();
    this.fontLoadAttempted = false;
    this.isProceedingToPreloader = false;
    this.fontLoadToken = null;
    this.bootErrorText = null;
    this.manifestAbort?.abort();
    this.manifestAbort = new AbortController();
    const token = Symbol('boot-run');
    this.bootToken = token;
    this.events.off('shutdown', this.boundCleanupScene);
    this.events.off('destroy', this.boundCleanupScene);
    this.events.once('shutdown', this.boundCleanupScene);
    this.events.once('destroy', this.boundCleanupScene);
    EventBus.emit('hideHUD');

    try {
      const index = this.cache.json.get('assetManifestIndex');
      if (!index) throw new Error('Missing assets/manifests/index.json. Run node tools/split-manifest.cjs.');
      const manifest = await loadSplitManifest(index, this.manifestAbort.signal);
      if (this.bootToken !== token || this._cleanupDone) return;
      this.cache.json.remove('assetManifest');
      this.cache.json.add('assetManifest', manifest);
      // AssetManager caches its catalog, so discard it after rebuilding the registry.
      if (this.game.assets) this.game.assets._catalog = null;
      this.manifestAbort = null;
      this._initializeGameState();
      this._initializeMobileFullscreen();
      this._initializeDifficulty();
      this._loadLocalFonts();
    } catch (error) {
      if (this.bootToken !== token || this._cleanupDone || error.name === 'AbortError') return;
      this.manifestAbort?.abort();
      this.manifestAbort = null;
      console.error('[BootScene] Manifest initialization failed:', error);
      this.cameras.main.setBackgroundColor('#101010');
      this.bootErrorText = this.add.text(this.scale.width / 2, this.scale.height / 2,
        `CASE FILE ERROR\n\n${error.message}\n\nCheck the manifests and reload.`, {
          fontFamily: 'monospace', fontSize: '20px', color: '#ffb4a2', align: 'center',
          wordWrap: { width: Math.max(200, this.scale.width - 80) }
        }).setOrigin(0.5);
    }
  }

  _initializeGameState() {
    try {
      loadGameState();
      this.registry.remove('gameStateFailed');
    } catch (error) {
      console.error('[BootScene] loadGameState failed:', error);
      this.registry.set('gameStateFailed', true);
    }
  }

  _initializeMobileFullscreen() {
    if (this.registry.has('mobileFS')) return;
    try { this.registry.set('mobileFS', new MobileFullscreen()); }
    catch (error) { console.warn('[BootScene] MobileFullscreen initialization failed:', error); }
  }

  _initializeDifficulty() {
    if (!this.registry.has('difficulty')) this.registry.set('difficulty', 'field');
  }

  _loadLocalFonts() {
    if (this.fontLoadAttempted || this._cleanupDone) return;
    this.fontLoadAttempted = true;
    if (!document.fonts || typeof document.fonts.load !== 'function') {
      this._proceedToPreloader();
      return;
    }
    const token = Symbol('boot-font-load');
    this.fontLoadToken = token;
    const isCurrent = () => this.fontLoadToken === token && !this._cleanupDone && !this.isProceedingToPreloader;
    const finish = () => {
      if (!isCurrent()) return;
      this.fontLoadToken = null;
      this._clearFontTimeout();
      this._proceedToPreloader();
    };
    this.fontTimeout = window.setTimeout(() => {
      if (!isCurrent()) return;
      console.warn('[BootScene] Font loading timed out. Continuing.');
      finish();
    }, FONT_LOAD_TIMEOUT_MS);
    const requests = STARTUP_FONTS.map(async family => {
      const faces = await document.fonts.load(`400 16px "${family}"`, 'Mark Agency');
      if (!faces.length || faces.some(face => face.status !== 'loaded')) {
        throw new Error(`Font ${family} unavailable.`);
      }
      return family;
    });
    Promise.allSettled(requests).then(results => {
      if (!isCurrent()) return;
      results.forEach((result, i) => {
        if (result.status === 'rejected') console.warn(`[BootScene] Font ${STARTUP_FONTS[i]}:`, result.reason);
      });
      finish();
    }).catch(error => {
      if (!isCurrent()) return;
      console.warn('[BootScene] Font loading failed:', error);
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
    if (this._cleanupDone || this.isProceedingToPreloader) return;
    if (!this.hasScene('PreloaderScene')) {
      console.error('[BootScene] PreloaderScene is not registered.');
      return;
    }
    this.isProceedingToPreloader = true;
    void this.goto('PreloaderScene').then(started => {
      if (!started && !this._cleanupDone) {
        this.isProceedingToPreloader = false;
        console.error('[BootScene] Could not start PreloaderScene.');
      }
    }).catch(error => {
      if (!this._cleanupDone) {
        this.isProceedingToPreloader = false;
        console.error('[BootScene] Transition failed:', error);
      }
    });
  }

  cleanupScene() {
    this.bootToken = null;
    this.manifestAbort?.abort();
    this.manifestAbort = null;
    this.fontLoadToken = null;
    this._clearFontTimeout();
    this.isProceedingToPreloader = false;
    this.events.off('shutdown', this.boundCleanupScene);
    this.events.off('destroy', this.boundCleanupScene);
  }
}
