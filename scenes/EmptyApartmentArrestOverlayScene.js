import {
  FailedAlibiArrestOverlayScene
} from './FailedAlibiArrestOverlayScene.js';

const SCENE_KEY = 'EmptyApartmentArrestOverlayScene';

const HUD_KEYS = [
  'PlayerHudScene',
  'NewsHud',
  'UIScene'
];

export class EmptyApartmentArrestOverlayScene
  extends FailedAlibiArrestOverlayScene {

  constructor() {
    super();

    this.sys.settings.key = SCENE_KEY;
  }

  init(data = {}) {
    super.init(data);

    this.previousHudVisibility = data.hudVisibility || {};
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

    this.retryButton.setText('RETRY OPENING APARTMENT');
  }

  startReturn() {
    if (this._cleanupDone || this.finished) return;

    super.startReturn();

    this.caption.setText(
      'Right address. Missing thief. The furniture refuses to testify.'
    );
  }

  update(time, delta) {
    super.update(time, delta);

    for (const key of HUD_KEYS) {
      if (this.hasScene(key)) {
        this.scene.setVisible(false, key);
      }
    }

    this.scene.bringToTop();
  }

  // The inherited animation calls this method when the agents return.
  // This version continues the investigation instead of opening Game Over.
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
        'The search could not be opened. Please try again.'
      );

      this.retryButton.setVisible(true);
    }
  }

  restoreApartment() {
    if (this.apartmentRestored) return;

    this.apartmentRestored = true;

    for (
      const [key, visible]
      of Object.entries(this.previousHudVisibility)
    ) {
      if (this.hasScene(key)) {
        this.scene.setVisible(visible, key);
      }
    }

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

    if (this.scene.isPaused(this.parentSceneKey)) {
      this.scene.resume(this.parentSceneKey);
    }

    if (this.completed) {
      apartment.showMessage(
        'The suspect has already escaped.\n' +
          'Search the apartment for clues to their next destination.',
        4500,
        '#795548'
      );
    }

    void apartment.setupSharedHud();
  }
}

export async function launchEmptyApartmentArrest(scene) {
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

  scene._arrestIntroOpening = true;

  const suspectId = scene.suspectId;
  const caseKey = scene.caseKey;
  const hudVisibility = {};

  try {
    await scene.setupSharedHud();

    if (
      scene._cleanupDone ||
      !scene.sys.isActive() ||
      scene.suspectId !== suspectId ||
      scene.caseKey !== caseKey
    ) {
      return false;
    }

    for (const key of HUD_KEYS) {
      const hud = scene.getRegisteredScene(key);

      if (hud) {
        hudVisibility[key] = scene.scene.isVisible(key);
      }
    }

    scene.getPlayerHudScene()?.closeAllUIPanels?.();

    if (!scene.hasScene(SCENE_KEY)) {
      scene.scene.add(
        SCENE_KEY,
        EmptyApartmentArrestOverlayScene,
        false
      );
    }

    const opened = await scene.launchOverlay(
      SCENE_KEY,
      {
        parentSceneKey: scene.sys.settings.key,
        suspectId,
        caseId: caseKey,
        hudVisibility
      }
    );

    if (!opened || scene._cleanupDone) {
      return false;
    }

    for (const key of Object.keys(hudVisibility)) {
      scene.scene.setVisible(false, key);
    }

    scene.scene.bringToTop(SCENE_KEY);
    scene.scene.pause();

    return true;
  } catch (error) {
    console.error(
      '[EmptyApartmentArrest] Could not launch operation:',
      error
    );

    for (const [key, visible] of Object.entries(hudVisibility)) {
      if (scene.hasScene(key)) {
        scene.scene.setVisible(visible, key);
      }
    }

    if (!scene._cleanupDone && scene.sys.isActive()) {
      scene.showMessage(
        'The suspect has escaped.\n' +
          'Search the apartment for clues.',
        4000,
        '#795548'
      );
    }

    return false;
  } finally {
    scene._arrestIntroOpening = false;
  }
}