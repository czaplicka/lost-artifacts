import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { BaseScene } from './BaseScene.js';

// Shared by HUD visibility and Holly's gameplay-input guard.
const HUD_ALLOWED_SCENES = new Set([
  'GameScene', 'OfficeScene', 'CityScene', 'CrimeCityScene', 'LocationScene',
  'HiddenObjectsScene', 'CrimeLabScene', 'InventoryScene', 'HotelScene',
  'ShopScene', 'ApartmentScene'
]);
const HUD_OVERLAY_SCENES = new Set(['PlayerHudScene', 'NewsHud']);
const CRIME_BOARD_ALLOWED_SCENES = new Set(['OfficeScene', 'HotelScene']);
const PANEL_STATE_EVENT = 'hud:panel-state-changed';
const PANEL_TOGGLED_EVENT = 'hud:panel-toggled';
const FALLBACK_OPEN_MS = 150;
const FALLBACK_IDLE_MS = 1000;
const HOLLY = 'HollyIntroScene';
const HOLLY_ACTIVATION_TIMEOUT_MS = 15000;

const PANEL_LOADERS = {
  caseFileUI: () => import('../ui/CaseFileUI.js').then(m => m.CaseFileUI),
  notesUI: () => import('../ui/NotesUI.js').then(m => m.NotesUI),
  warrantUI: () => import('../ui/WarrantUI.js').then(m => m.WarrantUI),
  destinationsUI: () => import('../ui/DestinationsUI.js').then(m => m.DestinationsUI),
  playerMenu: () => import('../ui/PlayerMenuUI.js').then(m => m.PlayerMenuUI),
  crimeBoardUI: () => import('../ui/CrimeBoardUI.js').then(m => m.CrimeBoardUI),
  atlasUI: () => import('../ui/AtlasUI.js').then(m => m.AtlasUI),
  phoneUI: () => import('../ui/PhonebookUI.js').then(m => m.PhonebookUI),
  passportUI: () => import('../ui/PassportUI.js').then(m => m.PassportUI),
  dialogManager: () => import('../dialogues/DialogManager.js').then(m => m.DialogManager),
  inventoryUI: () => import('../ui/InventoryUI.js').then(({ InventoryUI }) => {
    return class HudInventoryUI extends InventoryUI {
      attachKeyListener() {
        this.scene.input.keyboard?.on('keydown-ESC', this.handleKeyEsc, this);
      }
      get isOpen() { return this.isVisible; }
      open() {
        if (this._destroyed || !this.scene?.sys?.isActive()) return false;
        if (!this._initialized) this.initialize();
        return super.open();
      }
      toggle() {
        if (this._destroyed || !this.scene?.sys?.isActive()) return;
        if (!this._initialized) this.initialize();
        if (!this._destroyed && this._initialized) super.toggle();
      }
    };
  })
};
const PANEL_NAMES = Object.keys(PANEL_LOADERS);
const HOTKEY_PANELS = [
  'playerMenu', 'caseFileUI', 'notesUI', 'warrantUI', 'destinationsUI',
  'crimeBoardUI', 'atlasUI', 'phoneUI', 'inventoryUI'
];
const panelClassCache = new Map();
const panelClassPromises = new Map();

function loadPanelClass(name) {
  if (panelClassCache.has(name)) return Promise.resolve(panelClassCache.get(name));
  if (panelClassPromises.has(name)) return panelClassPromises.get(name);
  const loader = PANEL_LOADERS[name];
  if (!loader) return Promise.resolve(null);
  const promise = loader().then(PanelClass => {
    panelClassCache.set(name, PanelClass);
    return PanelClass;
  }).catch(error => {
    console.error(`[PlayerHudScene] Failed to import panel "${name}":`, error);
    return null;
  }).finally(() => panelClassPromises.delete(name));
  panelClassPromises.set(name, promise);
  return promise;
}

export class PlayerHudScene extends BaseScene {
  constructor() {
    super({ key: 'PlayerHudScene' });
    this.gameState = gameState;
    this.isHudReady = false;
    this.currentGameplaySceneKey = null;
    this.reputationBars = null;
    this._hudVisible = false;
    this._allowPanelCreation = false;
    this._creatingPanels = new Set();
    this._panelInstances = new Map();
    this._observedPanels = new WeakSet();
    this._propertyRestorers = [];
    this._fallbackTimer = null;
    this._fallbackNeeded = false;
    this._fallbackDelay = null;
    this._fallbackSuspended = false;
    this._lastPanelState = null;
    this._lastOpenByPanel = new Map();
    this._sleepStoryInFlight = false;
    this._releaseSleepStory = null;
    this._bootToken = 0;
    this._bootError = null;
    for (const name of PANEL_NAMES) {
      Object.defineProperty(this, name, {
        configurable: true, enumerable: true, get: () => this._getPanel(name)
      });
    }
  }

  create() {
    this._releaseSleepStory?.();
    super.create();
    this.gameState = gameState;
    this.isHudReady = false;
    this.currentGameplaySceneKey = this.currentGameplaySceneKey || null;
    this._lastPanelState = null;
    this._lastOpenByPanel.clear();
    this._sleepStoryInFlight = false;
    this._bootError = null;
    this._allowPanelCreation = true;
    this._hudVisible = false;
    this._fallbackSuspended = false;
    this._stopFallbackCheck();
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this._unbindHudLifecycle();
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onWake, this);
    this.events.on(Phaser.Scenes.Events.SLEEP, this.onHudInactive, this);
    this.events.on(Phaser.Scenes.Events.PAUSE, this.onHudInactive, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.onBus('firstForcedSleepStory', this._handleFirstForcedSleepStory, this);
    this._createReputationBars();
    const boot = this._bootPanels();
    const token = this._bootToken;
    void boot.catch(error => {
      if (token === this._bootToken && !this._cleanupDone && this._allowPanelCreation) {
        this._bootError = error;
        console.error('[PlayerHudScene] Panel boot failed:', error);
      }
    });
  }

  _unbindHudLifecycle() {
    for (const [event, handler] of [
      [Phaser.Scenes.Events.WAKE, this.onWake],
      [Phaser.Scenes.Events.RESUME, this.onWake],
      [Phaser.Scenes.Events.SLEEP, this.onHudInactive],
      [Phaser.Scenes.Events.PAUSE, this.onHudInactive],
      [Phaser.Scenes.Events.SHUTDOWN, this.onShutdown],
      [Phaser.Scenes.Events.DESTROY, this.onShutdown]
    ]) this.events.off(event, handler, this);
  }

  _createReputationBars() {
    this.reputationBars?.destroy();
    this.reputationBars = null;
  }
  _syncReputationBarsVisibility() {
    if (!this.reputationBars?.root) return;
    const key = this.currentGameplaySceneKey;
    this.reputationBars.root.setVisible(Boolean(
      this.isHudReady && this._allowPanelCreation && this._hudVisible &&
      (!key || HUD_ALLOWED_SCENES.has(key)) && !this.isAnyPanelOpen()
    ));
  }
  refreshUI() {
    this.reputationBars?.refresh();
    this._syncReputationBarsVisibility();
  }
  refreshNotebook() { this.refreshUI(); }

  async _bootPanels() {
    const token = ++this._bootToken;
    try {
      const classes = await Promise.all(PANEL_NAMES.map(loadPanelClass));
      const failed = PANEL_NAMES.filter((name, index) => !classes[index]);
      if (failed.length) throw new Error(`Failed to load panels: ${failed.join(', ')}`);
    } catch (error) {
      if (token !== this._bootToken) return;
      this._bootError = error;
      console.error('[PlayerHudScene] Panel import failed:', error);
    }
    if (token !== this._bootToken || this._cleanupDone || !this._allowPanelCreation) return;
    for (const name of HOTKEY_PANELS) {
      if (panelClassCache.has(name)) this._getPanel(name);
    }
    this.isHudReady = true;
    const key = this.currentGameplaySceneKey;
    if (key && !HUD_ALLOWED_SCENES.has(key)) this.hideHud();
    else this.showHud();
    this.updateCrimeBoardMenuAvailability();
    this._emitPanelStateChanged(true);
    this.events.emit('hud-ready', this);
  }

  async ensurePanel(name) {
    if (!PANEL_LOADERS[name]) return null;
    const token = this._bootToken;
    const PanelClass = await loadPanelClass(name);
    if (!PanelClass || token !== this._bootToken ||
      !this._allowPanelCreation || this._cleanupDone) return null;
    return this._getPanel(name);
  }

  async _handleFirstForcedSleepStory(payload = {}) {
    const key = payload.sceneKey || HOLLY;
    if (key !== HOLLY) return this._launchOtherSleepStory(key, payload);
    if (this._cleanupDone || this._sleepStoryInFlight) return;

    const manager = this.game.scene;
    const gameEvents = this.game.events;
    const snapshots = new Map();
    let released = false;
    let activated = false;
    let hollyEvents = null;
    let activationTimer = null;
    this._sleepStoryInFlight = true;

    const restoreInput = scene => {
      const snapshot = snapshots.get(scene);
      if (!snapshot) return;
      snapshots.delete(scene);
      scene.events.off('shutdown', snapshot.onShutdown);
      scene.events.off('destroy', snapshot.onShutdown);
      if (scene.input === snapshot.input) snapshot.input.enabled = snapshot.enabled;
      if (snapshot.keyboard && scene.input?.keyboard === snapshot.keyboard) {
        snapshot.keyboard.enabled = snapshot.keyboardEnabled;
      }
    };

    const release = () => {
      if (released) return;
      released = true;
      clearTimeout(activationTimer);
      activationTimer = null;
      gameEvents.off('prerender', keepHollyOnTop);
      EventBus.off('hollyIntroFinished', onHollyFinished);
      hollyEvents?.off('shutdown', release);
      hollyEvents?.off('destroy', release);
      this.events.off('shutdown', release);
      this.events.off('destroy', release);
      for (const scene of snapshots.keys()) restoreInput(scene);
      if (this._releaseSleepStory === release) {
        this._releaseSleepStory = null;
        this._sleepStoryInFlight = false;
      }
    };

    const onHollyFinished = result => {
      if (result?.source === 'forced_sleep') release();
    };

    const keepHollyOnTop = () => {
      if (released) return;
      const holly = manager.keys?.[HOLLY];
      const active = Boolean(holly?.sys?.isActive());
      if (active) {
        activated = true;
        clearTimeout(activationTimer);
        activationTimer = null;
        if (hollyEvents !== holly.events) {
          hollyEvents?.off('shutdown', release);
          hollyEvents?.off('destroy', release);
          hollyEvents = holly.events;
          hollyEvents.once('shutdown', release);
          hollyEvents.once('destroy', release);
        }
      } else if (activated && !holly?.sys?.isPaused?.() && !holly?.sys?.isSleeping?.()) {
        release();
        return;
      }

      // Read the manager's existing array: no getScenes()/filter() allocations.
      const scenes = manager.scenes;
      if (!Array.isArray(scenes)) return;
      let topActive = null;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene?.sys?.isActive()) continue;
        topActive = scene;
        if (!HUD_ALLOWED_SCENES.has(scene.sys.settings.key)) continue;
        const input = scene.input;
        if (!input) continue;
        let snapshot = snapshots.get(scene);
        if (!snapshot || snapshot.input !== input || snapshot.keyboard !== input.keyboard) {
          if (snapshot) restoreInput(scene);
          const onShutdown = () => restoreInput(scene);
          snapshot = {
            input, enabled: input.enabled,
            keyboard: input.keyboard, keyboardEnabled: input.keyboard?.enabled,
            onShutdown
          };
          snapshots.set(scene, snapshot);
          scene.events.once('shutdown', onShutdown);
          scene.events.once('destroy', onShutdown);
        }
        input.enabled = false;
        if (input.keyboard) input.keyboard.enabled = false;
      }
      if (active && topActive !== holly) manager.bringToTop(HOLLY);
    };

    this._releaseSleepStory = release;
    this.events.once('shutdown', release);
    this.events.once('destroy', release);
    EventBus.on('hollyIntroFinished', onHollyFinished);
    gameEvents.on('prerender', keepHollyOnTop);

    // Native timer still runs when Phaser pauses this HUD during the overlay.
    // It guards activation only; it never limits time spent reading the dialogue.
    activationTimer = setTimeout(() => {
      if (released) return;
      if (manager.keys?.[HOLLY]?.sys?.isActive()) {
        keepHollyOnTop();
        return;
      }
      console.warn('[PlayerHudScene] Holly did not activate within 15 seconds. Input restored.');
      release();
    }, HOLLY_ACTIVATION_TIMEOUT_MS);

    try {
      keepHollyOnTop();
      const opened = await this.launchStoryOverlay(HOLLY, {
        ...payload, source: 'forced_sleep'
      });
      // A late Promise must not re-lock input after timeout or HUD shutdown.
      if (released) return;
      if (!opened) {
        console.warn('[PlayerHudScene] Could not open Holly after collapse.');
        release();
        return;
      }
      keepHollyOnTop();
    } catch (error) {
      release();
      console.warn('[PlayerHudScene] Failed to open Holly after collapse:', error);
    }
  }

  async _launchOtherSleepStory(sceneKey, payload) {
    if (this._cleanupDone || this._sleepStoryInFlight) return;
    this._sleepStoryInFlight = true;
    const token = this._bootToken;
    try {
      const opened = await this.launchStoryOverlay(sceneKey, {
        ...payload, source: 'forced_sleep'
      });
      if (!opened && !this._cleanupDone) {
        console.warn(`[PlayerHudScene] Could not open sleep story "${sceneKey}".`);
      }
    } catch (error) {
      console.warn('[PlayerHudScene] Failed to launch sleep story:', error);
    } finally {
      if (token === this._bootToken) this._sleepStoryInFlight = false;
    }
  }

  _initializeInventoryPanel(panel) {
    if (!panel || panel._destroyed || this._cleanupDone || !this.sys.isActive()) return false;
    if (!panel._initialized) panel.initialize();
    return Boolean(!panel._destroyed && panel._initialized);
  }
  _retryInventoryInitialization() {
    if (!this._panelInstances.has('inventoryUI') || !this.sys.isActive()) return;
    this._getPanel('inventoryUI');
  }

  _getPanel(name) {
    if (!PANEL_LOADERS[name] || !this._allowPanelCreation || this._cleanupDone) return null;
    const cached = this._panelInstances.get(name);
    if (cached) {
      if (name !== 'inventoryUI') return cached;
      if (!cached._destroyed) {
        this._initializeInventoryPanel(cached);
        return cached._destroyed ? null : cached;
      }
      this._panelInstances.delete(name);
      this._lastOpenByPanel.delete(name);
    }
    if (!panelClassCache.has(name)) {
      const token = this._bootToken;
      void loadPanelClass(name).then(PanelClass => {
        if (PanelClass && token === this._bootToken &&
          this._allowPanelCreation && !this._cleanupDone) this._getPanel(name);
      }).catch(error => console.error(`[PlayerHudScene] Panel creation failed: ${name}`, error));
      return null;
    }
    if (this._creatingPanels.has(name)) {
      console.warn(`[PlayerHudScene] Recursive panel construction: "${name}".`);
      return null;
    }
    this._creatingPanels.add(name);
    try {
      const panel = this._createPanel(name);
      if (!panel) return null;
      this._panelInstances.set(name, panel);
      if (name === 'dialogManager') this._observeDialogManager(panel);
      else this._observePanel(panel, name);
      if (name === 'inventoryUI') {
        this._initializeInventoryPanel(panel);
        if (panel._destroyed) return null;
      }
      if (name === 'phoneUI') {
        panel.setOnCall((key, contact) => this.dialogManager?.startDialog(key, contact));
      }
      if (name === 'playerMenu') panel.setCrimeBoardAvailable?.(this.isCrimeBoardAvailable());
      this._emitPanelStateChanged();
      return panel;
    } finally { this._creatingPanels.delete(name); }
  }

  _createPanel(name) {
    const PanelClass = panelClassCache.get(name);
    if (!PanelClass) return null;
    switch (name) {
      case 'playerMenu':
      case 'phoneUI':
      case 'dialogManager': return new PanelClass(this, this.gameState);
      case 'atlasUI': return new PanelClass(this, this.cache.json.get('atlas') || []);
      default: return new PanelClass(this);
    }
  }

  _observeProperty(object, key, onChange) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor && (!descriptor.configurable ||
      !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.writable)) return false;
    if (!descriptor) {
      let prototype = Object.getPrototypeOf(object);
      while (prototype) {
        if (Object.getOwnPropertyDescriptor(prototype, key)) return false;
        prototype = Object.getPrototypeOf(prototype);
      }
    }
    let value = object[key];
    Object.defineProperty(object, key, {
      configurable: true, enumerable: descriptor?.enumerable ?? true,
      get() { return value; },
      set(nextValue) {
        const previous = value;
        value = nextValue;
        if (previous !== nextValue) onChange(nextValue, previous);
      }
    });
    this._propertyRestorers.push(() => Object.defineProperty(object, key,
      descriptor ? { ...descriptor, value }
        : { configurable: true, enumerable: true, writable: true, value }));
    return true;
  }

  _observePanel(panel, name) {
    if (!panel || this._observedPanels.has(panel)) return;
    this._observedPanels.add(panel);
    const property = name === 'inventoryUI' ? 'isVisible' : 'isOpen';
    if (!this._observeProperty(panel, property, () => this._emitPanelStateChanged())) {
      this._enableFallbackCheck();
    }
  }
  _observeDialogManager(manager) {
    const observeDialog = dialog => {
      if (dialog) this._observePanel(dialog,
        __dialogueText('scenes/PlayerHudScene.js', 't_7b48a33f1964a1ebfa66'));
      this._emitPanelStateChanged();
    };
    observeDialog(manager.dialogUI);
    if (!this._observeProperty(manager, 'dialogUI', observeDialog)) this._enableFallbackCheck();
  }

  _canRunFallbackCheck() {
    return Boolean(this._fallbackNeeded && this.isHudReady && this._allowPanelCreation &&
      !this._cleanupDone && !this._fallbackSuspended && this._hudVisible && this.sys.isActive());
  }
  _enableFallbackCheck() {
    this._fallbackNeeded = true;
    this._scheduleFallbackCheck();
  }
  _stopFallbackCheck() {
    this._fallbackTimer?.remove(false);
    this._fallbackTimer = null;
    this._fallbackDelay = null;
  }
  _scheduleFallbackCheck() {
    if (!this._canRunFallbackCheck()) { this._stopFallbackCheck(); return; }
    const delay = this.isAnyPanelOpen() ? FALLBACK_OPEN_MS : FALLBACK_IDLE_MS;
    if (this._fallbackTimer && this._fallbackDelay === delay) return;
    this._stopFallbackCheck();
    this._fallbackDelay = delay;
    const token = this._bootToken;
    this._fallbackTimer = this.time.delayedCall(delay, () => {
      this._fallbackTimer = null;
      this._fallbackDelay = null;
      if (token !== this._bootToken || !this._canRunFallbackCheck()) return;
      const manager = this._panelInstances.get('dialogManager');
      if (manager?.dialogUI) this._observePanel(manager.dialogUI,
        __dialogueText('scenes/PlayerHudScene.js', 't_7b48a33f1964a1ebfa66'));
      this._emitPanelStateChanged();
      this._scheduleFallbackCheck();
    });
  }

  _isPanelOpen(name, panel) {
    if (!panel) return false;
    if (name === 'dialogManager') return Boolean(panel.dialogUI?.isOpen);
    if (name === 'inventoryUI') return Boolean(panel.isVisible);
    return Boolean(panel.isOpen);
  }
  getOpenPanels() {
    const open = [];
    for (const [name, panel] of this._panelInstances) {
      if (this._isPanelOpen(name, panel)) open.push(name);
    }
    return open;
  }
  _emitPerPanelEvents() {
    for (const [name, panel] of this._panelInstances) {
      const isOpen = this._isPanelOpen(name, panel);
      if (this._lastOpenByPanel.get(name) === isOpen) continue;
      this._lastOpenByPanel.set(name, isOpen);
      const payload = { name, isOpen };
      this.events.emit('panelToggled', payload);
      EventBus.emit(PANEL_TOGGLED_EVENT, payload);
    }
  }
  _emitPanelStateChanged(force = false) {
    this._syncReputationBarsVisibility();
    this._scheduleFallbackCheck();
    if (!this.isHudReady && !force) return;
    this._emitPerPanelEvents();
    const openPanels = this.getOpenPanels();
    const state = {
      gameplaySceneKey: this.currentGameplaySceneKey,
      anyPanelOpen: openPanels.length > 0, openPanels, ready: this.isHudReady
    };
    const previous = this._lastPanelState;
    if (!force && previous && previous.gameplaySceneKey === state.gameplaySceneKey &&
      previous.anyPanelOpen === state.anyPanelOpen && previous.ready === state.ready &&
      previous.openPanels.join('|') === openPanels.join('|')) return;
    this._lastPanelState = state;
    this.events.emit('panelStateChanged', state);
    EventBus.emit(PANEL_STATE_EVENT, state);
  }

  setCurrentGameplayScene(sceneKey) {
    if (!sceneKey || HUD_OVERLAY_SCENES.has(sceneKey)) return;
    this.currentGameplaySceneKey = sceneKey;
    this.updateCrimeBoardMenuAvailability();
    if (HUD_ALLOWED_SCENES.has(sceneKey)) this.showHud();
    else this.hideHud();
    this._emitPanelStateChanged(true);
  }
  updateCrimeBoardMenuAvailability() {
    const available = this.isCrimeBoardAvailable();
    this._panelInstances.get('playerMenu')?.setCrimeBoardAvailable?.(available);
    if (!available) this._panelInstances.get('crimeBoardUI')?.close?.();
  }
  isCrimeBoardAvailable() { return CRIME_BOARD_ALLOWED_SCENES.has(this.currentGameplaySceneKey); }
  openCrimeBoard() {
    if (!this.isCrimeBoardAvailable()) {
      console.warn('[PlayerHudScene] Crime Board is available only in OfficeScene or HotelScene.');
      return false;
    }
    this.closeAllUIPanels();
    const panel = this.crimeBoardUI;
    panel?.open?.(this.gameState);
    this._emitPanelStateChanged();
    return Boolean(panel?.isOpen);
  }
  openInventory() {
    if (this._cleanupDone || !this.sys.isActive()) return false;
    this.closeAllUIPanels();
    const panel = this.inventoryUI;
    if (!this._initializeInventoryPanel(panel)) return false;
    panel.open();
    this._emitPanelStateChanged();
    return Boolean(panel.isVisible);
  }
  showHud() {
    if (!this.isHudReady) return;
    this._hudVisible = true;
    this.scene.setVisible(true);
    this.scene.bringToTop();
    this._retryInventoryInitialization();
    this._scheduleFallbackCheck();
    this.refreshUI();
  }
  hideHud() {
    this._hudVisible = false;
    this._stopFallbackCheck();
    if (!this.isHudReady) return;
    this.closeAllUIPanels();
    this._panelInstances.get('playerMenu')?.close?.();
    this.scene.setVisible(false);
    this._emitPanelStateChanged(true);
  }
  onWake() {
    this._fallbackSuspended = false;
    this._retryInventoryInitialization();
    this.updateCrimeBoardMenuAvailability();
    const key = this.currentGameplaySceneKey;
    if (key && !HUD_ALLOWED_SCENES.has(key)) this.hideHud();
    else this.showHud();
    this._emitPanelStateChanged(true);
  }
  onHudInactive() {
    this._fallbackSuspended = true;
    this._stopFallbackCheck();
  }
  closeAllUIPanels() {
    for (const [name, panel] of this._panelInstances) {
      if (name === 'playerMenu') continue;
      if (name === 'dialogManager') panel.dialogUI?.close?.();
      else panel.close?.();
      if (name === 'inventoryUI') panel.dragController?.cancel(false);
    }
    this._emitPanelStateChanged();
  }
  closeAllUIPanelsAndFlushInput() {
    this.closeAllUIPanels();
    const input = this.input;
    if (typeof input?.resetPointers === 'function') input.resetPointers();
    else {
      const manager = input?.manager;
      const pointers = new Set([
        ...(Array.isArray(manager?.pointers) ? manager.pointers : []),
        manager?.activePointer, manager?.mousePointer, input?.activePointer
      ]);
      for (const pointer of pointers) pointer?.reset?.();
    }
    input?.keyboard?.resetKeys?.();
    this._panelInstances.get('playerMenu')?.updateMenuInteractivity?.();
  }
  isAnyPanelOpen() { return this.getOpenPanels().length > 0; }
  debugPanelStatus() {
    const inventory = this._panelInstances.get('inventoryUI');
    const status = {
      ready: this.isHudReady, gameplayScene: this.currentGameplaySceneKey,
      createdPanels: [...this._panelInstances.keys()],
      loadedClasses: [...panelClassCache.keys()], pendingImports: [...panelClassPromises.keys()],
      missingPanels: PANEL_NAMES.filter(name => !this._panelInstances.has(name)),
      openPanels: this.getOpenPanels(), anyPanelOpen: this.isAnyPanelOpen(),
      reputationBarsCreated: Boolean(this.reputationBars),
      reputationBarsVisible: Boolean(this.reputationBars?.root?.visible),
      fallbackCheckEnabled: Boolean(this._fallbackTimer),
      fallbackNeeded: this._fallbackNeeded, fallbackDelay: this._fallbackDelay,
      inventoryInitialized: Boolean(inventory?._initialized),
      inventoryDestroyed: Boolean(inventory?._destroyed),
      sleepStoryInFlight: this._sleepStoryInFlight,
      bootError: this._bootError ? String(this._bootError) : null
    };
    console.table(status);
    return status;
  }
  onShutdown() {
    this._releaseSleepStory?.();
    this._bootToken++;
    this._stopFallbackCheck();
    this._fallbackNeeded = false;
    this._fallbackSuspended = true;
    this._unbindHudLifecycle();
    this.reputationBars?.destroy();
    this.reputationBars = null;
    this._hudVisible = false;
    this._allowPanelCreation = false;
    this.isHudReady = false;
    this._sleepStoryInFlight = false;
    for (const restore of this._propertyRestorers) {
      try { restore(); }
      catch (error) { console.warn('[PlayerHudScene] Property cleanup failed:', error); }
    }
    this._propertyRestorers = [];
    for (const [name, panel] of this._panelInstances) {
      try {
        if (name === 'dialogManager' && typeof panel.destroy !== 'function') panel.dialogUI?.destroy?.();
        else panel.destroy?.();
      } catch (error) { console.warn(`[PlayerHudScene] Cleanup failed for "${name}":`, error); }
    }
    for (const [name, wasOpen] of this._lastOpenByPanel) {
      if (!wasOpen) continue;
      this._lastOpenByPanel.set(name, false);
      const payload = { name, isOpen: false };
      this.events.emit('panelToggled', payload);
      EventBus.emit(PANEL_TOGGLED_EVENT, payload);
    }
    this._panelInstances.clear();
    this._creatingPanels.clear();
    this._lastOpenByPanel.clear();
    this._observedPanels = new WeakSet();
    this.currentGameplaySceneKey = null;
    this._emitPanelStateChanged(true);
  }
}
