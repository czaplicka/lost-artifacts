import {
  NEWSSTAND_CONFIG,
  NEWSSTAND_HOTSPOTS,
  LOCAL_DEBUG_ALLOWED,
  isEditableTarget
} from '../../config/newsstandConfig.js';

export class NewsstandHotspots {
  constructor(scene, background) {
    this.scene = scene;
    this.background = background;

    this.configs = NEWSSTAND_HOTSPOTS.map(
      config => ({ ...config })
    );

    this.entries = [];
    this.debugMode = false;
    this.selectedIndex = 0;
    this.debugText = null;
    this.destroyed = false;

    this.onDebugKey = this.onDebugKey.bind(this);
  }

  create() {
    for (const config of this.configs) {
      this.createHotspot(config);
    }

    if (LOCAL_DEBUG_ALLOWED) {
      this.debugText = this.scene.add
        .text(16, 16, '', {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '15px',
          color: '#fff1ce',
          backgroundColor: '#191b16',
          padding: { x: 10, y: 8 },
          wordWrap: {
            width: Math.max(100, this.scene.scale.width - 32)
          }
        })
        .setDepth(600)
        .setVisible(false);

      this.scene.input.keyboard?.on(
        'keydown',
        this.onDebugKey
      );
    }

    this.updateDebug();
  }

  isBlocked() {
    return (
      this.scene.isOpeningNewspaper ||
      this.scene.comix?.isOpen ||
      this.scene.comix?.isAnimating ||
      this.scene.scene.isActive('NewspaperOverlayScene')
    );
  }

  getScaledHotspot(config) {
    const transform = this.background.getTransform();

    const sx =
      transform.width / NEWSSTAND_CONFIG.designWidth;

    const sy =
      transform.height / NEWSSTAND_CONFIG.designHeight;

    return {
      ...config,
      x: transform.x + config.x * sx,
      y: transform.y + config.y * sy,
      width: config.width * sx,
      height: config.height * sy
    };
  }

  createHotspot(config) {
    const scene = this.scene;
    const spot = this.getScaledHotspot(config);
    const index = this.entries.length;

    const zone = scene.add
      .zone(spot.x, spot.y, spot.width, spot.height)
      .setOrigin(0, 0)
      .setDepth(config.depth)
      .setInteractive({ useHandCursor: true });

    const priceLabel = scene.add
      .text(
        0,
        0,
        `${config.label} — $${config.price}`,
        {
          fontFamily: 'PressStart2P',
          fontSize: '12px',
          color: '#f6dc8c',
          backgroundColor: '#1a1111',
          padding: { x: 8, y: 6 },
          stroke: '#000000',
          strokeThickness: 3
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(config.labelDepth);

    const highlight = LOCAL_DEBUG_ALLOWED
      ? scene.add.graphics()
          .setDepth(40)
          .setVisible(false)
      : null;

    const debugLabel = LOCAL_DEBUG_ALLOWED
      ? scene.add
          .text(0, 0, config.id, {
            fontFamily: 'SpecialElite, monospace',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#191b16',
            padding: { x: 6, y: 4 }
          })
          .setOrigin(0, 1)
          .setDepth(41)
          .setVisible(false)
      : null;

    const entry = {
      config,
      zone,
      priceLabel,
      highlight,
      debugLabel,
      index
    };

    this.entries.push(entry);

    zone.on('pointerdown', () => {
      if (this.debugMode && !this.isBlocked()) {
        this.selectedIndex = index;
        this.updateDebug();
      }
    });

    zone.on('pointerup', () => {
      if (this.debugMode || this.isBlocked()) return;

      if (config.kind === 'newspaper') {
        void scene.buyAndOpenNewspaper(config);
      } else if (config.kind === 'comix') {
        scene.buyAndOpenComix(config);
      }
    });

    if (LOCAL_DEBUG_ALLOWED) {
      zone.on('drag', (pointer, x, y) => {
        if (!this.debugMode || this.isBlocked()) return;

        const transform = this.background.getTransform();

        const sx =
          transform.width / NEWSSTAND_CONFIG.designWidth;

        const sy =
          transform.height / NEWSSTAND_CONFIG.designHeight;

        config.x = Math.round((x - transform.x) / sx);
        config.y = Math.round((y - transform.y) / sy);

        this.selectedIndex = index;

        this.syncHotspot(entry);
        this.updateDebug();
      });
    }

    this.syncHotspot(entry);
  }

  positionPriceLabel(label, spot) {
    const { width, height } = this.scene.scale;
    const margin = 12;

    label.setScale(1);

    const availableWidth = Math.max(
      1,
      width - margin * 2
    );

    if (label.width > availableWidth) {
      label.setScale(availableWidth / label.width);
    }

    const halfWidth = label.displayWidth / 2;

    const x = Phaser.Math.Clamp(
      spot.x + spot.width / 2,
      margin + halfWidth,
      width - margin - halfWidth
    );

    const maxY = Math.max(
      margin,
      height - margin - label.displayHeight
    );

    const y = Phaser.Math.Clamp(
      spot.y + spot.height + 10,
      margin,
      maxY
    );

    label.setPosition(x, y);
  }

  syncHotspot(entry) {
    const spot = this.getScaledHotspot(entry.config);

    entry.zone
      .setPosition(spot.x, spot.y)
      .setSize(spot.width, spot.height);

    entry.zone.input?.hitArea?.setTo(
      0,
      0,
      spot.width,
      spot.height
    );

    this.positionPriceLabel(entry.priceLabel, spot);
    this.drawDebugHotspot(entry);
  }

  drawDebugHotspot(entry) {
    if (!LOCAL_DEBUG_ALLOWED || !entry.highlight) return;

    const {
      config,
      highlight,
      debugLabel,
      index
    } = entry;

    highlight.clear();

    if (!this.debugMode) {
      highlight.setVisible(false);
      debugLabel?.setVisible(false);
      return;
    }

    const spot = this.getScaledHotspot(config);

    highlight.fillStyle(0x00ff88, 0.20);
    highlight.fillRect(
      spot.x,
      spot.y,
      spot.width,
      spot.height
    );

    highlight.lineStyle(
      2,
      index === this.selectedIndex ? 0xff44ff : 0x00ff88,
      1
    );

    highlight.strokeRect(
      spot.x,
      spot.y,
      spot.width,
      spot.height
    );

    highlight.setVisible(true);

    debugLabel
      ?.setPosition(spot.x, spot.y - 4)
      .setText(config.id)
      .setVisible(true);
  }

  setDebugMode(enabled) {
    if (!LOCAL_DEBUG_ALLOWED) return;

    if (enabled && this.isBlocked()) return;

    this.debugMode = Boolean(enabled);

    for (const entry of this.entries) {
      this.scene.input.setDraggable(
        entry.zone,
        this.debugMode
      );
    }

    this.updateDebug();
  }

  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;

    for (const entry of this.entries) {
      this.drawDebugHotspot(entry);
    }

    const config = this.entries[
      this.selectedIndex
    ]?.config;

    this.debugText
      ?.setVisible(this.debugMode)
      .setText(
        this.debugMode
          ? [
              `LOCAL DEBUG: ${config?.id || 'no hotspots'}`,
              `city:${this.scene.getActiveCityId()} | background:${this.background.visible ? 'VIDEO' : 'IMAGE'}`,
              `x:${config?.x} y:${config?.y} width:${config?.width} height:${config?.height}`,
              'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
              'Tab / Shift+Tab: select | C: export | D: close',
              'Coordinates: 1920x1080, TOP-LEFT. Purchases disabled.',
              'Export to config/newsstandConfig.js. Changes are temporary.'
            ].join('\n')
          : ''
      );
  }

  onDebugKey(event) {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      isEditableTarget(event) ||
      event.ctrlKey ||
      event.metaKey ||
      this.isBlocked()
    ) {
      return;
    }

    if (event.code === 'KeyD') {
      if (!event.repeat) {
        this.setDebugMode(!this.debugMode);
      }

      return;
    }

    if (!this.debugMode) return;

    if (event.code === 'KeyC') {
      if (!event.repeat) {
        this.printConfig();
      }

      return;
    }

    if (!this.entries.length) return;

    if (event.code === 'Tab') {
      event.preventDefault();

      const delta = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex +
        delta +
        this.entries.length
      ) % this.entries.length;

      this.updateDebug();
      return;
    }

    if (![
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown'
    ].includes(event.code)) {
      return;
    }

    event.preventDefault();

    const entry = this.entries[this.selectedIndex];
    const config = entry.config;
    const step = event.altKey ? 1 : 5;

    const horizontal =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight';

    const direction =
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowUp'
        ? -1
        : 1;

    const key = event.shiftKey
      ? (horizontal ? 'width' : 'height')
      : (horizontal ? 'x' : 'y');

    config[key] += direction * step;

    config.width = Math.max(10, config.width);
    config.height = Math.max(10, config.height);

    this.syncHotspot(entry);
    this.updateDebug();
  }

  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;

    console.log(
      '[NewsstandHotspots] Replace NEWSSTAND_HOTSPOTS ' +
      'in config/newsstandConfig.js with:'
    );

    console.log(
      'export const NEWSSTAND_HOTSPOTS = ' +
      JSON.stringify(this.configs, null, 2) +
      ';'
    );
  }

  resize() {
    if (this.destroyed) return;

    this.debugText?.setWordWrapWidth(
      Math.max(100, this.scene.scale.width - 32)
    );

    for (const entry of this.entries) {
      this.syncHotspot(entry);
    }

    this.updateDebug();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    this.scene.input.keyboard?.off(
      'keydown',
      this.onDebugKey
    );

    for (const entry of this.entries) {
      if (entry.zone.input) {
        this.scene.input.setDraggable(entry.zone, false);
      }

      entry.zone.destroy();
      entry.priceLabel.destroy();
      entry.highlight?.destroy();
      entry.debugLabel?.destroy();
    }

    this.debugText?.destroy();

    this.debugText = null;
    this.debugMode = false;
    this.entries = [];
    this.configs = [];
  }
}