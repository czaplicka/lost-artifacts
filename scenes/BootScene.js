import { loadGameState } from '../GameData.js';
import { MobileFullscreen } from '../mobileFullscreen.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';

export class BootScene extends BaseScene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.load.audio('themeMusic', './assets/audio/theme.mp3');
        this.load.image('cozyBackground', 'assets/local/kitchen.jpg');
    }

    create() {
  super.create();
EventBus.emit('hideHUD');
  try {
    loadGameState();
  } catch (error) {
    console.error('[BootScene] loadGameState failed:', error);
  }

  if (!this.registry.has('difficulty')) {
    this.registry.set('difficulty', 'field');
  }

  if (!this.registry.has('mobileFS')) {
    const mobileFS = new MobileFullscreen();
    this.registry.set('mobileFS', mobileFS);
  }

  let hasStartedPreloader = false;

  const startPreloader = () => {
    if (hasStartedPreloader) return;

    hasStartedPreloader = true;

    if (this.scene.manager.keys.PreloaderScene) {
      this.scene.start('PreloaderScene');
      return;
    }

    console.error('[BootScene] PreloaderScene is not registered.');
  };

  if (window.WebFont && typeof window.WebFont.load === 'function') {
    window.WebFont.load({
      google: {
        families: [
          'Special Elite',
          'Press Start 2P'
        ]
      },

      active: () => {
        console.log('[BootScene] Web fonts loaded.');
        startPreloader();
      },

      inactive: () => {
        console.warn(
          '[BootScene] Web fonts failed to load. Continuing with fallback fonts.'
        );

        startPreloader();
      }
    });

    return;
  }

  console.warn(
    '[BootScene] WebFont is unavailable. Continuing with fallback fonts.'
  );

  startPreloader();
}
}