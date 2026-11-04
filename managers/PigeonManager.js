import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { inventoryManager } from './InventoryManager.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { PIGEON_CONFIG as C, PIGEON_FINDS } from '../config/pigeonConfig.js';

const KEY = 'pigeonLoft', ORDER = [3, 2, 1];
const clone = value => JSON.parse(JSON.stringify(value));
let busy = false;
const fresh = () => ({ version: 2, perches: 1, birds: [], collection: {}, junkDiscarded: 0 });
function birdFor(index) {
  return { id: `pigeon_${index + 1}`, slot: ORDER[index],
    name: index === 0 ? C.firstName : `Pigeon ${index + 1}`,
    arrived: false, fed: false, departedAt: null, returnAt: null, findId: null, flights: 0 };
}
function read() {
  const raw = gameState[KEY];
  if (raw == null) return fresh();
  let state = clone(raw);
  if (state.version === 1) {
    if (!Array.isArray(state.birds) || state.birds.length > C.maxPigeons) throw Error('Invalid pigeon save.');
    const previous = clone(state);
    state = { ...state, version: 2, perches: Math.max(1, state.birds.length),
      legacyBackup: previous,
      birds: state.birds.map((bird, index) => ({ ...bird, slot: ORDER[index], fed: false,
        arrived: bird.returnAt != null || (bird.flights || 0) > 0 })) };
  }
  if (state.version !== 2 || !Number.isInteger(state.perches) || state.perches < 1 ||
      state.perches > C.maxPigeons || !Array.isArray(state.birds) || state.birds.length > state.perches) {
    throw Error('Pigeon save data could not be read. No changes were made.');
  }
  const ids = new Set(), slots = new Set();
  for (const b of state.birds) {
    if (typeof b.id !== 'string' || typeof b.name !== 'string' || ids.has(b.id) || slots.has(b.slot) ||
        !ORDER.slice(0, state.perches).includes(b.slot) ||
        (b.returnAt != null && (!Number.isFinite(b.returnAt) || !Number.isFinite(b.departedAt) ||
          !PIGEON_FINDS.some(f => f.id === b.findId)))) throw Error('Invalid pigeon flight data.');
    ids.add(b.id); slots.add(b.slot);
  }
  state.collection ??= {}; state.junkDiscarded ??= 0;
  return state;
}
function write(state) {
  gameState[KEY] = clone(state); requestAutosave(); flushAutosave();
}
function transaction(callback) {
  if (busy) return { ok: false, message: 'Please wait for the previous action.' };
  busy = true;
  let previous, inventory, selected, money;
  try {
    previous = gameState[KEY] == null ? null : clone(gameState[KEY]);
    inventory = inventoryManager.exportState(); selected = inventoryManager.getSelectedItem()?.id;
    money = clone(moneyManager.getState());
    return callback();
  } catch (error) {
    if (money) {
      gameState[KEY] = previous; gameState.cash = money.cash; gameState.moneyLog = money.moneyLog;
      inventoryManager.importState(inventory); if (selected) inventoryManager.selectItem(selected);
      requestAutosave(); flushAutosave();
    }
    console.error('[PigeonManager]', error);
    return { ok: false, message: error.message || 'The action failed. Nothing was consumed.' };
  } finally { busy = false; }
}
function birdIn(state, id) {
  const bird = state.birds.find(b => b.id === id && b.arrived);
  if (!bird) throw Error('There is no pigeon here yet. Add grain to attract one.');
  return bird;
}
function rollFind() {
  let roll = Math.random() * PIGEON_FINDS.reduce((sum, f) => sum + f.weight, 0);
  for (const f of PIGEON_FINDS) { roll -= f.weight; if (roll < 0) return f.id; }
  return PIGEON_FINDS[PIGEON_FINDS.length - 1].id;
}
export function getPigeonLoft(time = Date.now()) {
  const state = read();
  if (gameState[KEY]?.version !== 2) write(state);
  const birds = state.birds.filter(b => b.arrived).map(b => ({ ...b,
    status: b.returnAt == null ? 'home' : time >= b.returnAt ? 'ready' : 'flying',
    remainingMs: b.returnAt == null ? 0 : Math.max(0, b.returnAt - time),
    find: b.returnAt != null && time >= b.returnAt ? clone(PIGEON_FINDS.find(f => f.id === b.findId)) : null }));
  return { ...state, birds, feed: inventoryManager.getItem(C.feedId)?.quantity || 0,
    feederFull: birds.some(b => b.fed),
    nextPerchPrice: state.perches < C.maxPigeons ? C.extraPerchPrices[state.perches - 1] ?? null : null,
    slots: ORDER.map((slot, index) => ({ slot, owned: index < state.perches,
      bird: birds.find(b => b.slot === slot) || null })) };
}
export function feedPigeon(slot) {
  return transaction(() => {
    const state = read(), index = ORDER.indexOf(Number(slot));
    if (index < 0 || index >= state.perches) return { ok: false, message: 'Buy this cage first.' };
    let bird = state.birds.find(b => b.slot === Number(slot));
    if (bird?.returnAt != null) return { ok: false, message: 'Wait for this pigeon and collect its find first.' };
    if (bird?.fed) return { ok: false, message: 'This pigeon already has grain for its next flight.' };
    if (!inventoryManager.hasItem(C.feedId)) return { ok: false, message: 'Buy Pigeon Feed on the office computer: Office Shop, $2 per portion.' };
    if (!inventoryManager.removeQuantity(C.feedId, 1)) throw Error('The grain could not be poured.');
    if (!bird) { bird = birdFor(index); state.birds.push(bird); }
    const newcomer = !bird.arrived; bird.arrived = true; bird.fed = true; write(state);
    return { ok: true, message: newcomer
      ? `${bird.name} arrived for the grain. One portion used. Ready for a flight.`
      : `${bird.name} has been fed. Ready for a flight.` };
  });
}
export function renamePigeon(id, value) {
  return transaction(() => {
    if (typeof value !== 'string') return { ok: false, message: 'Enter a name.' };
    const name = value.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, C.maxNameLength);
    if (!name) return { ok: false, message: 'A pigeon deserves a name.' };
    const state = read(); birdIn(state, id).name = name; write(state);
    return { ok: true, message: `${name}. A perfectly respectable operative.` };
  });
}
export function sendPigeon(id) {
  return transaction(() => {
    const state = read(), bird = birdIn(state, id);
    if (bird.returnAt != null) return { ok: false, message: 'Collect the previous find first.' };
    if (!bird.fed) return { ok: false, message: 'Click the feeder to pour one portion of grain first.' };
    const now = Date.now();
    Object.assign(bird, { fed: false, departedAt: now, returnAt: now + C.flightMs, findId: rollFind() });
    write(state); return { ok: true, message: `${bird.name} has departed. No additional grain charged.` };
  });
}
export function collectPigeonFind(id) {
  return transaction(() => {
    const state = read(), bird = birdIn(state, id);
    if (bird.returnAt == null || Date.now() < bird.returnAt) return { ok: false, message: 'This pigeon is not back yet.' };
    const find = PIGEON_FINDS.find(f => f.id === bird.findId);
    if (!find) throw Error('The find could not be identified.');
    if (find.kind === 'usable') {
      const item = inventoryManager.getItem(find.item.id), cap = inventoryManager.getCapacity();
      if ((item && (!item.stackable || item.quantity >= 999)) || (!item && cap.current >= cap.max)) {
        return { ok: false, message: 'Inventory full. Your pigeon will keep the find safe.' };
      }
      if (!inventoryManager.addItem({ ...clone(find.item), quantity: 1 })) throw Error('The find could not be added.');
    } else if (find.kind === 'collection') {
      const count = Object.prototype.hasOwnProperty.call(state.collection, find.id) ? state.collection[find.id] : 0;
      state.collection[find.id] = Math.max(0, Number(count) || 0) + 1;
    } else state.junkDiscarded++;
    bird.flights = (bird.flights || 0) + 1;
    Object.assign(bird, { departedAt: null, returnAt: null, findId: null }); write(state);
    return { ok: true, find: clone(find), message: find.kind === 'junk'
      ? `${find.name}: ${find.description} Discarded.`
      : `${find.name} added to ${find.kind === 'collection' ? 'your collection' : 'your inventory'}.` };
  });
}
export function buyPigeonPerch() {
  return transaction(() => {
    const state = read(), price = C.extraPerchPrices[state.perches - 1];
    if (state.perches >= C.maxPigeons || !Number.isSafeInteger(price)) return { ok: false, message: 'The loft is fully expanded.' };
    if (!moneyManager.canAfford(price, MONEY_SOURCE.CASH)) return { ok: false, message: 'Not enough personal cash.' };
    const purchase = moneyManager.spend(price, { source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.OFFICE_UPGRADE, description: 'Pigeon loft: empty cage',
      missionId: null, metadata: { pigeonLoft: true, slot: ORDER[state.perches] } });
    if (!purchase.ok) return { ok: false, message: 'Not enough personal cash.' };
    state.perches++; write(state);
    return { ok: true, message: 'Empty cage installed. Pour grain to attract its pigeon.' };
  });
}
