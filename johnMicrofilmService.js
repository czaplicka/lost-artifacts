import { dialogueText as __dialogueText } from "./dialogues/DialogueText.js";
import { storageRoomDialogues } from './storageRoomDialogueService.js';
import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeMicrofilm,microfilmEligible } from './scenes/archive/MicrofilmModel.js';
export const microfilmData = { ...(await loadJson('./assets/data/johnMicrofilm.json',import.meta.url)), ...storageRoomDialogues.microfilm };
const KEY='john_microfilm_progress';
export function getMicrofilmStory(state=gameState){return{...normalizeMicrofilm(microfilmData,MainStoryManager.getSideClue(KEY)),eligible:microfilmEligible(microfilmData,getCompletedAgencyCaseCount(state),f=>MainStoryManager.hasFlag(f))};}
export function storeMicrofilm(raw,state=gameState){
 if(!getMicrofilmStory(state).eligible)return{success:false,saved:false};const progress=normalizeMicrofilm(microfilmData,raw),done=MainStoryManager.hasFlag('john_warsaw_lead_unlocked');MainStoryManager.setSideClue(KEY,progress);
 if(progress.copyReceived)MainStoryManager.setFlag('alex_retained_microfilm_received',true);
 if(progress.completed){
  MainStoryManager.setFlag('john_microfilm_compared',true);MainStoryManager.setFlag('john_warsaw_lead_unlocked',true);
  const previous=MainStoryManager.getSideClue('john_location_lead');const lead=previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{};
  MainStoryManager.setSideClue('john_location_lead',{...lead,cityId:'warsaw',city:__dialogueText("johnMicrofilmService.js", "t_2d59f8dd13aafd7bc427"),contactReference:microfilmData.contactReference,source:'archive_and_alex_retained_microfilm',meetingCompleted:MainStoryManager.hasFlag('john_met_in_warsaw')||lead.meetingCompleted===true,threatSourceIdentified:lead.threatSourceIdentified===true});
  const old=MainStoryManager.getSideClue('holly_chapter_progress');if(!done&&!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'travel_to_warsaw_find_john'});
 }
 return{success:true,saved:saveGameState(),progress};
}
