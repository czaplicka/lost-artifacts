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
    this.debugHelp = null;
    this.isLocked = false;
    this.selectedIndex = 0;

    this._destroyed = false;
    this._debugKeyboard = null;
    this._copyInFlight = false;
    this._statusText = '';

    this._onDebugKeyDown = event => this.handleDebugKey(event);
    this._onSceneEnd = () => this.destroy();
  }

  create(definitions = []) {
    if (this._destroyed) return [];

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
        if (this.debugEnabled) {
          if (this.isLocked) return;

          this.selectedIndex = this.hotspots.indexOf(zone);
          this._statusText = '';
          this.createDebugOverlay();
          return;
        }

        this.handlePointerDown(data);
      });

      if (LOCAL_DEBUG_ALLOWED) {
        zone.on('drag', (pointer, x, y) => {
          if (
            this._destroyed ||
            !this.debugEnabled ||
            this.isLocked
          ) {
            return;
          }

          this.selectedIndex = this.hotspots.indexOf(zone);

          data.x = Math.round(x);
          data.y = Math.round(y);

          this._statusText = '';
          this.syncHotspot(zone);
          this.createDebugOverlay();
        });

        this.scene.input.setDraggable(
          zone,
          this.debugEnabled && !this.isLocked
        );
      }

      if (this.isLocked) {
        zone.disableInteractive();
      }

      this.hotspots.push(zone);
    });

    this.bindDebugKeyboard();

    this.scene.events.off('shutdown', this._onSceneEnd);
    this.scene.events.off('destroy', this._onSceneEnd);
    this.scene.events.once('shutdown', this._onSceneEnd);
    this.scene.events.once('destroy', this._onSceneEnd);

    this.scene.DEBUG_HOTSPOTS = this.debugEnabled;

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
    this._debugKeyboard.on('keydown', this._onDebugKeyDown);
  }

  unbindDebugKeyboard() {
    this._debugKeyboard?.off(
      'keydown',
      this._onDebugKeyDown
    );

    this._debugKeyboard = null;
  }

  isEditableTarget(event) {
    const target = event?.target;
    const active = document.activeElement;

    return [target, active].some(element => (
      element?.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
    ));
  }

  handleDebugKey(event) {
    if (
      this._destroyed ||
      !LOCAL_DEBUG_ALLOWED ||
      !this.scene?.sys?.isActive() ||
      this.isEditableTarget(event)
    ) {
      return;
    }

    const commandKey = event.ctrlKey || event.metaKey;

    if (
      this.debugEnabled &&
      commandKey &&
      !event.altKey &&
      !event.shiftKey &&
      event.code === 'KeyC'
    ) {
      // Zaznaczony tekst nadal można normalnie kopiować.
      if (window.getSelection()?.toString()) return;
      if (event.repeat) return;

      event.preventDefault();
      event.stopPropagation?.();

      void this.copyConfig();
      return;
    }

    if (commandKey) return;

    if (event.code === 'KeyD') {
      if (event.repeat || event.altKey || event.shiftKey) return;

      event.preventDefault();
      this.toggleDebug();
      return;
    }

    if (
      !this.debugEnabled ||
      this.isLocked ||
      !this.hotspots.length
    ) {
      return;
    }

    if (event.code === 'Tab') {
      event.preventDefault();

      const direction = event.shiftKey ? -1 : 1;

      this.selectedIndex = (
        this.selectedIndex +
        direction +
        this.hotspots.length
      ) % this.hotspots.length;

      this._statusText = '';
      this.createDebugOverlay();
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

    const zone = this.hotspots[this.selectedIndex];
    const data = zone?.hotspotData;

    if (!data) return;

    const horizontal = (
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    );

    const direction = (
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowUp'
    ) ? -1 : 1;

    const step = event.altKey ? 1 : 5;

    const property = event.shiftKey
      ? (horizontal ? 'width' : 'height')
      : (horizontal ? 'x' : 'y');

    data[property] = Math.round(
      Number(data[property]) + direction * step
    );

    data.width = Math.max(10, Number(data.width));
    data.height = Math.max(10, Number(data.height));

    this._statusText = '';
    this.syncHotspot(zone);
    this.createDebugOverlay();
  }

  toggleDebug() {
    return this.setDebugEnabled(!this.debugEnabled);
  }

  setDebugEnabled(enabled) {
    if (this._destroyed) return false;

    this.debugEnabled =
      LOCAL_DEBUG_ALLOWED &&
      enabled === true;

    this.scene.DEBUG_HOTSPOTS = this.debugEnabled;
    this._statusText = '';

    if (LOCAL_DEBUG_ALLOWED) {
      this.hotspots.forEach(zone => {
        if (!zone?.scene) return;

        this.scene.input.setDraggable(
          zone,
          this.debugEnabled && !this.isLocked
        );
      });
    }

    this.scene.navigation?.hideHint();

    if (this.debugEnabled) {
      this.createDebugOverlay();
    } else {
      this.destroyDebugOverlay();
    }

    return this.debugEnabled;
  }

  syncHotspot(zone) {
    const data = zone?.hotspotData;
    if (!zone?.scene || !data) return;

    zone.setPosition(data.x, data.y);
    zone.setSize(data.width, data.height);

    zone.input?.hitArea?.setTo(
      0,
      0,
      data.width,
      data.height
    );
  }

  getConfigText() {
    const entries = this.hotspots
      .filter(zone => zone?.scene && zone.hotspotData)
      .map(zone => {
        const data = zone.hotspotData;

        return [
          '  {',
          `    id: ${JSON.stringify(data.id)},`,
          `    x: ${Math.round(data.x)},`,
          `    y: ${Math.round(data.y)},`,
          `    width: ${Math.round(data.width)},`,
          `    height: ${Math.round(data.height)}`,
          '  }'
        ].join('\n');
      });

    return `[\n${entries.join(',\n')}\n]`;
  }

  printConfig() {
    if (
      this._destroyed ||
      !LOCAL_DEBUG_ALLOWED ||
      !this.debugEnabled
    ) {
      return '';
    }

    const text = this.getConfigText();

    console.log(
      '[OfficeHotspotManager] Hotspot coordinates:\n' + text
    );

    return text;
  }

  async copyConfig() {
    if (
      this._destroyed ||
      !LOCAL_DEBUG_ALLOWED ||
      !this.debugEnabled ||
      this._copyInFlight
    ) {
      return false;
    }

    this._copyInFlight = true;

    const text = this.printConfig();
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (error) {
          console.warn(
            '[OfficeHotspotManager] Clipboard API failed:',
            error
          );
        }
      }

      if (!copied && !this._destroyed) {
        copied = this.copyWithTextarea(text);
      }

      if (!this._destroyed) {
        this._statusText = copied
          ? 'Coordinates copied to clipboard.'
          : 'Copy failed. Coordinates are in the console.';

        if (this.debugEnabled) {
          this.createDebugOverlay();
        }
      }

      return copied;
    } finally {
      this._copyInFlight = false;
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
        '[OfficeHotspotManager] Clipboard fallback failed:',
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

  handlePointerOver(data) {
    if (
      this._destroyed ||
      this.isLocked ||
      this.debugEnabled ||
      !data
    ) {
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
    if (this._destroyed) return;

    this.scene.navigation?.hideHint();
  }

  handlePointerDown(data) {
    if (
      this._destroyed ||
      this.isLocked ||
      this.debugEnabled ||
      !data
    ) {
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
    if (this._destroyed) return;

    this.isLocked = Boolean(locked);

    this.hotspots.forEach(zone => {
      if (!zone?.scene) return;

      if (this.isLocked) {
        zone.disableInteractive();
      } else {
        zone.setInteractive({
          useHandCursor: true,
          cursor: 'pointer'
        });
      }

      if (LOCAL_DEBUG_ALLOWED) {
        this.scene.input.setDraggable(
          zone,
          this.debugEnabled && !this.isLocked
        );
      }
    });

    if (this.isLocked) {
      this.scene.navigation?.hideHint();
    }

    if (this.debugEnabled) {
      this.createDebugOverlay();
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

    this.hotspots.forEach((zone, index) => {
      if (!zone?.scene || !zone.hotspotData) return;

      const data = zone.hotspotData;
      const selected = index === this.selectedIndex;
      const color = selected ? 0xff44ff : 0x00ffcc;

      this.debugGraphics.fillStyle(color, selected ? 0.2 : 0.08);
      this.debugGraphics.fillRect(
        data.x, data.y, data.width, data.height
      );

      this.debugGraphics.lineStyle(selected ? 3 : 2, color, 0.95);
      this.debugGraphics.strokeRect(
        data.x, data.y, data.width, data.height
      );

      const label = this.scene.add.text(
        data.x + 8,
        data.y + 8,
        `${selected ? '> ' : ''}${data.id}`,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: selected ? '#ff44ff' : '#00ffcc',
          backgroundColor: '#000000',
          padding: { left: 4, right: 4, top: 2, bottom: 2 }
        }
      ).setDepth(999);

      this.debugTexts.push(label);
    });

    const data = this.hotspots[this.selectedIndex]?.hotspotData;
    const { width, height } = this.scene.scale;

    const lines = [
      `LOCAL HOTSPOT DEBUG | ${data?.id || 'no hotspots'}`,
      data
        ? `x:${data.x} y:${data.y} width:${data.width} height:${data.height}`
        : '',
      'Click: select | Drag / Arrows: move',
      'Shift+Arrows: resize | Alt: 1px',
      'Tab / Shift+Tab: select',
      'Ctrl+C / Cmd+C: copy coordinates | D: close',
      this.isLocked
        ? 'Hotspots locked.'
        : 'Hotspot actions disabled while debugging.',
      this._statusText
    ].filter(Boolean);

    this.debugHelp = this.scene.add.text(
      12,
      height - 12,
      lines.join('\n'),
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 6 },
        wordWrap: { width: Math.max(100, width - 40) }
      }
    )
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(1000);
  }

  destroyDebugOverlay() {
    this.debugGraphics?.destroy();
    this.debugGraphics = null;

    this.debugTexts.forEach(text => text?.destroy());
    this.debugTexts = [];

    this.debugHelp?.destroy();
    this.debugHelp = null;
  }

  destroy() {
    if (this._destroyed) return;

    this._destroyed = true;

    this.unbindDebugKeyboard();
    this.destroyDebugOverlay();

    this.scene?.events.off('shutdown', this._onSceneEnd);
    this.scene?.events.off('destroy', this._onSceneEnd);

    this.hotspots.forEach(zone => {
      zone?.removeAllListeners();
      zone?.destroy();
    });

    if (this.scene) {
      this.scene.DEBUG_HOTSPOTS = false;
    }

    this.hotspots = [];
    this.scene = null;
  }
}