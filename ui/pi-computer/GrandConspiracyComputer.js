import {
  dialogueText as __dialogueText
} from '../../dialogues/DialogueText.js';

import {
  gameState
} from '../../GameData.js';

import {
  requestAutosave
} from '../../gameStatePersistence.js';

import {
  getPIQuest
} from '../../managers/PIQuestManager.js';

import {
  piInventoryManager
} from '../../managers/PIInventoryManager.js';

import {
  registerLocalAreaLocation
} from '../../managers/LocalAreaLocations.js';

import {
  localAreaText
} from '../../dialogues/LocalAreaText.js';

const SOURCE =
  'ui/pi-computer/GrandConspiracyComputer.js';

const CASE_ID = 'pi_grand_conspiracy';

const MESSAGE_ID =
  'grand_conspiracy_perkins_briefing';

const GARDEN_KEY =
  'PILocalGrandConspiracyScene';

export const GRAND_CONSPIRACY_TOWN_ID =
  'whateverville';

const t = id =>
  __dialogueText(SOURCE, id);

const text = (...ids) =>
  ids.map(t).join('');

const getQuest = () =>
  getPIQuest(CASE_ID);

const completed = () =>
  getQuest()?.status === 'completed' ||
  gameState.piGrandConspiracy?.completed === true;

const questInProgress = () =>
  ['active', 'settling'].includes(
    getQuest()?.status
  );

// The mission contributes a location.
// It does not own the map or any journey.

registerLocalAreaLocation({
  id: 'grand-conspiracy-garden',

  townId: GRAND_CONSPIRACY_TOWN_ID,

  label: localAreaText('garden'),

  getAccess() {
    if (completed()) {
      return {
        ok: false,
        message: localAreaText('closedCase')
      };
    }

    if (!questInProgress()) {
      return {
        ok: false,
        message: localAreaText('activeCase')
      };
    }

    if (!piInventoryManager.hasItem('camera')) {
      return {
        ok: false,
        message: localAreaText('camera')
      };
    }

    return {
      ok: true,
      message: ''
    };
  },

  async load() {
    const {
      GrandConspiracyScene
    } = await import(
      '../../scenes/GrandConspiracyScene.js'
    );

    class LocalGrandConspiracyScene
      extends GrandConspiracyScene {

      constructor() {
        super();

        this.sys.settings.key =
          GARDEN_KEY;
      }

      leave() {
        if (
          this.transitioning ||
          this.submitting
        ) {
          return;
        }

        this.transitioning = true;

        requestAutosave();

        const scenes = [
          ...this.returnScenes
        ];

        const game = this.game;

        this.scene.stop();

        for (const key of scenes) {
          if (game.scene.isPaused(key)) {
            game.scene.resume(key);
          }

          if (game.scene.keys[key]) {
            game.scene.bringToTop(key);
          }
        }
      }
    }

    return {
      key: GARDEN_KEY,

      Scene: LocalGrandConspiracyScene,

      data: {
        townId: GRAND_CONSPIRACY_TOWN_ID,
        missionId: CASE_ID
      }
    };
  }
});

function progress() {
  const saved = gameState.piGrandConspiracy;

  return saved?.version === 3
    ? {
        ...saved,
        photos: Array.isArray(saved.photos)
          ? saved.photos
          : []
      }
    : {
        photos: [],
        talked: false,
        reportChoice: null
      };
}

function getMessage() {
  const saved = progress();
  const done = completed();

  const body = done
    ? text(
        't_22a705e57674f27a7c07',
        't_e6f0ca8de7cece60c349'
      ) +
      (
        saved.reportChoice === 'honest'
          ? text(
              't_4493e6d79fa28026813d',
              't_6bf9427abeb6339928b3'
            )
          : text(
              't_1141ef1e915913f3c02f',
              't_b637cbc9d8d2df264d81'
            )
      ) +
      text(
        't_96ec435ff96ffcb428eb',
        't_cce6220558292e78a497',
        't_224ffed80717c616344d',
        't_384a65f7e2d20fbed47e',
        't_d5a0ccfdb83a338fcc96',
        't_c1bf1abc75c5f14ecee1',
        't_474b6dd194b3434b9ee9'
      )
    : text(
        't_22a705e57674f27a7c07',
        't_4794944719af86578651',
        't_7036eed943148ab6f536',
        't_8b71b5fecb450db43e3e',
        't_ea7a16f2b9f96f5cc56b',
        't_c46bf3fdbc458ae42d9c',
        't_67680d10b5e245524bf2',
        't_be9359fdd870b9df5044',
        't_2f341963a371c15308ac',
        't_d8f710e2ae1829651195',
        't_5f1aa7bfa6b83a7e0358',
        't_d42c70b072bad56b702f',
        't_224ffed80717c616344d'
      ) +
      (
        saved.photos.length ||
        saved.talked ||
        saved.reportChoice
          ? text(
              't_717b0a92c8ef38d4316e',
              't_4f3a23c7a041095a7b8e'
            )
          : t('t_874d9848c5eadfc97a9d')
      );

  return {
    id: MESSAGE_ID,

    from: t('t_7e7175baf6d66a9479a7'),

    subject: t(
      done
        ? 't_10992ad944154c0e9f61'
        : 't_cb9dd88d4dadcbef23b8'
    ),

    date: t('t_9a264749f9d43669aac5'),

    body:
      body +
      (
        done
          ? ''
          : '\n\n' + t('local_address')
      )
  };
}

export function installGrandConspiracyComputer(
  ui,
  documents
) {
  let destroyed = false;

  const previous = {
    getMail: documents.getMail,
    render: documents.render,
    paged: documents.renderPagedText
  };

  const viewingMessage = () =>
    ui.app === 'mail' &&
    ui.selectedId === MESSAGE_ID &&
    Boolean(getQuest());

  const getMail = function (...args) {
    const original =
      previous.getMail.apply(this, args);

    const messages = (
      Array.isArray(original)
        ? original
        : []
    ).filter(
      message => message?.id !== MESSAGE_ID
    );

    return getQuest()
      ? [getMessage(), ...messages]
      : messages;
  };

  const paged = function (
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

    return previous.paged.call(
      this,
      content,
      x,
      y,
      width,
      Math.max(40, height - reserve)
    );
  };

  const render = function (...args) {
    const result =
      previous.render.apply(this, args);

    if (
      viewingMessage() &&
      !completed() &&
      questInProgress() &&
      ui.window
    ) {
      const box = ui.window;

      ui.drawing.button(
        box.x + 312,
        box.y + box.h - 108,
        t('open_local_map'),

        () => void ui.openLocalArea?.({
          townId: GRAND_CONSPIRACY_TOWN_ID
        }),

        !ui.accepting
      );
    }

    return result;
  };

  documents.getMail = getMail;
  documents.renderPagedText = paged;
  documents.render = render;

  function destroy() {
    if (destroyed) return;

    destroyed = true;

    if (documents.getMail === getMail) {
      documents.getMail =
        previous.getMail;
    }

    if (documents.render === render) {
      documents.render =
        previous.render;
    }

    if (
      documents.renderPagedText === paged
    ) {
      documents.renderPagedText =
        previous.paged;
    }

    ui.scene.events.off(
      'shutdown',
      destroy
    );
  }

  ui.scene.events.once(
    'shutdown',
    destroy
  );

  return {
    destroy,

    openLocalArea: options =>
      ui.openLocalArea?.(options)
  };
}