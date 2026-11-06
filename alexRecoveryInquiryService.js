import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeAlexRecovery,canStartAlexRecovery } from './scenes/storage/AlexRecoveryModel.js';
export const alexRecoveryData=await loadJson('./assets/data/alexRecoveryInquiry.json',import.meta.url);
const KEY='alex_recovery_inquiry_progress';
export function getAlexRecoveryStory(state=gameState){
  const progress=normalizeAlexRecovery(alexRecoveryData,MainStoryManager.getSideClue(KEY));
  const eligible=canStartAlexRecovery(alexRecoveryData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag));
  return{...progress,eligible,completed:progress.phase==='complete'};
}
export function storeAlexRecovery(raw,state=gameState){
  if(!getAlexRecoveryStory(state).eligible)return{success:false,saved:false};
  const progress=normalizeAlexRecovery(alexRecoveryData,raw),alreadyHeard=MainStoryManager.hasFlag('alex_staged_crash_admission_heard');
  MainStoryManager.setSideClue(KEY,progress);
  if(progress.discrepancyFound)MainStoryManager.setFlag('alex_recovery_parachute_discrepancy_found',true);
  if(progress.phase==='complete'){
    MainStoryManager.setFlag('alex_staged_crash_admission_heard',true);
    MainStoryManager.setFlag('escape_timeline_reconstruction_unlocked',true);
    MainStoryManager.setSideClue('alex_escape_preparation_statement',{source:'partner_murphy',kind:'equipment_accounting_and_npc_statement',reference:alexRecoveryData.reference,
      findings:{parachuteUnaccounted:true,alexAdmittedHelpingPreparation:true,destinationKnown:false,escapeTimelineVerified:false},objective:alexRecoveryData.objective});
    if(!alreadyHeard&&!MainStoryManager.hasReachedStage('confirmed_faked_death')){
      const old=MainStoryManager.getSideClue('holly_chapter_progress');
      if(!(Number(old?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
        ...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:2,objective:'reconstruct_john_escape_timeline'});
    }
  }
  return{success:true,saved:saveGameState(),progress};
}
