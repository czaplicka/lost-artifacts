import { storageRoomDialogues } from './storageRoomDialogueService.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeEscape,escapeEligible,escapeStagePlan } from './scenes/storage/EscapeTimelineModel.js';
export const escapeTimelineData = { ...(await loadJson('./assets/data/escapeTimeline.json',import.meta.url)), ...storageRoomDialogues.escape };
const KEY='john_escape_timeline';
export function getEscapeTimelineStory(state=gameState){
  const progress=normalizeEscape(escapeTimelineData,MainStoryManager.getSideClue(KEY));
  const eligible=escapeEligible(escapeTimelineData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag),MainStoryManager.hasReachedStage('learned_dead'));
  return{...progress,eligible};
}
export function storeEscapeTimeline(raw,state=gameState){
  if(!getEscapeTimelineStory(state).eligible)return{success:false,saved:false};
  const progress=normalizeEscape(escapeTimelineData,raw),alreadyDone=MainStoryManager.hasFlag('john_escape_timeline_reconstructed');
  MainStoryManager.setSideClue(KEY,progress);
  if(progress.clarificationHeard)MainStoryManager.setFlag('alex_parachute_witness_clarification_heard',true);
  let stageSynced=MainStoryManager.hasReachedStage('confirmed_faked_death');
  if(progress.completed){
    MainStoryManager.setFlag('john_escape_timeline_reconstructed',true);
    for(const id of escapeStagePlan(MainStoryManager.getCurrentStage().id))if(!MainStoryManager.advanceToStage(id))break;
    stageSynced=MainStoryManager.hasReachedStage('confirmed_faked_death');
    MainStoryManager.setSideClue('john_escape_reconstruction',{sources:['equipment_accounting','alex_admission','alex_witness_clarification','JM-041','JM-041-R'],
      conclusion:'staged_escape_before_impact',currentLocationKnown:false,saboteurIdentified:false,order:[...escapeTimelineData.correctOrder]});
    if(stageSynced){
      MainStoryManager.setFlag('holly_survival_update_unlocked',true);
      if(!alreadyDone){const old=MainStoryManager.getSideClue('holly_chapter_progress');if(!(Number(old?.chapter)>2))MainStoryManager.setSideClue('holly_chapter_progress',{
        ...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:2,objective:'inform_holly_about_staged_disappearance'});}
    }
  }
  return{success:true,saved:saveGameState(),stageSynced,progress};
}
