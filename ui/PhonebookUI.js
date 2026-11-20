// ui/PhonebookUI.js

import {
  PhonebookUI as PhonebookBaseUI
} from './PhonebookBaseUI.js';

import { gameState } from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import { EventBus } from '../EventBus.js';

import {
  advanceCrimeTutorial
} from '../tutorials/CrimeCityTutorial.js';

export class PhonebookUI extends PhonebookBaseUI {
  finishCall(contact) {
    if (
      contact?.key !== 'csi' ||
      !this.isCalling ||
      this._callPhase !== 'connected' ||
      !this.canAccessPhone()
    ) {
      return super.finishCall(contact);
    }

    const city = this.scene;

    if (city.sys.settings.key !== 'CrimeCityScene') {
      return super.finishCall(contact);
    }

    const caseKey = city.getCaseKey();

    if (caseKey == null || caseKey === '') {
      return super.finishCall(contact);
    }

    const key = String(caseKey);

    const reconstruction =
      gameState.reconstructedHeists?.[key];

    const gridState =
      gameState.suspectExclusionState?.[key];

    const hypothesisFinished = Boolean(
      reconstruction?.playerTheoryResult
    );

    const gridInProgress =
      city.scene.isActive('SuspectGridScene') ||
      city.scene.isPaused('SuspectGridScene') ||
      city.scene.isSleeping('SuspectGridScene');

    const hypothesisInProgress =
      city.scene.isActive('HypothesisScene') ||
      city.scene.isPaused('HypothesisScene') ||
      city.scene.isSleeping('HypothesisScene');

    if (
      !city.isCrimeLabCompleted() ||
      hypothesisFinished ||
      hypothesisInProgress ||
      city.isGridCompleted() ||
      gridState?.finished === true ||
      gridInProgress ||
      city.hasVisitedApartment() ||
      city.isTransitioning
    ) {
      return super.finishCall(contact);
    }

    // Sam zapis odebrania rozmowy nie oznacza ukończenia
    // hipotezy. Telefon pozwala ponowić wejście do tej sceny.
    this.close();
    city.closeAllUIPanels();

    if (city.scene.isActive('PhoneCallScene')) {
      city.scene.stop('PhoneCallScene');
    }

    if (
      !gameState.suspectFilesPhoneDecisions ||
      typeof gameState.suspectFilesPhoneDecisions !== 'object' ||
      Array.isArray(gameState.suspectFilesPhoneDecisions)
    ) {
      gameState.suspectFilesPhoneDecisions = {};
    }

    gameState.suspectFilesPhoneDecisions[key] = 'answer';

    advanceCrimeTutorial(gameState, 'phone_lab');

    EventBus.emit('crimeCityTutorialStep', {
      step: 'phone_lab'
    });

    saveGameState();

    return city.transitionTo('HypothesisScene', {
      cityId: city.cityId,
      caseKey,

      sourceScene: 'CrimeCityScene',
      returnScene: 'CrimeCityScene',

      returnData: {
        cityId: city.cityId,
        showSuspectTutorial: true
      }
    });
  }
}