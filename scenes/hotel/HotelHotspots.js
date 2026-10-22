const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

const HOTSPOT_ACTIONS = {
  bed: {
    action: 'sleep',
    label: 'Bed',
    hoverText: 'Bed — sleep and restore energy',
    monologueKey: 'inspect.hotelBed',
    fallbackMonologue:
      'A bed. A promising development in any investigation.'
  },

  'hotel-tv': {
    action: 'tv',
    label: 'Television',
    hoverText: 'Television — local news',
    monologueKey: 'inspect.hotelTv',
    fallbackMonologue:
      'The television is on. Somewhere, a reporter is overreacting.'
  },

  'hotel-desk': {
    action: 'crimeBoard',
    label: 'Desk',
    hoverText: 'Desk — review the crime board',
    monologueKey: 'inspect.hotelDesk',
    fallbackMonologue:
      'A desk. Finally, a horizontal surface for evidence and regret.'
  },

  'hotel-window-exit': {
    action: 'leave',
    label: 'Window / exit',
    hoverText: 'Window — return to the city',
    monologueKey: 'inspect.hotelWindow',
    fallbackMonologue:
      'The city is out there, full of clues and people pretending not to be suspicious.'
  }
};

export class HotelHotspots {
  constructor(scene, actions = {}) {
    this.scene = scene;
    this.actions = actions;

    this.zones = [];
    this.hoverHint = null;
    this.debugGraphics = null;
    this.debugText = null;

    this.debugMode = false;
    this.selectedIndex = 0;
    this.locked = false;

    this.keyHandler = event => this.onKey(event);
    this.keyboard = null;
  }

  create(width, height, config) {
    this.destroy();

    this.width = width;
    this.height = height;
    this.hotelId = config.id;

    this.debugMode = false;
    this.scene.DEBUG_HOTSPOTS = false;
    this.selectedIndex = 0;
    this.locked = false;

    this.hoverHint = this.scene.add
      .text(width / 2, 122, '', {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#ffe066',
        backgroundColor: '#111111cc',
        padding: { x: 12, y: 7 }
      })
      .setOrigin(0.5)
      .setDepth(50)
      .setVisible(false);

    if (LOCAL_DEBUG_ALLOWED) {
      this.debugGraphics = this.scene.add
        .graphics()
        .setDepth(6)
        .setVisible(false);

      this.debugText = this.scene.add
        .text(16, height - 180, '', {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#fff1ce',
          backgroundColor: '#191b16',
          padding: { x: 8, y: 6 },
          wordWrap: {
            width: Math.max(200, width - 32)
          }
        })
        .setDepth(1000)
        .setVisible(false);
    }

    this.zones = config.hotspots.map((source, index) => {
      const cfg = {
        id: source.id,
        x: Math.round((source.x + source.w / 2) * width),
        y: Math.round((source.y + source.h / 2) * height),
        w: Math.max(10, Math.round(source.w * width)),
        h: Math.max(10, Math.round(source.h * height))
      };

      return this.createHotspot(cfg, index);
    });

    if (LOCAL_DEBUG_ALLOWED) {
      this.keyboard = this.scene.input.keyboard;
      this.keyboard?.on('keydown', this.keyHandler);
      this.updateDebug();
    }
  }

  isBlocked() {
    const scene = this.scene;

    if (
      this.locked ||
      scene._cleanupDone ||
      !scene.sys.isActive() ||
      scene.isHotelInteractionBlocked()
    ) {
      return true;
    }

    const hud = scene.getPlayerHudScene?.();
    return Boolean(hud?.isAnyPanelOpen?.());
  }

  createHotspot(cfg, index) {
    const scene = this.scene;

    const data = HOTSPOT_ACTIONS[cfg.id] || {
      label: cfg.id,
      hoverText: cfg.id
    };

    const zone = scene.add
      .zone(cfg.x, cfg.y, cfg.w, cfg.h)
      .setOrigin(0.5)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });

    const label = LOCAL_DEBUG_ALLOWED
      ? scene.add
        .text(0, 0, data.label, {
          fontFamily: 'SpecialElite',
          fontSize: '17px',
          color: '#00ffcc',
          backgroundColor: '#000000',
          padding: { x: 5, y: 3 }
        })
        .setOrigin(0.5, 1)
        .setDepth(999)
        .setVisible(false)
      : null;

    const hotspot = { cfg, zone, label, data };

    zone.on('pointerover', () => {
      if (this.debugMode || this.isBlocked()) return;

      this.showHint(data.hoverText);
      this.sayMonologue({ ...data, id: cfg.id });
    });

    zone.on('pointerout', () => this.hideHint());

    zone.on('pointerdown', () => {
      if (this.isBlocked()) return;

      if (LOCAL_DEBUG_ALLOWED && this.debugMode) {
        this.selectedIndex = index;
        this.updateDebug();
        return;
      }

      this.hideHint();

      try {
        const result = this.actions[data.action]?.();

        if (result?.catch) {
          result.catch(error => {
            console.error(
              `[HotelScene] Hotspot failed: ${cfg.id}`,
              error
            );
          });
        }
      } catch (error) {
        console.error(
          `[HotelScene] Hotspot failed: ${cfg.id}`,
          error
        );
      }
    });

    if (LOCAL_DEBUG_ALLOWED) {
      zone.on('drag', (_pointer, x, y) => {
        if (!this.debugMode || this.isBlocked()) return;

        this.selectedIndex = index;
        cfg.x = Math.round(x);
        cfg.y = Math.round(y);

        this.syncHotspot(hotspot);
        this.updateDebug();
      });
    }

    this.syncHotspot(hotspot);
    return hotspot;
  }

  syncHotspot({ cfg, zone, label }) {
    zone.setPosition(cfg.x, cfg.y);
    zone.setSize(cfg.w, cfg.h);

    zone.input?.hitArea?.setTo(0, 0, cfg.w, cfg.h);

    label?.setPosition(
      cfg.x,
      cfg.y - cfg.h / 2 - 8
    );
  }

  onKey(event) {
    if (!LOCAL_DEBUG_ALLOWED) return;

    const target = event.target;

    if (
      target?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    if (this.isBlocked()) return;

    if (event.code === 'KeyD') {
      if (!event.repeat) {
        this.setDebug(!this.debugMode);
      }

      return;
    }

    if (!this.debugMode || !this.zones.length) return;

    if (event.code === 'KeyC') {
      if (!event.repeat) this.printConfig();
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();

      const delta = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex + delta + this.zones.length
      ) % this.zones.length;

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

    const hotspot = this.zones[this.selectedIndex];
    const cfg = hotspot.cfg;

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

    this.syncHotspot(hotspot);
    this.updateDebug();
  }

  setDebug(enabled) {
    this.debugMode =
      LOCAL_DEBUG_ALLOWED &&
      Boolean(enabled);

    this.scene.DEBUG_HOTSPOTS = this.debugMode;

    this.hideHint();

    if (!LOCAL_DEBUG_ALLOWED) return;

    this.zones.forEach(({ zone }) => {
      this.scene.input.setDraggable(
        zone,
        this.debugMode && !this.locked
      );
    });

    this.updateDebug();
  }

  updateDebug() {
    if (!LOCAL_DEBUG_ALLOWED) return;

    this.debugGraphics?.clear();
    this.debugGraphics?.setVisible(this.debugMode);

    this.zones.forEach((hotspot, index) => {
      const { cfg, label } = hotspot;

      label?.setVisible(this.debugMode);

      if (!this.debugMode || !this.debugGraphics) return;

      const x = cfg.x - cfg.w / 2;
      const y = cfg.y - cfg.h / 2;

      this.debugGraphics.fillStyle(0x00ff88, 0.2);
      this.debugGraphics.fillRect(x, y, cfg.w, cfg.h);

      this.debugGraphics.lineStyle(
        2,
        index === this.selectedIndex
          ? 0xff44ff
          : 0x00ff88,
        1
      );

      this.debugGraphics.strokeRect(x, y, cfg.w, cfg.h);
    });

    const cfg = this.zones[this.selectedIndex]?.cfg;

    this.debugText
      ?.setVisible(this.debugMode)
      .setText(
        this.debugMode
          ? (
            `LOCAL DEBUG HOTEL: ${this.hotelId} | ${cfg?.id || 'none'}\n` +
            `x:${cfg?.x} y:${cfg?.y} w:${cfg?.w} h:${cfg?.h}\n` +
            'Drag / arrows: move | Shift + arrows: resize | Alt: 1px\n' +
            'Tab / Shift+Tab: select | C: export | D / Esc: close\n' +
            'Actions disabled.'
          )
          : ''
      );
  }

  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return;

    const round = value => Number(value.toFixed(6));

    const hotspots = this.zones.map(({ cfg }) => ({
      id: cfg.id,
      x: round((cfg.x - cfg.w / 2) / this.width),
      y: round((cfg.y - cfg.h / 2) / this.height),
      w: round(cfg.w / this.width),
      h: round(cfg.h / this.height)
    }));

    console.log(
      `COPY INTO config/hotelConfig.js -> ${this.hotelId}.hotspots:`
    );

    console.log(JSON.stringify(hotspots, null, 2));
  }

  showHint(text) {
    if (
      !this.hoverHint?.active ||
      !text ||
      this.scene._cleanupDone
    ) {
      return;
    }

    this.hoverHint.setText(text).setVisible(true);
  }

  hideHint() {
    this.hoverHint?.setVisible(false);
  }

  sayMonologue(data) {
    const scene = this.scene;

    if (!data || scene._cleanupDone) return;

    if (scene.monologue?.sayRandom && data.monologueKey) {
      scene.monologue.sayRandom(data.monologueKey, {
        cooldownKey: `hotel-hover:${this.hotelId}:${data.id}`,
        cooldownMs: 2500,
        queue: false
      });

      return;
    }

    if (scene.monologue?.say && data.fallbackMonologue) {
      scene.monologue.say(data.fallbackMonologue, {
        cooldownKey:
          `hotel-hover-fallback:${this.hotelId}:${data.id}`,
        cooldownMs: 2500,
        queue: false
      });
    }
  }

  setLocked(locked) {
    this.locked = Boolean(locked);

    this.zones.forEach(({ zone }) => {
      if (!zone?.scene || !zone.active) return;

      if (this.locked) {
        if (LOCAL_DEBUG_ALLOWED && zone.input?.draggable) {
          this.scene.input.setDraggable(zone, false);
        }

        zone.disableInteractive();
      } else {
        zone.setInteractive({ useHandCursor: true });

        if (LOCAL_DEBUG_ALLOWED && this.debugMode) {
          this.scene.input.setDraggable(zone, true);
        }
      }
    });

    if (this.locked) this.hideHint();
  }

  destroy() {
    this.keyboard?.off('keydown', this.keyHandler);
    this.keyboard = null;

    this.zones.forEach(({ zone, label }) => {
      zone.removeAllListeners();
      zone.destroy();
      label?.destroy();
    });

    this.zones = [];

    this.hoverHint?.destroy();
    this.hoverHint = null;

    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugText?.destroy();
    this.debugText = null;

    this.debugMode = false;
    this.scene.DEBUG_HOTSPOTS = false;
  }
}