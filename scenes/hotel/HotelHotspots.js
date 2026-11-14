import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
const LOCAL_DEBUG_ALLOWED = [
  'localhost',
  '127.0.0.1'
].includes(window.location.hostname);

const HOTSPOT_ACTIONS = {
  bed: {
    action: 'sleep',
    label: __dialogueText("scenes/hotel/HotelHotspots.js", "t_f816a74c2310179d8785"),
    hoverText: __dialogueText("scenes/hotel/HotelHotspots.js", "t_8950add138ad4436c36b"),
    monologueKey: __dialogueText("scenes/hotel/HotelHotspots.js", "t_6eee7c7d6fb25c4ddf7c"),
    fallbackMonologue:
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_b53687cb2eb7b33ad5c1")
  },

  'hotel-tv': {
    action: 'tv',
    label: __dialogueText("scenes/hotel/HotelHotspots.js", "t_7e7536a95dcfb769ac5b"),
    hoverText: __dialogueText("scenes/hotel/HotelHotspots.js", "t_74fc4a7a24cb02043714"),
    monologueKey: __dialogueText("scenes/hotel/HotelHotspots.js", "t_45ecdde4c7f36af957c8"),
    fallbackMonologue:
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_f5419848f9cc982da81b")
  },

  'hotel-desk': {
    action: 'crimeBoard',
    label: __dialogueText("scenes/hotel/HotelHotspots.js", "t_210e51e019366706681f"),
    hoverText: __dialogueText("scenes/hotel/HotelHotspots.js", "t_3c8222d9cd2d91b7019e"),
    monologueKey: __dialogueText("scenes/hotel/HotelHotspots.js", "t_e6b3d6e0426bd802a17c"),
    fallbackMonologue:
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_f0d1cfc96e14d78682f8")
  },

  'hotel-window-exit': {
    action: 'leave',
    label: __dialogueText("scenes/hotel/HotelHotspots.js", "t_43e363fcc2aa82043399"),
    hoverText: __dialogueText("scenes/hotel/HotelHotspots.js", "t_cc3438bea08c23f36e2f"),
    monologueKey: __dialogueText("scenes/hotel/HotelHotspots.js", "t_500863462a5b84d945fb"),
    fallbackMonologue:
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_a8768259345f6ac5f56d")
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

    this._copyInFlight = false;
    this._statusText = '';
    this._generation = 0;
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
    this._statusText = '';

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
        .text(16, height - 16, '', {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: '#fff1ce',
          backgroundColor: '#191b16',
          padding: { x: 8, y: 6 },
          wordWrap: {
            width: Math.max(200, width - 32)
          }
        })
        .setOrigin(0, 1)
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
        this._statusText = '';
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
        this._statusText = '';

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

  isEditableTarget(event) {
    return [
      event?.target,
      document.activeElement
    ].some(element => (
      element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
    ));
  }

  onKey(event) {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      this.scene._cleanupDone ||
      !this.scene.sys.isActive() ||
      this.isEditableTarget(event)
    ) {
      return;
    }

    const commandKey = event.ctrlKey || event.metaKey;

    if (
      this.debugMode &&
      commandKey &&
      !event.altKey &&
      !event.shiftKey &&
      event.code === 'KeyC'
    ) {
      // Zaznaczony tekst zachowuje zwykłe kopiowanie.
      if (window.getSelection()?.toString()) return;
      if (event.repeat) return;

      event.preventDefault();
      event.stopPropagation?.();

      void this.copyConfig();
      return;
    }

    if (commandKey) return;

    if (
      this.debugMode &&
      event.code === __dialogueText("scenes/hotel/HotelHotspots.js", "t_037c968467aa3fd7c059")
    ) {
      event.preventDefault();
      this.setDebug(false);
      return;
    }

    if (this.isBlocked()) return;

    if (event.code === 'KeyD') {
      if (
        !event.repeat &&
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        this.setDebug(!this.debugMode);
      }

      return;
    }

    if (!this.debugMode || !this.zones.length) return;

    if (event.code === __dialogueText("scenes/hotel/HotelHotspots.js", "t_90ddf1963abb36c9921c")) {
      event.preventDefault();

      const delta = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex + delta + this.zones.length
      ) % this.zones.length;

      this._statusText = '';
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

    this._statusText = '';
    this.syncHotspot(hotspot);
    this.updateDebug();
  }

  setDebug(enabled) {
    this.debugMode =
      LOCAL_DEBUG_ALLOWED &&
      Boolean(enabled);

    this.scene.DEBUG_HOTSPOTS = this.debugMode;
    this._statusText = '';

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

    const lines = [
      `${__dialogueText("scenes/hotel/HotelHotspots.js", "t_d5b933190f7552e4d82d")}${this.hotelId}${__dialogueText("scenes/hotel/HotelHotspots.js", "t_ffa9044b934017b2aed8")}${cfg?.id || 'none'}`,
      `${__dialogueText("scenes/hotel/HotelHotspots.js", "t_51e33c7c7efbc350d26f")}${cfg?.x}${__dialogueText("scenes/hotel/HotelHotspots.js", "t_8278a5c11d3d9380f821")}${cfg?.y}${__dialogueText("scenes/hotel/HotelHotspots.js", "t_1b89a9604b178452218e")}${cfg?.w}${__dialogueText("scenes/hotel/HotelHotspots.js", "t_3f4674b8e35cc249a199")}${cfg?.h}`,
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_f7371edff8b7159ace9e"),
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_9d17c0754f4ec7faaf2c"),
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_ecff859f51f1d0ea4cfa"),
      __dialogueText("scenes/hotel/HotelHotspots.js", "t_1b833152ecb7c9ce800f"),
      this._statusText
    ].filter(Boolean);

    this.debugText
      ?.setVisible(this.debugMode)
      .setText(this.debugMode ? lines.join(__dialogueText("scenes/hotel/HotelHotspots.js", "t_01ba4719c80b6fe911b0")) : '');
  }

  getConfigText() {
    const round = value => Number(value.toFixed(6));

    const hotspots = this.zones.map(({ cfg }) => ({
      id: cfg.id,
      x: round((cfg.x - cfg.w / 2) / this.width),
      y: round((cfg.y - cfg.h / 2) / this.height),
      w: round(cfg.w / this.width),
      h: round(cfg.h / this.height)
    }));

    return JSON.stringify(hotspots, null, 2);
  }

  printConfig() {
    if (!LOCAL_DEBUG_ALLOWED || !this.debugMode) return '';

    const text = this.getConfigText();

    console.log(
      `COPY INTO config/hotelConfig.js -> ${this.hotelId}.hotspots:`
    );

    console.log(text);

    return text;
  }

  async copyConfig() {
    if (
      !LOCAL_DEBUG_ALLOWED ||
      !this.debugMode ||
      this._copyInFlight ||
      !this.zones.length
    ) {
      return false;
    }

    const generation = this._generation;
    const text = this.printConfig();

    this._copyInFlight = true;
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          console.warn(
            '[HotelHotspots] Clipboard API failed:',
            error
          );
        }
      }

      if (generation !== this._generation) {
        return copied;
      }

      if (!copied) {
        copied = this.copyWithTextarea(text);
      }

      this._statusText = copied
        ? __dialogueText("scenes/hotel/HotelHotspots.js", "t_59f96c59651c06626017")
        : __dialogueText("scenes/hotel/HotelHotspots.js", "t_77a6ec3ece8339ac25f9");

      this.updateDebug();

      return copied;
    } finally {
      if (generation === this._generation) {
        this._copyInFlight = false;
      }
    }
  }

  copyWithTextarea(text) {
    const previousFocus = document.activeElement;
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.readOnly = true;

    Object.assign(textarea.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      opacity: '0'
    });

    document.body.appendChild(textarea);

    try {
      textarea.focus();
      textarea.select();

      return document.execCommand('copy');
    } catch (error) {
      console.warn(
        '[HotelHotspots] Clipboard fallback failed:',
        error
      );

      return false;
    } finally {
      textarea.remove();

      if (previousFocus?.isConnected) {
        previousFocus.focus?.({ preventScroll: true });
      }
    }
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
          `${__dialogueText("scenes/hotel/HotelHotspots.js", "t_e80b3c9a545b055a98e7")}${this.hotelId}${__dialogueText("scenes/hotel/HotelHotspots.js", "t_e7ac0786668e0ff0f02b")}${data.id}`,
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
    this._generation++;
    this._copyInFlight = false;
    this._statusText = '';

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