import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeFollowup,allFollowupRead } from './scenes/archive/CrashFollowupModel.js';
export const crashFollowupData=await loadJson('./assets/data/archiveCrashFollowup.json',import.meta.url);
const KEY='archive_crash_followup_progress';
export function getCrashFollowupStory(state=gameState){
  const progress=normalizeFollowup(crashFollowupData,MainStoryManager.getSideClue(KEY));
  const eligible=crashFollowupData.requiredFlags.every(flag=>MainStoryManager.hasFlag(flag))&&getCompletedAgencyCaseCount(state)>=crashFollowupData.minimumCompletedMissions;
  return{...progress,eligible,allRead:allFollowupRead(crashFollowupData,progress)};
}
export function storeCrashFollowup(raw,state=gameState){
  if(!getCrashFollowupStory(state).eligible)return{success:false,saved:false};
  const progress=normalizeFollowup(crashFollowupData,raw),previouslyVerified=MainStoryManager.hasFlag('archive_crash_followup_verified');
  MainStoryManager.setSideClue(KEY,progress);
  if(progress.offered)MainStoryManager.setFlag('archive_crash_followup_received',true);
  if(progress.verified){
    MainStoryManager.setFlag('archive_crash_followup_verified',true);
    MainStoryManager.setSideClue('archive_crash_followup_records',{kind:'cross_referenced_documents',records:crashFollowupData.documents.map(doc=>({id:doc.id,reference:doc.reference})),
      findings:{wreckageLocated:true,bodyRecovered:false,artifactRecovered:false,sabotageEstablished:true,survivalConfirmed:false,saboteurIdentified:false},
      nextObjective:'complete_mission_eight_then_ask_alex_about_recovery_inventory',objective:crashFollowupData.objective});
    if(!previouslyVerified&&!MainStoryManager.hasReachedStage('confirmed_faked_death')){
      const old=MainStoryManager.getSideClue('holly_chapter_progress');
      if(!(Number(old?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
        ...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:2,objective:'complete_mission_eight_then_ask_alex_about_recovery_inventory'});
    }
  }
  return{success:true,saved:saveGameState(),progress};
}
