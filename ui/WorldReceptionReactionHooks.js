import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC=__dialogueText("ui/WorldReceptionReactionHooks.js", "t_1a34c8f172305020d364");
const RESPONSES={
  agency_convicted:__dialogueText("ui/WorldReceptionReactionHooks.js", "t_607b1a8d759bc0306af7"),
  agency_released:__dialogueText("ui/WorldReceptionReactionHooks.js", "t_9b40f91aa48f243c55af"),
  agency_suspect_arrested:__dialogueText("ui/WorldReceptionReactionHooks.js", "t_633df3995610ee386827"),
  agency_pursuit_escape:__dialogueText("ui/WorldReceptionReactionHooks.js", "t_0259dc8d9c770fa21cdf"),
  agency_time_expired:__dialogueText("ui/WorldReceptionReactionHooks.js", "t_450e072b35614220c8dd")
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
  return{eventId:event.id,text:`${__dialogueText("ui/WorldReceptionReactionHooks.js", "t_8eaad1d5679904cf64c8")}${event.artifact||__dialogueText("ui/WorldReceptionReactionHooks.js", "t_4edfbd28d0483e702f24")}${__dialogueText("ui/WorldReceptionReactionHooks.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("ui/WorldReceptionReactionHooks.js", "t_0f53fb3533eb343bc155")}${__dialogueText("ui/WorldReceptionReactionHooks.js", "t_0673d69ff78439adfb40")}${RESPONSES[event.kind]}`};
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
  scene.show(__dialogueText("ui/WorldReceptionReactionHooks.js", "t_ab63c0d0657040400f5a"),reaction.text,[[__dialogueText("ui/WorldReceptionReactionHooks.js", "t_240f1c9f302be82fb90a"),back]]);
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
      if(injected||title!==__dialogueText("ui/WorldReceptionReactionHooks.js", "t_ab63c0d0657040400f5a")||!available(this)||!Array.isArray(choices))return rawShow.call(this,title,text,choices,...rest);
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
