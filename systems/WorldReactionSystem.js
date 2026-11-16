import { gameState } from '../GameData.js';

import {
  requestAutosave
} from '../gameStatePersistence.js';

import {
  installPIWorldReactionMail
} from '../ui/PIWorldReactionMail.js';

import {
  installAgencyWorldReactionMail
} from '../ui/AgencyWorldReactionMail.js';

import {
  installWorldNpcReactions
} from '../ui/WorldNpcReactionHooks.js';

import {
  installWorldTownReactions
} from '../ui/WorldTownReactionHooks.js';

import {
  captureWorldOutcomes
} from './WorldReactionModel.js';

const games = new WeakMap();
const scheduledScenes = new WeakSet();

const activeScene = scene => Boolean(
  scene &&
  !scene._cleanupDone &&
  scene.sys?.isActive?.()
);

export function readWorldOperationContext(game) {
  const keys = game?.scene?.keys || {};
  const context = {};

  const apartment = keys.ApartmentScene;

  if (
    activeScene(apartment) &&
    typeof apartment.getProgress === 'function'
  ) {
    context.apartment = {
      active: true,

      caseKey: apartment.caseKey,

      suspectId: apartment.suspectId,

      missionId: apartment.mission?.id ?? null,

      visit: apartment.getProgress()?.arrestVisit ?? null
    };
  }

  const gameOver = keys.GameOverScene;

  if (activeScene(gameOver)) {
    context.gameOver = {
      active: true,

      caseId: gameOver.caseId,

      reasonCode: gameOver.reasonCode
    };
  }

  return context;
}

export function syncWorldReactions(game = null) {
  const events = captureWorldOutcomes(
    gameState,
    Date.now(),
    readWorldOperationContext(game)
  );

  if (
    events.length &&
    gameState.caseFailed !== true
  ) {
    requestAutosave();
  }

  return events;
}

function connectOfficeComputer(scene) {
  if (!scene || scene._cleanupDone) return;

  const key = scene.sys?.settings?.key;

  if (key === 'DetectiveOfficeScene') {
    if (scene.computerUI) {
      installPIWorldReactionMail(scene.computerUI);
    }

    return;
  }

  if (key === 'OfficeScene') {
    if (scene.agencyComputerUI) {
      installAgencyWorldReactionMail(
        scene.agencyComputerUI
      );
    }
  }
}

function connectOfficeComputers(game) {
  const keys = game?.scene?.keys || {};

  connectOfficeComputer(keys.OfficeScene);
  connectOfficeComputer(keys.DetectiveOfficeScene);
}

export function installWorldReactions(game) {
  if (!game?.events) return null;

  const existing = games.get(game);

  if (existing) {
    existing.sync();
    return existing;
  }

  let dead = false;
  let last = -Infinity;

  const sync = () => {
    if (dead) return [];

    try {
      const events = syncWorldReactions(game);

      connectOfficeComputers(game);

      installWorldNpcReactions(game);
      installWorldTownReactions(game);

      return events;
    } catch (error) {
      console.error('[WorldReactions]', error);

      return [];
    }
  };

  const step = () => {
    const now = Date.now();

    if (now - last < 200) return;

    last = now;

    sync();
  };

  const destroy = () => {
    if (dead) return;

    dead = true;

    game.events.off('poststep', step);
    game.events.off('destroy', destroy);

    games.delete(game);
  };

  const api = {
    sync,
    destroy
  };

  games.set(game, api);

  game.events.on('poststep', step);
  game.events.once('destroy', destroy);

  sync();

  return api;
}

export function queueWorldOfficeReaction(scene) {
  const key = scene?.sys?.settings?.key;

  if (
    !['OfficeScene', 'DetectiveOfficeScene'].includes(key) ||
    scheduledScenes.has(scene)
  ) {
    return;
  }

  scheduledScenes.add(scene);

  let dead = false;
  let timer = null;

  const deliver = () => {
    timer = null;

    if (
      dead ||
      scene._cleanupDone ||
      !scene.sys?.isActive?.()
    ) {
      return;
    }

    try {
      syncWorldReactions(scene.game);

      connectOfficeComputer(scene);
    } catch (error) {
      console.error(
        '[WorldReactions] Office mail delivery failed:',
        error
      );
    }
  };

  const schedule = () => {
    if (dead || scene._cleanupDone) return;

    timer?.remove(false);

    timer = scene.time.delayedCall(
      180,
      deliver
    );
  };

  const dispose = () => {
    if (dead) return;

    dead = true;

    timer?.remove(false);
    timer = null;

    scheduledScenes.delete(scene);

    scene.events.off('wake', schedule);
    scene.events.off('resume', schedule);

    scene.events.off('shutdown', dispose);
    scene.events.off('destroy', dispose);
  };

  scene.events.on('wake', schedule);
  scene.events.on('resume', schedule);

  scene.events.once('shutdown', dispose);
  scene.events.once('destroy', dispose);

  schedule();
}