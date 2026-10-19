import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';
import { CaseFileUI } from '../ui/CaseFileUI.js';
import { NotesUI } from '../ui/NotesUI.js';
import { WarrantUI } from '../ui/WarrantUI.js';
import { DestinationsUI } from '../ui/DestinationsUI.js';
import { CrimeBoardUI } from '../ui/CrimeBoardUI.js';
import { AtlasUI } from '../ui/AtlasUI.js';
import { PhonebookUI } from '../ui/PhonebookUI.js';
import { PassportUI } from '../ui/PassportUI.js';
import { DialogManager } from '../dialogues/DialogManager.js';
import { InventoryPanelUI } from '../ui/InventoryPanelUI.js';
import { BaseScene } from './BaseScene.js';

const HUD_ALLOWED_SCENES = new Set([
  'GameScene', 'OfficeScene', 'CityScene', 'CrimeCityScene',
  'LocationScene', 'HiddenObjectsScene', 'CrimeLabScene',
  'InventoryScene', 'HotelScene', 'ShopScene'
]);
const HUD_OVERLAY_SCENES = new Set(['PlayerHudScene', 'NewsHud']);
const CRIME_BOARD_ALLOWED_SCENES = new Set(['OfficeScene', 'HotelScene']);
const PANEL_STATE_EVENT = 'hud:panel-state-changed';
const PANEL_NAMES = [
  'caseFileUI', 'notesUI', 'warrantUI', 'destinationsUI', 'playerMenu',
  'crimeBoardUI', 'atlasUI', 'phoneUI', 'passportUI', 'dialogManager', 'inventoryUI'
];
const HOTKEY_PANELS = [
  'playerMenu', 'caseFileUI', 'notesUI', 'warrantUI', 'destinationsUI',
  'crimeBoardUI', 'atlasUI', 'phoneUI', 'inventoryUI'
];

export class PlayerHudScene extends BaseScene {
  constructor() {
    super({ key: 'PlayerHudScene' });
    this.gameState = gameState;
    this.isHudReady = false;
    this.currentGameplaySceneKey = null;
    this._allowPanelCreation = false;
    this._creatingPanels = new Set();
    this._panelInstances = new Map();
    this._observedPanels = new WeakSet();
    this._propertyRestorers = [];
    this._fallbackTimer = null;
    this._lastPanelState = null;
    this._sleepStoryInFlight = false;
    for (const name of PANEL_NAMES) {
      Object.defineProperty(this, name, {
        configurable: true, enumerable: true, get: () => this._getPanel(name)
      });
    }
  }
  create() {
    super.create();
    this.gameState = gameState;
    this.isHudReady = false;
    this.currentGameplaySceneKey = null;
    this._lastPanelState = null;
    this._sleepStoryInFlight = false;
    this._allowPanelCreation = true;
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.events.off(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this.onBus('firstForcedSleepStory', this._handleFirstForcedSleepStory, this);
    for (const name of HOTKEY_PANELS) this._getPanel(name);
    this.isHudReady = true;
    this.scene.setVisible(true);
    this.scene.bringToTop();
    this.updateCrimeBoardMenuAvailability();
    this._emitPanelStateChanged(true);
    this.events.emit('hud-ready', this);
  }
  async _handleFirstForcedSleepStory(payload = {}) {
    if (this._cleanupDone || this._sleepStoryInFlight) return;
    const sceneKey = payload.sceneKey || 'HollyIntroScene';
    if (!this.hasScene(sceneKey)) {
      console.warn(`[PlayerHudScene] Story scene "${sceneKey}" is not registered.`);
      return;
    }
    if (this.isSceneRunning(sceneKey)) {
      this.bringSceneToTopIfActive(sceneKey); return;
    }
    this._sleepStoryInFlight = true;
    try {
      this.closeAllUIPanels();
      await this.launchStoryOverlay(sceneKey, { ...payload, source: 'forced_sleep' });
    } catch (error) {
      console.warn('[PlayerHudScene] Failed to launch sleep story:', error);
    } finally { this._sleepStoryInFlight = false; }
  }
  _getPanel(name) {
    if (this._panelInstances.has(name)) return this._panelInstances.get(name);
    if (!this._allowPanelCreation || this._cleanupDone) return null;
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
      if (name === 'inventoryUI') panel.create();
      if (name === 'phoneUI') {
        panel.setOnCall((key, contact) => this.dialogManager?.startDialog(key, contact));
      }
      if (name === 'playerMenu') panel.setCrimeBoardAvailable?.(this.isCrimeBoardAvailable());
      this._emitPanelStateChanged();
      return panel;
    } finally { this._creatingPanels.delete(name); }
  }
  _createPanel(name) {
    switch (name) {
      case 'caseFileUI': return new CaseFileUI(this);
      case 'notesUI': return new NotesUI(this);
      case 'warrantUI': return new WarrantUI(this);
      case 'destinationsUI': return new DestinationsUI(this);
      case 'playerMenu': return new PlayerMenuUI(this, this.gameState);
      case 'crimeBoardUI': return new CrimeBoardUI(this);
      case 'atlasUI': return new AtlasUI(this, this.cache.json.get('atlas') || []);
      case 'phoneUI': return new PhonebookUI(this, this.gameState);
      case 'passportUI': return new PassportUI(this);
      case 'dialogManager': return new DialogManager(this, this.gameState);
      case 'inventoryUI': return new InventoryPanelUI(this);
      default: return null;
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
        const previous = value; value = nextValue;
        if (previous !== nextValue) onChange(nextValue, previous);
      }
    });
    this._propertyRestorers.push(() => {
      Object.defineProperty(object, key, descriptor
        ? { ...descriptor, value }
        : { configurable: true, enumerable: true, writable: true, value });
    });
    return true;
  }
  _observePanel(panel, name) {
    if (!panel || this._observedPanels.has(panel)) return;
    this._observedPanels.add(panel);
    if (!this._observeProperty(panel, 'isOpen', () => this._emitPanelStateChanged())) {
      console.warn(`[PlayerHudScene] "${name}.isOpen": enabling fallback check.`);
      this._enableFallbackCheck();
    }
  }
  _observeDialogManager(manager) {
    const observeDialog = dialog => {
      if (dialog) this._observePanel(dialog, 'dialogManager.dialogUI');
      this._emitPanelStateChanged();
    };
    observeDialog(manager.dialogUI);
    if (!this._observeProperty(manager, 'dialogUI', observeDialog)) this._enableFallbackCheck();
  }
  _enableFallbackCheck() {
    if (this._fallbackTimer) return;
    this._fallbackTimer = this.time.addEvent({
      delay: 150, loop: true, callback: () => {
        const manager = this._panelInstances.get('dialogManager');
        if (manager?.dialogUI) this._observePanel(manager.dialogUI, 'dialogManager.dialogUI');
        this._emitPanelStateChanged();
      }
    });
  }
  _emitPanelStateChanged(force = false) {
    if (!this.isHudReady && !force) return;
    const state = {
      gameplaySceneKey: this.currentGameplaySceneKey,
      anyPanelOpen: this.isAnyPanelOpen(), ready: this.isHudReady
    };
    const previous = this._lastPanelState;
    if (!force && previous && previous.gameplaySceneKey === state.gameplaySceneKey &&
      previous.anyPanelOpen === state.anyPanelOpen && previous.ready === state.ready) return;
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
  isCrimeBoardAvailable() {
    return CRIME_BOARD_ALLOWED_SCENES.has(this.currentGameplaySceneKey);
  }
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
    this.closeAllUIPanels();
    const panel = this.inventoryUI;
    panel?.open?.();
    this._emitPanelStateChanged();
    return Boolean(panel?.isOpen);
  }
  showHud() {
    if (!this.isHudReady) return;
    this.scene.setVisible(true);
    this.scene.bringToTop();
  }
  hideHud() {
    if (!this.isHudReady) return;
    this.closeAllUIPanels();
    this._panelInstances.get('playerMenu')?.close?.();
    this.scene.setVisible(false);
    this._emitPanelStateChanged();
  }
  onWake() {
    this.updateCrimeBoardMenuAvailability();
    this.showHud();
    this._emitPanelStateChanged(true);
  }
  closeAllUIPanels() {
    for (const [name, panel] of this._panelInstances) {
      if (name === 'playerMenu') continue;
      if (name === 'dialogManager') panel.dialogUI?.close?.();
      else panel.close?.();
    }
    this._emitPanelStateChanged();
  }
  closeAllUIPanelsAndFlushInput() {
    this.closeAllUIPanels();
    if (this.input?.manager?.pointer) this.input.manager.pointer.cancelled = true;
    this._panelInstances.get('playerMenu')?.updateMenuInteractivity?.();
  }
  isAnyPanelOpen() {
    for (const [name, panel] of this._panelInstances) {
      if (name === 'dialogManager') { if (panel.dialogUI?.isOpen) return true; }
      else if (panel.isOpen) return true;
    }
    return false;
  }
  debugPanelStatus() {
    return { ready: this.isHudReady, gameplayScene: this.currentGameplaySceneKey,
      createdPanels: [...this._panelInstances.keys()], anyPanelOpen: this.isAnyPanelOpen(),
      fallbackCheckEnabled: Boolean(this._fallbackTimer) };
  }
  onShutdown() {
    if (!this._allowPanelCreation && this._panelInstances.size === 0) return;
    this._allowPanelCreation = false;
    this.isHudReady = false;
    this._sleepStoryInFlight = false;
    this._fallbackTimer?.remove(false);
    this._fallbackTimer = null;
    for (const restore of this._propertyRestorers) {
      try { restore(); } catch (error) { console.warn('[PlayerHudScene] Property cleanup failed:', error); }
    }
    this._propertyRestorers = [];
    for (const [name, panel] of this._panelInstances) {
      try {
        if (name === 'dialogManager') {
          if (typeof panel.destroy === 'function') panel.destroy();
          else panel.dialogUI?.destroy?.();
        } else panel.destroy?.();
      } catch (error) { console.warn(`[PlayerHudScene] Cleanup failed for "${name}":`, error); }
    }
    this._panelInstances.clear();
    this._creatingPanels.clear();
    this._observedPanels = new WeakSet();
    this.currentGameplaySceneKey = null;
    this.events.off(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
    this._emitPanelStateChanged(true);
  }
}