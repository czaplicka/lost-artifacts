import { MainStoryManager } from './managers/MainStoryManager.js';
import { gameState } from './GameData.js';
import { RECEIPTS_KEY, getArchiveCaseId, isSuccessfulCase } from './archiveReportService.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';

export const archiveStoryConfig = await loadJson('./assets/data/archiveMissingReport.json', import.meta.url);
const F = archiveStoryConfig.flags;

export function getCompletedAgencyCaseCount(state = gameState) {
  const receipts = MainStoryManager.getSideClue(RECEIPTS_KEY);
  const ids = new Set();
  if (receipts && typeof receipts === 'object' && !Array.isArray(receipts)) {
    for (const [key, value] of Object.entries(receipts)) {
      if (key.startsWith('report:') && value?.report?.metadata?.outcome === 'SUCCESS') ids.add(key.slice(7));
    }
  }
  const currentId = getArchiveCaseId(state);
  if (currentId !== null && isSuccessfulCase(state)) ids.add(currentId);
  return ids.size;
}

export function getMissingReportState(state = gameState) {
  const completed = MainStoryManager.hasFlag(F.completed);
  const prerequisites = archiveStoryConfig.requiredFlags.every(flag => MainStoryManager.hasFlag(flag));
  const started = MainStoryManager.hasFlag(F.started);
  const eligible = prerequisites && getCompletedAgencyCaseCount(state) >= archiveStoryConfig.minimumCompletedMissions;
  return {
    completed,
    active: !completed && (started || eligible),
    started,
    searched: MainStoryManager.hasFlag(F.catalogueSearched),
    found: MainStoryManager.hasFlag(F.found)
  };
}

export function startMissingReportVisit(state = gameState) {
  const story = getMissingReportState(state);
  if (!story.active || story.started) return false;
  MainStoryManager.setFlag(F.started, true);
  saveGameState();
  return true;
}

export function searchMissingReportCatalogue(state = gameState) {
  if (!getMissingReportState(state).active) return false;
  MainStoryManager.setFlag(F.catalogueSearched, true);
  return saveGameState();
}

export function discoverShredderFragments(state = gameState) {
  const story = getMissingReportState(state);
  if (!story.active || !story.searched) return false;
  MainStoryManager.setFlag(F.found, true);
  return saveGameState();
}
