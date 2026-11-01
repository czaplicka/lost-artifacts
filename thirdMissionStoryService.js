import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';

export const thirdMissionConfig = await loadJson('./assets/data/thirdMissionStory.json', import.meta.url);
const F = thirdMissionConfig.flags;
export function getThirdMissionStory(state = gameState) {
  const eligible = MainStoryManager.hasFlag(F.prerequisite) &&
    getCompletedAgencyCaseCount(state) >= thirdMissionConfig.minimumCompletedMissions;
  const referred = MainStoryManager.hasFlag(F.referred);
  const refused = MainStoryManager.hasFlag(F.refused);
  const decoded = MainStoryManager.hasFlag(F.decoded);
  return { eligible, referred, refused, decoded,
    needsFrank: eligible && !referred,
    needsAlex: eligible && referred && !refused && !decoded,
    canDecode: eligible && referred && refused };
}
export function markFrankReferral(state = gameState) {
  if (!getThirdMissionStory(state).needsFrank) return false;
  MainStoryManager.setFlag(F.referred, true);
  return saveGameState();
}
export function markAlexRefusal(state = gameState) {
  if (!getThirdMissionStory(state).needsAlex) return false;
  MainStoryManager.setFlag(F.refused, true);
  return saveGameState();
}
