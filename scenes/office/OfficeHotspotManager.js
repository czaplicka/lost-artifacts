import { audioManager } from '../../managers/AudioManager.js';
import { OfficeHotspotDebug, LOCAL_DEBUG_ALLOWED } from './OfficeHotspotDebug.js';

export class OfficeHotspotManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.debugEnabled = LOCAL_DEBUG_ALLOWED && options.debugEnabled === true;
    this.hotspots = [];
    this.debugGraphics = null;
    this.debugTexts = [];
    this.debugHelp = null;
    this.isLocked = false;
    this.selectedIndex = 0;
    this._destroyed = false;
    this._debugKeyboard = null;
    this._copyInFlight = false;
    this._statusText = '';
    this._actionRequest = null;
    this._onDebugKeyDown = event => this.handleDebugKey(event);
    this._onSceneEnd = () => this.destroy();
  }

  isSceneActive() {
    if (this._destroyed || !this.scene) return false;
    if (typeof this.scene.isOfficeActive === 'function') {
      return this.scene.isOfficeActive();
    }
    return this.scene.sys?.isActive?.() === true;
  }

  isInteractionLocked() {
    return this.isLocked || this._actionRequest !== null;
  }

  create(definitions = []) {
    if (this._destroyed || this.hotspots.length) return this.hotspots;
    for (const data of definitions) {
      const zone = this.scene.add.zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0).setDepth(50).setName(`hotspot-${data.id}`)
        .setInteractive({ useHandCursor: true, cursor: 'pointer' });
      zone.hotspotData = data;
      zone.on('pointerover', () => this.handlePointerOver(data));
      zone.on('pointerout', () => this.handlePointerOut());
      zone.on('pointerdown', () => {
        if (!this.isSceneActive()) return;
        if (this.debugEnabled) {
          if (this.isInteractionLocked()) return;
          this.selectedIndex = this.hotspots.indexOf(zone);
          this._statusText = '';
          this.createDebugOverlay();
          return;
        }
        void this.handlePointerDown(data);
      });
      if (LOCAL_DEBUG_ALLOWED) {
        zone.on('drag', (_pointer, x, y) => {
          if (!this.isSceneActive() || !this.debugEnabled || this.isInteractionLocked()) return;
          this.selectedIndex = this.hotspots.indexOf(zone);
          data.x = Math.round(x);
          data.y = Math.round(y);
          this._statusText = '';
          this.syncHotspot(zone);
          this.createDebugOverlay();
        });
      }
      this.hotspots.push(zone);
    }
    this.syncInteractivity();
    this.bindDebugKeyboard();
    this.scene.events.off('shutdown', this._onSceneEnd);
    this.scene.events.off('destroy', this._onSceneEnd);
    this.scene.events.once('shutdown', this._onSceneEnd);
    this.scene.events.once('destroy', this._onSceneEnd);
    this.scene.DEBUG_HOTSPOTS = this.debugEnabled;
    if (this.debugEnabled) this.createDebugOverlay();
    return this.hotspots;
  }

  syncHotspot(zone) {
    const data = zone?.hotspotData;
    if (!zone?.scene || !data) return;
    zone.setPosition(data.x, data.y);
    zone.setSize(data.width, data.height);
    zone.input?.hitArea?.setTo(0, 0, data.width, data.height);
  }

  syncInteractivity() {
    if (this._destroyed || !this.scene) return;
    const locked = this.isInteractionLocked();
    for (const zone of this.hotspots) {
      if (!zone?.scene) continue;
      if (locked) zone.disableInteractive();
      else if (zone.input) zone.input.enabled = true;
      else zone.setInteractive({ useHandCursor: true, cursor: 'pointer' });
      if (LOCAL_DEBUG_ALLOWED) {
        this.scene.input.setDraggable(zone, this.debugEnabled && !locked);
      }
    }
    if (locked) this.scene.navigation?.hideHint();
  }

  handlePointerOver(data) {
    if (!this.isSceneActive() || this.isInteractionLocked() || this.debugEnabled || !data) return;
    if (data.label) this.scene.navigation?.showHint(data.label);
    if (data.monologueKey) {
      this.scene.monologue?.sayRandom(data.monologueKey, {
        cooldownKey: `hotspot-hover:${data.id}`, cooldownMs: 2500, queue: false
      });
    }
  }

  handlePointerOut() {
    if (!this._destroyed) this.scene?.navigation?.hideHint();
  }

  async handlePointerDown(data) {
    if (!this.isSceneActive() || this.isInteractionLocked() || this.debugEnabled ||
        !data || typeof data.action !== 'function') return false;

    const scene = this.scene;
    const runToken = scene._runToken;
    const request = Symbol(data.id);
    const sameRun = () => !this._destroyed && this.scene === scene &&
      scene._runToken === runToken;

    this._actionRequest = request;
    try {
      // Refresh external UI locks; the local action lock does not alter scene.uiLocked.
      scene.refreshPanelLock?.();
      if (!sameRun() || !this.isSceneActive() || this.isLocked || scene.uiLocked) return false;
      this.syncInteractivity();

      const tutorial = typeof scene.firstCaseTutorial?.canUseHotspot === 'function'
        ? scene.firstCaseTutorial : scene.tutorialController;
      if (tutorial?.canUseHotspot?.(data.id) === false) return false;
      if (!sameRun() || !this.isSceneActive() || this.isLocked || scene.uiLocked) return false;

      audioManager.playSfx('click_sound');
      const result = await data.action();
      return sameRun() && result !== false;
    } catch (error) {
      console.error(`[OfficeHotspotManager] Failed to execute hotspot "${data.id}".`, error);
      return false;
    } finally {
      if (this._actionRequest === request) this._actionRequest = null;
      if (sameRun()) {
        // Let the opened panel keep its lock. Never force scene.uiLocked to false.
        try {
          if (this.isSceneActive()) scene.refreshPanelLock?.();
        } catch (error) {
          console.error('[OfficeHotspotManager] Lock refresh failed:', error);
        }
        this.syncInteractivity();
        if (this.debugEnabled && this.isSceneActive()) this.createDebugOverlay();
      }
    }
  }

  setLocked(locked) {
    if (this._destroyed) return;
    this.isLocked = Boolean(locked);
    this.syncInteractivity();
    if (this.debugEnabled) this.createDebugOverlay();
  }

  findById(hotspotId) {
    return this.hotspots.find(zone => zone?.hotspotData?.id === hotspotId);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._actionRequest = null;
    this.unbindDebugKeyboard();
    this.destroyDebugOverlay();
    this.scene?.events?.off('shutdown', this._onSceneEnd);
    this.scene?.events?.off('destroy', this._onSceneEnd);
    for (const zone of this.hotspots) {
      zone?.removeAllListeners();
      zone?.destroy();
    }
    if (this.scene) this.scene.DEBUG_HOTSPOTS = false;
    this.hotspots = [];
    this.scene = null;
  }
}

Object.assign(OfficeHotspotManager.prototype, OfficeHotspotDebug);
