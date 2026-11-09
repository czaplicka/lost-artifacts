import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getPIQuest } from './PIQuestManager.js';
import { DEAD_MAIL_MESSAGE } from './DeadMailCorrespondence.js';

export const DEAD_MAIL_OFFICE_QUEST = 'pi_dead_mail_preview';
const ADVERT = 'dead_mail';

export function syncDeadMailOfficeQuest() {
  const quest = getPIQuest(DEAD_MAIL_OFFICE_QUEST);
  if (!quest || quest.metadata?.contentId !== 'dead_mail') return null;

  const p = gameState.deadMailPreview || {};
  const done = {
    inspect_photo: Array.isArray(p.clues) && p.clues.length === 3 && p.chapterComplete === true,
    day_shift: p.dayComplete === true,
    night_shift: p.night?.complete === true,
    final_report: p.finale?.completed === true
  };

  const next = {
    ...quest,
    objectives: (quest.objectives || []).map(o => ({
      ...o,
      completed: o.completed === true || done[o.id] === true
    }))
  };

  if (p.finale?.completed === true) {
    next.status = 'completed';
    next.completedAt = quest.completedAt || p.finale.completedAt || new Date().toISOString();
  }

  let changed = false;
  if (JSON.stringify(next) !== JSON.stringify(quest)) {
    const s = gameState.piQuests;
    gameState.piQuests = {
      ...s,
      quests: { ...s.quests, [DEAD_MAIL_OFFICE_QUEST]: next }
    };
    changed = true;
  }

  const s = gameState.piInvestigations;
  const c = s?.cases?.[DEAD_MAIL_OFFICE_QUEST];
  if (c && (c.title !== 'Dead Mail' || (next.status === 'completed' && c.status !== 'completed'))) {
    gameState.piInvestigations = {
      ...s,
      cases: {
        ...s.cases,
        [DEAD_MAIL_OFFICE_QUEST]: {
          ...c,
          title: 'Dead Mail',
          status: next.status === 'completed' ? 'completed' : c.status,
          board: { ...c.board, meta: { ...c.board?.meta, title: 'Dead Mail' } }
        }
      }
    };
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

export async function openDeadMailFromOffice(ui, advert) {
  if (!officeAlive(ui) || ui.suspended || ui.app !== 'classifieds' || ui._deadMailLaunching) return false;
  if (advert?.id !== ADVERT || advert.missionId !== DEAD_MAIL_OFFICE_QUEST) return false;
  if (getPIQuest(DEAD_MAIL_OFFICE_QUEST)) return false;

  ui._deadMailLaunching = true;
  try {
    await ui.acceptMission(advert);
    const q = syncDeadMailOfficeQuest();
    if (!q || q.status !== 'active') return false;
    if (officeAlive(ui) && !ui.suspended && ui.app === 'classifieds' && ui.selectedId === advert.id) {
      ui.notice = 'Case accepted. Florence’s email is available in Mail.';
    }
    return true;
  } catch (error) {
    console.error('[Dead Mail] Acceptance failed:', error);
    if (officeAlive(ui)) ui.notice = 'The case could not be accepted. Please try again.';
    return false;
  } finally {
    ui._deadMailLaunching = false;
    if (officeAlive(ui) && !ui.suspended) ui.render();
  }
}

// Retain the export for older callers, but never launch field scenes from Mail.
export async function openDeadMailFieldFromOffice(ui) {
  if (!officeAlive(ui) || ui.suspended || ui.app !== 'mail' || ui.selectedId !== DEAD_MAIL_MESSAGE) return false;
  ui.notice = 'Inspect the attached photograph first. Then close the computer, walk to Blackthorn Cemetery on the city map, and enter through its gate to meet Florence.';
  ui.render();
  return false;
}

export function renderDeadMailOfficeButton(ui, selected, x, y) {
  if (selected.id !== ADVERT || selected.missionId !== DEAD_MAIL_OFFICE_QUEST) return false;
  const q = syncDeadMailOfficeQuest();
  const connected = typeof ui.options.onAcceptMission === 'function';
  const busy = ui.accepting || ui._deadMailLaunching;
  const label = !connected ? 'APPLICATIONS UNAVAILABLE'
    : busy ? 'PLEASE WAIT...'
    : q?.status === 'completed' ? 'CASE COMPLETED'
    : q ? 'CASE ACCEPTED' : 'ACCEPT CASE';
  ui.drawing.button(x, y, label, () => void openDeadMailFromOffice(ui, selected), connected && !q && !busy);
  return true;
}

export function deadMailMailActionHeight(width) {
  return 54;
}

export function renderDeadMailMailActions(ui, x, y, width) {
  ui.drawing.button(
    x, y, 'OPEN PHOTO',
    () => void ui.deadMailAttachment?.open(),
    !ui._deadMailLaunching
  );
}