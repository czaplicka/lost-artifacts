import { saveManager } from '../saveGameService.js';

export const SAVE_LOCATION_TYPES = Object.freeze(['office', 'hotel']);
const stop = event => event?.stopPropagation?.();
export class OfficeSaveUI {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.locationType = String(options.locationType ?? 'office').trim().toLowerCase();
    if (!SAVE_LOCATION_TYPES.includes(this.locationType)) throw new Error('Invalid save location.');
    this.locationCode = options.locationCode || (this.locationType === 'hotel' ? 'hotel_room' : 'agency_headquarters');
    this.cityCode = options.cityCode || (this.locationType === 'hotel' ? 'unknown_city' : 'hq');
    this.button = null;
    this.panel = null;
    this.backdrop = null;
    this.statusText = null;
    this.slotButtons = [];
    this.isOpen = false;
    this.isSaving = false;
    this.destroyed = false;
    this._buttonLocked = false;
    this._openToken = null;
    this._slots = [];
  }
  _isCurrentOpening(token) {
    return !this.destroyed && this.isOpen && this._openToken === token && this.panel?.active;
  }
  _notifyPanelState() {
    this.scene.events?.emit('ui-panel-state-changed', { panel: 'save', isOpen: this.isOpen });
    if (typeof this.scene.refreshPanelLock === 'function') this.scene.refreshPanelLock();
    else {
      const hud = this.scene.getPlayerHud?.() ?? this.scene.getPlayerHudScene?.();
      this.scene.applyLock?.(Boolean(this.isOpen || this.scene.agencyLedgerUI?.isOpen || hud?.isAnyPanelOpen?.()));
    }
  }
  createButton() {
    if (this.destroyed || this.button?.active) return;
    const { width, height } = this.scene.scale;
    const x = Math.min(1780, width - 95);
    const y = height - 66;
    if (this.scene.textures.exists('btnSave')) {
      this.button = this.scene.add.image(x, y, 'btnSave').setScale(0.5);
    } else {
      this.button = this.scene.add.text(x, y, 'SAVE', {
        fontFamily: 'SpecialElite, monospace', fontSize: '18px', color: '#f1d480',
        backgroundColor: '#1c1109', padding: { x: 12, y: 8 }
      });
    }
    this.button.setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.button.on('pointerdown', (pointer, x, y, event) => {
      stop(event);
      if (!this.destroyed && !this._buttonLocked && !this.scene.uiLocked && !this.isOpen && !this.isSaving) void this.open();
    });
    this.setLocked(this._buttonLocked);
  }
  setLocked(locked) {
    this._buttonLocked = Boolean(locked);
    if (!this.button?.active) return;
    this.button.setAlpha(locked ? 0.4 : 1);
    if (locked) this.button.disableInteractive();
    else this.button.setInteractive({ useHandCursor: true });
  }
  async open() {
    if (this.destroyed || this.isOpen || this.isSaving || !this.scene.sys.isActive()) return;
    const token = Symbol('save-panel');
    this._openToken = token;
    this.isOpen = true;
    const { width, height } = this.scene.scale;
    this.backdrop = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(1500).setInteractive();
    this.backdrop.on('pointerdown', (pointer, x, y, event) => {
      stop(event);
      if (!this.isSaving) this.close();
    });
    this.panel = this.scene.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(1501);
    this.panel.setScale(Math.min(1, (width - 24) / 660, (height - 24) / 620));
    const bg = this.scene.add.rectangle(0, 0, 640, 600, 0x17100b)
      .setStrokeStyle(4, 0xc99738).setInteractive();
    bg.on('pointerdown', (pointer, x, y, event) => stop(event));
    const title = this.makeText(0, -255, this.locationType === 'hotel' ? 'HOTEL SAFE' : 'AGENCY ARCHIVES', 29, '#f2d989');
    const subtitle = this.makeText(0, -212, 'Choose a case file to save your investigation.', 18);
    const close = this.makeText(280, -263, 'X', 28, '#f0c2b6').setInteractive({ useHandCursor: true });
    close.on('pointerdown', (pointer, x, y, event) => { stop(event); if (!this.isSaving) this.close(); });
    this.statusText = this.makeText(0, 240, 'Reading case files...', 18);
    this.panel.add([bg, title, subtitle, close, this.statusText]);
    this._slots = ['slot_1', 'slot_2', 'slot_3'].map(slotKey => ({
      slotKey, localMeta: saveManager.readLocalMeta(slotKey), cloudMeta: null, preferredSource: 'local'
    }));
    this.createSlotButtons(this._slots);
    this._notifyPanelState();
    try {
      const slots = await saveManager.listSlots();
      if (!this._isCurrentOpening(token) || this.isSaving) return;
      this.createSlotButtons(slots);
      this.setStatus('Choose a save slot.');
    } catch (error) {
      if (this._isCurrentOpening(token) && !this.isSaving) this.setStatus('Cloud unavailable. Local saving is ready.', '#f3d28a');
      console.warn('[OfficeSaveUI]', error);
    }
  }
  makeText(x, y, text, size = 17, color = '#d4c4a6') {
    return this.scene.add.text(x, y, text, {
      fontFamily: 'SpecialElite, monospace', fontSize: `${size}px`, color,
      align: 'center', wordWrap: { width: 550 }, lineSpacing: 4
    }).setOrigin(0.5);
  }
  _destroySlotButtons() {
    for (const slot of this.slotButtons) { slot.background?.destroy(); slot.text?.destroy(); }
    this.slotButtons = [];
  }
  getPreferredMeta(slot) {
    if (!slot) return null;
    return slot.preferredSource === 'cloud' ? slot.cloudMeta : slot.localMeta ?? slot.cloudMeta;
  }
  formatSlotLabel(number, meta, source = '') {
    const city = String(meta.cityCode || 'UNKNOWN CITY').toUpperCase();
    const location = String(meta.locationCode || 'unknown location').replaceAll('_', ' ');
    return `SLOT ${number} — ${city}\nAgent: ${meta.agentName || 'Name unavailable in this older save'}\n${source}\nDay ${meta.dayNumber ?? 1}, ${String(meta.inGameHour ?? 8).padStart(2, '0')}:00 — ${location}`;
  }
  createSlotButtons(slots = []) {
    if (this.destroyed || !this.isOpen || !this.panel?.active) return;
    this._slots = slots;
    this._destroySlotButtons();
    for (let index = 0; index < 3; index++) {
      const slotKey = `slot_${index + 1}`;
      const slot = slots.find(item => item.slotKey === slotKey);
      const meta = this.getPreferredMeta(slot);
      const sources = [slot?.localMeta ? 'LOCAL' : '', slot?.cloudMeta ? 'CLOUD' : ''].filter(Boolean).join(' + ');
      const source = sources ? `${sources} | Latest: ${(slot?.preferredSource || 'local').toUpperCase()}` : '';
      const label = meta ? this.formatSlotLabel(index + 1, meta, source) : `SLOT ${index + 1}\nEmpty case file`;
      const y = -125 + index * 120;
      const background = this.scene.add.rectangle(0, y, 570, 108, 0x24170e)
        .setStrokeStyle(2, 0x8f6b35).setInteractive({ useHandCursor: true });
      const text = this.makeText(0, y, label, 17, meta ? '#f1deb0' : '#a99a80');
      this.panel.add([background, text]);
      background.on('pointerdown', (pointer, x, y, event) => {
        stop(event);
        void this.saveToSlot(slotKey);
      });
      background.on('pointerover', () => { if (!this.isSaving) background.setFillStyle(0x4a3219); });
      background.on('pointerout', () => { if (!this.isSaving) background.setFillStyle(0x24170e); });
      this.slotButtons.push({ background, text });
    }
  }
  async saveToSlot(slotKey) {
    if (this.destroyed || !this.isOpen || this.isSaving) return;
    const token = this._openToken;
    this.isSaving = true;
    this.setSlotButtonsEnabled(false);
    this.setStatus('Saving locally...', '#f1d480');
    try {
      const result = await saveManager.save(slotKey, {
        locationType: this.locationType, locationCode: this.locationCode,
        cityCode: this.cityCode, sceneKey: this.scene.scene.key,
        onLocalSaved: payload => {
          if (!this._isCurrentOpening(token)) return;
          this.updateSlot(slotKey, payload.meta, false);
          this.setStatus('LOCAL saved. Checking CLOUD...', '#a8e796');
        }
      });
      if (!this._isCurrentOpening(token)) return;
      if (!result?.ok) throw new Error('Save was not confirmed.');
      this.updateSlot(slotKey, result.payload.meta, result.mode === 'cloud+local');
      if (result.mode === 'cloud+local') this.setStatus('Saved: LOCAL + CLOUD.', '#a8e796');
      else if (result.mode === 'local-fallback') this.setStatus('Saved: LOCAL. CLOUD not confirmed.', '#f3d28a');
      else this.setStatus('Saved: LOCAL. No active cloud session.', '#a8e796');
    } catch (error) {
      console.error('[OfficeSaveUI] Save failed:', error);
      if (this._isCurrentOpening(token)) this.setStatus(`Save failed: ${error?.message || error}`, '#ff9f91');
    } finally {
      this.isSaving = false;
      if (this._isCurrentOpening(token)) this.setSlotButtonsEnabled(true);
    }
  }
  updateSlot(key, meta, cloudConfirmed) {
    this._slots = this._slots.filter(slot => slot.slotKey !== key).concat({
      slotKey: key, localMeta: meta, cloudMeta: cloudConfirmed ? meta : null, preferredSource: 'local'
    });
    this.createSlotButtons(this._slots);
    this.setSlotButtonsEnabled(false);
  }
  setSlotButtonsEnabled(enabled) {
    for (const slot of this.slotButtons) {
      if (!slot.background?.active) continue;
      if (enabled) slot.background.setInteractive({ useHandCursor: true });
      else slot.background.disableInteractive();
      slot.background.setAlpha(enabled ? 1 : 0.65);
    }
  }
  setStatus(text, color = '#d8c49a') {
    if (this.statusText?.active) this.statusText.setText(text).setColor(color);
  }
  close() {
    this._openToken = null;
    const wasOpen = this.isOpen;
    this.isOpen = false;
    this._destroySlotButtons();
    this.panel?.destroy(true);
    this.backdrop?.destroy();
    this.panel = this.backdrop = this.statusText = null;
    if (wasOpen) this._notifyPanelState();
  }
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.close();
    this.button?.destroy();
    this.button = null;
  }
}
