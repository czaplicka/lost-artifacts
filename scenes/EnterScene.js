import { supabase } from '../supabase-client.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { saveManager } from '../saveGameService.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../managers/AudioManager.js';

const STORAGE_KEYS = {
  START_NEW_GAME_AFTER_REGISTER:
    'lost-artefacts:pending-new-game-after-register'
};

const SLOT_KEYS = ['slot_1', 'slot_2', 'slot_3'];

const BUTTON_Y = {
  LOGIN: 0.28,
  REGISTER: 0.47,
  CONTINUE: 0.65,
  NEW_GAME: 0.82
};

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

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    try {
      await this.restoreSavedSession(runId);
    } catch (error) {
      if (this.isCurrentRun(runId)) {
        console.error('[EnterScene] Session restore failed:', error);
        this._showNotice(
          'Unable to restore your session.\nPlease log in again.'
        );
      }
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isRestoringSession = false;
        this.updateEntryButtons();
      }
    }
  }

  isCurrentRun(runId = this.enterRunId) {
    return (
      !this.enterDisposed &&
      runId === this.enterRunId &&
      !this._cleanupDone &&
      this.sys.isActive()
    );
  }

  isBusy() {
    return (
      this.isRestoringSession ||
      this.isHandlingAuth ||
      this.isLoadingSave ||
      this.isEnteringGame
    );
  }

  canUseEntry() {
    return (
      this.isCurrentRun() &&
      !this.isBusy() &&
      !this.saveSlotPicker &&
      !this.modalElement
    );
  }

  updateEntryButtons() {
    const enabled =
      this.isCurrentRun() &&
      !this.isBusy() &&
      !this.saveSlotPicker &&
      !this.modalElement;

    this.entryButtons.forEach((button) => {
      if (!button?.active) return;

      button.setAlpha(enabled ? 1 : 0.55);

      if (button.input) {
        button.input.enabled = enabled;
      }

      if (!enabled) {
        button.setScale(1);
      }
    });
  }

  _buildBackground(width, height) {
    const bg = this.add.image(width / 2, height / 2, 'enter');

    bg
      .setScale(Math.max(width / bg.width, height / bg.height))
      .setScrollFactor(0);
  }

  _buildButtons(width, height) {
    const centerX = width * 0.23;

    const definitions = [
      {
        key: 'loginbtn',
        y: BUTTON_Y.LOGIN,
        action: () => this.openModal('login.html')
      },
      {
        key: 'registerbtn',
        y: BUTTON_Y.REGISTER,
        action: () => this.openModal('register.html')
      },
      {
        key: 'btnContinue',
        y: BUTTON_Y.CONTINUE,
        action: () => this.handlePrimaryEntry()
      },
      {
        key: 'new_game',
        y: BUTTON_Y.NEW_GAME,
        action: () => {
          this.startNewGameFlow(
            this.currentUser ? 'account' : 'guest'
          );
        }
      }
    ];

    definitions.forEach(({ key, y, action }) => {
      const button = this.add
        .image(centerX, height * y, key)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      this.addHoverEffect(button);

      button.on('pointerdown', (pointer) => {
        if (
          pointer?.event?.button !== undefined &&
          pointer.event.button !== 0
        ) {
          return;
        }

        if (this.canUseEntry()) {
          action();
        }
      });

      this.entryButtons.push(button);
    });
  }

  _buildNoticeArea(width, height) {
    this.noticeText = this.add
      .text(width * 0.5, height * 0.93, '', {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#ffe066',
        backgroundColor: '#1a1208',
        padding: { x: 18, y: 10 },
        align: 'center',
        wordWrap: { width: width * 0.65 }
      })
      .setOrigin(0.5)
      .setDepth(6000)
      .setAlpha(0);
  }

  _showNotice(message, duration = 5000) {
    if (
      !message ||
      !this.noticeText?.active ||
      !this.isCurrentRun()
    ) {
      return;
    }

    this.noticeHideTimer?.remove(false);
    this.noticeHideTimer = null;

    this.killTrackedTweensOf(this.noticeText);
    this.noticeText.setText(message).setAlpha(1);

    const runId = this.enterRunId;

    this.noticeHideTimer = this.time.delayedCall(duration, () => {
      if (!this.isCurrentRun(runId)) return;

      this.noticeHideTimer = null;

      if (!this.noticeText?.active) return;

      this.createTrackedTween({
        targets: this.noticeText,
        alpha: 0,
        duration: 400,
        ease: 'Quad.out'
      });
    });
  }

  async restoreSavedSession(runId = this.enterRunId) {
    const { data, error } = await supabase.auth.getSession();

    if (!this.isCurrentRun(runId)) return;

    if (error) {
      console.warn(
        '[EnterScene] Could not restore session:',
        error.message
      );

      this._showNotice(
        'Unable to restore your session.\nPlease log in again.'
      );
      return;
    }

    this.currentUser = data?.session?.user ?? null;

    if (!this.currentUser) return;

    await this.ensurePlayerProfile(this.currentUser, runId);
  }

  handlePrimaryEntry() {
    if (!this.canUseEntry()) return;

    if (this.currentUser) {
      this.startLoadFlow('account');
    } else if (this.hasGuestSave()) {
      this.startLoadFlow('guest');
    } else {
      this.startNewGameFlow('guest');
    }
  }

  async handleWindowMessage(event) {
    if (!this.isCurrentRun() || this.isBusy()) return;

    if (event.origin !== window.location.origin) return;

    if (
      !this.modalFrame ||
      event.source !== this.modalFrame.contentWindow
    ) {
      return;
    }

    const message = event.data;

    if (!message || typeof message !== 'object') return;

    if (message.type === 'lost-artefacts:auth-registered') {
      this.rememberNewGameAfterRegistration();
      this.closeModal();

      this._showNotice(
        'Account created!\nConfirm your e-mail, then log in.\nYour career awaits.',
        6000
      );
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

      if (
        !this.isCurrentRun(runId) ||
        this.modalFrame !== frame
      ) {
        return;
      }

      const user = data?.session?.user;

      if (error || !user) {
        console.warn(
          '[EnterScene] No session after login:',
          error?.message || 'Session missing.'
        );

        this._showNotice(
          'Login could not be confirmed.\nPlease try again.'
        );
        return;
      }

      this.currentUser = user;
      await this.ensurePlayerProfile(user, runId);

      if (
        !this.isCurrentRun(runId) ||
        this.modalFrame !== frame
      ) {
        return;
      }

      nextAction = this.shouldStartNewGameAfterRegistration()
        ? 'new'
        : 'load';

      this.closeModal();
    } catch (error) {
      if (this.isCurrentRun(runId)) {
        console.error('[EnterScene] Login handling failed:', error);
        this._showNotice('Unable to finish login. Please try again.');
      }
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isHandlingAuth = false;
        this.updateEntryButtons();
      }
    }

    if (!this.isCurrentRun(runId)) return;

    if (nextAction === 'new') {
      this.startNewGameFlow('account');
    } else if (nextAction === 'load') {
      this.startLoadFlow('account');
    }
  }

  async ensurePlayerProfile(user, runId = this.enterRunId) {
    if (!user?.id || !this.isCurrentRun(runId)) return false;

    const displayName =
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'Agent';

    try {
      const { error } = await supabase
        .from('player_profiles')
        .upsert(
          {
            id: user.id,
            display_name: displayName
          },
          { onConflict: 'id' }
        );

      if (!this.isCurrentRun(runId)) return false;

      if (error) {
        console.warn(
          '[EnterScene] Could not prepare player profile:',
          error.message
        );
        return false;
      }

      return true;
    } catch (error) {
      if (this.isCurrentRun(runId)) {
        console.warn(
          '[EnterScene] Player profile request failed:',
          error
        );
      }

      return false;
    }
  }

  hasGuestSave() {
    return SLOT_KEYS.some((slotKey) => {
      try {
        return Boolean(saveManager.readLocalMeta(slotKey));
      } catch {
        return false;
      }
    });
  }

  rememberNewGameAfterRegistration() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER,
        'true'
      );
    } catch (error) {
      console.warn(
        '[EnterScene] Could not remember registration intent:',
        error
      );
    }
  }

  shouldStartNewGameAfterRegistration() {
    try {
      return localStorage.getItem(
        STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER
      ) === 'true';
    } catch {
      return false;
    }
  }

  clearNewGameAfterRegistrationIntent() {
    try {
      localStorage.removeItem(
        STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER
      );
    } catch (error) {
      console.warn(
        '[EnterScene] Could not clear registration intent:',
        error
      );
    }
  }

  startNewGameFlow(authMode) {
    if (
      !this.isCurrentRun() ||
      this.isBusy() ||
      this.saveSlotPicker
    ) {
      return;
    }

    if (authMode === 'account' && !this.currentUser) return;

    const runId = this.enterRunId;
    const clearRegistrationIntent =
      authMode === 'account' &&
      this.shouldStartNewGameAfterRegistration();

    this.isEnteringGame = true;
    this.closeModal();
    this.updateEntryButtons();

    void (async () => {
      try {
        const started = await this.goto('IntroScene', {
          authMode,
          playerId: this.currentUser?.id ?? null,
          playerEmail: this.currentUser?.email ?? null,
          displayName: this.getDisplayName(),
          isNewGame: true,
          startOnboarding: true
        });

        if (started && clearRegistrationIntent) {
          this.clearNewGameAfterRegistrationIntent();
        }

        if (!this.isCurrentRun(runId)) return;

        if (!started) {
          this.isEnteringGame = false;
          this.updateEntryButtons();

          this._showNotice(
            'Unable to begin a new case. Please try again.',
            4000
          );
        }
      } catch (error) {
        if (!this.isCurrentRun(runId)) return;

        this.isEnteringGame = false;
        this.updateEntryButtons();

        console.error('[EnterScene] New game failed:', error);
        this._showNotice(
          'Unable to begin a new case. Please try again.',
          4000
        );
      }
    })();
  }

  startLoadFlow(authMode) {
    if (
      !this.isCurrentRun() ||
      this.isBusy() ||
      this.saveSlotPicker
    ) {
      return;
    }

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
    if (
      !this.isCurrentRun() ||
      this.isBusy() ||
      this.saveSlotPicker
    ) {
      return;
    }

    const runId = this.enterRunId;
    const { width, height } = this.scale;
    const accountMode = authMode === 'account';

    const root = this.add.container(0, 0).setDepth(5000);
    this.saveSlotPicker = root;
    this.updateEntryButtons();

    const panelWidth = Math.min(900, width * 0.92);
    const panelHeight = Math.min(650, height * 0.88);
    const left = (width - panelWidth) / 2;
    const top = (height - panelHeight) / 2;
    const centerX = width / 2;

    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive();

    const panel = this.add
      .rectangle(
        centerX,
        height / 2,
        panelWidth,
        panelHeight,
        0x17110e,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37)
      .setInteractive();

    const title = this.add
      .text(centerX, top + 38, 'SELECT CASE FILE', {
        fontFamily: 'PressStart2P',
        fontSize: '16px',
        color: '#f6dc8c'
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        centerX,
        top + 76,
        accountMode
          ? 'Account saves and local files are listed separately.'
          : 'Local files saved in this browser.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '18px',
          color: '#f1e6b8',
          align: 'center',
          wordWrap: { width: panelWidth - 100 }
        }
      )
      .setOrigin(0.5);

    const closeButton = this.add
      .text(left + panelWidth - 26, top + 26, 'X', {
        fontFamily: 'PressStart2P',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#3b1111',
        padding: { x: 8, y: 7 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const loadingText = this.add
      .text(centerX, height / 2, 'Reading case files...', {
        fontFamily: 'SpecialElite',
        fontSize: '20px',
        color: '#f1e6b8'
      })
      .setOrigin(0.5);

    root.add([dim, panel, title, subtitle, closeButton, loadingText]);

    dim.on('pointerdown', () => this.closeSaveSlotPicker());
    closeButton.on('pointerdown', () => this.closeSaveSlotPicker());

    root.setAlpha(0);

    this.createTrackedTween({
      targets: root,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });

    let slots;

    try {
      slots = accountMode
        ? await saveManager.listSlots()
        : SLOT_KEYS.map((slotKey) => ({
            slotKey,
            localMeta: saveManager.readLocalMeta(slotKey),
            cloudMeta: null
          }));

      if (!Array.isArray(slots)) {
        throw new Error('Invalid save slot list.');
      }
    } catch (error) {
      if (
        this.isCurrentRun(runId) &&
        this.saveSlotPicker === root &&
        root.active
      ) {
        console.error('[EnterScene] Could not list saves:', error);
        loadingText.setText(
          'Unable to read case files.\nClose this window and try again.'
        );
      }
      return;
    }

    if (
      !this.isCurrentRun(runId) ||
      this.saveSlotPicker !== root ||
      !root.active
    ) {
      return;
    }

    loadingText.destroy();

    const columns = accountMode
      ? [
          { source: 'cloud', label: 'ACCOUNT', metaKey: 'cloudMeta' },
          { source: 'local', label: 'LOCAL', metaKey: 'localMeta' }
        ]
      : [
          { source: 'local', label: 'LOCAL', metaKey: 'localMeta' }
        ];

    const margin = 22;
    const gap = 14;
    const columnWidth =
      (panelWidth - margin * 2 - gap * (columns.length - 1)) /
      columns.length;

    const cardsTop = top + 130;
    const cardsBottom = top + panelHeight - 24;
    const rowGap = 12;
    const rowHeight =
      (cardsBottom - cardsTop - rowGap * 2) / 3;

    columns.forEach((column, columnIndex) => {
      const x =
        left + margin +
        columnIndex * (columnWidth + gap) +
        columnWidth / 2;

      const heading = this.add
        .text(x, top + 108, column.label, {
          fontFamily: 'PressStart2P',
          fontSize: '12px',
          color: '#f6dc8c'
        })
        .setOrigin(0.5);

      root.add(heading);

      SLOT_KEYS.forEach((slotKey, index) => {
        const slot = slots.find((entry) => entry.slotKey === slotKey);
        const meta = slot?.[column.metaKey] ?? null;
        const y = cardsTop + index * (rowHeight + rowGap);

        this.buildSaveSlotCard({
          root,
          slotKey,
          index,
          authMode,
          source: column.source,
          meta,
          x,
          y,
          width: columnWidth,
          height: rowHeight
        });
      });
    });
  }

  buildSaveSlotCard({
    root,
    slotKey,
    index,
    authMode,
    source,
    meta,
    x,
    y,
    width,
    height
  }) {
    const hasSave = Boolean(meta);

    const button = this.add
      .rectangle(x, y, width, height, hasSave ? 0x2b3a32 : 0x353535)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, hasSave ? 0x8fcf8f : 0x777777);

    const title = this.add
      .text(x - width / 2 + 12, y + 12, `CASE FILE ${index + 1}`, {
        fontFamily: 'PressStart2P',
        fontSize: '11px',
        color: hasSave ? '#ffffff' : '#888888'
      });

    const description = this.add
      .text(
        x - width / 2 + 12,
        y + 34,
        this.getSaveSlotDescription(meta),
        {
          fontFamily: 'SpecialElite',
          fontSize: '16px',
          color: hasSave ? '#dbead5' : '#999999',
          wordWrap: { width: width - 24 }
        }
      );

    root.add([button, title, description]);

    if (!hasSave) return;

    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      if (this.isBusy()) return;

      button.setFillStyle(0x49634b);
      title.setColor('#ffe066');
    });

    button.on('pointerout', () => {
      button.setFillStyle(0x2b3a32);
      title.setColor('#ffffff');
    });

    button.on('pointerdown', () => {
      void this.loadSelectedSlot(slotKey, authMode, source, root);
    });
  }

  getSaveSlotDescription(meta) {
    if (!meta) return 'EMPTY FILE';

    const location = meta.locationCode || 'Unknown location';
    const city = meta.cityCode || 'Unknown city';
    const day = meta.dayNumber ?? 1;
    const hour = String(meta.inGameHour ?? 8).padStart(2, '0');
    const timestamp = meta.savedAt ?? meta.updatedAt;
    const date = timestamp ? new Date(timestamp) : null;

    const savedAt =
      date && Number.isFinite(date.getTime())
        ? date.toLocaleString()
        : 'Unknown time';

    return `${location} · ${city}\nDay ${day}, ${hour}:00\n${savedAt}`;
  }

  async loadSelectedSlot(slotKey, authMode, source, root) {
    if (
      !this.isCurrentRun() ||
      this.isBusy() ||
      this.saveSlotPicker !== root ||
      !root?.active
    ) {
      return;
    }

    if (
      !SLOT_KEYS.includes(slotKey) ||
      !['local', 'cloud'].includes(source)
    ) {
      return;
    }

    if (
      source === 'cloud' &&
      (authMode !== 'account' || !this.currentUser)
    ) {
      return;
    }

    const runId = this.enterRunId;

    this.isLoadingSave = true;
    this.updateEntryButtons();

    try {
      const loadedSave = await saveManager.load(slotKey, source);

      if (!this.isCurrentRun(runId)) return;

      if (!loadedSave) {
        this._showNotice('This case file is unavailable.', 4000);
        return;
      }

      const locationType = loadedSave.meta?.locationType || 'office';
      const state = gameState.getState?.() ?? gameState;

      const cityId =
        loadedSave.meta?.cityCode ||
        state.currentCityId ||
        state.crimeCityId ||
        'paris';

      this.isEnteringGame = true;
      this.closeSaveSlotPicker(true);

      const identity = {
        authMode,
        playerId: this.currentUser?.id ?? null,
        playerEmail: this.currentUser?.email ?? null,
        displayName: this.getDisplayName(),
        fromSave: true,
        saveSlotKey: slotKey
      };

      const opened = locationType === 'hotel'
        ? await this.goto('HotelScene', {
            ...identity,
            cityId,
            returnScene: 'CrimeCityScene',
            returnData: { cityId }
          })
        : await this.goto('OfficeScene', identity);

      if (!this.isCurrentRun(runId)) return;

      if (!opened) {
        this.isEnteringGame = false;
        this._showNotice(
          'Failed to open this case file. Please try again.',
          4000
        );
      }
    } catch (error) {
      if (!this.isCurrentRun(runId)) return;

      this.isEnteringGame = false;

      console.error(
        `[EnterScene] Failed to load ${source} save ${slotKey}:`,
        error
      );

      this._showNotice(
        'Failed to load save. Please try again.',
        4000
      );
    } finally {
      if (this.isCurrentRun(runId)) {
        this.isLoadingSave = false;
        this.updateEntryButtons();
      }
    }
  }

  getDisplayName() {
    return (
      this.currentUser?.user_metadata?.display_name ??
      this.currentUser?.email?.split('@')[0] ??
      'Guest'
    );
  }

  addHoverEffect(button, baseScale = 1, hoverScale = 1.05) {
    button.setScale(baseScale);

    button.on('pointerover', () => {
      if (this.canUseEntry()) {
        button.setScale(hoverScale);
      }
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }

  openModal(url) {
    if (!this.canUseEntry()) return;

    const overlay = document.createElement('div');

    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.72);
      z-index: 9999;
    `;

    const frame = document.createElement('iframe');

    frame.src = url;
    frame.title = 'Enter Mark Agency HQ';

    frame.style.cssText = `
      width: 600px;
      max-width: 90vw;
      height: 70vh;
      max-height: 680px;
      border: 4px solid #000;
      box-shadow: 0 0 28px #000;
      background: #111;
    `;

    const clickHandler = (event) => {
      if (event.target === overlay && !this.isHandlingAuth) {
        this.closeModal();
      }
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

    if (overlay?._clickHandler) {
      overlay.removeEventListener('click', overlay._clickHandler);
    }

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

    if (this.noticeText) {
      this.killTrackedTweensOf(this.noticeText);
    }

    this.closeSaveSlotPicker(true);

    if (this.onWindowMessage) {
      window.removeEventListener('message', this.onWindowMessage);
      this.onWindowMessage = null;
    }

    this.entryButtons.forEach((button) => {
      button?.removeAllListeners?.();
    });

    this.entryButtons = [];
    this.noticeText = null;
    this.currentUser = null;
    this.isLoadingSave = false;
    this.isEnteringGame = false;
    this.isRestoringSession = false;
    this.isHandlingAuth = false;

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );
  }
}