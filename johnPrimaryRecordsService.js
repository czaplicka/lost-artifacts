import { MainStoryManager as Story } from './managers/MainStoryManager.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { normalizePrimary,primaryAction } from './scenes/medical/JohnPrimaryRecordsModel.js';
export const primaryRecordsData=await loadJson('./assets/data/johnPrimaryRecords.json',import.meta.url);
const KEY='john_primary_records_progress';
export function getJohnPrimaryRecords(){return{...normalizePrimary(primaryRecordsData,Story.getSideClue(KEY)),eligible:primaryRecordsData.requiredFlags.every(f=>Story.hasFlag(f))};}
export function performPrimaryRecordsAction(action,id=null){
 const current=getJohnPrimaryRecords();if(!current.eligible)return{ok:false,state:current,saved:null,message:'Complete the independent review first.'};
 const result=primaryAction(primaryRecordsData,current,action,id);if(!result.ok)return{...result,saved:null};Story.setSideClue(KEY,result.state);
 if(result.state.permission)Story.setSideClue('john_clinical_release',{scope:'preflight_poisoning_gunshot_entries_and_attachment_references',unrelatedRecordsPermitted:false});
 if(result.state.completed){Story.setFlag('john_primary_records_examined',true);Story.setFlag('john_incident_attachments_unlocked',true);Story.setSideClue('john_incident_attachment_leads',{references:['INC-P17','INC-G04'],source:'primary_clinical_entries_and_attachment_register',perpetratorIdentified:false});const old=Story.getSideClue('holly_chapter_progress');if(!(Number(old?.chapter)>3))Story.setSideClue('holly_chapter_progress',{...(old&&typeof old==='object'&&!Array.isArray(old)?old:{}),version:1,chapter:3,objective:'obtain_incident_files_INC_P17_and_INC_G04'});}
 return{...result,saved:saveGameState()};
}
