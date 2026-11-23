import {
  gameState
} from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import {
  HypothesisScene as HypothesisBase
} from './HypothesisScene.js';

import {
  bindRoomReconstruction,
  caseRoomContext
} from '../systems/CaseRoomFlow.js';

export class HypothesisScene extends HypothesisBase {
  init(data = {}) {
    const cityId =
      data.cityId ||
      gameState.crimeCityId ||
      gameState.currentCityId ||
      gameState.currentMission?.city;

    const context = bindRoomReconstruction(
      cityId,
      data.caseKey
    );

    this.roomCaseKey = context.caseKey;

    super.init({
      ...data,

      cityId,

      sourceScene: 'CaseRoomScene',
      returnScene: 'CaseRoomScene',

      returnData: {
        cityId,
        caseKey: context.caseKey
      }
    });
  }

  create() {
    super.create();

    if (
      caseRoomContext(
        this.cityId,
        this.roomCaseKey
      ).completed
    ) {
      this._finalized = true;

      void this.returnToSourceScene();
    }
  }

  confirmTheory() {
    const context = caseRoomContext(
      this.cityId,
      this.roomCaseKey
    );

    if (
      !context.ready ||
      context.completed
    ) {
      return false;
    }

    return super.confirmTheory();
  }

  finalizeTheory(...args) {
    const result = super.finalizeTheory(
      ...args
    );

    const context = caseRoomContext(
      this.cityId,
      this.roomCaseKey
    );

    if (
      this._finalized &&
      !this._commitFailed &&
      context.ready
    ) {
      gameState.reconstructedHeists = {
        ...gameState.reconstructedHeists,

        [this.roomCaseKey]:
          gameState.reconstructedHeist
      };

      saveGameState();
    }

    return result;
  }

  async launchResultCommentScene() {
    if (!this._finalized) {
      return false;
    }

    // Zamiast rozmowy z HQ wracamy do pokoju.
    // Pokój sam pokaże zapisany wynik.
    return this.returnToSourceScene();
  }
}