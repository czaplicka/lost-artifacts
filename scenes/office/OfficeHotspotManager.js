import { audioManager } from '../../managers/AudioManager.js';

const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

export class OfficeHotspotManager {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.debugEnabled =
      LOCAL_DEBUG_ALLOWED &&
      options.debugEnabled === true;

    this.hotspots = [];
    this.debugGraphics = null;
    this.debugTexts = [];
    this.isLocked = false;

    this._destroyed = false;
    this._debugKeyboard = null;

    this._onDebugKeyDown = event => {
      if (
        this._destroyed ||
        !LOCAL_DEBUG_ALLOWED ||
        !this.scene?.sys?.isActive() ||
        event?.repeat
      ) {
        return;
      }

      const target = event?.target;
      const tagName = target?.tagName?.toLowerCase();

      if (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (event?.ctrlKey || event?.altKey || event?.metaKey) {
        return;
      }

      this.toggleDebug();
    };
  }

  create(definitions = []) {
    if (this._destroyed) {
      return [];
    }

    definitions.forEach(data => {
      const zone = this.scene.add
        .zone(data.x, data.y, data.width, data.height)
        .setOrigin(0, 0)
        .setDepth(50)
        .setName(`hotspot-${data.id}`)
        .setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });

      zone.hotspotData = data;

      zone.on('pointerover', () => {
        this.handlePointerOver(data);
      });

      zone.on('pointerout', () => {
        this.handlePointerOut();
      });

      zone.on('pointerdown', () => {
        this.handlePointerDown(data);
      });

      if (this.isLocked) {
        zone.disableInteractive();
      }

      this.hotspots.push(zone);
    });

    this.bindDebugKeyboard();

    if (this.debugEnabled) {
      this.createDebugOverlay();
    }

    return this.hotspots;
  }

  bindDebugKeyboard() {
    this.unbindDebugKeyboard();

    if (
      this._destroyed ||
      !LOCAL_DEBUG_ALLOWED ||
      !this.scene?.input?.keyboard
    ) {
      return;
    }

    this._debugKeyboard = this.scene.input.keyboard;

    this._debugKeyboard.on(
      'keydown-D',
      this._onDebugKeyDown
    );
  }

  unbindDebugKeyboard() {
    this._debugKeyboard?.off(
      'keydown-D',
      this._onDebugKeyDown
    );

    this._debugKeyboard = null;
  }

  toggleDebug() {
    return this.setDebugEnabled(!this.debugEnabled);
  }

  setDebugEnabled(enabled) {
    if (this._destroyed) {
      return false;
    }

    this.debugEnabled =
      LOCAL_DEBUG_ALLOWED &&
      enabled === true;

    this.scene.DEBUG_HOTSPOTS = this.debugEnabled;

    if (this.debugEnabled) {
      this.createDebugOverlay();
    } else {
      this.destroyDebugOverlay();
    }

    return this.debugEnabled;
  }

  handlePointerOver(data) {
    if (this._destroyed || this.isLocked || !data) {
      return;
    }

    if (data.label) {
      this.scene.navigation?.showHint(data.label);
    }

    if (data.monologueKey) {
      this.scene.monologue?.sayRandom(data.monologueKey, {
        cooldownKey: `hotspot-hover:${data.id}`,
        cooldownMs: 2500,
        queue: false
      });
    }
  }

  handlePointerOut() {
    if (this._destroyed) {
      return;
    }

    this.scene.navigation?.hideHint();
  }

  handlePointerDown(data) {
    if (this._destroyed || this.isLocked || !data) {
      return;
    }

    const tutorialAllowsInteraction =
      this.scene.tutorialController?.canUseHotspot(data.id);

    if (tutorialAllowsInteraction === false) {
      console.warn(
        `[OfficeHotspotManager] Hotspot "${data.id}" blocked by tutorial.`
      );

      return;
    }

    audioManager.playSfx('click_sound');

    try {
      data.action?.();
    } catch (error) {
      console.error(
        `[OfficeHotspotManager] Failed to execute hotspot "${data.id}".`,
        error
      );
    }
  }

  setLocked(locked) {
    if (this._destroyed) {
      return;
    }

    this.isLocked = Boolean(locked);

    this.hotspots.forEach(zone => {
      if (!zone?.scene) {
        return;
      }

      if (this.isLocked) {
        zone.disableInteractive();
      } else {
        zone.setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });
      }
    });

    if (this.isLocked) {
      this.scene.navigation?.hideHint();
    }
  }

  findById(hotspotId) {
    return this.hotspots.find(
      zone => zone?.hotspotData?.id === hotspotId
    );
  }

  createDebugOverlay() {
    if (
      this._destroyed ||
      !LOCAL_DEBUG_ALLOWED ||
      !this.debugEnabled
    ) {
      return;
    }

    this.destroyDebugOverlay();

    this.debugGraphics = this.scene.add
      .graphics()
      .setDepth(998);

    this.debugGraphics.lineStyle(
      2,
      0x00ffcc,
      0.95
    );

    this.hotspots.forEach(zone => {
      if (!zone?.scene) {
        return;
      }

      const data = zone.hotspotData;

      if (!data) {
        return;
      }

      this.debugGraphics.strokeRect(
        data.x,
        data.y,
        data.width,
        data.height
      );

      const label = this.scene.add
        .text(data.x + 8, data.y + 8, data.id, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: {
            left: 4,
            right: 4,
            top: 2,
            bottom: 2
          }
        })
        .setDepth(999);

      this.debugTexts.push(label);
    });
  }

  destroyDebugOverlay() {
    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach(text => {
      text?.destroy();
    });

    this.debugTexts = [];
  }

  destroy() {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;

    this.unbindDebugKeyboard();
    this.destroyDebugOverlay();

    this.hotspots.forEach(zone => {
      zone?.removeAllListeners();
      zone?.destroy();
    });

    this.hotspots = [];
    this.scene = null;
  }
}