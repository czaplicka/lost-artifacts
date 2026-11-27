import { requestAutosave } from '../gameStatePersistence.js';
import { canStartRoadTrip, getCurrentTownId } from './RoadTripManager.js';
import { HOME_TOWN_ID } from '../config/RoadTripTowns.js';
import { DriveScene } from '../scenes/DriveScene.js';
import { SHORT_SHORTS_CONFIG as CONFIG } from '../config/ShortShortsConfig.js';

let session = null;
class ShortShortsArrivalScene extends Phaser.Scene {
  constructor() { super({ key: CONFIG.arrivalSceneKey }); }
  create(data) {
    const s = session;
    if (!s || data?.sessionId !== s.id) { this.add.text(30, 40, 'Travel session expired. Reload your last save.', { fontFamily: 'SpecialElite', fontSize: '22px', color: '#ffffff' }); return; }
    if (getCurrentTownId() !== data.townId) { this.add.text(30, 40, 'Arrival has not been recorded. Check the console.', { color: '#ffffff' }); return; }
    requestAutosave();
    if (data.townId === HOME_TOWN_ID) { restoreOffice(); this.scene.stop(); }
    else this.scene.start(CONFIG.sceneKey);
  }
}
function restoreOffice() {
  const s = session; if (!s) return;
  session = null;
  for (const key of s.paused) if (s.manager.isPaused(key)) s.manager.resume(key);
  if (!s.ui.destroyed && s.ui.isOpen) { s.ui.resume(); s.ui.notice = 'Back in Home Town. Observation progress saved.'; s.ui.render(); }
}
function launchDrive(toTownId) {
  const s = session;
  if (!s) return { ok: false, message: 'No active travel session.' };
  const check = canStartRoadTrip(getCurrentTownId(), toTownId, { mode: 'pi' });
  if (!check.ok) return check;
  if (s.manager.isActive('DriveScene')) return { ok: false, message: 'A drive is already running.' };
  s.manager.start('DriveScene', { fromTownId: check.quote.fromId, toTownId, quote: check.quote,
    nextScene: CONFIG.arrivalSceneKey, nextData: { sessionId: s.id, townId: toTownId } });
  s.manager.bringToTop('DriveScene');
  return { ok: true };
}
export async function openShortShortsTrip(ui) {
  if (session) return { ok: false, message: 'A trip is already in progress.' };
  const { ShortShortsScene } = await import('../scenes/ShortShortsScene.js');
  if (ui.destroyed || !ui.isOpen || ui.suspended) return { ok: false, message: 'The computer is closed.' };
  const manager = ui.scene.game.scene;
  if (!manager.keys.DriveScene) manager.add('DriveScene', DriveScene, false);
  if (!manager.keys[CONFIG.arrivalSceneKey]) manager.add(CONFIG.arrivalSceneKey, ShortShortsArrivalScene, false);
  if (!manager.keys[CONFIG.sceneKey]) manager.add(CONFIG.sceneKey, ShortShortsScene, false);
  const here = getCurrentTownId();
  if (here !== CONFIG.townId) { const check = canStartRoadTrip(here, CONFIG.townId, { mode: 'pi' }); if (!check.ok) return check; }
  session = { id: `ss-${Date.now()}-${Math.random()}`, ui, manager, paused: manager.getScenes(true).map(s => s.sys.settings.key) };
  ui.suspend();
  session.paused.forEach(key => manager.pause(key));
  try {
    if (here === CONFIG.townId) { manager.start(CONFIG.sceneKey); manager.bringToTop(CONFIG.sceneKey); return { ok: true }; }
    const result = launchDrive(CONFIG.townId);
    if (!result.ok) restoreOffice();
    return result;
  } catch (error) { restoreOffice(); throw error; }
}
export function returnFromShortShorts(scene) {
  if (!session) return { ok: false, message: 'The office session is unavailable. Reload your save.' };
  if (getCurrentTownId() !== CONFIG.townId) return { ok: false, message: 'The current town does not match the observation town.' };
  const result = launchDrive(HOME_TOWN_ID);
  if (result.ok) scene.scene.stop();
  return result;
}
