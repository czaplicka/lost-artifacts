import {
  tierOf,
  SCENE_TIERS,
  sceneRegistry as defaultRegistry
} from './sceneRegistry.js';

const MIN_SPINNER_DELAY_MS = 150;
const OVERLAY_KEY = 'LoadingOverlayScene';
const BACKGROUND_CONCURRENCY = 2;
const IDLE_TIMEOUT_MS = 1500;
const FALLBACK_DELAY_MS = 100;

export class SceneLoader {
  constructor(game, registry = defaultRegistry) {
    this.game = game;
    this.registry = registry;
    this._pending = new Map();
    this._tasks = new Map();
    this._backgroundQueue = new Map();
    this._backgroundActive = 0;
    this._foregroundActive = 0;
    this._prefetched = new Set();
    this._idleHandle = null;
    this._fallbackTimer = null;
    this._spinnerTimers = new Set();
    this._spinnerRequests = new Set();
    this._overlayOwned = false;
    this._destroyed = false;
    this._investigationPrefetchRequested = false;
    this._crimePrefetchRequested = false;
    this._tierRequests = new Map();
    this._boundDestroy = () => this.destroy();
    this.game.events?.once('destroy', this._boundDestroy);
  }

  has(key) {
    return Boolean(!this._destroyed && this.game?.scene?.keys?.[key]);
  }

  get(key) {
    return this.has(key) ? this.game.scene.getScene(key) : null;
  }

  ensure(key) {
    if (this._destroyed) {
      return Promise.reject(new Error('[SceneLoader] Loader has been destroyed.'));
    }
    if (this.has(key)) return Promise.resolve(this.get(key));
    const existing = this._tasks.get(key);
    if (existing) {
      if (!existing.started) {
        this._backgroundQueue.delete(key);
        this._startTask(existing, false);
      } else if (existing.background && !existing.promoted) {
        existing.promoted = true;
        this._foregroundActive += 1;
      }
      return existing.promise;
    }
    const task = this._createTask(key);
    if (!task) return Promise.reject(this._unknownSceneError(key));
    this._startTask(task, false);
    return task.promise;
  }

  _unknownSceneError(key) {
    return new Error(
      `[SceneLoader] Unknown scene key "${key}". Add it to sceneRegistry.js.`
    );
  }

  _createTask(key) {
    const loader = this.registry[key];
    if (typeof loader !== 'function') return null;
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const task = {
      key, loader, promise, resolve, reject,
      started: false, background: false, promoted: false, settled: false
    };
    this._tasks.set(key, task);
    this._pending.set(key, promise);
    return task;
  }

  _startTask(task, background) {
    if (this._destroyed || task.started || task.settled) return;
    task.started = true;
    task.background = background;
    if (background) this._backgroundActive += 1;
    else this._foregroundActive += 1;
    Promise.resolve()
      .then(() => {
        if (this._destroyed) {
          throw new Error('[SceneLoader] Loading cancelled: game was destroyed.');
        }
        return task.loader();
      })
      .then(SceneClass => {
        if (this._destroyed) {
          throw new Error('[SceneLoader] Registration cancelled: game was destroyed.');
        }
        if (typeof SceneClass !== 'function') {
          throw new Error(`[SceneLoader] Loader for "${task.key}" did not return a scene class.`);
        }
        if (!this.has(task.key)) {
          this.game.scene.add(task.key, SceneClass, false);
        }
        this._prefetched.add(task.key);
        this._finishTask(task, null, this.get(task.key));
      })
      .catch(error => {
        this._prefetched.delete(task.key);
        this._finishTask(task, error);
      });
  }

  _finishTask(task, error = null, scene = null) {
    if (task.settled) return;
    task.settled = true;
    if (task.started) {
      if (task.background) {
        this._backgroundActive = Math.max(0, this._backgroundActive - 1);
      } else {
        this._foregroundActive = Math.max(0, this._foregroundActive - 1);
      }
      if (task.promoted) {
        this._foregroundActive = Math.max(0, this._foregroundActive - 1);
      }
    }
    if (this._tasks.get(task.key) === task) {
      this._tasks.delete(task.key);
      this._pending.delete(task.key);
      this._backgroundQueue.delete(task.key);
    }
    if (error) task.reject(error);
    else task.resolve(scene);
    this._scheduleBackground();
  }

  _scheduleBackground() {
    if (
      this._destroyed || this._backgroundQueue.size === 0 ||
      this._foregroundActive > 0 ||
      this._backgroundActive >= BACKGROUND_CONCURRENCY ||
      this._idleHandle !== null || this._fallbackTimer !== null
    ) return;
    if (typeof window.requestIdleCallback === 'function') {
      this._idleHandle = window.requestIdleCallback(() => {
        this._idleHandle = null;
        this._drainBackground();
      }, { timeout: IDLE_TIMEOUT_MS });
    } else {
      this._fallbackTimer = window.setTimeout(() => {
        this._fallbackTimer = null;
        this._drainBackground();
      }, FALLBACK_DELAY_MS);
    }
  }

  _drainBackground() {
    if (this._destroyed || this._foregroundActive > 0) return;
    while (
      this._backgroundActive < BACKGROUND_CONCURRENCY &&
      this._foregroundActive === 0 && this._backgroundQueue.size > 0
    ) {
      const [key, task] = this._backgroundQueue.entries().next().value;
      this._backgroundQueue.delete(key);
      if (task.settled || task.started) continue;
      if (this.has(key)) {
        this._prefetched.add(key);
        this._finishTask(task, null, this.get(key));
        continue;
      }
      this._startTask(task, true);
    }
  }

  prefetch(key) {
    if (this._destroyed) return Promise.resolve(null);
    if (this.has(key)) return Promise.resolve(this.get(key));
    let task = this._tasks.get(key);
    if (!task) {
      task = this._createTask(key);
      if (!task) {
        console.warn(this._unknownSceneError(key).message);
        return Promise.resolve(null);
      }
      this._backgroundQueue.set(key, task);
      this._scheduleBackground();
    }
    return task.promise.catch(error => {
      if (!this._destroyed) {
        console.warn(`[SceneLoader] Prefetch failed for "${key}".`, error);
      }
      return null;
    });
  }

  prefetchTier(tierName) {
    const keys = SCENE_TIERS[tierName];
    if (!keys) {
      console.warn(`[SceneLoader] Unknown tier "${tierName}".`);
      return Promise.resolve([]);
    }
    if (!this._destroyed) {
      this._tierRequests.set(tierName, (this._tierRequests.get(tierName) || 0) + 1);
    }
    return Promise.all(keys.map(key => this.prefetch(key)));
  }

  prefetchNextTier(key) {
    const tiers = Object.keys(SCENE_TIERS);
    const index = tiers.indexOf(tierOf(key));
    if (index === -1 || index + 1 >= tiers.length) return Promise.resolve([]);
    return this.prefetchTier(tiers[index + 1]);
  }

  _notifyPlayerEntry(fromScene, key) {
    if (fromScene?.sys?.settings?.key !== 'EnterScene') return;
    if (!['IntroScene', 'OfficeScene', 'HotelScene'].includes(key)) return;
    this.game.events.emit('player-entry-started', { destination: key });
  }

  _prefetchForDestination(key) {
    if (key !== 'CrimeCityScene' && key !== 'HiddenObjectsScene') return;

    // TIER_3 gets queued first: crime-scene and lab modules are needed next.
    if (!this._crimePrefetchRequested) {
      this._crimePrefetchRequested = true;
      this.game.events.emit('case-crime-scene-entered', { destination: key });
    }

    if (!this._investigationPrefetchRequested) {
      this._investigationPrefetchRequested = true;
      void this.prefetchTier('TIER_2');
    }
  }

  _beginSpinner() {
    const token = {};
    let shown = false;
    let finished = false;
    const timer = window.setTimeout(() => {
      this._spinnerTimers.delete(timer);
      if (finished || this._destroyed || !this.has(OVERLAY_KEY)) return;
      shown = true;
      this._spinnerRequests.add(token);
      const manager = this.game.scene;
      if (!manager.isActive(OVERLAY_KEY)) {
        this._overlayOwned = true;
        manager.run(OVERLAY_KEY);
      }
    }, MIN_SPINNER_DELAY_MS);
    this._spinnerTimers.add(timer);
    return () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      this._spinnerTimers.delete(timer);
      if (shown) this._spinnerRequests.delete(token);
      if (!this._destroyed && this._spinnerRequests.size === 0 && this._overlayOwned) {
        this._overlayOwned = false;
        if (this.has(OVERLAY_KEY)) this.game.scene.stop(OVERLAY_KEY);
      }
    };
  }

  async goto(fromScene, key, data = {}, { stopFrom = true } = {}) {
    if (this._destroyed) return false;
    const stopSpinner = this._beginSpinner();
    try {
      // ensure() establishes foreground priority before queuing background work.
      const loading = this.ensure(key);
      this._notifyPlayerEntry(fromScene, key);
      await loading;
    } catch (error) {
      console.error(`[SceneLoader] Failed to load "${key}".`, error);
      throw error;
    } finally {
      stopSpinner();
    }
    if (this._destroyed) return false;
    if (stopFrom && !fromScene?.sys?.isActive?.()) {
      console.warn('[SceneLoader] Navigation cancelled: source scene is inactive.');
      return false;
    }
    if (stopFrom) fromScene.scene.start(key, data);
    else this.game.scene.start(key, data);
    this._prefetchForDestination(key);
    return true;
  }

  async launch(fromScene, key, data = {}) {
    if (this._destroyed) return false;
    await this.ensure(key);
    if (this._destroyed || !fromScene?.sys?.isActive?.()) {
      console.warn('[SceneLoader] Overlay launch cancelled: source scene is inactive.');
      return false;
    }
    fromScene.scene.launch(key, data);
    this._prefetchForDestination(key);
    return true;
  }

  debugStatus() {
    return {
      backgroundLimit: BACKGROUND_CONCURRENCY,
      backgroundActive: this._backgroundActive,
      foregroundActive: this._foregroundActive,
      queued: [...this._backgroundQueue.keys()],
      pending: [...this._pending.keys()],
      prefetched: [...this._prefetched],
      tierRequests: Object.fromEntries(this._tierRequests),
      destroyed: this._destroyed
    };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._idleHandle !== null) {
      window.cancelIdleCallback?.(this._idleHandle);
      this._idleHandle = null;
    }
    if (this._fallbackTimer !== null) {
      window.clearTimeout(this._fallbackTimer);
      this._fallbackTimer = null;
    }
    for (const timer of this._spinnerTimers) window.clearTimeout(timer);
    this._spinnerTimers.clear();
    this._spinnerRequests.clear();
    if (this._overlayOwned && this.game?.scene?.keys?.[OVERLAY_KEY]) {
      try { this.game.scene.stop(OVERLAY_KEY); } catch {}
    }
    this._overlayOwned = false;
    const error = new Error('[SceneLoader] Loader was destroyed.');
    for (const task of [...this._tasks.values()]) this._finishTask(task, error);
    this._backgroundQueue.clear();
    this._pending.clear();
    this._tasks.clear();
    this._prefetched.clear();
    this._tierRequests.clear();
    this.game.events?.off('destroy', this._boundDestroy);
  }
}
