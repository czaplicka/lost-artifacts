import { storageRoomDialogues } from './storageRoomDialogueService.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';

export const chapterTwoOpeningConfig = { ...(await loadJson('./assets/data/chapterTwoOpening.json', import.meta.url)), ...storageRoomDialogues.chapterTwo };
const F = chapterTwoOpeningConfig.flags;
export function getChapterTwoOpening() {
  const open = MainStoryManager.hasFlag(F.chapterOpen) && MainStoryManager.hasFlag(F.chapterOneComplete);
  const heard = MainStoryManager.hasFlag(F.followup);
  const deskComplete = MainStoryManager.hasFlag(F.deskComplete);
  return { open, heard, deskComplete, needsAlex: open && !heard, needsDesk: open && heard && !deskComplete };
}
function setObjective(objective) {
  const previous = MainStoryManager.getSideClue('holly_chapter_progress');
  if (Number(previous?.chapter) > 2) return;
  MainStoryManager.setSideClue('holly_chapter_progress', {
    ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}),
    version: 1, chapter: 2, chapterOneCompleted: true, objective
  });
}
export function markChapterTwoAlexFollowup() {
  if (!getChapterTwoOpening().open) return { success: false, saved: false };
  MainStoryManager.setFlag(F.followup, true);
  if (getChapterTwoOpening().needsDesk) setObjective('examine_office_dust');
  return { success: true, saved: saveGameState() };
}
export function finishChapterTwoDeskVisit() {
  const state = getChapterTwoOpening();
  if (!state.open || !state.heard || !state.deskComplete) return false;
  setObjective('complete_agency_mission_five');
  return saveGameState();
}
