import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';

export const fourthMissionConfig = await loadJson('./assets/data/fourthMissionStory.json', import.meta.url);
const F = fourthMissionConfig.flags;

export function getFourthMissionStory(state = gameState) {
  const eligible = getCompletedAgencyCaseCount(state) >= fourthMissionConfig.minimumCompletedMissions &&
    MainStoryManager.hasFlag(F.reportDecoded);
  const heard = MainStoryManager.hasFlag(F.accountHeard);
  const completed = MainStoryManager.hasFlag(F.timelineCompleted);
  return { eligible, heard, completed, needsAccount: eligible && !heard,
    canReconstruct: eligible && heard };
}

export function markAlexCrashAccount(state = gameState) {
  const story = getFourthMissionStory(state);
  if (!story.eligible) return { success: false, saved: false };
  if (!story.heard) MainStoryManager.setFlag(F.accountHeard, true);
  return { success: true, saved: saveGameState() };
}
