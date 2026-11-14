import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
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
      from: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_7e7175baf6d66a9479a7"),
      subject: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_10992ad944154c0e9f61"),
      date: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_9a264749f9d43669aac5"),

      body:
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_22a705e57674f27a7c07") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_e6f0ca8de7cece60c349") +
        (
          saved.reportChoice === __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_979c4b8a301d4b861f0e")
            ? __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4493e6d79fa28026813d") +
              __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_6bf9427abeb6339928b3")
            : __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_1141ef1e915913f3c02f") +
              __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_b637cbc9d8d2df264d81")
        ) +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_96ec435ff96ffcb428eb") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_cce6220558292e78a497") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_224ffed80717c616344d") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_384a65f7e2d20fbed47e") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_d5a0ccfdb83a338fcc96") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_c1bf1abc75c5f14ecee1") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_474b6dd194b3434b9ee9")
    };
  }

  const continuing =
    saved.photos.length > 0 ||
    saved.talked ||
    saved.reportChoice;

  return {
    id: MESSAGE_ID,
    from: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_7e7175baf6d66a9479a7"),
    subject: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_cb9dd88d4dadcbef23b8"),
    date: __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_9a264749f9d43669aac5"),

    body:
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_22a705e57674f27a7c07") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4794944719af86578651") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_7036eed943148ab6f536") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_8b71b5fecb450db43e3e") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_ea7a16f2b9f96f5cc56b") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_c46bf3fdbc458ae42d9c") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_67680d10b5e245524bf2") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_be9359fdd870b9df5044") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_2f341963a371c15308ac") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_d8f710e2ae1829651195") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_5f1aa7bfa6b83a7e0358") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_d42c70b072bad56b702f") +
      __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_224ffed80717c616344d") +
      (
        continuing
          ? __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_717b0a92c8ef38d4316e") +
            __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4f3a23c7a041095a7b8e")
          : __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_874d9848c5eadfc97a9d")
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
      ui.notice = __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_fc7e9027839ed1168d90");
      refresh();
      return;
    }

    if (!piInventoryManager.hasItem('camera')) {
      ui.notice =
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4b83eeecb2de5fa8424f") +
        __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4fb74221ace618bce53c");

      refresh();
      return;
    }

    launching = true;
    ui.notice = __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_5eb532a3dbd492414819");

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
          __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_f5a40efc30b53d6af9f1");

        return;
      }

      const game = ui.scene.game;

      if (game.scene.isActive(SCENE_KEY)) {
        ui.notice = __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_2820f24f6109dfa7bafa");
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
            ? __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_3f693474e5fd082c9494")
            : __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_4985b5af4eccbde03084");

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
          __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_152abc52996ef9695c09") +
          __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_7d60682b3500b0323977");
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
      ? __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_9dafd8f8b8d7f70bc7f6")
      : continuing
        ? __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_47f77acdeca0a8aec820")
        : __dialogueText("ui/pi-computer/GrandConspiracyComputer.js", "t_ca92ebd85203832c6bf3");

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