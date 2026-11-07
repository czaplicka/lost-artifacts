import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { loadJson } from './config/loadJson.js';
import { saveGameState } from './gameStatePersistence.js';
import { normalizeWarsaw,advanceWarsaw,warsawEligible } from './scenes/pi-office/WarsawMeetingModel.js';
export const warsawData=await loadJson('./assets/data/johnWarsawMeeting.json',import.meta.url);
const KEY='john_warsaw_meeting_progress';
export function getWarsawMeeting(){return{...normalizeWarsaw(warsawData,Story.getSideClue(KEY)),eligible:warsawEligible(warsawData,f=>Story.hasFlag(f),Story.getSideClue('john_location_lead'))};}
export function performWarsawAction(action){
 const current=getWarsawMeeting();if(!current.eligible)return{ok:false,state:current,saved:false,message:'Complete the microfilm comparison first.'};
 const result=advanceWarsaw(warsawData,current,action);if(!result.ok)return{...result,saved:null};
 Story.setSideClue(KEY,result.state);
 if(result.state.completed){
  Story.setFlag('john_met_in_warsaw',true);Story.setFlag('john_initial_account_heard',true);
  const lead=Story.getSideClue('john_location_lead');Story.setSideClue('john_location_lead',{...lead,meetingCompleted:true});
  Story.setSideClue('john_initial_account',{cityId:'warsaw',disappearanceAdmitted:true,independentVerificationPending:true,perpetratorEstablished:false});
  const chapter=Story.getSideClue('holly_chapter_progress');if(!(Number(chapter?.chapter)>3))Story.setSideClue('holly_chapter_progress',{...(chapter&&typeof chapter==='object'&&!Array.isArray(chapter)?chapter:{}),version:1,chapter:3,objective:'independently_verify_john_account'});
 }
 return{...result,saved:saveGameState()};
}
