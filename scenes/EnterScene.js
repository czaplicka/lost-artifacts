import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { supabase } from '../supabase-client.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { saveManager } from '../saveGameService.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';

const STORAGE_KEYS = { START_NEW_GAME_AFTER_REGISTER: 'lost-artefacts:pending-new-game-after-register' };
const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3'];
const BUTTON_Y = { LOGIN: 0.28, REGISTER: 0.47, CONTINUE: 0.65, NEW_GAME: 0.82 };

export class EnterScene extends BaseScene {
  constructor() {
    super({ key: 'EnterScene' });
    this.modalElement = null;
    this.modalFrame = null;
    this.currentUser = null;
    this.onWindowMessage = null;
    this.saveSlotPicker = null;
    this.isLoadingSave = false;
    this.isEnteringGame = false;
    this.isRestoringSession = false;
    this.isHandlingAuth = false;
    this.noticeText = null;
    this.noticeHideTimer = null;
    this.entryButtons = [];
    this.enterRunId = 0;
    this.enterDisposed = true;
    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  async create() {
    super.create();
    const runId = ++this.enterRunId;
    this.enterDisposed = false;
    this.currentUser = null;
    this.isLoadingSave = false;
    this.isEnteringGame = false;
    this.isRestoringSession = true;
    this.isHandlingAuth = false;
    this.noticeHideTimer = null;
    this.entryButtons = [];
    audioManager.init(this);
    EventBus.emit('hideHUD');
    const { width, height } = this.scale;
    this._buildBackground(width, height);
    this._buildButtons(width, height);
    this._buildNoticeArea(width, height);
    this.updateEntryButtons();
    this.onWindowMessage = this.handleWindowMessage.bind(this);
    window.addEventListener('message', this.onWindowMessage);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
    try {
      await this.restoreSavedSession(runId);
    } catch (error) {
      if (this.isCurrentRun(runId)) {
        console.error('[EnterScene] Session restore failed:', error);
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_0e3b351a7be80fec04bf"));
      }
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isRestoringSession = false;
        this.updateEntryButtons();
      }
    }
  }

  isCurrentRun(runId = this.enterRunId) {
    return !this.enterDisposed && runId === this.enterRunId && !this._cleanupDone && this.sys.isActive();
  }
  isBusy() {
    return this.isRestoringSession || this.isHandlingAuth || this.isLoadingSave || this.isEnteringGame;
  }
  canUseEntry() {
    return this.isCurrentRun() && !this.isBusy() && !this.saveSlotPicker && !this.modalElement;
  }
  updateEntryButtons() {
    const enabled = this.canUseEntry();
    this.entryButtons.forEach(button => {
      if (!button?.active) return;
      button.setAlpha(enabled ? 1 : 0.55);
      if (button.input) button.input.enabled = enabled;
      if (!enabled) button.setScale(1);
    });
  }
  _buildBackground(width, height) {
    const bg = this.add.image(width / 2, height / 2, 'enter');
    bg.setScale(Math.max(width / bg.width, height / bg.height)).setScrollFactor(0);
  }
  _buildButtons(width, height) {
    const definitions = [
      { key: 'loginbtn', y: BUTTON_Y.LOGIN, action: () => this.openModal(__dialogueText("scenes/EnterScene.js", "t_f7df8ca1f6a5b4e55cc0")) },
      { key: 'registerbtn', y: BUTTON_Y.REGISTER, action: () => this.openModal(__dialogueText("scenes/EnterScene.js", "t_b501885e1f9e699b0093")) },
      { key: 'btnContinue', y: BUTTON_Y.CONTINUE, action: () => this.handlePrimaryEntry() },
      { key: 'new_game', y: BUTTON_Y.NEW_GAME, action: () => this.startNewGameFlow(this.currentUser ? 'account' : 'guest') }
    ];
    definitions.forEach(({ key, y, action }) => {
      const button = this.add.image(width * 0.23, height * y, key)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.addHoverEffect(button);
      button.on('pointerdown', pointer => {
        if (pointer?.event?.button !== undefined && pointer.event.button !== 0) return;
        if (this.canUseEntry()) action();
      });
      this.entryButtons.push(button);
    });
  }
  _buildNoticeArea(width, height) {
    this.noticeText = this.add.text(width * 0.5, height * 0.93, '', {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffe066',
      backgroundColor: '#1a1208', padding: { x: 18, y: 10 },
      align: 'center', wordWrap: { width: width * 0.65 }
    }).setOrigin(0.5).setDepth(6000).setAlpha(0);
  }
  _showNotice(message, duration = 5000) {
    if (!message || !this.noticeText?.active || !this.isCurrentRun()) return;
    this.noticeHideTimer?.remove(false);
    this.noticeHideTimer = null;
    this.killTrackedTweensOf(this.noticeText);
    this.noticeText.setText(message).setAlpha(1);
    const runId = this.enterRunId;
    this.noticeHideTimer = this.time.delayedCall(duration, () => {
      if (!this.isCurrentRun(runId)) return;
      this.noticeHideTimer = null;
      if (!this.noticeText?.active) return;
      this.createTrackedTween({ targets: this.noticeText, alpha: 0, duration: 400, ease: 'Quad.out' });
    });
  }
  async restoreSavedSession(runId = this.enterRunId) {
    const { data, error } = await supabase.auth.getSession();
    if (!this.isCurrentRun(runId)) return;
    if (error) {
      console.warn('[EnterScene] Could not restore session:', error.message);
      this._showNotice(__dialogueText("scenes/EnterScene.js", "t_0e3b351a7be80fec04bf"));
      return;
    }
    this.currentUser = data?.session?.user ?? null;
    if (this.currentUser) await this.ensurePlayerProfile(this.currentUser, runId);
  }
  handlePrimaryEntry() {
    if (!this.canUseEntry()) return;
    if (this.currentUser) this.startLoadFlow('account');
    else if (this.hasGuestSave()) this.startLoadFlow('guest');
    else this.startNewGameFlow('guest');
  }
  async handleWindowMessage(event) {
    if (!this.isCurrentRun() || this.isBusy()) return;
    if (event.origin !== window.location.origin) return;
    if (!this.modalFrame || event.source !== this.modalFrame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'lost-artefacts:auth-registered') {
      this.rememberNewGameAfterRegistration();
      this.closeModal();
      this._showNotice(__dialogueText("scenes/EnterScene.js", "t_49256e316aa68744263d"), 6000);
      return;
    }
    if (message.type !== 'lost-artefacts:auth-signed-in') return;
    const runId = this.enterRunId;
    const frame = this.modalFrame;
    let nextAction = null;
    this.isHandlingAuth = true;
    this.updateEntryButtons();
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!this.isCurrentRun(runId) || this.modalFrame !== frame) return;
      const user = data?.session?.user;
      if (error || !user) {
        console.warn('[EnterScene] No session after login:', error?.message || 'Session missing.');
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_26baf5b5ee70458e1328"));
        return;
      }
      this.currentUser = user;
      await this.ensurePlayerProfile(user, runId);
      if (!this.isCurrentRun(runId) || this.modalFrame !== frame) return;
      nextAction = this.shouldStartNewGameAfterRegistration() ? 'new' : 'load';
      this.closeModal();
    } catch (error) {
      if (this.isCurrentRun(runId)) {
        console.error('[EnterScene] Login handling failed:', error);
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_9c7ad448bfdaf573d072"));
      }
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isHandlingAuth = false;
        this.updateEntryButtons();
      }
    }
    if (!this.isCurrentRun(runId)) return;
    if (nextAction === 'new') this.startNewGameFlow('account');
    else if (nextAction === 'load') this.startLoadFlow('account');
  }
  async ensurePlayerProfile(user, runId = this.enterRunId) {
    if (!user?.id || !this.isCurrentRun(runId)) return false;
    const displayName = user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? __dialogueText("scenes/EnterScene.js", "t_11b39c93777e8f1f3983");
    try {
      const { error } = await supabase.from('player_profiles')
        .upsert({ id: user.id, display_name: displayName }, { onConflict: 'id' });
      if (!this.isCurrentRun(runId)) return false;
      if (error) {
        console.warn('[EnterScene] Could not prepare player profile:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      if (this.isCurrentRun(runId)) console.warn('[EnterScene] Player profile request failed:', error);
      return false;
    }
  }
  hasGuestSave() {
    return SLOT_KEYS.some(slotKey => {
      try { return Boolean(saveManager.readLocalMeta(slotKey)); }
      catch { return false; }
    });
  }
  rememberNewGameAfterRegistration() {
    try { localStorage.setItem(STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER, 'true'); }
    catch (error) { console.warn('[EnterScene] Could not remember registration intent:', error); }
  }
  shouldStartNewGameAfterRegistration() {
    try { return localStorage.getItem(STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER) === 'true'; }
    catch { return false; }
  }
  clearNewGameAfterRegistrationIntent() {
    try { localStorage.removeItem(STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER); }
    catch (error) { console.warn('[EnterScene] Could not clear registration intent:', error); }
  }
  startNewGameFlow(authMode) {
    if (!this.isCurrentRun() || this.isBusy() || this.saveSlotPicker) return;
    if (authMode === 'account' && !this.currentUser) return;
    const runId = this.enterRunId;
    const clearRegistrationIntent = authMode === 'account' && this.shouldStartNewGameAfterRegistration();
    this.isEnteringGame = true;
    this.closeModal();
    this.updateEntryButtons();
    void (async () => {
      try {
        const started = await this.goto('IntroScene', {
          authMode, playerId: this.currentUser?.id ?? null,
          playerEmail: this.currentUser?.email ?? null, displayName: this.getDisplayName(),
          isNewGame: true, startOnboarding: true
        });
        if (started && clearRegistrationIntent) this.clearNewGameAfterRegistrationIntent();
        if (!this.isCurrentRun(runId)) return;
        if (!started) {
          this.isEnteringGame = false;
          this.updateEntryButtons();
          this._showNotice(__dialogueText("scenes/EnterScene.js", "t_4e567b063739189afad2"), 4000);
        }
      } catch (error) {
        if (!this.isCurrentRun(runId)) return;
        this.isEnteringGame = false;
        this.updateEntryButtons();
        console.error('[EnterScene] New game failed:', error);
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_4e567b063739189afad2"), 4000);
      }
    })();
  }
  startLoadFlow(authMode) {
    if (!this.isCurrentRun() || this.isBusy() || this.saveSlotPicker) return;
    if (authMode === 'account' && !this.currentUser) return;
    this.closeModal();
    void this.openSaveSlotPicker(authMode);
  }
  closeSaveSlotPicker(force = false) {
    if (this.isLoadingSave && !force) return false;
    const root = this.saveSlotPicker;
    this.saveSlotPicker = null;
    if (root) {
      this.killTrackedTweensOf(root);
      root.destroy(true);
    }
    this.updateEntryButtons();
    return true;
  }

  async openSaveSlotPicker(authMode) {
    if (!this.isCurrentRun() || this.isBusy() || this.saveSlotPicker) return;
    const runId = this.enterRunId;
    const { width, height } = this.scale;
    const accountMode = authMode === 'account';
    const root = this.add.container(0, 0).setDepth(5000);
    this.saveSlotPicker = root;
    this.updateEntryButtons();

    // Fixed design coordinates keep the layout consistent on smaller canvases.
    const W = accountMode ? 980 : 680;
    const H = 680;
    const fit = Math.min(1, width * 0.94 / W, height * 0.92 / H);
    const sheet = this.add.container((width - W * fit) / 2, (height - H * fit) / 2).setScale(fit);
    const dim = this.add.rectangle(0, 0, width, height, 0x080a0b, 0.86)
      .setOrigin(0).setInteractive();
    root.add([dim, sheet]);
    dim.on('pointerdown', () => this.closeSaveSlotPicker());

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(9, 12, W - 9, H - 12, 8);
    panel.fillStyle(0x433023, 1);
    panel.fillRoundedRect(0, 0, W - 10, H - 12, 8);
    panel.lineStyle(2, 0x96734b, 1);
    panel.strokeRoundedRect(0, 0, W - 10, H - 12, 8);
    panel.fillStyle(0xc3a16c, 1);
    panel.fillRoundedRect(20, 20, 225, 40, 5);
    panel.fillStyle(0xe7d7b5, 1);
    panel.fillRect(20, 52, W - 50, H - 85);
    panel.lineStyle(1, 0xbca782, 0.3);
    for (let yy = 161; yy < H - 50; yy += 23) panel.lineBetween(33, yy, W - 43, yy);
    sheet.add(panel);
    const panelHit = this.add.rectangle(0, 0, W - 10, H - 12, 0, 0).setOrigin(0).setInteractive();
    sheet.add(panelHit);

    const label = (x, y, text, size = 18, color = '#463525', font = 'SpecialElite') => {
      const t = this.add.text(x, y, text, { fontFamily: font, fontSize: `${size}px`, color });
      sheet.add(t);
      return t;
    };
    label(36, 31, __dialogueText("scenes/EnterScene.js", "t_f50fb63cedd84f2ff058"), 10, '#38291d', 'PressStart2P');
    label(42, 74, __dialogueText("scenes/EnterScene.js", "t_a63bbbb9ae82339aaa03"), 26, '#30271f', 'SpecialElite');
    label(43, 111, __dialogueText("scenes/EnterScene.js", "t_365d9843a5b2e7b69a37"), 17, '#79654c');
    const close = label(W - 76, 77, __dialogueText("scenes/EnterScene.js", "t_8e2c8e52dc76bf5ed51a"), 15, '#843b32').setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => this.closeSaveSlotPicker());
    close.on('pointerover', () => close.setColor('#bc4d38'));
    close.on('pointerout', () => close.setColor('#843b32'));
    label(43, H - 64, __dialogueText("scenes/EnterScene.js", "t_92e9bcfbfb8896b48996"), 16, '#75634d');
    const loadingText = label(W / 2, H / 2, __dialogueText("scenes/EnterScene.js", "t_162bac9307bed52bb4d8"), 22).setOrigin(0.5);
    root.setAlpha(0);
    this.createTrackedTween({ targets: root, alpha: 1, duration: 180, ease: 'Quad.Out' });

    let slots;
    try {
      slots = accountMode ? await saveManager.listSlots() : SLOT_KEYS.map(slotKey => ({
        slotKey, localMeta: saveManager.readLocalMeta(slotKey), cloudMeta: null
      }));
      if (!Array.isArray(slots)) throw new Error('Invalid save slot list.');
    } catch (error) {
      if (this.isCurrentRun(runId) && this.saveSlotPicker === root && root.active) {
        console.error('[EnterScene] Could not list saves:', error);
        loadingText.setText(__dialogueText("scenes/EnterScene.js", "t_7eb09407c9b63cfcd061")).setAlign('center');
      }
      return;
    }
    if (!this.isCurrentRun(runId) || this.saveSlotPicker !== root || !root.active) return;
    loadingText.destroy();
    const columns = accountMode ? [
      { source: 'cloud', label: __dialogueText("scenes/EnterScene.js", "t_5a9a774f1b60dfc3aecd"), metaKey: 'cloudMeta' },
      { source: 'local', label: __dialogueText("scenes/EnterScene.js", "t_807990c9d0ef4a017ab1"), metaKey: 'localMeta' }
    ] : [{ source: 'local', label: __dialogueText("scenes/EnterScene.js", "t_807990c9d0ef4a017ab1"), metaKey: 'localMeta' }];
    const margin = 42, gap = 22;
    const columnWidth = (W - 10 - margin * 2 - gap * (columns.length - 1)) / columns.length;
    columns.forEach((column, columnIndex) => {
      const x = margin + columnIndex * (columnWidth + gap) + columnWidth / 2;
      label(x, 154, column.label, 10, '#71604b', 'PressStart2P').setOrigin(0.5, 0);
      SLOT_KEYS.forEach((slotKey, index) => {
        const slot = slots.find(entry => entry.slotKey === slotKey);
        this.buildSaveSlotCard({
          root, parent: sheet, slotKey, index, authMode, source: column.source,
          meta: slot?.[column.metaKey] ?? null, x, y: 184 + index * 140,
          width: columnWidth, height: 126
        });
      });
    });
  }

  buildSaveSlotCard({ root, parent = root, slotKey, index, authMode, source, meta, x, y, width, height }) {
    const hasSave = Boolean(meta);
    const card = this.add.container(x - width / 2, y);
    parent.add(card);
    const art = this.add.graphics();
    const draw = (hover = false) => {
      art.clear();
      art.fillStyle(0x3a2919, hover ? 0.22 : 0.12);
      art.fillRect(3, 5, width, height);
      art.fillStyle(hasSave ? (hover ? 0xfff5d8 : 0xf5e9cc) : 0xd9ceb5, 1);
      art.fillRect(0, 0, width, height);
      art.lineStyle(1, hasSave ? (hover ? 0x947047 : 0xb49a70) : 0xb8a98d, 1);
      art.strokeRect(0, 0, width, height);
      art.fillStyle(hasSave ? 0x87533d : 0xa99c82, 1);
      art.fillRect(0, 0, 5, height);
      art.lineStyle(1, 0xbaa483, 0.55);
      art.lineBetween(17, 66, width - 17, 66);
    };
    draw();
    card.add(art);
    const text = (xx, yy, value, size, color, font = 'SpecialElite') => {
      const t = this.add.text(xx, yy, value, { fontFamily: font, fontSize: `${size}px`, color });
      card.add(t);
      return t;
    };
    text(18, 12, `${__dialogueText("scenes/EnterScene.js", "t_211a0a700409e2ce5044")}${index + 1}`, 9, '#806c50', 'PressStart2P');
    const name = text(18, 33, hasSave ? this.getSaveDetectiveName(meta) : __dialogueText("scenes/EnterScene.js", "t_6b4cf9ab2c7423af4006"), 24,
      hasSave ? '#30281f' : '#8f816c');
    // Reserve one line for the full name and shrink only when necessary.
    for (let size = 24; size >= 14; size--) {
      name.setFontSize(size);
      if (name.width <= width - 36) break;
    }
    if (name.width > width - 36) name.setScale((width - 36) / name.width);
    if (!hasSave) {
      text(18, 81, __dialogueText("scenes/EnterScene.js", "t_f72b1d879f0c11b4c9c7"), 16, '#8f816c');
      return;
    }
    const description = text(18, 75, this.getSaveSlotDescription(meta), 14, '#68583f');
    if (description.width > width - 36) description.setScale((width - 36) / description.width);
    const openLabel = text(width - 18, 13, __dialogueText("scenes/EnterScene.js", "t_24e03ed599339942ea5c"), 10, '#8e4d37').setOrigin(1, 0);
    const hit = this.add.rectangle(0, 0, width, height, 0, 0).setOrigin(0)
      .setInteractive({ useHandCursor: true });
    card.add(hit);
    hit.on('pointerover', () => {
      if (this.isBusy()) return;
      draw(true);
      openLabel.setColor('#b1492d');
    });
    hit.on('pointerout', () => { draw(false); openLabel.setColor('#8e4d37'); });
    hit.on('pointerdown', () => {
      if (this.isBusy()) return;
      void this.loadSelectedSlot(slotKey, authMode, source, root);
    });
  }

  getSaveDetectiveName(meta) {
    const name = typeof meta?.agentName === 'string' ? meta.agentName.trim() : '';
    return name || __dialogueText("scenes/EnterScene.js", "t_1c3c21b36dbfc0c36c90");
  }
  getSaveSlotDescription(meta) {
    if (!meta) return __dialogueText("scenes/EnterScene.js", "t_0045fa2e36595b0e7bbe");
    const location = String(meta.locationCode || __dialogueText("scenes/EnterScene.js", "t_2fad2d87e767ac042191")).replace(/_/g, ' ');
    const city = String(meta.cityCode || __dialogueText("scenes/EnterScene.js", "t_2491fe94a7ba027ffff4")).replace(/_/g, ' ');
    const day = meta.dayNumber ?? 1;
    const hour = String(meta.inGameHour ?? 8).padStart(2, '0');
    const timestamp = meta.savedAt ?? meta.updatedAt;
    const date = timestamp ? new Date(timestamp) : null;
    const savedAt = date && Number.isFinite(date.getTime()) ? date.toLocaleString() : __dialogueText("scenes/EnterScene.js", "t_bdda387b434325c2d39b");
    return `${location}${__dialogueText("scenes/EnterScene.js", "t_005e1574a2b5c8163046")}${city}${__dialogueText("scenes/EnterScene.js", "t_309e4b952d6e7edd3d80")}${day}${__dialogueText("scenes/EnterScene.js", "t_0a07f659461970d8d8dc")}${hour}${__dialogueText("scenes/EnterScene.js", "t_f93c3237cdd58bba9e8a")}${savedAt}`;
  }

  async loadSelectedSlot(slotKey, authMode, source, root) {
    if (!this.isCurrentRun() || this.isBusy() || this.saveSlotPicker !== root || !root?.active) return;
    if (!SLOT_KEYS.includes(slotKey) || !['local', 'cloud'].includes(source)) return;
    if (source === 'cloud' && (authMode !== 'account' || !this.currentUser)) return;
    const runId = this.enterRunId;
    this.isLoadingSave = true;
    this.updateEntryButtons();
    try {
      const loadedSave = await saveManager.load(slotKey, source);
      if (!this.isCurrentRun(runId)) return;
      if (!loadedSave) {
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_3b689ff51625cbb8d002"), 4000);
        return;
      }
      const locationType = loadedSave.meta?.locationType || 'office';
      const state = gameState.getState?.() ?? gameState;
      const cityId = loadedSave.meta?.cityCode || state.currentCityId || state.crimeCityId || 'paris';
      this.isEnteringGame = true;
      this.closeSaveSlotPicker(true);
      const identity = {
        authMode, playerId: this.currentUser?.id ?? null,
        playerEmail: this.currentUser?.email ?? null, displayName: this.getDisplayName(),
        fromSave: true, saveSlotKey: slotKey
      };
      const releaseSavedCity = await this.game.assets.prepareSavedCity(cityId);
      if (!this.isCurrentRun(runId)) { releaseSavedCity(); return; }
      let opened;
      try {
        opened = locationType === 'hotel'
          ? await this.goto('HotelScene', { ...identity, cityId, returnScene: 'CrimeCityScene', returnData: { cityId } })
          : await this.goto('OfficeScene', identity);
      } finally { releaseSavedCity(); }
      if (!this.isCurrentRun(runId)) return;
      if (!opened) {
        this.isEnteringGame = false;
        this._showNotice(__dialogueText("scenes/EnterScene.js", "t_776cbd1dc2bb09399588"), 4000);
      }
    } catch (error) {
      if (!this.isCurrentRun(runId)) return;
      this.isEnteringGame = false;
      console.error(`[EnterScene] Failed to load ${source} save ${slotKey}:`, error);
      this._showNotice(__dialogueText("scenes/EnterScene.js", "t_08d6648c38d21bbb52cb"), 4000);
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isLoadingSave = false;
        this.updateEntryButtons();
      }
    }
  }
  getDisplayName() {
    return this.currentUser?.user_metadata?.display_name ?? this.currentUser?.email?.split('@')[0] ?? __dialogueText("scenes/EnterScene.js", "t_5ed8944a85a9763fd315");
  }
  addHoverEffect(button, baseScale = 1, hoverScale = 1.05) {
    button.setScale(baseScale);
    button.on('pointerover', () => { if (this.canUseEntry()) button.setScale(hoverScale); });
    button.on('pointerout', () => button.setScale(baseScale));
  }
  openModal(url) {
    if (!this.canUseEntry()) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `${__dialogueText("scenes/EnterScene.js", "t_f8134cf7a4d6c0b4a0f4")}`;
    const frame = document.createElement('iframe');
    frame.src = url;
    frame.title = __dialogueText("scenes/EnterScene.js", "t_5bded4e4beed700a753e");
    frame.style.cssText = `${__dialogueText("scenes/EnterScene.js", "t_d38971ffd970dd618529")}`;
    const clickHandler = event => {
      if (event.target === overlay && !this.isHandlingAuth) this.closeModal();
    };
    overlay.addEventListener('click', clickHandler);
    overlay._clickHandler = clickHandler;
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    this.modalElement = overlay;
    this.modalFrame = frame;
    this.updateEntryButtons();
  }
  closeModal() {
    const overlay = this.modalElement;
    if (overlay?._clickHandler) overlay.removeEventListener('click', overlay._clickHandler);
    overlay?.remove();
    this.modalElement = null;
    this.modalFrame = null;
    this.updateEntryButtons();
  }
  cleanupScene() {
    this.enterDisposed = true;
    this.enterRunId += 1;
    this.closeModal();
    this.noticeHideTimer?.remove(false);
    this.noticeHideTimer = null;
    if (this.noticeText) this.killTrackedTweensOf(this.noticeText);
    this.closeSaveSlotPicker(true);
    if (this.onWindowMessage) {
      window.removeEventListener('message', this.onWindowMessage);
      this.onWindowMessage = null;
    }
    this.entryButtons.forEach(button => button?.removeAllListeners?.());
    this.entryButtons = [];
    this.noticeText = null;
    this.currentUser = null;
    this.isLoadingSave = false;
    this.isEnteringGame = false;
    this.isRestoringSession = false;
    this.isHandlingAuth = false;
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.boundCleanupScene);
  }
}