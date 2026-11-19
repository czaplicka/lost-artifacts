import { dialogueText as __dialogueText } from '../dialogues/DialogueText.js';
import { gameState } from '../GameData.js';
import { EventBus } from '../EventBus.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { HOME_TOWN_ID, getTown } from '../config/RoadTripTowns.js';
import { advancePITime } from './PIClockManager.js';
import { requestAutosave } from '../gameStatePersistence.js';

const KM_PER_MAP_UNIT = 0.2;
const MINUTES_PER_DENT = 20;
const AUTOPILOT_EXTRA_MINUTES = 15;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const appliedOutcomes = new WeakSet();

export function getCurrentTownId() { return gameState.roadTripTownId || HOME_TOWN_ID; }
export function setCurrentTown(townId) { gameState.roadTripTownId = townId; }

export function getRoadTripQuote(fromId, toId) {
  const fromTown = getTown(fromId ?? getCurrentTownId()), toTown = getTown(toId);
  const dist = Math.hypot(fromTown.map.x - toTown.map.x, fromTown.map.y - toTown.map.y);
  const km = Math.max(15, Math.round(dist * KM_PER_MAP_UNIT));
  return { fromId: fromTown.id, toId: toTown.id, fromTown, toTown, km,
    baseHours: Math.max(1, Math.round(km / 55)), fuelCost: Math.max(5, Math.round(km * 0.15)),
    energyCost: 0, tripLength: clamp(km * 45, 1800, 5600) };
}

export function canStartRoadTrip(fromId, toId) {
  const quote = getRoadTripQuote(fromId, toId);
  if (quote.fromId === quote.toId) return { ok: false, reason: 'same_town',
    message: __dialogueText('managers/RoadTripManager.js', 't_f86acecd1b82d7c93dc7'), quote };
  const cash = moneyManager.getBalance(MONEY_SOURCE.CASH);
  if (cash < quote.fuelCost) return { ok: false, reason: 'no_fuel_money',
    message: `Fuel costs $${quote.fuelCost}. Cash available: $${cash}.`, quote };
  return { ok: true, reason: null, message: '', quote };
}

export function computeOutcome(quote, drive = {}) {
  const hits = Math.max(0, drive.hits | 0), coffees = Math.max(0, drive.coffees | 0);
  const coins = Math.max(0, Math.round(drive.coins || 0)), fines = Math.max(0, Math.round(drive.fines || 0));
  const autopilot = Boolean(drive.autopilot);
  const minutesLost = hits * MINUTES_PER_DENT + (autopilot ? AUTOPILOT_EXTRA_MINUTES : 0);
  const totalMinutes = quote.baseHours * 60 + minutesLost;
  return { km: quote.km, hits, coffees, coins, fines, autopilot, fuel: quote.fuelCost,
    minutesLost, totalMinutes, hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60,
    energyCost: 0, coffeeEnergy: 0, netEnergy: 0 };
}

export function applyOutcome(quote, outcome) {
  if (appliedOutcomes.has(outcome)) return outcome;
  const label = `${quote.fromTown.name} → ${quote.toTown.name}`;
  const metadata = { fromTown: quote.fromId, toTown: quote.toId, km: quote.km };
  const fuel = Math.min(outcome.fuel, moneyManager.getBalance(MONEY_SOURCE.CASH));
  if (fuel > 0) moneyManager.spend(fuel, { source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.TRAVEL,
    description: `Road fuel: ${label}`, metadata });
  const fine = Math.min(outcome.fines, moneyManager.getBalance(MONEY_SOURCE.CASH));
  if (fine > 0) moneyManager.spend(fine, { source: MONEY_SOURCE.CASH, category: ECONOMY_CATEGORY.TRAVEL,
    description: `Road fines: ${label}`, metadata });
  if (outcome.coins > 0) moneyManager.addCash(outcome.coins, { category: ECONOMY_CATEGORY.SIDE_CASE,
    description: `Road finds: ${label}`, metadata });
  setCurrentTown(quote.toId);
  advancePITime(outcome.totalMinutes, 'travel_car', { autosave: false });
  appliedOutcomes.add(outcome);
  if (gameState.isGameActive) requestAutosave();
  EventBus.emit('roadTripCompleted', { quote, outcome });
  return outcome;
}

export async function startRoadTrip(scene, toTownId, options = {}) {
  const fromTownId = options.fromTownId ?? getCurrentTownId();
  const check = canStartRoadTrip(fromTownId, toTownId);
  const nextScene = options.nextScene || (check.quote.toId === HOME_TOWN_ID ? 'HomeCityScene' : null);
  const result = !check.ok ? check : !nextScene ? {
    ok: false, reason: 'missing_destination',
    message: `No arrival scene is configured for ${check.quote.toTown.name}.`,
    quote: check.quote
  } : null;
  if (result) {
    EventBus.emit('showDialogue', {
      speaker: __dialogueText('managers/RoadTripManager.js', 't_6fb86a981cf3ed052b51'),
      text: result.message
    });
    return result;
  }
  const ok = await scene.goto('DriveScene', {
    fromTownId, toTownId: check.quote.toId, nextScene, nextData: options.nextData
  });
  return { ok, quote: check.quote };
}
