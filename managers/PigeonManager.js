import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';

import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';

import {
  piInventoryManager as inventoryManager
} from './PIInventoryManager.js';

import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  PIGEON_CONFIG as C,
  PIGEON_FINDS
} from '../config/pigeonConfig.js';

import {
  loadPigeonCatalog,
  getPigeonCatalogItem,
  getPigeonCatalogStatus
} from './PigeonCatalog.js';

const KEY = 'pigeonLoft';
const ORDER = [3, 2, 1];

const clone = value =>
  JSON.parse(JSON.stringify(value));

let busy = false;

const fresh = () => ({
  version: 2,
  perches: 1,
  birds: [],
  collection: {},
  junkDiscarded: 0
});

function birdFor(index) {
  return {
    id: `pigeon_${index + 1}`,
    slot: ORDER[index],
    name:
      index === 0
        ? C.firstName
        : `${__dialogueText("managers/PigeonManager.js", "t_2b60ac66d5d909dc9c3b")}${index + 1}`,
    arrived: false,
    fed: false,
    departedAt: null,
    returnAt: null,
    findId: null,
    flights: 0
  };
}

function read() {
  const raw = gameState[KEY];

  if (raw == null) return fresh();

  let state = clone(raw);

  if (state.version === 1) {
    if (
      !Array.isArray(state.birds) ||
      state.birds.length > C.maxPigeons
    ) {
      throw Error('Invalid pigeon save.');
    }

    const previous = clone(state);

    state = {
      ...state,
      version: 2,
      perches: Math.max(1, state.birds.length),
      legacyBackup: previous,

      birds: state.birds.map((bird, index) => ({
        ...bird,
        slot: ORDER[index],
        fed: false,
        arrived:
          bird.returnAt != null ||
          (bird.flights || 0) > 0
      }))
    };
  }

  if (
    state.version !== 2 ||
    !Number.isInteger(state.perches) ||
    state.perches < 1 ||
    state.perches > C.maxPigeons ||
    !Array.isArray(state.birds) ||
    state.birds.length > state.perches
  ) {
    throw Error(
      'Pigeon save data could not be read. No changes were made.'
    );
  }

  const ids = new Set();
  const slots = new Set();

  for (const bird of state.birds) {
    if (
      typeof bird.id !== 'string' ||
      typeof bird.name !== 'string' ||
      ids.has(bird.id) ||
      slots.has(bird.slot) ||
      !ORDER.slice(0, state.perches).includes(bird.slot) ||
      (
        bird.returnAt != null &&
        (
          !Number.isFinite(bird.returnAt) ||
          !Number.isFinite(bird.departedAt) ||
          !PIGEON_FINDS.some(
            find => find.id === bird.findId
          )
        )
      )
    ) {
      throw Error('Invalid pigeon flight data.');
    }

    ids.add(bird.id);
    slots.add(bird.slot);
  }

  state.collection ??= {};
  state.junkDiscarded ??= 0;

  return state;
}

function write(state) {
  gameState[KEY] = clone(state);

  requestAutosave();
  flushAutosave();
}

function transaction(callback) {
  if (busy) {
    return {
      ok: false,
      message: __dialogueText("managers/PigeonManager.js", "t_5bb5f0f89f84e9410564")
    };
  }

  busy = true;

  let previous;
  let inventory;
  let selected;
  let money;

  try {
    previous =
      gameState[KEY] == null
        ? null
        : clone(gameState[KEY]);

    inventory = inventoryManager.exportState();

    selected =
      inventoryManager.getSelectedItem()?.id;

    money = clone(moneyManager.getState());

    return callback();
  } catch (error) {
    if (money) {
      gameState[KEY] = previous;
      gameState.cash = money.cash;
      gameState.moneyLog = money.moneyLog;

      inventoryManager.importState(inventory);

      if (selected) {
        inventoryManager.selectItem(selected);
      }

      requestAutosave();
      flushAutosave();
    }

    console.error('[PigeonManager]', error);

    return {
      ok: false,
      message:
        error.message ||
        __dialogueText("managers/PigeonManager.js", "t_e1ed61741b7922d0a590")
    };
  } finally {
    busy = false;
  }
}

function birdIn(state, id) {
  const bird = state.birds.find(
    entry => entry.id === id && entry.arrived
  );

  if (!bird) {
    throw Error(
      'There is no pigeon here yet. Add grain to attract one.'
    );
  }

  return bird;
}

function resolveFind(definition) {
  if (!definition) return null;

  const find = clone(definition);

  if (find.catalogRef) {
    const item = getPigeonCatalogItem(
      find.catalogRef
    );

    if (item) {
      find.item = item;
      find.name = item.name;
    }
  }

  return find;
}

function rollFind() {
  let roll =
    Math.random() *
    PIGEON_FINDS.reduce(
      (sum, find) => sum + find.weight,
      0
    );

  for (const find of PIGEON_FINDS) {
    roll -= find.weight;

    if (roll < 0) return find.id;
  }

  return PIGEON_FINDS[
    PIGEON_FINDS.length - 1
  ].id;
}

export function getPigeonLoft(time = Date.now()) {
  void loadPigeonCatalog();

  const state = read();

  if (gameState[KEY]?.version !== 2) {
    write(state);
  }

  const birds = state.birds
    .filter(bird => bird.arrived)
    .map(bird => ({
      ...bird,

      status:
        bird.returnAt == null
          ? 'home'
          : time >= bird.returnAt
            ? 'ready'
            : 'flying',

      remainingMs:
        bird.returnAt == null
          ? 0
          : Math.max(0, bird.returnAt - time),

      find:
        bird.returnAt != null &&
        time >= bird.returnAt
          ? resolveFind(
              PIGEON_FINDS.find(
                find => find.id === bird.findId
              )
            )
          : null
    }));

  return {
    ...state,
    birds,

    feed:
      inventoryManager.getItem(C.feedId)
        ?.quantity || 0,

    feederFull: birds.some(
      bird => bird.fed
    ),

    nextPerchPrice:
      state.perches < C.maxPigeons
        ? C.extraPerchPrices[state.perches - 1] ?? null
        : null,

    slots: ORDER.map((slot, index) => ({
      slot,
      owned: index < state.perches,
      bird:
        birds.find(
          bird => bird.slot === slot
        ) || null
    }))
  };
}

export function feedPigeon(slot) {
  return transaction(() => {
    const state = read();

    const index = ORDER.indexOf(
      Number(slot)
    );

    if (
      index < 0 ||
      index >= state.perches
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_bd26ea61ff4b9482fae1")
      };
    }

    let bird = state.birds.find(
      entry => entry.slot === Number(slot)
    );

    if (bird?.returnAt != null) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_1dc447da802adef6ac8b")
      };
    }

    if (bird?.fed) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_b3b69dfb29403e1488f7")
      };
    }

    if (!inventoryManager.hasItem(C.feedId)) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_224fca6c760e5d6ce12e")
      };
    }

    if (
      !inventoryManager.removeQuantity(
        C.feedId,
        1
      )
    ) {
      throw Error(
        'The grain could not be poured.'
      );
    }

    if (!bird) {
      bird = birdFor(index);
      state.birds.push(bird);
    }

    const newcomer = !bird.arrived;

    bird.arrived = true;
    bird.fed = true;

    write(state);

    return {
      ok: true,
      message:
        newcomer
          ? `${bird.name}${__dialogueText("managers/PigeonManager.js", "t_c6230b52e0d5d490d110")}`
          : `${bird.name}${__dialogueText("managers/PigeonManager.js", "t_f36129ca95b7d896e8cd")}`
    };
  });
}

export function renamePigeon(id, value) {
  return transaction(() => {
    if (typeof value !== 'string') {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_099f9079ba79b8510abc")
      };
    }

    const name = value
      .replace(/[\x00-\x1f\x7f]/g, '')
      .trim()
      .slice(0, C.maxNameLength);

    if (!name) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_7621037826c509605be3")
      };
    }

    const state = read();

    birdIn(state, id).name = name;

    write(state);

    return {
      ok: true,
      message: `${name}${__dialogueText("managers/PigeonManager.js", "t_184d2a87c69afa682690")}`
    };
  });
}

export function sendPigeon(id) {
  void loadPigeonCatalog();

  return transaction(() => {
    const state = read();
    const bird = birdIn(state, id);

    if (bird.returnAt != null) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_e01f860c320980164f21")
      };
    }

    if (!bird.fed) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_8fc8b21c3cdbc4ec696d")
      };
    }

    const catalog = getPigeonCatalogStatus();

    if (!catalog.ready) {
      return {
        ok: false,
        message:
          catalog.error ||
          __dialogueText("managers/PigeonManager.js", "t_5716df0f12260f7fe239")
      };
    }

    const now = Date.now();

    Object.assign(bird, {
      fed: false,
      departedAt: now,
      returnAt: now + C.flightMs,
      findId: rollFind()
    });

    write(state);

    return {
      ok: true,
      message:
        `${bird.name}${__dialogueText("managers/PigeonManager.js", "t_23eb53af2a5c86d5dde1")}` +
        __dialogueText("managers/PigeonManager.js", "t_e8e1069dd9789f94975c")
    };
  });
}

export function collectPigeonFind(id) {
  void loadPigeonCatalog();

  return transaction(() => {
    const state = read();
    const bird = birdIn(state, id);

    if (
      bird.returnAt == null ||
      Date.now() < bird.returnAt
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_bb9f5e0255bc9f21df62")
      };
    }

    const find = resolveFind(
      PIGEON_FINDS.find(
        entry => entry.id === bird.findId
      )
    );

    if (!find) {
      throw Error(
        'The find could not be identified.'
      );
    }

    if (find.kind === 'usable') {
      if (!find.item) {
        return {
          ok: false,
          message:
            getPigeonCatalogStatus().error ||
            __dialogueText("managers/PigeonManager.js", "t_c97c9c7d001413440dca")
        };
      }

      const item =
        inventoryManager.getItem(find.item.id);

      const capacity =
        inventoryManager.getCapacity();

      if (
        (
          item &&
          (
            !item.stackable ||
            item.quantity >= 999
          )
        ) ||
        (
          !item &&
          capacity.current >= capacity.max
        )
      ) {
        return {
          ok: false,
          message: __dialogueText("managers/PigeonManager.js", "t_b8be069865ef28a52b44")
        };
      }

      if (
        !inventoryManager.addItem({
          ...clone(find.item),
          quantity: 1
        })
      ) {
        throw Error(
          'The find could not be added.'
        );
      }
    } else if (find.kind === 'collection') {
      const count =
        Object.prototype.hasOwnProperty.call(
          state.collection,
          find.id
        )
          ? state.collection[find.id]
          : 0;

      state.collection[find.id] =
        Math.max(0, Number(count) || 0) + 1;
    } else {
      state.junkDiscarded++;
    }

    bird.flights =
      (bird.flights || 0) + 1;

    Object.assign(bird, {
      departedAt: null,
      returnAt: null,
      findId: null
    });

    write(state);

    return {
      ok: true,
      find: clone(find),
      message:
        find.kind === __dialogueText("managers/PigeonManager.js", "t_ef875a1705a5fdac206b")
          ? `${find.name}${__dialogueText("managers/PigeonManager.js", "t_45822f54a0d0e030f756")}${find.description}${__dialogueText("managers/PigeonManager.js", "t_3a10bf8281679f9343c0")}`
          : `${find.name}${__dialogueText("managers/PigeonManager.js", "t_3f7634658a37e802376a")}${
              find.kind === __dialogueText("managers/PigeonManager.js", "t_fa7496e4ae840306df41")
                ? __dialogueText("managers/PigeonManager.js", "t_92140299973b6abcd241")
                : __dialogueText("managers/PigeonManager.js", "t_4dccd757d0eca2f1f5e5")
            }${__dialogueText("managers/PigeonManager.js", "t_cdb4ee2aea69cc6a8333")}`
    };
  });
}

export function buyPigeonPerch() {
  return transaction(() => {
    const state = read();

    const price =
      C.extraPerchPrices[state.perches - 1];

    if (
      state.perches >= C.maxPigeons ||
      !Number.isSafeInteger(price)
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_b3a68fb156733ae8dd8e")
      };
    }

    if (
      !moneyManager.canAfford(
        price,
        MONEY_SOURCE.CASH
      )
    ) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_6150b8bb4551d17850e2")
      };
    }

    const purchase = moneyManager.spend(
      price,
      {
        source: MONEY_SOURCE.CASH,
        category: ECONOMY_CATEGORY.OFFICE_UPGRADE,
        description: __dialogueText("managers/PigeonManager.js", "t_f71cf0468b33c076ccf4"),
        missionId: null,
        metadata: {
          pigeonLoft: true,
          slot: ORDER[state.perches]
        }
      }
    );

    if (!purchase.ok) {
      return {
        ok: false,
        message: __dialogueText("managers/PigeonManager.js", "t_6150b8bb4551d17850e2")
      };
    }

    state.perches++;

    write(state);

    return {
      ok: true,
      message: __dialogueText("managers/PigeonManager.js", "t_b25d7cc769e7a22b73a6")
    };
  });
}