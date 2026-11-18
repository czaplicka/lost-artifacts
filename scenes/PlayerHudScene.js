import { EventBus } from '../EventBus.js';
import { PlayerHudScene as PlayerHudBaseScene } from './PlayerHudBaseScene.js';

const HOLLY = 'HollyIntroScene';

const GAMEPLAY_SCENES = new Set([
  'GameScene',
  'OfficeScene',
  'CityScene',
  'CrimeCityScene',
  'LocationScene',
  'HiddenObjectsScene',
  'CrimeLabScene',
  'InventoryScene',
  'HotelScene',
  'ShopScene',
  'ApartmentScene',
]);

export class PlayerHudScene extends PlayerHudBaseScene {
  async _handleFirstForcedSleepStory(payload = {}) {
    const key = payload.sceneKey || HOLLY;

    if (key !== HOLLY) {
      return super._handleFirstForcedSleepStory(payload);
    }

    if (this._cleanupDone || this._sleepStoryInFlight) return;

    const manager = this.game.scene;
    const gameEvents = this.game.events;
    const snapshots = new Map();

    let released = false;
    let hollyEvents = null;

    this._sleepStoryInFlight = true;

    const restoreInput = scene => {
      const snapshot = snapshots.get(scene);
      if (!snapshot) return;

      snapshots.delete(scene);
      scene.events.off('shutdown', snapshot.onShutdown);

      if (scene.input === snapshot.input) {
        snapshot.input.enabled = snapshot.enabled;
      }

      if (
        snapshot.keyboard &&
        scene.input?.keyboard === snapshot.keyboard
      ) {
        snapshot.keyboard.enabled = snapshot.keyboardEnabled;
      }
    };

    const release = () => {
      if (released) return;
      released = true;

      gameEvents.off('prerender', keepHollyOnTop);
      EventBus.off('hollyIntroFinished', onHollyFinished);
      hollyEvents?.off('shutdown', release);
      this.events.off('shutdown', release);

      for (const scene of snapshots.keys()) {
        restoreInput(scene);
      }

      this._sleepStoryInFlight = false;
    };

    const onHollyFinished = result => {
      if (result?.source === 'forced_sleep') release();
    };

    const keepHollyOnTop = () => {
      if (released) return;

      for (const scene of manager.getScenes(true)) {
        if (!GAMEPLAY_SCENES.has(scene.sys.settings.key)) continue;

        const input = scene.input;
        if (!input) continue;

        if (!snapshots.has(scene)) {
          const keyboard = input.keyboard;
          const onShutdown = () => restoreInput(scene);

          snapshots.set(scene, {
            input,
            enabled: input.enabled,
            keyboard,
            keyboardEnabled: keyboard?.enabled,
            onShutdown,
          });

          scene.events.once('shutdown', onShutdown);
        }

        input.enabled = false;
        if (input.keyboard) input.keyboard.enabled = false;
      }

      const holly = manager.keys?.[HOLLY];
      if (!holly?.sys?.isActive()) return;

      if (hollyEvents !== holly.events) {
        hollyEvents?.off('shutdown', release);
        hollyEvents = holly.events;
        hollyEvents.once('shutdown', release);
      }

      const scenes = manager.getScenes(true);
      if (scenes[scenes.length - 1] !== holly) {
        manager.bringToTop(HOLLY);
      }
    };

    this.events.once('shutdown', release);
    EventBus.on('hollyIntroFinished', onHollyFinished);
    gameEvents.on('prerender', keepHollyOnTop);

    try {
      keepHollyOnTop();

      // Nie sprawdzamy hasScene(): loader może dopiero zarejestrować Holly.
      const opened = await this.launchStoryOverlay(HOLLY, {
        ...payload,
        source: 'forced_sleep',
      });

      if (!opened) {
        release();
        console.warn('[PlayerHudScene] Could not open Holly after collapse.');
        return;
      }

      keepHollyOnTop();
    } catch (error) {
      release();
      console.warn('[PlayerHudScene] Failed to open Holly after collapse:', error);
    }
  }
}