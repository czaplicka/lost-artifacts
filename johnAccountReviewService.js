import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeJohnReview,editJohnReview,evaluateJohnReview } from './scenes/pi-office/JohnAccountReviewModel.js';
export const johnReviewData=await loadJson('./assets/data/johnAccountReview.json',import.meta.url);
const KEY='john_account_review_progress';
export function getJohnAccountReview(){return{...normalizeJohnReview(johnReviewData,Story.getSideClue(KEY)),eligible:johnReviewData.requiredFlags.every(f=>Story.hasFlag(f))};}
export function updateJohnAccountReview({claimId=null,sourceId=null,verdictId=null,check=false}={}){
 const current=getJohnAccountReview();if(!current.eligible)return{ok:false,state:current,saved:null,message:__dialogueText("johnAccountReviewService.js", "t_05d83f4207f3db9d879e")};
 if(current.completed)return{ok:true,state:current,saved:null,message:johnReviewData.success};
 let state=editJohnReview(johnReviewData,current,claimId,sourceId,verdictId),result={ok:true,message:''};if(check){result=evaluateJohnReview(johnReviewData,state);if(result.ok)state.completed=true;}
 Story.setSideClue(KEY,state);
 if(state.completed){Story.setFlag('john_account_independent_review_completed',true);Story.setFlag('john_primary_incident_records_lead_unlocked',true);Story.setSideClue('john_account_review_findings',{plannedDisappearanceCorroborated:true,injuriesPredateFlight:true,hollyPriorSurvivalKnowledge:true,injuryPerpetratorEstablished:false});const old=Story.getSideClue('holly_chapter_progress');if(!(Number(old?.chapter)>3))Story.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'obtain_primary_preflight_incident_records'});}
 return{...result,state,saved:saveGameState()};
}
