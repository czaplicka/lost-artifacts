import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { loadJson } from './config/loadJson.js';
import { saveGameState } from './gameStatePersistence.js';
import { normalizeConfrontation,confrontationAction } from './scenes/pi-office/JohnConfrontationModel.js';
export const johnConfrontationData=await loadJson('./assets/data/johnConfrontation.json',import.meta.url);
const KEY='john_formal_confrontation_progress';
export function getJohnConfrontation(){return{...normalizeConfrontation(johnConfrontationData,Story.getSideClue(KEY)),eligible:johnConfrontationData.requiredFlags.every(f=>Story.hasFlag(f))&&Story.hasReachedStage('learned_wife_is_threat')};}
export function performJohnConfrontation(action,id=null){
 const current=getJohnConfrontation();if(!current.eligible)return{ok:false,state:current,saved:null,message:__dialogueText("johnConfrontationService.js", "t_8cceb8d58b1ffde5f745")};
 const r=confrontationAction(johnConfrontationData,current,action,id);if(!r.ok)return{...r,saved:null};
 if(r.state.completed&&!Story.hasReachedStage('confronted_husband')&&!Story.advanceToStage('confronted_husband')){r.state.completed=false;r.ok=false;r.message=__dialogueText("johnConfrontationService.js", "t_305b1450d76c46ccc204");Story.setSideClue(KEY,r.state);return{...r,saved:saveGameState()};}
 Story.setSideClue(KEY,r.state);
 if(r.state.completed){Story.setFlag('john_formal_confrontation_completed',true);Story.setFlag('holly_final_case_review_unlocked',true);Story.setSideClue('john_formal_statement',{cityId:'warsaw',poisoningDiscussed:true,shootingDiscussed:true,plannedEscapeAdmitted:true,reason:'escape_from_holly',controlVoiceAuthenticated:false,independentEvidenceReferences:['INC-P17','INC-G04'],finalDecisionMade:false});const old=Story.getSideClue('holly_chapter_progress');if(!(Number(old?.chapter)>4))Story.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:4,objective:'review_case_before_final_decision'});}
 return{...r,saved:saveGameState()};
}
