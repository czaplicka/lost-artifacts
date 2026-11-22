import { dialogueText } from '../../dialogues/DialogueText.js';

export const LOCAL_DEBUG_ALLOWED = typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);
const FILE = 'scenes/office/OfficeHotspotManager.js';
const text = id => dialogueText(FILE, id);

export const OfficeHotspotDebug = {
  bindDebugKeyboard() {
    this.unbindDebugKeyboard();
    if (this._destroyed || !LOCAL_DEBUG_ALLOWED || !this.scene?.input?.keyboard) return;
    this._debugKeyboard = this.scene.input.keyboard;
    this._debugKeyboard.on('keydown', this._onDebugKeyDown);
  },

  unbindDebugKeyboard() {
    this._debugKeyboard?.off('keydown', this._onDebugKeyDown);
    this._debugKeyboard = null;
  },

  isEditableTarget(event) {
    return [event?.target, document.activeElement].some(element => (
      element?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element?.tagName)
    ));
  },

  handleDebugKey(event) {
    if (!LOCAL_DEBUG_ALLOWED || !this.isSceneActive() || this.isEditableTarget(event)) return;
    const commandKey = event.ctrlKey || event.metaKey;
    if (this.debugEnabled && commandKey && !event.altKey && !event.shiftKey && event.code === 'KeyC') {
      if (window.getSelection()?.toString() || event.repeat) return;
      event.preventDefault();
      event.stopPropagation?.();
      void this.copyConfig();
      return;
    }
    if (commandKey || this.isInteractionLocked()) return;
    if (event.code === 'KeyD') {
      if (event.repeat || event.altKey || event.shiftKey) return;
      event.preventDefault();
      this.toggleDebug();
      return;
    }
    if (!this.debugEnabled || !this.hotspots.length) return;
    if (event.code === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + direction + this.hotspots.length) % this.hotspots.length;
      this._statusText = '';
      this.createDebugOverlay();
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) return;
    event.preventDefault();
    const zone = this.hotspots[this.selectedIndex];
    const data = zone?.hotspotData;
    if (!data) return;
    const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.code);
    const direction = ['ArrowLeft', 'ArrowUp'].includes(event.code) ? -1 : 1;
    const step = event.altKey ? 1 : 5;
    const property = event.shiftKey ? (horizontal ? 'width' : 'height') : (horizontal ? 'x' : 'y');
    data[property] = Math.round(Number(data[property]) + direction * step);
    data.width = Math.max(10, Number(data.width));
    data.height = Math.max(10, Number(data.height));
    this._statusText = '';
    this.syncHotspot(zone);
    this.createDebugOverlay();
  },

  toggleDebug() {
    return this.setDebugEnabled(!this.debugEnabled);
  },

  setDebugEnabled(enabled) {
    if (this._destroyed || this._actionRequest) return false;
    this.debugEnabled = LOCAL_DEBUG_ALLOWED && enabled === true;
    this.scene.DEBUG_HOTSPOTS = this.debugEnabled;
    this._statusText = '';
    this.syncInteractivity();
    this.scene.navigation?.hideHint();
    if (this.debugEnabled) this.createDebugOverlay();
    else this.destroyDebugOverlay();
    return this.debugEnabled;
  },

  getConfigText() {
    const entries = this.hotspots.filter(zone => zone?.scene && zone.hotspotData).map(zone => {
      const data = zone.hotspotData;
      return {
        id: data.id, x: Math.round(data.x), y: Math.round(data.y),
        width: Math.round(data.width), height: Math.round(data.height)
      };
    });
    return JSON.stringify(entries, null, 2);
  },

  printConfig() {
    if (this._destroyed || !LOCAL_DEBUG_ALLOWED || !this.debugEnabled) return '';
    const config = this.getConfigText();
    console.log('[OfficeHotspotManager] Hotspot coordinates:\n' + config);
    return config;
  },

  async copyConfig() {
    if (this._destroyed || !LOCAL_DEBUG_ALLOWED || !this.debugEnabled || this._copyInFlight) return false;
    this._copyInFlight = true;
    let copied = false;
    try {
      const config = this.printConfig();
      const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
      if (clipboard?.writeText) {
        try { await clipboard.writeText(config); copied = true; }
        catch (error) { console.warn('[OfficeHotspotManager] Clipboard API failed:', error); }
      }
      if (!copied && !this._destroyed) copied = this.copyWithTextarea(config);
      if (!this._destroyed) {
        this._statusText = copied ? text('t_d390872faf9921cd47c6') : text('t_bd5f9ad96f5cda7a0e75');
        if (this.debugEnabled && this.isSceneActive()) this.createDebugOverlay();
      }
      return copied;
    } catch (error) {
      console.warn('[OfficeHotspotManager] Copy failed:', error);
      return false;
    } finally {
      this._copyInFlight = false;
    }
  },

  copyWithTextarea(config) {
    const previousFocus = document.activeElement;
    let textarea = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = config;
      textarea.readOnly = true;
      Object.assign(textarea.style, { position: 'fixed', left: '-10000px', top: '0', opacity: '0' });
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      return document.execCommand('copy');
    } catch (error) {
      console.warn('[OfficeHotspotManager] Clipboard fallback failed:', error);
      return false;
    } finally {
      textarea?.remove();
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    }
  },

  createDebugOverlay() {
    if (this._destroyed || !LOCAL_DEBUG_ALLOWED || !this.debugEnabled) return;
    this.destroyDebugOverlay();
    this.debugGraphics = this.scene.add.graphics().setDepth(998);
    this.hotspots.forEach((zone, index) => {
      if (!zone?.scene || !zone.hotspotData) return;
      const data = zone.hotspotData;
      const selected = index === this.selectedIndex;
      const color = selected ? 0xff44ff : 0x00ffcc;
      this.debugGraphics.fillStyle(color, selected ? 0.2 : 0.08);
      this.debugGraphics.fillRect(data.x, data.y, data.width, data.height);
      this.debugGraphics.lineStyle(selected ? 3 : 2, color, 0.95);
      this.debugGraphics.strokeRect(data.x, data.y, data.width, data.height);
      const label = this.scene.add.text(data.x + 8, data.y + 8, `${selected ? '> ' : ''}${data.id}`, {
        fontFamily: 'Arial', fontSize: '16px', color: selected ? '#ff44ff' : '#00ffcc',
        backgroundColor: '#000000', padding: { left: 4, right: 4, top: 2, bottom: 2 }
      }).setDepth(999);
      this.debugTexts.push(label);
    });
    const data = this.hotspots[this.selectedIndex]?.hotspotData;
    const { width, height } = this.scene.scale;
    const lines = [
      `${text('t_9d48e1007e637f811d3b')}${data?.id || text('t_7754a43ab84c63bd005f')}`,
      data ? `${text('t_51e33c7c7efbc350d26f')}${data.x}${text('t_8278a5c11d3d9380f821')}${data.y}${text('t_b87f46679673f5dfd46e')}${data.width}${text('t_4a74ac2931f76f596e2c')}${data.height}` : '',
      text('t_b51e831fe414beddbf5c'), text('t_5bf2b2c221b5499e5ce3'),
      text('t_9d17c0754f4ec7faaf2c'), text('t_a765f85d19300aa48b28'),
      this.isInteractionLocked() ? text('t_d1652b4efb07105037d9') : text('t_d7fa3fed326df60448bf'),
      this._statusText
    ].filter(Boolean);
    this.debugHelp = this.scene.add.text(12, height - 12, lines.join('\n'), {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', backgroundColor: '#000000',
      padding: { x: 8, y: 6 }, wordWrap: { width: Math.max(100, width - 40) }
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(1000);
  },

  destroyDebugOverlay() {
    this.debugGraphics?.destroy();
    this.debugGraphics = null;
    this.debugTexts.forEach(object => object?.destroy());
    this.debugTexts = [];
    this.debugHelp?.destroy();
    this.debugHelp = null;
  }
};
