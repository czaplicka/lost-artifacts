import { supabase } from '../supabase-client.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { saveManager } from '../saveGameService.js';
import { gameState } from '../GameData.js';
import { audioManager } from '../AudioManager.js';

const STORAGE_KEYS = {
  GUEST_LAST_USED_SLOT: 'lost-artefacts:last-used-slot',
  GUEST_SAVE_PREFIX: 'lost-artefacts:save:',
  START_NEW_GAME_AFTER_REGISTER:
    'lost-artefacts:pending-new-game-after-register'
};

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
    this.noticeText = null;
    this.noticeHideTimer = null;
    this.isEnteringGame = false;

    this.boundCleanupScene = this.cleanupScene.bind(this);
  }

  async create() {
    super.create();

    this.isLoadingSave = false;
    this.isEnteringGame = false;
    this.noticeHideTimer = null;

    audioManager.init(this);

    const { width, height } = this.scale;

    EventBus.emit('hideHUD');

    this._buildBackground(width, height);
    this._buildButtons(width, height);
    this._buildNoticeArea(width, height);

    this.onWindowMessage = this.handleWindowMessage.bind(this);
    window.addEventListener('message', this.onWindowMessage);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.boundCleanupScene
    );

    try {
      await this.restoreSavedSession();
    } catch (error) {
      console.error('[EnterScene] Session restore failed:', error);
    }
  }

  _buildBackground(width, height) {
    const bg = this.add.image(width / 2, height / 2, 'enter');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;

    bg.setScale(Math.max(scaleX, scaleY)).setScrollFactor(0);
  }

  _buildButtons(width, height) {
    const centerX = width * 0.23;

    const loginBtn = this.add
      .image(centerX, height * BUTTON_Y.LOGIN, 'loginbtn')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const registerBtn = this.add
      .image(centerX, height * BUTTON_Y.REGISTER, 'registerbtn')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const nextBtn = this.add
      .image(centerX, height * BUTTON_Y.CONTINUE, 'btnContinue')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const newGameBtn = this.add
      .image(centerX, height * BUTTON_Y.NEW_GAME, 'new_game')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    [loginBtn, registerBtn, nextBtn, newGameBtn].forEach((button) => {
      this.addHoverEffect(button);
    });

    loginBtn.on('pointerdown', () => {
      if (!this.isEnteringGame) {
        this.openModal('login.html');
      }
    });

    registerBtn.on('pointerdown', () => {
      if (!this.isEnteringGame) {
        this.openModal('register.html');
      }
    });

    nextBtn.on('pointerdown', () => {
      this.handlePrimaryEntry();
    });

    newGameBtn.on('pointerdown', () => {
      if (this.isEnteringGame) {
        return;
      }

      const authMode = this.currentUser ? 'account' : 'guest';
      this.startNewGameFlow(authMode);
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
        wordWrap: { width: width * 0.55 }
      })
      .setOrigin(0.5)
      .setDepth(6000)
      .setAlpha(0);
  }

  _showNotice(message, duration = 5000) {
    if (!message || !this.noticeText?.active || this._cleanupDone) {
      return;
    }

    if (this.noticeHideTimer) {
      this.noticeHideTimer.remove(false);
      this.noticeHideTimer = null;
    }

    this.killTrackedTweensOf(this.noticeText);

    this.noticeText
      .setText(message)
      .setAlpha(1);

    this.noticeHideTimer = this.time.delayedCall(duration, () => {
      this.noticeHideTimer = null;

      if (!this.noticeText?.active || this._cleanupDone) {
        return;
      }

      this.createTrackedTween({
        targets: this.noticeText,
        alpha: 0,
        duration: 400,
        ease: 'Quad.out'
      });
    });
  }

  async restoreSavedSession() {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) {
      console.warn(
        'Nie udało się odczytać zapisanej sesji:',
        error.message
      );
      return;
    }

    if (!session?.user) {
      console.log('Tryb gościa: brak aktywnej sesji.');
      return;
    }

    this.currentUser = session.user;
    console.log('Agent rozpoznany:', this.currentUser.email);

    await this.ensurePlayerProfile(this.currentUser);
  }

  handlePrimaryEntry() {
    if (this.isEnteringGame) {
      return;
    }

    if (this.currentUser) {
      this.startLoadFlow('account');
      return;
    }

    if (this.hasGuestSave()) {
      this.startLoadFlow('guest');
      return;
    }

    this.startNewGameFlow('guest');
  }

  async handleWindowMessage(event) {
    if (this._cleanupDone || this.isEnteringGame) {
      return;
    }

    if (event.origin !== window.location.origin) {
      return;
    }

    if (!this.modalFrame || event.source !== this.modalFrame.contentWindow) {
      return;
    }

    const message = event.data;

    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.type === 'lost-artefacts:auth-registered') {
      this.rememberNewGameAfterRegistration();
      this.closeModal();

      this._showNotice(
        'Account created!\nConfirm your e-mail, then log in.\nYour career awaits.',
        6000
      );

      return;
    }

    if (message.type !== 'lost-artefacts:auth-signed-in') {
      return;
    }

    try {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession();

      if (this._cleanupDone || this.isEnteringGame) {
        return;
      }

      if (error || !session?.user) {
        console.error(
          'Sesja po logowaniu nie została znaleziona:',
          error?.message
        );
        return;
      }

      this.currentUser = session.user;
      await this.ensurePlayerProfile(this.currentUser);

      if (this._cleanupDone || this.isEnteringGame) {
        return;
      }

      if (this.shouldStartNewGameAfterRegistration()) {
        this.clearNewGameAfterRegistrationIntent();
        this.startNewGameFlow('account');
        return;
      }

      this.startLoadFlow('account');
    } catch (error) {
      if (!this._cleanupDone) {
        console.error('[EnterScene] handleWindowMessage failed:', error);
      }
    }
  }

  async ensurePlayerProfile(user) {
    if (!user?.id) {
      return false;
    }

    const displayName =
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'Agent';

    const { error } = await supabase
      .from('player_profiles')
      .upsert(
        {
          id: user.id,
          display_name: displayName
        },
        {
          onConflict: 'id'
        }
      );

    if (error) {
      console.warn(
        'Profil agenta nie został utworzony:',
        error.message
      );

      return false;
    }

    return true;
  }

  hasGuestSave() {
    try {
      const lastUsedSlot = localStorage.getItem(
        STORAGE_KEYS.GUEST_LAST_USED_SLOT
      );

      if (!lastUsedSlot) {
        return false;
      }

      const saveKey =
        `${STORAGE_KEYS.GUEST_SAVE_PREFIX}${lastUsedSlot}`;

      const rawSave = localStorage.getItem(saveKey);

      if (!rawSave) {
        return false;
      }

      JSON.parse(rawSave);

      return true;
    } catch {
      return false;
    }
  }

  rememberNewGameAfterRegistration() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.START_NEW_GAME_AFTER_REGISTER,
        'true'
      );
    } catch (error) {
      console.warn(
        'Nie udało się zapamiętać intencji nowej gry:',
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
        'Nie udało się usunąć intencji nowej gry:',
        error
      );
    }
  }

  startNewGameFlow(authMode) {
    if (this.isEnteringGame || this._cleanupDone) {
      return;
    }

    this.isEnteringGame = true;
    this.closeModal();

    void this.goto('IntroScene', {
      authMode,
      playerId: this.currentUser?.id ?? null,
      playerEmail: this.currentUser?.email ?? null,
      displayName: this.getDisplayName(),
      isNewGame: true,
      startOnboarding: true
    }).then((started) => {
      if (!started && !this._cleanupDone) {
        this.isEnteringGame = false;
        this._showNotice(
          'Unable to begin a new case. Please try again.',
          4000
        );
      }
    });
  }

  startLoadFlow(authMode) {
    if (this.isEnteringGame || this._cleanupDone) {
      return;
    }

    this.closeModal();
    void this.openSaveSlotPicker(authMode);
  }

  async openSaveSlotPicker(authMode) {
    if (this.saveSlotPicker || this.isEnteringGame || this._cleanupDone) {
      return;
    }

    const { width, height } = this.scale;

    const root = this.add.container(0, 0).setDepth(5000);
    this.saveSlotPicker = root;

    const panelWidth = Math.min(760, width * 0.78);
    const panelHeight = 490;
    const panelCX = width / 2;
    const panelCY = height / 2;

    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0, 0)
      .setInteractive();

    const panel = this.add
      .rectangle(
        panelCX,
        panelCY,
        panelWidth,
        panelHeight,
        0x17110e,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37);

    const title = this.add
      .text(panelCX, panelCY - 195, 'SELECT CASE FILE', {
        fontFamily: 'PressStart2P',
        fontSize: '19px',
        color: '#f6dc8c'
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        panelCX,
        panelCY - 158,
        'Choose the save you want to restore.',
        {
          fontFamily: 'SpecialElite',
          fontSize: '22px',
          color: '#f1e6b8'
        }
      )
      .setOrigin(0.5);

    const closeButton = this.add
      .text(
        panelCX + panelWidth / 2 - 30,
        panelCY - panelHeight / 2 + 26,
        'X',
        {
          fontFamily: 'PressStart2P',
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#3b1111',
          padding: { x: 10, y: 8 }
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const loadingText = this.add
      .text(panelCX, panelCY + 190, 'Reading case files...', {
        fontFamily: 'SpecialElite',
        fontSize: '19px',
        color: '#f1e6b8'
      })
      .setOrigin(0.5);

    root.add([
      dim,
      panel,
      title,
      subtitle,
      closeButton,
      loadingText
    ]);

    const closePicker = () => {
      if (!this.saveSlotPicker) {
        return;
      }

      this.killTrackedTweensOf(this.saveSlotPicker);
      this.saveSlotPicker.destroy(true);
      this.saveSlotPicker = null;
      this.isLoadingSave = false;
    };

    dim.on('pointerdown', closePicker);
    closeButton.on('pointerdown', closePicker);

    root.setAlpha(0);

    this.createTrackedTween({
      targets: root,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });

    let slots = [];

    try {
      slots = await saveManager.listSlots();
    } catch (error) {
      console.error('[EnterScene] Could not list save slots:', error);
    }

    if (
      this._cleanupDone ||
      !this.saveSlotPicker ||
      this.saveSlotPicker !== root ||
      !root.active
    ) {
      return;
    }

    loadingText.destroy();

    const slotKeys = ['slot_1', 'slot_2', 'slot_3'];

    slotKeys.forEach((slotKey, index) => {
      const slotInfo = slots.find((slot) => slot.slotKey === slotKey);
      const meta = slotInfo?.localMeta || null;
      const hasSave = Boolean(meta);
      const y = panelCY - 85 + index * 92;

      const button = this.add
        .rectangle(
          panelCX,
          y,
          panelWidth - 72,
          72,
          hasSave ? 0x2b3a32 : 0x353535,
          1
        )
        .setStrokeStyle(
          2,
          hasSave ? 0x8fcf8f : 0x777777
        );

      const slotTitle = this.add
        .text(
          panelCX - panelWidth / 2 + 60,
          y - 16,
          `CASE FILE ${index + 1}`,
          {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: hasSave ? '#ffffff' : '#888888'
          }
        )
        .setOrigin(0, 0.5);

      const slotDescription = this.add
        .text(
          panelCX - panelWidth / 2 + 60,
          y + 17,
          this.getSaveSlotDescription(meta),
          {
            fontFamily: 'SpecialElite',
            fontSize: '18px',
            color: hasSave ? '#dbead5' : '#999999'
          }
        )
        .setOrigin(0, 0.5);

      root.add([button, slotTitle, slotDescription]);

      if (!hasSave) {
        return;
      }

      button.setInteractive({ useHandCursor: true });

      button.on('pointerover', () => {
        if (this.isLoadingSave || this.isEnteringGame) {
          return;
        }

        button.setFillStyle(0x49634b, 1);
        slotTitle.setColor('#ffe066');
      });

      button.on('pointerout', () => {
        button.setFillStyle(0x2b3a32, 1);
        slotTitle.setColor('#ffffff');
      });

      button.on('pointerdown', () => {
        void this.loadSelectedSlot(
          slotKey,
          authMode,
          closePicker
        );
      });
    });
  }

  getSaveSlotDescription(meta) {
    if (!meta) {
      return 'EMPTY FILE';
    }

    const location = meta.locationCode || 'Unknown location';
    const city = meta.cityCode || 'Unknown city';
    const day = meta.dayNumber || 1;
    const hour = String(meta.inGameHour ?? 8).padStart(2, '0');

    const savedAt = meta.savedAt
      ? new Date(meta.savedAt).toLocaleString()
      : 'Unknown time';

    return `${location} · ${city} · Day ${day}, ${hour}:00 · ${savedAt}`;
  }

  async loadSelectedSlot(slotKey, authMode, closePicker) {
    if (this.isLoadingSave || this.isEnteringGame || this._cleanupDone) {
      return;
    }

    this.isLoadingSave = true;

    try {
      const loadedSave = await saveManager.load(slotKey, 'local');

      if (this._cleanupDone) {
        return;
      }

      if (!loadedSave) {
        console.warn(`[EnterScene] Slot ${slotKey} is empty.`);
        this.isLoadingSave = false;
        this._showNotice('This case file is empty.', 3000);
        return;
      }

      const locationType = loadedSave.meta?.locationType || 'office';
      const state = gameState.getState?.() ?? gameState;

      const cityId =
        loadedSave.meta?.cityCode ||
        state.currentCityId ||
        state.crimeCityId ||
        'paris';

      const targetScene =
        locationType === 'hotel'
          ? 'HotelScene'
          : 'OfficeScene';

      this.isEnteringGame = true;
      closePicker();

      let opened = false;

      if (targetScene === 'HotelScene') {
        opened = await this.goto('HotelScene', {
          cityId,
          returnScene: 'CrimeCityScene',
          returnData: { cityId },
          fromSave: true,
          saveSlotKey: slotKey
        });
      } else {
        opened = await this.goto('OfficeScene', {
          authMode,
          playerId: this.currentUser?.id ?? null,
          playerEmail: this.currentUser?.email ?? null,
          displayName: this.getDisplayName(),
          fromSave: true,
          saveSlotKey: slotKey
        });
      }

      if (!opened && !this._cleanupDone) {
        this.isEnteringGame = false;
        this.isLoadingSave = false;
        this._showNotice('Failed to open this case file. Please try again.', 4000);
      }
    } catch (error) {
      if (!this._cleanupDone) {
        console.error(
          `[EnterScene] Failed to load slot ${slotKey}:`,
          error
        );

        this._showNotice('Failed to load save. Please try again.', 4000);
      }

      this.isLoadingSave = false;
      this.isEnteringGame = false;
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
      if (!this.isEnteringGame) {
        button.setScale(hoverScale);
      }
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }

  openModal(url) {
    if (this._cleanupDone || this.isEnteringGame) {
      return;
    }

    this.closeModal();

    const overlay = document.createElement('div');

    overlay.style.cssText = `
      position: fixed; inset: 0; display: flex;
      align-items: center; justify-content: center;
      background: rgba(0,0,0,0.72); z-index: 9999;
    `;

    const frame = document.createElement('iframe');

    frame.src = url;
    frame.title = 'Enter Mark Agency HQ';
    frame.style.cssText = `
      width: 600px; max-width: 90vw; height: 70vh;
      max-height: 680px; border: 4px solid #000;
      box-shadow: 0 0 28px #000; background: #111;
    `;

    const overlayClickHandler = (event) => {
      if (event.target === overlay) {
        this.closeModal();
      }
    };

    overlay.addEventListener('click', overlayClickHandler);
    overlay._clickHandler = overlayClickHandler;

    overlay.appendChild(frame);
    document.body.appendChild(overlay);

    this.modalElement = overlay;
    this.modalFrame = frame;
  }

  closeModal() {
    if (this.modalElement?.parentNode) {
      if (this.modalElement._clickHandler) {
        this.modalElement.removeEventListener(
          'click',
          this.modalElement._clickHandler
        );
      }

      this.modalElement.parentNode.removeChild(this.modalElement);
    }

    this.modalElement = null;
    this.modalFrame = null;
  }

  cleanupScene() {
    this.closeModal();

    if (this.noticeHideTimer) {
      this.noticeHideTimer.remove(false);
      this.noticeHideTimer = null;
    }

    if (this.saveSlotPicker) {
      this.killTrackedTweensOf(this.saveSlotPicker);
      this.saveSlotPicker.destroy(true);
      this.saveSlotPicker = null;
    }

    this.isLoadingSave = false;
    this.isEnteringGame = false;

    if (this.onWindowMessage) {
      window.removeEventListener('message', this.onWindowMessage);
      this.onWindowMessage = null;
    }

    this.noticeText = null;
  }
}