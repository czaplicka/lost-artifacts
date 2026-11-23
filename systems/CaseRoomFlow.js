import { gameState } from '../GameData.js';

import {
  saveGameState
} from '../gameStatePersistence.js';

import {
  getMissionCaseKey
} from '../crimeCaseKey.js';

import {
  CrimeCityProgressService
} from '../scenes/crimeCity/CrimeCityProgressService.js';

import {
  advanceCrimeTutorial
} from '../tutorials/CrimeCityTutorial.js';

import { EventBus } from '../EventBus.js';

export function caseRoomContext(
  cityId,
  expectedKey = null
) {
  const caseKey = String(
    getMissionCaseKey(gameState, cityId)
  );

  const matching =
    expectedKey == null ||
    String(expectedKey) === caseKey;

  const progress = new CrimeCityProgressService({
    cityId
  });

  const ready = Boolean(
    cityId &&
    matching &&
    !gameState.caseFailed &&
    progress.isCrimeLabCompleted()
  );

  const reconstruction = matching
    ? gameState.reconstructedHeists?.[caseKey] || null
    : null;

  const result = reconstruction?.playerTheoryResult;

  return {
    cityId,
    caseKey,
    ready,
    reconstruction,

    completed:
      ready &&
      typeof result === 'string' &&
      result.length > 0,

    result
  };
}

export function enterCaseRoom(
  cityId,
  expectedKey
) {
  const context = caseRoomContext(
    cityId,
    expectedKey
  );

  if (!context.ready) return context;

  const tutorial = gameState.onboarding?.crimeCity;

  if (
    tutorial &&
    !tutorial.completed &&
    !tutorial.skipped
  ) {
    if (tutorial.step === 'crime_lab') {
      advanceCrimeTutorial(gameState, 'crime_lab');
    }

    // Zachowujemy stary identyfikator kroku dla zgodności
    // zapisów. W grze ten etap jest już wejściem do pokoju.
    if (tutorial.step === 'phone_lab') {
      advanceCrimeTutorial(gameState, 'phone_lab');

      EventBus.emit('crimeCityTutorialStep', {
        step: 'phone_lab'
      });
    }
  }

  saveGameState();

  return context;
}

export function bindRoomReconstruction(
  cityId,
  expectedKey
) {
  const context = caseRoomContext(
    cityId,
    expectedKey
  );

  if (!context.ready) {
    throw new Error(
      'Complete the three CSI analyses first.'
    );
  }

  const reconstruction = context.reconstruction;

  if (
    !reconstruction ||
    !Array.isArray(reconstruction.foundCardIds) ||
    reconstruction.foundCardIds.length !== 6
  ) {
    throw new Error(
      'The reconstruction is unavailable. ' +
      'Return to Crime City and try again.'
    );
  }

  gameState.reconstructedHeist = reconstruction;

  return context;
}

export function finishRoomReview(
  cityId,
  expectedKey
) {
  const context = caseRoomContext(
    cityId,
    expectedKey
  );

  if (!context.completed) return false;

  context.reconstruction.resultCommentSeen = true;

  saveGameState();

  return true;
}

export function roomAssessment(context) {
  const comments = {
    exact:
      'All three findings fit your reconstruction. ' +
      'A theory supported by evidence. ' +
      'What a refreshing change.',

    close:
      'Most of the reconstruction fits. ' +
      'Keep the uncertain parts separate from ' +
      'the established facts.',

    partial:
      'Some parts fit the evidence. ' +
      'Others are still assumptions. ' +
      'Do not turn an assumption into an alibi.',

    weak:
      'The reconstruction has been filed, but it is ' +
      'not reliable enough to treat as established fact. ' +
      'The evidence remains more trustworthy than the story.'
  };

  return (
    comments[context.result] || comments.weak
  ) +
    '\n\nThe suspect files are now available in Crime City.';
}