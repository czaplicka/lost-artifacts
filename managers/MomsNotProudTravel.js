import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { canStartRoadTrip, getCurrentTownId } from './RoadTripManager.js';
import { HOME_TOWN_ID } from '../config/RoadTripTowns.js';
import { DriveScene } from '../scenes/DriveScene.js';

export const PIZZERIA_TOWN_ID='whateverville';
export const PIZZERIA_SCENE='MomsNotProudRoadScene';
const ARRIVAL='MomsNotProudArrivalScene';
let session=null;

class MomsNotProudArrivalScene extends Phaser.Scene {
  constructor(){super({key:ARRIVAL});}
  create(data){
    const s=session;
    if(!s||data?.sessionId!==s.id) {
      this.add.text(30,40,'Travel session expired. Reload your last save.',{fontFamily:'SpecialElite',fontSize:'22px',color:'#ffffff'});return;
    }
    if(getCurrentTownId()!==data.townId) {
      this.add.text(30,40,'Arrival has not been recorded. Check the console before continuing.',{color:'#ffffff'});return;
    }
    requestAutosave();
    if(data.townId===HOME_TOWN_ID) {
      restoreOffice(); this.scene.stop();
    } else {
      this.scene.start(PIZZERIA_SCENE);
    }
  }
}
function restoreOffice(){
  const s=session;if(!s)return;
  session=null;
  for(const key of s.paused) if(s.manager.isPaused(key)) s.manager.resume(key);
  if(!s.ui.destroyed&&s.ui.isOpen){s.ui.resume();s.ui.notice='Back in Home Town. Observation progress saved.';s.ui.render();}
}
function launchDrive(toTownId){
  const s=session;
  if(!s) return {ok:false,message:'No active travel session.'};
  const check=canStartRoadTrip(getCurrentTownId(),toTownId,{mode:'pi'});
  if(!check.ok)return check;
  if(s.manager.isActive('DriveScene'))return {ok:false,message:'A drive is already running.'};
  s.manager.start('DriveScene',{
    fromTownId:check.quote.fromId,toTownId,quote:check.quote,
    nextScene:ARRIVAL,nextData:{sessionId:s.id,townId:toTownId}
  });
  s.manager.bringToTop('DriveScene');
  return {ok:true};
}
export async function openMomsNotProudTrip(ui){
  if(session) return {ok:false,message:'A pizzeria visit is already in progress.'};
  const { MomsNotProudRoadScene }=await import('../scenes/MomsNotProudRoadScene.js');
  if(ui.destroyed||!ui.isOpen||ui.suspended)return {ok:false,message:'The computer is closed.'};
  const manager=ui.scene.game.scene;
  if(!manager.keys.DriveScene)manager.add('DriveScene',DriveScene,false);
  if(!manager.keys[ARRIVAL])manager.add(ARRIVAL,MomsNotProudArrivalScene,false);
  if(!manager.keys[PIZZERIA_SCENE])manager.add(PIZZERIA_SCENE,MomsNotProudRoadScene,false);
  const here=getCurrentTownId();
  if(here!==PIZZERIA_TOWN_ID){
    const check=canStartRoadTrip(here,PIZZERIA_TOWN_ID,{mode:'pi'});
    if(!check.ok)return check;
  }
  session={id:`mnp-${Date.now()}-${Math.random()}`,ui,manager,
    paused:manager.getScenes(true).map(s=>s.sys.settings.key)};
  ui.suspend();
  session.paused.forEach(key=>manager.pause(key));
  try{
    if(here===PIZZERIA_TOWN_ID){manager.start(PIZZERIA_SCENE);manager.bringToTop(PIZZERIA_SCENE);return {ok:true};}
    const result=launchDrive(PIZZERIA_TOWN_ID);
    if(!result.ok)restoreOffice();
    return result;
  }catch(error){restoreOffice();throw error;}
}
export function returnFromPizzeria(scene){
  if(!session)return {ok:false,message:'The office session is unavailable. Reload your save.'};
  if(getCurrentTownId()!==PIZZERIA_TOWN_ID)return {ok:false,message:'The current town does not match the pizzeria.'};
  const result=launchDrive(HOME_TOWN_ID);
  if(result.ok)scene.scene.stop();
  return result;
}
export function hasPizzeriaTravelSession(){return !!session;}
