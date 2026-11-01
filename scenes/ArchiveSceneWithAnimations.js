import { ArchiveScene as OriginalArchiveScene } from './ArchiveScene.js';
import { ArchiveAnimations } from './archive/ArchiveAnimations.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { archiveStoryConfig as storyConfig, getMissingReportState,
  startMissingReportVisit, searchMissingReportCatalogue,
  discoverShredderFragments } from '../archiveMissingReportService.js';

export class ArchiveScene extends OriginalArchiveScene {
  init(data = {}) {
    super.init(data);
    this.storyButtons = null;
    this._documentOpening = false;
    this._documentSceneKey = 'ShreddedReportScene';
  }

  create() {
    super.create();
    this.archiveAnimations = new ArchiveAnimations(this);
    this.createStoryButtons();
    startMissingReportVisit(this.gameState);
    this.refreshArchive();
    if (getMissingReportState(this.gameState).active) this.showStatus(storyConfig.messages.absent);
  }

  createStoryButtons() {
    const make = (text, action) => {
      const button = this.add.text(0, 0, text, {
        fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
        backgroundColor: '#17110e', padding: { x: 14, y: 10 }
      }).setOrigin(0.5, 0).setDepth(100).setVisible(false).setInteractive({ useHandCursor: true });
      button.on('pointerdown', action);
      button.on('pointerover', () => button.setColor('#ffffff'));
      button.on('pointerout', () => button.setColor('#f2d477'));
      return button;
    };
    this.storyButtons = {
      catalogue: make(storyConfig.buttons.catalogue, () => this.searchCatalogue()),
      shredder: make(storyConfig.buttons.shredder, () => { void this.openRecoveredDocument(false); }),
      read: make(storyConfig.buttons.read, () => { void this.openRecoveredDocument(true); })
    };
  }

  refreshArchive() {
    super.refreshArchive();
    if (this._archiveDisposed) return;
    const story = getMissingReportState(this.gameState);
    if (story.active) {
      this.frankPresent = false;
      this.frankHotspot?.setVisible(false);
      if (this.frankHotspot?.input) this.frankHotspot.input.enabled = false;
      this.frankLabel?.setVisible(false);
      this.frankHighlight?.clear();
      this.puzzleButton?.setVisible(false);
      if (this.puzzleButton?.input) this.puzzleButton.input.enabled = false;
      this.nextMissionButton?.setVisible(false);
      if (this.nextMissionButton?.input) this.nextMissionButton.input.enabled = false;
      if (this.textures.exists('archive')) {
        if (!this.background) this.background = this.add.image(0, 0, 'archive').setOrigin(0).setDepth(0);
        else this.background.setTexture('archive');
        this.background.setVisible(true);
      } else this.background?.setVisible(false);
    }
    if (this.storyButtons) {
      this.setStoryButton(this.storyButtons.catalogue, story.active);
      this.setStoryButton(this.storyButtons.shredder, story.active && story.searched);
      this.setStoryButton(this.storyButtons.read, story.completed);
    }
    this.layoutArchive();
  }

  setStoryButton(button, visible) {
    button.setVisible(visible);
    if (button.input) button.input.enabled = visible;
  }

  interactWithFrank() {
    if (getMissingReportState(this.gameState).active) return;
    super.interactWithFrank();
  }

  startReportConversation(item) {
    if (getMissingReportState(this.gameState).active) {
      this.showStatus(storyConfig.messages.absent);
      return;
    }
    super.startReportConversation(item);
  }

  handleItemDrop(drop) {
    if (getMissingReportState(this.gameState).active) return;
    super.handleItemDrop(drop);
  }

  openNextMission() {
    if (getMissingReportState(this.gameState).active) return Promise.resolve(false);
    return super.openNextMission();
  }

  canInteract() { return super.canInteract() && !this._documentOpening; }

  searchCatalogue() {
    if (!this.canInteract() || !getMissingReportState(this.gameState).active) return;
    const saved = searchMissingReportCatalogue(this.gameState);
    this.refreshArchive();
    this.showStatus(storyConfig.messages.missing + (saved ? '' : ` ${storyConfig.messages.saveFailed}`));
  }

  async openRecoveredDocument(readOnlyVisit = false) {
    if (!this.canInteract()) return;
    const story = getMissingReportState(this.gameState);
    if (readOnlyVisit ? !story.completed : !(story.active && story.searched)) return;
    const token = this._archiveRunToken;
    this._documentOpening = true;
    this._puzzleOpen = true;
    try {
      await this._uiSetupPromise;
      if (this._archiveDisposed || token !== this._archiveRunToken) return;
      this.getPlayerHudScene()?.closeAllUIPanels?.();
      const { ShreddedReportScene } = await import('./ShreddedReportScene.js');
      if (this._archiveDisposed || token !== this._archiveRunToken) return;
      if (!this.hasScene(this._documentSceneKey)) this.scene.manager.add(this._documentSceneKey, ShreddedReportScene, false);
      if (this.isSceneRunning(this._documentSceneKey)) throw new Error('Document scene is already open.');
      if (!readOnlyVisit) discoverShredderFragments(this.gameState);
      this.scene.launch(this._documentSceneKey, {
        preview: false,
        returnSceneKey: 'ArchiveScene',
        onFinished: () => this.finishRecoveredDocument(token)
      });
      this.scene.bringToTop(this._documentSceneKey);
    } catch (error) {
      console.error('[ArchiveScene] Failed to open reconstructed report:', error);
      if (this._archiveDisposed || token !== this._archiveRunToken) return;
      this._documentOpening = false;
      this._puzzleOpen = false;
      void this.setupArchiveUiLayers();
      this.showStatus(storyConfig.messages.failed);
    }
  }

  finishRecoveredDocument(token) {
    if (this._archiveDisposed || token !== this._archiveRunToken) return;
    this._documentOpening = false;
    this._puzzleOpen = false;
    const saved = saveGameState();
    this.refreshArchive();
    void this.setupArchiveUiLayers();
    this.showStatus(getMissingReportState(this.gameState).completed
      ? storyConfig.messages.restored + (saved ? '' : ` ${storyConfig.messages.saveFailed}`)
      : storyConfig.messages.found);
  }

  layoutArchive() {
    super.layoutArchive();
    this.archiveAnimations?.layout();
    if (!this.storyButtons) return;
    const { width, height } = this.scale;
    const font = width < 600 ? '14px' : '22px';
    Object.values(this.storyButtons).forEach(button => button.setFontSize(font));
    this.storyButtons.catalogue.setPosition(width / 2, Math.max(165, height * 0.28));
    this.storyButtons.shredder.setPosition(width / 2, Math.max(225, height * 0.28 + 62));
    this.storyButtons.read.setPosition(width / 2, Math.max(165, height * 0.28));
  }

  cleanupArchive() {
    if (this._archiveDisposed) return;
    if (this.storyButtons) Object.values(this.storyButtons).forEach(button => button.removeAllListeners());
    this.storyButtons = null;
    this.archiveAnimations?.destroy();
    this.archiveAnimations = null;
    super.cleanupArchive();
  }
}
