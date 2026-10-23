const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

// Po ustawieniu przycisków skopiuj tutaj wynik z konsoli.
// null oznacza domyślne pozycje wyliczane z layoutu.
const TV_BUTTON_OVERRIDES = null;

export class TvBroadcastControls {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.onClose = options.onClose || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onNext = options.onNext || (() => {});

    this.onPauseToggle =
      options.onPauseToggle || (() => {});

    this.isActionAllowed =
      options.isActionAllowed || (() => true);

    this.isBroadcastPaused =
      options.isBroadcastPaused || (() => false);

    this.hotspots = [];
    this.debugObjects = [];
    this.entries = [];

    this.debugText = null;
    this.debugMode = false;
    this.selectedIndex = 0;

    this.visible = true;
    this.isDestroyed = false;

    this.keyboard = null;
    this.boundDebugKey = event => this.onDebugKey(event);
  }

  create(layout) {
    if (this.isDestroyed || !layout) {
      return;
    }

    this.destroyHotspots();

    const {
      centerX,
      centerY,
      tvHeight
    } = layout;

    const width = 160;
    const height = 70;
    const gap = 40;

    const groupWidth = width * 4 + gap * 3;

    const startX =
      centerX -
      groupWidth / 2 +
      width / 2 -
      45;

    const y =
      centerY +
      tvHeight * 0.43 -
      20;

    const definitions = [
      { id: 'close', action: this.onClose },
      { id: 'skip', action: this.onSkip },
      { id: 'next', action: this.onNext },
      { id: 'pause', action: this.onPauseToggle }
    ];

    definitions.forEach((definition, index) => {
      const override = Array.isArray(TV_BUTTON_OVERRIDES)
        ? TV_BUTTON_OVERRIDES.find(
          item => item.id === definition.id
        )
        : null;

      this.createHotspot({
        id: definition.id,
        action: definition.action,
        x: override?.x ?? startX + index * (width + gap),
        y: override?.y ?? y,
        w: override?.w ?? width,
        h: override?.h ?? height
      });
    });

    if (LOCAL_DEBUG_ALLOWED) {
      this.debugText = this.scene.add
        .text(16, this.scene.scale.height - 145, '', {
          fontFamily: 'SpecialElite, monospace',
          fontSize: '16px',
          color: '#fff1ce',
          backgroundColor: '#191b16',
          padding: { x: 10, y: 8 },
          wordWrap: {
            width: Math.max(
              100,
              this.scene.scale.width - 32
            )
          }
        })
        .setDepth(1000)
        .setVisible(false);

      this.keyboard = this.scene.input.keyboard;

      this.keyboard?.on(
        'keydown',
        this.boundDebugKey
      );
    }

    this.refreshPauseVisual();
    this.setVisible(this.visible);
  }

  createHotspot(config) {
    const index = this.entries.length;

    const cfg = {
      id: config.id,
      x: config.x,
      y: config.y,
      w: config.w,
      h: config.h
    };

    const zone = this.scene.add
      .zone(cfg.x, cfg.y, cfg.w, cfg.h)
      .setOrigin(0.5)
      .setDepth(30)
      .setInteractive({
        useHandCursor: true
      });

    const box = LOCAL_DEBUG_ALLOWED
      ? this.scene.add.graphics()
        .setDepth(31)
        .setVisible(false)
      : null;

    const label = LOCAL_DEBUG_ALLOWED
      ? this.scene.add.text(0, 0, '', {
        fontFamily: 'SpecialElite, monospace',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#191b16',
        padding: { x: 6, y: 4 }
      })
        .setOrigin(0.5, 1)
        .setDepth(32)
        .setVisible(false)
      : null;

    const entry = {
      cfg,
      zone,
      box,
      label,
      index,
      action: config.action,
      pressed: false
    };

    zone.on('pointerdown', () => {
      if (this.isDestroyed || !this.visible) {
        return;
      }

      if (this.debugMode) {
        entry.pressed = false;
        this.selectedIndex = index;
        this.updateDebug();
        return;
      }

      entry.pressed = this.isActionAllowed();
    });

    zone.on('pointerout', () => {
      entry.pressed = false;
    });

    zone.on('pointerup', () => {
      const wasPressed = entry.pressed;
      entry.pressed = false;

      if (
        this.isDestroyed ||
        !this.visible ||
        this.debugMode ||
        !wasPressed ||
        !this.isActionAllowed()
      ) {
        return;
      }

      entry.action?.();
    });

    if (LOCAL_DEBUG_ALLOWED) {
      zone.on('drag', (pointer, x, y) => {
        if (
          this.isDestroyed ||
          !this.debugMode ||
          !this.visible
        ) {
          return;
        }

        cfg.x = Math.round(x);
        cfg.y = Math.round(y);

        this.selectedIndex = index;

        this.syncHotspot(entry);
        this.updateDebug();
      });
    }

    this.entries.push(entry);
    this.hotspots.push(zone);

    if (box) {
      this.debugObjects.push(box);
    }

    if (label) {
      this.debugObjects.push(label);
    }

    this.syncHotspot(entry);
  }

  syncHotspot(entry) {
    const { cfg, zone, label } = entry;

    zone.setPosition(cfg.x, cfg.y);
    zone.setSize(cfg.w, cfg.h);

    zone.input.hitArea.setTo(
      0,
      0,
      cfg.w,
      cfg.h
    );

    label?.setPosition(
      cfg.x,
      cfg.y - cfg.h / 2 - 8
    );

    this.drawHotspot(entry);
  }

  drawHotspot(entry) {
    const { cfg, box, label, index } = entry;

    if (!box || !label) {
      return;
    }

    const show =
      LOCAL_DEBUG_ALLOWED &&
      this.debugMode &&
      this.visible;

    box.clear();
    box.setVisible(show);
    label.setVisible(show);

    if (!show) {
      return;
    }

    const selected = index === this.selectedIndex;

    const left = cfg.x - cfg.w / 2;
    const top = cfg.y - cfg.h / 2;

    box.fillStyle(0x00ff88, 0.2);
    box.fillRect(left, top, cfg.w, cfg.h);

    box.lineStyle(
      selected ? 3 : 2,
      selected ? 0xff44ff : 0x00ff88,
      1
    );

    box.strokeRect(left, top, cfg.w, cfg.h);

    const paused =
      cfg.id === 'pause' &&
      this.isBroadcastPaused();

    label.setText(
      paused ? 'PLAY' : cfg.id.toUpperCase()
    );

    label.setColor(
      selected ? '#ff88ff' : '#ffffff'
    );
  }

  refreshPauseVisual() {
    if (this.isDestroyed) {
      return;
    }

    const entry = this.entries.find(
      item => item.cfg.id === 'pause'
    );

    if (entry) {
      this.drawHotspot(entry);
    }
  }

  setDebugMode(enabled) {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      this.isDestroyed
    ) {
      return;
    }

    this.debugMode = Boolean(enabled);

    this.entries.forEach(entry => {
      entry.pressed = false;

      this.scene.input.setDraggable(
        entry.zone,
        this.debugMode && this.visible
      );
    });

    this.updateDebug();
  }

  updateDebug() {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      this.isDestroyed
    ) {
      return;
    }

    this.entries.forEach(entry => {
      this.drawHotspot(entry);
    });

    const cfg =
      this.entries[this.selectedIndex]?.cfg;

    const show =
      this.debugMode &&
      this.visible;

    this.debugText?.setVisible(show);

    this.debugText?.setText(
      show
        ? [
          `LOCAL TV DEBUG: ${cfg?.id || 'no buttons'}`,
          `x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}`,
          'Drag / Arrows: move | Shift+Arrows: resize | Alt: 1px',
          'Tab / Shift+Tab: select | C: export | D: close',
          'Button clicks disabled. TV keyboard shortcuts remain active.'
        ].join('\n')
        : ''
    );
  }

  isEditableTarget(event) {
    const target = event.target;

    return Boolean(
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        target?.tagName
      )
    );
  }

  onDebugKey(event) {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      this.isDestroyed ||
      !this.visible ||
      !this.scene?.sys?.isActive() ||
      this.isEditableTarget(event) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (event.code === 'KeyD') {
      if (!event.repeat) {
        this.setDebugMode(!this.debugMode);
      }

      return;
    }

    if (!this.debugMode) {
      return;
    }

    if (event.code === 'KeyC') {
      if (!event.repeat) {
        this.printConfig();
      }

      return;
    }

    if (!this.entries.length) {
      return;
    }

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

    const entry =
      this.entries[this.selectedIndex];

    const cfg = entry.cfg;
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
      ? (horizontal ? 'w' : 'h')
      : (horizontal ? 'x' : 'y');

    cfg[key] += direction * step;

    cfg.w = Math.max(10, cfg.w);
    cfg.h = Math.max(10, cfg.h);

    this.syncHotspot(entry);
    this.updateDebug();
  }

  printConfig() {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      !this.debugMode ||
      this.isDestroyed
    ) {
      return;
    }

    const config = this.entries.map(
      ({ cfg }) => ({ ...cfg })
    );

    console.log(
      'COPY INTO scenes/tv/TvBroadcastControls.js:'
    );

    console.log(
      'const TV_BUTTON_OVERRIDES = ' +
      JSON.stringify(config, null, 2) +
      ';'
    );
  }

  setVisible(visible) {
    if (this.isDestroyed) {
      return;
    }

    this.visible = Boolean(visible);

    this.entries.forEach(entry => {
      entry.pressed = false;
      entry.zone.setVisible(this.visible);

      if (entry.zone.input) {
        entry.zone.input.enabled = this.visible;
      }

      if (LOCAL_DEBUG_ALLOWED) {
        this.scene.input.setDraggable(
          entry.zone,
          this.debugMode && this.visible
        );
      }
    });

    this.updateDebug();
  }

  destroyHotspots() {
    this.keyboard?.off(
      'keydown',
      this.boundDebugKey
    );

    this.keyboard = null;

    this.debugText?.destroy();
    this.debugText = null;

    this.debugObjects.forEach(object => {
      object?.destroy?.();
    });

    this.hotspots.forEach(zone => {
      zone?.removeAllListeners?.();
      zone?.destroy?.();
    });

    this.entries = [];
    this.hotspots = [];
    this.debugObjects = [];

    this.debugMode = false;
    this.selectedIndex = 0;
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    this.destroyHotspots();

    this.onClose = null;
    this.onSkip = null;
    this.onNext = null;
    this.onPauseToggle = null;

    this.isActionAllowed = null;
    this.isBroadcastPaused = null;

    this.scene = null;
  }
}