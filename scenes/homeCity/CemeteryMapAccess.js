import { dialogueText as __dialogueText } from '../../dialogues/DialogueText.js';
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { syncDeadMailOfficeQuest } from '../../managers/DeadMailOfficeIntegration.js';
import { getDeadMailProgress } from '../../managers/DeadMailManager.js';

const SOURCE = 'scenes/homeCity/CemeteryMapAccess.js';
const t = id => __dialogueText(SOURCE, id);
const REQUIRED_PHOTO_CLUES = ['angel', 'plot', 'label'];
const REQUIRED_POSTAL_TOPICS = ['photo', 'route', 'gate'];
const DAY_STAGES = ['arrival', 'cemetery', 'staff', 'records', 'deduction'];

export const CEMETERY_BUILDING = {
  id: 'cemetery', name: t('t_fcd5ad393af860802561'),
  x: 20, y: 13, w: 4, h: 4, color: 0x66735a, message: ''
};
export const CEMETERY_REFUSALS = [
  t('t_2031ac200dbe604ceded'), t('t_c53f2303abc388bad605'),
  t('t_277c4d77694ed9b21924'), t('t_c2ab3515cbcabe59a235')
];

function hasActiveDeadMailCase(state) {
  const quest = state.piQuests?.quests?.pi_dead_mail_preview;
  return quest?.metadata?.contentId === 'dead_mail' && ['active', 'completed'].includes(quest.status);
}
function hasRecordedLocation(progress) {
  return progress.chapterComplete === true || progress.dayComplete === true || progress.finale?.completed === true;
}
function missingPhotoClues(state) {
  const clues = Array.isArray(state.deadMailPreview?.clues) ? state.deadMailPreview.clues : [];
  return REQUIRED_PHOTO_CLUES.filter(id => !clues.includes(id));
}
function missingPostalTopics(state) {
  const topics = Array.isArray(state.postOffice?.dead) ? state.postOffice.dead : [];
  return REQUIRED_POSTAL_TOPICS.filter(id => !topics.includes(id));
}
function completedPostalRoute(state) {
  return missingPhotoClues(state).length === 0 && missingPostalTopics(state).length === 0;
}

export function cemeteryEntryStatus(state = gameState) {
  if (!hasActiveDeadMailCase(state)) return { allowed: false, reason: 'no_case' };
  const progress = state.deadMailPreview || {};
  if (!hasRecordedLocation(progress) && !completedPostalRoute(state)) {
    const photoMissing = missingPhotoClues(state);
    if (photoMissing.length) {
      return {
        allowed: false, reason: 'missing_photo_clues',
        message: 'Blackthorn. Right cemetery. Several thousand possible recipients. ' +
          'That delivery photograph is the only view I have of the place.'
      };
    }
    const postalMissing = missingPostalTopics(state);
    if (postalMissing.length) {
      return {
        allowed: false, reason: 'missing_postal_topics',
        message: 'A grave is an unusual delivery address. ' +
          'Someone brought that parcel here. I need to know how.'
      };
    }
    return {
      allowed: false, reason: 'no_location',
      message: 'The cemetery has a name. The delivery still needs an address.'
    };
  }
  if (progress.dayComplete !== true) return { allowed: true, part: 'day' };
  return { allowed: true, part: progress.night?.complete === true ? 'finale' : 'night' };
}

function prepareCemeteryProgress() {
  if (!hasActiveDeadMailCase(gameState)) return false;
  const progress = getDeadMailProgress();
  const locationKnown = hasRecordedLocation(progress) || completedPostalRoute(gameState);
  if (!locationKnown) return false;
  const next = { ...progress, chapterComplete: true };
  if (next.dayComplete !== true && !DAY_STAGES.includes(next.stage)) next.stage = 'arrival';
  if (next.chapterComplete !== progress.chapterComplete || next.stage !== progress.stage) {
    gameState.deadMailPreview = next;
    requestAutosave();
  }
  return true;
}
export function cemeteryEntryMessage(city, status) {
  if (status.reason === 'no_case') {
    const index = Number.isInteger(city.cemeteryRefusalIndex) ? city.cemeteryRefusalIndex : 0;
    city.cemeteryRefusalIndex = (index + 1) % CEMETERY_REFUSALS.length;
    return CEMETERY_REFUSALS[index % CEMETERY_REFUSALS.length];
  }
  return status.message || 'I have the cemetery. Not the route to that grave.';
}
export function cemeteryMapParent(game, part) {
  const city = game?.scene?.keys?.HomeCityScene;
  if (!city || city.disposed || !city.sys?.isActive?.() || city.path?.length) return null;
  const cemetery = city.buildings?.find(building => building.id === 'cemetery');
  if (!cemetery?.door || city.position?.x !== cemetery.door.x || city.position?.y !== cemetery.door.y) return null;
  const status = cemeteryEntryStatus();
  return status.allowed && status.part === part ? city : null;
}
export function requireCemeteryMapEntry(game, part, data) {
  if (data?.entrySource !== 'cemetery-map' || !cemeteryMapParent(game, part)) {
    throw Error('Walk to Blackthorn Cemetery on the city map and enter through its gate.');
  }
}
export async function enterCemeteryFromMap(city) {
  if (city.disposed || city.navigating || city.path?.length) return false;
  const cemetery = city.buildings?.find(building => building.id === 'cemetery');
  if (!cemetery?.door || !city.position ||
    city.position.x !== cemetery.door.x || city.position.y !== cemetery.door.y) return false;
  const status = cemeteryEntryStatus();
  if (!status.allowed) {
    city.say(cemeteryEntryMessage(city, status));
    return false;
  }
  city.navigating = true;
  city.heldArrows?.clear();
  city.remember();
  const token = city.runToken;
  const game = city.game;
  let target = null;
  let key = null;
  let onExit = null;
  let opened = false;
  try {
    let module;
    let SceneClass;
    let open;
    if (status.part === 'finale') {
      module = await import('../DeadMailFinaleScene.js');
      key = 'DeadMailFinaleScene';
      SceneClass = module.DeadMailFinaleScene;
      open = module.openDeadMailFinalePreview;
    } else if (status.part === 'night') {
      module = await import('../DeadMailNightScene.js');
      key = 'DeadMailNightScene';
      SceneClass = module.DeadMailNightScene;
      open = module.openDeadMailNightPreview;
    } else {
      module = await import('../DeadMailScene.js');
      key = 'DeadMailScene';
      SceneClass = module.DeadMailScene;
      open = module.openDeadMailPreview;
    }
    if (city.disposed || city.runToken !== token) return false;
    const current = cemeteryEntryStatus();
    if (!current.allowed || current.part !== status.part) return false;
    if (typeof SceneClass !== 'function' || typeof open !== 'function') {
      throw Error('The cemetery scene files are incomplete.');
    }
    if (status.part === 'day' && !prepareCemeteryProgress()) return false;
    if (!game.scene.keys[key]) game.scene.add(key, SceneClass, false);
    target = game.scene.keys[key];
    let returned = false;
    onExit = () => {
      if (returned) return;
      returned = true;
      target.events.off('shutdown', onExit);
      target.events.off('destroy', onExit);
      try { syncDeadMailOfficeQuest(); }
      catch (error) { console.error('[CemeteryMapAccess] Quest sync failed:', error); }
      if (!city.disposed && city.runToken === token) {
        city.navigating = false;
        city.registry?.set('currentSceneKey', 'HomeCityScene');
      }
    };
    target.events.once('shutdown', onExit);
    target.events.once('destroy', onExit);
    open(game, { entrySource: 'cemetery-map' });
    opened = true;
    return true;
  } catch (error) {
    console.error('[CemeteryMapAccess]', error);
    if (target && onExit) {
      target.events.off('shutdown', onExit);
      target.events.off('destroy', onExit);
    }
    if (key && game.scene.isActive(key)) game.scene.stop(key);
    if (!city.disposed && city.runToken === token) city.say(t('t_8992dbe6ec25cd70fca3'));
    return false;
  } finally {
    if (!opened && !city.disposed && city.runToken === token) city.navigating = false;
  }
}
