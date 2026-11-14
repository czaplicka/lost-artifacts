import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
  if (c && (c.title !== __dialogueText("managers/DeadMailOfficeIntegration.js", "t_16abdc3e0b396e03e229") || (next.status === 'completed' && c.status !== 'completed'))) {
    gameState.piInvestigations = {
      ...s,
      cases: {
        ...s.cases,
        [DEAD_MAIL_OFFICE_QUEST]: {
          ...c,
          title: __dialogueText("managers/DeadMailOfficeIntegration.js", "t_16abdc3e0b396e03e229"),
          status: next.status === 'completed' ? 'completed' : c.status,
          board: { ...c.board, meta: { ...c.board?.meta, title: __dialogueText("managers/DeadMailOfficeIntegration.js", "t_16abdc3e0b396e03e229") } }
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
      ui.notice = __dialogueText("managers/DeadMailOfficeIntegration.js", "t_91fba0c628b8405044a1");
    }
    return true;
  } catch (error) {
    console.error('[Dead Mail] Acceptance failed:', error);
    if (officeAlive(ui)) ui.notice = __dialogueText("managers/DeadMailOfficeIntegration.js", "t_2fb6ec242e27c8fabc2e");
    return false;
  } finally {
    ui._deadMailLaunching = false;
    if (officeAlive(ui) && !ui.suspended) ui.render();
  }
}

// Retain the export for older callers, but never launch field scenes from Mail.
export async function openDeadMailFieldFromOffice(ui) {
  if (!officeAlive(ui) || ui.suspended || ui.app !== 'mail' || ui.selectedId !== DEAD_MAIL_MESSAGE) return false;
  ui.notice = __dialogueText("managers/DeadMailOfficeIntegration.js", "t_b4faca5e6e648b4eb49b");
  ui.render();
  return false;
}

export function renderDeadMailOfficeButton(ui, selected, x, y) {
  if (selected.id !== ADVERT || selected.missionId !== DEAD_MAIL_OFFICE_QUEST) return false;
  const q = syncDeadMailOfficeQuest();
  const connected = typeof ui.options.onAcceptMission === 'function';
  const busy = ui.accepting || ui._deadMailLaunching;
  const label = !connected ? __dialogueText("managers/DeadMailOfficeIntegration.js", "t_51f20505963f7ee9bfd1")
    : busy ? __dialogueText("managers/DeadMailOfficeIntegration.js", "t_9dafd8f8b8d7f70bc7f6")
    : q?.status === 'completed' ? __dialogueText("managers/DeadMailOfficeIntegration.js", "t_f7f37ae3f8a1d3822995")
    : q ? __dialogueText("managers/DeadMailOfficeIntegration.js", "t_c70cacc1f5ee8c47c3cb") : __dialogueText("managers/DeadMailOfficeIntegration.js", "t_c6d34a3f78e7d2224c67");
  ui.drawing.button(x, y, label, () => void openDeadMailFromOffice(ui, selected), connected && !q && !busy);
  return true;
}

export function deadMailMailActionHeight(width) {
  return 54;
}

export function renderDeadMailMailActions(ui, x, y, width) {
  ui.drawing.button(
    x, y, __dialogueText("managers/DeadMailOfficeIntegration.js", "t_8668ceed841233585819"),
    () => void ui.deadMailAttachment?.open(),
    !ui._deadMailLaunching
  );
}