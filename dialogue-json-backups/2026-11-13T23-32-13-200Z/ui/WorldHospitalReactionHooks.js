import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC='Seen the latest case news?';
const RESPONSES={
  agency_convicted:'A verdict, then. I read the bulletin. That still doesn’t make a detective’s coat suitable medical equipment.',
  agency_released:'The court released the defendant. That’s the outcome reported. Speculation is not a medical specialty.',
  agency_suspect_arrested:'Someone was detained. That is not a conviction. We also prefer to finish an examination before announcing the result.',
  agency_pursuit_escape:'The report says the pursuit ended without an arrest. I’ll leave the running commentary to the television.',
  agency_time_expired:'The bulletin says the inquiry ended unresolved. I won’t diagnose an investigation from a headline.'
};
const seenKey=id=>JSON.stringify(['HospitalScene','reception_nurse',id]);
function seenEntries(state){
  const seen=readWorldReactions(state).hospitalNpcSeen;
  if(seen===undefined)return[];
  if(!Array.isArray(seen))throw new Error('[WorldHospital] Invalid hospitalNpcSeen history; it was not overwritten.');
  return seen;
}
export function getHospitalWorldReaction(state){
  const event=latestWorldNewspaperEvent(state,'hq');
  if(!event||event.visibility!=='public'||event.system!=='agency'||
    String(event.campaignId)!==String(state._createdAt)||!RESPONSES[event.kind]||
    seenEntries(state).includes(seenKey(event.id)))return null;
  return{eventId:event.id,text:`The bulletin mentioned the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.\n\n${RESPONSES[event.kind]}`};
}
export function markHospitalWorldReaction(state,eventId){
  const history=readWorldReactions(state);
  const event=history.events.find(item=>item.id===eventId&&item.visibility==='public'&&item.system==='agency'&&
    String(item.campaignId)===String(state._createdAt)&&RESPONSES[item.kind]);
  if(!event)return false;
  const seen=seenEntries(state),key=seenKey(eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,hospitalNpcSeen:[...seen,key]};
  return true;
}
function reaction(){
  try{return getHospitalWorldReaction(gameState);}
  catch(error){console.error('[WorldHospital] Reaction unavailable:',error);return null;}
}
function available(scene,canEnter){
  return !scene.disposed&&!scene._cleanupDone&&!scene.navigating&&canEnter();
}
function readToEnd(scene,eventId){
  const dialog=scene.dialogue;
  return Boolean(dialog&&!dialog.destroyed&&dialog.data?.worldHospitalEventId===eventId&&
    dialog.typing===false&&Array.isArray(dialog.pages)&&dialog.pages.length&&dialog.textPage===dialog.pages.length-1);
}
function showReaction(scene,token,canEnter){
  if(scene.disposed||scene._cleanupDone||scene.navigating||scene.token!==token||!scene.sys.isActive())return;
  if(!canEnter()){scene.talk();return;}
  const selected=reaction();
  if(!selected){scene.talk();return;}
  const back=()=>{
    if(scene.disposed||scene._cleanupDone||scene.navigating||scene.token!==token||!scene.sys.isActive())return;
    if(!canEnter()){scene.talk();return;}
    if(readToEnd(scene,selected.eventId)){
      try{
        if(markHospitalWorldReaction(gameState,selected.eventId)&&gameState.caseFailed!==true)requestAutosave();
      }catch(error){console.error('[WorldHospital] Could not record reaction:',error);}
    }
    scene.talk();
  };
  scene.showDialogue(selected.text,[['Something else.',back]]);
  if(scene.dialogue?.data)scene.dialogue.data.worldHospitalEventId=selected.eventId;
}
export function installHospitalWorldReactions(scene,{canEnter}={}){
  if(!scene||typeof canEnter!=='function'||typeof scene.talk!=='function'||typeof scene.showDialogue!=='function')return null;
  if(installed.has(scene))return installed.get(scene);
  const original=scene.talk;
  let dead=false;
  const wrapped=function(...args){
    if(dead||!available(this,canEnter)||!this.dialogue||this.dialogue.destroyed||!reaction())return original.apply(this,args);
    const token=this.token,rawShow=this.showDialogue;
    let injected=false;
    const decoratedShow=function(text,choices,...rest){
      // The original talk() retains the final admission decision.
      if(injected||!canEnter()||!Array.isArray(choices))return rawShow.call(this,text,choices,...rest);
      injected=true;
      return rawShow.call(this,text,[[TOPIC,()=>showReaction(this,token,canEnter)],...choices],...rest);
    };
    this.showDialogue=decoratedShow;
    try{return original.apply(this,args);}
    finally{if(this.showDialogue===decoratedShow)this.showDialogue=rawShow;}
  };
  scene.talk=wrapped;
  const destroy=()=>{
    if(dead)return;dead=true;
    if(scene.talk===wrapped)scene.talk=original;
    scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);installed.delete(scene);
  };
  const api={destroy};installed.set(scene,api);
  scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
  return api;
}
