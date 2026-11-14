import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const TOPIC=__dialogueText("ui/WorldPoliceReactionHooks.js", "t_1a34c8f172305020d364");
const RESPONSES={
  agency_convicted:__dialogueText("ui/WorldPoliceReactionHooks.js", "t_d6dd2b5041a2044887fa"),
  agency_released:__dialogueText("ui/WorldPoliceReactionHooks.js", "t_cb5bb3ca960096f179b7"),
  agency_suspect_arrested:__dialogueText("ui/WorldPoliceReactionHooks.js", "t_2610009c4e9f29fc7fbf"),
  agency_pursuit_escape:__dialogueText("ui/WorldPoliceReactionHooks.js", "t_1f88c861616c3e014507"),
  agency_time_expired:__dialogueText("ui/WorldPoliceReactionHooks.js", "t_250f08e55f61a99fdd93")
};
const seenKey=id=>JSON.stringify(['PoliceStationScene','desk_officer',id]);
function seenEntries(state){
  const seen=readWorldReactions(state).policeNpcSeen;
  if(seen===undefined)return[];
  if(!Array.isArray(seen))throw new Error('[WorldPolice] Invalid policeNpcSeen history; it was not overwritten.');
  return seen;
}
export function getPoliceWorldReaction(state){
  const event=latestWorldNewspaperEvent(state,'hq');
  if(!event||event.visibility!=='public'||event.system!=='agency'||
    String(event.campaignId)!==String(state._createdAt)||!RESPONSES[event.kind]||
    seenEntries(state).includes(seenKey(event.id)))return null;
  return{eventId:event.id,text:`${__dialogueText("ui/WorldPoliceReactionHooks.js", "t_0106d3500113a6489c1c")}${event.artifact||__dialogueText("ui/WorldPoliceReactionHooks.js", "t_4edfbd28d0483e702f24")}${__dialogueText("ui/WorldPoliceReactionHooks.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("ui/WorldPoliceReactionHooks.js", "t_0f53fb3533eb343bc155")}${__dialogueText("ui/WorldPoliceReactionHooks.js", "t_0673d69ff78439adfb40")}${RESPONSES[event.kind]}`};
}
export function markPoliceWorldReaction(state,eventId){
  const history=readWorldReactions(state);
  const event=history.events.find(item=>item.id===eventId&&item.visibility==='public'&&item.system==='agency'&&
    String(item.campaignId)===String(state._createdAt)&&RESPONSES[item.kind]);
  if(!event)return false;
  const seen=seenEntries(state),key=seenKey(eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,policeNpcSeen:[...seen,key]};
  return true;
}
function safeReaction(){
  try{return getPoliceWorldReaction(gameState);}
  catch(error){console.error('[WorldPolice] Reaction unavailable:',error);return null;}
}
function available(scene,canTalk){
  return Boolean(!scene.disposed&&!scene._cleanupDone&&!scene.navigating&&!scene.coldCaseUI&&
    !scene.coldCaseLoading&&scene.sys?.isActive?.()&&canTalk());
}
function openReaction(scene,canTalk,token,menuVersion){
  if(scene.runToken!==token||scene.dialogueVersion!==menuVersion||!available(scene,canTalk))return;
  const selected=safeReaction();
  if(!selected){scene.showDialogue('topics');return;}
  let responseVersion=null;
  const finish=target=>()=>{
    if(scene.runToken!==token||scene.dialogueVersion!==responseVersion||!available(scene,canTalk))return;
    try{
      if(markPoliceWorldReaction(gameState,selected.eventId)&&gameState.caseFailed!==true)requestAutosave();
    }catch(error){console.error('[WorldPolice] Could not record reaction:',error);}
    scene.showDialogue(target);
  };
  scene.showPanel(__dialogueText("ui/WorldPoliceReactionHooks.js", "t_832bb16aeb9f95e761e9"),selected.text,[
    [__dialogueText("ui/WorldPoliceReactionHooks.js", "t_da0776b59d8c85cdba79"),finish('topics')],
    [__dialogueText("ui/WorldPoliceReactionHooks.js", "t_2b687db6298b629d3bcb"),finish(__dialogueText("ui/WorldPoliceReactionHooks.js", "t_82e35a63ceba37e96464"))]
  ],TOPIC);
  responseVersion=scene.dialogueVersion;
}
export function addPoliceWorldReactionOption(scene,id,{canTalk}={}){
  if(!['start','topics'].includes(id)||typeof canTalk!=='function'||!available(scene,canTalk)||!scene.panel||!safeReaction())return false;
  const choices=scene.panel.querySelector(__dialogueText("ui/WorldPoliceReactionHooks.js", "t_e0620ac96572cb04b764"));
  if(!choices||choices.querySelector('[data-world-case-news]')||!choices.textContent.includes(__dialogueText("ui/WorldPoliceReactionHooks.js", "t_2b687db6298b629d3bcb")))return false;
  const token=scene.runToken,version=scene.dialogueVersion;
  const button=scene.makeButton(TOPIC,()=>openReaction(scene,canTalk,token,version),version);
  button.dataset.worldCaseNews='true';
  choices.prepend(button);
  return true;
}
