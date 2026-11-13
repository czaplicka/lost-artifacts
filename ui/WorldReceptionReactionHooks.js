import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC='Seen the latest case news?';
const RESPONSES={
  agency_convicted:'The court has delivered an outcome. I wish our contractor would try that. No, a date on a napkin is not an outcome.',
  agency_released:'The defendant was released, according to the bulletin. I know better than to turn a headline into a reference check.',
  agency_suspect_arrested:'A detention, not a conviction. Understood. Around here we also distinguish a quotation from a signed contract.',
  agency_pursuit_escape:'The report says the pursuit ended without a detention. I only know what was in the bulletin, so I can’t offer directions.',
  agency_time_expired:'An unresolved inquiry. We have some experience with unfinished work here. I try not to label anything completed on the strength of optimism.'
};
const seenKey=id=>JSON.stringify(['business_center_receptionist',id]);
function seenEntries(state){
  const seen=readWorldReactions(state).receptionNpcSeen;
  if(seen===undefined)return[];
  if(!Array.isArray(seen))throw new Error('[WorldReception] Invalid receptionNpcSeen history; it was not overwritten.');
  return seen;
}
export function getReceptionWorldReaction(state){
  const event=latestWorldNewspaperEvent(state,'hq');
  if(!event||event.visibility!=='public'||event.system!=='agency'||
    String(event.campaignId)!==String(state._createdAt)||!RESPONSES[event.kind]||
    seenEntries(state).includes(seenKey(event.id)))return null;
  return{eventId:event.id,text:`The bulletin mentioned the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.\n\n${RESPONSES[event.kind]}`};
}
export function markReceptionWorldReaction(state,eventId){
  const history=readWorldReactions(state);
  const event=history.events.find(item=>item.id===eventId&&item.visibility==='public'&&item.system==='agency'&&
    String(item.campaignId)===String(state._createdAt)&&RESPONSES[item.kind]);
  if(!event)return false;
  const seen=seenEntries(state),key=seenKey(eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,receptionNpcSeen:[...seen,key]};
  return true;
}
function selectedReaction(){
  try{return getReceptionWorldReaction(gameState);}
  catch(error){console.error('[WorldReception] Reaction unavailable:',error);return null;}
}
function available(scene){
  return Boolean(scene.ready&&scene.receptionistPresent&&!scene.disposed&&!scene._cleanupDone&&!scene.navigating&&scene.dialogue&&!scene.dialogue.destroyed);
}
function readToEnd(scene,eventId){
  const dialog=scene.dialogue;
  return Boolean(dialog&&!dialog.destroyed&&dialog.data?.worldReceptionEventId===eventId&&
    dialog.typing===false&&Array.isArray(dialog.pages)&&dialog.pages.length&&dialog.textPage===dialog.pages.length-1);
}
function openReaction(scene,token){
  if(!available(scene)||scene.token!==token||!scene.sys.isActive())return;
  const reaction=selectedReaction();
  if(!reaction){scene.reception();return;}
  const back=()=>{
    if(!available(scene)||scene.token!==token||!scene.sys.isActive())return;
    if(readToEnd(scene,reaction.eventId)){
      try{
        if(markReceptionWorldReaction(gameState,reaction.eventId)&&gameState.caseFailed!==true)requestAutosave();
      }catch(error){console.error('[WorldReception] Could not record reaction:',error);}
    }
    scene.reception();
  };
  // show() retains the existing Back to the lobby choice and portrait behaviour.
  scene.show('Receptionist',reaction.text,[['Something else.',back]]);
  if(scene.dialogue?.data)scene.dialogue.data.worldReceptionEventId=reaction.eventId;
}
export function installReceptionWorldReactions(scene){
  if(!scene||typeof scene.reception!=='function'||typeof scene.show!=='function')return null;
  if(installed.has(scene))return installed.get(scene);
  const original=scene.reception;
  let dead=false;
  const wrapped=function(...args){
    if(dead||!available(this)||!selectedReaction())return original.apply(this,args);
    const token=this.token,rawShow=this.show;
    let injected=false;
    const decoratedShow=function(title,text,choices=[],...rest){
      if(injected||title!=='Receptionist'||!available(this)||!Array.isArray(choices))return rawShow.call(this,title,text,choices,...rest);
      injected=true;
      return rawShow.call(this,title,text,[[TOPIC,()=>openReaction(this,token)],...choices],...rest);
    };
    this.show=decoratedShow;
    try{return original.apply(this,args);}
    finally{if(this.show===decoratedShow)this.show=rawShow;}
  };
  scene.reception=wrapped;
  const destroy=()=>{
    if(dead)return;dead=true;
    if(scene.reception===wrapped)scene.reception=original;
    scene.events.off('shutdown',destroy);scene.events.off('destroy',destroy);installed.delete(scene);
  };
  const api={destroy};installed.set(scene,api);
  scene.events.once('shutdown',destroy);scene.events.once('destroy',destroy);
  return api;
}
