import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';

export const insuranceStoryConfig = await loadJson('./assets/data/insuranceArchiveStory.json', import.meta.url);
const F = insuranceStoryConfig.flags;
export function getInsuranceArchiveStory(state=gameState) {
  const eligible=getCompletedAgencyCaseCount(state)>=insuranceStoryConfig.minimumCompletedMissions &&
    insuranceStoryConfig.requiredFlags.every(flag=>MainStoryManager.hasFlag(flag));
  const offered=MainStoryManager.hasFlag(F.offered),examined=MainStoryManager.hasFlag(F.examined),discussed=MainStoryManager.hasFlag(F.discussed);
  return{eligible,offered,examined,discussed,needsOffer:eligible&&!offered,
    canCompare:eligible&&offered,needsDiscussion:eligible&&offered&&examined&&!discussed};
}
export function markInsuranceDocumentsReceived(state=gameState) {
  if(!getInsuranceArchiveStory(state).eligible)return{success:false,saved:false};
  MainStoryManager.setFlag(F.offered,true);
  return{success:true,saved:saveGameState()};
}
export function markInsuranceDiscussion(state=gameState) {
  const story=getInsuranceArchiveStory(state);
  if(!story.canCompare||!story.examined)return{success:false,saved:false};
  MainStoryManager.setFlag(F.discussed,true);MainStoryManager.setFlag(F.hrLead,true);
  const previous=MainStoryManager.getSideClue('holly_chapter_progress');
  if(!(Number(previous?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
    ...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),
    version:1,chapter:2,chapterOneCompleted:true,objective:'ask_hr_about_insurance_and_commissioner'
  });
  return{success:true,saved:saveGameState()};
}
