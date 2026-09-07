import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../MonologueManager.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { inventoryManager } from '../InventoryManager.js';

export class BaseScene extends Phaser.Scene {
  constructor(config) {
    super(config);

    this.inventoryUI = null;
    this.hasMenu = false;

    this.activeTweens = [];
    this.inputEvents = [];
    this._busListeners = [];

    this._sceneLoaderNavInFlight = false;
    this._overlayLoadsInFlight = new Set();

    this._cleanupDone = false;
    this._sleepCleanupDone = false;
  }

  create() {
    this._cleanupDone = false;
    this._sleepCleanupDone = false;

    this._sceneLoaderNavInFlight = false;

    if (!this._overlayLoadsInFlight) {
      this._overlayLoadsInFlight = new Set();
    }

    if (!this.eventBus) {
      this.eventBus = EventBus;
    }

    if (!this.monologue) {
      const monologues =
        this.cache.json.get('monologues') ?? {};

      this.monologue = new MonologueManager(this, {
        dialogues: monologues
      });
    }

    if (this.hasMenu && !this.inventoryUI) {
      this.inventoryUI = new InventoryUI(this);
      this.inventoryUI.initialize();
    }

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SLEEP,
      this.handleSleep,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.WAKE,
      this.handleWake,
      this
    );
  }

  /**
   * Scoped listener dla globalnego EventBus.
   *
   * Używaj:
   *   this.onBus('eventName', this.someMethod);
   *
   * Listener zostanie zdjęty przy SHUTDOWN sceny.
   */
  onBus(eventName, callback, context = this) {
    if (!this.eventBus) {
      this.eventBus = EventBus;
    }

    this.eventBus.on(eventName, callback, context);

    this._busListeners.push({
      eventName,
      callback,
      context
    });

    return callback;
  }

  /**
   * Lekki cleanup przy sleep.
   *
   * Nie niszczy InventoryUI, nie odpina EventBus i nie usuwa input
   * listenerów — scena może zostać wybudzona przez scene.wake().
   */
  handleSleep() {
    if (this._sleepCleanupDone || this._cleanupDone) {
      return;
    }

    this._sleepCleanupDone = true;

    this.activeTweens.forEach((tween) => {
      if (!tween || tween.isDestroyed) {
        return;
      }

      try {
        tween.pause();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween sleep pause failed:',
          error
        );
      }
    });

    this._sceneLoaderNavInFlight = false;
  }

  /**
   * Przywraca stan po wybudzeniu sceny.
   *
   * Phaser zwykle sam wznawia tweens sceny, ale jawnie wznawiamy
   * śledzone tweens, aby działało również przy ręcznych pause().
   */
  handleWake() {
    if (this._cleanupDone) {
      return;
    }

    this._sleepCleanupDone = false;

    this.activeTweens.forEach((tween) => {
      if (!tween || tween.isDestroyed) {
        return;
      }

      try {
        tween.resume();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween wake resume failed:',
          error
        );
      }
    });
  }

  /**
   * Pełny cleanup wykonywany wyłącznie podczas SHUTDOWN.
   *
   * Jest idempotentny: może zostać wywołany wiele razy bez błędów.
   */
  cleanup() {
    if (this._cleanupDone) {
      return;
    }

    this._cleanupDone = true;

    this.activeTweens.forEach((tween) => {
      if (!tween || tween.isDestroyed) {
        return;
      }

      try {
        tween.stop();
      } catch (error) {
        console.warn(
          '[BaseScene] Tween cleanup failed:',
          error
        );
      }
    });

    this.activeTweens = [];

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

    if (this.inventoryUI) {
      try {
        this.inventoryUI.destroy();
      } catch (error) {
        console.warn(
          '[BaseScene] Inventory cleanup failed:',
          error
        );
      }

      this.inventoryUI = null;
    }

    if (!this.eventBus) {
      this.eventBus = EventBus;
    }

    this._busListeners.forEach(
      ({ eventName, callback, context }) => {
        try {
          this.eventBus.off(
            eventName,
            callback,
            context
          );
        } catch (error) {
          console.warn(
            `[BaseScene] EventBus cleanup failed for "${eventName}":`,
            error
          );
        }
      }
    );

    this._busListeners = [];

    this._sceneLoaderNavInFlight = false;

    this._overlayLoadsInFlight?.clear();
  }

  /**
   * Dodaje tween do listy automatycznie sprzątanej przy shutdown sceny.
   */
  addTrackedTween(tween) {
    if (!tween) {
      return null;
    }

    this.activeTweens.push(tween);

    const removeTweenFromTracking = () => {
      this.activeTweens = this.activeTweens.filter(
        (trackedTween) => trackedTween !== tween
      );
    };

    tween.once('complete', removeTweenFromTracking);
    tween.once('stop', removeTweenFromTracking);

    return tween;
  }

  /**
   * Rejestruje input listener do automatycznego cleanupu.
   *
   * Przykład:
   *   this.trackInputEvent(
   *     this.input.keyboard,
   *     'keydown-ESC',
   *     this.handleEscape
   *   );
   */
  trackInputEvent(
    target,
    eventName,
    callback,
    context = this
  ) {
    if (!target?.on || !eventName || !callback) {
      console.warn(
        '[BaseScene] trackInputEvent received invalid event data.',
        {
          target,
          eventName,
          callback
        }
      );

      return null;
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

  /**
   * Sprawdza, czy scena została dodana do SceneManagera Phaser.
   *
   * Nie generuje warningu:
   *   Scene key not found: SomeScene
   */
  hasScene(sceneKey) {
    return Boolean(
      sceneKey &&
      this.scene?.manager?.keys?.[sceneKey]
    );
  }

  /**
   * Zwraca instancję sceny tylko jeśli Phaser ją zna.
   *
   * Może zwrócić scenę aktywną, śpiącą, pauzowaną lub nieaktywną.
   */
  getRegisteredScene(sceneKey) {
    if (!this.hasScene(sceneKey)) {
      return null;
    }

    return this.scene.manager.keys[sceneKey] || null;
  }

  /**
   * Zwraca instancję sceny tylko jeśli jest aktywna.
   */
  getSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return null;
    }

    return this.getRegisteredScene(sceneKey);
  }

  /**
   * Bezpieczna wersja this.scene.isActive(sceneKey).
   */
  isSceneActive(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isActive(sceneKey)
    );
  }

  /**
   * Bezpieczna wersja this.scene.isSleeping(sceneKey).
   */
  isSceneSleeping(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isSleeping(sceneKey)
    );
  }

  /**
   * Bezpieczna wersja this.scene.isPaused(sceneKey).
   */
  isScenePaused(sceneKey) {
    return Boolean(
      this.hasScene(sceneKey) &&
      this.scene.isPaused(sceneKey)
    );
  }

  /**
   * Sprawdza, czy scena jest w jakimkolwiek stanie roboczym:
   * active, sleeping lub paused.
   */
  isSceneRunning(sceneKey) {
    return (
      this.isSceneActive(sceneKey) ||
      this.isSceneSleeping(sceneKey) ||
      this.isScenePaused(sceneKey)
    );
  }

  /**
   * Bezpiecznie zatrzymuje scenę aktywną, śpiącą albo pauzowaną.
   */
  stopSceneIfActive(sceneKey) {
    if (!this.isSceneRunning(sceneKey)) {
      return false;
    }

    this.scene.stop(sceneKey);

    return true;
  }

  /**
   * Bezpiecznie usypia aktywną scenę.
   *
   * Nie używaj dla UIScene, jeśli chcesz, żeby zegar i eventy DOM
   * aktualizowały się w tle — wtedy ukryj ją EventBus.emit('hideHUD').
   */
  sleepSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return false;
    }

    this.scene.sleep(sceneKey);

    return true;
  }

  /**
   * Bezpiecznie pauzuje aktywną scenę.
   */
  pauseSceneIfActive(sceneKey) {
    if (!this.isSceneActive(sceneKey)) {
      return false;
    }

    this.scene.pause(sceneKey);

    return true;
  }

  /**
   * Bezpiecznie wybudza scenę śpiącą.
   */
  wakeSceneIfSleeping(sceneKey) {
    if (!this.isSceneSleeping(sceneKey)) {
      return false;
    }

    this.scene.wake(sceneKey);

    return true;
  }

  /**
   * Bezpiecznie wznawia scenę zapauzowaną.
   */
  resumeSceneIfPaused(sceneKey) {
    if (!this.isScenePaused(sceneKey)) {
      return false;
    }

    this.scene.resume(sceneKey);

    return true;
  }

  /**
   * Bezpiecznie wynosi aktywną scenę na wierzch.
   */
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

  /**
   * Zwraca aktywny PlayerHudScene albo null.
   */
  getPlayerHudScene() {
    return this.getSceneIfActive('PlayerHudScene');
  }

  /**
   * Zamyka otwarte panele PlayerHudScene i usypia go.
   *
   * HTML HUD z UIScene chowaj osobno:
   *   this.game.events.emit('setHudVisible', false);
   *   EventBus.emit('hideHUD');
   */
  sleepPlayerHud() {
    const hud = this.getPlayerHudScene();

    hud?.closeAllUIPanels?.();

    return this.sleepSceneIfActive('PlayerHudScene');
  }

  /**
   * Zapewnia, że overlay istnieje i jest aktywny:
   * - wybudza scenę śpiącą,
   * - wznawia scenę pauzowaną,
   * - wynosi aktywną na wierzch,
   * - lazy-loaduje brakującą.
   *
   * Zwraca instancję sceny lub null.
   */
  async ensureOverlayScene(sceneKey, data = {}) {
    if (!sceneKey) {
      console.error(
        '[BaseScene] ensureOverlayScene() requires a scene key.'
      );

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

    if (!opened) {
      return null;
    }

    this.bringSceneToTopIfActive(sceneKey);

    return this.getRegisteredScene(sceneKey);
  }

  /**
   * Przywraca PlayerHudScene:
   * - wybudza go ze sleep,
   * - wznawia z pause,
   * - albo lazy-loaduje, jeśli jeszcze nie istnieje.
   */
  async restorePlayerHud(data = {}) {
    const hud = await this.ensureOverlayScene(
      'PlayerHudScene',
      data
    );

    if (!hud) {
      return null;
    }

    hud.refreshNotebook?.();
    hud.refreshUI?.();

    return hud;
  }

  // ------------------------------------------------------------------
  // Lazy scene navigation
  // ------------------------------------------------------------------

  /**
   * Zamiennik this.scene.start(key, data).
   *
   * Dla pełnych scen, np.:
   * CityScene, LocationScene, CrimeCityScene, HotelScene,
   * TravelTransitionScene, GameOverScene, MenuScene.
   */
  async goto(key, data = {}) {
    if (!key) {
      console.error('[BaseScene] goto() requires a scene key.');
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

  /**
   * Zamiennik this.scene.launch(key, data).
   *
   * Dla scen nakładkowych, np.:
   * PhoneCallScene, NewsstandScene, TvBroadcastScene,
   * SettingsScene, HypothesisScene, NewspaperOverlayScene.
   *
   * Jeżeli scena jest śpiąca albo pauzowana, zostaje przywrócona,
   * a nie uruchomiona drugi raz.
   */
  async launchOverlay(key, data = {}) {
    if (!key) {
      console.error(
        '[BaseScene] launchOverlay() requires a scene key.'
      );

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

      return true;
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

  /**
   * Otwiera / zamyka overlay.
   *
   * Zwraca:
   * - "opened"
   * - "closed"
   * - "loading"
   * - "error"
   */
  async toggleOverlay(key, data = {}) {
    if (!key) {
      console.error(
        '[BaseScene] toggleOverlay() requires a scene key.'
      );

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