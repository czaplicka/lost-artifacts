import { audioManager } from '../../managers/AudioManager.js';

export class OfficeHotspotManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.debugEnabled = options.debugEnabled === true;

    this.hotspots = [];
    this.debugGraphics = null;
    this.debugTexts = [];
    this.isLocked = false;
  }

  create(definitions = []) {
    definitions.forEach((data) => {
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

      this.hotspots.push(zone);
    });

    if (this.debugEnabled) {
      this.createDebugOverlay();
    }

    return this.hotspots;
  }

  handlePointerOver(data) {
    if (this.isLocked || !data) {
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
    this.scene.navigation?.hideHint();
  }

  handlePointerDown(data) {
    if (this.isLocked || !data) {
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
    this.isLocked = locked;

    this.hotspots.forEach((zone) => {
      if (!zone?.scene) {
        return;
      }

      if (locked) {
        zone.disableInteractive();
      } else {
        zone.setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });
      }
    });

    if (locked) {
      this.scene.navigation?.hideHint();
    }
  }

  findById(hotspotId) {
    return this.hotspots.find(
      (zone) => zone?.hotspotData?.id === hotspotId
    );
  }

  createDebugOverlay() {
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.lineStyle(2, 0x00ffcc, 0.95);

    this.hotspots.forEach((zone) => {
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

  destroy() {
    this.hotspots.forEach((zone) => {
      zone?.removeAllListeners();
      zone?.destroy();
    });

    this.hotspots = [];

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach((text) => {
      text?.destroy();
    });

    this.debugTexts = [];
  }
}