import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { FirstCaseTutorial } from '../../tutorials/FirstCaseTutorial.js';
import { requestAutosave } from '../../gameStatePersistence.js';

export const OfficeTutorialFlow = {
  isOfficeTutorialBlocking() {
    const tutorialState =
      this.gameState.onboarding?.firstCase;

    if (
      tutorialState?.completed === true ||
      tutorialState?.skipped === true
    ) {
      return false;
    }

    return Boolean(
      this.startOnboarding ||
      tutorialState?.active === true ||
      this.firstCaseTutorial?.isActive()
    );
  },

  hasFirstMissionSuccess() {
    const firstCase =
      this.gameState.onboarding?.firstCase;

    return Boolean(
      this.gameState.firstMissionSuccess ||
      this.gameState.progress?.firstMissionSuccess ||
      firstCase?.successCount >= 1 ||
      firstCase?.successes >= 1
    );
  },

  onFirstCaseTutorialFinished() {
    if (!this.isCurrentOfficeRun()) return;

    this.startOnboarding = false;
    this.refreshEntranceButtons();

    if (!this.sys.isActive()) return;

    this.navigation?.updateVisibility();
    this.refreshMissionProgressVisuals();
    this.refreshPanelLock();

    void this.setupOfficeUiLayers();
  },

  shouldRestoreFirstCaseTutorial() {
    const state = this.gameState.onboarding?.firstCase;

    if (
      state?.completed === true ||
      state?.skipped === true
    ) {
      return false;
    }

    return Boolean(
      this.startOnboarding ||
      state?.active === true
    );
  },

  suspendFirstCaseTutorial() {
    this._tutorialStartTimer?.remove(false);
    this._tutorialStartTimer = null;

    const tutorial = this.firstCaseTutorial;
    this.firstCaseTutorial = null;

    if (tutorial) {
      try {
        tutorial.destroy();
      } catch (error) {
        console.warn(
          '[OfficeScene] Tutorial suspension failed:',
          error
        );
      }
    }
  },

  restoreFirstCaseTutorial() {
    if (!this.isOfficeActive()) return;

    if (!this.shouldRestoreFirstCaseTutorial()) {
      this.suspendFirstCaseTutorial();
      this.refreshEntranceButtons();
      return;
    }

    if (
      this.firstCaseTutorial?.isActive() &&
      this.firstCaseTutorial.overlay?.scene
    ) {
      this.firstCaseTutorial.registerStorageButton();
      this.firstCaseTutorial.rebuildOverlay();
      this.refreshEntranceButtons();
      return;
    }

    this.createFirstCaseTutorial();
  },

  createFirstCaseTutorial() {
    if (!this.isOfficeActive()) return;

    if (!this.shouldRestoreFirstCaseTutorial()) {
      this.suspendFirstCaseTutorial();
      this.refreshEntranceButtons();
      return;
    }

    if (this._tutorialStartTimer) return;

    this.suspendFirstCaseTutorial();

    const tutorial = new FirstCaseTutorial(
      this,
      this.gameState
    );

    this.firstCaseTutorial = tutorial;

    for (
      const hotspot
      of this.hotspotManager?.hotspots ?? []
    ) {
      const id = hotspot?.hotspotData?.id;

      if (id) {
        tutorial.registerHotspot(id, hotspot);
      }
    }

    tutorial.registerStorageButton();

    const token = this._runToken;

    this._tutorialStartTimer = this.time.delayedCall(
      100,
      () => {
        this._tutorialStartTimer = null;

        if (
          !this.isCurrentOfficeRun(token) ||
          !this.sys.isActive() ||
          this.firstCaseTutorial !== tutorial
        ) {
          return;
        }

        tutorial.start();
        this.refreshEntranceButtons();
      }
    );

    this.refreshEntranceButtons();
  },

  notifyTutorialOfficeReached() {
    if (
      !this.firstCaseTutorial?.isActive() ||
      this.firstCaseTutorial.getStep() !== 'walk_to_case_file'
    ) {
      return;
    }

    const data = this.hotspotManager
      ?.findById('cabinet-casefile')
      ?.hotspotData;

    if (data) {
      this.firstCaseTutorial.onPlayerPositionChanged(
        data.x + data.width / 2,
        data.y + data.height / 2
      );
    }
  },

  hasCompletedFirstMission() {
    return Boolean(
      this.gameState.firstMissionCompleted ||
      this.gameState.progress?.firstMissionCompleted ||
      this.gameState.story?.firstMissionCompleted ||
      this.gameState.onboarding?.firstCase?.missionCompleted
    );
  },

  onFirstMissionCompleted() {
    if (!this.isCurrentOfficeRun()) return;

    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionCompleted = true;
    requestAutosave();

    this.refreshMissionProgressVisuals();

    if (this.sys.isActive()) {
      this.showOfficeStatusMessage(
        __dialogueText("scenes/OfficeScene.js", "t_218af78fa4d07edacf36")
      );
    }
  },

  onFirstMissionSuccess() {
    if (!this.isCurrentOfficeRun()) return;

    this.gameState.progress ??= {};
    this.gameState.progress.firstMissionSuccess = true;
    requestAutosave();

    this.refreshEntranceButtons();
  }
};
