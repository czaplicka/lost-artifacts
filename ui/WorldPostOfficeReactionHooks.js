import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { POST_OFFICE_ART } from '../config/postOfficeConfig.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const installed=new WeakMap();
const TOPIC=__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_1a34c8f172305020d364");
const RESPONSES={
 agency_convicted:__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_ce3fa80bd4ad82288b48"),
 agency_released:__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_2077680384edeef17c0d"),
 agency_suspect_arrested:__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_5c1c3ff8d9d9505a6b5c"),
 agency_pursuit_escape:__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_3ebf0768647b485f19cb"),
 agency_time_expired:__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_97e5f7be0b7995d4b1db")
};
const seenKey=id=>JSON.stringify(['post_office_postman',id]);
function seenEntries(state){
 const seen=readWorldReactions(state).postalNpcSeen;
 if(seen===undefined)return[];
 if(!Array.isArray(seen))throw new Error('[WorldPostOffice] Invalid postalNpcSeen history; it was not overwritten.');
 return seen;
}
export function getPostOfficeWorldReaction(state){
 const event=latestWorldNewspaperEvent(state,'hq');
 if(!event||event.visibility!=='public'||event.system!=='agency'||String(event.campaignId)!==String(state._createdAt)||
  !RESPONSES[event.kind]||seenEntries(state).includes(seenKey(event.id)))return null;
 return{eventId:event.id,text:`${__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_8eaad1d5679904cf64c8")}${event.artifact||__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_4edfbd28d0483e702f24")}${__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_0f53fb3533eb343bc155")}${__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_b9acaceeb369ea8c5223")}${RESPONSES[event.kind]}${__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_4b6b1bf3818d4e6c9c43")}`};
}
export function markPostOfficeWorldReaction(state,eventId){
 const history=readWorldReactions(state);
 const event=history.events.find(item=>item.id===eventId&&item.visibility==='public'&&item.system==='agency'&&
  String(item.campaignId)===String(state._createdAt)&&RESPONSES[item.kind]);
 if(!event)return false;
 const seen=seenEntries(state),key=seenKey(eventId);
 if(seen.includes(key))return false;
 state.worldReactionsV1={...history,postalNpcSeen:[...seen,key]};return true;
}
function reaction(){
 try{return getPostOfficeWorldReaction(gameState);}
 catch(error){console.error('[WorldPostOffice] Reaction unavailable:',error);return null;}
}
const available=scene=>!scene._cleanupDone&&!scene.exiting&&!scene.editor?.enabled&&scene.view==='room'&&
 scene.dialogue&&!scene.dialogue.destroyed&&Boolean(scene.textures?.exists(POST_OFFICE_ART.room.key));
function readToEnd(scene,eventId){
 const dialog=scene.dialogue;
 return Boolean(dialog?.data?.worldPostalEventId===eventId&&dialog.typing===false&&
  Array.isArray(dialog.pages)&&dialog.pages.length&&dialog.textPage===dialog.pages.length-1);
}
export function installPostOfficeWorldReactions(scene){
 if(scene?.sys?.settings?.key!=='PostOfficeScene'||typeof scene.talk!=='function'||typeof scene.panel!=='function')return null;
 if(installed.has(scene))return installed.get(scene);
 const original=scene.talk;
 let dead=false;
 const canUse=()=>!dead&&available(scene)&&scene.sys.isActive();
 function openNews(menuData){
  if(!canUse()||scene.dialogue.data!==menuData)return;
  const selected=reaction();if(!selected){scene.talk();return;}
  let responseData=null;
  const back=()=>{
   if(!canUse()||scene.dialogue.data!==responseData)return;
   if(readToEnd(scene,selected.eventId)){
    try{if(markPostOfficeWorldReaction(gameState,selected.eventId)&&gameState.caseFailed!==true)requestAutosave();}
    catch(error){console.error('[WorldPostOffice] Could not record reaction:',error);}
   }
   scene.talk();
  };
  scene.panel('POSTMAN',selected.text,[[__dialogueText("ui/WorldPostOfficeReactionHooks.js", "t_64646486e814dc4b26d0"),back]],true);
  responseData=scene.dialogue?.data;
  if(responseData)responseData.worldPostalEventId=selected.eventId;
 }
 const wrapped=function(...args){
  if(dead||!available(this)||!reaction())return original.apply(this,args);
  const rawPanel=this.panel;
  let injected=false;
  const decoratedPanel=function(title,text,choices=[],...rest){
   if(injected||title!=='POSTMAN'||!available(this)||!Array.isArray(choices))return rawPanel.call(this,title,text,choices,...rest);
   injected=true;let menuData=null;
   const topic=[TOPIC,()=>openNews(menuData)];
   const result=rawPanel.call(this,title,text,[topic,...choices],...rest);
   menuData=this.dialogue?.data;
   return result;
  };
  this.panel=decoratedPanel;
  try{return original.apply(this,args);}
  finally{if(this.panel===decoratedPanel)this.panel=rawPanel;}
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
