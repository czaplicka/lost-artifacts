import { supabase } from '../supabase-client.js';
import { BaseScene } from './BaseScene.js';
import { EventBus } from '../EventBus.js';
import { saveManager } from '../saveGameService.js';
import { gameState } from '../GameData.js';

const STORAGE_KEYS = {
  GUEST_LAST_USED_SLOT: 'lost-artefacts:last-used-slot',
  GUEST_SAVE_PREFIX: 'lost-artefacts:save:',
  START_NEW_GAME_AFTER_REGISTER: 'lost-artefacts:pending-new-game-after-register'
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
  }

  async create() {
    super.create();

    const { width, height } = this.scale;

    EventBus.emit('hideHUD');

    const centerX = width * 0.23;

    const bg = this.add.image(width / 2, height / 2, 'enter');
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);

    bg.setScale(scale).setScrollFactor(0);

    const loginBtn = this.add
      .image(centerX, height * 0.44, 'loginbtn')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const registerBtn = this.add
      .image(centerX, height * 0.64, 'registerbtn')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const nextBtn = this.add
      .image(centerX, height * 0.84, 'next')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.addHoverEffect(loginBtn);
    this.addHoverEffect(registerBtn);
    this.addHoverEffect(nextBtn);

    const testStartBtn = this.add
      .text(centerX, height * 0.93, '[ TEST: START NEW GAME ]', {
        fontFamily: '"Press Start 2P"',
        fontSize: '11px',
        color: '#ffe66d',
        backgroundColor: '#3b1111',
        padding: {
          left: 12,
          right: 12,
          top: 9,
          bottom: 9
        }
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    testStartBtn.on('pointerover', () => {
      testStartBtn.setColor('#ffffff');
      testStartBtn.setScale(1.05);
    });

    testStartBtn.on('pointerout', () => {
      testStartBtn.setColor('#ffe66d');
      testStartBtn.setScale(1);
    });

    testStartBtn.on('pointerdown', () => {
      const authMode = this.currentUser ? 'account' : 'guest';

      console.warn(
        '[EnterScene] Test button: forcing New Game flow.'
      );

      this.startNewGameFlow(authMode);
    });

    loginBtn.on('pointerdown', () => {
      this.openModal('login.html');
    });

    registerBtn.on('pointerdown', () => {
      this.openModal('register.html');
    });

    nextBtn.on('pointerdown', () => {
      this.handlePrimaryEntry();
    });

    this.onWindowMessage = this.handleWindowMessage.bind(this);
    window.addEventListener('message', this.onWindowMessage);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );

    this.events.once(
      Phaser.Scenes.Events.DESTROY,
      this.cleanup,
      this
    );

    await this.restoreSavedSession();
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
    if (event.origin !== window.location.origin) {
      return;
    }

    if (
      !this.modalFrame ||
      event.source !== this.modalFrame.contentWindow
    ) {
      return;
    }

    const message = event.data;

    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.type === 'lost-artefacts:auth-registered') {
      this.rememberNewGameAfterRegistration();
      this.closeModal();

      alert(
        'Account created. Confirm your e-mail, then log in. ' +
        'Your brand-new questionable career will be waiting.'
      );

      return;
    }

    if (message.type !== 'lost-artefacts:auth-signed-in') {
      return;
    }

    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      console.error(
        'Sesja po logowaniu nie została znaleziona:',
        error?.message
      );
      return;
    }

    this.currentUser = session.user;

    await this.ensurePlayerProfile(this.currentUser);

    if (this.shouldStartNewGameAfterRegistration()) {
      this.clearNewGameAfterRegistrationIntent();
      this.startNewGameFlow('account');
      return;
    }

    this.startLoadFlow('account');
  }

  async ensurePlayerProfile(user) {
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
        'Profil agenta nie został utworzony lub odświeżony:',
        error.message
      );
    }
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
    } catch (error) {
      console.warn(
        'Nie udało się sprawdzić sejwa gościa:',
        error
      );

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
    } catch (error) {
      console.warn(
        'Nie udało się odczytać intencji nowej gry:',
        error
      );

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
    this.closeModal();

    this.scene.start('IntroScene', {
      authMode,
      playerId: this.currentUser?.id ?? null,
      playerEmail: this.currentUser?.email ?? null,
      displayName: this.getDisplayName(),
      isNewGame: true
    });
  }

  startLoadFlow(authMode) {
    this.closeModal();
    this.openSaveSlotPicker(authMode);
  }

  async openSaveSlotPicker(authMode) {
    if (this.saveSlotPicker) {
      return;
    }

    const { width, height } = this.scale;

    const root = this.add
      .container(0, 0)
      .setDepth(5000);

    this.saveSlotPicker = root;

    const dim = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.78)
      .setOrigin(0, 0)
      .setInteractive();

    const panelWidth = Math.min(760, width * 0.78);
    const panelHeight = 490;

    const panel = this.add
      .rectangle(
        width / 2,
        height / 2,
        panelWidth,
        panelHeight,
        0x17110e,
        0.98
      )
      .setStrokeStyle(4, 0xd4af37);

    const title = this.add
      .text(width / 2, height / 2 - 195, 'SELECT CASE FILE', {
        fontFamily: 'Press Start 2P',
        fontSize: '19px',
        color: '#f6dc8c'
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(
        width / 2,
        height / 2 - 158,
        'Choose the save you want to restore.',
        {
          fontFamily: 'Special Elite',
          fontSize: '22px',
          color: '#f1e6b8'
        }
      )
      .setOrigin(0.5);

    const closeButton = this.add
      .text(
        width / 2 + panelWidth / 2 - 30,
        height / 2 - panelHeight / 2 + 26,
        'X',
        {
          fontFamily: 'Press Start 2P',
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#3b1111',
          padding: {
            x: 10,
            y: 8
          }
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const loadingText = this.add
      .text(width / 2, height / 2 + 190, 'Reading case files...', {
        fontFamily: 'Special Elite',
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

      this.saveSlotPicker.destroy(true);
      this.saveSlotPicker = null;
      this.isLoadingSave = false;
    };

    dim.on('pointerdown', closePicker);
    closeButton.on('pointerdown', closePicker);

    let slots = [];

    try {
      slots = await saveManager.listSlots();
    } catch (error) {
      console.error(
        '[EnterScene] Could not list save slots:',
        error
      );
    }

    if (!this.saveSlotPicker) {
      return;
    }

    loadingText.destroy();

    const slotKeys = ['slot_1', 'slot_2', 'slot_3'];

    slotKeys.forEach((slotKey, index) => {
      const slotInfo = slots.find(
        (slot) => slot.slotKey === slotKey
      );

      /*
       * Teraz loader wymusza lokalny snapshot,
       * więc wyświetlamy meta lokalnego sejwa.
       */
      const meta = slotInfo?.localMeta || null;
      const hasSave = Boolean(meta);

      const y = height / 2 - 85 + index * 92;

      const button = this.add
        .rectangle(
          width / 2,
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
          width / 2 - panelWidth / 2 + 60,
          y - 16,
          `CASE FILE ${index + 1}`,
          {
            fontFamily: 'Press Start 2P',
            fontSize: '13px',
            color: hasSave ? '#ffffff' : '#888888'
          }
        )
        .setOrigin(0, 0.5);

      const slotDescription = this.add
        .text(
          width / 2 - panelWidth / 2 + 60,
          y + 17,
          this.getSaveSlotDescription(meta),
          {
            fontFamily: 'Special Elite',
            fontSize: '18px',
            color: hasSave ? '#dbead5' : '#999999'
          }
        )
        .setOrigin(0, 0.5);

      root.add([
        button,
        slotTitle,
        slotDescription
      ]);

      if (!hasSave) {
        return;
      }

      button.setInteractive({
        useHandCursor: true
      });

      button.on('pointerover', () => {
        if (this.isLoadingSave) {
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
        this.loadSelectedSlot(
          slotKey,
          authMode,
          closePicker
        );
      });
    });

    root.setAlpha(0);

    this.tweens.add({
      targets: root,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
  }

  getSaveSlotDescription(meta) {
    if (!meta) {
      return 'EMPTY FILE';
    }

    const location = meta.locationCode || 'Unknown location';
    const city = meta.cityCode || 'Unknown city';
    const day = meta.dayNumber || 1;

    const hour = String(
      meta.inGameHour ?? 8
    ).padStart(2, '0');

    const savedAt = meta.savedAt
      ? new Date(meta.savedAt).toLocaleString()
      : 'Unknown time';

    return (
      `${location} · ${city} · ` +
      `Day ${day}, ${hour}:00 · ${savedAt}`
    );
  }

  async loadSelectedSlot(slotKey, authMode, closePicker) {
  if (this.isLoadingSave) {
    return;
  }

  this.isLoadingSave = true;

  try {
const loadedSave = await saveManager.load(slotKey, 'local');

    if (!loadedSave) {
      console.warn(
        `[EnterScene] Slot ${slotKey} does not contain a local save.`
      );

      this.isLoadingSave = false;
      return;
    }

    const locationType = loadedSave.meta?.locationType || 'office';

    const cityId =
      loadedSave.meta?.cityCode ||
      gameState.currentCityId ||
      gameState.crimeCityId ||
      'paris';

    const targetScene =
      locationType === 'hotel'
        ? 'HotelScene'
        : 'OfficeScene';

    console.log('[EnterScene] Save restored:', {
      slotKey,
      savedAt: loadedSave.meta?.savedAt,
      locationType,
      locationCode: loadedSave.meta?.locationCode,
      cityId,
      targetScene,
      currentCityId: gameState.currentCityId,
      crimeCityId: gameState.crimeCityId,
      currentMission: gameState.currentMission
    });

    closePicker();

    if (targetScene === 'HotelScene') {
      this.scene.start('HotelScene', {
        cityId,

        /*
         * Po wyjściu z hotelu zawsze wracasz
         * na mapę crime city właściwego miasta.
         */
        returnScene: 'CrimeCityScene',
        returnData: {
          cityId
        },

        fromSave: true,
        saveSlotKey: slotKey
      });

      return;
    }

    this.scene.start('OfficeScene', {
      authMode,
      playerId: this.currentUser?.id ?? null,
      playerEmail: this.currentUser?.email ?? null,
      displayName: this.getDisplayName(),
      gameState,
      fromSave: true,
      saveSlotKey: slotKey
    });
  } catch (error) {
    console.error(
      `[EnterScene] Failed to load slot ${slotKey}:`,
      error
    );

    this.isLoadingSave = false;
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
      button.setScale(hoverScale);
    });

    button.on('pointerout', () => {
      button.setScale(baseScale);
    });
  }

  openModal(url) {
    this.closeModal();

    const overlay = document.createElement('div');

    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0, 0, 0, 0.72)';
    overlay.style.zIndex = '9999';

    const frame = document.createElement('iframe');

    frame.src = url;
    frame.title = 'Enter Mark Agency HQ';
    frame.style.width = '600px';
    frame.style.maxWidth = '90vw';
    frame.style.height = '70vh';
    frame.style.maxHeight = '680px';
    frame.style.border = '4px solid #000';
    frame.style.boxShadow = '0 0 28px #000';
    frame.style.background = '#111';

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.closeModal();
      }
    });

    overlay.appendChild(frame);
    document.body.appendChild(overlay);

    this.modalElement = overlay;
    this.modalFrame = frame;
  }

  closeModal() {
    if (this.modalElement?.parentNode) {
      this.modalElement.parentNode.removeChild(
        this.modalElement
      );
    }

    this.modalElement = null;
    this.modalFrame = null;
  }

  cleanup() {
    this.closeModal();

    if (this.saveSlotPicker) {
      this.saveSlotPicker.destroy(true);
      this.saveSlotPicker = null;
    }

    this.isLoadingSave = false;

    if (this.onWindowMessage) {
      window.removeEventListener(
        'message',
        this.onWindowMessage
      );

      this.onWindowMessage = null;
    }
  }
}