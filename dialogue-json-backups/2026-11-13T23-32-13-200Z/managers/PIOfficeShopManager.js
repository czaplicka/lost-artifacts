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
  'office_books',
  'office_chairs',
  'office_coffee',
  'office_crime_board',
  'office_notepad',
  'office_painting',
  'office_artifact',
  'office_tv'
]);

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

export function getOfficeShopAvailability(item) {
  if (!validItem(item)) {
    return {
      enabled: false,
      reason: 'Invalid product data.'
    };
  }

  if (ownsOfficeItem(item.id)) {
    return {
      enabled: false,
      reason: 'Owned'
    };
  }

  if (!SUPPORTED.has(item.id)) {
    return {
      enabled: false,
      reason: 'Unavailable in this shop.'
    };
  }

  if (
    item.id !== NEW_PI_OFFICE_ID &&
    !ownsNewPIOffice()
  ) {
    return {
      enabled: false,
      reason:
        'Buy the New PI Office first. ' +
        'Your current office is technically a cupboard.'
    };
  }

  if (
    item.id !== NEW_PI_OFFICE_ID &&
    needsOfficeMoveIn()
  ) {
    return {
      enabled: false,
      reason: 'Finish moving into your new office first.'
    };
  }

  if (
    Array.isArray(item.requires) &&
    item.requires.some(id => !ownsOfficeItem(id))
  ) {
    return {
      enabled: false,
      reason: 'Required upgrade missing.'
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
      reason: 'Not enough personal cash.'
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
      message: 'Another transaction is in progress.'
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
      description: `PI office: ${item.name}`,
      missionId: null,
      metadata: {
        officeItemId: id
      }
    });

    if (!result.ok) {
      write(previous);

      return {
        ok: false,
        message: 'Not enough personal cash.'
      };
    }

    write(next);

    return {
      ok: true,
      itemId: id,
      message:
        item.purchaseMessage ||
        'Purchase completed.'
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
      message: 'Purchase failed. Your cash was restored.'
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
      message: 'Another transaction is in progress.'
    };
  }

  const income = getEmployeeIncome();

  if (!income.available) {
    return {
      ok: false,
      message: 'No income to collect yet.'
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
        'PI office: junior investigator earnings',
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
        `$${income.available} collected. ` +
        'Your employee requests a less suspicious chair.'
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
        'Collection failed. Your earnings are still available.'
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