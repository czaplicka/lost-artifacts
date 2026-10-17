class ManagedEventBus {
  constructor() {
    this.emitter = new Phaser.Events.EventEmitter();

    // owner → Map(listenerId → entry)
    this.registry = new Map();

    // event → Set(entry), obejmuje też listenery bez owner.
    this.eventRegistry = new Map();

    this.sceneBindings = new WeakMap();

    this.listenerIdCounter = 0;
    this.warnThreshold = 20;
    this.warnedEvents = new Set();
  }

  _generateListenerId() {
    this.listenerIdCounter += 1;
    return this.listenerIdCounter;
  }

  _hasOwner(owner) {
    return owner !== null && owner !== undefined;
  }

  _findDuplicate(event, fn, context, owner, once) {
    if (!this._hasOwner(owner)) {
      return null;
    }

    const listeners = this.registry.get(owner);

    if (!listeners) {
      return null;
    }

    for (const entry of listeners.values()) {
      if (
        entry.event === event &&
        entry.originalFn === fn &&
        entry.context === context &&
        entry.once === once
      ) {
        return entry;
      }
    }

    return null;
  }

  _track(entry) {
    if (!this.eventRegistry.has(entry.event)) {
      this.eventRegistry.set(
        entry.event,
        new Set()
      );
    }

    this.eventRegistry.get(entry.event).add(entry);

    if (this._hasOwner(entry.owner)) {
      if (!this.registry.has(entry.owner)) {
        this.registry.set(
          entry.owner,
          new Map()
        );
      }

      this.registry
        .get(entry.owner)
        .set(entry.id, entry);
    }
  }

  _untrack(entry) {
    const eventEntries =
      this.eventRegistry.get(entry.event);

    if (eventEntries) {
      eventEntries.delete(entry);

      if (eventEntries.size === 0) {
        this.eventRegistry.delete(entry.event);
      }
    }

    if (this._hasOwner(entry.owner)) {
      const ownerEntries =
        this.registry.get(entry.owner);

      if (ownerEntries) {
        ownerEntries.delete(entry.id);

        if (ownerEntries.size === 0) {
          this.registry.delete(entry.owner);
        }
      }
    }

    if (
      this.emitter.listenerCount(entry.event) <
      this.warnThreshold
    ) {
      this.warnedEvents.delete(entry.event);
    }
  }

  _removeEntry(entry) {
    entry.active = false;

    this.emitter.off(
      entry.event,
      entry.wrapped
    );

    this._untrack(entry);
  }

  _add(event, fn, context, owner, once) {
    if (typeof fn !== 'function') {
      console.warn(
        `[EventBus] ${once ? 'once' : 'on'}() ` +
        'called with an invalid function.'
      );

      return this;
    }

    if (
      this._findDuplicate(
        event,
        fn,
        context,
        owner,
        once
      )
    ) {
      return this;
    }

    const entry = {
      id: this._generateListenerId(),
      event,
      originalFn: fn,
      context,
      owner,
      once,
      active: true,
      wrapped: null
    };

    const bus = this;

    entry.wrapped = function (...args) {
      // Chroni przed wywołaniem usuniętego listenera,
      // który mógł pozostać w trwającej iteracji emitera.
      if (!entry.active) {
        return;
      }

      if (entry.once) {
        // Sprzątamy przed callbackiem, również na wypadek
        // ponownego emitowania tego samego zdarzenia.
        bus._removeEntry(entry);
      }

      const callbackContext =
        entry.context === null ||
        entry.context === undefined
          ? bus.emitter
          : entry.context;

      return entry.originalFn.apply(
        callbackContext,
        args
      );
    };

    this._track(entry);

    try {
      this.emitter.on(
        event,
        entry.wrapped
      );
    } catch (error) {
      entry.active = false;
      this._untrack(entry);
      throw error;
    }

    this._checkListenerCount(event);

    return this;
  }

  on(event, fn, context = null, owner = null) {
    return this._add(
      event,
      fn,
      context,
      owner,
      false
    );
  }

  once(event, fn, context = null, owner = null) {
    return this._add(
      event,
      fn,
      context,
      owner,
      true
    );
  }

  /**
   * Bez fn usuwa wszystkie pasujące listenery zdarzenia.
   * Bez context dopasowuje wszystkie konteksty.
   * Bez owner dopasowuje wszystkich właścicieli.
   *
   * Z owner usuwa wyłącznie rejestracje tego właściciela.
   */
  off(event, fn, context = null, owner = null) {
    if (
      fn !== undefined &&
      fn !== null &&
      typeof fn !== 'function'
    ) {
      console.warn(
        '[EventBus] off() called with an invalid function.'
      );

      return this;
    }

    const entries = this.eventRegistry.get(event);

    if (!entries) {
      return this;
    }

    const filterByFunction =
      typeof fn === 'function';

    const filterByContext =
      context !== null &&
      context !== undefined;

    const filterByOwner =
      this._hasOwner(owner);

    for (const entry of [...entries]) {
      if (
        filterByFunction &&
        entry.originalFn !== fn &&
        entry.wrapped !== fn
      ) {
        continue;
      }

      if (
        filterByContext &&
        entry.context !== context
      ) {
        continue;
      }

      if (
        filterByOwner &&
        entry.owner !== owner
      ) {
        continue;
      }

      this._removeEntry(entry);
    }

    return this;
  }

  emit(event, ...args) {
    return this.emitter.emit(
      event,
      ...args
    );
  }

  listenerCount(event) {
    return this.emitter.listenerCount(event);
  }

  clearScope(owner) {
    const listeners = this.registry.get(owner);

    if (!listeners) {
      return this;
    }

    for (const entry of [...listeners.values()]) {
      this._removeEntry(entry);
    }

    return this;
  }

  bindScene(scene) {
    if (!scene?.events) {
      console.warn(
        '[EventBus] bindScene() received an invalid Phaser scene.'
      );

      return;
    }

    const existing = this.sceneBindings.get(scene);

    if (existing) {
      scene.eventBus = existing.api;
      return existing.api;
    }

    const owner = scene;
    const bus = this;

    const shutdownEvent =
      Phaser.Scenes.Events.SHUTDOWN;

    const destroyEvent =
      Phaser.Scenes.Events.DESTROY;

    const cleanup = () => {
      bus.clearScope(owner);
    };

    const detach = () => {
      cleanup();

      scene.events.off(
        shutdownEvent,
        cleanup
      );

      scene.events.off(
        destroyEvent,
        detach
      );

      bus.sceneBindings.delete(scene);

      if (scene.eventBus === api) {
        delete scene.eventBus;
      }
    };

    const api = {
      on(event, fn, context = scene) {
        bus.on(
          event,
          fn,
          context,
          owner
        );

        return api;
      },

      once(event, fn, context = scene) {
        bus.once(
          event,
          fn,
          context,
          owner
        );

        return api;
      },

      off(event, fn, context = scene) {
        bus.off(
          event,
          fn,
          context,
          owner
        );

        return api;
      },

      emit(event, ...args) {
        return bus.emit(
          event,
          ...args
        );
      },

      listenerCount(event) {
        return bus.listenerCount(event);
      },

      destroy() {
        detach();
      }
    };

    this.sceneBindings.set(scene, {
      api,
      cleanup,
      detach
    });

    scene.eventBus = api;

    // Jedna stała rejestracja na scenę:
    // działa również po jej ponownym uruchomieniu.
    scene.events.on(
      shutdownEvent,
      cleanup
    );

    scene.events.once(
      destroyEvent,
      detach
    );

    return api;
  }

  _checkListenerCount(event) {
    const count =
      this.emitter.listenerCount(event);

    if (
      count >= this.warnThreshold &&
      !this.warnedEvents.has(event)
    ) {
      this.warnedEvents.add(event);

      console.warn(
        `[EventBus] "${String(event)}" has ${count} listeners. ` +
        'Check whether a scene or UI component is missing cleanup.'
      );
    }
  }

  debugListenerSummary() {
    const summary = [];

    for (const [owner, listeners] of this.registry) {
      summary.push({
        owner:
          owner?.sys?.settings?.key ||
          owner?.scene?.key ||
          owner?.constructor?.name ||
          String(owner),

        listenerCount: listeners.size,

        events: [
          ...new Set(
            [...listeners.values()].map(
              entry => entry.event
            )
          )
        ]
      });
    }

    return summary;
  }

  removeAllListeners(event = null) {
    const removeEverything =
      event === null ||
      event === undefined;

    if (removeEverything) {
      for (const entries of [
        ...this.eventRegistry.values()
      ]) {
        for (const entry of [...entries]) {
          this._removeEntry(entry);
        }
      }

      this.emitter.removeAllListeners();

      this.registry.clear();
      this.eventRegistry.clear();
      this.warnedEvents.clear();

      return this;
    }

    const entries =
      this.eventRegistry.get(event);

    if (entries) {
      for (const entry of [...entries]) {
        this._removeEntry(entry);
      }
    }

    this.emitter.removeAllListeners(event);
    this.warnedEvents.delete(event);

    return this;
  }
}

const EventBus = new ManagedEventBus();

export { EventBus };