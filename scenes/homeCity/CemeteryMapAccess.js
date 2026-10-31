import { gameState } from '../../GameData.js';
import { requestAutosave } from '../../gameStatePersistence.js';

export const CEMETERY_BUILDING={id:'cemetery',name:'Blackthorn Cemetery',x:20,y:13,w:4,h:4,color:0x66735a,message:''};
export const CEMETERY_REFUSALS=[
  "I don't do graveyard shifts unless they're billable.",
  "The residents aren't going anywhere. I'll come back with a paying client.",
  "I'm not charging into a cemetery without someone to charge.",
  "I'd rather not meet my future neighbours off the clock."
];
export function cemeteryEntryStatus(state=gameState){
  const q=state.piQuests?.quests?.pi_dead_mail_preview;
  if(q?.metadata?.contentId!=='dead_mail'||!['active','completed'].includes(q.status))return {allowed:false,reason:'no_case'};
  const p=state.deadMailPreview||{};
  if(p.chapterComplete!==true&&p.dayComplete!==true&&p.finale?.completed!==true)return {allowed:false,reason:'no_location',message:'A graveyard is not a substitute for reading the case file. Photograph first, wandering ominously later.'};
  if(p.dayComplete!==true)return {allowed:true,part:'day'};
  return {allowed:true,part:p.night?.complete===true?'finale':'night'};
}
export function cemeteryEntryMessage(city,status){
  if(status.reason==='no_case'){
    const index=Number.isInteger(city.cemeteryRefusalIndex)?city.cemeteryRefusalIndex:0;
    city.cemeteryRefusalIndex=(index+1)%CEMETERY_REFUSALS.length;
    return CEMETERY_REFUSALS[index%CEMETERY_REFUSALS.length];
  }
  return status.message||'The cemetery is not available for this investigation yet.';
}
export async function enterCemeteryFromMap(city){
  if(city.disposed||city.navigating||city.path.length)return false;
  const cemetery=city.buildings.find(b=>b.id==='cemetery');
  if(!cemetery||!city.position||city.position.x!==cemetery.door.x||city.position.y!==cemetery.door.y)return false;
  const status=cemeteryEntryStatus();
  if(!status.allowed){city.say(cemeteryEntryMessage(city,status));return false;}
  city.navigating=true;city.heldArrows.clear();city.remember();
  const token=city.runToken,game=city.game;
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
    const currentStatus=cemeteryEntryStatus();if(!currentStatus.allowed||currentStatus.part!==status.part)return false;
    if(typeof SceneClass!=='function'||typeof open!=='function')throw Error('The cemetery scene files are incomplete.');
    if(status.part==='day'){
      const p=gameState.deadMailPreview;
      const valid=['arrival','cemetery','staff','records','deduction'];
      if(!valid.includes(p.stage)){gameState.deadMailPreview={...p,stage:'cemetery'};requestAutosave();}
    }
    if(!game.scene.keys[key])game.scene.add(key,SceneClass,false);
    target=game.scene.keys[key];
    let returned=false;
    onExit=()=>{
      if(returned)return;returned=true;target.events.off('shutdown',onExit);target.events.off('destroy',onExit);
      if(!city.disposed&&city.runToken===token){city.navigating=false;city.registry?.set('currentSceneKey','HomeCityScene');}
    };
    target.events.once('shutdown',onExit);target.events.once('destroy',onExit);
    // Existing Dead Mail scenes pause the current city and resume it on shutdown.
    // Starting here does not create an office-return handler.
    open(game);opened=true;return true;
  }catch(error){
    console.error('[CemeteryMapAccess]',error);
    if(target&&onExit){target.events.off('shutdown',onExit);target.events.off('destroy',onExit);}
    if(key&&game.scene.isActive(key))game.scene.stop(key);
    if(!city.disposed&&city.runToken===token)city.say('The cemetery file could not be opened. Apparently even the dead have paperwork.');
    return false;
  }finally{
    if(!opened&&!city.disposed&&city.runToken===token)city.navigating=false;
  }
}
