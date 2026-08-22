import { gameState } from '../GameData.js';
import { saveGameState } from '../GameStatePersistence.js';
import { BaseScene } from './BaseScene.js';
import {
  getPublicSuspectList,
  getSuspectCaseSummary
} from '../ui/suspectUtils.js';

import { SuspectBoardUIMixin } from '../suspectsBoard/SuspectBoardUI.mixin.js';
import { SuspectExclusionMixin } from '../suspectsBoard/SuspectExclusion.mixin.js';
import { SuspectBoardDataMixin } from '../suspectsBoard/SuspectBoardData.mixin.js';
import { SuspectCardsMixin } from '../suspectsBoard/SuspectCards.mixin.js';
import { SuspectDetailsMixin } from '../suspectsBoard/SuspectDetails.mixin.js';
export class SuspectsScene extends BaseScene {
  constructor() {
    super('SuspectBoardScene');

    this.gameState = gameState;
    this.cityId = null;
    this.returnScene = 'CityScene';
    this.returnData = {};

    this.selectedSuspectId = null;
    this.filterMode = 'all';
    this.currentPage = 0;

    this.excludeMode = false;
    this.exclusionFinished = false;
    this.exclusionButton = null;
    this.continueButton = null;
    this.modeHintText = null;

    this.headerText = null;
    this.summaryText = null;
    this.filterButtons = [];
    this.cardsContainer = null;
    this.detailsContainer = null;
    this.emptyText = null;
    this.pageText = null;
    this.previousPageButton = null;
    this.nextPageButton = null;
    this.closeButton = null;

    this.resizeHandler = null;
  }

  init(data = {}) {
    this.gameState = data.gameState || gameState;

    this.cityId =
      data.cityId ||
      this.gameState.currentMission?.city ||
      this.gameState.currentCityId ||
      this.gameState.crimeCityId ||
      'Unknown City';

    this.returnScene =
      typeof data.returnScene === 'string' && data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CityScene';

    this.returnData = {
      cityId: this.cityId,
      ...(data.returnData || {})
    };

    this.selectedSuspectId =
      data.selectedSuspectId ||
      this.gameState.selectedSuspectId ||
      null;

    this.filterMode = 'all';
    this.currentPage = 0;

    this.gameState.suspectExclusionState ??= {};
    this.gameState.suspectExclusionState[this.getCaseKey()] ??= {
      finished: false
    };

    this.exclusionFinished = Boolean(
      this.gameState.suspectExclusionState[this.getCaseKey()].finished
    );

    this.excludeMode = false;
  }

  create() {
    super.create();
    this.scene.get('NewsHud').events.emit('setNewspaperVisible', false);
    this.scene.get('NewsHud').events.emit('setTvVisible', false);
    this.scene.sleep('PlayerHudScene');

    this.cameras.main.setBackgroundColor('#16110d');

    this.createBackground();
    this.createHeader();
    this.createFilters();
    this.createContentContainers();
    this.createNavigation();
    this.createExclusionControls();

    this.refreshBoard();

    this.resizeHandler = () => {
      this.rebuildScene();
    };

    this.scale.on('resize', this.resizeHandler);

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );
  }

  getCaseKey() {
    const mission = this.gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.cityId}_${mission.artifact || 'default'}`
    );
  }

  closeScene() {
    saveGameState();

    if (
      this.returnScene &&
      this.returnScene !== this.scene.key &&
      this.scene.manager.keys[this.returnScene]
    ) {
      this.scene.start(this.returnScene, {
        ...this.returnData,
        cityId: this.cityId,
        suspectBoardClosed: true
      });

      return;
    }

    this.scene.stop();
  }

  cleanupScene() {
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
    }

    this.resizeHandler = null;

    this.filterButtons.forEach((button) => {
      button.removeAllListeners?.();
      button.destroy?.();
    });

    this.filterButtons = [];

    [
      this.previousPageButton,
      this.nextPageButton,
      this.closeButton,
      this.exclusionButton,
      this.continueButton
    ].forEach((button) => {
      button?.removeAllListeners?.();
      button?.destroy?.();
    });

    this.modeHintText?.destroy();
    this.cardsContainer?.destroy();
    this.detailsContainer?.destroy();
  }
}

Object.assign(SuspectsScene.prototype, SuspectBoardUIMixin);
Object.assign(SuspectsScene.prototype, SuspectExclusionMixin);
Object.assign(SuspectsScene.prototype, SuspectBoardDataMixin);
Object.assign(SuspectsScene.prototype, SuspectCardsMixin);
Object.assign(SuspectsScene.prototype, SuspectDetailsMixin);