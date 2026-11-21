import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { saveGameState } from '../../gameStatePersistence.js';
import { EventBus } from '../../EventBus.js';
import { audioManager } from '../../managers/AudioManager.js';
import { progressionManager } from '../../managers/ProgressionManager.js';

const HUD_KEYS = ['UIScene', 'PlayerHudScene'];
const HUD_READY_EVENTS = ['create', 'wake', 'resume', 'hud-ready'];

function stableId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  const id = String(value).trim();
  return id && id.length <= 400 ? id : null;
}

export class HiddenObjectsSceneFlow {
  constructor(scene) {
    this.scene = scene;
    this._hudStates = new Map();
    this._restoreHudOnExit = () => this._restoreHudStates();
  }

  getSafeReturnScene() {
    const requested = typeof this.scene.returnScene === 'string' ? this.scene.returnScene.trim() : '';
    // Registration is not an eligibility check: goto() delegates lazy loading.
    return requested && requested !== this.scene.scene.key ? requested : 'CityScene';
  }

  async returnToSafeScene(data = {}) {
    const scene = this.scene;
    if (scene.isReturning || scene._cleanupDone) return false;
    scene.isReturning = true;
    this.forceResetCursor();
    const candidates = [...new Set([this.getSafeReturnScene(), 'CityScene'])]
      .filter(key => key && key !== scene.scene.key);
    for (const targetScene of candidates) {
      if (scene._cleanupDone) break;
      try {
        const moved = await scene.goto(targetScene, data);
        if (moved) {
          this._restoreHudStates();
          return true;
        }
      } catch (error) {
        console.warn('[HiddenObjectsSceneFlow] Return attempt failed:', targetScene, error);
      }
    }
    scene.isReturning = false;
    console.error('[HiddenObjectsSceneFlow] Could not return to any safe scene.', { candidates });
    return false;
  }

  handleSceneSetupFailure(message) {
    const scene = this.scene;
    console.error('[HiddenObjectsSceneFlow] Setup failed:', message, { sceneId: scene.sceneId, cityId: scene.cityId });
    // Setup can fail after a timer or a subset of zones has been created.
    this.stopTimer(); this.disableZones();
    void this.returnToSafeScene({
      ...scene.returnData, hiddenObjectsSetupFailed: true, hiddenObjectsSuccess: false,
      hiddenObjectsScore: scene.score, incorrectClicks: scene.incorrectClicks,
      foundItems: [...scene.foundItems], sceneId: scene.sceneId, errorMessage: message
    });
  }

  handleMissingZones() {
    const scene = this.scene;
    const zoneIds = new Set(scene.hiddenZones.map(zone => String(zone.getData('id'))));
    const missingZoneIds = scene.activeItems.map(item => String(item.id)).filter(id => !zoneIds.has(id));
    this.handleSceneSetupFailure(
      __dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_872a2e076d00a5b43471') + `${missingZoneIds.join(', ')}.`
    );
  }

  forceResetCursor() {
    const scene = this.scene;
    scene.input?.setDefaultCursor('default');
    if (scene.sys?.game?.canvas) scene.sys.game.canvas.style.cursor = 'default';
  }

  pauseSourceScene() {
    const scene = this.scene, source = scene.sourceScene;
    if (!source || source === scene.scene.key || !scene.hasScene(source)) return false;
    const sourceSceneRef = scene.scene.manager.keys[source];
    if (scene.isSceneActive(source)) scene.scene.sleep(source);
    if (sourceSceneRef?.input) sourceSceneRef.input.enabled = false;
    return true;
  }

  restoreSourceScene() {
    const scene = this.scene;
    this.forceResetCursor();
    const source = scene.sourceScene || scene.returnScene || 'CityScene';
    if (!scene.hasScene(source)) return false;
    if (scene.isSceneSleeping(source)) scene.scene.wake(source);
    if (scene.isScenePaused(source)) scene.scene.resume(source);
    const sourceSceneRef = scene.scene.manager.keys[source];
    if (sourceSceneRef?.input) {
      sourceSceneRef.input.enabled = true; sourceSceneRef.input.setTopOnly(true);
    }
    return true;
  }

  _suspendHud(snapshot) {
    const scene = this.scene, hud = snapshot.hud;
    if (scene.scene.manager.keys[snapshot.key] !== hud) return;
    if (hud.input) hud.input.enabled = false;
    if (hud.input?.keyboard) hud.input.keyboard.enabled = false;
    hud.scene?.setVisible?.(false);
    if (scene.isSceneActive(snapshot.key)) scene.scene.sleep(snapshot.key);
  }

  hideGameHud() {
    const scene = this.scene;
    if (this._hudStates.size) return true;
    scene.hudWasSleeping = scene.isSceneSleeping('UIScene');
    scene.hudWasPaused = scene.isScenePaused('UIScene');
    for (const key of HUD_KEYS) {
      const hud = scene.scene.manager.keys[key];
      if (!hud) continue;
      const snapshot = {
        key, hud, active: scene.isSceneActive(key),
        sleeping: scene.isSceneSleeping(key), paused: scene.isScenePaused(key),
        visible: hud.sys?.settings?.visible,
        inputEnabled: hud.input?.enabled,
        keyboardEnabled: hud.input?.keyboard?.enabled,
        guard: null
      };
      // Late HUD boot or a wake request must not reactivate shortcuts mid-game.
      snapshot.guard = () => this._suspendHud(snapshot);
      this._hudStates.set(key, snapshot);
      for (const event of HUD_READY_EVENTS) hud.events?.on(event, snapshot.guard);
      if (key === 'PlayerHudScene') hud.closeAllUIPanels?.();
      this._suspendHud(snapshot);
    }
    if (!this._hudStates.size) return false;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._restoreHudOnExit);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this._restoreHudOnExit);
    return true;
  }

  _restoreHudStates() {
    const scene = this.scene;
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this._restoreHudOnExit);
    scene.events.off(Phaser.Scenes.Events.DESTROY, this._restoreHudOnExit);
    const snapshots = [...this._hudStates.values()];
    this._hudStates.clear();
    const current = [];
    for (const snapshot of snapshots) {
      const { key, hud, guard } = snapshot;
      for (const event of HUD_READY_EVENTS) hud.events?.off(event, guard);
      if (scene.scene.manager.keys[key] !== hud) continue;
      current.push(snapshot);
      if (snapshot.active) {
        if (scene.isSceneSleeping(key)) scene.scene.wake(key);
        else if (scene.isScenePaused(key)) scene.scene.resume(key);
      } else if (snapshot.sleeping && scene.isSceneActive(key)) scene.scene.sleep(key);
      else if (snapshot.paused && scene.isSceneActive(key)) scene.scene.pause(key);
    }
    // Retain the legacy showHUD notification for HUDs with their own roots.
    if (current.some(snapshot => snapshot.active && snapshot.visible !== false)) EventBus.emit('showHUD');
    for (const snapshot of current) {
      const hud = snapshot.hud;
      if (hud.input && snapshot.inputEnabled !== undefined) hud.input.enabled = snapshot.inputEnabled;
      if (hud.input?.keyboard && snapshot.keyboardEnabled !== undefined) hud.input.keyboard.enabled = snapshot.keyboardEnabled;
      if (snapshot.visible !== undefined) hud.scene?.setVisible?.(snapshot.visible);
      if (snapshot.active) { hud.refreshNotebook?.(); hud.refreshUI?.(); }
    }
    return snapshots.length > 0;
  }

  async restoreGameHud() {
    const restored = this._restoreHudStates();
    if (restored) EventBus.emit('scoreChanged', { total: gameState.score || 0, source: 'hidden-objects-return' });
    return restored;
  }

  finishScene(success) {
    const scene = this.scene;
    if (scene.isSceneFinished) return;
    scene.isSceneFinished = true;
    this.stopTimer(); this.disableZones();
    scene.stateManager.markSceneVisited(success, { save: false });
    this.advanceGameTime();
    if (success) this.handleSuccess(); else this.handleFailure();
  }

  getProgressionCaseId() {
    for (const candidate of [gameState.currentCaseId, gameState.currentMission?.caseId, gameState.currentMission?.id]) {
      const id = stableId(candidate);
      if (id !== null) return id;
    }
    return null;
  }

  grantCompletionXP(caseId = this.getProgressionCaseId()) {
    if (!caseId) {
      console.warn('[HiddenObjectsSceneFlow] XP skipped: no stable case ID.', { cityId: this.scene.cityId, sceneId: this.scene.sceneId });
      return { success: false, reason: 'missing_case_id' };
    }
    try {
      return progressionManager.grantReward('crime_scene_completed', caseId,
        __dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_ef112fa567df481c180b'));
    } catch (error) {
      console.error('[HiddenObjectsSceneFlow] Could not grant completion XP:', error);
      return { success: false, reason: 'progression_error' };
    }
  }

  handleSuccess() {
    const scene = this.scene, caseId = this.getProgressionCaseId();
    if (gameState.reconstructedHeist) {
      gameState.reconstructedHeist.hiddenObjectsCompleted = true;
      gameState.reconstructedHeist.hiddenObjectsCompletedAt = Date.now();
      gameState.reconstructedHeist.cityId = scene.cityId;
      gameState.reconstructedHeist.sceneId = scene.sceneId;
    }
    // Use exactly the same stable key as the reward ledger. Do not invent a
    // city/scene reward identity shared by unrelated missions.
    if (caseId !== null) {
      gameState.hiddenObjectsProgress ??= {};
      gameState.hiddenObjectsProgress[caseId] = {
        completed: true, completedAt: Date.now(), foundCardIds: [...scene.foundItems],
        collectedCardIds: [...(gameState.reconstructedHeist?.collectedCardIds || [])],
        solutionCardIds: [...(gameState.reconstructedHeist?.solutionCardIds || [])]
      };
    } else {
      console.warn('[HiddenObjectsSceneFlow] No stable ID for hiddenObjectsProgress; visit completion is still recorded.');
    }
    const timeBonus = scene.timeLeft * 2;
    scene.score = scene.scoreManager.addHiddenObjectScore(timeBonus);
    const xpResult = this.grantCompletionXP(caseId);
    // Persist the visit, time cost, score, completion and XP together.
    saveGameState();
    scene.ui.updateScoreAndMisses(scene.score, scene.incorrectClicks);
    const xpMessage = xpResult.success && xpResult.grantedXP > 0
      ? `${__dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_af0dea6180fbac8a482c')}${xpResult.grantedXP}${__dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_42e2aa5470e71f56e5a5')}` : '';
    scene.ui.showMessage(
      `${__dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_e4cbd3e5e942d37e6517')}${timeBonus}${xpMessage}`,
      __dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_1f23450b0aea40e253b6')
    );
    this.showTimeAdvanceToast(); scene.overlay.showSuccessOverlay();
  }

  handleFailure() {
    const scene = this.scene;
    // markSceneVisited was deferred; failure must also persist after time cost.
    saveGameState();
    scene.playSfx('wrong', { gain: 0.5, volume: audioManager.getSfxVolume() * 0.5 });
    this.flashScreen(0xff4d4d, 0.18, 220);
    scene.ui.showMessage(
      __dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_18660a82355c1e8adb01'),
      __dialogueText('scenes/hiddenObjects/HiddenObjectsSceneFlow.js', 't_2701c435c516e9d3f3bd')
    );
    this.showTimeAdvanceToast(); scene.overlay.showFailureOverlay();
  }

  abandonGame() {
    const scene = this.scene;
    if (scene.isSceneFinished) return;
    scene.isSceneFinished = true;
    this.stopTimer(); this.disableZones();
    scene.stateManager.markSceneVisited(false, { save: false });
    this.advanceGameTime(); saveGameState();
    void this.returnToSafeScene({
      ...scene.returnData, hiddenObjectsSuccess: false, hiddenObjectsAbandoned: true,
      hiddenObjectsScore: scene.score, incorrectClicks: scene.incorrectClicks,
      foundItems: Array.from(scene.foundItems), sceneId: scene.sceneId
    });
  }

  stopTimer() {
    const scene = this.scene;
    if (typeof scene.timerController?.stop === 'function') { scene.timerController.stop(); return; }
    if (scene.timerEvent) { scene.timerEvent.remove(false); scene.timerEvent = null; }
  }
  disableZones() {
    const scene = this.scene;
    if (typeof scene.zoneFactory?.disableAllZones === 'function') { scene.zoneFactory.disableAllZones(); return; }
    (scene.hiddenZones || []).forEach(zone => { if (zone?.input?.enabled) zone.disableInteractive(); });
  }
  advanceGameTime() {
    const scene = this.scene;
    if (typeof scene.timerController?.advanceGameTime === 'function') { scene.timerController.advanceGameTime(); return; }
    if (typeof scene.advanceGameTime === 'function') { scene.advanceGameTime(); return; }
    console.warn('[HiddenObjectsSceneFlow] No game-time controller is available.');
  }
  showTimeAdvanceToast() {
    const scene = this.scene;
    if (typeof scene.timerController?.showTimeAdvanceToast === 'function') { scene.timerController.showTimeAdvanceToast(); return; }
    if (typeof scene.showTimeAdvanceToast === 'function') scene.showTimeAdvanceToast();
  }
  flashScreen(color, alpha, duration) {
    const scene = this.scene;
    if (typeof scene.presentation?.flashScreen === 'function') { scene.presentation.flashScreen(color, alpha, duration); return; }
    if (typeof scene.flashScreen === 'function') scene.flashScreen(color, alpha, duration);
  }
}