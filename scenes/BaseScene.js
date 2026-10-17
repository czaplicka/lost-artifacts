import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../managers/MonologueManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';

export class BaseScene extends Phaser.Scene {
  constructor(config) {
    super(config);

    this.activeTweens = new Set();
    this._sleepPausedTweens = new Set();
    this._tweenTrackingCallbacks = new Map();

    this.inputEvents = [];
    this.sceneEvents = null;

    this._monologue = null;

    this._sceneLoaderNavInFlight = false;
    this._overlayLoadsInFlight = new Set();

    this._cleanupDone = false;
    this._sleepCleanupDone = false;
    this._destroyCleanupDone = false;
  }

  // ------------------------------------------------------------------
  // Lazy monologue
  // ------------------------------------------------------------------

  get monologue() {
    if (
      this._cleanupDone ||
      this._destroyCleanupDone
    ) {
      return null;
    }

    if (this._monologue?.isDestroyed) {
      this._monologue = null;
    }

    if (!this._monologue) {
      const dialogues =
        this.cache?.json?.get('monologues') ?? {};

      const manager = new MonologueManager(this, {
        dialogues
      });

      if (manager.isDestroyed) {
        return null;
      }

      this._monologue = manager;
    }

    return this._monologue;
  }

  set monologue(value) {
    if (value === this._monologue) {
      return;
    }

    this._monologue?.destroy?.();
    this._monologue = value ?? null;
  }

  // ------------------------------------------------------------------
  // Scene initialization
  // ------------------------------------------------------------------

  create() {
    this._cleanupDone = false;
    this._sleepCleanupDone = false;
    this._destroyCleanupDone = false;

    this._sceneLoaderNavInFlight = false;

    if (!(this.activeTweens instanceof Set)) {
      this.activeTweens = new Set(
        Array.isArray(this.activeTweens)
          ? this.activeTweens
          : []
      );
    }

    this._sleepPausedTweens ??= new Set();
    this._tweenTrackingCallbacks ??= new Map();
    this._overlayLoadsInFlight ??= new Set();

    if (!Array.isArray(this.inputEvents)) {
      this.inputEvents = [];
    }

    if (!this.sceneEvents) {
      this.sceneEvents =
        new Phaser.Events.EventEmitter();
    }

    // EventBus przechowuje jeden rejestr i jedną
    // rejestrację lifecycle dla tej instancji sceny.
    EventBus.bindScene(this);

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
    if (
      this._cleanupDone ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return null;
    }

    EventBus.on(
      eventName,
      callback,
      context,
      this
    );

    return callback;
  }

  onceBus(eventName, callback, context = this) {
    if (
      this._cleanupDone ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return null;
    }

    EventBus.once(
      eventName,
      callback,
      context,
      this
    );

    return callback;
  }

  offBus(eventName, callback, context = this) {
    if (
      !eventName ||
      typeof callback !== 'function'
    ) {
      return false;
    }

    const previousCount =
      EventBus.listenerCount(eventName);

    EventBus.off(
      eventName,
      callback,
      context,
      this
    );

    return (
      EventBus.listenerCount(eventName) <
      previousCount
    );
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
    if (
      this._cleanupDone ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return null;
    }

    this.sceneEvents?.on(
      eventName,
      callback,
      context
    );

    return callback;
  }

  onceSceneEvent(eventName, callback, context = this) {
    if (
      this._cleanupDone ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return null;
    }

    this.sceneEvents?.once(
      eventName,
      callback,
      context
    );

    return callback;
  }

  offSceneEvent(eventName, callback, context = this) {
    this.sceneEvents?.off(
      eventName,
      callback,
      context
    );
  }

  emitSceneEvent(eventName, ...args) {
    if (!eventName || this._cleanupDone) {
      return false;
    }

    this.sceneEvents?.emit(
      eventName,
      ...args
    );

    return true;
  }

  // ------------------------------------------------------------------
  // Tween tracking
  // ------------------------------------------------------------------

  isDestroyedTween(tween) {
    if (!tween || tween.parent === null) {
      return true;
    }

    try {
      return typeof tween.isDestroyed === 'function'
        ? Boolean(tween.isDestroyed())
        : tween.isDestroyed === true;
    } catch {
      return true;
    }
  }

  isTweenPlaying(tween) {
    if (this.isDestroyedTween(tween)) {
      return false;
    }

    try {
      return typeof tween.isPlaying === 'function'
        ? tween.isPlaying()
        : Boolean(tween.isPlaying);
    } catch {
      return false;
    }
  }

  untrackTween(tween) {
    if (!tween) {
      return false;
    }

    const callback =
      this._tweenTrackingCallbacks.get(tween);

    if (callback) {
      tween.off?.('complete', callback);
      tween.off?.('stop', callback);
      tween.off?.('remove', callback);

      this._tweenTrackingCallbacks.delete(tween);
    }

    this._sleepPausedTweens.delete(tween);

    return this.activeTweens.delete(tween);
  }

  addTrackedTween(tween) {
    if (
      !tween ||
      this._cleanupDone ||
      this.isDestroyedTween(tween)
    ) {
      return null;
    }

    if (this.activeTweens.has(tween)) {
      return tween;
    }

    this.activeTweens.add(tween);

    const untrack = () => {
      this.untrackTween(tween);
    };

    this._tweenTrackingCallbacks.set(
      tween,
      untrack
    );

    tween.once?.('complete', untrack);
    tween.once?.('stop', untrack);
    tween.once?.('remove', untrack);

    return tween;
  }

  createTrackedTween(config = {}) {
    if (
      this._cleanupDone ||
      !config ||
      typeof this.tweens?.add !== 'function'
    ) {
      return null;
    }

    // Nie zmieniamy callbacków ani callbackScope.
    const tween = this.tweens.add(config);

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
      if (
        remove &&
        !this.isDestroyedTween(tween)
      ) {
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
    for (const tween of [...this.activeTweens]) {
      this.removeTrackedTween(tween);
    }

    this.activeTweens.clear();
    this._sleepPausedTweens.clear();
    this._tweenTrackingCallbacks.clear();
  }

  killTrackedTweensOf(target) {
    if (!target) {
      return false;
    }

    for (const tween of [...this.activeTweens]) {
      if (this.isDestroyedTween(tween)) {
        this.untrackTween(tween);
        continue;
      }

      const targets = tween.targets ?? [];

      if (
        Array.isArray(targets) &&
        targets.includes(target)
      ) {
        this.removeTrackedTween(tween);
      }
    }

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
  // Lifecycle
  // ------------------------------------------------------------------

  handleSleep() {
    if (
      this._sleepCleanupDone ||
      this._cleanupDone
    ) {
      return;
    }

    this._sleepCleanupDone = true;
    this._sleepPausedTweens.clear();

    for (const tween of [...this.activeTweens]) {
      if (this.isDestroyedTween(tween)) {
        this.untrackTween(tween);
        continue;
      }

      // Nie wznawiamy później tweenów, które były
      // celowo zatrzymane przed uśpieniem.
      if (!this.isTweenPlaying(tween)) {
        continue;
      }

      try {
        if (typeof tween.pause === 'function') {
          tween.pause();
          this._sleepPausedTweens.add(tween);
        }
      } catch (error) {
        console.warn(
          '[BaseScene] Tween sleep pause failed:',
          error
        );
      }
    }

    this._sceneLoaderNavInFlight = false;
  }

  handleWake() {
    if (this._cleanupDone) {
      return;
    }

    this._sleepCleanupDone = false;

    const pausedTweens = [
      ...this._sleepPausedTweens
    ];

    this._sleepPausedTweens.clear();

    for (const tween of pausedTweens) {
      if (
        !this.activeTweens.has(tween) ||
        this.isDestroyedTween(tween)
      ) {
        this.untrackTween(tween);
        continue;
      }

      try {
        tween.resume?.();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween wake resume failed:',
          error
        );
      }
    }
  }

  cleanup() {
    if (this._cleanupDone) {
      return;
    }

    this._cleanupDone = true;

    // Nie używamy this.monologue: getter mógłby
    // utworzyć manager wyłącznie po to, by go zniszczyć.
    const monologue = this._monologue;
    this._monologue = null;

    try {
      monologue?.destroy?.();
    } catch (error) {
      console.warn(
        '[BaseScene] Monologue cleanup failed:',
        error
      );
    }

    this.cleanupTrackedTweens();

    for (const event of this.inputEvents) {
      if (
        !event?.target ||
        !event.name ||
        typeof event.callback !== 'function'
      ) {
        continue;
      }

      try {
        const remove =
          event.target.off ??
          event.target.removeListener;

        remove?.call(
          event.target,
          event.name,
          event.callback,
          event.context
        );
      } catch (error) {
        console.warn(
          '[BaseScene] Input listener cleanup failed:',
          error
        );
      }
    }

    this.inputEvents = [];

    EventBus.clearScope(this);

    this.sceneEvents?.removeAllListeners();

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

    this._sceneLoaderNavInFlight = false;
    this._overlayLoadsInFlight.clear();
  }

  destroyBaseScene() {
    if (this._destroyCleanupDone) {
      return;
    }

    this._destroyCleanupDone = true;

    this.cleanup();

    this.eventBus?.destroy?.();

    if (this.sceneEvents) {
      this.sceneEvents.destroy();
      this.sceneEvents = null;
    }

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.destroyBaseScene,
      this
    );
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------

  trackInputEvent(
    target,
    eventName,
    callback,
    context = this
  ) {
    if (
      this._cleanupDone ||
      typeof target?.on !== 'function' ||
      !eventName ||
      typeof callback !== 'function'
    ) {
      return null;
    }

    const alreadyTracked = this.inputEvents.some(
      listener =>
        listener.target === target &&
        listener.name === eventName &&
        listener.callback === callback &&
        listener.context === context
    );

    if (alreadyTracked) {
      return callback;
    }

    target.on(
      eventName,
      callback,
      context
    );

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
      const remove =
        target.off ??
        target.removeListener;

      remove?.call(
        target,
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

    const previousCount = this.inputEvents.length;

    this.inputEvents = this.inputEvents.filter(
      listener => !(
        listener.target === target &&
        listener.name === eventName &&
        listener.callback === callback &&
        listener.context === context
      )
    );

    return (
      this.inputEvents.length !== previousCount
    );
  }

  // ------------------------------------------------------------------
  // Inventory
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
  // Safe scene helpers
  // ------------------------------------------------------------------

  hasScene(sceneKey) {
    return Boolean(
      sceneKey &&
      this.scene?.manager?.keys?.[sceneKey]
    );
  }

  getRegisteredScene(sceneKey) {
    return this.hasScene(sceneKey)
      ? this.scene.manager.keys[sceneKey] || null
      : null;
  }

  getSceneIfActive(sceneKey) {
    return this.isSceneActive(sceneKey)
      ? this.getRegisteredScene(sceneKey)
      : null;
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
  // Player HUD
  // ------------------------------------------------------------------

  getPlayerHudScene() {
    return this.getSceneIfActive(
      'PlayerHudScene'
    );
  }

  sleepPlayerHud() {
    this.getPlayerHudScene()
      ?.closeAllUIPanels?.();

    return this.sleepSceneIfActive(
      'PlayerHudScene'
    );
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
  // News HUD
  // ------------------------------------------------------------------

  getNewsHudScene() {
    return this.getSceneIfActive('NewsHud');
  }

  setNewsHudButtonsVisible(visible = true) {
    const newsHud = this.getNewsHudScene();

    if (!newsHud?.events) {
      return false;
    }

    newsHud.events.emit(
      'setButtonsVisible',
      Boolean(visible)
    );

    return true;
  }

  showNewsHudButtons() {
    return this.setNewsHudButtonsVisible(true);
  }

  hideNewsHudButtons() {
    return this.setNewsHudButtonsVisible(false);
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  async goto(key, data = {}) {
    if (
      !key ||
      this._cleanupDone ||
      this._sceneLoaderNavInFlight
    ) {
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
          'Scene is not registered and SceneLoader is unavailable.'
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

    const sys = gameObject.scene?.sys;

    if (
      !sys ||
      !sys.isActive() ||
      !sys.input ||
      !gameObject.input?.enabled
    ) {
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

    const sys = gameObject.scene?.sys;

    if (
      !sys ||
      !sys.isActive() ||
      !sys.input
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
        const result =
          await this.game.sceneLoader.launch(
            this,
            key,
            data
          );

        if (result === false) {
          return false;
        }
      } else {
        if (!this.hasScene(key)) {
          console.error(
            `[BaseScene] Cannot launch "${key}". ` +
            'Scene is not registered and SceneLoader is unavailable.'
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

    if (this._overlayLoadsInFlight.has(key)) {
      return 'loading';
    }

    const launched = await this.launchOverlay(
      key,
      data
    );

    return launched ? 'opened' : 'error';
  }

  shutdown() {
    this.cleanup();
  }
}