import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getCurrentTownId, startRoadTrip } from './RoadTripManager.js';
import { piInventoryManager } from './PIInventoryManager.js';
import { readTableForThree, dispatchTableForThree } from './TableForThreeService.js';
import { restaurantTravelAccess, matchesArrival } from './TableForThreeTravelPolicy.js';
import { createTableForThreeSingleFlight } from './TableForThreeSingleFlight.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { CASE_ID } from './TableForThreeModel.js';

const navigate = createTableForThreeSingleFlight();
const quest = () => gameState.piQuests?.quests?.[CASE_ID];
export function readTableForThreeTravel() {
  const value = quest()?.metadata?.tableForThreeTravel;
  return value ? structuredClone(value) : null;
}
function writeTravel(value) {
  const q = quest();
  if (!q) throw new Error('Missing Table for Three contract.');
  gameState.piQuests = { ...gameState.piQuests, quests: {
    ...gameState.piQuests.quests, [CASE_ID]: {
      ...q, metadata: { ...(q.metadata || {}), tableForThreeTravel: value }
    }
  }};
  try { requestAutosave(); }
  catch (error) { console.error('[TableForThree] Travel autosave request failed:', error); }
}
let installed = false;
export function installTableForThreeArrivalTracking() {
  if (installed) return;
  installed = true;
  EventBus.on('roadTripCompleted', ({ quote } = {}) => {
    const pending = readTableForThreeTravel();
    if (matchesArrival(pending, quote)) writeTravel({ ...pending, status: 'arrived' });
  });
}
function restoreFailedAttempt(attemptId, previous) {
  const current = readTableForThreeTravel();
  if (current?.attemptId === attemptId && current.status === 'driving') writeTravel(previous);
}
export function visitTableForThreeRestaurant(scene) {
  return navigate(scene, 'restaurant', async () => {
    installTableForThreeArrivalTracking();
    if (quest()?.status !== 'active') return { ok: false, reason: 'No active Table for Three contract.' };
    const access = restaurantTravelAccess(readTableForThree(), getCurrentTownId(), L.restaurant.townId, piInventoryManager.hasItem('camera'));
    if (!access.ok) return access;
    const { TableForThreeRestaurantScene } = await import('../scenes/TableForThreeRestaurantScene.js');
    if (!scene.game.scene.keys[L.restaurant.sceneKey]) scene.game.scene.add(L.restaurant.sceneKey, TableForThreeRestaurantScene, false);
    if (!access.needsDrive) {
      const receipt = readTableForThreeTravel();
      if (readTableForThree()?.stage === 'lead' && !(receipt?.status === 'arrived' && receipt.toTownId === L.restaurant.townId)) {
        writeTravel({ status: 'arrived', fromTownId: L.restaurant.townId, toTownId: L.restaurant.townId, localVisit: true });
      }
      const moved = await scene.goto(L.restaurant.sceneKey);
      return moved === false ? { ok: false, reason: 'Travel was cancelled.' } : { ok: true };
    }
    const previous = readTableForThreeTravel();
    const attemptId = globalThis.crypto?.randomUUID?.() || `tft-trip-${Date.now()}-${Math.random()}`;
    writeTravel({ status: 'driving', attemptId, fromTownId: getCurrentTownId(), toTownId: L.restaurant.townId });
    try {
      const result = await startRoadTrip(scene, L.restaurant.townId, { nextScene: L.restaurant.sceneKey });
      if (!result?.ok) restoreFailedAttempt(attemptId, previous);
      return result || { ok: false, reason: 'The road trip did not start.' };
    } catch (error) {
      restoreFailedAttempt(attemptId, previous);
      throw error;
    }
  });
}
export function confirmTableForThreeArrival() {
  installTableForThreeArrivalTracking();
  const state = readTableForThree();
  let receipt = readTableForThreeTravel();
  if (getCurrentTownId() !== L.restaurant.townId) return { ok: false, reason: 'You must travel to ' + L.restaurant.name + ' first.' };
  if (!state?.venueIdentified || !state.nextMeetingFound) return { ok: false, reason: 'The address has not been discovered.' };
  if (state.stage === 'closed') return { ok: true, state };
  if (quest()?.status !== 'active') return { ok: false, reason: 'No active Table for Three contract.' };
  if (state.stage !== 'lead') return { ok: true, state };
  // Current town is authoritative; recover a missed arrival callback, not an unfinished drive.
  if (receipt?.status === 'driving' && receipt.toTownId === L.restaurant.townId &&
      receipt.fromTownId && receipt.fromTownId !== receipt.toTownId) {
    receipt = { ...receipt, status: 'arrived', reconciledAtDestination: true };
    writeTravel(receipt);
  }
  if (receipt?.status !== 'arrived' || receipt.toTownId !== L.restaurant.townId) return { ok: false, reason: 'The arrival has not been recorded.' };
  return dispatchTableForThree({ type: 'ARRIVE_AT_RESTAURANT' }, { arrivedViaDrive: true });
}
export function returnTableForThreeHome(scene) {
  return navigate(scene, 'home', async () => {
    if (getCurrentTownId() === L.company.townId) {
      const moved = await scene.goto('HomeCityScene', { entryPoint: 'business-center', gameState });
      return moved === false ? { ok: false, reason: 'Return was cancelled.' } : { ok: true };
    }
    const result = await startRoadTrip(scene, L.company.townId, {
      nextScene: 'HomeCityScene', nextData: { entryPoint: 'business-center', gameState }
    });
    return result || { ok: false, reason: 'The return trip did not start.' };
  });
}
