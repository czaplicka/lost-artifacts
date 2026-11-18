import { audioManager } from '../managers/AudioManager.js';

const KEY = 'sfx_weather_rain_thunder';
const URL = 'assets/audio/rain-and-thunder.mp3';
const GAIN = 0.3;

const controllers = new WeakMap();
const games = new WeakMap();

function gameStateFor(game) {
  let state = games.get(game);

  if (!state) {
    state = {
      owner: null,
      pending: null,
      retryAt: 0
    };

    games.set(game, state);
  }

  return state;
}

function requestAudio(scene, state) {
  if (
    scene.cache.audio.exists(KEY) ||
    state.pending ||
    Date.now() < state.retryAt
  ) {
    return;
  }

  const loader = scene.load;

  if (!loader) return;

  const completeEvent = `filecomplete-audio-${KEY}`;
  const request = {};

  state.pending = request;

  const cleanup = () => {
    loader.off(completeEvent, complete);
    loader.off('loaderror', failed);

    scene.events.off('shutdown', cleanup);
    scene.events.off('destroy', cleanup);

    if (state.pending === request) {
      state.pending = null;
    }
  };

  const complete = () => {
    cleanup();
  };

  const failed = file => {
    if (file?.key !== KEY) return;

    state.retryAt = Date.now() + 10000;
    cleanup();

    console.warn(
      '[RainThunderAudio] Could not load:',
      URL
    );
  };

  loader.once(completeEvent, complete);
  loader.on('loaderror', failed);

  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);

  try {
    loader.audio(KEY, URL);

    if (!loader.isLoading()) {
      loader.start();
    }
  } catch (error) {
    state.retryAt = Date.now() + 10000;
    cleanup();

    console.warn(
      '[RainThunderAudio] Loader unavailable:',
      error
    );
  }
}

function visible(object) {
  if (
    !object ||
    object.active === false ||
    object.visible === false ||
    object.alpha === 0
  ) {
    return false;
  }

  let parent = object.parentContainer;

  while (parent) {
    if (
      parent.active === false ||
      parent.visible === false ||
      parent.alpha === 0
    ) {
      return false;
    }

    parent = parent.parentContainer;
  }

  return true;
}

class RainThunderAudio {
  constructor(scene) {
    this.scene = scene;
    this.state = gameStateFor(scene.game);

    this.sound = null;
    this.destroyed = false;
    this.blocked = false;

    this.check = this.check.bind(this);
    this.suspend = this.suspend.bind(this);
    this.resume = this.resume.bind(this);
    this.destroy = this.destroy.bind(this);

    scene.events.on('postupdate', this.check);

    scene.events.on('sleep', this.suspend);
    scene.events.on('pause', this.suspend);

    scene.events.on('wake', this.resume);
    scene.events.on('resume', this.resume);

    scene.events.once('shutdown', this.destroy);
    scene.events.once('destroy', this.destroy);
  }

  wantsRain() {
    const scene = this.scene;

    if (
      this.destroyed ||
      this.blocked ||
      scene._cleanupDone ||
      !scene.sys.isActive() ||
      scene.sys.isVisible?.() === false ||
      scene.isLeaving ||
      scene.navigating ||
      scene.isReturning
    ) {
      return false;
    }

    const weather = scene.cityWeatherManager;

    if (
      weather &&
      !weather.destroyed &&
      weather.visualRecord?.type === 'rain' &&
      visible(weather.root) &&
      weather.visibility > 0.01
    ) {
      return true;
    }

    if (scene.sys.settings.key === 'DriveScene') {
      return (
        scene.ready === true &&
        scene.weather === 'rain' &&
        (
          scene.state === 'driving' ||
          scene.state === 'arriving'
        )
      );
    }

    return (
      Array.isArray(scene.effectObjects) &&
      scene.effectObjects.some(object => (
        visible(object) &&
        object.texture?.key === 'travel-rain-drop'
      ))
    );
  }

  check() {
    if (!this.wantsRain()) {
      this.stop();
      return;
    }

    const owner = this.state.owner;

    if (owner && owner !== this) {
      if (owner.wantsRain()) return;

      owner.stop();
    }

    if (
      this.sound?.manager &&
      !this.sound.pendingRemove &&
      this.sound.isPlaying
    ) {
      return;
    }

    this.stop();

    const scene = this.scene;

    if (!scene.cache.audio.exists(KEY)) {
      requestAudio(scene, this.state);
      return;
    }

    if (
      scene.game.sound?.locked ||
      Date.now() < this.state.retryAt
    ) {
      return;
    }

    try {
      audioManager.init(scene);

      const sound = audioManager.playAmbient(KEY, {
        loop: true,
        gain: GAIN,
        volume: audioManager.getSfxVolume() * GAIN
      });

      if (!sound) {
        this.state.retryAt = Date.now() + 1000;
        return;
      }

      this.sound = sound;
      this.state.owner = this;

      sound.once('destroy', () => {
        if (this.sound !== sound) return;

        this.sound = null;

        if (this.state.owner === this) {
          this.state.owner = null;
        }
      });
    } catch (error) {
      this.state.retryAt = Date.now() + 1000;

      console.debug(
        '[RainThunderAudio] Playback unavailable:',
        error
      );
    }
  }

  stop() {
    const sound = this.sound;

    this.sound = null;

    if (this.state.owner === this) {
      this.state.owner = null;
    }

    if (sound) {
      try {
        audioManager.releaseSound(sound);
      } catch (error) {
        console.debug(
          '[RainThunderAudio] Cleanup failed:',
          error
        );
      }
    }
  }

  suspend() {
    this.blocked = true;
    this.stop();
  }

  resume() {
    this.blocked = false;
    this.check();
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.stop();

    const events = this.scene.events;

    events.off('postupdate', this.check);

    events.off('sleep', this.suspend);
    events.off('pause', this.suspend);

    events.off('wake', this.resume);
    events.off('resume', this.resume);

    events.off('shutdown', this.destroy);
    events.off('destroy', this.destroy);

    if (controllers.get(this.scene) === this) {
      controllers.delete(this.scene);
    }
  }
}

export function installRainThunderAudio(scene) {
  if (
    !scene?.game ||
    !scene.events ||
    !scene.cache?.audio
  ) {
    return null;
  }

  let controller = controllers.get(scene);

  if (!controller) {
    controller = new RainThunderAudio(scene);
    controllers.set(scene, controller);
  }

  return controller;
}

export function uninstallRainThunderAudio(scene) {
  controllers.get(scene)?.destroy();
}