import { gameState } from '../GameData.js';
import { PlayerMenuUI } from '../ui/PlayerMenuUI.js';
import { CaseFileUI } from '../ui/CaseFileUI.js';
import { NotesUI } from '../ui/NotesUI.js';
import { WarrantUI } from '../ui/WarrantUI.js';
import { DestinationsUI } from '../ui/DestinationsUI.js';
import { CrimeBoardUI } from '../ui/CrimeBoardUI.js';
import { AtlasUI } from '../ui/AtlasUI.js';
import { PhonebookUI } from '../ui/PhonebookUI.js';
import { DialogManager } from '../DialogManager.js';
import { BaseScene } from './BaseScene.js';

const HUD_ALLOWED_SCENES = [
  'GameScene',
  'OfficeScene',
  'CityScene',
  'LocationScene',
  'HiddenObjectsScene',
  'CrimeLabScene',
  'InventoryScene',
];

const HUD_OVERLAY_SCENES = [
  'PlayerHudScene',
  'NewsHud',
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
    this.dialogManager = null;

    this.isHudReady = false;

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
    this.dialogManager = new DialogManager(this, this.gameState);

    this.phoneUI.setOnCall((key, contact) => {
      this.dialogManager.startDialog(key, contact);
    });

    this.playerMenu = new PlayerMenuUI(this, this.gameState);
    this.crimeBoardUI = new CrimeBoardUI(this);

    this.isHudReady = true;

    this.scene.bringToTop();
    this.scene.setVisible(true);

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

    this.events.on(Phaser.Scenes.Events.WAKE, this.onWake, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.on(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  onGlobalSceneStart(sys) {
    this.handleSceneChange(sys.settings.key);
  }

  onGlobalSceneWake(sys) {
    this.handleSceneChange(sys.settings.key);
  }

  handleSceneChange(sceneKey) {
    if (HUD_OVERLAY_SCENES.includes(sceneKey)) {
      return;
    }

    if (HUD_ALLOWED_SCENES.includes(sceneKey)) {
      this.showHud();
      return;
    }

    this.hideHud();
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

    if (this.playerMenu?.close) {
      this.playerMenu.close();
    }

    this.scene.setVisible(false);
  }

  onWake() {
    this.showHud();
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
    this.dialogManager?.dialogUI?.destroy?.();
    this.playerMenu?.destroy?.();

    this.caseFileUI = null;
    this.notesUI = null;
    this.warrantUI = null;
    this.destinationsUI = null;
    this.crimeBoardUI = null;
    this.atlasUI = null;
    this.phoneUI = null;
    this.dialogManager = null;
    this.playerMenu = null;

    this.isHudReady = false;
  }

  closeAllUIPanels() {
    this.caseFileUI?.close?.();
    this.notesUI?.close?.();
    this.destinationsUI?.close?.();
    this.warrantUI?.close?.();
    this.crimeBoardUI?.close?.();
    this.atlasUI?.close?.();
    this.phoneUI?.close?.();
    this.dialogManager?.dialogUI?.close?.();
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
      || this.dialogManager?.dialogUI?.isOpen
      || this.playerMenu?.isOpen,
    );
  }
}