import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { getGameTimeInSeconds } from '../CaseTimeHelper.js';
import { requestAutosave } from '../gameStatePersistence.js';

import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

const KEY = 'piOfficeShop';

export const NEW_PI_OFFICE_ID = 'office_new_premises';

const SUPPORTED = new Set([
  NEW_PI_OFFICE_ID,
  'office_case_files',
  'office_printer',
  'office_rolodex',
  'office_books',
  'office_chairs',
  'office_coffee',
  'office_crime_board',
  'office_notepad',
  'office_painting',
  'office_artifact',
  'office_tv'
]);

// Prestige levels: each level can give a bonus.
export const BASE_CASE_SLOTS = 1;

export const PRESTIGE_LEVELS = [
  { level: 0, min: 0,  name: 'Unknown',                payoutBonus: 0,    extraSlots: 0 },
  { level: 1, min: 10, name: 'Mentioned Once',         payoutBonus: 0,    extraSlots: 0 },
  { level: 2, min: 25, name: 'Locally Tolerated',      payoutBonus: 0.05, extraSlots: 0 },
  { level: 3, min: 40, name: 'Quietly Respected',      payoutBonus: 0.05, extraSlots: 1 },
  { level: 4, min: 50, name: 'Suspiciously Successful', payoutBonus: 0.10, extraSlots: 1 }
];

let busy = false;

const clone = value => JSON.parse(JSON.stringify(value));

const record = value =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value);

const integer = value =>
  Number.isSafeInteger(value) && value >= 0;

function state() {
  const raw = record(gameState[KEY]) ? gameState[KEY] : {};

  return {
    ...clone(raw),
    version: 2,
    owned: record(raw.owned) ? clone(raw.owned) : {},
    employee: record(raw.employee)
      ? clone(raw.employee)
      : null,
    moveInComplete: raw.moveInComplete === true
  };
}

function write(value) {
  gameState[KEY] = clone(value);
  requestAutosave();
}

function now() {
  const seconds = getGameTimeInSeconds();

  return Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
}

function validItem(item) {
  return (
    record(item) &&
    typeof item.id === 'string' &&
    /^[a-z][a-z0-9_]*$/.test(item.id) &&
    typeof item.name === 'string' &&
    Number.isSafeInteger(item.price) &&
    item.price > 0 &&
    item.purchaseType === 'one_time' &&
    item.maxOwned === 1
  );
}

export function ownsOfficeItem(id) {
  return Object.prototype.hasOwnProperty.call(
    state().owned,
    id
  );
}

export function ownsNewPIOffice() {
  return ownsOfficeItem(NEW_PI_OFFICE_ID);
}

export function needsOfficeMoveIn() {
  return ownsNewPIOffice() && !state().moveInComplete;
}

export function completeOfficeMoveIn() {
  if (!ownsNewPIOffice()) return false;

  const next = state();

  next.moveInComplete = true;
  write(next);

  return true;
}

/* ------------------------------------------------------------------ */
/* Bonuses calculated from owned items (catalog = piOfficeShop.json)   */
/* ------------------------------------------------------------------ */

function prestigeLevelFor(points) {
  let current = PRESTIGE_LEVELS[0];

  for (const level of PRESTIGE_LEVELS) {
    if (points >= level.min) current = level;
  }

  return current;
}

export function getOfficeBonuses(catalog) {
  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  const owned = state().owned;

  const result = {
    prestige: 0,
    score: 0,
    caseSlotsFromItems: 0,
    payoutMultiplierFromItems: 1
  };

  for (const item of items) {
    if (!record(item) || !Object.prototype.hasOwnProperty.call(owned, item.id)) continue;
    if (!Array.isArray(item.effects)) continue;

    for (const effect of item.effects) {
      if (!record(effect)) continue;

      if (effect.type === 'add_prestige' && integer(effect.amount)) {
        result.prestige += effect.amount;
      } else if (effect.type === 'add_score' && integer(effect.amount)) {
        result.score += effect.amount;
      } else if (effect.type === 'add_case_slots' && integer(effect.amount)) {
        result.caseSlotsFromItems += effect.amount;
      } else if (
        effect.type === 'job_payout_multiplier' &&
        Number.isFinite(effect.multiplier) &&
        effect.multiplier > 0
      ) {
        result.payoutMultiplierFromItems *= effect.multiplier;
      }
    }
  }

  return result;
}

export function getPrestigeStatus(catalog) {
  const bonuses = getOfficeBonuses(catalog);
  const points = bonuses.prestige;
  const level = prestigeLevelFor(points);
  const next = PRESTIGE_LEVELS.find(entry => entry.min > points) || null;

  const from = level.min;
  const to = next ? next.min : level.min;
  const ratio = next && to > from
    ? Math.min(1, Math.max(0, (points - from) / (to - from)))
    : 1;

  return {
    points,
    level: level.level,
    name: level.name,
    nextName: next ? next.name : null,
    nextAt: next ? next.min : null,
    ratio,
    maxed: !next
  };
}

export function getOfficeCaseSlots(catalog) {
  const bonuses = getOfficeBonuses(catalog);
  const level = prestigeLevelFor(bonuses.prestige);

  return BASE_CASE_SLOTS + bonuses.caseSlotsFromItems + level.extraSlots;
}

export function getOfficePayoutMultiplier(catalog) {
  const bonuses = getOfficeBonuses(catalog);
  const level = prestigeLevelFor(bonuses.prestige);

  return bonuses.payoutMultiplierFromItems * (1 + level.payoutBonus);
}

export function getOfficeScore(catalog) {
  return getOfficeBonuses(catalog).score;
}

/* ------------------------------------------------------------------ */
/* Shop                                                                */
/* ------------------------------------------------------------------ */

export function getOfficeShopAvailability(item) {
  if (!validItem(item)) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_51a08627366fb173036a")
    };
  }

  if (ownsOfficeItem(item.id)) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_17b760c41cd2093315bb")
    };
  }

  if (!SUPPORTED.has(item.id)) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_df0deffc8b279254aa6b")
    };
  }

  if (
    item.id !== NEW_PI_OFFICE_ID &&
    !ownsNewPIOffice()
  ) {
    return {
      enabled: false,
      reason:
        __dialogueText("managers/PIOfficeShopManager.js", "t_fb7a9aa0735ab400400b") +
        __dialogueText("managers/PIOfficeShopManager.js", "t_50fdaf8c61c64bb6dd1c")
    };
  }

  if (
    item.id !== NEW_PI_OFFICE_ID &&
    needsOfficeMoveIn()
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_49998c37dc2746b6ef54")
    };
  }

  if (
    Array.isArray(item.requires) &&
    item.requires.some(id => !ownsOfficeItem(id))
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_a8ef6788d938c9cca98b")
    };
  }

  if (
    !moneyManager.canAfford(
      item.price,
      MONEY_SOURCE.CASH
    )
  ) {
    return {
      enabled: false,
      reason: __dialogueText("managers/PIOfficeShopManager.js", "t_6150b8bb4551d17850e2")
    };
  }

  return {
    enabled: true,
    reason: ''
  };
}

export function buyOfficeItem(catalog, id) {
  if (busy) {
    return {
      ok: false,
      message: __dialogueText("managers/PIOfficeShopManager.js", "t_882d4fae9788ba4165d5")
    };
  }

  const item = Array.isArray(catalog?.items)
    ? catalog.items.find(entry => entry?.id === id)
    : null;

  const availability = getOfficeShopAvailability(item);

  if (!availability.enabled) {
    return {
      ok: false,
      message: availability.reason
    };
  }

  const previous = state();
  const balances = moneyManager.getState();

  busy = true;

  try {
    const next = clone(previous);

    next.owned[id] = {
      purchasedAt: now(),
      price: item.price
    };

    if (id === NEW_PI_OFFICE_ID) {
      next.moveInComplete = false;
    }

    gameState[KEY] = next;

    const result = moneyManager.spend(item.price, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.OFFICE_UPGRADE,
      description: `${__dialogueText("managers/PIOfficeShopManager.js", "t_9d3f4798a0ab9d436aeb")}${item.name}`,
      missionId: null,
      metadata: {
        officeItemId: id
      }
    });

    if (!result.ok) {
      write(previous);

      return {
        ok: false,
        message: __dialogueText("managers/PIOfficeShopManager.js", "t_6150b8bb4551d17850e2")
      };
    }

    write(next);

    return {
      ok: true,
      itemId: id,
      message:
        item.purchaseMessage ||
        __dialogueText("managers/PIOfficeShopManager.js", "t_b6282158152b94a2fa97")
    };
  } catch (error) {
    gameState.cash = balances.cash;
    gameState.moneyLog = balances.moneyLog;

    write(previous);

    console.error(
      '[PIOfficeShop] Purchase failed:',
      error
    );

    return {
      ok: false,
      message: __dialogueText("managers/PIOfficeShopManager.js", "t_6c9aaae91655b5495d21")
    };
  } finally {
    busy = false;
  }
}

// Zachowanie dochodu pracowników kupionych w starszych zapisach.
export function getEmployeeIncome() {
  const current = state();
  const employee = current.employee;

  if (
    !current.owned.office_employee ||
    !record(employee) ||
    !integer(employee.lastAccrualAt) ||
    !integer(employee.uncollected) ||
    !Number.isSafeInteger(employee.amountPerDay) ||
    employee.amountPerDay <= 0 ||
    !Number.isSafeInteger(employee.maxUncollected) ||
    employee.maxUncollected <= 0
  ) {
    return {
      hired: false,
      available: 0,
      nextInSeconds: null
    };
  }

  const time = now();
  const elapsed = Math.max(
    0,
    time - employee.lastAccrualAt
  );

  const days = Math.floor(elapsed / 86400);

  if (days > 0 && !busy) {
    employee.uncollected = Math.min(
      employee.maxUncollected,
      employee.uncollected +
        days * employee.amountPerDay
    );

    employee.lastAccrualAt += days * 86400;

    write(current);
  }

  return {
    hired: true,
    available: employee.uncollected,
    cap: employee.maxUncollected,
    amountPerDay: employee.amountPerDay,
    nextInSeconds: Math.max(
      0,
      employee.lastAccrualAt + 86400 - time
    )
  };
}

export function collectEmployeeIncome() {
  if (busy) {
    return {
      ok: false,
      message: __dialogueText("managers/PIOfficeShopManager.js", "t_882d4fae9788ba4165d5")
    };
  }

  const income = getEmployeeIncome();

  if (!income.available) {
    return {
      ok: false,
      message: __dialogueText("managers/PIOfficeShopManager.js", "t_1e7e2dbcd844a28ef2d1")
    };
  }

  const previous = state();
  const balances = moneyManager.getState();

  busy = true;

  try {
    const next = clone(previous);

    next.employee.uncollected = 0;
    gameState[KEY] = next;

    moneyManager.addCash(income.available, {
      category: ECONOMY_CATEGORY.SIDE_CASE,
      description:
        __dialogueText("managers/PIOfficeShopManager.js", "t_785f676e8f9eb1cdba5d"),
      missionId: null,
      metadata: {
        officeItemId: 'office_employee',
        passiveIncome: true
      }
    });

    write(next);

    return {
      ok: true,
      message:
        `${__dialogueText("managers/PIOfficeShopManager.js", "t_09fc96082d34c2dfc129")}${income.available}${__dialogueText("managers/PIOfficeShopManager.js", "t_51b8ae6abbabf07ef300")}` +
        __dialogueText("managers/PIOfficeShopManager.js", "t_5f6dc731355a8a193a50")
    };
  } catch (error) {
    gameState.cash = balances.cash;
    gameState.moneyLog = balances.moneyLog;

    write(previous);

    console.error(
      '[PIOfficeShop] Collection failed:',
      error
    );

    return {
      ok: false,
      message:
        __dialogueText("managers/PIOfficeShopManager.js", "t_e22946c9f993d8687387")
    };
  } finally {
    busy = false;
  }
}

export function getOfficeArchive(query = '') {
  if (!ownsOfficeItem('office_case_files')) {
    return [];
  }

  const quests = gameState.piQuests?.quests;

  if (!record(quests)) {
    return [];
  }

  const search = String(query).trim().toLowerCase();

  return Object.values(quests)
    .filter(
      quest =>
        record(quest) &&
        quest.status === 'completed'
    )
    .map(quest => ({
      id: quest.id,
      title: quest.title || quest.id,
      contact: quest.contact || '',
      description: quest.description || '',
      objectives: Array.isArray(quest.objectives)
        ? quest.objectives.map(objective => ({
            text: objective.text || '',
            completed: objective.completed === true
          }))
        : []
    }))
    .filter(
      quest =>
        !search ||
        JSON.stringify(quest)
          .toLowerCase()
          .includes(search)
    )
    .sort((a, b) =>
      String(a.title).localeCompare(String(b.title))
    );
}