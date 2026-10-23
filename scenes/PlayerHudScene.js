import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { BaseScene } from './BaseScene.js';
import { createReputationBars } from '../ui/ReputationBars.js';

const HUD_ALLOWED_SCENES = new Set([
  'GameScene',
  'OfficeScene',
  'CityScene',
  'CrimeCityScene',
  'LocationScene',
  'HiddenObjectsScene',
  'CrimeLabScene',
  'InventoryScene',
  'HotelScene',
  'ShopScene',
  'ApartmentScene'
]);

const HUD_OVERLAY_SCENES = new Set([
  'PlayerHudScene',
  'NewsHud'
]);

const CRIME_BOARD_ALLOWED_SCENES = new Set([
  'OfficeScene',
  'HotelScene'
]);

const REPUTATION_BARS_LAYOUT = {
  right: 24,
  y: 120,
  width: 248,
  depth: 100
};

const PANEL_STATE_EVENT = 'hud:panel-state-changed';
const PANEL_TOGGLED_EVENT = 'hud:panel-toggled';

const PANEL_LOADERS = {
  caseFileUI: () =>
    import('../ui/CaseFileUI.js').then(m => m.CaseFileUI),

  notesUI: () =>
    import('../ui/NotesUI.js').then(m => m.NotesUI),

  warrantUI: () =>
    import('../ui/WarrantUI.js').then(m => m.WarrantUI),

  destinationsUI: () =>
    import('../ui/DestinationsUI.js').then(m => m.DestinationsUI),

  playerMenu: () =>
    import('../ui/PlayerMenuUI.js').then(m => m.PlayerMenuUI),

  crimeBoardUI: () =>
    import('../ui/CrimeBoardUI.js').then(m => m.CrimeBoardUI),

  atlasUI: () =>
    import('../ui/AtlasUI.js').then(m => m.AtlasUI),

  phoneUI: () =>
    import('../ui/PhonebookUI.js').then(m => m.PhonebookUI),

  passportUI: () =>
    import('../ui/PassportUI.js').then(m => m.PassportUI),

  dialogManager: () =>
    import('../dialogues/DialogManager.js').then(m => m.DialogManager),

  inventoryUI: () =>
    import('../ui/InventoryUI.js').then(({ InventoryUI }) => {
      return class HudInventoryUI extends InventoryUI {
        attachKeyListener() {
          this.scene.input.keyboard?.on(
            'keydown-ESC',
            this.handleKeyEsc,
            this
          );
        }

        get isOpen() {
          return this.isVisible;
        }
      };
    })
};

const PANEL_NAMES = Object.keys(PANEL_LOADERS);

const HOTKEY_PANELS = [
  'playerMenu',
  'caseFileUI',
  'notesUI',
  'warrantUI',
  'destinationsUI',
  'crimeBoardUI',
  'atlasUI',
  'phoneUI',
  'inventoryUI'
];

const panelClassCache = new Map();
const panelClassPromises = new Map();

function loadPanelClass(name) {
  if (panelClassCache.has(name)) {
    return Promise.resolve(panelClassCache.get(name));
  }

  if (panelClassPromises.has(name)) {
    return panelClassPromises.get(name);
  }

  const loader = PANEL_LOADERS[name];

  if (!loader) {
    return Promise.resolve(null);
  }

  const promise = loader()
    .then(PanelClass => {
      panelClassCache.set(name, PanelClass);
      return PanelClass;
    })
    .catch(error => {
      console.error(
        `[PlayerHudScene] Failed to import panel "${name}":`,
        error
      );

      return null;
    })
    .finally(() => {
      panelClassPromises.delete(name);
    });

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
    this._lastPanelState = null;
    this._lastOpenByPanel = new Map();

    this._sleepStoryInFlight = false;
    this._bootToken = 0;
    this._bootError = null;

    for (const name of PANEL_NAMES) {
      Object.defineProperty(this, name, {
        configurable: true,
        enumerable: true,
        get: () => this._getPanel(name)
      });
    }
  }

  create() {
    super.create();

    this.gameState = gameState;
    this.isHudReady = false;

    this.currentGameplaySceneKey =
      this.currentGameplaySceneKey || null;

    this._lastPanelState = null;
    this._lastOpenByPanel.clear();

    this._sleepStoryInFlight = false;
    this._bootError = null;
    this._allowPanelCreation = true;
    this._hudVisible = false;

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.onWake,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.onShutdown,
      this
    );

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.onWake,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.onShutdown,
      this
    );

    this.onBus(
      'firstForcedSleepStory',
      this._handleFirstForcedSleepStory,
      this
    );

    this._createReputationBars();

    this._bootPanels();
  }

  _createReputationBars() {
    this.reputationBars?.destroy();
    this.reputationBars = null;

    this.reputationBars = createReputationBars(
      this,
      REPUTATION_BARS_LAYOUT
    );

    this.reputationBars.root.setVisible(false);
  }

  _syncReputationBarsVisibility() {
    if (!this.reputationBars?.root) return;

    const key = this.currentGameplaySceneKey;

    const sceneAllowed =
      !key || HUD_ALLOWED_SCENES.has(key);

    const visible =
      this.isHudReady &&
      this._allowPanelCreation &&
      this._hudVisible &&
      sceneAllowed &&
      !this.isAnyPanelOpen();

    this.reputationBars.root.setVisible(visible);
  }

  refreshUI() {
    this.reputationBars?.refresh();
    this._syncReputationBarsVisibility();
  }

  refreshNotebook() {
    this.refreshUI();
  }

  async _bootPanels() {
    const token = ++this._bootToken;

    try {
      const classes = await Promise.all(
        PANEL_NAMES.map(loadPanelClass)
      );

      const failed = PANEL_NAMES.filter(
        (name, index) => !classes[index]
      );

      if (failed.length) {
        throw new Error(
          `Failed to load panels: ${failed.join(', ')}`
        );
      }
    } catch (error) {
      if (token !== this._bootToken) return;

      this._bootError = error;

      console.error(
        '[PlayerHudScene] Panel import failed:',
        error
      );
    }

    if (
      token !== this._bootToken ||
      this._cleanupDone ||
      !this._allowPanelCreation
    ) {
      return;
    }

    for (const name of HOTKEY_PANELS) {
      if (panelClassCache.has(name)) {
        this._getPanel(name);
      }
    }

    this.isHudReady = true;

    const key = this.currentGameplaySceneKey;

    if (key && !HUD_ALLOWED_SCENES.has(key)) {
      this.hideHud();
    } else {
      this.showHud();
    }

    this.updateCrimeBoardMenuAvailability();
    this._emitPanelStateChanged(true);

    this.events.emit('hud-ready', this);
  }

  async ensurePanel(name) {
    if (!PANEL_LOADERS[name]) return null;

    const token = this._bootToken;
    const PanelClass = await loadPanelClass(name);

    if (
      !PanelClass ||
      token !== this._bootToken ||
      !this._allowPanelCreation ||
      this._cleanupDone
    ) {
      return null;
    }

    return this._getPanel(name);
  }

  async _handleFirstForcedSleepStory(payload = {}) {
    if (
      this._cleanupDone ||
      this._sleepStoryInFlight
    ) {
      return;
    }

    const sceneKey = payload.sceneKey || 'HollyIntroScene';

    if (!this.hasScene(sceneKey)) {
      console.warn(
        `[PlayerHudScene] Story scene "${sceneKey}" is not registered.`
      );

      return;
    }

    if (this.isSceneRunning(sceneKey)) {
      this.bringSceneToTopIfActive(sceneKey);
      return;
    }

    this._sleepStoryInFlight = true;

    try {
      this.closeAllUIPanels();

      await this.launchStoryOverlay(sceneKey, {
        ...payload,
        source: 'forced_sleep'
      });
    } catch (error) {
      console.warn(
        '[PlayerHudScene] Failed to launch sleep story:',
        error
      );
    } finally {
      this._sleepStoryInFlight = false;
    }
  }

  _getPanel(name) {
    if (!PANEL_LOADERS[name]) return null;

    if (this._panelInstances.has(name)) {
      return this._panelInstances.get(name);
    }

    if (
      !this._allowPanelCreation ||
      this._cleanupDone
    ) {
      return null;
    }

    if (!panelClassCache.has(name)) {
      const token = this._bootToken;

      loadPanelClass(name).then(PanelClass => {
        if (
          PanelClass &&
          token === this._bootToken &&
          this._allowPanelCreation &&
          !this._cleanupDone
        ) {
          this._getPanel(name);
        }
      });

      return null;
    }

    if (this._creatingPanels.has(name)) {
      console.warn(
        `[PlayerHudScene] Recursive panel construction: "${name}".`
      );

      return null;
    }

    this._creatingPanels.add(name);

    try {
      const panel = this._createPanel(name);

      if (!panel) return null;

      this._panelInstances.set(name, panel);

      if (name === 'dialogManager') {
        this._observeDialogManager(panel);
      } else {
        this._observePanel(panel, name);
      }

      if (name === 'inventoryUI') {
        panel.initialize();
      }

      if (name === 'phoneUI') {
        panel.setOnCall((key, contact) => {
          this.dialogManager?.startDialog(key, contact);
        });
      }

      if (name === 'playerMenu') {
        panel.setCrimeBoardAvailable?.(
          this.isCrimeBoardAvailable()
        );
      }

      this._emitPanelStateChanged();

      return panel;
    } finally {
      this._creatingPanels.delete(name);
    }
  }

  _createPanel(name) {
    const PanelClass = panelClassCache.get(name);

    if (!PanelClass) return null;

    switch (name) {
      case 'playerMenu':
      case 'phoneUI':
      case 'dialogManager':
        return new PanelClass(this, this.gameState);

      case 'atlasUI':
        return new PanelClass(
          this,
          this.cache.json.get('atlas') || []
        );

      default:
        return new PanelClass(this);
    }
  }

  _observeProperty(object, key, onChange) {
    const descriptor = Object.getOwnPropertyDescriptor(
      object,
      key
    );

    if (
      descriptor &&
      (
        !descriptor.configurable ||
        !Object.prototype.hasOwnProperty.call(
          descriptor,
          'value'
        ) ||
        !descriptor.writable
      )
    ) {
      return false;
    }

    if (!descriptor) {
      let prototype = Object.getPrototypeOf(object);

      while (prototype) {
        if (
          Object.getOwnPropertyDescriptor(
            prototype,
            key
          )
        ) {
          return false;
        }

        prototype = Object.getPrototypeOf(prototype);
      }
    }

    let value = object[key];

    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: descriptor?.enumerable ?? true,

      get() {
        return value;
      },

      set(nextValue) {
        const previous = value;
        value = nextValue;

        if (previous !== nextValue) {
          onChange(nextValue, previous);
        }
      }
    });

    this._propertyRestorers.push(() => {
      Object.defineProperty(
        object,
        key,
        descriptor
          ? {
              ...descriptor,
              value
            }
          : {
              configurable: true,
              enumerable: true,
              writable: true,
              value
            }
      );
    });

    return true;
  }

  _observePanel(panel, name) {
    if (
      !panel ||
      this._observedPanels.has(panel)
    ) {
      return;
    }

    this._observedPanels.add(panel);

    const property = name === 'inventoryUI'
      ? 'isVisible'
      : 'isOpen';

    const observed = this._observeProperty(
      panel,
      property,
      () => this._emitPanelStateChanged()
    );

    if (!observed) {
      console.warn(
        `[PlayerHudScene] "${name}.${property}": enabling fallback check.`
      );

      this._enableFallbackCheck();
    }
  }

  _observeDialogManager(manager) {
    const observeDialog = dialog => {
      if (dialog) {
        this._observePanel(
          dialog,
          'dialogManager.dialogUI'
        );
      }

      this._emitPanelStateChanged();
    };

    observeDialog(manager.dialogUI);

    if (
      !this._observeProperty(
        manager,
        'dialogUI',
        observeDialog
      )
    ) {
      this._enableFallbackCheck();
    }
  }

  _enableFallbackCheck() {
    if (this._fallbackTimer) return;

    this._fallbackTimer = this.time.addEvent({
      delay: 150,
      loop: true,

      callback: () => {
        const manager =
          this._panelInstances.get('dialogManager');

        if (manager?.dialogUI) {
          this._observePanel(
            manager.dialogUI,
            'dialogManager.dialogUI'
          );
        }

        this._emitPanelStateChanged();
      }
    });
  }

  _isPanelOpen(name, panel) {
    if (!panel) return false;

    if (name === 'dialogManager') {
      return Boolean(panel.dialogUI?.isOpen);
    }

    if (name === 'inventoryUI') {
      return Boolean(panel.isVisible);
    }

    return Boolean(panel.isOpen);
  }

  getOpenPanels() {
    const open = [];

    for (const [name, panel] of this._panelInstances) {
      if (this._isPanelOpen(name, panel)) {
        open.push(name);
      }
    }

    return open;
  }

  _emitPerPanelEvents() {
    for (const [name, panel] of this._panelInstances) {
      const isOpen = this._isPanelOpen(name, panel);

      if (
        this._lastOpenByPanel.get(name) === isOpen
      ) {
        continue;
      }

      this._lastOpenByPanel.set(name, isOpen);

      const payload = {
        name,
        isOpen
      };

      this.events.emit('panelToggled', payload);
      EventBus.emit(PANEL_TOGGLED_EVENT, payload);
    }
  }

  _emitPanelStateChanged(force = false) {
    this._syncReputationBarsVisibility();

    if (!this.isHudReady && !force) return;

    this._emitPerPanelEvents();

    const openPanels = this.getOpenPanels();

    const state = {
      gameplaySceneKey: this.currentGameplaySceneKey,
      anyPanelOpen: openPanels.length > 0,
      openPanels,
      ready: this.isHudReady
    };

    const previous = this._lastPanelState;

    if (
      !force &&
      previous &&
      previous.gameplaySceneKey === state.gameplaySceneKey &&
      previous.anyPanelOpen === state.anyPanelOpen &&
      previous.ready === state.ready &&
      previous.openPanels.join('|') === openPanels.join('|')
    ) {
      return;
    }

    this._lastPanelState = state;

    this.events.emit('panelStateChanged', state);
    EventBus.emit(PANEL_STATE_EVENT, state);
  }

  setCurrentGameplayScene(sceneKey) {
    if (
      !sceneKey ||
      HUD_OVERLAY_SCENES.has(sceneKey)
    ) {
      return;
    }

    this.currentGameplaySceneKey = sceneKey;

    this.updateCrimeBoardMenuAvailability();

    if (HUD_ALLOWED_SCENES.has(sceneKey)) {
      this.showHud();
    } else {
      this.hideHud();
    }

    this._emitPanelStateChanged(true);
  }

  updateCrimeBoardMenuAvailability() {
    const available = this.isCrimeBoardAvailable();

    this._panelInstances
      .get('playerMenu')
      ?.setCrimeBoardAvailable?.(available);

    if (!available) {
      this._panelInstances
        .get('crimeBoardUI')
        ?.close?.();
    }
  }

  isCrimeBoardAvailable() {
    return CRIME_BOARD_ALLOWED_SCENES.has(
      this.currentGameplaySceneKey
    );
  }

  openCrimeBoard() {
    if (!this.isCrimeBoardAvailable()) {
      console.warn(
        '[PlayerHudScene] Crime Board is available only in OfficeScene or HotelScene.'
      );

      return false;
    }

    this.closeAllUIPanels();

    const panel = this.crimeBoardUI;

    panel?.open?.(this.gameState);

    this._emitPanelStateChanged();

    return Boolean(panel?.isOpen);
  }

  openInventory() {
    this.closeAllUIPanels();

    const panel = this.inventoryUI;

    panel?.open?.();

    this._emitPanelStateChanged();

    return Boolean(panel?.isVisible);
  }

  showHud() {
    if (!this.isHudReady) return;

    this._hudVisible = true;

    this.scene.setVisible(true);
    this.scene.bringToTop();

    this.refreshUI();
  }

  hideHud() {
    if (!this.isHudReady) return;

    this._hudVisible = false;

    this.closeAllUIPanels();

    this._panelInstances
      .get('playerMenu')
      ?.close?.();

    this.scene.setVisible(false);

    this._emitPanelStateChanged(true);
  }

  onWake() {
    this.updateCrimeBoardMenuAvailability();

    const key = this.currentGameplaySceneKey;

    if (
      key &&
      !HUD_ALLOWED_SCENES.has(key)
    ) {
      this.hideHud();
    } else {
      this.showHud();
    }

    this._emitPanelStateChanged(true);
  }

  closeAllUIPanels() {
    for (const [name, panel] of this._panelInstances) {
      if (name === 'playerMenu') continue;

      if (name === 'dialogManager') {
        panel.dialogUI?.close?.();
      } else {
        panel.close?.();
      }

      if (name === 'inventoryUI') {
        panel.dragController?.cancel(false);
      }
    }

    this._emitPanelStateChanged();
  }

  closeAllUIPanelsAndFlushInput() {
    this.closeAllUIPanels();

    if (this.input?.manager?.pointer) {
      this.input.manager.pointer.cancelled = true;
    }

    this._panelInstances
      .get('playerMenu')
      ?.updateMenuInteractivity?.();
  }

  isAnyPanelOpen() {
    return this.getOpenPanels().length > 0;
  }

  debugPanelStatus() {
    const status = {
      ready: this.isHudReady,
      gameplayScene: this.currentGameplaySceneKey,

      createdPanels: [
        ...this._panelInstances.keys()
      ],

      loadedClasses: [
        ...panelClassCache.keys()
      ],

      pendingImports: [
        ...panelClassPromises.keys()
      ],

      missingPanels: PANEL_NAMES.filter(
        name => !this._panelInstances.has(name)
      ),

      openPanels: this.getOpenPanels(),
      anyPanelOpen: this.isAnyPanelOpen(),

      reputationBarsCreated: Boolean(
        this.reputationBars
      ),

      reputationBarsVisible: Boolean(
        this.reputationBars?.root?.visible
      ),

      fallbackCheckEnabled: Boolean(
        this._fallbackTimer
      ),

      bootError: this._bootError
        ? String(this._bootError)
        : null
    };

    console.table(status);

    return status;
  }

  onShutdown() {
    this._bootToken++;

    // Komponent ma własne sprzątanie na shutdown.
    // Jego destroy() jest zabezpieczone przed powtórzeniem.
    this.reputationBars?.destroy();
    this.reputationBars = null;
    this._hudVisible = false;

    if (
      !this._allowPanelCreation &&
      this._panelInstances.size === 0
    ) {
      return;
    }

    this._allowPanelCreation = false;
    this.isHudReady = false;
    this._sleepStoryInFlight = false;

    this._fallbackTimer?.remove(false);
    this._fallbackTimer = null;

    for (const restore of this._propertyRestorers) {
      try {
        restore();
      } catch (error) {
        console.warn(
          '[PlayerHudScene] Property cleanup failed:',
          error
        );
      }
    }

    this._propertyRestorers = [];

    for (const [name, panel] of this._panelInstances) {
      try {
        if (name === 'dialogManager') {
          if (typeof panel.destroy === 'function') {
            panel.destroy();
          } else {
            panel.dialogUI?.destroy?.();
          }
        } else {
          panel.destroy?.();
        }
      } catch (error) {
        console.warn(
          `[PlayerHudScene] Cleanup failed for "${name}":`,
          error
        );
      }
    }

    for (const [name, wasOpen] of this._lastOpenByPanel) {
      if (!wasOpen) continue;

      this._lastOpenByPanel.set(name, false);

      const payload = {
        name,
        isOpen: false
      };

      this.events.emit('panelToggled', payload);
      EventBus.emit(PANEL_TOGGLED_EVENT, payload);
    }

    this._panelInstances.clear();
    this._creatingPanels.clear();
    this._lastOpenByPanel.clear();

    this._observedPanels = new WeakSet();
    this.currentGameplaySceneKey = null;

    this.events.off(
      Phaser.Scenes.Events.WAKE,
      this.onWake,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this
    );

    this.events.off(
      Phaser.Scenes.Events.DESTROY,
      this.onShutdown,
      this
    );

    this._emitPanelStateChanged(true);
  }
}