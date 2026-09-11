import { gameState } from '../../GameData.js';
import { saveGameState } from '../../GameStatePersistence.js';
import { EventBus } from '../../EventBus.js';

export class HiddenObjectsSceneFlow {
  constructor(scene) {
    this.scene = scene;
  }

  getSafeReturnScene() {
    const scene = this.scene;

    const requestedScene =
      typeof scene.returnScene === 'string'
        ? scene.returnScene.trim()
        : '';

    if (
      requestedScene &&
      scene.hasScene(requestedScene)
    ) {
      return requestedScene;
    }

    if (scene.hasScene('CityScene')) {
      return 'CityScene';
    }

    if (scene.hasScene('MenuScene')) {
      return 'MenuScene';
    }

    console.error(
      '[HiddenObjectsSceneFlow] No valid return scene could be determined.',
      {
        requestedScene,
        sceneKey: scene.scene.key
      }
    );

    return null;
  }

  async returnToSafeScene(data = {}) {
    const scene = this.scene;

    if (scene.isReturning) {
      return false;
    }

    scene.isReturning = true;

    const targetScene = this.getSafeReturnScene();

    if (!targetScene) {
      scene.isReturning = false;

      return false;
    }

    this.forceResetCursor();

    const moved = await scene.goto(
      targetScene,
      data
    );

    if (!moved) {
      scene.isReturning = false;

      console.error(
        '[HiddenObjectsSceneFlow] Could not return to scene.',
        {
          targetScene,
          data
        }
      );

      return false;
    }

    return true;
  }

  handleSceneSetupFailure(message) {
    const scene = this.scene;

    console.error(
      '[HiddenObjectsSceneFlow] Setup failed:',
      message,
      {
        sceneId: scene.sceneId,
        cityId: scene.cityId
      }
    );

    void this.returnToSafeScene({
      ...scene.returnData,
      hiddenObjectsSetupFailed: true,
      hiddenObjectsSuccess: false,
      hiddenObjectsScore: scene.score,
      incorrectClicks: scene.incorrectClicks,
      foundItems: [...scene.foundItems],
      sceneId: scene.sceneId,
      errorMessage: message
    });
  }

  handleMissingZones() {
    const scene = this.scene;

    const zoneIds = new Set(
      scene.hiddenZones.map((zone) =>
        String(zone.getData('id'))
      )
    );

    const missingZoneIds = scene.activeItems
      .map((item) => String(item.id))
      .filter((id) => !zoneIds.has(id));

    this.handleSceneSetupFailure(
      `Missing clickable Tiled zones for: ` +
      `${missingZoneIds.join(', ')}.`
    );
  }

  forceResetCursor() {
    const scene = this.scene;

    scene.input?.setDefaultCursor('default');

    if (scene.sys?.game?.canvas) {
      scene.sys.game.canvas.style.cursor = 'default';
    }
  }

  pauseSourceScene() {
    const scene = this.scene;
    const source = scene.sourceScene;

    if (
      !source ||
      source === scene.scene.key ||
      !scene.hasScene(source)
    ) {
      return false;
    }

    const sourceSceneRef =
      scene.scene.manager.keys[source];

    if (scene.isSceneActive(source)) {
      scene.scene.sleep(source);
    }

    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = false;
    }

    return true;
  }

  restoreSourceScene() {
    const scene = this.scene;

    this.forceResetCursor();

    const source =
      scene.sourceScene ||
      scene.returnScene ||
      'CityScene';

    if (!scene.hasScene(source)) {
      return false;
    }

    if (scene.isSceneSleeping(source)) {
      scene.scene.wake(source);
    }

    if (scene.isScenePaused(source)) {
      scene.scene.resume(source);
    }

    const sourceSceneRef =
      scene.scene.manager.keys[source];

    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true;
      sourceSceneRef.input.setTopOnly(true);
    }

    return true;
  }

  hideGameHud() {
    const scene = this.scene;
    const uiSceneKey = 'UIScene';

    scene.hudWasSleeping = false;
    scene.hudWasPaused = false;

    if (!scene.hasScene(uiSceneKey)) {
      return false;
    }

    scene.hudWasSleeping =
      scene.isSceneSleeping(uiSceneKey);

    scene.hudWasPaused =
      scene.isScenePaused(uiSceneKey);

    if (scene.isSceneActive(uiSceneKey)) {
      scene.scene.sleep(uiSceneKey);
    }

    return true;
  }

  async restoreGameHud() {
    const scene = this.scene;
    const uiSceneKey = 'UIScene';

    if (!scene.hasScene(uiSceneKey)) {
      const launched = await scene.launchOverlay(
        uiSceneKey
      );

      if (!launched) {
        console.warn(
          '[HiddenObjectsSceneFlow] UIScene could not be restored.'
        );

        return false;
      }
    }

    if (scene.isSceneSleeping(uiSceneKey)) {
      scene.scene.wake(uiSceneKey);
    } else if (scene.isScenePaused(uiSceneKey)) {
      scene.scene.resume(uiSceneKey);
    } else if (!scene.isSceneActive(uiSceneKey)) {
      const launched = await scene.launchOverlay(
        uiSceneKey
      );

      if (!launched) {
        return false;
      }
    }

    const uiScene =
      scene.scene.manager.keys[uiSceneKey];

    const refreshHud = () => {
      EventBus.emit('showHUD');

      EventBus.emit('scoreChanged', {
        total: gameState.score || 0,
        source: 'hidden-objects-return'
      });
    };

    if (scene.isSceneActive(uiSceneKey)) {
      refreshHud();
    } else {
      uiScene?.events?.once(
        Phaser.Scenes.Events.WAKE,
        refreshHud
      );
    }

    scene.bringSceneToTopIfActive(uiSceneKey);

    return true;
  }

  finishScene(success) {
    const scene = this.scene;

    if (scene.isSceneFinished) {
      return;
    }

    scene.isSceneFinished = true;

    this.stopTimer();
    this.disableZones();

    scene.stateManager.markSceneVisited(success);

    this.advanceGameTime();

    if (success) {
      this.handleSuccess();

      return;
    }

    this.handleFailure();
  }

  handleSuccess() {
    const scene = this.scene;

    if (gameState.reconstructedHeist) {
      gameState.reconstructedHeist.hiddenObjectsCompleted =
        true;

      gameState.reconstructedHeist.hiddenObjectsCompletedAt =
        Date.now();

      gameState.reconstructedHeist.cityId =
        scene.cityId;

      gameState.reconstructedHeist.sceneId =
        scene.sceneId;
    }

    gameState.hiddenObjectsProgress ??= {};

    const caseId =
      gameState.currentCaseId ||
      gameState.currentMission?.id ||
      gameState.currentMission?.caseId ||
      `${scene.cityId}_${scene.sceneId}`;

    gameState.hiddenObjectsProgress[caseId] = {
      completed: true,
      completedAt: Date.now(),
      foundCardIds: [...scene.foundItems],
      collectedCardIds: [
        ...(
          gameState.reconstructedHeist
            ?.collectedCardIds || []
        )
      ],
      solutionCardIds: [
        ...(
          gameState.reconstructedHeist
            ?.solutionCardIds || []
        )
      ]
    };

    const timeBonus = scene.timeLeft * 2;

    scene.score =
      scene.scoreManager.addHiddenObjectScore(
        timeBonus
      );

    saveGameState();

    scene.ui.updateScoreAndMisses(
      scene.score,
      scene.incorrectClicks
    );

    scene.ui.showMessage(
      `Crime scene processed. Time bonus +${timeBonus}`,
      '#7CFC00'
    );

    this.showTimeAdvanceToast();

    scene.overlay.showSuccessOverlay();
  }

  handleFailure() {
    const scene = this.scene;

    scene.playSfx('wrong', {
      volume: 0.5
    });

    this.flashScreen(
      0xff4d4d,
      0.18,
      220
    );

    scene.ui.showMessage(
      'Time is up. The evidence trail went cold.',
      '#ff6b6b'
    );

    this.showTimeAdvanceToast();

    scene.overlay.showFailureOverlay();
  }

  abandonGame() {
    const scene = this.scene;

    if (scene.isSceneFinished) {
      return;
    }

    scene.isSceneFinished = true;

    this.stopTimer();
    this.disableZones();

    scene.stateManager.markSceneVisited(false);

    this.advanceGameTime();

    void this.returnToSafeScene({
      ...scene.returnData,
      hiddenObjectsSuccess: false,
      hiddenObjectsAbandoned: true,
      hiddenObjectsScore: scene.score,
      incorrectClicks: scene.incorrectClicks,
      foundItems: Array.from(scene.foundItems),
      sceneId: scene.sceneId
    });
  }

  stopTimer() {
    const scene = this.scene;

    if (
      scene.timerController &&
      typeof scene.timerController.stop === 'function'
    ) {
      scene.timerController.stop();

      return;
    }

    if (scene.timerEvent) {
      scene.timerEvent.remove(false);
      scene.timerEvent = null;
    }
  }

  disableZones() {
    const scene = this.scene;

    if (
      scene.zoneFactory &&
      typeof scene.zoneFactory.disableAllZones ===
        'function'
    ) {
      scene.zoneFactory.disableAllZones();

      return;
    }

    scene.hiddenZones.forEach((zone) => {
      if (zone?.input?.enabled) {
        zone.disableInteractive();
      }
    });
  }

  advanceGameTime() {
    const scene = this.scene;

    if (
      scene.timerController &&
      typeof scene.timerController.advanceGameTime ===
        'function'
    ) {
      scene.timerController.advanceGameTime();

      return;
    }

    if (typeof scene.advanceGameTime === 'function') {
      scene.advanceGameTime();

      return;
    }

    console.warn(
      '[HiddenObjectsSceneFlow] No game-time controller is available.'
    );
  }

  showTimeAdvanceToast() {
    const scene = this.scene;

    if (
      scene.timerController &&
      typeof scene.timerController.showTimeAdvanceToast ===
        'function'
    ) {
      scene.timerController.showTimeAdvanceToast();

      return;
    }

    if (typeof scene.showTimeAdvanceToast === 'function') {
      scene.showTimeAdvanceToast();
    }
  }

  flashScreen(color, alpha, duration) {
    const scene = this.scene;

    if (
      scene.presentation &&
      typeof scene.presentation.flashScreen ===
        'function'
    ) {
      scene.presentation.flashScreen(
        color,
        alpha,
        duration
      );

      return;
    }

    if (typeof scene.flashScreen === 'function') {
      scene.flashScreen(
        color,
        alpha,
        duration
      );
    }
  }
}