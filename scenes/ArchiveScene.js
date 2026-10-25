import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { audioManager } from '../managers/AudioManager.js';
import { inventoryManager } from '../managers/InventoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { loadJson } from '../config/loadJson.js';
import {
  REPORT_ITEM_ID, getArchiveCaseId, isArchivistPresent, isReportSubmitted,
  canRequestNextMission, ensureMissionReport, submitMissionReport
} from '../archiveReportService.js';

const frankDialogue = await loadJson('../assets/data/dialogue/archivist.json', import.meta.url);
const ARCHIVE_BACKGROUND_KEYS = ['archive', 'archivist'];
const FRANK_HOTSPOT = { width: 200, height: 200, offsetX: 0, offsetY: 0, highlight: true };

export class ArchiveScene extends BaseScene {
  constructor() {
    super({ key: 'ArchiveScene' });
    this._archiveDisposed = true;
    this._archiveRunToken = null;
    this._onDragTarget = request => this.registerDragTarget(request);
    this._onItemDrop = drop => this.handleItemDrop(drop);
    this._onInventoryUpdated = () => {
      if (this.isArchiveActive() && !this._conversationOpen) this.refreshArchive();
    };
  }

  init(data = {}) {
    this.gameState = data.gameState ?? gameState;
    this.background = null;
    this.frankHotspot = null;
    this.frankHighlight = null;
    this.frankLabel = null;
    this.backButton = null;
    this.nextMissionButton = null;
    this.statusText = null;
    this.isLeaving = false;
    this.frankPresent = false;
    this._conversationOpen = false;
    this._refreshing = false;
    this._archiveRunToken = Symbol('archive-run');
    this._archiveDisposed = false;
    this._statusTimer = null;
    this._uiSetupPromise = null;
  }

  preload() {
    const manifest = this.cache.json.get('assetManifest');
    for (const key of ARCHIVE_BACKGROUND_KEYS) {
      if (this.textures.exists(key)) continue;
      const entry = manifest?.backgrounds?.find(asset => asset.key === key);
      if (entry?.url) this.load.image(key, entry.url);
      else console.error(`[ArchiveScene] Missing background manifest entry "${key}".`);
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
    EventBus.on('inventory:request-drag-target', this._onDragTarget, this);
    EventBus.on('inventory:item-dropped', this._onItemDrop, this);
    EventBus.on('inventoryUpdated', this._onInventoryUpdated, this);
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
      } else {
        this.background?.setVisible(false);
        console.error(`[ArchiveScene] Missing background "${key}".`);
      }
      this.frankHotspot.setVisible(this.frankPresent);
      this.frankHotspot.input.enabled = this.frankPresent;
      this.frankLabel.setVisible(false);
      const nextAvailable = canRequestNextMission(this.gameState);
      this.nextMissionButton.setVisible(nextAvailable);
      this.nextMissionButton.input.enabled = nextAvailable;
      this.layoutArchive();
      if (report.status === 'full') this.showStatus(frankDialogue.inventoryFullMessage);
      if (!this.frankPresent) this.showStatus(frankDialogue.absentMessage);
    } finally { this._refreshing = false; }
  }

  createFrankHotspot() {
    this.frankHighlight = this.add.graphics().setDepth(20);
    this.frankHotspot = this.add.zone(0, 0, FRANK_HOTSPOT.width, FRANK_HOTSPOT.height)
      .setOrigin(0).setDepth(21).setName('hotspot-archivist-drebin')
      .setInteractive({ useHandCursor: true });
    this.frankLabel = this.add.text(0, 0, frankDialogue.speaker, {
      fontFamily: 'SpecialElite', fontSize: '20px', color: '#ffe29a',
      backgroundColor: '#17110e', padding: { x: 10, y: 6 }
    }).setOrigin(0.5, 1).setDepth(22).setVisible(false);
    this.frankHotspot.on('pointerover', () => {
      if (!this.canInteract() || !this.frankPresent) return;
      this.frankLabel.setVisible(true);
      this.drawFrankHighlight(true);
    });
    this.frankHotspot.on('pointerout', () => {
      this.frankLabel.setVisible(false);
      this.drawFrankHighlight(false);
    });
    this.frankHotspot.on('pointerdown', () => this.interactWithFrank());
  }

  getFrankHotspotBounds() {
    return {
      x: this.scale.width / 2 - FRANK_HOTSPOT.width / 2 + FRANK_HOTSPOT.offsetX,
      y: this.scale.height / 2 - FRANK_HOTSPOT.height / 2 + FRANK_HOTSPOT.offsetY,
      width: FRANK_HOTSPOT.width, height: FRANK_HOTSPOT.height
    };
  }

  drawFrankHighlight(hovered = false) {
    this.frankHighlight?.clear();
    if (!this.frankPresent || !FRANK_HOTSPOT.highlight) return;
    const b = this.getFrankHotspotBounds();
    this.frankHighlight.fillStyle(0xffd54a, hovered ? 0.24 : 0.12);
    this.frankHighlight.fillRect(b.x, b.y, b.width, b.height);
    this.frankHighlight.lineStyle(hovered ? 4 : 3, 0xffd54a, 1);
    this.frankHighlight.strokeRect(b.x, b.y, b.width, b.height);
  }

  pickLine(lines) {
    return Array.isArray(lines) && lines.length ? lines[Math.floor(Math.random() * lines.length)] : '';
  }

  interactWithFrank() {
    if (!this.canInteract() || !isArchivistPresent(this.gameState)) return;
    audioManager.playSfx('click_sound');
    const result = ensureMissionReport(this.gameState);
    if (result.changed) saveGameState();
    if (result.status === 'full') return this.showStatus(frankDialogue.inventoryFullMessage);
    if (isReportSubmitted(this.gameState)) {
      this.openConversation(frankDialogue.afterReportConversation);
      return;
    }
    this.showStatus(this.pickLine(frankDialogue.clickReplies));
  }

  registerDragTarget(request) {
    if (!this.isArchiveActive() || this._conversationOpen || request.targetSceneKey) return;
    request.targetSceneKey = 'ArchiveScene';
    request.targetToken = this._archiveRunToken;
  }

  handleItemDrop(drop) {
    if (drop.accepted || drop.targetSceneKey !== 'ArchiveScene' ||
        drop.targetToken !== this._archiveRunToken || !this.canInteract()) return;
    const x = drop.xRatio * this.scale.width;
    const y = drop.yRatio * this.scale.height;
    const b = this.getFrankHotspotBounds();
    if (!isArchivistPresent(this.gameState) || !Number.isFinite(x) || !Number.isFinite(y) ||
        x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) return;
    const item = inventoryManager.getItem(drop.itemId);
    if (!item) return;
    drop.accepted = true;
    if (item.id !== REPORT_ITEM_ID) {
      this.showStatus(this.pickLine(frankDialogue.wrongItemReplies));
      return;
    }
    this.startReportConversation(item);
  }

  startReportConversation(item) {
    if (!this.canInteract() || !isArchivistPresent(this.gameState)) return;
    if (isReportSubmitted(this.gameState)) {
      this.showStatus(this.pickLine(frankDialogue.alreadySubmittedReplies));
      return;
    }
    const caseId = getArchiveCaseId(this.gameState);
    if (String(item.metadata?.caseId) !== caseId) {
      this.showStatus(frankDialogue.wrongReportMessage);
      return;
    }
    const { id, addedAt } = item;
    this.openConversation(frankDialogue.reportConversation, () => {
      const result = submitMissionReport(id, addedAt, this.gameState);
      this.refreshArchive();
      if (!result.ok) {
        this.showStatus(result.reason === 'submitted'
          ? this.pickLine(frankDialogue.alreadySubmittedReplies)
          : 'Nothing was filed. Check that you still have the report for this case.');
        return;
      }
      this.showStatus(result.saved ? frankDialogue.submittedMessage
        : `${frankDialogue.submittedMessage} Automatic saving is unavailable; save manually.`);
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
      dialog.open({ speaker: frankDialogue.speaker, portraitKey: frankDialogue.portraitKey,
        lines: [...entry.lines] }, {
        onClose: () => {
          if (this._archiveDisposed || this._archiveRunToken !== token || !this._conversationOpen) return;
          this._conversationOpen = false;
          if (!this.isArchiveActive()) return;
          onClose?.();
        }
      });
      return true;
    } catch (error) {
      this._conversationOpen = false;
      console.error('[ArchiveScene] Failed to open conversation:', error);
      this.showStatus('The conversation could not be opened. Nothing has been filed.');
      return false;
    }
  }

  createInterface() {
    const style = { fontFamily: 'SpecialElite', fontSize: '22px', color: '#f2d477',
      backgroundColor: '#17110e', padding: { x: 14, y: 10 } };
    this.backButton = this.add.text(0, 0, '< BACK TO OFFICE', style)
      .setOrigin(0, 1).setDepth(100).setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => { void this.returnToOffice(); });
    this.nextMissionButton = this.add.text(0, 0, 'NEXT MISSION >', style)
      .setOrigin(1, 1).setDepth(100).setInteractive({ useHandCursor: true }).setVisible(false);
    this.nextMissionButton.on('pointerdown', () => { void this.openNextMission(); });
    for (const button of [this.backButton, this.nextMissionButton]) {
      button.on('pointerover', () => button.setColor('#ffffff'));
      button.on('pointerout', () => button.setColor('#f2d477'));
    }
    this.statusText = this.add.text(0, 0, '', {
      ...style, align: 'center', padding: { x: 16, y: 12 }
    }).setOrigin(0.5, 0).setDepth(110).setVisible(false);
  }

  layoutArchive() {
    if (this._archiveDisposed) return;
    const { width, height } = this.scale;
    this.background?.setDisplaySize(width, height);
    const b = this.getFrankHotspotBounds();
    this.frankHotspot?.setPosition(b.x, b.y);
    this.frankLabel?.setPosition(b.x + b.width / 2, b.y - 10);
    const fontSize = width < 600 ? '14px' : '22px';
    this.backButton?.setFontSize(fontSize).setPosition(16, height - 24);
    this.nextMissionButton?.setFontSize(fontSize).setPosition(width - 16, height - (width < 400 ? 82 : 24));
    this.statusText?.setPosition(width / 2, 100);
    this.statusText?.setWordWrapWidth(Math.max(120, Math.min(width - 48, 760)), true);
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

  canInteract() {
    return this.isArchiveActive() && !this._conversationOpen &&
      !this.getPlayerHudScene()?.isAnyPanelOpen?.();
  }

  returnToOffice() { return this.leaveArchive('OfficeScene', { gameState: this.gameState }); }

  openNextMission() {
    if (!canRequestNextMission(this.gameState)) return Promise.resolve(false);
    return this.leaveArchive('AgainScene', { afterReport: true });
  }

  async leaveArchive(sceneKey, data) {
    if (!this.canInteract()) return false;
    const token = this._archiveRunToken;
    this.isLeaving = true;
    audioManager.playSfx('click_sound');
    saveGameState();
    try {
      const result = await this.goto(sceneKey, data);
      if (this._archiveRunToken === token && !this._archiveDisposed && this.sys.isActive()) {
        this.isLeaving = false;
        if (result === false) this.showStatus('This screen could not be opened. Please try again.');
      }
      return result !== false;
    } catch (error) {
      if (this._archiveRunToken === token && !this._archiveDisposed) {
        this.isLeaving = false;
        this.showStatus('This screen could not be opened. Please try again.');
      }
      console.error('[ArchiveScene] Navigation failed:', error);
      return false;
    }
  }

  setupArchiveUiLayers() {
    if (this._archiveDisposed) return Promise.resolve(false);
    if (this._uiSetupPromise) return this._uiSetupPromise;
    const token = this._archiveRunToken;
    const current = () => !this._archiveDisposed && this._archiveRunToken === token && this.sys.isActive();
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
        if (current()) console.error('[ArchiveScene] HUD setup failed:', error);
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
    void this.setupArchiveUiLayers();
  }

  cleanupArchive() {
    if (this._archiveDisposed) return;
    this._archiveDisposed = true;
    this._archiveRunToken = null;
    this._conversationOpen = false;
    this._statusTimer?.remove(false);
    this._statusTimer = null;
    this._uiSetupPromise = null;
    EventBus.off('inventory:request-drag-target', this._onDragTarget, this);
    EventBus.off('inventory:item-dropped', this._onItemDrop, this);
    EventBus.off('inventoryUpdated', this._onInventoryUpdated, this);
    this.scale.off('resize', this.handleResize, this);
    for (const [event, callback] of [
      [Phaser.Scenes.Events.WAKE, this.onWakeOrResume],
      [Phaser.Scenes.Events.RESUME, this.onWakeOrResume],
      [Phaser.Scenes.Events.SHUTDOWN, this.cleanupArchive],
      [Phaser.Scenes.Events.DESTROY, this.cleanupArchive]
    ]) this.events.off(event, callback, this);
    this.frankHotspot?.removeAllListeners();
    this.backButton?.removeAllListeners();
    this.nextMissionButton?.removeAllListeners();
    this.background = null;
    this.frankHotspot = null;
    this.frankHighlight = null;
    this.frankLabel = null;
    this.backButton = null;
    this.nextMissionButton = null;
    this.statusText = null;
  }
}
