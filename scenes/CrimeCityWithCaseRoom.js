import {
  CrimeCityScene as CrimeCityBase
} from './CrimeCitySceneWithAnimations.js';

import {
  caseRoomContext
} from '../systems/CaseRoomFlow.js';

const CASE_ROOM_NODE = 'case_room';

export class CrimeCityScene extends CrimeCityBase {
  init(data = {}) {
    super.init({
      ...data,
      showLabCompletionPhoneCall: false
    });

    const controller = this.tutorialController;

    controller.phoneCallTimer?.remove(false);

    controller.phoneCallTimer = null;
    controller.phoneCallPending = false;
    controller.showLabCompletionPhoneCall = false;

    controller.preparePhoneScene = () =>
      Promise.resolve(false);

    controller.canOfferLabPhone = () => false;

    controller.scheduleLabCompletionPhoneCall = () => {};

    controller.launchPreparedPhone = async () => false;

    this.roomOpening = false;

    this.installCaseRoomMap();
  }

  installCaseRoomMap() {
    const map = this.mapUI;

    const context = () => caseRoomContext(
      this.cityId,
      this.getCaseKey()
    );

    // Dostęp do akt wynika z zakończenia rekonstrukcji,
    // nie z odebrania lub zignorowania starego telefonu.
    map.areSuspectFilesUnlocked = () =>
      context().completed;

    // Case Room jest darmowy: własny węzeł kosztów z zerowym kosztem.
    if (!map.caseRoomCostsInstalled) {
      map.caseRoomCostsInstalled = true;

      const getDisplayCost = map.getDisplayCost;
      const getLocationCostLabel = map.getLocationCostLabel;

      map.getDisplayCost = function(nodeId, ...args) {
        if (nodeId === CASE_ROOM_NODE) {
          return { energy: 0, money: 0 };
        }

        return getDisplayCost.call(this, nodeId, ...args);
      };

      map.getLocationCostLabel = function(title, nodeId, ...args) {
        if (nodeId === CASE_ROOM_NODE) {
          return `${title}\nFREE`;
        }

        return getLocationCostLabel.call(
          this,
          title,
          nodeId,
          ...args
        );
      };
    }

    const locations =
      map.createAvailableLocations.bind(map);

    map.createAvailableLocations = (...args) => {
      const result = locations(...args);

      const position =
        this.crimeCityConfig?.crimeLab;

      if (
        !position ||
        !context().ready ||
        map.isApartmentStageAvailable()
      ) {
        return result;
      }

      const entry = map.createMapIcon({
        ...position,

        textureKey: 'crime_lab',
        label: 'Case Room',
        costNodeId: CASE_ROOM_NODE,

        fallbackColor: 0x496461,
        fallbackStroke: 0xd4af37,

        onClick: () => {
          void this.openCaseRoom();
        }
      });

      map.tutorialTargets.set(
        'case-room',
        entry.icon
      );

      map.syncTutorialTargets();

      return result;
    };
  }

  createCrimeCityHeader() {
    super.createCrimeCityHeader();

    if (
      !this.isCrimeLabCompleted() ||
      this.mapUI.isApartmentStageAvailable()
    ) {
      return;
    }

    const context = caseRoomContext(
      this.cityId,
      this.getCaseKey()
    );

    const message = context.completed
      ? 'Reconstruction filed. Review the suspect files.'
      : 'CSI complete. Visit the Case Room to reconstruct the theft.';

    const hint = this.add.text(
      40,
      58,
      message,
      {
        fontFamily: 'SpecialElite',
        fontSize: '16px',
        color: '#f1e6b8',
        backgroundColor: '#000000aa',

        wordWrap: {
          width: Math.max(
            80,
            this.scale.width - 80
          )
        }
      }
    ).setDepth(21);

    this.mapUI.track(
      hint,
      this.mapUI.headerObjects
    );
  }

  async openCaseRoom() {
    if (
      this.roomOpening ||
      this.isTransitioning ||
      this._cleanupDone ||
      !this.sys.isActive()
    ) {
      return false;
    }

    const context = caseRoomContext(
      this.cityId,
      this.getCaseKey()
    );

    if (!context.ready) return false;

    this.roomOpening = true;

    const token = this._runToken;

    try {
      await this.game.sceneLoader.ensure(
        'CaseRoomScene'
      );

      if (!this.isCurrentRun(token)) {
        return false;
      }

      // Case Room jest darmowy: bez opłaty za podróż i bez
      // zmiany węzła podróży.
      if (
        !caseRoomContext(
          this.cityId,
          context.caseKey
        ).ready
      ) {
        return false;
      }

      this.closeAllUIPanels();

      return await this.goto(
        'CaseRoomScene',
        {
          cityId: this.cityId,
          caseKey: context.caseKey
        }
      );
    } catch (error) {
      console.error('[CaseRoom]', error);

      if (this.isCurrentRun(token)) {
        this.showMessage(
          'The Case Room could not be opened. Please try again.',
          3500,
          'Case Room'
        );
      }

      return false;
    } finally {
      if (this._runToken === token) {
        this.roomOpening = false;
      }
    }
  }

  startCrimeTutorial(...args) {
    const result = super.startCrimeTutorial(
      ...args
    );

    this.updateCaseRoomTutorial();

    return result;
  }

  syncCrimeTutorial(...args) {
    const result = super.syncCrimeTutorial(
      ...args
    );

    this.updateCaseRoomTutorial();

    return result;
  }

  updateCaseRoomTutorial() {
    const tutorial = this.crimeTutorial;

    if (!tutorial || tutorial.destroyed) {
      return;
    }

    for (
      const step of ['phone_lab', 'hypothesis']
    ) {
      if (!tutorial.stepContent?.[step]) {
        continue;
      }

      tutorial.stepContent[step] = {
        ...tutorial.stepContent[step],

        title: 'THE CASE ROOM',

        objective:
          'Visit the Case Room beside CSI ' +
          'and click the corkboard.',

        hint:
          'The analyses tell you what was found. ' +
          'The reconstruction asks what happened.',

        targetHotspot: 'case-room'
      };
    }

    const step = tutorial.getStep?.();

    if (
      tutorial.isActive?.() &&
      ['phone_lab', 'hypothesis'].includes(step)
    ) {
      tutorial.updateOverlay(
        tutorial.stepContent[step]
      );

      tutorial.highlightHotspot(
        'case-room'
      );
    }
  }
}