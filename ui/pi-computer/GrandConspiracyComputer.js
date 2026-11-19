import {
  dialogueText as __dialogueText
} from '../../dialogues/DialogueText.js';

import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { getPIQuest } from '../../managers/PIQuestManager.js';
import { piInventoryManager } from '../../managers/PIInventoryManager.js';

import {
  HOME_TOWN_ID,
  getTown
} from '../../config/RoadTripTowns.js';

import {
  getCurrentTownId,
  canStartRoadTrip
} from '../../managers/RoadTripManager.js';

import {
  LocalAreaDestinationsUI
} from '../LocalAreaDestinationsUI.js';

const SOURCE = 'ui/pi-computer/GrandConspiracyComputer.js';
const CASE_ID = 'pi_grand_conspiracy';
const MESSAGE_ID = 'grand_conspiracy_perkins_briefing';

const DRIVE = 'DriveScene';
const GARDEN = 'GrandConspiracyScene';
const ARRIVAL = 'PILocalAreaArrivalScene';
const TRIP_SCENES = [DRIVE, GARDEN, ARRIVAL];

const BORED_NOTICE = 'You got there. You got bored.';

export const GRAND_CONSPIRACY_TOWN_ID = 'whateverville';

const sessions = new Map();
let nextSession = 0;

const t = id => __dialogueText(SOURCE, id);
const text = (...ids) => ids.map(t).join('');
const getQuest = () => getPIQuest(CASE_ID);

const completed = () =>
  getQuest()?.status === 'completed' ||
  gameState.piGrandConspiracy?.completed === true;

const questInProgress = () =>
  ['active', 'settling'].includes(getQuest()?.status);

function canVisitGarden(townId) {
  return (
    townId === GRAND_CONSPIRACY_TOWN_ID &&
    !completed() &&
    questInProgress() &&
    piInventoryManager.hasItem('camera')
  );
}

function progress() {
  const saved = gameState.piGrandConspiracy;

  return saved?.version === 3
    ? {
        ...saved,
        photos: Array.isArray(saved.photos) ? saved.photos : []
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
        saved.photos.length || saved.talked || saved.reportChoice
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
    body: body + (done ? '' : '\n\n' + t('local_address'))
  };
}

class LocalAreaArrivalScene extends Phaser.Scene {
  constructor() {
    super({ key: ARRIVAL });
  }

  init(data = {}) {
    this.arrivalData = data;
  }

  create() {
    const session = sessions.get(this.arrivalData.localAreaSession);

    if (!session) {
      this.scene.start('DetectiveOfficeScene');
      return;
    }

    try {
      session.arrive(this, this.arrivalData.leg);
    } catch (error) {
      session.fail(error);
      this.scene.stop();
    }
  }
}

export function installGrandConspiracyComputer(ui, documents) {
  let destroyed = false;
  let busy = false;
  let map = null;
  let trip = null;
  let gardenShutdown = null;

  const owner = ui.scene;
  const game = owner.game;
  const desktop = ui.desktop;

  const previous = {
    getMail: documents.getMail,
    render: documents.render,
    paged: documents.renderPagedText,
    desktop: desktop.render,
    glyph: desktop.drawGlyph,
    openLocalArea: ui.openLocalArea
  };

  function alive() {
    return (
      !destroyed &&
      !ui.destroyed &&
      ui.isOpen &&
      owner.sys.isActive()
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
    if (alive() && !ui.suspended) {
      ui.render();
    }
  }

  // Dostępność przejazdu jest niezależna od dostępu do ogrodu.
  // LocalAreaDestinationsUI osobno wyświetla koszt i brak paliwa.
  function availability(town) {
    const alreadyThere = town.id === getCurrentTownId();
    const isHome = town.id === HOME_TOWN_ID;

    return {
      ok: !alreadyThere || canVisitGarden(town.id),
      description: '',
      message: alreadyThere
        ? (isHome ? t('already_home') : 'You are already here.')
        : '',
      label: isHome ? t('drive_home') : `Drive to ${town.name}`
    };
  }

  function checkDeparture(town) {
    const access = availability(town);
    if (!access.ok) return access;

    const fromId = getCurrentTownId();
    if (town.id === fromId) return { ok: true };

    return canStartRoadTrip(fromId, town.id);
  }

  function restoreComputer() {
    if (destroyed || ui.destroyed) return;

    owner.computerChild = null;
    owner.childLoading = false;

    if (typeof owner.returnToComputer === 'function') {
      owner.returnToComputer();
    } else if (ui.isOpen) {
      ui.resume();
    }

    owner.hideGameplayHud?.();
  }

  function openLocalArea({ fromMessage = false } = {}) {
    if (
      !alive() ||
      ui.suspended ||
      busy ||
      trip ||
      owner.navigating ||
      owner.moveIn ||
      owner.computerChild ||
      owner.childLoading
    ) {
      return false;
    }

    owner.computerChild = 'local-area';
    ui.suspend();

    try {
      if (!map || map.isDestroyed) {
        map = new LocalAreaDestinationsUI(owner, {
          getAvailability: availability,
          onConfirm: depart,
          onClose: ({ returnToComputer } = {}) => {
            if (returnToComputer && !trip) {
              restoreComputer();
            }
          }
        });
      }

      map.open();

      if (!map.isOpen) {
        throw new Error('Local map did not open.');
      }

      if (fromMessage) {
        const town = getTown(GRAND_CONSPIRACY_TOWN_ID);
        const pin = map.pins.find(entry => entry.town.id === town.id);
        if (pin) map.selectTown(town, pin);
      } else if (canVisitGarden(getCurrentTownId())) {
        // Pinezka aktualnego miasta nie jest klikalna, więc wybieramy
        // ją tu, żeby można było wejść do ogrodu bez drugiej opłaty.
        const town = getTown(getCurrentTownId());
        const pin = map.pins.find(entry => entry.town.id === town.id);
        if (pin) map.selectTown(town, pin);
      }

      owner.hideGameplayHud?.();
      return true;
    } catch (error) {
      console.error('[LocalArea] Map failed:', error);
      if (map?.isOpen) map.close({ restoreHud: false });
      restoreComputer();
      ui.notice = t('map_error');
      refresh();
      return false;
    }
  }

  async function prepareScenes() {
    const [
      { DriveScene },
      { GrandConspiracyScene }
    ] = await Promise.all([
      import('../../scenes/DriveScene.js'),
      import('../../scenes/GrandConspiracyScene.js')
    ]);

    for (const [key, Scene] of [
      [DRIVE, DriveScene],
      [GARDEN, GrandConspiracyScene],
      [ARRIVAL, LocalAreaArrivalScene]
    ]) {
      if (!game.scene.keys[key]) {
        game.scene.add(key, Scene, false);
      }
    }
  }

  function detachGardenShutdown() {
    if (!gardenShutdown) return;

    game.scene.keys[GARDEN]?.events.off('shutdown', gardenShutdown);
    gardenShutdown = null;
  }

  function releaseTrip(notice) {
    if (!trip) return;

    const finished = trip;
    trip = null;
    sessions.delete(finished.id);
    detachGardenShutdown();

    for (const key of finished.returnScenes) {
      if (game.scene.isPaused(key)) {
        game.scene.resume(key);
      }
    }

    if (!destroyed && !ui.destroyed) {
      restoreComputer();
      game.scene.bringToTop(owner.sys.settings.key);
      ui.notice = notice;
      refresh();
    }
  }

  function homeNotice() {
    return t(completed() ? 'back_completed' : 'back_office');
  }

  function failTrip(error) {
    console.error('[LocalArea] Journey interrupted:', error);

    if (trip) {
      releaseTrip(t('trip_error'));
    } else if (map?.isOpen) {
      map.showError(t('trip_error'));
    } else if (alive()) {
      restoreComputer();
      ui.notice = t('trip_error');
      refresh();
    }
  }

  function driveTo(toId, leg) {
    if (!trip || destroyed) return;

    const fromId = getCurrentTownId();

    if (fromId === toId) {
      if (leg === 'home') {
        releaseTrip(homeNotice());
      } else if (canVisitGarden(toId)) {
        enterGarden();
      } else {
        releaseTrip(BORED_NOTICE);
      }
      return;
    }

    // Sprawdzamy też powrót z ogrodu: nie uruchamiamy przejazdu
    // bez paliwa i nie przenosimy gracza za darmo do Home Town.
    const check = canStartRoadTrip(fromId, toId);
    if (!check.ok) {
      releaseTrip(check.message);
      return;
    }

    trip.phase = leg;

    game.scene.start(DRIVE, {
      fromTownId: fromId,
      toTownId: toId,
      nextScene: ARRIVAL,
      nextData: {
        localAreaSession: trip.id,
        leg
      }
    });

    game.scene.bringToTop(DRIVE);
  }

  function enterGarden(arrivalScene = null) {
    if (!trip || destroyed) return;

    if (!canVisitGarden(getCurrentTownId())) {
      arrivalScene?.scene.stop();
      releaseTrip(BORED_NOTICE);
      return;
    }

    trip.phase = 'garden';

    const garden = game.scene.getScene(GARDEN);

    gardenShutdown = () => {
      gardenShutdown = null;
      const id = trip?.id;

      setTimeout(() => {
        if (!destroyed && trip?.id === id) {
          try {
            driveTo(HOME_TOWN_ID, 'home');
          } catch (error) {
            failTrip(error);
          }
        }
      }, 0);
    };

    garden.events.once('shutdown', gardenShutdown);

    const data = {
      returnScenes: [],
      townId: GRAND_CONSPIRACY_TOWN_ID,
      missionId: CASE_ID
    };

    if (arrivalScene) {
      arrivalScene.scene.start(GARDEN, data);
    } else {
      game.scene.start(GARDEN, data);
    }

    game.scene.bringToTop(GARDEN);
  }

  async function depart(town) {
    if (destroyed || busy || trip || !map?.isOpen) {
      return false;
    }

    const initialCheck = checkDeparture(town);
    if (!initialCheck.ok) {
      map.showError(initialCheck.message);
      return false;
    }

    busy = true;

    try {
      await prepareScenes();

      if (destroyed || ui.destroyed || !map?.isOpen) {
        return false;
      }

      const check = checkDeparture(town);
      if (!check.ok) {
        map.showError(check.message);
        return false;
      }

      if (TRIP_SCENES.some(key =>
        game.scene.isActive(key) || game.scene.isPaused(key)
      )) {
        map.showError(t('trip_busy'));
        return false;
      }

      const id = `local-area-${Date.now()}-${++nextSession}`;

      trip = {
        id,
        phase: 'starting',
        returnScenes: game.scene
          .getScenes(true)
          .map(scene => scene.sys.settings.key)
          .filter(key => !TRIP_SCENES.includes(key))
      };

      sessions.set(id, {
        fail: failTrip,

        arrive: (arrivalScene, leg) => {
          if (!trip || trip.id !== id) {
            arrivalScene.scene.stop();
            return;
          }

          requestAutosave();

          if (leg === 'home') {
            arrivalScene.scene.stop();
            releaseTrip(homeNotice());
          } else if (canVisitGarden(getCurrentTownId())) {
            enterGarden(arrivalScene);
          } else {
            // DriveScene już rozliczyła trasę i zapisała miasto.
            // Wracamy do interfejsu komputera, nie jedziemy do domu.
            arrivalScene.scene.stop();
            releaseTrip(BORED_NOTICE);
          }
        }
      });

      map.close({ restoreHud: false });
      owner.computerChild = 'local-area-trip';

      for (const key of trip.returnScenes) {
        if (game.scene.isActive(key)) {
          game.scene.pause(key);
        }
      }

      driveTo(town.id, town.id === HOME_TOWN_ID ? 'home' : 'outbound');
      return true;
    } catch (error) {
      failTrip(error);
      return false;
    } finally {
      busy = false;
    }
  }

  const getMail = function (...args) {
    const original = previous.getMail.apply(this, args);
    const messages = (Array.isArray(original) ? original : [])
      .filter(message => message?.id !== MESSAGE_ID);

    return getQuest() ? [getMessage(), ...messages] : messages;
  };

  const paged = function (content, x, y, width, height) {
    const reserve = viewingMessage() && !completed() ? 64 : 0;

    return previous.paged.call(
      this, content, x, y, width, Math.max(40, height - reserve)
    );
  };

  const render = function (...args) {
    const result = previous.render.apply(this, args);

    if (viewingMessage() && !completed() && ui.window && questInProgress()) {
      const box = ui.window;

      ui.drawing.button(
        box.x + 312,
        box.y + box.h - 108,
        t('open_local_map'),
        () => openLocalArea({ fromMessage: true }),
        !busy && !ui.accepting
      );
    }

    return result;
  };

  const renderDesktop = function (...args) {
    const result = previous.desktop.apply(this, args);
    const { x, y } = ui.layout;

    this.createIcon(
      x + 152,
      y + 10,
      128,
      t('local_area_icon'),
      'local-road',
      0xc6ad72,
      () => openLocalArea()
    );

    return result;
  };

  const drawGlyph = function (g, kind, cx, top, color) {
    if (kind !== 'local-road') {
      return previous.glyph.call(this, g, kind, cx, top, color);
    }

    g.fillStyle(0x1b2530, 0.35).fillRect(cx - 23, top + 9, 52, 44);
    g.fillStyle(color, 1).fillRect(cx - 27, top + 4, 52, 44);
    g.lineStyle(2, 0x1b2530, 1).strokeRect(cx - 27, top + 4, 52, 44);

    g.lineStyle(9, 0x605b54, 1);
    g.lineBetween(cx - 21, top + 40, cx, top + 25);
    g.lineBetween(cx, top + 25, cx + 19, top + 12);

    g.lineStyle(2, 0xf5e6b0, 1);
    g.lineBetween(cx - 17, top + 37, cx - 10, top + 32);
    g.lineBetween(cx - 4, top + 28, cx + 3, top + 23);
    g.lineBetween(cx + 9, top + 19, cx + 16, top + 14);

    g.fillStyle(0x9c3428, 1).fillCircle(cx + 17, top + 12, 5);
  };

  documents.getMail = getMail;
  documents.renderPagedText = paged;
  documents.render = render;
  desktop.render = renderDesktop;
  desktop.drawGlyph = drawGlyph;
  ui.openLocalArea = openLocalArea;

  function destroy() {
    if (destroyed) return;
    destroyed = true;

    map?.destroy();
    map = null;

    detachGardenShutdown();

    if (trip) {
      sessions.delete(trip.id);
      trip = null;
    }

    if (documents.getMail === getMail) {
      documents.getMail = previous.getMail;
    }
    if (documents.render === render) {
      documents.render = previous.render;
    }
    if (documents.renderPagedText === paged) {
      documents.renderPagedText = previous.paged;
    }
    if (desktop.render === renderDesktop) {
      desktop.render = previous.desktop;
    }
    if (desktop.drawGlyph === drawGlyph) {
      desktop.drawGlyph = previous.glyph;
    }

    if (ui.openLocalArea === openLocalArea) {
      if (previous.openLocalArea === undefined) {
        delete ui.openLocalArea;
      } else {
        ui.openLocalArea = previous.openLocalArea;
      }
    }

    owner.events.off('shutdown', destroy);
  }

  owner.events.once('shutdown', destroy);

  return { destroy, openLocalArea };
}