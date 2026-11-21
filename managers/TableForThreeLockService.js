import {gameState} from '../GameData.js';
import {requestAutosave} from '../gameStatePersistence.js';
import {CASE_ID} from './TableForThreeModel.js';
import {readTableForThree,dispatchTableForThree} from './TableForThreeService.js';
import {piInventoryManager} from './PIInventoryManager.js';
import {getCurrentTownId} from './RoadTripManager.js';
import {TABLE_FOR_THREE_LOCATIONS as L} from '../config/TableForThreeLocations.js';
import {createOfficeLock,validOfficeLock,operateOfficeLock} from './TableForThreeLockModel.js';
const quest=()=>gameState.piQuests?.quests?.[CASE_ID];
export function readTableForThreeOfficeLock(){
  const q=quest();if(!q)return null;
  const stored=q.metadata?.tableForThreeOfficeLock;
  return structuredClone(stored??createOfficeLock(CASE_ID+'|'+(q.acceptedAt||'legacy')));
}
function access(){
  const q=quest(),s=readTableForThree();
  if(!q||q.status!=='active'||s?.stage!=='company')return 'An active company investigation is required.';
  if(getCurrentTownId()!==L.company.townId)return 'Visit the company in Home Town.';
  if(!s.afterHours)return 'Wait for reception to close before approaching the lock.';
  if(!L.lockpicksItemId||!piInventoryManager.hasItem(L.lockpicksItemId))return 'Bring your lockpick set in PI inventory.';
  return null;
}
export function useTableForThreeOfficeLock(action,expectedRevision){
  const reason=access();if(reason)return {ok:false,reason};
  const current=readTableForThreeOfficeLock();
  if(current?.revision!==expectedRevision)return {ok:false,reason:'The lock changed. Reopen the lock view before trying again.'};
  const result=operateOfficeLock(current,action);if(!result.ok)return result;
  const q=quest();gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[CASE_ID]:{
    ...q,metadata:{...(q.metadata||{}),tableForThreeOfficeLock:result.state}
  }}};
  try{requestAutosave();}catch(error){console.error('[TableForThree] Lock autosave request failed:',error);result.warning='Progress changed in memory; autosave could not be requested. Save manually.';}
  return result;
}
export function enterTableForThreePickedOffice(){
  const reason=access();if(reason)return {ok:false,reason};
  const lock=readTableForThreeOfficeLock();
  if(!validOfficeLock(lock)||lock.status!=='open')return {ok:false,reason:'Unlock the door without attracting security first.'};
  return dispatchTableForThree({type:'ENTER_OFFICE',route:'lockpick'},{hasLockpicks:true,lockPuzzleSolved:true});
}
