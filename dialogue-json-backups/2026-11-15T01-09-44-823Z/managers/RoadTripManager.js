import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { getEnergyManager } from './EnergyManager.js';
import {
  moneyManager,
  MONEY_SOURCE,
  ECONOMY_CATEGORY
} from './MoneyManager.js';
import { HOME_TOWN_ID, getTown } from '../config/RoadTripTowns.js';

/**
 * RoadTripManager
 *
 * Single place with the rules of car trips between the funny towns.
 * The DriveScene only plays the trip; this module decides what it costs
 * and applies the result to money / energy / game time.
 *
 * Typical use from your destination-map UI:
 *
 *   import { startRoadTrip } from '../managers/RoadTripManager.js';
 *   startRoadTrip(this, 'whateverville', {
 *     nextScene: 'StakeoutScene',            // where the mission happens
 *     nextData: { missionId: 'granny_fence' }
 *   });
 */

const KM_PER_MAP_UNIT = 0.2;
const COIN_VALUE = 2;
const COFFEE_ENERGY = 3;
const MINUTES_PER_DENT = 20;
const AUTOPILOT_EXTRA_MINUTES = 15;
const MAX_AWAKE_MINUTES_TO_DRIVE = 20 * 60;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function getCurrentTownId() {
  return gameState.roadTripTownId || HOME_TOWN_ID;
}

export function setCurrentTown(townId) {
  gameState.roadTripTownId = townId;

  try {
    gameState.updateState?.({ roadTripTownId: townId });
  } catch (error) {
    console.warn('[RoadTripManager] Could not sync town to state:', error);
  }
}

export function getRoadTripQuote(fromId, toId) {
  const fromTown = getTown(fromId ?? getCurrentTownId());
  const toTown = getTown(toId);

  const dist = Math.hypot(
    fromTown.map.x - toTown.map.x,
    fromTown.map.y - toTown.map.y
  );

  const km = Math.max(15, Math.round(dist * KM_PER_MAP_UNIT));
  const baseHours = Math.max(1, Math.round(km / 55));
  const fuelCost = Math.max(5, Math.round(km * 0.15));

  const energyCost = getEnergyManager().scaleCost(
    Math.max(2, Math.round(km / 14))
  );

  return {
    fromId: fromTown.id,
    toId: toTown.id,
    fromTown,
    toTown,
    km,
    baseHours,
    fuelCost,
    energyCost,
    // Length of the playable drive in scene units (~160 units/s).
    tripLength: clamp(km * 45, 1800, 5600)
  };
}

export function canStartRoadTrip(fromId, toId) {
  const quote = getRoadTripQuote(fromId, toId);

  if (quote.fromId === quote.toId) {
    return {
      ok: false,
      reason: 'same_town',
      message: 'We are already here. Dino checked twice.',
      quote
    };
  }

  const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);

  if (cash < quote.fuelCost) {
    return {
      ok: false,
      reason: 'no_fuel_money',
      message:
        `Fuel for this trip costs $${quote.fuelCost}. ` +
        `You have $${cash}. Dino offers to push.`,
      quote
    };
  }

  const energy = getEnergyManager();
  const affordability = energy.canAfford(quote.energyCost);

  if (!affordability.ok) {
    return {
      ok: false,
      reason: affordability.reason || 'insufficient_energy',
      message: energy.getInsufficientEnergyMessage(quote.energyCost),
      quote
    };
  }

  const awake = Number(
    gameState.currentMission?.energyBalance?.awakeMinutes
  ) || 0;

  if (awake >= MAX_AWAKE_MINUTES_TO_DRIVE) {
    return {
      ok: false,
      reason: 'sleep_required',
      message: 'You have been awake far too long to drive. Sleep first. Dino insists.',
      quote
    };
  }

  return { ok: true, reason: null, message: '', quote };
}

/**
 * Pure calculation (no side effects). `drive` comes from the DriveScene:
 * { hits, coffees, coins, fines, autopilot }
 */
export function computeOutcome(quote, drive = {}) {
  const hits = Math.max(0, drive.hits | 0);
  const coffees = Math.max(0, drive.coffees | 0);
  const coins = Math.max(0, Math.round(drive.coins || 0));
  const fines = Math.max(0, Math.round(drive.fines || 0));
  const autopilot = Boolean(drive.autopilot);

  const minutesLost =
    hits * MINUTES_PER_DENT +
    (autopilot ? AUTOPILOT_EXTRA_MINUTES : 0);

  const totalMinutes = quote.baseHours * 60 + minutesLost;
  const coffeeEnergy = coffees * COFFEE_ENERGY;

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
    energyCost: quote.energyCost,
    coffeeEnergy,
    // > 0 means energy is lost, < 0 means net gain
    netEnergy: quote.energyCost - coffeeEnergy
  };
}

/**
 * Applies the outcome to the game. Safe to call once per trip.
 */
export function applyOutcome(quote, outcome) {
  const label = `${quote.fromTown.name} → ${quote.toTown.name}`;
  const metadata = {
    fromTown: quote.fromId,
    toTown: quote.toId,
    km: quote.km
  };

  // --- money -------------------------------------------------------------
  const fuel = Math.min(
    outcome.fuel,
    moneyManager.getBalance(MONEY_SOURCE.CASH)
  );

  if (fuel > 0) {
    moneyManager.spend(fuel, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.TRAVEL,
      description: `Fuel: ${label}`,
      metadata
    });
  }

  const fine = Math.min(
    outcome.fines,
    moneyManager.getBalance(MONEY_SOURCE.CASH)
  );

  if (fine > 0) {
    moneyManager.spend(fine, {
      source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.TRAVEL,
      description: `Speed camera fine: ${label}`,
      metadata
    });
  }

  if (outcome.coins > 0) {
    moneyManager.addCash(outcome.coins, {
      category: ECONOMY_CATEGORY.SIDE_CASE,
      description: `Coins found on the road: ${label}`,
      metadata
    });
  }

  // --- energy ------------------------------------------------------------
  const energy = getEnergyManager();

  if (outcome.netEnergy > 0) {
    energy.consumeCustom(outcome.netEnergy, `Road trip: ${label}`, {
      activityType: 'travel_car'
    });
  } else if (outcome.netEnergy < 0) {
    energy.recoverCustom(-outcome.netEnergy, `Road coffee: ${label}`, {
      recoveryType: 'drink',
      recoverySubtype: 'road_coffee'
    });
  }

  // --- time + location ---------------------------------------------------
  EventBus.emit('advanceTime', outcome.hours, outcome.minutes);
  setCurrentTown(quote.toId);

  EventBus.emit('roadTripCompleted', { quote, outcome });

  return outcome;
}

/**
 * Entry point for your map UI: validates, then opens the DriveScene.
 */
export async function startRoadTrip(scene, toTownId, options = {}) {
  const fromTownId = options.fromTownId ?? getCurrentTownId();
  const check = canStartRoadTrip(fromTownId, toTownId);

  if (!check.ok) {
    EventBus.emit('showDialogue', {
      speaker: 'Dino',
      text: check.message
    });

    return check;
  }

  const ok = await scene.goto('DriveScene', {
    fromTownId,
    toTownId,
    nextScene: options.nextScene,
    nextData: options.nextData
  });

  return { ok, quote: check.quote };
}