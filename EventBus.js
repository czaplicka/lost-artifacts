// ManagedEventBus wraps Phaser's EventEmitter and adds the one thing it is
// missing for a long-running, multi-scene game: a central place to clean up
// listeners in bulk. Without this, every scene that does
// `EventBus.on('clue-found', this.handleClue, this)` and never calls the
// matching `off()` on shutdown leaves a dead listener behind forever -
// across dozens of scene transitions (office -> city -> crime scene ->
// crime lab -> another city...) this adds up to a real memory leak and,
// worse, to handlers firing on destroyed scene instances.
class ManagedEventBus {
    constructor() {
        this.emitter = new Phaser.Events.EventEmitter();

        // owner -> Set of { event, fn, context }
        this.registry = new Map();

        this.warnThreshold = 20;
        this.warnedEvents = new Set();
    }

    // owner is optional but strongly recommended: pass the scene key (or
    // the scene instance) so this listener can be bulk-removed later via
    // clearScope() / bindScene(), instead of leaking until the page reloads.
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

    // THE central cleanup point: removes every listener registered under
    // a given owner in one call. Call this from a scene's shutdown handler
    // (or let bindScene() do it automatically) to guarantee no listener
    // from that scene survives past its lifetime.
    clearScope(owner) {
        const set = this.registry.get(owner);
        if (!set) return;

        set.forEach(({ event, fn, context }) => {
            this.emitter.off(event, fn, context);
        });

        this.registry.delete(owner);
    }

    // Convenience hook: ties a Phaser scene's lifecycle directly to
    // clearScope(), so even if a scene's own code forgets to unregister
    // its listeners, they're removed automatically on SHUTDOWN/DESTROY.
    // Usage: EventBus.bindScene(this) inside a scene's create().
    bindScene(scene) {
        if (!scene?.events) return;

        const owner = this._ownerKeyForScene(scene);
        const cleanup = () => this.clearScope(owner);

        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
    }

    _ownerKeyForScene(scene) {
        return scene?.scene?.key || scene;
    }

    _track(owner, event, fn, context) {
        if (!owner) return;

        if (!this.registry.has(owner)) {
            this.registry.set(owner, new Set());
        }

        this.registry.get(owner).add({ event, fn, context });
    }

    _untrack(owner, event, fn, context) {
        if (!owner || !this.registry.has(owner)) return;

        const set = this.registry.get(owner);
        for (const entry of set) {
            if (entry.event === event && entry.fn === fn && entry.context === context) {
                set.delete(entry);
                break;
            }
        }

        if (set.size === 0) {
            this.registry.delete(owner);
        }
    }

    // Dev-time leak detector: warns once per event if listener count grows
    // suspiciously large, which usually means somewhere an off()/clearScope()
    // is missing.
    _checkListenerCount(event) {
        const count = this.emitter.listenerCount(event);

        if (count >= this.warnThreshold && !this.warnedEvents.has(event)) {
            this.warnedEvents.add(event);
            console.warn(
                `[EventBus] Event "${event}" has ${count} listeners registered. ` +
                'This usually means a scene/component is missing off() or EventBus.clearScope(owner) on cleanup.'
            );
        }
    }

    // Returns { owner: listenerCount } for debugging leaks in dev tools.
    debugListenerSummary() {
        const summary = {};
        this.registry.forEach((set, owner) => {
            summary[owner] = set.size;
        });
        return summary;
    }

    // Hard reset - removes every listener regardless of owner. Intended
    // for full game restarts / test teardown, not normal scene transitions.
    removeAllListeners(event) {
        this.emitter.removeAllListeners(event);

        if (event) {
            this.registry.forEach(set => {
                [...set].forEach(entry => {
                    if (entry.event === event) set.delete(entry);
                });
            });
        } else {
            this.registry.clear();
        }

        this.warnedEvents.clear();
    }
}

const EventBus = new ManagedEventBus();

export { EventBus };