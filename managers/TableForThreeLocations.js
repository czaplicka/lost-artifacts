import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { EventBus } from '../EventBus.js';
import { getCurrentTownId, startRoadTrip } from './RoadTripManager.js';
import { piInventoryManager } from './PIInventoryManager.js';
import { readTableForThree, dispatchTableForThree } from './TableForThreeService.js';
import { restaurantTravelAccess, matchesArrival } from './TableForThreeTravelPolicy.js';
import { TABLE_FOR_THREE_LOCATIONS as L } from '../config/TableForThreeLocations.js';
import { CASE_ID } from './TableForThreeModel.js';

export function readTableForThreeTravel() {
  return gameState.piQuests?.quests?.[CASE_ID]?.metadata?.tableForThreeTravel || null;
}
function writeTravel(value) {
  const q=gameState.piQuests?.quests?.[CASE_ID];
  if(!q) throw new Error('Missing Table for Three contract.');
  gameState.piQuests={...gameState.piQuests,quests:{...gameState.piQuests.quests,[CASE_ID]:{
    ...q,metadata:{...(q.metadata||{}),tableForThreeTravel:value}
  }}};
  requestAutosave();
}
let installed=false;
export function installTableForThreeArrivalTracking() {
  if(installed)return;installed=true;
  EventBus.on('roadTripCompleted',({quote})=>{
    const pending=readTableForThreeTravel();
    if(!matchesArrival(pending,quote))return;
    writeTravel({...pending,status:'arrived'});
  });
}
export async function visitTableForThreeRestaurant(scene) {
  installTableForThreeArrivalTracking();
  const access=restaurantTravelAccess(readTableForThree(),getCurrentTownId(),L.restaurant.townId,piInventoryManager.hasItem('camera'));
  if(!access.ok)return access;
  const { TableForThreeRestaurantScene }=await import('../scenes/TableForThreeRestaurantScene.js');
  if(!scene.game.scene.keys[L.restaurant.sceneKey])scene.game.scene.add(L.restaurant.sceneKey,TableForThreeRestaurantScene,false);
  if(!access.needsDrive){
    const receipt=readTableForThreeTravel();
    if(readTableForThree()?.stage==='lead' && !(receipt?.status==='arrived' && receipt.toTownId===L.restaurant.townId)) {
      // Already physically present in the correct town: no artificial round trip.
      writeTravel({status:'arrived',fromTownId:L.restaurant.townId,toTownId:L.restaurant.townId,localVisit:true});
    }
    return {ok:await scene.goto(L.restaurant.sceneKey)};
  }
  const previous=readTableForThreeTravel();
  writeTravel({status:'driving',fromTownId:getCurrentTownId(),toTownId:L.restaurant.townId});
  try{
    const result=await startRoadTrip(scene,L.restaurant.townId,{nextScene:L.restaurant.sceneKey});
    if(!result.ok)writeTravel(previous);
    return result;
  }catch(error){writeTravel(previous);throw error;}
}
export function confirmTableForThreeArrival() {
  const state=readTableForThree(),receipt=readTableForThreeTravel();
  if(getCurrentTownId()!==L.restaurant.townId)return {ok:false,reason:'You must travel to '+L.restaurant.name+' first.'};
  if(!state?.venueIdentified||!state.nextMeetingFound)return {ok:false,reason:'The address has not been discovered.'};
  if(state.stage!=='lead')return {ok:true,state};
  if(receipt?.status!=='arrived'||receipt.toTownId!==L.restaurant.townId)return {ok:false,reason:'The arrival has not been recorded.'};
  return dispatchTableForThree({type:'ARRIVE_AT_RESTAURANT'},{arrivedViaDrive:true});
}
export async function returnTableForThreeHome(scene) {
  if(getCurrentTownId()===L.company.townId)return {ok:await scene.goto('HomeCityScene',{entryPoint:'business-center',gameState})};
  return startRoadTrip(scene,L.company.townId,{nextScene:'HomeCityScene',nextData:{entryPoint:'business-center',gameState}});
}
