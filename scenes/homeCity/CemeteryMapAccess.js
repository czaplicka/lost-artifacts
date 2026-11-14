import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';
import { syncDeadMailOfficeQuest } from '../../managers/DeadMailOfficeIntegration.js';

export const CEMETERY_BUILDING={id:'cemetery',name:__dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_fcd5ad393af860802561"),x:20,y:13,w:4,h:4,color:0x66735a,message:''};
export const CEMETERY_REFUSALS=[
 __dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_2031ac200dbe604ceded"),
 __dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_c53f2303abc388bad605"),
 __dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_277c4d77694ed9b21924"),
 __dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_c2ab3515cbcabe59a235")
];
export function cemeteryEntryStatus(state=gameState){
 const q=state.piQuests?.quests?.pi_dead_mail_preview;
 if(q?.metadata?.contentId!=='dead_mail'||!['active','completed'].includes(q.status))return {allowed:false,reason:'no_case'};
 const p=state.deadMailPreview||{};
 if(p.chapterComplete!==true&&p.dayComplete!==true&&p.finale?.completed!==true)return {allowed:false,reason:'no_location',message:__dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_d0d26244c10a3b86665b")};
 if(p.dayComplete!==true)return {allowed:true,part:'day'};
 return {allowed:true,part:p.night?.complete===true?'finale':'night'};
}
export function cemeteryEntryMessage(city,status){
 if(status.reason==='no_case'){
  const index=Number.isInteger(city.cemeteryRefusalIndex)?city.cemeteryRefusalIndex:0;
  city.cemeteryRefusalIndex=(index+1)%CEMETERY_REFUSALS.length;return CEMETERY_REFUSALS[index%CEMETERY_REFUSALS.length];
 }
 return status.message||__dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_d1d5797ba38b50e32539");
}
export function cemeteryMapParent(game,part){
 const city=game?.scene?.keys?.HomeCityScene;
 if(!city||city.disposed||!city.sys?.isActive?.()||city.path?.length)return null;
 const cemetery=city.buildings?.find(b=>b.id==='cemetery');
 if(!cemetery||city.position?.x!==cemetery.door.x||city.position?.y!==cemetery.door.y)return null;
 const status=cemeteryEntryStatus();return status.allowed&&status.part===part?city:null;
}
export function requireCemeteryMapEntry(game,part,data){
 if(data?.entrySource!=='cemetery-map'||!cemeteryMapParent(game,part))throw Error('Walk to Blackthorn Cemetery on the city map and enter through its gate.');
}
export async function enterCemeteryFromMap(city){
 if(city.disposed||city.navigating||city.path.length)return false;
 const cemetery=city.buildings.find(b=>b.id==='cemetery');
 if(!cemetery||!city.position||city.position.x!==cemetery.door.x||city.position.y!==cemetery.door.y)return false;
 const status=cemeteryEntryStatus();if(!status.allowed){city.say(cemeteryEntryMessage(city,status));return false;}
 city.navigating=true;city.heldArrows.clear();city.remember();const token=city.runToken,game=city.game;
 let target=null,key=null,onExit=null,opened=false;
 try{
  let module,SceneClass,open;
  if(status.part==='finale'){
   module=await import('../DeadMailFinaleScene.js');key='DeadMailFinaleScene';SceneClass=module.DeadMailFinaleScene;open=module.openDeadMailFinalePreview;
  }else if(status.part==='night'){
   module=await import('../DeadMailNightScene.js');key='DeadMailNightScene';SceneClass=module.DeadMailNightScene;open=module.openDeadMailNightPreview;
  }else{
   module=await import('../DeadMailScene.js');key='DeadMailScene';SceneClass=module.DeadMailScene;open=module.openDeadMailPreview;
  }
  if(city.disposed||city.runToken!==token)return false;
  const current=cemeteryEntryStatus();if(!current.allowed||current.part!==status.part)return false;
  if(typeof SceneClass!=='function'||typeof open!=='function')throw Error('The cemetery scene files are incomplete.');
  if(status.part==='day'){
   const p=gameState.deadMailPreview,valid=['arrival','cemetery','staff','records','deduction'];
   if(!valid.includes(p.stage)){gameState.deadMailPreview={...p,stage:'cemetery'};requestAutosave();}
  }
  if(!game.scene.keys[key])game.scene.add(key,SceneClass,false);target=game.scene.keys[key];
  let returned=false;onExit=()=>{
   if(returned)return;returned=true;target.events.off('shutdown',onExit);target.events.off('destroy',onExit);
   try{syncDeadMailOfficeQuest();}catch(error){console.error('[CemeteryMapAccess] Quest sync failed:',error);}
   if(!city.disposed&&city.runToken===token){city.navigating=false;city.registry?.set('currentSceneKey','HomeCityScene');}
  };
  target.events.once('shutdown',onExit);target.events.once('destroy',onExit);
  open(game,{entrySource:'cemetery-map'});opened=true;return true;
 }catch(error){
  console.error('[CemeteryMapAccess]',error);if(target&&onExit){target.events.off('shutdown',onExit);target.events.off('destroy',onExit);}
  if(key&&game.scene.isActive(key))game.scene.stop(key);
  if(!city.disposed&&city.runToken===token)city.say(__dialogueText("scenes/homeCity/CemeteryMapAccess.js", "t_8992dbe6ec25cd70fca3"));return false;
 }finally{if(!opened&&!city.disposed&&city.runToken===token)city.navigating=false;}
}
