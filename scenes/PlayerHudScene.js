import { gameState } from '../GameData.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';
import { CaseFileUI } from '../ui/CaseFileUI.js';
import { NotesUI } from '../ui/NotesUI.js';
import { WarrantUI } from '../ui/WarrantUI.js';
import { DestinationsUI } from '../ui/DestinationsUI.js';
import { CrimeBoardUI } from '../ui/CrimeBoardUI.js';
import { AtlasUI } from '../ui/AtlasUI.js';
import { PhonebookUI } from '../ui/PhonebookUI.js';
import { PassportUI } from '../ui/PassportUI.js';
import { DialogManager } from '../dialogues/DialogManager.js';
import { BaseScene } from './BaseScene.js';
import { InventoryPanelUI } from '../ui/InventoryPanelUI.js';

const HUD_ALLOWED_SCENES = [
  'GameScene',
  'OfficeScene',
  'CityScene',
  'CrimeCityScene',
  'LocationScene',
  'HiddenObjectsScene',
  'CrimeLabScene',
  'InventoryScene',
  'HotelScene',
];

const HUD_OVERLAY_SCENES = [
  'PlayerHudScene',
  'NewsHud',
];

const CRIME_BOARD_ALLOWED_SCENES = [
  'OfficeScene',
  'HotelScene',
];

export class PlayerHudScene extends BaseScene {
  constructor() {
    super({ key: 'PlayerHudScene' });

    this.gameState = gameState;

    this.caseFileUI = null;
    this.notesUI = null;
    this.warrantUI = null;
    this.destinationsUI = null;
    this.playerMenu = null;
    this.crimeBoardUI = null;
    this.atlasUI = null;
    this.phoneUI = null;
    this.passportUI = null;
    this.dialogManager = null;
    this.inventoryUI = null;

    this.isHudReady = false;

    /*
     * To nie jest wykrywane automatycznie przez SceneManager.
     * CrimeCityScene może pozostawać aktywne pod HotelScene,
     * więc sceny gameplayowe same ustawiają tę wartość.
     */
    this.currentGameplaySceneKey = null;

    this.onGlobalSceneStart = this.onGlobalSceneStart.bind(this);
    this.onGlobalSceneWake = this.onGlobalSceneWake.bind(this);
  }

  create() {
    super.create();

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    const atlasEntries = this.cache.json.get('atlas') || [];

    this.caseFileUI = new CaseFileUI(this);
    this.notesUI = new NotesUI(this);
    this.warrantUI = new WarrantUI(this);
    this.destinationsUI = new DestinationsUI(this);
    this.atlasUI = new AtlasUI(this, atlasEntries);
    this.phoneUI = new PhonebookUI(this, this.gameState);
    this.passportUI = new PassportUI(this);
    this.dialogManager = new DialogManager(
      this,
      this.gameState,
    );

    this.phoneUI.setOnCall((key, contact) => {
      this.dialogManager.startDialog(key, contact);
    });

    this.playerMenu = new PlayerMenuUI(
      this,
      this.gameState,
    );

    this.crimeBoardUI = new CrimeBoardUI(this);

    this.inventoryUI = new InventoryPanelUI(this);
    this.inventoryUI.create();

    this.isHudReady = true;

    this.scene.setVisible(true);
    this.scene.bringToTop();

    if (this.game?.events) {
      this.game.events.on(
        Phaser.Scenes.Events.START,
        this.onGlobalSceneStart,
      );

      this.game.events.on(
        Phaser.Scenes.Events.WAKE,
        this.onGlobalSceneWake,
      );
    }

    this.events.on(
      Phaser.Scenes.Events.WAKE,
      this.onWake,
      this,
    );

    this.events.on(
      Phaser.Scenes.Events.SHUTDOWN,
      this.onShutdown,
      this,
    );

    this.events.on(
      Phaser.Scenes.Events.DESTROY,
      this.onShutdown,
      this,
    );

    /*
     * Gdy HUD zostanie utworzony po scenie gameplayowej,
     * dana scena musi ponownie wywołać setCurrentGameplayScene()
     * po await ensurePlayerHud().
     */
    this.updateCrimeBoardMenuAvailability();
  }

  onGlobalSceneStart(sys) {
    const sceneKey = sys?.settings?.key;

    if (!sceneKey || HUD_OVERLAY_SCENES.includes(sceneKey)) {
      return;
    }

    /*
     * Nie zmieniamy tutaj currentGameplaySceneKey.
     *
     * START może należeć do sceny pod spodem, do przejścia
     * albo do pomocniczej sceny. Kontekst gameplayu ustawia
     * wyłącznie setCurrentGameplayScene(), wywołane przez
     * OfficeScene / HotelScene / CrimeCityScene itd.
     */
  }

  onGlobalSceneWake(sys) {
    const sceneKey = sys?.settings?.key;

    if (!sceneKey || HUD_OVERLAY_SCENES.includes(sceneKey)) {
      return;
    }

    /*
     * Tak samo jak przy START: nie zgadujemy sceny gameplayowej
     * na podstawie WAKE, ponieważ stos scen może zawierać sceny
     * pod spodem oraz overlaye.
     */
  }

  setCurrentGameplayScene(sceneKey) {
    if (!sceneKey || HUD_OVERLAY_SCENES.includes(sceneKey)) {
      return;
    }

    this.currentGameplaySceneKey = sceneKey;

    this.updateCrimeBoardMenuAvailability();

    if (HUD_ALLOWED_SCENES.includes(sceneKey)) {
      this.showHud();
    } else {
      this.hideHud();
    }

    console.log(
      '[PlayerHudScene] Gameplay scene updated:',
      this.currentGameplaySceneKey,
    );
  }

  updateCrimeBoardMenuAvailability() {
    const isAvailable = this.isCrimeBoardAvailable();

    this.playerMenu?.setCrimeBoardAvailable?.(isAvailable);

    if (!isAvailable) {
      this.crimeBoardUI?.close?.();
    }
  }

  isCrimeBoardAvailable() {
    return CRIME_BOARD_ALLOWED_SCENES.includes(
      this.currentGameplaySceneKey,
    );
  }

  openCrimeBoard() {
    if (!this.isCrimeBoardAvailable()) {
      console.warn(
        '[PlayerHudScene] Crime Board is available only in OfficeScene or HotelScene.',
        {
          currentScene: this.currentGameplaySceneKey,
        },
      );

      return false;
    }

    this.closeAllUIPanels();

    this.crimeBoardUI?.open?.(this.gameState);

    return Boolean(this.crimeBoardUI?.isOpen);
  }

  openInventory() {
    this.closeAllUIPanels();

    this.inventoryUI?.open?.();

    return Boolean(this.inventoryUI?.isOpen);
  }

  showHud() {
    if (!this.isHudReady) {
      return;
    }

    this.scene.setVisible(true);
    this.scene.bringToTop();
  }

  hideHud() {
    if (!this.isHudReady) {
      return;
    }

    this.closeAllUIPanels();

    this.playerMenu?.close?.();

    this.scene.setVisible(false);
  }

  onWake() {
    this.updateCrimeBoardMenuAvailability();
    this.showHud();
  }

  closeAllUIPanels() {
    this.caseFileUI?.close?.();
    this.notesUI?.close?.();
    this.destinationsUI?.close?.();
    this.warrantUI?.close?.();
    this.crimeBoardUI?.close?.();
    this.atlasUI?.close?.();
    this.phoneUI?.close?.();
    this.passportUI?.close?.();
    this.dialogManager?.dialogUI?.close?.();
    this.inventoryUI?.close?.();
  }

  closeAllUIPanelsAndFlushInput() {
    this.closeAllUIPanels();

    const input = this.input;

    if (!input) {
      return;
    }

    if (input.manager?.pointer) {
      input.manager.pointer.cancelled = true;
    }

    this.playerMenu?.updateMenuInteractivity?.();
  }

  isAnyPanelOpen() {
    return Boolean(
      this.caseFileUI?.isOpen
      || this.notesUI?.isOpen
      || this.warrantUI?.isOpen
      || this.destinationsUI?.isOpen
      || this.crimeBoardUI?.isOpen
      || this.atlasUI?.isOpen
      || this.phoneUI?.isOpen
      || this.passportUI?.isOpen
      || this.dialogManager?.dialogUI?.isOpen
      || this.playerMenu?.isOpen
      || this.inventoryUI?.isOpen,
    );
  }

  onShutdown() {
    if (this.game?.events) {
      this.game.events.off(
        Phaser.Scenes.Events.START,
        this.onGlobalSceneStart,
      );

      this.game.events.off(
        Phaser.Scenes.Events.WAKE,
        this.onGlobalSceneWake,
      );
    }

    this.caseFileUI?.destroy?.();
    this.notesUI?.destroy?.();
    this.warrantUI?.destroy?.();
    this.destinationsUI?.destroy?.();
    this.crimeBoardUI?.destroy?.();
    this.atlasUI?.destroy?.();
    this.phoneUI?.destroy?.();
    this.passportUI?.destroy?.();
    this.dialogManager?.dialogUI?.destroy?.();
    this.playerMenu?.destroy?.();
    this.inventoryUI?.destroy?.();

    this.caseFileUI = null;
    this.notesUI = null;
    this.warrantUI = null;
    this.destinationsUI = null;
    this.crimeBoardUI = null;
    this.atlasUI = null;
    this.phoneUI = null;
    this.passportUI = null;
    this.dialogManager = null;
    this.playerMenu = null;
    this.inventoryUI = null;

    this.isHudReady = false;
    this.currentGameplaySceneKey = null;
  }
}