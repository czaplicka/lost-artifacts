import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';

export const DEAD_MAIL_OFFICE_QUEST = 'pi_dead_mail_preview';
const ADVERT = 'dead_mail';

export function syncDeadMailOfficeQuest() {
  const quest = getPIQuest(DEAD_MAIL_OFFICE_QUEST);
  if (!quest || quest.metadata?.contentId !== 'dead_mail') return null;
  const progress = gameState.deadMailPreview || {};
  const done = {
    inspect_photo: Array.isArray(progress.clues) && progress.clues.length === 3 && progress.chapterComplete === true,
    day_shift: progress.dayComplete === true,
    night_shift: progress.night?.complete === true,
    final_report: progress.finale?.completed === true
  };
  const next = {
    ...quest,
    objectives: (quest.objectives || []).map(o => ({ ...o, completed: o.completed === true || done[o.id] === true }))
  };
  if (progress.finale?.completed === true) {
    next.status = 'completed';
    next.completedAt = quest.completedAt || progress.finale.completedAt || new Date().toISOString();
  }
  let changed = false;
  if (JSON.stringify(next) !== JSON.stringify(quest)) {
    const state = gameState.piQuests;
    gameState.piQuests = { ...state, quests: { ...state.quests, [DEAD_MAIL_OFFICE_QUEST]: next } };
    changed = true;
  }
  const investigations = gameState.piInvestigations;
  const current = investigations?.cases?.[DEAD_MAIL_OFFICE_QUEST];
  if (current && (current.title !== 'Dead Mail' || (next.status === 'completed' && current.status !== 'completed'))) {
    gameState.piInvestigations = { ...investigations, cases: { ...investigations.cases,
      [DEAD_MAIL_OFFICE_QUEST]: { ...current, title: 'Dead Mail',
        status: next.status === 'completed' ? 'completed' : current.status,
        board: { ...current.board, meta: { ...current.board?.meta, title: 'Dead Mail' } }
      }
    }};
    changed = true;
  }
  if (changed) requestAutosave();
  return next;
}

export function deadMailOfficePart() {
  const p = gameState.deadMailPreview || {};
  if (p.dayComplete !== true) return 'day';
  return p.night?.complete === true ? 'finale' : 'night';
}

function officeAlive(ui) {
  return !ui.destroyed && ui.isOpen && ui.scene?.sys?.isActive?.() !== false;
}
function restoreComputer(ui, message = '') {
  syncDeadMailOfficeQuest();
  if (!officeAlive(ui)) return;
  if (ui.suspended) ui.resume();
  ui.openApp('classifieds');
  ui.selectedId = ADVERT;
  ui.notice = message;
  ui.render();
}

function queueComputerReturn(ui, game, message = '') {
  let finished = false;
  const officeEvents = ui.scene.events;
  const cleanup = () => {
    officeEvents?.off('resume', attempt);
    officeEvents?.off('wake', attempt);
    officeEvents?.off('shutdown', cancel);
    officeEvents?.off('destroy', cancel);
    game.events.off('poststep', attempt);
    game.events.off('destroy', cancel);
  };
  const cancel = () => { if (!finished) { finished = true; cleanup(); } };
  const attempt = () => {
    if (finished) return;
    if (ui.destroyed || !ui.isOpen) { cancel(); return; }
    if (!officeAlive(ui)) return;
    finished = true;
    cleanup();
    restoreComputer(ui, message);
  };
  officeEvents?.on('resume', attempt);
  officeEvents?.on('wake', attempt);
  officeEvents?.once('shutdown', cancel);
  officeEvents?.once('destroy', cancel);
  game.events.once('destroy', cancel);
  game.events.once('poststep', attempt);
}

export async function openDeadMailFromOffice(ui, advert) {
  if (!officeAlive(ui) || ui.suspended || ui.app !== 'classifieds' || ui._deadMailLaunching) return false;
  ui._deadMailLaunching = true;
  let target = null;
  let onExit = null;
  let key = null;
  try {
    const existing = getPIQuest(DEAD_MAIL_OFFICE_QUEST);
    if (!existing) await ui.acceptMission(advert);
    const quest = syncDeadMailOfficeQuest();
    if (!quest || !['active','completed'].includes(quest.status)) return false;
    if (!officeAlive(ui) || ui.suspended || ui.app !== 'classifieds' || ui.selectedId !== advert.id) return false;
    const part = deadMailOfficePart();
    let module, SceneClass, open;
    if (part === 'finale') {
      module = await import('../scenes/DeadMailFinaleScene.js');
      key = 'DeadMailFinaleScene'; SceneClass = module.DeadMailFinaleScene; open = module.openDeadMailFinalePreview;
    } else if (part === 'night') {
      module = await import('../scenes/DeadMailNightScene.js');
      key = 'DeadMailNightScene'; SceneClass = module.DeadMailNightScene; open = module.openDeadMailNightPreview;
    } else {
      module = await import('../scenes/DeadMailScene.js');
      key = 'DeadMailScene'; SceneClass = module.DeadMailScene; open = module.openDeadMailPreview;
    }
    if (!officeAlive(ui) || ui.suspended || ui.app !== 'classifieds' || ui.selectedId !== advert.id) return false;
    if (typeof open !== 'function' || typeof SceneClass !== 'function') throw new Error('Dead Mail scene files are incomplete.');
    const game = ui.scene.game;
    if (!game.scene.keys[key]) game.scene.add(key, SceneClass, false);
    target = game.scene.keys[key];
    let returned = false;
    onExit = () => {
      if (returned) return;
      returned = true;
      target.events.off('shutdown', onExit);
      target.events.off('destroy', onExit);
      queueComputerReturn(ui, game);
    };
    target.events.once('shutdown', onExit);
    target.events.once('destroy', onExit);
    ui.suspend();
    open(game);
    return true;
  } catch (error) {
    console.error('[Dead Mail] Office entry failed:', error);
    if (target && onExit) { target.events.off('shutdown', onExit); target.events.off('destroy', onExit); }
    if (key && ui.scene.game.scene.isActive(key)) ui.scene.game.scene.stop(key);
    const message = 'Dead Mail could not be opened. Your accepted case and progress are preserved. Check the console.';
    if (officeAlive(ui)) restoreComputer(ui, message);
    else queueComputerReturn(ui, ui.scene.game, message);
    return false;
  } finally {
    ui._deadMailLaunching = false;
    if (officeAlive(ui) && !ui.suspended) ui.render();
  }
}

export function renderDeadMailOfficeButton(ui, selected, x, y) {
  if (selected.id !== ADVERT || selected.missionId !== DEAD_MAIL_OFFICE_QUEST) return false;
  const quest = syncDeadMailOfficeQuest();
  const connected = typeof ui.options.onAcceptMission === 'function';
  const busy = ui.accepting || ui._deadMailLaunching;
  const permitted = !quest || ['active','completed'].includes(quest.status);
  const label = !connected ? 'APPLICATIONS UNAVAILABLE' : busy ? 'OPENING CASE...' : !permitted ? 'CASE CLOSED' :
    !quest ? 'ACCEPT CASE' : quest.status === 'completed' ? 'VIEW EPILOGUE' :
    ({ day:'CONTINUE CASE', night:'CONTINUE NIGHT', finale:'CONTINUE FINALE' })[deadMailOfficePart()];
  ui.drawing.button(x, y, label, () => void openDeadMailFromOffice(ui, selected), connected && permitted && !busy);
  return true;
}
