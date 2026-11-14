import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import { latestOfficeReaction, readWorldReactions } from './WorldReactionModel.js';

const NPCS=new Set(['archivist_drebin','alex_murphy']);
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const LINES={
  alex_murphy:{},
  archivist_drebin:{
    agency_convicted:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_5832e2b6ba0f1204b94b"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_898d4c6d632305637a41")
    ],
    agency_released:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_b6dae3f7ad43841a1c39"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_1e50f3b4483d64ce764f")
    ],
    agency_time_expired:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_2584321f16751302d823"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_f299e749f05bd73436a7")
    ],
    agency_suspect_arrested:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_a05eff28e0888dc5ed94"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_47e0f4570db29a2a32eb")
    ],
    agency_pursuit_escape:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_5d69b6bae24f3f782735"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_a6344bb339b53d6c53e0")
    ],
    agency_arrest_missing_warrant:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_d66d512688bc2d29a8da"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_8549e2c5505da4976ee8")
    ],
    agency_arrest_warrant_mismatch:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_42e591cf09e587166cd9"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_c939ac498836bd819732")
    ],
    agency_empty_apartment:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_d770cc1c4027172c0396"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_637d60ddcacf9e16ee7a")
    ],
    agency_wrong_arrest_attempt:[
      __dialogueText("systems/WorldNpcReactionModel.js", "t_9c91e89e397de6d1efc8"),
      __dialogueText("systems/WorldNpcReactionModel.js", "t_853c1ea42f4fcee1983b")
    ]
  }
};

function seenKey(npcId,eventId){return JSON.stringify([npcId,eventId]);}
function seenEntries(state){
  const value=readWorldReactions(state).npcSeen;
  if(value===undefined)return[];
  if(!Array.isArray(value))throw new Error('[WorldNPC] Invalid npcSeen history; it was not overwritten.');
  return value;
}
export function getWorldNpcReaction(state,npcId,{caseId=null,alexDialogues=null}={}){
  if(!NPCS.has(npcId))return null;
  const event=latestOfficeReaction(state,'agency');
  if(!event||!['public','agency'].includes(event.visibility)||
    (caseId!==null&&!same(event.caseId,caseId)))return null;
  const lines=(npcId==='alex_murphy'?alexDialogues?.reactions:LINES[npcId])?.[event.kind];
  if(!lines||seenEntries(state).includes(seenKey(npcId,event.id)))return null;
  return{
    npcId,eventId:event.id,
    lines:[(npcId===__dialogueText("systems/WorldNpcReactionModel.js", "t_bdb45b11c1a417005118")?alexDialogues.reactionIntro.replace(/\{artifact\}|\{city\}/g,key=>key===__dialogueText("systems/WorldNpcReactionModel.js", "t_80a460f582ba7424d625")?(event.artifact||__dialogueText("systems/WorldNpcReactionModel.js", "t_4edfbd28d0483e702f24")):(event.cityName||__dialogueText("systems/WorldNpcReactionModel.js", "t_0f53fb3533eb343bc155"))):`${__dialogueText("systems/WorldNpcReactionModel.js", "t_5f7134c4419ded9e1e4a")}${event.artifact||__dialogueText("systems/WorldNpcReactionModel.js", "t_4edfbd28d0483e702f24")}${__dialogueText("systems/WorldNpcReactionModel.js", "t_f42b9f039db44f945dae")}${event.cityName||__dialogueText("systems/WorldNpcReactionModel.js", "t_0f53fb3533eb343bc155")}${__dialogueText("systems/WorldNpcReactionModel.js", "t_cdb4ee2aea69cc6a8333")}`),...lines]
  };
}
export function markWorldNpcReaction(state,npcId,eventId){
  if(!NPCS.has(npcId))return false;
  const history=readWorldReactions(state);
  if(!history.events.some(event=>event.id===eventId&&event.system==='agency'&&same(event.campaignId,state._createdAt)))return false;
  const seen=seenEntries(state),key=seenKey(npcId,eventId);
  if(seen.includes(key))return false;
  state.worldReactionsV1={...history,npcSeen:[...seen,key]};
  return true;
}
