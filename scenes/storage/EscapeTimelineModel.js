import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function evaluateEscape(data,state){
  if(!state.clarificationHeard)return{ok:false,reason:'clarification',message:__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_74f20821530f91697a2f")};
  if(!Array.isArray(state.slots)||state.slots.length!==data.slotCount||state.slots.some(id=>!id))return{ok:false,reason:'incomplete',message:__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_c4597199bc749a80e513")};
  if(new Set(state.slots).size!==state.slots.length)return{ok:false,reason:'duplicate',message:__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_0f3726634466ccd3b246")};
  const unsupported=state.slots.find(id=>!data.correctOrder.includes(id));
  if(unsupported)return{ok:false,reason:'unsupported',cardId:unsupported,message:__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_8ad1ecb3c7a0c16ec10a")};
  const index=state.slots.findIndex((id,i)=>id!==data.correctOrder[i]);
  if(index!==-1)return{ok:false,reason:'order',slotIndex:index,message:`${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_66cbfad8efbf9c7a675d")}${index+1}${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_e06070faad9aa250614c")}`};
  if(state.conclusion!==data.correctConclusion)return{ok:false,reason:'conclusion',message:data.conclusions.find(item=>item.id===state.conclusion)?.explanation||__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_a7c44f630ed40b504ae1")};
  return{ok:true,message:data.success};
}
export function normalizeEscape(data,raw){
  const state={version:1,clarificationHeard:false,clarificationLine:0,slots:Array(data.slotCount).fill(null),conclusion:null,checks:0,completed:false};
  if(raw?.version!==1)return state;
  state.clarificationHeard=raw.clarificationHeard===true;
  state.clarificationLine=Number.isInteger(raw.clarificationLine)?Math.max(0,Math.min(data.clarification.length-1,raw.clarificationLine)):0;
  const seen=new Set();if(Array.isArray(raw.slots)&&raw.slots.length===data.slotCount)state.slots=raw.slots.map(id=>{
    if(!data.cards.some(card=>card.id===id)||seen.has(id))return null;seen.add(id);return id;
  });
  if(data.conclusions.some(item=>item.id===raw.conclusion))state.conclusion=raw.conclusion;
  state.checks=Number.isInteger(raw.checks)&&raw.checks>=0?raw.checks:0;
  state.completed=raw.completed===true&&evaluateEscape(data,state).ok;return state;
}
export function advanceEscapeClarification(data,raw){
  const state=normalizeEscape(data,raw);if(state.clarificationHeard)return state;
  if(state.clarificationLine<data.clarification.length-1)state.clarificationLine++;else state.clarificationHeard=true;return state;
}
export function placeEscapeCard(data,raw,id,index){
  const state=normalizeEscape(data,raw);
  if(state.completed||!state.clarificationHeard||!Number.isInteger(index)||index<0||index>=data.slotCount||!data.cards.some(card=>card.id===id))return state;
  const origin=state.slots.indexOf(id),displaced=state.slots[index];state.slots[index]=id;if(origin!==-1&&origin!==index)state.slots[origin]=displaced;return state;
}
export function escapeStagePlan(currentId){
  if(currentId==='learned_dead')return['found_faked_death_clue','confirmed_faked_death'];
  if(currentId==='found_faked_death_clue')return['confirmed_faked_death'];return[];
}
export function escapeEligible(data,count,hasFlag,reportedDead){return reportedDead&&Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
export function escapeHint(data,state){
  const instructions=__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_25bc1a849dd62512c1c4");
  const unsupported=state.slots.find(id=>id&&!data.correctOrder.includes(id));
  if(unsupported){const card=data.cards.find(item=>item.id===unsupported),source=data.evidence.find(item=>item.id===card.evidence);return{id:`unsupported_${unsupported}`,instructions,cardId:unsupported,slotIndex:state.slots.indexOf(unsupported),text:`${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_5948954e3b49be94f964")}${card.title}${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_8dccf256f6d5783e62bb")}${source.text}`};}
  const index=data.correctOrder.findIndex((id,i)=>state.slots[i]!==id);
  if(index!==-1){const card=data.cards.find(item=>item.id===data.correctOrder[index]),source=data.evidence.find(item=>item.id===card.evidence);return{id:`escape_position_${index}`,instructions,cardId:card.id,slotIndex:index,text:`${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_66cbfad8efbf9c7a675d")}${index+1}${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_45822f54a0d0e030f756")}${card.title}${__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_8dccf256f6d5783e62bb")}${source.text}`};}
  return{id:'escape_conclusion',instructions,conclusionId:data.correctConclusion,text:__dialogueText("scenes/storage/EscapeTimelineModel.js", "t_1895bdef3eb6906aaa31")};
}
