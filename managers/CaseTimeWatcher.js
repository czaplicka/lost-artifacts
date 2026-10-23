import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { clearSavedGame } from '../gameStatePersistence.js';
import { getCaseClockStatus } from '../CaseTimeHelper.js';

const OWNER_KEY = 'CaseTimeWatcher';
const PERSISTENT_SCENES = new Set([
  'UIScene', 'NewsHud', 'PlayerHudScene', 'GameOverScene', '__LostArtifactsAudioHost'
]);
let phaserGame = null;
let pendingGameOver = null;

export function bindCaseTimeGame(game) {
  // Phaser may not have assigned this.game during a scene constructor yet.
  if (!game?.scene) return;
  if (phaserGame && phaserGame !== game) cancelPendingGameOver();
  phaserGame = game;
}
function caseKey() {
  const mission = gameState.currentMission || {};
  return JSON.stringify([
    gameState.currentCaseId ?? null, mission.id || mission.missionId || mission.artifactKey || null,
    gameState.crimeCityId ?? null, gameState.investigationStartTime ?? null
  ]);
}
function cancelPendingGameOver() {
  if (pendingGameOver?.timer !== undefined) clearTimeout(pendingGameOver.timer);
  pendingGameOver = null;
}
function expirationReason() {
  const clock = getCaseClockStatus(gameState);
  if (clock.totalExpired) return 'time_expired';
  if (clock.crimeExpired) return 'trail_cold';
  return null;
}
function findGameplayScene(game) {
  return game?.scene?.getScenes(true).find(scene =>
    !PERSISTENT_SCENES.has(scene.sys.settings.key) && typeof scene.goto === 'function'
  ) || null;
}
function stillApplies(token) {
  return pendingGameOver === token && phaserGame === token.game &&
    caseKey() === token.caseKey && gameState.caseFailed === true &&
    gameState.isGameActive === false && gameState.caseResolved !== true &&
    gameState.gameOverReason === token.reason && expirationReason() === token.reason;
}
function stopGameplayScenes(manager) {
  for (const scene of manager.getScenes(false)) {
    const key = scene.sys.settings.key;
    if (!PERSISTENT_SCENES.has(key) &&
        (scene.sys.isActive() || scene.sys.isPaused() || scene.sys.isSleeping())) manager.stop(key);
  }
}
function openGameOver(reason) {
  cancelPendingGameOver();
  if (!phaserGame?.scene) {
    console.warn('[CaseTimeWatcher] Game is not bound yet.');
    return;
  }
  const token = { game: phaserGame, caseKey: caseKey(), reason };
  pendingGameOver = token;
  token.timer = setTimeout(async () => {
    // A manual load/new case during the delay must cancel the old game over.
    if (!stillApplies(token)) {
      if (pendingGameOver === token) pendingGameOver = null;
      return;
    }
    const manager = token.game.scene;
    if (manager.isActive('GameOverScene')) { pendingGameOver = null; return; }
    const scene = findGameplayScene(token.game);
    if (scene) {
      try {
        const started = await scene.goto('GameOverScene', { reason });
        if (started) {
          if (pendingGameOver === token) pendingGameOver = null;
          return;
        }
      } catch (error) {
        console.error('[CaseTimeWatcher] Game-over navigation failed:', error);
      }
    }
    // Recheck after an asynchronous SceneLoader call before the fallback.
    if (!stillApplies(token)) return;
    stopGameplayScenes(manager);
    manager.start('GameOverScene', { reason });
    if (pendingGameOver === token) pendingGameOver = null;
  }, 250);
}
function failCase(reason) {
  gameState.updateState({
    caseFailed: true, isGameActive: false,
    finalArrestResult: 'FAILURE', gameOverReason: reason
  });
  clearSavedGame();
  EventBus.emit('caseTimeExpired', { reason });
  openGameOver(reason);
}
function handleTimeChanged() {
  if (!gameState.isGameActive || gameState.caseResolved || gameState.caseFailed) {
    if (pendingGameOver && !stillApplies(pendingGameOver)) cancelPendingGameOver();
    return;
  }
  if (pendingGameOver) cancelPendingGameOver();
  const reason = expirationReason();
  if (reason) failCase(reason);
}
EventBus.clearScope(OWNER_KEY);
EventBus.on('timeChanged', handleTimeChanged, null, OWNER_KEY);
