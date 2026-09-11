import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../MonologueManager.js';
import { inventoryManager } from '../InventoryManager.js';

export class BaseScene extends Phaser.Scene {
  constructor(config) {
    super(config);

    this.activeTweens = [];
    this.inputEvents = [];
    this._busListeners = [];

    this.sceneEvents = null;

    this._sceneLoaderNavInFlight = false;
    this._overlayLoadsInFlight = new Set();

    this._cleanupDone = false;
    this._sleepCleanupDone = false;
    this._destroyCleanupDone = false;
  }

  create() {
    const wasCleanedUp = this._cleanupDone;

    this._cleanupDone = false;
    this._sleepCleanupDone = false;
    this._destroyCleanupDone = false;
    this._sceneLoaderNavInFlight = false;

    /*
     * Gdy scena została zatrzymana i później uruchomiona ponownie
     * na tej samej instancji, nie chcemy przenosić referencji
     * z poprzedniego cyklu życia sceny.
     */
    if (wasCleanedUp) {
      this.activeTweens = [];
      this.inputEvents = [];
      this._busListeners = [];
    }

    if (!Array.isArray(this.activeTweens)) {
      this.activeTweens = [];
    }

    if (!Array.isArray(this.inputEvents)) {
      this.inputEvents = [];
    }

    if (!Array.isArray(this._busListeners)) {
      this._busListeners = [];
    }

    if (!this._overlayLoadsInFlight) {
      this._overlayLoadsInFlight = new Set();
    }

    if (!this.sceneEvents) {
      this.sceneEvents = new Phaser.Events.EventEmitter();
    }

    if (!this.monologue) {
      const monologues = this.cache.json.get('monologues') ?? {};

      this.monologue = new MonologueManager(this, {
        dialogues: monologues
      });
    }

    /*
     * Usuwamy wyłącznie listenery należące do BaseScene.
     * Chroni to przed ich duplikowaniem przy restartach sceny.
     */
    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.handleSleep,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.handleWake,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.destroyBaseScene,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    /*
     * SLEEP i WAKE mogą wystąpić wielokrotnie
     * dla tej samej instancji sceny.
     */
    this.events.on(
      Phaser.Scenes.Events.SLEEP,
      this.handleSleep,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.handleWake,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.destroyBaseScene,
      this
    );
  }

  // ------------------------------------------------------------------
  // Global EventBus helpers
  // ------------------------------------------------------------------

  onBus(eventName, callback, context = this) {
    if (this._cleanupDone) {
      console.warn(
        `[BaseScene] Ignoring EventBus listener after cleanup in "${this.scene.key}".`
      );

      return null;
    }

    if (!eventName || typeof callback !== 'function') {
      console.warn(
        '[BaseScene] onBus() received invalid listener data.',
        {
          scene: this.scene.key,
          eventName,
          callback
        }
      );

      return null;
    }

    const listenerAlreadyTracked = this._busListeners.some(
      (listener) =>
        listener.eventName === eventName &&
        listener.callback === callback &&
        listener.context === context &&
        listener.once === false
    );

    if (listenerAlreadyTracked) {
      return callback;
    }

    EventBus.on(eventName, callback, context);

    this._busListeners.push({
      eventName,
      callback,
      originalCallback: callback,
      context,
      once: false
    });

    return callback;
  }

  onceBus(eventName, callback, context = this) {
    if (this._cleanupDone) {
      return null;
    }

    if (!eventName || typeof callback !== 'function') {
      console.warn(
        '[BaseScene] onceBus() received invalid listener data.',
        {
          scene: this.scene.key,
          eventName,
          callback
        }
      );

      return null;
    }

    const listenerAlreadyTracked = this._busListeners.some(
      (listener) =>
        listener.eventName === eventName &&
        listener.originalCallback === callback &&
        listener.context === context &&
        listener.once === true
    );

    if (listenerAlreadyTracked) {
      return callback;
    }

    const wrappedCallback = (...args) => {
      this.offBus(eventName, wrappedCallback, context);
      callback.apply(context, args);
    };

    EventBus.on(eventName, wrappedCallback, context);

    this._busListeners.push({
      eventName,
      callback: wrappedCallback,
      originalCallback: callback,
      context,
      once: true
    });

    return callback;
  }

  offBus(eventName, callback, context = this) {
    if (!eventName || typeof callback !== 'function') {
      return false;
    }

    const matchingListeners = this._busListeners.filter(
      (listener) =>
        listener.eventName === eventName &&
        listener.context === context &&
        (
          listener.callback === callback ||
          listener.originalCallback === callback
        )
    );

    matchingListeners.forEach((listener) => {
      EventBus.off(
        listener.eventName,
        listener.callback,
        listener.context
      );
    });

    /*
     * Gdy nie mamy wpisu w registry, mimo wszystko próbujemy
     * odpiąć callback bezpośrednio od EventBus.
     */
    if (!matchingListeners.length) {
      EventBus.off(eventName, callback, context);
    }

    const initialCount = this._busListeners.length;

    this._busListeners = this._busListeners.filter(
      (listener) =>
        !(
          listener.eventName === eventName &&
          listener.context === context &&
          (
            listener.callback === callback ||
            listener.originalCallback === callback
          )
        )
    );

    return this._busListeners.length !== initialCount;
  }

  emitBus(eventName, ...args) {
    if (!eventName) {
      return false;
    }

    EventBus.emit(eventName, ...args);

    return true;
  }

  // ------------------------------------------------------------------
  // Scene-local event helpers
  // ------------------------------------------------------------------

  onSceneEvent(eventName, callback, context = this) {
    if (this._cleanupDone) {
      return null;
    }

    if (!eventName || typeof callback !== 'function') {
      return null;
    }

    this.sceneEvents?.on(eventName, callback, context);

    return callback;
  }

  onceSceneEvent(eventName, callback, context = this) {
    if (this._cleanupDone) {
      return null;
    }

    if (!eventName || typeof callback !== 'function') {
      return null;
    }

    this.sceneEvents?.once(eventName, callback, context);

    return callback;
  }

  offSceneEvent(eventName, callback, context = this) {
    this.sceneEvents?.off(eventName, callback, context);
  }

  emitSceneEvent(eventName, ...args) {
    if (!eventName || this._cleanupDone) {
      return false;
    }

    this.sceneEvents?.emit(eventName, ...args);

    return true;
  }

  // ------------------------------------------------------------------
  // Tween tracking helpers
  // ------------------------------------------------------------------

  isDestroyedTween(tween) {
    return Boolean(
      !tween ||
      tween.isDestroyed ||
      tween.parent === null
    );
  }

  isTweenPlaying(tween) {
    if (this.isDestroyedTween(tween)) {
      return false;
    }

    try {
      if (typeof tween.isPlaying === 'function') {
        return tween.isPlaying();
      }

      return Boolean(tween.isPlaying);
    } catch {
      return false;
    }
  }

  untrackTween(tween) {
    if (!tween || !Array.isArray(this.activeTweens)) {
      return false;
    }

    const previousLength = this.activeTweens.length;

    this.activeTweens = this.activeTweens.filter(
      (trackedTween) => trackedTween !== tween
    );

    return this.activeTweens.length !== previousLength;
  }

  addTrackedTween(tween) {
    if (!tween || this._cleanupDone) {
      return null;
    }

    if (this.activeTweens.includes(tween)) {
      return tween;
    }

    this.activeTweens.push(tween);

    const removeTweenFromTracking = () => {
      this.untrackTween(tween);
    };

    tween.once?.('complete', removeTweenFromTracking);
    tween.once?.('stop', removeTweenFromTracking);
    tween.once?.('remove', removeTweenFromTracking);

    return tween;
  }

  createTrackedTween(config = {}) {
    if (
      this._cleanupDone ||
      !this.tweens ||
      typeof this.tweens.add !== 'function' ||
      !config
    ) {
      return null;
    }

    let tween = null;

    const originalOnComplete = config.onComplete;
    const originalOnStop = config.onStop;
    const originalOnRemove = config.onRemove;

    const removeTweenFromTracking = () => {
      if (tween) {
        this.untrackTween(tween);
      }
    };

    tween = this.tweens.add({
      ...config,

      onComplete: (...args) => {
        removeTweenFromTracking();
        originalOnComplete?.(...args);
      },

      onStop: (...args) => {
        removeTweenFromTracking();
        originalOnStop?.(...args);
      },

      onRemove: (...args) => {
        removeTweenFromTracking();
        originalOnRemove?.(...args);
      }
    });

    return this.addTrackedTween(tween);
  }

  removeTrackedTween(
    tween,
    {
      stop = true,
      remove = true
    } = {}
  ) {
    if (!tween) {
      return false;
    }

    this.untrackTween(tween);

    try {
      if (stop && this.isTweenPlaying(tween)) {
        tween.stop();
      }
    } catch (error) {
      console.warn(
        '[BaseScene] Tracked tween stop failed:',
        error
      );
    }

    try {
      if (remove && !this.isDestroyedTween(tween)) {
        tween.remove?.();
      }
    } catch (error) {
      console.warn(
        '[BaseScene] Tracked tween removal failed:',
        error
      );
    }

    return true;
  }

  cleanupTrackedTweens() {
    if (!Array.isArray(this.activeTweens)) {
      this.activeTweens = [];
      return;
    }

    const tweensToCleanup = [...this.activeTweens];

    this.activeTweens = [];

    tweensToCleanup.forEach((tween) => {
      if (!tween || this.isDestroyedTween(tween)) {
        return;
      }

      try {
        if (this.isTweenPlaying(tween)) {
          tween.stop();
        }
      } catch (error) {
        console.warn(
          '[BaseScene] Tween cleanup stop failed:',
          error
        );
      }

      try {
        tween.remove?.();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween cleanup removal failed:',
          error
        );
      }
    });
  }

  killTrackedTweensOf(target) {
    if (!target) {
      return false;
    }

    const trackedTweens = [...this.activeTweens];

    trackedTweens.forEach((tween) => {
      if (!tween || this.isDestroyedTween(tween)) {
        this.untrackTween(tween);
        return;
      }

      const targets = tween.targets ?? [];

      const hasTarget = Array.isArray(targets)
        ? targets.includes(target)
        : false;

      if (hasTarget) {
        this.removeTrackedTween(tween);
      }
    });

    try {
      this.tweens?.killTweensOf?.(target);
    } catch (error) {
      console.warn(
        '[BaseScene] killTrackedTweensOf() failed:',
        error
      );
    }

    return true;
  }

  // ------------------------------------------------------------------
  // Scene lifecycle cleanup
  // ------------------------------------------------------------------

  handleSleep() {
    if (this._sleepCleanupDone || this._cleanupDone) {
      return;
    }

    this._sleepCleanupDone = true;

    this.activeTweens.forEach((tween) => {
      if (!tween || this.isDestroyedTween(tween)) {
        this.untrackTween(tween);
        return;
      }

      try {
        tween.pause?.();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween sleep pause failed:',
          error
        );
      }
    });

    this._sceneLoaderNavInFlight = false;
  }

  handleWake() {
    if (this._cleanupDone) {
      return;
    }

    this._sleepCleanupDone = false;

    this.activeTweens.forEach((tween) => {
      if (!tween || this.isDestroyedTween(tween)) {
        this.untrackTween(tween);
        return;
      }

      try {
        tween.resume?.();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween wake resume failed:',
          error
        );
      }
    });
  }

  cleanup() {
    if (this._cleanupDone) {
      return;
    }

    this._cleanupDone = true;

    this.cleanupTrackedTweens();

    this.inputEvents.forEach((event) => {
      if (
        !event?.target ||
        !event.name ||
        !event.callback
      ) {
        return;
      }

      try {
        event.target.removeListener(
          event.name,
          event.callback,
          event.context ?? this
        );
      } catch (error) {
        console.warn(
          '[BaseScene] Input listener cleanup failed:',
          error
        );
      }
    });

    this.inputEvents = [];

    this._busListeners.forEach(
      ({ eventName, callback, context }) => {
        try {
          EventBus.off(eventName, callback, context);
        } catch (error) {
          console.warn(
            `[BaseScene] EventBus cleanup failed for "${eventName}":`,
            error
          );
        }
      }
    );

    this._busListeners = [];

    this.sceneEvents?.removeAllListeners();

    this.events.off(
      Phaser.Scenes.Events.SLEEP,
      this.handleSleep,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.handleWake,
      this
    );

    this._sceneLoaderNavInFlight = false;
    this._overlayLoadsInFlight?.clear();
  }

  destroyBaseScene() {
    if (this._destroyCleanupDone) {
      return;
    }

    this._destroyCleanupDone = true;

    this.cleanup();

    if (this.sceneEvents) {
      this.sceneEvents.removeAllListeners();
      this.sceneEvents.destroy();
      this.sceneEvents = null;
    }

    this.monologue?.destroy?.();
    this.monologue = null;
  }

  // ------------------------------------------------------------------
  // Input helpers
  // ------------------------------------------------------------------

  trackInputEvent(
    target,
    eventName,
    callback,
    context = this
  ) {
    if (this._cleanupDone) {
      console.warn(
        `[BaseScene] Ignoring input listener after cleanup in "${this.scene.key}".`
      );

      return null;
    }

    if (
      !target?.on ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      console.warn(
        '[BaseScene] trackInputEvent received invalid event data.',
        {
          scene: this.scene.key,
          target,
          eventName,
          callback
        }
      );

      return null;
    }

    const listenerAlreadyTracked = this.inputEvents.some(
      (listener) =>
        listener.target === target &&
        listener.name === eventName &&
        listener.callback === callback &&
        listener.context === context
    );

    if (listenerAlreadyTracked) {
      return callback;
    }

    target.on(eventName, callback, context);

    this.inputEvents.push({
      target,
      name: eventName,
      callback,
      context
    });

    return callback;
  }

  offTrackedInputEvent(
    target,
    eventName,
    callback,
    context = this
  ) {
    if (
      !target ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return false;
    }

    try {
      target.removeListener?.(
        eventName,
        callback,
        context
      );
    } catch (error) {
      console.warn(
        '[BaseScene] Input listener removal failed:',
        error
      );
    }

    const initialCount = this.inputEvents.length;

    this.inputEvents = this.inputEvents.filter(
      (listener) =>
        !(
          listener.target === target &&
          listener.name === eventName &&
          listener.callback === callback &&
          listener.context === context
        )
    );

    return this.inputEvents.length !== initialCount;
  }

  // ------------------------------------------------------------------
  // Inventory helpers
  // ------------------------------------------------------------------

  addInventoryItem(item) {
    return inventoryManager.addItem(item);
  }

  removeInventoryItem(itemId) {
    return inventoryManager.removeItem(itemId);
  }

  getInventoryItem(itemId) {
    return inventoryManager.getItem(itemId);
  }

  hasInventoryItem(itemId) {
    return inventoryManager.hasItem(itemId);
  }

  openInventory() {
    inventoryManager.open();
  }

  closeInventory() {
    inventoryManager.close();
  }

  getAllInventoryItems() {
    return inventoryManager.getAllItems();
  }

  // ------------------------------------------------------------------
  // Safe Phaser scene helpers
  // ------------------------------------------------------------------

  hasScene(sceneKey) {
    return Boolean(
      sceneKey &&
      this.scene?.manager?.keys?.[sceneKey]
    );
  }

  getRegisteredScene(sceneKey) {
    if (!this.hasScene(sceneKey)) {
      return null;
    }

    return this.scene.manager.keys[sceneKey] || null;
  }

  getSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return null;
    }

    return this.getRegisteredScene(sceneKey);
  }

  isSceneActive(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isActive(sceneKey)
    );
  }

  isSceneSleeping(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isSleeping(sceneKey)
    );
  }

  isScenePaused(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isPaused(sceneKey)
    );
  }

  isSceneRunning(sceneKey) {
    return (
      this.isSceneActive(sceneKey) ||
      this.isSceneSleeping(sceneKey) ||
      this.isScenePaused(sceneKey)
    );
  }

  stopSceneIfActive(sceneKey) {
    if (!this.isSceneRunning(sceneKey)) {
      return false;
    }

    this.scene.stop(sceneKey);

    return true;
  }

  sleepSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return false;
    }

    this.scene.sleep(sceneKey);

    return true;
  }

  pauseSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return false;
    }

    this.scene.pause(sceneKey);

    return true;
  }

  wakeSceneIfSleeping(sceneKey) {
    if (!this.isSceneSleeping(sceneKey)) {
      return false;
    }

    this.scene.wake(sceneKey);

    return true;
  }

  resumeSceneIfPaused(sceneKey) {
    if (!this.isScenePaused(sceneKey)) {
      return false;
    }

    this.scene.resume(sceneKey);

    return true;
  }

  bringSceneToTopIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return false;
    }

    this.scene.bringToTop(sceneKey);

    return true;
  }

  // ------------------------------------------------------------------
  // Player HUD helpers
  // ------------------------------------------------------------------

  getPlayerHudScene() {
    return this.getSceneIfActive('PlayerHudScene');
  }

  sleepPlayerHud() {
    const hud = this.getPlayerHudScene();

    hud?.closeAllUIPanels?.();

    return this.sleepSceneIfActive('PlayerHudScene');
  }

  async ensureOverlayScene(sceneKey, data = {}) {
    if (!sceneKey || this._cleanupDone) {
      return null;
    }

    if (this.isSceneSleeping(sceneKey)) {
      this.scene.wake(sceneKey);
      this.scene.bringToTop(sceneKey);

      return this.getRegisteredScene(sceneKey);
    }

    if (this.isScenePaused(sceneKey)) {
      this.scene.resume(sceneKey);
      this.scene.bringToTop(sceneKey);

      return this.getRegisteredScene(sceneKey);
    }

    if (this.isSceneActive(sceneKey)) {
      this.scene.bringToTop(sceneKey);

      return this.getRegisteredScene(sceneKey);
    }

    const opened = await this.launchOverlay(
      sceneKey,
      data
    );

    if (!opened || this._cleanupDone) {
      return null;
    }

    this.bringSceneToTopIfActive(sceneKey);

    return this.getRegisteredScene(sceneKey);
  }

  async restorePlayerHud(data = {}) {
    const hud = await this.ensureOverlayScene(
      'PlayerHudScene',
      data
    );

    if (!hud || this._cleanupDone) {
      return null;
    }

    hud.refreshNotebook?.();
    hud.refreshUI?.();

    return hud;
  }

  // ------------------------------------------------------------------
  // News HUD helpers
  // ------------------------------------------------------------------

  getNewsHudScene() {
    return this.getSceneIfActive('NewsHud');
  }

  setNewsHudButtonsVisible(visible = true) {
  const newsHud = this.getNewsHudScene();

  if (!newsHud?.events) {
    return false;
  }

  newsHud.events.emit('setButtonsVisible', Boolean(visible));

  return true;
}

  showNewsHudButtons() {
    return this.setNewsHudButtonsVisible(true);
  }

  hideNewsHudButtons() {
    return this.setNewsHudButtonsVisible(false);
  }

  // ------------------------------------------------------------------
  // Lazy scene navigation
  // ------------------------------------------------------------------

  async goto(key, data = {}) {
    if (!key || this._cleanupDone) {
      return false;
    }

    if (this._sceneLoaderNavInFlight) {
      return false;
    }

    this._sceneLoaderNavInFlight = true;

    try {
      if (this.game.sceneLoader) {
        return await this.game.sceneLoader.goto(
          this,
          key,
          data
        );
      }

      if (!this.hasScene(key)) {
        console.error(
          `[BaseScene] Cannot start "${key}". ` +
          'The scene is not registered and SceneLoader is unavailable.'
        );

        return false;
      }

      this.scene.start(key, data);

      return true;
    } catch (error) {
      console.error(
        `[BaseScene] goto("${key}") failed:`,
        error
      );

      return false;
    } finally {
      this._sceneLoaderNavInFlight = false;
    }
  }

  safeDisableInteractive(gameObject) {
    if (!gameObject || gameObject.isDestroyed) {
      return false;
    }

    const objectScene = gameObject.scene;

    if (
      !objectScene ||
      !objectScene.sys ||
      !objectScene.sys.isActive() ||
      !objectScene.sys.input
    ) {
      return false;
    }

    if (!gameObject.input || !gameObject.input.enabled) {
      return false;
    }

    gameObject.disableInteractive?.();

    return true;
  }

  safeSetInteractive(
    gameObject,
    config = { useHandCursor: true }
  ) {
    if (!gameObject || gameObject.isDestroyed) {
      return false;
    }

    const objectScene = gameObject.scene;

    if (
      !objectScene ||
      !objectScene.sys ||
      !objectScene.sys.isActive() ||
      !objectScene.sys.input
    ) {
      return false;
    }

    gameObject.setInteractive?.(config);

    return true;
  }

  async launchOverlay(key, data = {}) {
    if (!key || this._cleanupDone) {
      return false;
    }

    if (!this._overlayLoadsInFlight) {
      this._overlayLoadsInFlight = new Set();
    }

    if (this.isSceneSleeping(key)) {
      this.scene.wake(key);
      this.scene.bringToTop(key);

      return true;
    }

    if (this.isScenePaused(key)) {
      this.scene.resume(key);
      this.scene.bringToTop(key);

      return true;
    }

    if (this.isSceneActive(key)) {
      this.scene.bringToTop(key);

      return true;
    }

    if (this._overlayLoadsInFlight.has(key)) {
      return false;
    }

    this._overlayLoadsInFlight.add(key);

    try {
      if (this.game.sceneLoader) {
        await this.game.sceneLoader.launch(
          this,
          key,
          data
        );
      } else {
        if (!this.hasScene(key)) {
          console.error(
            `[BaseScene] Cannot launch "${key}". ` +
            'The scene is not registered and SceneLoader is unavailable.'
          );

          return false;
        }

        this.scene.launch(key, data);
      }

      return !this._cleanupDone;
    } catch (error) {
      console.error(
        `[BaseScene] launchOverlay("${key}") failed:`,
        error
      );

      return false;
    } finally {
      this._overlayLoadsInFlight.delete(key);
    }
  }

  async toggleOverlay(key, data = {}) {
    if (!key || this._cleanupDone) {
      return 'error';
    }

    if (this.isSceneActive(key)) {
      this.scene.stop(key);

      return 'closed';
    }

    if (this._overlayLoadsInFlight?.has(key)) {
      return 'loading';
    }

    const launched = await this.launchOverlay(
      key,
      data
    );

    return launched
      ? 'opened'
      : 'error';
  }

  shutdown() {
    this.cleanup();
  }
}