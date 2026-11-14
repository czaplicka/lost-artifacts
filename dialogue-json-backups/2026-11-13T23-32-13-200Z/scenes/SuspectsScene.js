import { gameState } from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import { BaseScene } from './BaseScene.js';

import {
  CrimeCityTutorial,
  advanceCrimeTutorial
} from '../tutorials/CrimeCityTutorial.js';

import {
  SuspectBoardUIMixin
} from '../suspectsBoard/SuspectBoardUI.mixin.js';

import {
  SuspectExclusionMixin
} from '../suspectsBoard/SuspectExclusion.mixin.js';

import {
  SuspectBoardDataMixin
} from '../suspectsBoard/SuspectBoardData.mixin.js';

import {
  SuspectCardsMixin
} from '../suspectsBoard/SuspectCards.mixin.js';

import {
  SuspectDetailsMixin
} from '../suspectsBoard/SuspectDetails.mixin.js';

import {
  ensurePersonnelRoster,
  PersonnelRosterView,
  PersonnelNoticeView
} from '../suspects/PersonnelRosterFlow.js';

export class SuspectsScene extends BaseScene {
  constructor() {
    super('SuspectsScene');

    this.gameState = gameState;

    this.cityId = null;
    this.returnScene = 'CityScene';
    this.returnData = {};

    this.selectedSuspectId = null;
    this.filterMode = 'all';
    this.currentPage = 0;

    this.excludeMode = false;
    this.exclusionFinished = false;

    this.filterButtons = [];

    this.personnelView = null;
    this.personnelNotice = null;

    this.crimeTutorial = null;
    this.resizeHandler = null;

    for (const key of [
      'exclusionButton',
      'continueButton',
      'modeHintText',
      'headerText',
      'summaryText',
      'cardsContainer',
      'detailsContainer',
      'emptyText',
      'pageText',
      'previousPageButton',
      'nextPageButton',
      'closeButton'
    ]) {
      this[key] = null;
    }
  }

  ensureCaseSuspects() {
    const a = this.gameState.caseSuspects;
    const b = this.gameState.suspects;
    const c = this.gameState.suspectList;

    const suspects =
      Array.isArray(a) && a.length
        ? a
        : Array.isArray(b) && b.length
          ? b
          : Array.isArray(c) && c.length
            ? c
            : [];

    this.gameState.caseSuspects = suspects;
    this.gameState.suspects = suspects;
    this.gameState.suspectList = suspects;

    return suspects;
  }

  ensureSuspectStateShape(suspects = []) {
    suspects.forEach(suspect => {
      if (!suspect || typeof suspect !== 'object') {
        return;
      }

      suspect.deductionState ??= {};

      suspect.deductionState.eliminated =
        suspect.deductionState.eliminated === true;

      suspect.deductionState.eliminationReasons =
        Array.isArray(
          suspect.deductionState.eliminationReasons
        )
          ? suspect.deductionState.eliminationReasons
          : [];

      suspect.deductionState.notesUnlocked =
        Array.isArray(
          suspect.deductionState.notesUnlocked
        )
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

  ensureExclusionState() {
    this.gameState.suspectExclusionState ??= {};

    const key = this.getCaseKey();

    this.gameState.suspectExclusionState[key] ??= {
      finished: false,
      manualExclusionIds: []
    };

    const state =
      this.gameState.suspectExclusionState[key];

    state.finished = state.finished === true;

    state.manualExclusionIds =
      Array.isArray(state.manualExclusionIds)
        ? state.manualExclusionIds
        : [];

    return state;
  }

  init(data = {}) {
    this.destroyCrimeTutorial();

    this.personnelView?.destroy();
    this.personnelView = null;

    this.personnelNotice?.destroy();
    this.personnelNotice = null;

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
        suspect => !suspect?.deductionState?.eliminated
      )?.id ||
      suspects[0]?.id ||
      null;

    this.gameState.selectedSuspectId =
      this.selectedSuspectId;

    this.filterMode = 'all';
    this.currentPage = 0;

    this.exclusionFinished =
      this.ensureExclusionState().finished;

    this.excludeMode = false;
  }

  create() {
    super.create();

    const newsHud =
      this.scene.manager.keys.NewsHud;

    if (newsHud?.events) {
      newsHud.events.emit(
        'setNewspaperVisible',
        false
      );

      newsHud.events.emit(
        'setTvVisible',
        false
      );
    }

    if (
      this.scene.manager.keys.PlayerHudScene
    ) {
      this.scene.sleep('PlayerHudScene');
    }

    this.cameras.main.setBackgroundColor(
      '#16110d'
    );

    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    try {
      const roster = ensurePersonnelRoster(
        this.gameState,
        this.ensureCaseSuspects()
      );

      if (roster && !roster.completed) {
        this.personnelView =
          new PersonnelRosterView(
            this,
            roster,
            () => {
              this.personnelView = null;

              // No evaluation and no automatic grid opening.
              this.closeScene();
            },
            () => this.closeScene()
          );

        return;
      }

      if (
        roster?.completed &&
        !roster.gridReviewed
      ) {
        // Do not reveal the canonical ten before grid review.
        this.personnelNotice =
          new PersonnelNoticeView(this, {
            title: 'SHORTLIST FILED',

            paragraphs: [
              'Your shortlist has been filed with the case.',
              'Continue the investigation. Your evidence grid will be available through the usual case controls.'
            ],

            buttonLabel: 'Back to investigation',

            onContinue: () => {
              this.personnelNotice = null;
              this.closeScene();
            }
          });

        return;
      }
    } catch (error) {
      console.error(
        '[SuspectsScene] Personnel review unavailable:',
        error
      );

      this.personnelNotice =
        new PersonnelNoticeView(this, {
          title: 'PERSONNEL FILE ERROR',

          paragraphs: [
            'Personnel files could not be prepared.',
            error.message
          ],

          buttonLabel: 'Back',

          onContinue: () => {
            this.personnelNotice = null;
            this.closeScene();
          }
        });

      return;
    }

    this.createStandardBoard();
  }

  createStandardBoard() {
    this.createBackground();
    this.createHeader();
    this.createFilters();
    this.createContentContainers();
    this.createNavigation();
    this.createExclusionControls();

    this.refreshBoard();
    this.startCrimeTutorial();

    this.resizeHandler = () => {
      if (this.sys.isActive()) {
        this.rebuildScene();
      }
    };

    this.scale.on(
      'resize',
      this.resizeHandler,
      this
    );
  }

  startCrimeTutorial() {
    this.destroyCrimeTutorial();

    const saved =
      this.gameState.onboarding?.crimeCity;

    if (
      !saved ||
      saved.completed ||
      saved.step !== 'suspects'
    ) {
      return;
    }

    this.crimeTutorial =
      new CrimeCityTutorial(
        this,
        this.gameState
      );

    this.registerEvidenceGridTutorialHotspot();
    this.crimeTutorial.start();
  }

  destroyCrimeTutorial() {
    if (!this.crimeTutorial) {
      return;
    }

    try {
      this.crimeTutorial.destroy();
    } catch (error) {
      console.warn(
        '[SuspectsScene] Tutorial cleanup failed:',
        error
      );
    }

    this.crimeTutorial = null;
  }

  completeCrimeTutorialIfFinished() {
    const saved =
      this.gameState.onboarding?.crimeCity;

    if (
      !saved ||
      saved.completed ||
      saved.step !== 'suspects'
    ) {
      return;
    }

    if (
      !(
        this.exclusionFinished ||
        this.ensureExclusionState().finished
      )
    ) {
      return;
    }

    advanceCrimeTutorial(
      this.gameState,
      'suspects'
    );

    saveGameState();
  }

  getCaseKey() {
    const mission =
      this.gameState.currentMission || {};

    return String(
      mission.id ||
      mission.caseId ||
      `${this.cityId}_${mission.artifact || 'default'}`
    );
  }

  closeScene() {
    this.completeCrimeTutorialIfFinished();

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
    this.personnelView?.destroy();
    this.personnelView = null;

    this.personnelNotice?.destroy();
    this.personnelNotice = null;

    this.completeCrimeTutorialIfFinished();
    this.destroyCrimeTutorial();

    if (this.resizeHandler) {
      this.scale.off(
        'resize',
        this.resizeHandler,
        this
      );
    }

    this.resizeHandler = null;

    this.events.off(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanupScene,
      this
    );

    this.filterButtons.forEach(button => {
      button?.removeAllListeners?.();
      button?.destroy?.();
    });

    this.filterButtons = [];

    for (const key of [
      'previousPageButton',
      'nextPageButton',
      'closeButton',
      'exclusionButton',
      'continueButton'
    ]) {
      this[key]?.removeAllListeners?.();
      this[key]?.destroy?.();
      this[key] = null;
    }

    this.modeHintText?.destroy();
    this.modeHintText = null;

    this.cardsContainer?.destroy();
    this.cardsContainer = null;

    this.detailsContainer?.destroy();
    this.detailsContainer = null;

    for (const key of [
      'headerText',
      'summaryText',
      'emptyText',
      'pageText'
    ]) {
      this[key] = null;
    }
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