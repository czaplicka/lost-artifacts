class ManagedEventBus {
    constructor() {
        this.emitter = new Phaser.Events.EventEmitter();
        this.registry = new Map();  // owner → Map(listenerId → listener)
        this.listenerIdCounter = 0;

        this.warnThreshold = 20;
        this.warnedEvents = new Set();
        this.dedupeCache = new Map();  // owner → Set(eventName+fnHash)
    }

    /**
     * ✅ Generate unique ID dla listener (O(1) untrack)
     */
    _generateListenerId() {
        return ++this.listenerIdCounter;
    }

    /**
     * ✅ Hash funkcji dla deduplicacji
     */
    _hashListener(event, fn, context) {
        // Prosta deduplikacja: event + fn reference
        return `${event}:${fn.toString().slice(0, 50)}`;
    }

    on(event, fn, context = null, owner = null) {
        if (!fn || typeof fn !== 'function') {
            console.warn('[EventBus] on() called with invalid function');
            return this;
        }

        // ✅ Deduplikacja — nie dodawaj duplikatu
        if (owner) {
            const hash = this._hashListener(event, fn, context);
            if (!this.dedupeCache.has(owner)) {
                this.dedupeCache.set(owner, new Set());
            }

            const ownerCache = this.dedupeCache.get(owner);
            if (ownerCache.has(hash)) {
                return this;  // ← Już istnieje, skip
            }
            ownerCache.add(hash);
        }

        this.emitter.on(event, fn, context);
        this._track(owner, event, fn, context);
        this._checkListenerCount(event);

        return this;
    }

    once(event, fn, context = null, owner = null) {
        if (!fn || typeof fn !== 'function') {
            console.warn('[EventBus] once() called with invalid function');
            return this;
        }

        // ✅ Użyj native Phaser once + manual untrack
        const listenerId = this._generateListenerId();
        const originalFn = fn;

        const wrapped = (...args) => {
            this._untrackById(owner, listenerId);
            originalFn.apply(context, args);
        };

        this.emitter.once(event, wrapped, context);
        this._track(owner, event, wrapped, context, listenerId);
        this._checkListenerCount(event);

        return this;
    }

    off(event, fn, context = null, owner = null) {
        this.emitter.off(event, fn, context);

        // ✅ Deduplikacja cleanup
        if (owner) {
            const hash = this._hashListener(event, fn, context);
            const ownerCache = this.dedupeCache.get(owner);
            if (ownerCache) {
                ownerCache.delete(hash);
            }
        }

        this._untrack(owner, event, fn, context);
        return this;
    }

    emit(event, ...args) {
        return this.emitter.emit(event, ...args);
    }

    listenerCount(event) {
        return this.emitter.listenerCount(event);
    }

    clearScope(owner) {
        const listeners = this.registry.get(owner);

        if (!listeners) {
            this.dedupeCache.delete(owner);
            return;
        }

        // ✅ O(1) Map iteration zamiast Set
        for (const { event, fn, context } of listeners.values()) {
            this.emitter.off(event, fn, context);
        }

        this.registry.delete(owner);
        this.dedupeCache.delete(owner);
    }

    bindScene(scene) {
        if (!scene?.events) {
            console.warn('[EventBus] bindScene() received an invalid Phaser scene.');
            return;
        }

        const owner = scene;

        scene.eventBus = {
            on: (event, fn, context = scene) => {
                this.on(event, fn, context, owner);
                return scene.eventBus;
            },

            once: (event, fn, context = scene) => {
                this.once(event, fn, context, owner);
                return scene.eventBus;
            },

            off: (event, fn, context = scene) => {
                this.off(event, fn, context, owner);
                return scene.eventBus;
            },

            emit: (event, ...args) => {
                return this.emit(event, ...args);
            },

            listenerCount: (event) => {
                return this.listenerCount(event);
            },

            // ✅ Explicit cleanup method
            destroy: () => {
                this.clearScope(owner);
            }
        };

        // ✅ Cleanup na shutdown i destroy
        const cleanup = () => this.clearScope(owner);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    }

    /**
     * ✅ Track listener z optional ID
     */
    _track(owner, event, fn, context, listenerId = null) {
        if (!owner) return;

        if (!this.registry.has(owner)) {
            this.registry.set(owner, new Map());
        }

        const id = listenerId ?? this._generateListenerId();
        this.registry.get(owner).set(id, { event, fn, context });
    }

    /**
     * ✅ Untrack by listener reference (O(n) ale rzadkie)
     */
    _untrack(owner, event, fn, context) {
        if (!owner || !this.registry.has(owner)) return;

        const listeners = this.registry.get(owner);

        // ✅ Szukamy entry z dopasowaniem
        for (const [id, entry] of listeners.entries()) {
            if (entry.event === event && entry.fn === fn && entry.context === context) {
                listeners.delete(id);
                break;
            }
        }

        if (listeners.size === 0) {
            this.registry.delete(owner);
        }
    }

    /**
     * ✅ Untrack by ID (O(1))
     */
    _untrackById(owner, listenerId) {
        if (!owner || !this.registry.has(owner)) return;

        const listeners = this.registry.get(owner);
        listeners.delete(listenerId);

        if (listeners.size === 0) {
            this.registry.delete(owner);
        }
    }

    _checkListenerCount(event) {
        const count = this.emitter.listenerCount(event);

        if (count >= this.warnThreshold && !this.warnedEvents.has(event)) {
            this.warnedEvents.add(event);

            console.warn(
                `[EventBus] "${event}" has ${count} listeners. ` +
                'Check whether a scene or UI component is missing cleanup.'
            );
        }
    }

    debugListenerSummary() {
        const summary = [];

        for (const [owner, listeners] of this.registry) {
            summary.push({
                owner: owner.scene?.key || owner.constructor?.name || 'Unknown',
                listenerCount: listeners.size,
                events: [...new Set([...listeners.values()].map(l => l.event))]
            });
        }

        return summary;
    }

    removeAllListeners(event = null) {
        this.emitter.removeAllListeners(event);

        if (event) {
            for (const [owner, listeners] of this.registry) {
                for (const [id, entry] of listeners.entries()) {
                    if (entry.event === event) {
                        listeners.delete(id);
                    }
                }

                if (listeners.size === 0) {
                    this.registry.delete(owner);
                }
            }
        } else {
            this.registry.clear();
        }

        this.dedupeCache.clear();
        this.warnedEvents.clear();
    }
}

const EventBus = new ManagedEventBus();

export { EventBus };