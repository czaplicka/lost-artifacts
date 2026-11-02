import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';

export const HOLLY_CHAPTER_ONE_CALL = 'holly_chapter_one_call';
const INFORMED = 'holly_informed_presumed_dead';
const FINISHED = 'holly_chapter_one_completed';

export function getHollyChapterOneState(state = gameState) {
  const completed = MainStoryManager.hasFlag(FINISHED);
  const eligible = getCompletedAgencyCaseCount(state) >= 4 &&
    ['redacted_report_decoded', 'alex_crash_account_heard', 'crash_timeline_reconstructed']
      .every(flag => MainStoryManager.hasFlag(flag));
  return { completed, eligible, canContact: eligible && !completed };
}

export function saveHollyChapterOnePosition(index, state = gameState) {
  if (!getHollyChapterOneState(state).canContact || !Number.isInteger(index) || index < 0) return false;
  MainStoryManager.setSideClue(HOLLY_CHAPTER_ONE_CALL, { version: 1, lineIndex: index, completed: false });
  return saveGameState();
}

export function completeHollyChapterOne(state = gameState) {
  const status = getHollyChapterOneState(state);
  if (!status.eligible) return { success: false, saved: false };
  if (status.completed) return { success: true, alreadyCompleted: true, saved: saveGameState() };
  if (MainStoryManager.getCurrentStage().id === 'joined_agency') {
    if (!MainStoryManager.advanceToStage('learned_dead')) return { success: false, saved: false };
  }
  // These chapter flags are independent of the manager's smaller discovery stages.
  MainStoryManager.setFlag(INFORMED, true);
  MainStoryManager.setFlag(FINISHED, true);
  MainStoryManager.setFlag('holly_chapter_two_unlocked', true);
  MainStoryManager.setSideClue(HOLLY_CHAPTER_ONE_CALL, { version: 1, completed: true });
  const previous = MainStoryManager.getSideClue('holly_chapter_progress');
  MainStoryManager.setSideClue('holly_chapter_progress', {
    ...(previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {}),
    version: 1,
    chapter: Math.max(2, Number(previous?.chapter) || 1),
    chapterOneCompleted: true,
    objective: 'investigate_john_remains'
  });
  return { success: true, saved: saveGameState() };
}
