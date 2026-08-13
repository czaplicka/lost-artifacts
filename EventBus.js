class ManagedEventBus {
    constructor() {
        this.emitter = new Phaser.Events.EventEmitter();
        this.registry = new Map();

        this.warnThreshold = 20;
        this.warnedEvents = new Set();
    }

    on(event, fn, context = null, owner = null) {
        this.emitter.on(event, fn, context);
        this._track(owner, event, fn, context);
        this._checkListenerCount(event);

        return this;
    }

    once(event, fn, context = null, owner = null) {
        const wrapped = (...args) => {
            this._untrack(owner, event, wrapped, context);
            fn.apply(context, args);
        };

        this.emitter.once(event, wrapped, context);
        this._track(owner, event, wrapped, context);
        this._checkListenerCount(event);

        return this;
    }

    off(event, fn, context = null, owner = null) {
        this.emitter.off(event, fn, context);
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
            return;
        }

        for (const { event, fn, context } of listeners) {
            this.emitter.off(event, fn, context);
        }

        this.registry.delete(owner);
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
            }
        };

        const cleanup = () => {
            this.clearScope(owner);
        };

        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    }

    _track(owner, event, fn, context) {
        if (!owner) {
            return;
        }

        if (!this.registry.has(owner)) {
            this.registry.set(owner, new Set());
        }

        this.registry.get(owner).add({
            event,
            fn,
            context
        });
    }

    _untrack(owner, event, fn, context) {
        if (!owner || !this.registry.has(owner)) {
            return;
        }

        const listeners = this.registry.get(owner);

        for (const entry of listeners) {
            const matches =
                entry.event === event &&
                entry.fn === fn &&
                entry.context === context;

            if (matches) {
                listeners.delete(entry);
                break;
            }
        }

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
                listenerCount: listeners.size
            });
        }

        return summary;
    }

    removeAllListeners(event = null) {
        this.emitter.removeAllListeners(event);

        if (event) {
            for (const [owner, listeners] of this.registry) {
                for (const entry of [...listeners]) {
                    if (entry.event === event) {
                        listeners.delete(entry);
                    }
                }

                if (listeners.size === 0) {
                    this.registry.delete(owner);
                }
            }
        } else {
            this.registry.clear();
        }

        this.warnedEvents.clear();
    }
}

const EventBus = new ManagedEventBus();

export { EventBus };