import {
  BaseScene
} from './BaseScene.js';

import {
  gameState
} from '../GameData.js';

export class PhoneCallScene extends BaseScene {
  constructor() {
    super({
      key: 'PhoneCallScene'
    });
  }

  init(data = {}) {
    this.roomData = {
      cityId:
        data.cityId ||
        gameState.crimeCityId ||
        gameState.currentCityId ||
        gameState.currentMission?.city,

      caseKey: data.caseKey
    };
  }

  create() {
    super.create();

    void this.openRoom();
  }

  async openRoom() {
    try {
      const opened = await this.goto(
        'CaseRoomScene',
        this.roomData
      );

      if (
        !opened &&
        !this._cleanupDone &&
        this.sys.isActive()
      ) {
        this.scene.stop();
      }
    } catch (error) {
      console.error(
        '[CaseRoom redirect]',
        error
      );

      if (
        !this._cleanupDone &&
        this.sys.isActive()
      ) {
        this.scene.stop();
      }
    }
  }
}