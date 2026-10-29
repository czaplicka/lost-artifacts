import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { getCaseSuspects } from '../suspects/CaseSuspects.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { CrimeCityTutorial, advanceCrimeTutorial } from '../CrimeCityTutorial.js';
import { getGridMarkState } from '../suspectsBoard/gridHelpers.js';
import { GridDataMixin } from '../suspectsBoard/GridData.mixin.js';
import { GridDrawMixin } from '../suspectsBoard/GridDraw.mixin.js';
import { GridCellsMixin } from '../suspectsBoard/GridCells.mixin.js';
import { GridInputMixin } from '../suspectsBoard/GridInput.mixin.js';
import { GridLogicMixin } from '../suspectsBoard/GridLogic.mixin.js';

export class SuspectGridScene extends BaseScene {
  constructor() {
    super('SuspectGridScene');
    this.gameState = gameState; this.cityId = null; this.returnScene = 'CrimeCityScene'; this.returnData = {};
    this.labManager = null; this.suspects = []; this.rows = []; this.clueCards = [];
    this.revealedFields = new Set(); this.selectedClueId = null;
    this.placedCluesByCell = {}; this.markedUnlikelyBySuspectId = {};
    this.uiRoot = null; this.modalRoot = null; this.maskGraphics = [];
    this.feedbackText = null; this.feedbackMessage = '';
    this.regions = { body: null, scene: null, header: null, names: null, clueList: null };
    this.bodyContainer = null; this.headerContainer = null; this.sceneContainer = null;
    this.nameContainer = null; this.clueListContainer = null;
    this.layout = null; this.gridOrigin = null;
    this.scrollX = 0; this.scrollY = 0; this.minScrollX = 0; this.minScrollY = 0;
    this.clueScrollY = 0; this.minClueScroll = 0; this.dragTarget = null; this.dragMoved = false;
    this.dragStart = { x: 0, y: 0, sx: 0, sy: 0, cy: 0 };
    this.modalOpen = false; this.resizeHandler = null; this.crimeTutorial = null;
    this.newsHudSnapshot = null; this.overlayHideTimer = null;
    this.returnHighlight = null; this.returnHighlightTween = null; this.gridLeaving = false;
  }
  getCaseSuspects() { return getCaseSuspects(this.gameState); }
  init(data = {}) {
    this.clearReturnHighlight(); this.destroyCrimeTutorial();
    this.gameState = data.gameState || gameState;
    this.cityId = data.cityId || this.gameState.currentMission?.city || this.gameState.crimeCityId || 'unknown_city';
    this.returnScene = typeof data.returnScene === 'string' && data.returnScene.trim() ? data.returnScene.trim() : 'CrimeCityScene';
    this.returnData = { ...(data.returnData || {}), cityId: this.cityId, openPanel: data.returnData?.openPanel || 'alibi' };
    this.labManager = new CrimeLabManager(this.gameState, this.cityId);
    const allSuspects = this.getCaseSuspects();
    const requestedIds = data.suspectIds || this.gameState.suspectGridInput?.suspectIds || this.gameState.currentMission?.suspectIds || allSuspects.map(suspect => suspect.id);
    const validIds = new Set(Array.isArray(requestedIds) ? requestedIds : []);
    this.suspects = allSuspects.filter(suspect => suspect?.id && validIds.has(suspect.id));
    const forensics = this.labManager.ensureCaseForensics();
    forensics.suspectGrid ??= {}; forensics.suspectGrid.placedCluesByCell ??= {};
    this.placedCluesByCell = { ...forensics.suspectGrid.placedCluesByCell };
    this.markedUnlikelyBySuspectId = getGridMarkState(forensics.suspectGrid);
    this.clueCards = this.buildClueCards(forensics, data); this.rows = this.buildRows();
    this.selectedClueId = null; this.scrollX = 0; this.scrollY = 0; this.clueScrollY = 0;
    this.feedbackMessage = ''; this.modalOpen = false;
    this.newsHudSnapshot = null; this.overlayHideTimer = null; this.gridLeaving = false;
  }
  hideOverlayHuds() {
    const keys = this.scene.manager.keys, news = keys.NewsHud;
    if (news?.sys?.isActive() && news.menuTab && news.menuPanel) {
      this.newsHudSnapshot ??= { scene: news, hudEnabled: news.hudEnabled, sceneVisible: news.sys.settings.visible };
      news.setHudVisible(false); news.sys.setVisible(false);
    }
    if (keys.PlayerHudScene?.sys?.isActive()) this.scene.sleep('PlayerHudScene');
  }
  restoreNewsHud() {
    const snapshot = this.newsHudSnapshot; this.newsHudSnapshot = null;
    if (!snapshot) return;
    const news = this.scene.manager.keys.NewsHud;
    if (news !== snapshot.scene || news.isShutDown || !news.menuTab || !news.menuPanel) return;
    news.setHudVisible(snapshot.hudEnabled); news.sys.setVisible(snapshot.sceneVisible);
  }
  create() {
    super.create(); this.hideOverlayHuds();
    this.overlayHideTimer = this.time.delayedCall(150, () => { this.overlayHideTimer = null; this.hideOverlayHuds(); });
    this.cameras.main.setBackgroundColor('#110d0e');
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);
    this.buildUI(); this.startCrimeTutorial(); this.syncReturnHighlight();
    this.resizeHandler = () => { if (this.sys.isActive()) this.refreshAll(); };
    this.scale.on('resize', this.resizeHandler, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
  }
  startCrimeTutorial() {
    this.destroyCrimeTutorial();
    const saved = this.gameState.onboarding?.crimeCity;
    if (!saved || saved.completed) return;
    if (saved.step === 'hypothesis' && this.gameState.reconstructedHeist?.playerTheoryResult) advanceCrimeTutorial(this.gameState, 'hypothesis');
    if (saved.step === 'suspects') advanceCrimeTutorial(this.gameState, 'suspects');
    if (saved.step !== 'suspect_grid') return;
    this.crimeTutorial = new CrimeCityTutorial(this, this.gameState); this.crimeTutorial.start();
  }
  destroyCrimeTutorial() {
    if (!this.crimeTutorial) return;
    try { this.crimeTutorial.destroy(); }
    catch (error) { console.warn('[SuspectGridScene] Tutorial cleanup failed:', error); }
    this.crimeTutorial = null;
  }
  syncReturnHighlight() {
    this.clearReturnHighlight();
    if (this.gridLeaving) return;
    if (this.crimeTutorial?.isActive()) { this.crimeTutorial.syncGridStep(true); return; }
    // Optional guidance outside onboarding; the tutorial owns its own highlight.
    const remaining = this.getGridRemainingSuspects(), submitted = this.isGridShortlistSubmitted();
    if (!submitted && remaining.length !== 2) return;
    const { width, height } = this.scale;
    this.returnHighlight = this.add.rectangle(submitted ? 110 : width - 135, height - 31, submitted ? 202 : 262, 50)
      .setStrokeStyle(4, 0xf2d477, 1).setFillStyle(0xf2d477, 0.06).setDepth(9999).setScrollFactor(0);
    this.returnHighlightTween = this.tweens.add({ targets: this.returnHighlight, alpha: { from: 0.3, to: 1 }, duration: 650, yoyo: true, repeat: -1 });
    this.setFeedback(submitted ? 'Shortlist sent. Return to Crime City to investigate the alibis.' : 'Two suspects remain. Click SEND TO ALIBIS to submit your shortlist.');
  }
  clearReturnHighlight() {
    this.returnHighlightTween?.stop(); this.returnHighlightTween?.remove?.(); this.returnHighlightTween = null;
    this.returnHighlight?.destroy(); this.returnHighlight = null;
  }
  refreshAll() { this.buildUI(); this.syncReturnHighlight(); }
  rebuildScene() { this.refreshAll(); }
  cleanupScene() {
    this.clearReturnHighlight(); this.destroyCrimeTutorial();
    this.overlayHideTimer?.remove(false); this.overlayHideTimer = null; this.restoreNewsHud();
    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler, this);
    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('wheel', this.handleWheel, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);
    this.resizeHandler = null; this.dragTarget = null; this.modalOpen = false; this.clearUI();
  }
}
Object.assign(SuspectGridScene.prototype, GridDataMixin, GridDrawMixin, GridCellsMixin, GridInputMixin, GridLogicMixin);