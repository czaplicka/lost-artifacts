import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { latestWorldNewspaperEvent, readWorldReactions } from './WorldReactionModel.js';

const NPCS=new Set(['bartender','regular','guest']);
const RESPONSES={
  bartender:{
    agency_convicted:__dialogueText("systems/WorldTownReactionModel.js", "t_eb340435bc70c5ffafc3"),
    agency_released:__dialogueText("systems/WorldTownReactionModel.js", "t_77ebb71a4236f9bdbaec"),
    agency_suspect_arrested:__dialogueText("systems/WorldTownReactionModel.js", "t_9e82212bf2a618d35c0e"),
    agency_pursuit_escape:__dialogueText("systems/WorldTownReactionModel.js", "t_4ee5183c109af5912231"),
    agency_time_expired:__dialogueText("systems/WorldTownReactionModel.js", "t_bab986dfc9f60362482c")
  },
  regular:{
    agency_convicted:__dialogueText("systems/WorldTownReactionModel.js", "t_8e333442a86913898352"),
    agency_released:__dialogueText("systems/WorldTownReactionModel.js", "t_9da76ca9735c51f3d9b5"),
    agency_suspect_arrested:__dialogueText("systems/WorldTownReactionModel.js", "t_570a7ff2910de745a127"),
    agency_pursuit_escape:__dialogueText("systems/WorldTownReactionModel.js", "t_4c6bc7069064cccf5fef"),
    agency_time_expired:__dialogueText("systems/WorldTownReactionModel.js", "t_6e6f6152f9328fa131dd")
  },
  guest:{
    agency_convicted:__dialogueText("systems/WorldTownReactionModel.js", "t_9bdb09cd09cd455b988d"),
    agency_released:__dialogueText("systems/WorldTownReactionModel.js", "t_fbd0a330ef47126a4176"),
    agency_suspect_arrested:__dialogueText("systems/WorldTownReactionModel.js", "t_12c52729012a8e9a30a5"),
    agency_pursuit_escape:__dialogueText("systems/WorldTownReactionModel.js", "t_03b9d18a83345595e07e"),
    agency_time_expired:__dialogueText("systems/WorldTownReactionModel.js", "t_579e7d1be4910db03bf3")
  }
};
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const seenKey=(npcId,eventId)=>JSON.stringify(['TavernScene',npcId,eventId]);
function seenEntries(state){
  const value=readWorldReactions(state).townNpcSeen;
  if(value===undefined)return[];
  if(!Array.isArray(value))throw new Error('[WorldTownNPC] Invalid townNpcSeen history; it was not overwritten.');
  return value;
}
export function getTownNpcReaction(state,npcId){
  if(!NPCS.has(npcId))return null;
  const event=latestWorldNewspaperEvent(state,'hq');
  if(!event||event.visibility!=='public'||event.system!=='agency'||!same(event.campaignId,state._createdAt))return null;
  const response=RESPONSES[npcId][event.kind];
  if(!response||seenEntries(state).includes(seenKey(npcId,event.id)))return null;
  return{
    npcId,eventId:event.id,
    text:`${__dialogueText("systems/WorldTownReactionModel.js", "t_8eaad1d5679904cf64c8")}${event.artifact||__dialogueText("systems/WorldTownReactionModel.js", "t_4edfbd28d0483e702f24")}${__dialogueText("systems/WorldTownReactionModel.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("systems/WorldTownReactionModel.js", "t_0f53fb3533eb343bc155")}${__dialogueText("systems/WorldTownReactionModel.js", "t_0673d69ff78439adfb40")}${response}`
  };
}
export function markTownNpcReaction(state,npcId,eventId){
  if(!NPCS.has(npcId))return false;
  const history=readWorldReactions(state);
  const event=history.events.find(item=>item.id===eventId&&item.system==='agency'&&item.visibility==='public'&&same(item.campaignId,state._createdAt));
  if(!event||!RESPONSES[npcId][event.kind])return false;
  const seen=seenEntries(state),key=seenKey(npcId,eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,townNpcSeen:[...seen,key]};
  return true;
}
