import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';

import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';

import {
  HOME_TOWN_ID,
  getTown
} from '../config/RoadTripTowns.js';

import {
  advancePITime
} from './PIClockManager.js';

import {
  requestAutosave,
  flushAutosave
} from '../gameStatePersistence.js';

const KM_PER_MAP_UNIT = 0.2;
const MINUTES_PER_DENT = 20;
const AUTOPILOT_EXTRA_MINUTES = 15;

const startingScenes = new WeakSet();

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const amount = value =>
  Math.max(0, Math.round(Number(value) || 0));

function findReceipt(tripId) {
  if (!tripId || !Array.isArray(gameState.moneyLog)) {
    return null;
  }

  return gameState.moneyLog.find(
    entry =>
      entry.type === 'expense' &&
      entry.metadata?.roadTrip?.id === tripId
  )?.metadata?.roadTrip ?? null;
}

function requireReceipt(quote, tripId) {
  const receipt = findReceipt(tripId);

  if (
    !receipt ||
    receipt.fromId !== quote.fromId ||
    receipt.toId !== quote.toId
  ) {
    throw new Error('The road-trip payment receipt is missing.');
  }

  return receipt;
}

function snapshotSettlement() {
  return {
    cash: gameState.cash,
    moneyLog: structuredClone(gameState.moneyLog ?? []),
    townId: gameState.roadTripTownId,
    piClock: structuredClone(gameState.piClock ?? null)
  };
}

function restoreSettlement(snapshot) {
  gameState.cash = snapshot.cash;
  gameState.moneyLog = snapshot.moneyLog;
  gameState.roadTripTownId = snapshot.townId;
  gameState.piClock = snapshot.piClock;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lost-artifacts:money-changed', {
        detail: {
          reason: 'road_trip_rollback',
          transaction: null,
          state: moneyManager.getBalances()
        }
      })
    );
  }
}

function saveSettlement() {
  requestAutosave();

  if (!flushAutosave()) {
    throw new Error(
      'The game could not save the road-trip payment. ' +
      'Check browser storage and try again.'
    );
  }
}

function commitSettlement(callback) {
  const previous = snapshotSettlement();

  try {
    const result = callback();
    saveSettlement();
    return result;
  } catch (error) {
    restoreSettlement(previous);
    throw error;
  }
}

function safeEmit(event, payload) {
  try {
    EventBus.emit(event, payload);
  } catch (error) {
    console.error(`[RoadTrip] Listener for "${event}" failed:`, error);
  }
}

export function showRoadTripError(scene, message) {
  console.warn('[RoadTrip]', message);

  if (!scene?.sys?.isActive?.() || !scene.add) {
    return;
  }

  scene._roadTripErrorText?.destroy();

  const { width, height } = scene.scale;

  const text = scene.add.text(
    width / 2,
    height * 0.16,
    message,
    {
      fontFamily: 'SpecialElite',
      fontSize: '24px',
      color: '#fff1d0',
      backgroundColor: '#421f18',
      padding: { x: 20, y: 14 },
      align: 'center',
      wordWrap: {
        width: Math.max(180, width * 0.7)
      }
    }
  )
    .setOrigin(0.5)
    .setDepth(10000)
    .setScrollFactor(0);

  scene._roadTripErrorText = text;

  scene.time.delayedCall(5500, () => {
    if (scene._roadTripErrorText === text) {
      scene._roadTripErrorText = null;
    }

    if (text.scene) {
      text.destroy();
    }
  });
}

export function getCurrentTownId() {
  return gameState.roadTripTownId || HOME_TOWN_ID;
}

export function setCurrentTown(townId) {
  gameState.roadTripTownId = townId;
}

export function getRoadTripQuote(fromId, toId) {
  const fromTown = getTown(fromId ?? getCurrentTownId());
  const toTown = getTown(toId);

  const distance = Math.hypot(
    fromTown.map.x - toTown.map.x,
    fromTown.map.y - toTown.map.y
  );

  const km = Math.max(
    15,
    Math.round(distance * KM_PER_MAP_UNIT)
  );

  return {
    fromId: fromTown.id,
    toId: toTown.id,
    fromTown,
    toTown,
    km,
    baseHours: Math.max(1, Math.round(km / 55)),
    fuelCost: Math.max(5, Math.round(km * 0.15)),
    energyCost: 0,
    tripLength: clamp(km * 45, 1800, 5600)
  };
}

export function canStartRoadTrip(fromId, toId) {
  const quote = getRoadTripQuote(fromId, toId);

  if (quote.fromId === quote.toId) {
    return {
      ok: false,
      reason: 'same_town',
      message: 'You are already in this town.',
      quote
    };
  }

  const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);

  if (cash < quote.fuelCost) {
    return {
      ok: false,
      reason: 'no_fuel_money',
      message:
        `Fuel costs $${quote.fuelCost}. ` +
        `Cash available: $${cash}.`,
      quote
    };
  }

  return {
    ok: true,
    reason: null,
    message: '',
    quote
  };
}

export function beginRoadTrip(quote, existingTripId = null) {
  if (existingTripId) {
    const existing = requireReceipt(quote, existingTripId);

    if (existing.status !== 'driving') {
      throw new Error('This road trip is no longer active.');
    }

    return existing.id;
  }

  if (getCurrentTownId() !== quote.fromId) {
    throw new Error('The departure town has changed. Select the route again.');
  }

  const id = globalThis.crypto?.randomUUID?.() ??
    `road-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return commitSettlement(() => {
    const payment = moneyManager.spend(quote.fuelCost, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.TRAVEL,
      description:
        `Road fuel: ${quote.fromTown.name} → ${quote.toTown.name}`,
      metadata: {
        roadTrip: {
          id,
          fromId: quote.fromId,
          toId: quote.toId,
          status: 'driving',
          fuelPaid: quote.fuelCost,
          finesAssessed: 0,
          finesPaid: 0,
          fineIds: [],
          outcome: null
        }
      }
    });

    if (!payment.ok) {
      throw new Error(
        `Fuel costs $${payment.required}. ` +
        `Cash available: $${payment.available}.`
      );
    }

    return id;
  });
}

export function cancelRoadTrip(quote, tripId) {
  const receipt = requireReceipt(quote, tripId);

  if (receipt.status !== 'driving') {
    return false;
  }

  return commitSettlement(() => {
    moneyManager.refund(receipt.fuelPaid, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.REFUND,
      description: 'Road trip cancelled before departure',
      metadata: { roadTripId: tripId }
    });

    requireReceipt(quote, tripId).status = 'cancelled';

    return true;
  });
}

export function chargeRoadTripFine(
  quote,
  tripId,
  fineAmount,
  fineId
) {
  const receipt = requireReceipt(quote, tripId);

  if (receipt.status !== 'driving') {
    throw new Error('This road trip is no longer active.');
  }

  const assessed = amount(fineAmount);
  const key = String(fineId);

  if (!assessed || receipt.fineIds.includes(key)) {
    return {
      assessed: receipt.finesAssessed,
      paid: receipt.finesPaid,
      unpaid: receipt.finesAssessed - receipt.finesPaid
    };
  }

  return commitSettlement(() => {
    const paid = Math.min(
      assessed,
      moneyManager.getBalance(MONEY_SOURCE.CASH)
    );

    if (paid > 0) {
      const payment = moneyManager.spend(paid, {
        source: MONEY_SOURCE.CASH,
        category: ECONOMY_CATEGORY.TRAVEL,
        description: `Road fine: ${quote.toTown.name}`,
        metadata: {
          roadTripId: tripId,
          fineId: key,
          assessed
        }
      });

      if (!payment.ok) {
        throw new Error('The road fine could not be paid.');
      }
    }

    const current = requireReceipt(quote, tripId);

    current.finesAssessed += assessed;
    current.finesPaid += paid;
    current.fineIds.push(key);

    return {
      assessed: current.finesAssessed,
      paid: current.finesPaid,
      unpaid: current.finesAssessed - current.finesPaid
    };
  });
}

export function computeOutcome(quote, drive = {}) {
  const hits = amount(drive.hits);
  const coffees = amount(drive.coffees);
  const coins = amount(drive.coins);
  const fines = amount(drive.fines);
  const autopilot = Boolean(drive.autopilot);

  const minutesLost =
    hits * MINUTES_PER_DENT +
    (autopilot ? AUTOPILOT_EXTRA_MINUTES : 0);

  const totalMinutes =
    quote.baseHours * 60 + minutesLost;

  return {
    km: quote.km,
    hits,
    coffees,
    coins,
    fines,
    autopilot,
    fuel: quote.fuelCost,
    minutesLost,
    totalMinutes,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    energyCost: 0,
    coffeeEnergy: 0,
    netEnergy: 0
  };
}

export function applyOutcome(quote, outcome, tripId) {
  const receipt = requireReceipt(quote, tripId);

  if (receipt.status === 'completed') {
    return structuredClone(receipt.outcome);
  }

  if (receipt.status !== 'driving') {
    throw new Error('This road trip cannot be settled.');
  }

  const settled = commitSettlement(() => {
    const current = requireReceipt(quote, tripId);

    const result = {
      ...outcome,
      fuel: current.fuelPaid,
      fines: current.finesAssessed,
      finesPaid: current.finesPaid,
      finesUnpaid:
        current.finesAssessed - current.finesPaid
    };

    if (result.coins > 0) {
      const before = moneyManager.getBalance(MONEY_SOURCE.CASH);

      moneyManager.addCash(result.coins, {
        category: ECONOMY_CATEGORY.SIDE_CASE,
        description:
          `Road finds: ${quote.fromTown.name} → ${quote.toTown.name}`,
        metadata: { roadTripId: tripId }
      });

      result.coins =
        moneyManager.getBalance(MONEY_SOURCE.CASH) - before;
    }

    setCurrentTown(quote.toId);

    advancePITime(
      result.totalMinutes,
      'travel_car',
      { autosave: false }
    );

    const finalReceipt = requireReceipt(quote, tripId);

    finalReceipt.status = 'completed';
    finalReceipt.outcome = structuredClone(result);

    return result;
  });

  safeEmit('roadTripCompleted', {
    quote,
    outcome: settled,
    tripId
  });

  return settled;
}

export async function startRoadTrip(
  scene,
  toTownId,
  options = {}
) {
  if (startingScenes.has(scene)) {
    return {
      ok: false,
      reason: 'already_starting',
      message: 'A road trip is already starting.'
    };
  }

  startingScenes.add(scene);

  let quote = null;
  let tripId = null;

  try {
    const fromTownId =
      options.fromTownId ?? getCurrentTownId();

    const check = canStartRoadTrip(fromTownId, toTownId);

    quote = check.quote;

    if (!check.ok) {
      showRoadTripError(scene, check.message);
      return check;
    }

    const nextScene =
      options.nextScene ||
      (quote.toId === HOME_TOWN_ID ? 'HomeCityScene' : null);

    if (!nextScene) {
      const message =
        `No arrival scene is configured for ${quote.toTown.name}.`;

      showRoadTripError(scene, message);

      return {
        ok: false,
        reason: 'missing_destination',
        message,
        quote
      };
    }

    tripId = beginRoadTrip(quote);

    const moved = await scene.goto('DriveScene', {
      fromTownId: quote.fromId,
      toTownId: quote.toId,
      nextScene,
      nextData: options.nextData,
      tripId
    });

    if (!moved) {
      cancelRoadTrip(quote, tripId);

      const message = 'The road trip could not start. Fuel was refunded.';

      showRoadTripError(scene, message);

      return {
        ok: false,
        reason: 'navigation_failed',
        message,
        quote
      };
    }

    return {
      ok: true,
      quote,
      tripId
    };
  } catch (error) {
    if (tripId && quote) {
      try {
        cancelRoadTrip(quote, tripId);
      } catch (refundError) {
        console.error('[RoadTrip] Refund failed:', refundError);
      }
    }

    const message = error.message || 'The road trip could not start.';

    showRoadTripError(scene, message);

    return {
      ok: false,
      reason: 'road_trip_failed',
      message,
      quote
    };
  } finally {
    startingScenes.delete(scene);
  }
}