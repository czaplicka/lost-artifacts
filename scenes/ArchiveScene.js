import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { MainStoryManager } from '../managers/MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import { REPORT_ITEM_ID, getArchiveCaseId, isArchivistPresent, isReportSubmitted,
  canRequestNextMission, ensureMissionReport, submitMissionReport } from '../archiveReportService.js';

const dialogue = await loadJson('../assets/data/dialogue/archivist.json', import.meta.url);
const OFFER = 'archive_index_puzzle_offered';
const DONE = 'duplicate_record_found';
const DISCUSSED = 'archive_duplicate_discussed';
const PUZZLE = 'ArchiveIndexPuzzleScene';
const HOTSPOT = { width: 200, height: 200, offsetX: 0, offsetY: 0 };

export class ArchiveScene extends BaseScene {
  constructor() {
    super({ key: 'ArchiveScene' });
    this._archiveDisposed = true;
    this._onDragTarget = request => this.registerDragTarget(request);
    this._onItemDrop = drop => this.handleItemDrop(drop);
    this._onInventoryUpdated = () => {
      if (this.canInteract()) this.refreshArchive();
    };
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;
    this.background = null;
    this._archiveDisposed = false;
    this._archiveRunToken = Symbol('archive-run');
    this._conversationOpen = false;
    this._puzzleOpen = false;
    this._refreshing = false;
    this._uiSetupPromise = null;
    this._statusTimer = null;
    this._pausedLayers = [];
    this.isLeaving = false;
    this.frankPresent = false;
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');
    for (const key of ['archive', 'archivist']) {
      if (this.textures.exists(key)) continue;
      const entry = manifest?.backgrounds?.find(asset => asset.key === key);
      if (entry?.url) this.load.image(key, entry.url);
    }
  }

  create() {
    super.create();
    audioManager.init(this);
    this.registry.set('currentCity', 'hq');
    this.registry.set('currentCityId', 'hq');
    this.registry.set('gameState', this.gameState);
    this.cameras.main.setBackgroundColor('#17110e');
    this.createFrankHotspot();
    this.createInterface();
    this.refreshArchive();
    this.onBus('inventory:request-drag-target', this._onDragTarget);
    this.onBus('inventory:item-dropped', this._onItemDrop);
    this.onBus('inventoryUpdated', this._onInventoryUpdated);
    this.onBus('archive:indexPuzzleCompleted', () => {
      if (this._puzzleOpen) saveGameState();
    });
    this.scale.on('resize', this.handleResize, this);
    this.events.on(Phaser.Scenes.Events.WAKE, this.onWakeOrResume, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onWakeOrResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupArchive, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanupArchive, this);
    void this.setupArchiveUiLayers();
  }

  isArchiveActive() {
    return !this._archiveDisposed && !this.isLeaving && this.sys.isActive();
  }

  canInteract() {
    return this.isArchiveActive() && !this._conversationOpen && !this._puzzleOpen &&
      !this.getPlayerHudScene()?.isAnyPanelOpen?.();
  }

  refreshArchive() {
    if (this._archiveDisposed || this._refreshing) return;
    this._refreshing = true;
    try {
      const report = ensureMissionReport(this.gameState);
      if (report.changed) saveGameState();
      this.frankPresent = isArchivistPresent(this.gameState);
      const key = this.frankPresent ? 'archivist' : 'archive';
      if (this.textures.exists(key)) {
        if (!this.background) this.background = this.add.image(0, 0, key).setOrigin(0).setDepth(0);
        else this.background.setTexture(key);
        this.background.setVisible(true);
      } else this.background?.setVisible(false);
      this.frankHotspot.setVisible(this.frankPresent);
      this.frankHotspot.input.enabled = this.frankPresent;
      this.frankLabel.setVisible(false);
      const next = canRequestNextMission(this.gameState);
      this.nextMissionButton.setVisible(next);
      this.nextMissionButton.input.enabled = next;
      const available = this.frankPresent && isReportSubmitted(this.gameState) &&
        MainStoryManager.hasFlag(OFFER) && !MainStoryManager.hasFlag(DONE);
      this.puzzleButton.setVisible(available);
      this.puzzleButton.input.enabled = available;
      this.layoutArchive();
      if (report.status === 'full') this.showStatus(dialogue.inventoryFullMessage);
      if (!this.frankPresent) this.showStatus(dialogue.absentMessage);
    } finally { this._refreshing = false; }
  }

  createFrankHotspot() {
    this.frankHighlight = this.add.graphics().setDepth(20);
    this.frankHotspot = this.add.zone(0, 0, HOTSPOT.width, HOTSPOT.height)
      .setOrigin(0).setDepth(21).setName('hotspot-archivist-drebin')
      .setInteractive({ useHandCursor: true });
    this.frankLabel = this.add.text(0, 0, dialogue.speaker, {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffe29a',
      backgroundColor: '#17110e', padding: { x: 10, y: 6 }
    }).setOrigin(0.5, 1).setDepth(22).setVisible(false);
    this.frankHotspot.on('pointerover', () => {
      if (!this.canInteract()) return;
      this.frankLabel.setVisible(true);
      this.drawFrankHighlight(true);
    });
    this.frankHotspot.on('pointerout', () => {
      this.frankLabel.setVisible(false);
      this.drawFrankHighlight();
    });
    this.frankHotspot.on('pointerdown', () => this.interactWithFrank());
  }

  getFrankHotspotBounds() {
    return { x: this.scale.width / 2 - HOTSPOT.width / 2 + HOTSPOT.offsetX,
      y: this.scale.height / 2 - HOTSPOT.height / 2 + HOTSPOT.offsetY,
      width: HOTSPOT.width, height: HOTSPOT.height };
  }

  drawFrankHighlight(hovered = false) {
    this.frankHighlight?.clear();
    if (!this.frankPresent) return;
    const b = this.getFrankHotspotBounds();
    this.frankHighlight.fillStyle(0xffd54a, hovered ? 0.24 : 0.12);
    this.frankHighlight.fillRect(b.x, b.y, b.width, b.height);
    this.frankHighlight.lineStyle(hovered ? 4 : 3, 0xffd54a, 1);
    this.frankHighlight.strokeRect(b.x, b.y, b.width, b.height);
  }

  pickLine(lines) { return Array.isArray(lines) && lines.length ? Phaser.Utils.Array.GetRandom(lines) : ''; }

  interactWithFrank() {
    if (!this.canInteract() || !isArchivistPresent(this.gameState)) return;
    audioManager.playSfx('click_sound');
    const result = ensureMissionReport(this.gameState);
    if (result.changed) saveGameState();
    if (result.status === 'full') return this.showStatus(dialogue.inventoryFullMessage);
    if (!isReportSubmitted(this.gameState)) return this.showStatus(this.pickLine(dialogue.clickReplies));
    if (MainStoryManager.hasFlag(DONE) && !MainStoryManager.hasFlag(DISCUSSED)) {
      this.openConversation(dialogue.duplicateConversation, () => {
        MainStoryManager.setFlag(DISCUSSED, true);
        saveGameState();
        this.showStatus(dialogue.duplicateDiscussedMessage);
      });
    } else if (!MainStoryManager.hasFlag(DONE)) {
      this.openConversation(dialogue.indexPuzzleOffer, () => {
        MainStoryManager.setFlag(OFFER, true);
        saveGameState();
        this.refreshArchive();
        this.showStatus(dialogue.indexPuzzleAvailableMessage);
      });
    } else this.openConversation(dialogue.afterReportConversation);
  }

  async openIndexPuzzle() {
    if (!this.canInteract() || !this.frankPresent || !isReportSubmitted(this.gameState) ||
        !MainStoryManager.hasFlag(OFFER) || MainStoryManager.hasFlag(DONE)) return;
    this._puzzleOpen = true;
    const token = this._archiveRunToken;
    try {
      await this._uiSetupPromise;
      if (this._archiveDisposed || token !== this._archiveRunToken) return;
      this.getPlayerHudScene()?.closeAllUIPanels?.();
      this._pausedLayers = ['PlayerHudScene', 'UIScene', 'NewsHud'].filter(key => this.isSceneActive(key));
      this._pausedLayers.forEach(key => {
        this.scene.setVisible(false, key);
        this.scene.pause(key);
      });
      const opened = await this.launchOverlay(PUZZLE, {
        returnSceneKey: 'ArchiveScene', resumeReturnScene: true,
        onFinished: () => this.finishIndexVisit(token)
      });
      if (!opened) throw new Error('Puzzle could not be loaded.');
      if (this._archiveDisposed || token !== this._archiveRunToken) return;
      this.scene.bringToTop(PUZZLE);
      this.scene.pause();
    } catch (error) {
      console.error('[ArchiveScene] Puzzle launch failed:', error);
      this.finishIndexVisit(token);
      this.showStatus(dialogue.puzzleLoadError);
    }
  }

  restorePausedLayers() {
    for (const key of this._pausedLayers) {
      if (!this.hasScene(key)) continue;
      this.scene.setVisible(true, key);
      if (this.isScenePaused(key)) this.scene.resume(key);
    }
    this._pausedLayers = [];
  }

  finishIndexVisit(token) {
    if (this._archiveDisposed || token !== this._archiveRunToken) return;
    this._puzzleOpen = false;
    this.restorePausedLayers();
    saveGameState();
    this.refreshArchive();
    void this.setupArchiveUiLayers();
    if (MainStoryManager.hasFlag(DONE) && !MainStoryManager.hasFlag(DISCUSSED)) {
      this.showStatus(dialogue.askAboutDuplicateMessage);
    }
  }

  registerDragTarget(request) {
    if (!this.canInteract() || request.targetSceneKey) return;
    request.targetSceneKey = 'ArchiveScene';
    request.targetToken = this._archiveRunToken;
  }

  handleItemDrop(drop) {
    if (drop.accepted || drop.targetSceneKey !== 'ArchiveScene' ||
        drop.targetToken !== this._archiveRunToken || !this.canInteract()) return;
    const x = drop.xRatio * this.scale.width, y = drop.yRatio * this.scale.height;
    const b = this.getFrankHotspotBounds();
    if (!isArchivistPresent(this.gameState) || !Number.isFinite(x) || !Number.isFinite(y) ||
        x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) return;
    const item = inventoryManager.getItem(drop.itemId);
    if (!item) return;
    drop.accepted = true;
    if (item.id !== REPORT_ITEM_ID) return this.showStatus(this.pickLine(dialogue.wrongItemReplies));
    this.startReportConversation(item);
  }

  startReportConversation(item) {
    if (!this.canInteract() || !isArchivistPresent(this.gameState)) return;
    if (isReportSubmitted(this.gameState)) return this.showStatus(this.pickLine(dialogue.alreadySubmittedReplies));
    if (String(item.metadata?.caseId) !== getArchiveCaseId(this.gameState)) return this.showStatus(dialogue.wrongReportMessage);
    const { id, addedAt } = item;
    this.openConversation(dialogue.reportConversation, () => {
      const result = submitMissionReport(id, addedAt, this.gameState);
      this.refreshArchive();
      if (!result.ok) return this.showStatus('Nothing was filed. Check that you still have the correct report.');
      this.showStatus(result.saved ? dialogue.submittedMessage : dialogue.saveWarning);
    });
  }

  openConversation(entry, onClose = null) {
    if (!this.canInteract()) return false;
    const dialog = this.getPlayerHudScene()?.dialogManager?.dialogUI;
    if (!dialog || dialog.destroyed || dialog.isOpen || !Array.isArray(entry?.lines)) {
      this.showStatus('The conversation could not be opened. Please try again.');
      return false;
    }
    const token = this._archiveRunToken;
    this._conversationOpen = true;
    this.statusText?.setVisible(false);
    this.frankLabel?.setVisible(false);
    try {
      dialog.open({ speaker: dialogue.speaker, portraitKey: dialogue.portraitKey, lines: [...entry.lines] }, {
        onClose: () => {
          if (this._archiveDisposed || token !== this._archiveRunToken || !this._conversationOpen) return;
          this._conversationOpen = false;
          if (this.isArchiveActive()) onClose?.();
        }
      });
      return true;
    } catch (error) {
      this._conversationOpen = false;
      console.error('[ArchiveScene] Conversation failed:', error);
      this.showStatus('The conversation could not be opened. Please try again.');
      return false;
    }
  }

  createInterface() {
    const style = { fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
      backgroundColor: '#17110e', padding: { x: 14, y: 10 } };
    const button = (label, callback) => {
      const object = this.add.text(0, 0, label, style).setDepth(100).setInteractive({ useHandCursor: true });
      object.on('pointerdown', callback);
      object.on('pointerover', () => object.setColor('#ffffff'));
      object.on('pointerout', () => object.setColor('#f2d477'));
      return object;
    };
    this.backButton = button('< BACK TO OFFICE', () => { void this.returnToOffice(); }).setOrigin(0, 1);
    this.nextMissionButton = button('NEXT MISSION >', () => { void this.openNextMission(); }).setOrigin(1, 1).setVisible(false);
    this.puzzleButton = button('SORT INDEX CARDS', () => { void this.openIndexPuzzle(); }).setOrigin(0.5, 1).setVisible(false);
    this.statusText = this.add.text(0, 0, '', { ...style, align: 'center' }).setOrigin(0.5, 0).setDepth(110).setVisible(false);
  }

  layoutArchive() {
    if (this._archiveDisposed) return;
    const { width, height } = this.scale;
    this.background?.setDisplaySize(width, height);
    const b = this.getFrankHotspotBounds();
    this.frankHotspot?.setPosition(b.x, b.y);
    this.frankLabel?.setPosition(b.x + b.width / 2, b.y - 10);
    const font = width < 600 ? '14px' : '22px';
    this.backButton?.setFontSize(font).setPosition(16, height - 24);
    this.nextMissionButton?.setFontSize(font).setPosition(width - 16, height - (width < 400 ? 82 : 24));
    this.puzzleButton?.setFontSize(font).setPosition(width / 2, height - (width < 400 ? 138 : 90));
    this.statusText?.setPosition(width / 2, 100).setWordWrapWidth(Math.max(120, Math.min(width - 48, 760)), true);
    this.drawFrankHighlight();
  }

  showStatus(message) {
    if (!message || this._archiveDisposed) return;
    this._statusTimer?.remove(false);
    this.statusText.setText(message).setVisible(true);
    this._statusTimer = this.time.delayedCall(6500, () => {
      this._statusTimer = null;
      if (!this._archiveDisposed) this.statusText?.setVisible(false);
    });
  }

  returnToOffice() { return this.leaveArchive('OfficeScene', { gameState: this.gameState }); }
  openNextMission() {
    if (!canRequestNextMission(this.gameState)) return Promise.resolve(false);
    return this.leaveArchive('AgainScene', { afterReport: true });
  }

  async leaveArchive(key, data) {
    if (!this.canInteract()) return false;
    const token = this._archiveRunToken;
    this.isLeaving = true;
    audioManager.playSfx('click_sound');
    saveGameState();
    try {
      const result = await this.goto(key, data);
      if (!this._archiveDisposed && token === this._archiveRunToken && this.sys.isActive()) {
        this.isLeaving = false;
        if (result === false) this.showStatus('This screen could not be opened. Please try again.');
      }
      return result !== false;
    } catch (error) {
      if (!this._archiveDisposed && token === this._archiveRunToken) this.isLeaving = false;
      console.error('[ArchiveScene] Navigation failed:', error);
      return false;
    }
  }

  setupArchiveUiLayers() {
    if (this._archiveDisposed || this._puzzleOpen) return Promise.resolve(false);
    if (this._uiSetupPromise) return this._uiSetupPromise;
    const token = this._archiveRunToken;
    const current = () => !this._archiveDisposed && !this._puzzleOpen && token === this._archiveRunToken && this.sys.isActive();
    const request = (async () => {
      try {
        await this.ensureOverlayScene('UIScene');
        if (!current()) return false;
        const hud = await this.restorePlayerHud();
        if (!current()) return false;
        hud?.closeAllUIPanels?.();
        hud?.setCurrentGameplayScene?.('ArchiveScene');
        const news = await this.ensureOverlayScene('NewsHud');
        if (!current()) return false;
        news?.events?.emit('setNewspaperVisible', false);
        news?.events?.emit('setTvVisible', false);
        return true;
      } catch (error) {
        console.error('[ArchiveScene] HUD setup failed:', error);
        return false;
      }
    })();
    this._uiSetupPromise = request;
    void request.finally(() => { if (this._uiSetupPromise === request) this._uiSetupPromise = null; });
    return request;
  }

  handleResize() { this.layoutArchive(); }
  onWakeOrResume() {
    if (this._archiveDisposed) return;
    this.isLeaving = false;
    this.refreshArchive();
    if (!this._puzzleOpen) void this.setupArchiveUiLayers();
  }

  cleanupArchive() {
    if (this._archiveDisposed) return;
    this._archiveDisposed = true;
    this._archiveRunToken = null;
    this._conversationOpen = false;
    this._statusTimer?.remove(false);
    this._statusTimer = null;
    this.restorePausedLayers();
    this._uiSetupPromise = null;
    EventBus.clearScope(this);
    this.scale.off('resize', this.handleResize, this);
    for (const event of [Phaser.Scenes.Events.WAKE, Phaser.Scenes.Events.RESUME]) {
      this.events.off(event, this.onWakeOrResume, this);
    }
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupArchive, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanupArchive, this);
    for (const object of [this.frankHotspot, this.backButton, this.nextMissionButton, this.puzzleButton]) object?.removeAllListeners();
    this.background = null;
  }
}
