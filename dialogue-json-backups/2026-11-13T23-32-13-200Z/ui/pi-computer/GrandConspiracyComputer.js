import { gameState } from '../../GameData.js';

import {
  getPIQuest
} from '../../managers/PIQuestManager.js';

import {
  piInventoryManager
} from '../../managers/PIInventoryManager.js';

const CASE_ID = 'pi_grand_conspiracy';
const MESSAGE_ID = 'grand_conspiracy_perkins_briefing';
const SCENE_KEY = 'GrandConspiracyScene';

function getQuest() {
  return getPIQuest(CASE_ID);
}

function completed() {
  return (
    getQuest()?.status === 'completed' ||
    gameState.piGrandConspiracy?.completed === true
  );
}

function progress() {
  const saved = gameState.piGrandConspiracy;

  if (saved?.version !== 3) {
    return {
      photos: [],
      talked: false,
      reportChoice: null
    };
  }

  return {
    ...saved,
    photos: Array.isArray(saved.photos)
      ? saved.photos
      : []
  };
}

function getMessage() {
  const done = completed();
  const saved = progress();

  if (done) {
    return {
      id: MESSAGE_ID,
      from: 'Elder Perkins',
      subject: 'The Midnight Gardener — case closed',
      date: 'Case correspondence',

      body:
        'Detective,\n\n' +
        'Your report has arrived. The fee has been processed.\n\n' +
        (
          saved.reportChoice === 'sensational'
            ? 'I knew the wheelbarrow deserved closer scrutiny. ' +
              'I shall continue watching it from the kitchen.\n\n'
            : 'I accept your explanation, although I maintain that ' +
              'midnight is an unnecessarily dramatic time to water vegetables.\n\n'
        ) +
        'Please ask Olga to return my newspaper. ' +
        'The dog has already completed two crosswords incorrectly.\n\n' +
        'Elder Perkins\n\n' +
        'CASE CLOSED\n' +
        'Reward package: $100, 50 XP, reputation reward +10 ' +
        '(maximum 100), and Much Ado About Mulch.\n' +
        'Integrity depends on the report you submitted.'
    };
  }

  const continuing =
    saved.photos.length > 0 ||
    saved.talked ||
    saved.reportChoice;

  return {
    id: MESSAGE_ID,
    from: 'Elder Perkins',
    subject: 'The Midnight Gardener — observation instructions',
    date: 'Case correspondence',

    body:
      'Detective,\n\n' +
      'Thank you for accepting my advertisement.\n\n' +
      'My neighbour Olga works in her garden at midnight. ' +
      'There are sacks, digging tools and a wheelbarrow. ' +
      'I trust you understand the gravity of this combination.\n\n' +
      'You may observe the garden from my side of the fence. ' +
      'Do not enter her property. Bring your own camera.\n\n' +
      'Please establish what she is actually doing. ' +
      'I would prefer something suspicious, but I suppose ' +
      'I am paying for the facts.\n\n' +
      'Also, my newspaper has disappeared. Again.\n\n' +
      'Agreed fee: $100.\n\n' +
      'Elder Perkins\n\n' +
      (
        continuing
          ? 'Your observations are saved. You can return to the garden ' +
            'and continue from where you left off.'
          : 'Use GO TO GARDEN below to begin the observation.'
      )
  };
}

export function installGrandConspiracyComputer(ui, documents) {
  let destroyed = false;
  let launching = false;
  let restoreField = null;

  const previousGetMail = documents.getMail;
  const previousRender = documents.render;
  const previousPagedText = documents.renderPagedText;

  function alive() {
    return (
      !destroyed &&
      !ui.destroyed &&
      ui.isOpen &&
      !ui.suspended &&
      ui.scene?.sys?.isActive?.() === true
    );
  }

  function viewingMessage() {
    return (
      ui.app === 'mail' &&
      ui.selectedId === MESSAGE_ID &&
      Boolean(getQuest())
    );
  }

  function refresh() {
    if (alive()) ui.render();
  }

  const getMail = function (...args) {
    const original = previousGetMail.apply(this, args);

    const messages = Array.isArray(original)
      ? original
      : [];

    const filtered = messages.filter(
      message => message?.id !== MESSAGE_ID
    );

    if (!getQuest()) return filtered;

    return [
      getMessage(),
      ...filtered
    ];
  };

  const renderPagedText = function (
    content,
    x,
    y,
    width,
    height
  ) {
    const reserve =
      viewingMessage() && !completed()
        ? 64
        : 0;

    return previousPagedText.call(
      this,
      content,
      x,
      y,
      width,
      Math.max(40, height - reserve)
    );
  };

  async function launchGarden() {
    if (
      launching ||
      !alive() ||
      !viewingMessage() ||
      completed()
    ) {
      return;
    }

    const quest = getQuest();

    if (!['active', 'settling'].includes(quest?.status)) {
      ui.notice = 'This case is not available for observation.';
      refresh();
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      ui.notice =
        'Bring your camera. It must be in your PI inventory. ' +
        'The Spy Shop sells field equipment.';

      refresh();
      return;
    }

    launching = true;
    ui.notice = 'Preparing the observation point...';

    const token = ui.viewToken;

    refresh();

    try {
      const {
        GrandConspiracyScene
      } = await import('../../scenes/GrandConspiracyScene.js');

      if (
        !alive() ||
        !viewingMessage() ||
        ui.viewToken !== token ||
        completed()
      ) {
        return;
      }

      const latestQuest = getQuest();

      if (
        !['active', 'settling'].includes(latestQuest?.status) ||
        !piInventoryManager.hasItem('camera')
      ) {
        ui.notice =
          'The case or your equipment changed. Check your PI inventory.';

        return;
      }

      const game = ui.scene.game;

      if (game.scene.isActive(SCENE_KEY)) {
        ui.notice = 'The garden observation is already running.';
        return;
      }

      if (!game.scene.keys[SCENE_KEY]) {
        game.scene.add(
          SCENE_KEY,
          GrandConspiracyScene,
          false
        );
      }

      const field = game.scene.getScene(SCENE_KEY);

      const returnScenes = game.scene
        .getScenes(true)
        .map(scene => scene.sys.settings.key)
        .filter(key => key !== SCENE_KEY);

      let restored = false;

      const restore = () => {
        if (restored) return;

        restored = true;

        field.events.off('shutdown', restore);

        for (const key of returnScenes) {
          if (game.scene.isPaused(key)) {
            game.scene.resume(key);
          }
        }

        if (!destroyed && !ui.destroyed && ui.isOpen) {
          ui.resume();

          ui.notice = completed()
            ? 'Case closed. Perkins’s correspondence has been updated.'
            : 'Observation saved. Use the email to return to the garden.';

          ui.render();
        }

        if (restoreField === restore) {
          restoreField = null;
        }
      };

      restoreField = restore;

      field.events.once('shutdown', restore);

      try {
        ui.suspend();

        for (const key of returnScenes) {
          if (game.scene.isActive(key)) {
            game.scene.pause(key);
          }
        }

        game.scene.start(SCENE_KEY, {
          returnScenes
        });

        game.scene.bringToTop(SCENE_KEY);
      } catch (error) {
        if (game.scene.isActive(SCENE_KEY)) {
          game.scene.stop(SCENE_KEY);
        }

        restore();
        throw error;
      }
    } catch (error) {
      console.error(
        '[GrandConspiracyComputer] Could not open garden:',
        error
      );

      if (!destroyed && !ui.destroyed && ui.isOpen) {
        if (ui.suspended) ui.resume();

        ui.notice =
          'The garden could not be opened. ' +
          'Check the console and try again.';
      }
    } finally {
      launching = false;
      refresh();
    }
  }

  const render = function (...args) {
    const result = previousRender.apply(this, args);

    if (
      !viewingMessage() ||
      completed() ||
      !ui.window
    ) {
      return result;
    }

    const quest = getQuest();

    if (!['active', 'settling'].includes(quest?.status)) {
      return result;
    }

    const saved = progress();
    const continuing =
      saved.photos.length > 0 ||
      saved.talked ||
      saved.reportChoice;

    const label = launching
      ? 'PLEASE WAIT...'
      : continuing
        ? 'RETURN TO GARDEN'
        : 'GO TO GARDEN';

    const box = ui.window;

    ui.drawing.button(
      box.x + 312,
      box.y + box.h - 108,
      label,
      () => void launchGarden(),
      !launching && !ui.accepting
    );

    return result;
  };

  documents.getMail = getMail;
  documents.renderPagedText = renderPagedText;
  documents.render = render;

  const destroy = () => {
    if (destroyed) return;

    destroyed = true;

    // Nie przywracamy scen podczas zamykania biura.
    restoreField = null;

    if (documents.getMail === getMail) {
      documents.getMail = previousGetMail;
    }

    if (documents.renderPagedText === renderPagedText) {
      documents.renderPagedText = previousPagedText;
    }

    if (documents.render === render) {
      documents.render = previousRender;
    }

    ui.scene.events.off('shutdown', destroy);
  };

  ui.scene.events.once('shutdown', destroy);

  return {
    destroy
  };
}