import {
  FailedAlibiArrestOverlayScene
} from './FailedAlibiArrestOverlayScene.js';

import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';

const SCENE_KEY =
  'EmptyApartmentArrestOverlayScene';

export class EmptyApartmentArrestOverlayScene
  extends FailedAlibiArrestOverlayScene {

  constructor() {
    super();

    this.sys.settings.key = SCENE_KEY;
  }

  init(data = {}) {
    super.init(data);

    this.completed = false;
    this.apartmentRestored = false;
  }

  create() {
    super.create();

    this.events.once('shutdown', () => {
      this.restoreApartment();
    });
  }

  createLabels() {
    super.createLabels();

    this.retryButton.setText(
      'RETRY OPENING APARTMENT'
    );
  }

  startReturn() {
    if (
      this._cleanupDone ||
      this.finished
    ) {
      return;
    }

    super.startReturn();

    this.statusText.setText(
      'SUSPECT HAS ALREADY ESCAPED'
    );

    this.caption.setText(
      'Right address. Missing thief. ' +
      'The furniture refuses to testify.'
    );
  }

  async finishToGameOver() {
    if (
      this.finishing ||
      this.finished ||
      this._cleanupDone
    ) {
      return;
    }

    this.finishing = true;
    this.retryButton.setVisible(false);

    try {
      const apartment = this.getRegisteredScene(
        this.parentSceneKey
      );

      if (
        !apartment ||
        apartment._cleanupDone ||
        apartment.suspectId !== this.suspectId ||
        apartment.caseKey !== this.caseId
      ) {
        throw new Error(
          'The apartment no longer matches this operation.'
        );
      }

      apartment.updateProgress({
        arrestVisit: {
          caseKey: this.caseId,
          suspectId: this.suspectId,
          outcome: 'suspect_escaped',
          completed: true
        }
      });

      requestAutosave();
      flushAutosave();

      this.completed = true;
      this.finished = true;

      this.scene.stop();
    } catch (error) {
      console.error(
        '[EmptyApartmentArrest] Could not finish operation:',
        error
      );

      if (this._cleanupDone) return;

      this.finishing = false;

      this.caption.setText(
        'The apartment search could not be opened. ' +
        'Please try again.'
      );

      this.retryButton.setVisible(true);
    }
  }

  restoreApartment() {
    if (this.apartmentRestored) return;

    this.apartmentRestored = true;

    this.restoreOperationHud();

    const apartment = this.getRegisteredScene(
      this.parentSceneKey
    );

    if (
      !apartment ||
      apartment._cleanupDone ||
      apartment.suspectId !== this.suspectId ||
      apartment.caseKey !== this.caseId
    ) {
      return;
    }

    if (
      this.scene.isPaused(this.parentSceneKey)
    ) {
      this.scene.resume(this.parentSceneKey);
    }

    apartment._arrestIntroOpening = false;

    if (this.completed) {
      apartment.showMessage(
        'The suspect has already escaped.\n' +
        'Search the apartment for clues ' +
        'to their next destination.',
        4500,
        '#795548'
      );
    }

    void apartment.setupSharedHud();
  }
}

export async function launchEmptyApartmentArrest(
  scene
) {
  if (
    !scene ||
    scene._cleanupDone ||
    !scene.sys.isActive() ||
    scene._arrestIntroOpening
  ) {
    return false;
  }

  const visit = scene.getProgress().arrestVisit;

  if (
    visit?.completed === true &&
    visit.caseKey === scene.caseKey &&
    visit.suspectId === scene.suspectId
  ) {
    return false;
  }

  if (scene.isSceneRunning(SCENE_KEY)) {
    scene.scene.bringToTop(SCENE_KEY);
    return true;
  }

  scene._arrestIntroOpening = true;

  try {
    scene.getPlayerHudScene()?.closeAllUIPanels?.();

    if (!scene.hasScene(SCENE_KEY)) {
      scene.scene.add(
        SCENE_KEY,
        EmptyApartmentArrestOverlayScene,
        false
      );
    }

    // ApartmentOccupantController.mount() already calls
    // this function, including apartments with no occupant.
    scene.scene.launch(
      SCENE_KEY,
      {
        parentSceneKey: scene.sys.settings.key,
        suspectId: scene.suspectId,
        caseId: scene.caseKey
      }
    );

    return true;
  } catch (error) {
    scene._arrestIntroOpening = false;

    console.error(
      '[EmptyApartmentArrest] Could not launch operation:',
      error
    );

    if (
      !scene._cleanupDone &&
      scene.sys.isActive()
    ) {
      scene.showMessage(
        'The arrest operation could not be opened.\n' +
        'Check the console for details.',
        4000,
        '#8b3030'
      );
    }

    return false;
  }
}