import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC=__dialogueText("ui/WorldHospitalReactionHooks.js", "t_1a34c8f172305020d364");
const RESPONSES={
  agency_convicted:__dialogueText("ui/WorldHospitalReactionHooks.js", "t_bfc6a45c635ae5585a0d"),
  agency_released:__dialogueText("ui/WorldHospitalReactionHooks.js", "t_1a6e473ae5b11f494643"),
  agency_suspect_arrested:__dialogueText("ui/WorldHospitalReactionHooks.js", "t_d22c617375f267c2faac"),
  agency_pursuit_escape:__dialogueText("ui/WorldHospitalReactionHooks.js", "t_9e327b8c9b1c307c6c0e"),
  agency_time_expired:__dialogueText("ui/WorldHospitalReactionHooks.js", "t_b7210a8b0f5504632b50")
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
  return{eventId:event.id,text:`${__dialogueText("ui/WorldHospitalReactionHooks.js", "t_8eaad1d5679904cf64c8")}${event.artifact||__dialogueText("ui/WorldHospitalReactionHooks.js", "t_4edfbd28d0483e702f24")}${__dialogueText("ui/WorldHospitalReactionHooks.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("ui/WorldHospitalReactionHooks.js", "t_0f53fb3533eb343bc155")}${__dialogueText("ui/WorldHospitalReactionHooks.js", "t_0673d69ff78439adfb40")}${RESPONSES[event.kind]}`};
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
  scene.showDialogue(selected.text,[[__dialogueText("ui/WorldHospitalReactionHooks.js", "t_240f1c9f302be82fb90a"),back]]);
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
