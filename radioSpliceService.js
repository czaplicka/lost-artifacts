import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { gameState } from './GameData.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizeRadio,radioEligible } from './scenes/archive/RadioSpliceModel.js';
export const radioSpliceData=await loadJson('./assets/data/radioSplice.json',import.meta.url);
const KEY='john_radio_splice_progress';
export function getRadioSpliceStory(state=gameState){return{...normalizeRadio(radioSpliceData,MainStoryManager.getSideClue(KEY)),eligible:radioEligible(radioSpliceData,getCompletedAgencyCaseCount(state),f=>MainStoryManager.hasFlag(f))};}
export function storeRadioSplice(raw,state=gameState){
 if(!getRadioSpliceStory(state).eligible)return{success:false,saved:false};const progress=normalizeRadio(radioSpliceData,raw),done=MainStoryManager.hasFlag('john_radio_transcript_reconstructed');
 MainStoryManager.setSideClue(KEY,progress);
 if(progress.completed){
  MainStoryManager.setFlag('john_radio_transcript_reconstructed',true);MainStoryManager.setFlag('microfilm_comparison_after_twelve_unlocked',true);
  MainStoryManager.setSideClue('john_radio_transcript_findings',{source:'archive_working_transcript',order:[...progress.slots],routeChangePresent:true,handoverPostponed:true,workingSummaryIncomplete:true,speakerAuthenticated:false,saboteurIdentified:false,currentLocationKnown:false});
  const old=MainStoryManager.getSideClue('holly_chapter_progress');if(!done&&!(Number(old?.chapter)>3))MainStoryManager.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'complete_mission_twelve_then_compare_primary_material'});
 }
 return{success:true,saved:saveGameState(),progress};
}
