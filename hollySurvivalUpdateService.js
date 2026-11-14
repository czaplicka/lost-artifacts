import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeHollySurvival,hollySurvivalEligible } from './hollySurvivalUpdateModel.js';
export const hollySurvivalData=await loadJson('./assets/data/hollySurvivalUpdate.json',import.meta.url);
const KEY='holly_survival_update_call';
export function getHollySurvivalState(state=gameState){
  const progress=normalizeHollySurvival(hollySurvivalData,MainStoryManager.getSideClue(KEY));
  const eligible=hollySurvivalEligible(hollySurvivalData,getCompletedAgencyCaseCount(state),flag=>MainStoryManager.hasFlag(flag),MainStoryManager.hasReachedStage('confirmed_faked_death'));
  const completed=progress.completed||MainStoryManager.hasFlag('holly_informed_staged_disappearance');
  return{...progress,completed,eligible,canContact:eligible&&!completed};
}
export function storeHollySurvival(raw,state=gameState){
  const status=getHollySurvivalState(state);
  if(!status.eligible)return{success:false,saved:false};
  if(status.completed)return{success:true,alreadyCompleted:true,saved:saveGameState()};
  const progress=normalizeHollySurvival(hollySurvivalData,raw);MainStoryManager.setSideClue(KEY,progress);
  if(progress.completed){
    MainStoryManager.setFlag('holly_informed_staged_disappearance',true);
    MainStoryManager.setFlag('holly_silent_reaction_observed',true);
    MainStoryManager.setFlag('holly_chapter_two_completed',true);
    MainStoryManager.setFlag('holly_financial_lead_conversation_unlocked',true);
    MainStoryManager.setSideClue('holly_survival_update_summary',{source:'holly_phone_call',stagedEscapeReported:true,currentLocationKnown:false,
      reaction:__dialogueText("hollySurvivalUpdateService.js", "t_d840962bb13ec41b4f02"),reactionEstablishesGuilt:false});
    const old=MainStoryManager.getSideClue('holly_chapter_progress');
    if(!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{
      ...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,chapterTwoCompleted:true,objective:'ask_holly_for_financial_lead'});
  }
  return{success:true,saved:saveGameState(),progress};
}
