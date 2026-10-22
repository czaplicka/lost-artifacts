import { BaseScene } from './BaseScene.js';
import { gameState } from '../GameData.js';
import { CrimeLabManager } from './CSI/CrimeLabManager.js';
import { getGridMarkState } from '../suspectsBoard/gridHelpers.js';
import { GridDataMixin } from '../suspectsBoard/GridData.mixin.js';
import { GridDrawMixin } from '../suspectsBoard/GridDraw.mixin.js';
import { GridCellsMixin } from '../suspectsBoard/GridCells.mixin.js';
import { GridInputMixin } from '../suspectsBoard/GridInput.mixin.js';
import { GridLogicMixin } from '../suspectsBoard/GridLogic.mixin.js';

export class SuspectGridScene extends BaseScene {
  constructor() {
    super('SuspectGridScene');

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CrimeCityScene';
    this.returnData = {};

    this.labManager = null;
    this.suspects = [];
    this.rows = [];

    this.clueCards = [];
    this.revealedFields = new Set();
    this.selectedClueId = null;

    this.placedCluesByCell = {};
    this.markedUnlikelyBySuspectId = {};

    this.uiRoot = null;
    this.modalRoot = null;
    this.maskGraphics = [];
    this.feedbackText = null;
    this.feedbackMessage = '';

    this.regions = {
      body: null,
      scene: null,
      header: null,
      names: null,
      clueList: null
    };

    this.bodyContainer = null;
    this.headerContainer = null;
    this.sceneContainer = null;
    this.nameContainer = null;
    this.clueListContainer = null;
    this.layout = null;
    this.gridOrigin = null;

    this.scrollX = 0;
    this.scrollY = 0;
    this.minScrollX = 0;
    this.minScrollY = 0;
    this.clueScrollY = 0;
    this.minClueScroll = 0;

    this.dragTarget = null;
    this.dragMoved = false;
    this.dragStart = { x: 0, y: 0, sx: 0, sy: 0, cy: 0 };

    this.modalOpen = false;
    this.resizeHandler = null;
  }

  getCaseSuspects() {
    const suspects =
      Array.isArray(this.gameState.caseSuspects) &&
      this.gameState.caseSuspects.length
        ? this.gameState.caseSuspects
        : Array.isArray(this.gameState.suspects) &&
            this.gameState.suspects.length
          ? this.gameState.suspects
          : Array.isArray(this.gameState.suspectList)
            ? this.gameState.suspectList
            : [];

    this.gameState.caseSuspects = suspects;
    this.gameState.suspects = suspects;
    this.gameState.suspectList = suspects;

    return suspects;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;

    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.crimeCityId ||
      'unknown_city';

    this.returnScene =
      typeof data.returnScene === 'string' && data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CrimeCityScene';

    this.returnData = {
      ...(data.returnData || {}),
      cityId: this.cityId,
      openPanel: data.returnData?.openPanel || 'alibi'
    };

    this.labManager = new CrimeLabManager(this.gameState, this.cityId);

    const allSuspects = this.getCaseSuspects();

    const requestedSuspectIds =
      data.suspectIds ||
      this.gameState.suspectGridInput?.suspectIds ||
      this.gameState.currentMission?.suspectIds ||
      allSuspects.map((suspect) => suspect.id);

    const validSuspectIds = new Set(
      Array.isArray(requestedSuspectIds) ? requestedSuspectIds : []
    );

    this.suspects = allSuspects.filter(
      (suspect) => suspect?.id && validSuspectIds.has(suspect.id)
    );

    const caseForensics = this.labManager.ensureCaseForensics();

    caseForensics.suspectGrid ??= {};
    caseForensics.suspectGrid.placedCluesByCell ??= {};

    this.placedCluesByCell = {
      ...caseForensics.suspectGrid.placedCluesByCell
    };

    this.markedUnlikelyBySuspectId = getGridMarkState(
      caseForensics.suspectGrid
    );

    this.clueCards = this.buildClueCards(caseForensics, data);
    this.rows = this.buildRows();
    this.selectedClueId = null;
    this.scrollX = 0;
    this.scrollY = 0;
    this.clueScrollY = 0;
    this.feedbackMessage = '';
    this.modalOpen = false;
  }

  hideOverlayHuds() {
    const keys = this.scene.manager.keys;
    const newsHud = keys.NewsHud;

    if (newsHud?.events) {
      newsHud.events.emit('setNewspaperVisible', false);
      newsHud.events.emit('setTvVisible', false);
    }

    if (keys.PlayerHudScene) {
      this.scene.sleep('PlayerHudScene');
    }
  }

  create() {
    super.create();

    this.hideOverlayHuds();
    this.time.delayedCall(150, () => this.hideOverlayHuds());

    this.cameras.main.setBackgroundColor('#110d0e');

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('wheel', this.handleWheel, this);

    this.buildUI();

    this.resizeHandler = () => {
      if (this.sys.isActive()) {
        this.buildUI();
      }
    };

    this.scale.on('resize', this.resizeHandler, this);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  refreshAll() {
    this.buildUI();
  }

  rebuildScene() {
    this.buildUI();
  }

  cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler, this);
    }

    this.input.off('pointerdown', this.handlePointerDown, this);
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerup', this.handlePointerUp, this);
    this.input.off('wheel', this.handleWheel, this);

    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanupScene, this);

    this.resizeHandler = null;
    this.dragTarget = null;
    this.modalOpen = false;

    this.clearUI();
  }
}

Object.assign(
  SuspectGridScene.prototype,
  GridDataMixin,
  GridDrawMixin,
  GridCellsMixin,
  GridInputMixin,
  GridLogicMixin
);