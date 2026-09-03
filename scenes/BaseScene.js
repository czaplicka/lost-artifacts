import { EventBus } from '../EventBus.js';
import { MonologueManager } from '../MonologueManager.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { inventoryManager } from '../InventoryManager.js';

export class BaseScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        this.inventoryUI = null;
        this.hasMenu = false;
        this.activeTweens = [];  // Track tweens dla cleanup
        this.inputEvents = [];   // Track input listeners
        this._busListeners = []; // Track EventBus listeners dla scoped cleanup
    }

    create() {
        // ✅ EventBus.js eksportuje już gotowy singleton (new Events.EventEmitter()),
        // NIE klasę — więc nie robimy tu `new EventBus()`, tylko podpinamy
        // się pod globalny bus. Do nasłuchiwania używaj this.onBus(...), które
        // automatycznie odpina listener przy shutdown/sleep tej sceny.
        if (!this.eventBus) {
            this.eventBus = EventBus;
        }

        // ✅ Monologue tylko raz
        if (!this.monologue) {
            const monologues = this.cache.json.get('monologues') ?? {};
            this.monologue = new MonologueManager(this, { dialogues: monologues });
        }

        // ✅ Inventory initialization bez redundancji
        if (this.hasMenu && !this.inventoryUI) {
            this.inventoryUI = new InventoryUI(this);
            this.inventoryUI.initialize();
        }

        // ✅ Nasłuchuj na shutdown, żeby posprzątać
        this.events.once('shutdown', () => this.cleanup());
        this.events.once('sleep', () => this.cleanup());
    }

    /**
     * ✅ Scoped nasłuch na globalnym EventBus — zamiast robić
     * `this.eventBus.on('x', fn)` bezpośrednio (co przecieka między scenami),
     * używaj tego helpera. Listener jest automatycznie zdejmowany w cleanup().
     */
    onBus(eventName, callback, context = this) {
        this.eventBus.on(eventName, callback, context);
        this._busListeners.push({ eventName, callback, context });
    }

    /**
     * ✅ Centralized cleanup
     */
    cleanup() {
        // Kill wszystkie tweens
        this.activeTweens.forEach(tween => {
            if (tween && !tween.isDestroyed) {
                tween.stop();
            }
        });
        this.activeTweens = [];

        // Zdejmij input events
        this.inputEvents.forEach(event => {
            if (event && event.target) {
                event.target.removeListener(event.name, event.callback);
            }
        });
        this.inputEvents = [];

        // Zamknij inventory jeśli otwarte
        if (this.inventoryUI) {
            this.inventoryUI.destroy();
            this.inventoryUI = null;
        }

        // ✅ Odpięcie TYLKO listenerów zarejestrowanych przez tę scenę
        // (globalny EventBus jest współdzielony, więc nie robimy tu
        // generalnego "unbindScene" — to by ucięło innym scenom nasłuchy)
        this._busListeners.forEach(({ eventName, callback, context }) => {
            this.eventBus.off(eventName, callback, context);
        });
        this._busListeners = [];

        // ✅ Odpięcie ewentualnego spinnera SceneLoadera, jeśli scena
        // zniknęła w trakcie trwania importu (np. gracz kliknął dwa razy)
        this._sceneLoaderNavInFlight = false;
    }

    /**
     * ✅ Helper do śledzenia tweenów
     */
    addTrackedTween(tween) {
        if (!tween) return null;
        this.activeTweens.push(tween);
        tween.once('complete', () => {
            this.activeTweens = this.activeTweens.filter(t => t !== tween);
        });
        return tween;
    }

    /**
     * ✅ Helper do śledzenia input events
     */
    trackInputEvent(target, eventName, callback) {
        this.inputEvents.push({ target, name: eventName, callback });
        return this.input.on(eventName, callback, this);
    }

    // ✅ Delegate do inventoryManager (pass-through, ale teraz czyste)
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
    // Lazy scene navigation (SceneLoader integration)
    // ------------------------------------------------------------------

    /**
     * Zamiennik `this.scene.start(key, data)`.
     * Jeśli docelowa scena nie została jeszcze zaimportowana (patrz
     * sceneRegistry.js / SceneLoader.js), doładowuje ją w tle, opcjonalnie
     * pokazując LoadingOverlayScene, i dopiero potem startuje.
     *
     * Chroni przed race condition: jeśli ta scena zostanie zamknięta
     * (shutdown/sleep) w trakcie trwania importu — np. gracz kliknął
     * "Wstecz" zanim import się skończył — nie wywołujemy scene.start()
     * na martwej scenie.
     */
async goto(key, data = {}) {
    if (this._sceneLoaderNavInFlight) {
        return false;
    }

    if (!this.game.sceneLoader) {
        this.scene.start(key, data);
        return true;
    }

    this._sceneLoaderNavInFlight = true;

    try {
        return await this.game.sceneLoader.goto(this, key, data);
    } catch (err) {
        console.error(`BaseScene.goto("${key}") failed:`, err);
        return false;
    } finally {
        this._sceneLoaderNavInFlight = false;
    }
}

    /**
     * Zamiennik `this.scene.launch(key, data)` dla scen nakładkowych
     * (PhoneCallScene, NewspaperOverlayScene itp.), z tym samym leniwym
     * doładowywaniem co `goto()`.
     */
    async launchOverlay(key, data = {}) {
        if (!this.game.sceneLoader) {
            this.scene.launch(key, data);
            return;
        }

        try {
            await this.game.sceneLoader.launch(this, key, data);
        } catch (err) {
            console.error(`BaseScene.launchOverlay("${key}") failed:`, err);
        }
    }

    /**
     * ✅ Proper shutdown
     */
    shutdown() {
        this.cleanup();
    }
}