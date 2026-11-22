import { dialogueText } from '../dialogues/DialogueText.js';
import { saveManager } from '../saveGameService.js';
import { OfficeSavePanelView, SLOT_KEYS, W, H } from './OfficeSavePanelView.js';
const text = id => dialogueText('ui/OfficeSaveUI.js', id);
export const SAVE_LOCATION_TYPES = Object.freeze(['office', 'hotel']);

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
    this.closeButton = null;
    this.slotButtons = [];
    this.isOpen = false;
    this.isSaving = false;
    this.destroyed = false;
    this._buttonLocked = false;
    this._openToken = null;
    this._slots = [];
    this._saveRevision = 0;
    this.onResize = this.layout.bind(this);
    this.scene.scale.on('resize', this.onResize);
  }

  _isCurrentOpening(token) {
    return Boolean(!this.destroyed && !this.scene._cleanupDone && this.isOpen &&
      this._openToken === token && this.panel?.active);
  }

  _notifyPanelState() {
    this.scene.events?.emit('ui-panel-state-changed', {panel: 'save', isOpen: this.isOpen});
    if (typeof this.scene.refreshPanelLock === 'function') {
      this.scene.refreshPanelLock();
      return;
    }
    const hud = this.scene.getPlayerHud?.() ?? this.scene.getPlayerHudScene?.();
    this.scene.applyLock?.(Boolean(this.isOpen || this.scene.isChoosingHotel ||
      this.scene.isSleeping || this.scene.isSleepMenuOpen || this.scene.isLeaving ||
      this.scene.isTransitioning || this.scene.agencyLedgerUI?.isOpen || hud?.isAnyPanelOpen?.()));
  }

  canOpen() {
    return Boolean(!this.destroyed && !this.scene._cleanupDone && !this.isOpen &&
      !this.isSaving && !this._buttonLocked && !this.scene.uiLocked &&
      this.scene.sys.isActive());
  }

  createButton() {
    if (this.destroyed || this.button?.active) return;
    this.button = this.scene.textures.exists('btnSave')
      ? this.scene.add.image(0, 0, 'btnSave').setScale(0.5)
      : this.scene.add.text(0, 0, text('t_c210bfdf28cec3d9edb6'), {
        fontFamily: 'SpecialElite', fontSize: '18px', color: '#f1d480',
        backgroundColor: '#1c1109', padding: {x: 12, y: 8}
      });
    this.button.setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.button.on('pointerdown', (pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
      void this.open().catch(error => console.error('[OfficeSaveUI] Opening failed:', error));
    });
    this.layout();
    this.setLocked(this._buttonLocked);
  }

  setLocked(locked) {
    this._buttonLocked = Boolean(locked);
    if (!this.button?.active) return;
    this.button.setAlpha(this._buttonLocked ? 0.4 : 1);
    if (this._buttonLocked) this.button.disableInteractive();
    else this.button.setInteractive({useHandCursor: true});
  }

  layout() {
    if (this.destroyed) return;
    const {width, height} = this.scene.scale;
    this.button?.setPosition(Math.min(1780, width - 95), height - 66);
    this.backdrop?.setPosition(0, 0).setSize(width, height);
    if (!this.panel?.active) return;
    const fit = Math.max(0.01, Math.min(1, width * 0.94 / W, height * 0.92 / H));
    this.panel.setScale(fit).setPosition((width - W * fit) / 2, (height - H * fit) / 2);
  }

  async open() {
    if (!this.canOpen()) return false;
    const token = Symbol('save-panel');
    this._openToken = token;
    this.isOpen = true;
    try {
      this.scene.getPlayerHudScene?.()?.closeAllUIPanels?.();
      this.createPanel();
      this._slots = SLOT_KEYS.map(slotKey => ({
        slotKey, localMeta: saveManager.readLocalMeta(slotKey), cloudMeta: null, preferredSource: 'local'
      }));
      this.createSlotButtons(this._slots);
      this.setStatus(text('t_ed7d34157456be9caadb'));
      this._notifyPanelState();
    } catch (error) {
      this.close();
      console.error('[OfficeSaveUI] Panel creation failed:', error);
      throw error;
    }
    const revision = this._saveRevision;
    try {
      const slots = await saveManager.listSlots();
      if (!this._isCurrentOpening(token) || this.isSaving || revision !== this._saveRevision) return false;
      if (!Array.isArray(slots)) throw new Error('Invalid save slot list.');
      this.createSlotButtons(slots);
      this.setStatus(text('t_c8e40296efda87144027'));
    } catch (error) {
      console.warn('[OfficeSaveUI] Slot listing failed:', error);
      if (this._isCurrentOpening(token) && !this.isSaving && revision === this._saveRevision) {
        this.setStatus(text('t_9719306b5e0a75f6f627'), '#843b32');
      }
    }
    return this._isCurrentOpening(token);
  }

  getPreferredMeta(slot) {
    if (!slot) return null;
    return slot.preferredSource === 'cloud'
      ? slot.cloudMeta ?? slot.localMeta ?? null : slot.localMeta ?? slot.cloudMeta ?? null;
  }

  getDetectiveName(meta) {
    const name = typeof meta?.agentName === 'string' ? meta.agentName.trim() : '';
    return name || text('t_1c3c21b36dbfc0c36c90');
  }

  getDescription(meta) {
    if (!meta) return text('t_f72b1d879f0c11b4c9c7');
    const location = String(meta.locationCode || text('t_2fad2d87e767ac042191')).replace(/_/g, ' ');
    const city = String(meta.cityCode || text('t_2491fe94a7ba027ffff4')).replace(/_/g, ' ');
    const day = meta.dayNumber ?? 1;
    const hour = String(meta.inGameHour ?? 8).padStart(2, '0');
    const timestamp = meta.savedAt ?? meta.updatedAt;
    const date = timestamp ? new Date(timestamp) : null;
    const savedAt = date && Number.isFinite(date.getTime()) ? date.toLocaleString() : text('t_bdda387b434325c2d39b');
    return `${location}${text('t_005e1574a2b5c8163046')}${city}${text('t_309e4b952d6e7edd3d80')}${day}${text('t_0a07f659461970d8d8dc')}${hour}${text('t_9c428458a2971552e401')}` +
      `${text('t_4d9f3906b5b271ef9de9')}${savedAt}`;
  }

  async saveToSlot(slotKey) {
    if (this.destroyed || !this.isOpen || this.isSaving || !SLOT_KEYS.includes(slotKey)) return;
    const token = this._openToken;
    this.isSaving = true;
    this._saveRevision++;
    try {
      this.setSlotButtonsEnabled(false);
      this.closeButton?.setAlpha(0.45);
      this.setStatus(text('t_15f1fd91ab06b7a358c0'), '#79654c');
      const result = await saveManager.save(slotKey, {
        locationType: this.locationType, locationCode: this.locationCode,
        cityCode: this.cityCode, sceneKey: this.scene.sys.settings.key,
        onLocalSaved: payload => {
          if (!this._isCurrentOpening(token)) return;
          this.updateSlot(slotKey, payload.meta, false);
          this.setStatus(text('t_86aeed54317f2a603014'), '#42613c');
        }
      });
      if (!this._isCurrentOpening(token)) return;
      if (!result?.ok || !result.payload?.meta) throw new Error('Save was not confirmed.');
      this.updateSlot(slotKey, result.payload.meta, result.mode === 'cloud+local');
      if (result.mode === 'cloud+local') this.setStatus(text('t_445e164617389cfcde0a'), '#42613c');
      else if (result.mode === 'local-fallback') this.setStatus(text('t_6ecf79a611f3e13ec028'), '#843b32');
      else this.setStatus(text('t_6ff47e2bc192030d1f06'), '#42613c');
    } catch (error) {
      console.error('[OfficeSaveUI] Save failed:', error);
      if (this._isCurrentOpening(token)) {
        this.setStatus(text('t_8e3a4b4cd0b68f85a78f') + (error?.message || String(error)), '#a13e32');
      }
    } finally {
      this.isSaving = false;
      if (this._isCurrentOpening(token)) {
        this.setSlotButtonsEnabled(true);
        this.closeButton?.setAlpha(1);
      }
    }
  }

  updateSlot(slotKey, meta, cloudConfirmed) {
    const previous = this._slots.find(slot => slot.slotKey === slotKey);
    this._slots = this._slots.filter(slot => slot.slotKey !== slotKey).concat({
      slotKey, localMeta: meta,
      cloudMeta: cloudConfirmed ? meta : previous?.cloudMeta ?? null, preferredSource: 'local'
    });
    this.createSlotButtons(this._slots);
  }

  setSlotButtonsEnabled(enabled) {
    for (const slot of this.slotButtons) {
      if (!slot.hit?.active) continue;
      if (enabled) slot.hit.setInteractive({useHandCursor: true});
      else slot.hit.disableInteractive();
      slot.card?.setAlpha(enabled ? 1 : 0.65);
    }
  }

  setStatus(message, color = '#75634d') {
    if (this.statusText?.active) this.statusText.setText(message).setColor(color);
  }

  close() {
    this._openToken = null;
    const wasOpen = this.isOpen;
    this.isOpen = false;
    this._destroySlotButtons();
    this.panel?.destroy(true);
    this.backdrop?.destroy();
    this.panel = null;
    this.backdrop = null;
    this.statusText = null;
    this.closeButton = null;
    if (wasOpen) this._notifyPanelState();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.scale.off('resize', this.onResize);
    this.close();
    this.button?.destroy();
    this.button = null;
  }
}
Object.assign(OfficeSaveUI.prototype, OfficeSavePanelView);
