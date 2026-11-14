import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { latestWorldNewspaperEvent, readWorldReactions } from '../systems/WorldReactionModel.js';

const TOPIC='Seen the latest case news?';
const RESPONSES={
  agency_convicted:'The court returned a conviction. That is the outcome to cite. An arrest and a judgment go in different boxes on the form.',
  agency_released:'The defendant was released. The public report does not establish a conviction. Please resist the urge to improve the wording.',
  agency_suspect_arrested:'The bulletin reports a detention. A verdict is a separate matter. We have separate forms. Naturally.',
  agency_pursuit_escape:'The public report says the pursuit ended without a detention. That is all I can discuss from that bulletin.',
  agency_time_expired:'The public update describes an unresolved inquiry. Filing the outcome is not the same as solving the case. Our cabinets know the difference.'
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
  return{eventId:event.id,text:`The bulletin concerns the ${event.artifact||'artefact'} case in ${event.cityName||'the city'}.\n\n${RESPONSES[event.kind]}`};
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
  scene.showPanel('Desk officer',selected.text,[
    ['Ask something else.',finish('topics')],
    ['Goodbye.',finish('goodbye')]
  ],TOPIC);
  responseVersion=scene.dialogueVersion;
}
export function addPoliceWorldReactionOption(scene,id,{canTalk}={}){
  if(!['start','topics'].includes(id)||typeof canTalk!=='function'||!available(scene,canTalk)||!scene.panel||!safeReaction())return false;
  const choices=scene.panel.querySelector('.police-choices');
  if(!choices||choices.querySelector('[data-world-case-news]')||!choices.textContent.includes('Goodbye.'))return false;
  const token=scene.runToken,version=scene.dialogueVersion;
  const button=scene.makeButton(TOPIC,()=>openReaction(scene,canTalk,token,version),version);
  button.dataset.worldCaseNews='true';
  choices.prepend(button);
  return true;
}
