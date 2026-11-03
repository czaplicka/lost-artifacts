import { gameState } from '../GameData.js';
import { requestAutosave, flushAutosave } from '../gameStatePersistence.js';
import { inventoryManager } from './InventoryManager.js';
import { moneyManager, MONEY_SOURCE, ECONOMY_CATEGORY } from './MoneyManager.js';
import { PIGEON_CONFIG as C, PIGEON_FINDS } from '../config/pigeonConfig.js';

const KEY = 'pigeonLoft';
const clone = value => JSON.parse(JSON.stringify(value));
let busy = false;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function freshBird(index) {
  return { id: `pigeon_${index}`, name: index === 1 ? C.firstName : `Pigeon ${index}`,
    departedAt: null, returnAt: null, findId: null, flights: 0 };
}
function read() {
  const raw = gameState[KEY];
  if (raw == null) return { version: 1, birds: [freshBird(1)], collection: {}, junkDiscarded: 0 };
  if (raw.version !== 1 || !Array.isArray(raw.birds) || !raw.birds.length || raw.birds.length > C.maxPigeons) {
    throw Error('Pigeon save data could not be read. No changes were made.');
  }
  const result = clone(raw);
  if (new Set(result.birds.map(b => b.id)).size !== result.birds.length ||
      result.birds.some(b => typeof b.id !== 'string' || typeof b.name !== 'string' ||
        (b.returnAt != null && (!Number.isFinite(b.returnAt) || !Number.isFinite(b.departedAt) ||
          !PIGEON_FINDS.some(f => f.id === b.findId))))) {
    throw Error('Invalid pigeon flight data. No changes were made.');
  }
  result.collection ??= {};
  result.junkDiscarded ??= 0;
  return result;
}
function write(state) {
  gameState[KEY] = clone(state);
  requestAutosave();
  flushAutosave();
}
function transaction(callback) {
  if (busy) return { ok: false, message: 'Please wait for the previous action.' };
  busy = true;
  const previous = gameState[KEY] == null ? null : clone(gameState[KEY]);
  const inventory = inventoryManager.exportState();
  const selected = inventoryManager.getSelectedItem()?.id;
  const money = clone(moneyManager.getState());
  try { return callback(); }
  catch (error) {
    gameState[KEY] = previous;
    gameState.cash = money.cash;
    gameState.moneyLog = money.moneyLog;
    inventoryManager.importState(inventory);
    if (selected) inventoryManager.selectItem(selected);
    requestAutosave();
    console.error('[PigeonManager]', error);
    return { ok: false, message: error.message || 'The action failed. Nothing was consumed.' };
  } finally { busy = false; }
}
function birdIn(state, id) {
  const bird = state.birds.find(b => b.id === id);
  if (!bird) throw Error('This pigeon could not be found.');
  return bird;
}
function rollFind() {
  const total = PIGEON_FINDS.reduce((sum, f) => sum + f.weight, 0);
  let roll = Math.random() * total;
  for (const find of PIGEON_FINDS) { roll -= find.weight; if (roll < 0) return find.id; }
  return PIGEON_FINDS[PIGEON_FINDS.length - 1].id;
}
export function getPigeonLoft(time = Date.now()) {
  const state = read();
  if (gameState[KEY] == null) write(state);
  return { ...state, feed: inventoryManager.getItem(C.feedId)?.quantity || 0,
    nextPerchPrice: C.extraPerchPrices[state.birds.length - 1] ?? null,
    birds: state.birds.map(bird => ({ ...bird,
      status: bird.returnAt == null ? 'home' : time >= bird.returnAt ? 'ready' : 'flying',
      remainingMs: bird.returnAt == null ? 0 : Math.max(0, bird.returnAt - time),
      find: bird.returnAt != null && time >= bird.returnAt
        ? clone(PIGEON_FINDS.find(f => f.id === bird.findId)) : null })) };
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
    if (bird.returnAt != null) return { ok: false, message: 'Collect the previous find before the next flight.' };
    if (!inventoryManager.hasItem(C.feedId)) return { ok: false, message: 'Buy Pigeon Feed on the office computer first.' };
    if (!inventoryManager.removeQuantity(C.feedId, 1)) throw Error('The feed could not be used.');
    const time = Date.now();
    Object.assign(bird, { departedAt: time, returnAt: time + C.flightMs, findId: rollFind() });
    write(state);
    return { ok: true, message: `${bird.name} has departed. One portion of feed used.` };
  });
}
export function collectPigeonFind(id) {
  return transaction(() => {
    const state = read(), bird = birdIn(state, id);
    if (bird.returnAt == null || Date.now() < bird.returnAt) return { ok: false, message: 'This pigeon is not back yet.' };
    const find = PIGEON_FINDS.find(f => f.id === bird.findId);
    if (!find) throw Error('The find could not be identified.');
    if (find.kind === 'usable') {
      const existing = inventoryManager.getItem(find.item.id);
      const capacity = inventoryManager.getCapacity();
      if ((existing && (!existing.stackable || existing.quantity >= 999)) ||
          (!existing && capacity.current >= capacity.max)) {
        return { ok: false, message: 'Inventory full. Your pigeon will keep the find safe.' };
      }
      if (!inventoryManager.addItem({ ...clone(find.item), quantity: 1 })) throw Error('The find could not be added to inventory.');
    } else if (find.kind === 'collection') {
      const before = own(state.collection, find.id) ? state.collection[find.id] : 0;
      state.collection[find.id] = Math.max(0, Number(before) || 0) + 1;
    } else { state.junkDiscarded += 1; }
    bird.flights = (bird.flights || 0) + 1;
    Object.assign(bird, { departedAt: null, returnAt: null, findId: null });
    write(state);
    return { ok: true, message: find.kind === 'junk'
      ? `${bird.name} brought ${find.name}. ${find.description} Discarded.`
      : find.kind === 'collection' ? `${find.name} added to your collection.`
      : `${find.name} added to your inventory.`, find: clone(find) };
  });
}
export function buyPigeonPerch() {
  return transaction(() => {
    const state = read(), price = C.extraPerchPrices[state.birds.length - 1];
    if (state.birds.length >= C.maxPigeons || !Number.isSafeInteger(price)) return { ok: false, message: 'The loft is fully expanded.' };
    if (!moneyManager.canAfford(price, MONEY_SOURCE.CASH)) return { ok: false, message: 'Not enough personal cash.' };
    const spent = moneyManager.spend(price, { source: MONEY_SOURCE.CASH,
      category: ECONOMY_CATEGORY.OFFICE_UPGRADE, description: 'Pigeon loft: extra perch and new pigeon',
      missionId: null, metadata: { pigeonLoft: true } });
    if (!spent.ok) return { ok: false, message: 'Not enough personal cash.' };
    state.birds.push(freshBird(state.birds.length + 1)); write(state);
    return { ok: true, message: 'Perch installed. A new pigeon has accepted the position.' };
  });
}
