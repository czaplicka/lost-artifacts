import { gameState } from '../GameData.js';
import { saveGameState } from '../gameStatePersistence.js';
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

  /**
   * Przenosi starsze aliasy listy podejrzanych na jedno źródło prawdy.
   *
   * Nie tworzymy tu nowych kopii — karta, szczegóły i UI wykluczeń mają
   * modyfikować te same obiekty w gameState.caseSuspects.
   */
  ensureCaseSuspects() {
    const caseSuspects = Array.isArray(this.gameState.caseSuspects)
      ? this.gameState.caseSuspects
      : null;

    const legacySuspects = Array.isArray(this.gameState.suspects)
      ? this.gameState.suspects
      : null;

    const legacySuspectList = Array.isArray(this.gameState.suspectList)
      ? this.gameState.suspectList
      : null;

    const suspects =
      caseSuspects?.length
        ? caseSuspects
        : legacySuspects?.length
          ? legacySuspects
          : legacySuspectList?.length
            ? legacySuspectList
            : [];

    this.gameState.caseSuspects = suspects;
    this.gameState.suspects = suspects;
    this.gameState.suspectList = suspects;

    return suspects;
  }

  /**
   * Zapewnia bezpieczny, kompletny stan każdego podejrzanego.
   *
   * To NIE resetuje eliminated.
   * Jeśli gracz wykluczył osobę wcześniej, stan zostaje zachowany.
   */
  ensureSuspectStateShape(suspects = []) {
    suspects.forEach((suspect) => {
      if (!suspect || typeof suspect !== 'object') {
        return;
      }

      suspect.deductionState ??= {};

      suspect.deductionState.eliminated =
        suspect.deductionState.eliminated === true;

      suspect.deductionState.eliminationReasons =
        Array.isArray(suspect.deductionState.eliminationReasons)
          ? suspect.deductionState.eliminationReasons
          : [];

      suspect.deductionState.notesUnlocked =
        Array.isArray(suspect.deductionState.notesUnlocked)
          ? suspect.deductionState.notesUnlocked
          : [];

      suspect.deductionState.labStatus ??= 'pending';
      suspect.deductionState.hypothesisStatus ??= 'pending';
      suspect.deductionState.interviewStatus ??= 'pending';
      suspect.deductionState.alibiStatus ??= 'pending';

      suspect.publicProfile ??= {};
      suspect.restrictedProfile ??= {};
      suspect.restrictedProfile.unlockedFields ??= [];
    });

    return suspects;
  }

  /**
   * Stan interfejsu ręcznego wykluczania.
   *
   * Jest niezależny od deductionState.eliminated:
   * - finished: gracz zakończył etap pracy z aktami;
   * - manualExclusionIds: lista decyzji dokonanych ręcznie przez gracza.
   */
  ensureExclusionState() {
    this.gameState.suspectExclusionState ??= {};

    const caseKey = this.getCaseKey();

    this.gameState.suspectExclusionState[caseKey] ??= {
      finished: false,
      manualExclusionIds: []
    };

    const state = this.gameState.suspectExclusionState[caseKey];

    state.finished = state.finished === true;

    state.manualExclusionIds = Array.isArray(state.manualExclusionIds)
      ? state.manualExclusionIds
      : [];

    return state;
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
      typeof data.returnScene === 'string' &&
      data.returnScene.trim()
        ? data.returnScene.trim()
        : 'CityScene';

    this.returnData = {
      cityId: this.cityId,
      ...(data.returnData || {})
    };

    const suspects = this.ensureCaseSuspects();

    this.ensureSuspectStateShape(suspects);

    this.selectedSuspectId =
      data.selectedSuspectId ||
      this.gameState.selectedSuspectId ||
      suspects.find(
        (suspect) => !suspect?.deductionState?.eliminated
      )?.id ||
      suspects[0]?.id ||
      null;

    this.gameState.selectedSuspectId = this.selectedSuspectId;

    this.filterMode = 'all';
    this.currentPage = 0;

    const exclusionState = this.ensureExclusionState();

    this.exclusionFinished = exclusionState.finished;
    this.excludeMode = false;
  }

  create() {
    super.create();

    const newsHud = this.scene.manager.keys.NewsHud;

    if (newsHud?.events) {
      newsHud.events.emit('setNewspaperVisible', false);
      newsHud.events.emit('setTvVisible', false);
    }

    if (this.scene.manager.keys.PlayerHudScene) {
      this.scene.sleep('PlayerHudScene');
    }

    this.cameras.main.setBackgroundColor('#16110d');

    this.createBackground();
    this.createHeader();
    this.createFilters();
    this.createContentContainers();
    this.createNavigation();
    this.createExclusionControls();

    this.refreshBoard();

    this.resizeHandler = () => {
      if (!this.sys.isActive()) {
        return;
      }

      this.rebuildScene();
    };

    this.scale.on('resize', this.resizeHandler, this);

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
      this.goto(this.returnScene, {
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
      this.scale.off('resize', this.resizeHandler, this);
    }

    this.resizeHandler = null;

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    this.filterButtons.forEach((button) => {
      button?.removeAllListeners?.();
      button?.destroy?.();
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

    this.previousPageButton = null;
    this.nextPageButton = null;
    this.closeButton = null;
    this.exclusionButton = null;
    this.continueButton = null;

    this.modeHintText?.destroy();
    this.modeHintText = null;

    this.cardsContainer?.destroy();
    this.cardsContainer = null;

    this.detailsContainer?.destroy();
    this.detailsContainer = null;

    this.headerText = null;
    this.summaryText = null;
    this.emptyText = null;
    this.pageText = null;
  }
}

Object.assign(
  SuspectsScene.prototype,
  SuspectBoardUIMixin
);

Object.assign(
  SuspectsScene.prototype,
  SuspectExclusionMixin
);

Object.assign(
  SuspectsScene.prototype,
  SuspectBoardDataMixin
);

Object.assign(
  SuspectsScene.prototype,
  SuspectCardsMixin
);

Object.assign(
  SuspectsScene.prototype,
  SuspectDetailsMixin
);