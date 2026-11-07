import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { loadJson } from './config/loadJson.js';
import { saveGameState } from './gameStatePersistence.js';
import { normalizeFinale,finaleAction } from './scenes/pi-office/HollyFinaleModel.js';
export const hollyFinaleData=await loadJson('./assets/data/hollyFinale.json',import.meta.url);
const KEY='holly_finale_progress';
let endingSavePending=false;
export function getHollyFinale(){const state=normalizeFinale(hollyFinaleData,Story.getSideClue(KEY));if(!state.completed)endingSavePending=false;return{...state,endingSavePending:state.completed&&endingSavePending,eligible:hollyFinaleData.requiredFlags.every(f=>Story.hasFlag(f))&&Story.hasReachedStage('confronted_husband')&&(!Story.hasReachedStage('completed')||state.completed)};}
export function performHollyFinale(action,id=null){
 const current=getHollyFinale();if(!current.eligible)return{ok:false,state:current,saved:null,message:'Complete John\'s formal confrontation first. An already closed legacy case cannot be given a new ending here.'};
 if(action==='retry_save'){const saved=saveGameState();if(current.completed)endingSavePending=!saved;return{ok:true,state:current,saved,message:''};}
 const r=finaleAction(hollyFinaleData,current,action,id);if(!r.ok)return{...r,saved:null};
 if(action==='prepare'&&!Story.hasReachedStage('final_decision_pending')&&!Story.advanceToStage('final_decision_pending')){r.state.ready=false;r.state.line=0;r.state.candidate=null;r.ok=false;r.message='The earlier story milestone must be completed before preparing the final decision.';Story.setSideClue(KEY,r.state);return{...r,saved:saveGameState()};}
 if(r.state.completed&&!Story.hasReachedStage('completed')&&!Story.advanceToStage('completed')){r.state.completed=false;r.state.outcome=null;r.state.candidate=id;r.ok=false;r.message='The choice is not committed. The final-decision story milestone must be available.';Story.setSideClue(KEY,r.state);return{...r,saved:saveGameState()};}
 Story.setSideClue(KEY,r.state);
 if(r.state.completed){Story.setFlag('holly_final_choice_made',true);Story.setFlag('holly_arrested',r.state.outcome==='arrest');Story.setFlag('holly_released',r.state.outcome==='release');Story.setSideClue('holly_final_outcome',{version:1,choice:r.state.outcome,endingId:r.state.outcome==='arrest'?'the_record_stands':'the_door_left_open',johnAddressDisclosed:false,automaticConviction:false});Story.setSideClue('holly_chapter_progress',{version:1,chapter:5,objective:'main_investigation_completed',outcome:r.state.outcome});}
 const saved=saveGameState();if(r.state.completed)endingSavePending=!saved;return{...r,saved};
}
