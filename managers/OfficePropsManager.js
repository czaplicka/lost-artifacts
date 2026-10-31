import { createOfficeObjectDefinitions } from './scenes/pi-office/officeProps.js';

/**
 * OfficePropsManager
 * -----------------------------------------------------------------------
 * Spawns / removes interactive objects (secretary, computer, phone, ...)
 * on top of an office-style background, based on gameState flags.
 * Mirrors scenes/office/OfficeHotspotManager.js so both office scenes
 * (private detective + Mark Agency) share the same mental model.
 * -----------------------------------------------------------------------
 */
export class OfficePropsManager {
  constructor(scene, { getState, debugEnabled = false } = {}) {
    this.scene = scene;
    this.getState = getState || (() => ({}));
    this.debugEnabled = debugEnabled;
    this.sprites = new Map(); // id -> Phaser.GameObjects.Image
  }

  /** Call once in create(), after the background is on screen. */
  buildAll() {
    const { width, height } = this.scene.cameras.main;
    const defs = createOfficeObjectDefinitions(this.scene);
    const state = this.getState();

    defs.forEach((def) => {
      const isVisible = def.condition ? def.condition(state) : true;
      if (!isVisible) return;
      this._spawn(def, width, height);
    });
  }

  /**
   * Call after something changes the game state (e.g. player hires the
   * secretary, or buys a computer) to add/remove props without reloading
   * the whole scene or the background.
   */
  refresh() {
    const { width, height } = this.scene.cameras.main;
    const defs = createOfficeObjectDefinitions(this.scene);
    const state = this.getState();

    defs.forEach((def) => {
      const shouldBeVisible = def.condition ? def.condition(state) : true;
      const existing = this.sprites.get(def.id);

      if (shouldBeVisible && !existing) {
        this._spawn(def, width, height);
      } else if (!shouldBeVisible && existing) {
        existing.destroy();
        this.sprites.delete(def.id);
      }
    });
  }

  _spawn(def, width, height) {
    const hasTexture = this.scene.textures.exists(def.textureKey);
    const x = width * def.x;
    const y = height * def.y;

    let sprite;
    if (hasTexture) {
      sprite = this.scene.add.image(x, y, def.textureKey);
      sprite.setScale(def.scale || 1);
    } else {
      // Placeholder so missing art never breaks the scene during dev.
      sprite = this.scene.add.rectangle(x, y, 60, 60, 0x664422, 0.85);
      sprite.setStrokeStyle(2, 0xd9b26a);
      this.scene.add
        .text(x, y, def.id, { fontFamily: 'PressStart2P', fontSize: '8px', color: '#ffcc66' })
        .setOrigin(0.5)
        .setDepth((sprite.depth || 0) + 1);
    }

    sprite.setInteractive({ useHandCursor: true });

    if (def.tooltip) {
      const tooltip = this.scene.add
        .text(x, y - 46, def.tooltip, {
          fontFamily: 'PressStart2P',
          fontSize: '9px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(999);

      sprite.on('pointerover', () => tooltip.setAlpha(1));
      sprite.on('pointerout', () => tooltip.setAlpha(0));
      sprite.once('destroy', () => tooltip.destroy());
    }

    sprite.on('pointerdown', () => {
      if (this.debugEnabled) console.log(`[OfficePropsManager] clicked: ${def.id}`);
      def.onClick?.(this.scene);
    });

    this.sprites.set(def.id, sprite);
  }

  destroyAll() {
    this.sprites.forEach((sprite) => sprite.destroy());
    this.sprites.clear();
  }
}