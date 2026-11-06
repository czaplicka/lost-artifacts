import { MainStoryManager } from './managers/MainStoryManager.js';
import { getCompletedAgencyCaseCount } from './archiveMissingReportService.js';
import { saveGameState } from './gameStatePersistence.js';
import { loadJson } from './config/loadJson.js';
import { GORDON_ETHICS_KEY,validateGordonEthics,readGordonEthics,sourceContext,availableGordonSourceChoices,planGordonSource,planGordonPrivacy } from './gordonEthicsModel.js';
export const gordonEthicsData=validateGordonEthics(await loadJson('./assets/data/gordonEthics.json',import.meta.url));
export function getGordonEthics(){return readGordonEthics(MainStoryManager.getSideClue(GORDON_ETHICS_KEY));}
export function getGordonSourceContext(){return sourceContext(MainStoryManager.getSideClue('marge_hr_disclosure_v1'));}
export function getGordonSourceChoices(){return availableGordonSourceChoices(gordonEthicsData,getGordonSourceContext());}
export function canChooseGordonSource(){return MainStoryManager.hasFlag('supervisor_insurance_inquiry_unlocked')&&getCompletedAgencyCaseCount()>=6&&!MainStoryManager.hasFlag('gordon_first_interview_completed');}
function commit(result){
 if(!result.ok)return result;
 if(!result.alreadyCompleted){
  try{MainStoryManager.setSideClue(GORDON_ETHICS_KEY,result.state);}
  catch(error){if(JSON.stringify(MainStoryManager.getSideClue(GORDON_ETHICS_KEY))!==JSON.stringify(result.state))throw error;console.error('[Gordon ethics] State committed, notification failed:',error);}
 }
 let saved=false;try{saved=saveGameState()===true;}catch(error){console.error('[Gordon ethics] Saving failed:',error);}
 return{...result,saved};
}
export function chooseGordonSource(id){
 const current=getGordonEthics();
 if(!current.source&&!canChooseGordonSource())return{ok:false,reason:'locked'};
 return commit(planGordonSource(gordonEthicsData,current,getGordonSourceContext(),id));
}
export function chooseGordonPrivacy(id){
 if(!MainStoryManager.hasFlag('gordon_door_access_bypassed'))return{ok:false,reason:'locked'};
 return commit(planGordonPrivacy(gordonEthicsData,getGordonEthics(),id));
}
