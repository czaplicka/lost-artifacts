const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

// Po ustawieniu przycisków skopiuj tutaj wynik z konsoli (klawisz D, potem C).
// null oznacza domyślne pozycje wyliczane z layoutu.
const TV_BUTTON_OVERRIDES = null;

export class TvBroadcastControls {
  constructor(scene, options = {}) {
    this.scene = scene;

    this.onClose = options.onClose || (() => {});
    this.onSkip = options.onSkip || (() => {});
    this.onNext = options.onNext || (() => {});
    this.onPauseToggle = options.onPauseToggle || (() => {});
    this.onVolume = options.onVolume || (() => {});
    this.onTune = options.onTune || (() => {});

    this.isActionAllowed = options.isActionAllowed || (() => true);
    this.isBroadcastPaused = options.isBroadcastPaused || (() => false);
    this.getTooltip = options.getTooltip || (() => '');

    this.hotspots = [];
    this.debugObjects = [];
    this.entries = [];

    this.tooltip = null;
    this.hoveredEntry = null;

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
      tvWidth,
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

    // Gałki: pozycje przybliżone, skalibruj klawiszem D (lokalnie).
    const knobY = y - tvHeight * 0.021;
    const knobDx = tvWidth * 0.3;
    const knobSize = 130;

    const definitions = [
      { id: 'close', action: this.onClose },
      { id: 'skip', action: this.onSkip },
      { id: 'next', action: this.onNext },
      { id: 'pause', action: this.onPauseToggle }
    ];

    definitions.forEach((definition, index) => {
      const override = this.findOverride(definition.id);

      this.createHotspot({
        id: definition.id,
        action: definition.action,
        shape: 'rect',
        x: override?.x ?? startX + index * (width + gap),
        y: override?.y ?? y,
        w: override?.w ?? width,
        h: override?.h ?? height
      });
    });

    const knobs = [
      { id: 'volume', action: this.onVolume, x: centerX - knobDx },
      { id: 'tune', action: this.onTune, x: centerX + knobDx }
    ];

    knobs.forEach(knob => {
      const override = this.findOverride(knob.id);

      this.createHotspot({
        id: knob.id,
        action: knob.action,
        shape: 'round',
        x: override?.x ?? knob.x,
        y: override?.y ?? knobY,
        w: override?.w ?? knobSize,
        h: override?.h ?? knobSize
      });
    });

    this.tooltip = this.scene.add
      .text(0, 0, '', {
        fontFamily: 'PressStart2P',
        fontSize: '12px',
        color: '#f6dc8c',
        backgroundColor: '#14100c',
        padding: { x: 8, y: 6 }
      })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setVisible(false);

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

  findOverride(id) {
    return Array.isArray(TV_BUTTON_OVERRIDES)
      ? TV_BUTTON_OVERRIDES.find(item => item.id === id)
      : null;
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

    const glow = (
      config.shape === 'round'
        ? this.scene.add.ellipse(cfg.x, cfg.y, cfg.w, cfg.h, 0xffffff, 0)
        : this.scene.add.rectangle(cfg.x, cfg.y, cfg.w, cfg.h, 0xffffff, 0)
    )
      .setDepth(29)
      .setBlendMode(Phaser.BlendModes.ADD);

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
      glow,
      box,
      label,
      index,
      action: config.action,
      pressed: false,
      hovered: false
    };

    zone.on('pointerover', () => {
      if (this.isDestroyed || !this.visible || this.debugMode) {
        return;
      }

      entry.hovered = true;
      this.hoveredEntry = entry;

      this.paintGlow(entry);
      this.showTooltip(entry);
    });

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

      this.paintGlow(entry);
    });

    zone.on('pointerout', () => {
      entry.pressed = false;
      entry.hovered = false;

      if (this.hoveredEntry === entry) {
        this.hoveredEntry = null;
        this.tooltip?.setVisible(false);
      }

      this.paintGlow(entry);
    });

    zone.on('pointerup', () => {
      const wasPressed = entry.pressed;
      entry.pressed = false;

      this.paintGlow(entry);

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

      // tooltip może się zmienić po akcji (PAUSE <-> PLAY, głośność)
      if (this.hoveredEntry === entry) {
        this.showTooltip(entry);
      }
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
    this.debugObjects.push(glow);

    if (box) {
      this.debugObjects.push(box);
    }

    if (label) {
      this.debugObjects.push(label);
    }

    this.syncHotspot(entry);
  }

  paintGlow(entry) {
    if (!entry.glow?.active) {
      return;
    }

    if (this.debugMode || !this.visible) {
      entry.glow.setAlpha(0);
      return;
    }

    entry.glow.setAlpha(
      entry.pressed
        ? 0.34
        : entry.hovered
          ? 0.16
          : 0
    );
  }

  showTooltip(entry) {
    if (!this.tooltip?.active) {
      return;
    }

    const text = this.getTooltip(entry.cfg.id);

    if (!text) {
      this.tooltip.setVisible(false);
      return;
    }

    const { cfg } = entry;
    const width = this.scene.scale.width;

    this.tooltip.setText(text);

    const half = this.tooltip.width / 2;

    this.tooltip
      .setPosition(
        Phaser.Math.Clamp(cfg.x, half + 8, width - half - 8),
        cfg.y - cfg.h / 2 - 6
      )
      .setVisible(true);
  }

  syncHotspot(entry) {
    const { cfg, zone, label, glow } = entry;

    zone.setPosition(cfg.x, cfg.y);
    zone.setSize(cfg.w, cfg.h);

    zone.input.hitArea.setTo(
      0,
      0,
      cfg.w,
      cfg.h
    );

    glow?.setPosition(cfg.x, cfg.y);
    glow?.setSize(cfg.w, cfg.h);

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

      if (this.hoveredEntry === entry) {
        this.showTooltip(entry);
      }
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

    this.tooltip?.setVisible(false);

    this.entries.forEach(entry => {
      entry.pressed = false;
      entry.hovered = false;

      this.paintGlow(entry);

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
      entry.hovered = false;

      entry.zone.setVisible(this.visible);

      if (entry.zone.input) {
        entry.zone.input.enabled = this.visible;
      }

      this.paintGlow(entry);

      if (LOCAL_DEBUG_ALLOWED) {
        this.scene.input.setDraggable(
          entry.zone,
          this.debugMode && this.visible
        );
      }
    });

    if (!this.visible) {
      this.tooltip?.setVisible(false);
    }

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

    this.tooltip?.destroy();
    this.tooltip = null;
    this.hoveredEntry = null;

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
    this.onVolume = null;
    this.onTune = null;

    this.isActionAllowed = null;
    this.isBroadcastPaused = null;
    this.getTooltip = null;

    this.scene = null;
  }
}