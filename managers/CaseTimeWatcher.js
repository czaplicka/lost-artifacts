import { EventBus } from '../EventBus.js';
import { gameState } from '../GameData.js';
import { clearSavedGame } from '../gameStatePersistence.js';
import {
  isTotalTimeExpired,
  isCrimePhaseExpired
} from '../CaseTimeHelper.js';

const OWNER_KEY = 'CaseTimeWatcher';

// Sceny, które zostają przy życiu podczas ekranu przegranej.
const PERSISTENT_SCENES = new Set([
  'UIScene',
  'NewsHud',
  'PlayerHudScene',
  'GameOverScene',
  '__LostArtifactsAudioHost'
]);

let phaserGame = null;

// Wywoływane automatycznie z BaseScene.create().
export function bindCaseTimeGame(game) {
  phaserGame = game;
}

function findGameplayScene() {
  const manager = phaserGame?.scene;

  if (!manager) {
    return null;
  }

  return manager.getScenes(true).find(scene =>
    !PERSISTENT_SCENES.has(scene.sys.settings.key) &&
    typeof scene.goto === 'function'
  ) || null;
}

function stopGameplayScenes() {
  const manager = phaserGame?.scene;

  if (!manager) {
    return;
  }

  for (const scene of manager.getScenes(false)) {
    const key = scene.sys.settings.key;

    if (PERSISTENT_SCENES.has(key)) {
      continue;
    }

    if (
      scene.sys.isActive() ||
      scene.sys.isPaused() ||
      scene.sys.isSleeping()
    ) {
      manager.stop(key);
    }
  }
}

function openGameOver(reason) {
  if (!phaserGame) {
    console.warn('[CaseTimeWatcher] Game is not bound yet.');
    return;
  }

  // Krótkie opóźnienie, żeby nie przerwać sceny w trakcie jej własnej akcji.
  setTimeout(async () => {
    const manager = phaserGame?.scene;

    if (!manager || manager.isActive('GameOverScene')) {
      return;
    }

    const scene = findGameplayScene();

    // Preferowana droga: goto aktywnej sceny (SceneLoader).
    if (scene) {
      const started = await scene.goto('GameOverScene', { reason });

      if (started) {
        return;
      }
    }

    // Plan awaryjny.
    stopGameplayScenes();
    manager.start('GameOverScene', { reason });
  }, 250);
}

function failCase(reason) {
  gameState.updateState({
    caseFailed: true,
    isGameActive: false,
    finalArrestResult: 'FAILURE',
    gameOverReason: reason
  });

  // Przegrana sprawa nie zostaje w autosave. Sloty ręczne są nietknięte,
  // więc gracz może wczytać zapis albo zacząć od nowa.
  clearSavedGame();

  EventBus.emit('caseTimeExpired', { reason });

  openGameOver(reason);
}

function handleTimeChanged() {
  if (
    !gameState.isGameActive ||
    gameState.caseResolved ||
    gameState.caseFailed
  ) {
    return;
  }

  // 7 dni minęło: koniec czasu.
  if (isTotalTimeExpired(gameState)) {
    failCase('time_expired');
    return;
  }

  // 4 dni w mieście zbrodni minęły, a pościg się nie zaczął:
  // złodziej uciekł, a szlak wystygł.
  if (isCrimePhaseExpired(gameState)) {
    failCase('trail_cold');
  }
}

EventBus.clearScope(OWNER_KEY);
EventBus.on('timeChanged', handleTimeChanged, null, OWNER_KEY);