import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { loadJson } from './config/loadJson.js';
import { saveGameState } from './gameStatePersistence.js';
import { normalizeIncidents,incidentAction } from './scenes/pi-office/JohnIncidentFilesModel.js';
export const incidentFilesData=await loadJson('./assets/data/johnIncidentFiles.json',import.meta.url);
const KEY='john_incident_files_progress';
export function getJohnIncidentFiles(){return{...normalizeIncidents(incidentFilesData,Story.getSideClue(KEY)),eligible:incidentFilesData.requiredFlags.every(f=>Story.hasFlag(f))&&Story.hasReachedStage('confirmed_faked_death')};}
export function performIncidentAction(action,id=null){
 const current=getJohnIncidentFiles();if(!current.eligible)return{ok:false,state:current,saved:null,message:'Inspect the primary records and complete the earlier story milestones first.'};
 const r=incidentAction(incidentFilesData,current,action,id);if(!r.ok)return{...r,saved:null};
 if(r.state.completed&&!Story.hasReachedStage('learned_wife_is_threat')&&!Story.advanceToStage('learned_wife_is_threat')){r.state.completed=false;r.ok=false;r.message='The evidence links are retained, but the earlier story milestone must be completed before this discovery.';Story.setSideClue(KEY,r.state);return{...r,saved:saveGameState()};}
 Story.setSideClue(KEY,r.state);
 if(r.state.completed){Story.setFlag('john_incident_attachments_reviewed',true);Story.setFlag('holly_attack_evidence_established',true);Story.setSideClue('john_wife_threat_evidence',{references:['INC-P17','INC-G04'],identityCrossReferenceChecked:true,witnessAndExhibitRecordsChecked:true,perpetrator:'holly_gennaro',source:'incident_files',finalDecisionMade:false});const old=Story.getSideClue('holly_chapter_progress');if(!(Number(old?.chapter)>4))Story.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:4,objective:'return_to_john_with_incident_files'});}
 return{...r,saved:saveGameState()};
}
