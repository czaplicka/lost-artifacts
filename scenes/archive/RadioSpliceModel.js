import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function evaluateRadio(data,s){
 if(!Array.isArray(s.slots)||s.slots.length!==data.slotCount||s.slots.some(id=>!id))return{ok:false,reason:'incomplete',message:__dialogueText("scenes/archive/RadioSpliceModel.js", "t_0b497d9b8c4e11c90597")};
 if(new Set(s.slots).size!==s.slots.length)return{ok:false,reason:'duplicate',message:__dialogueText("scenes/archive/RadioSpliceModel.js", "t_4b48f3c99196f8745fe5")};
 if(s.slots.some(id=>!data.clips.some(c=>c.id===id)))return{ok:false,reason:'unknown',message:__dialogueText("scenes/archive/RadioSpliceModel.js", "t_604c7dba1a9351b607a8")};
 const index=s.slots.findIndex((id,i)=>id!==data.correctOrder[i]);if(index!==-1)return{ok:false,reason:'order',slotIndex:index,message:`${__dialogueText("scenes/archive/RadioSpliceModel.js", "t_0fef1a556cf6c111a996")}${index+1}${__dialogueText("scenes/archive/RadioSpliceModel.js", "t_fe950b2db813a5a90ca7")}`};
 if(s.conclusion!==data.correctConclusion)return{ok:false,reason:'conclusion',message:data.conclusions.find(c=>c.id===s.conclusion)?.explanation||__dialogueText("scenes/archive/RadioSpliceModel.js", "t_0884c2039f5180578854")};
 return{ok:true,message:data.success};
}
export function normalizeRadio(data,raw){
 const s={version:1,slots:Array(data.slotCount).fill(null),conclusion:null,checks:0,completed:false};if(raw?.version!==1)return s;
 const seen=new Set();if(Array.isArray(raw.slots)&&raw.slots.length===data.slotCount)s.slots=raw.slots.map(id=>{if(!data.clips.some(c=>c.id===id)||seen.has(id))return null;seen.add(id);return id;});
 if(data.conclusions.some(c=>c.id===raw.conclusion))s.conclusion=raw.conclusion;
 s.checks=Number.isInteger(raw.checks)&&raw.checks>=0?raw.checks:0;s.completed=raw.completed===true&&evaluateRadio(data,s).ok;return s;
}
export function placeRadio(data,raw,id,index){const s=normalizeRadio(data,raw);if(s.completed||!Number.isInteger(index)||index<0||index>=data.slotCount||!data.clips.some(c=>c.id===id))return s;const origin=s.slots.indexOf(id),displaced=s.slots[index];s.slots[index]=id;if(origin!==-1&&origin!==index)s.slots[origin]=displaced;return s;}
export function radioEligible(data,count,hasFlag){return Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
export function radioHint(data,s){
 const instructions=__dialogueText("scenes/archive/RadioSpliceModel.js", "t_71b12efd56059d67be5c");
 const index=data.correctOrder.findIndex((id,i)=>s.slots[i]!==id);
 if(index!==-1){const clip=data.clips.find(c=>c.id===data.correctOrder[index]);return{id:`radio_position_${index}`,instructions,clipId:clip.id,slotIndex:index,text:`${__dialogueText("scenes/archive/RadioSpliceModel.js", "t_66cbfad8efbf9c7a675d")}${index+1}${__dialogueText("scenes/archive/RadioSpliceModel.js", "t_45822f54a0d0e030f756")}${clip.label}${__dialogueText("scenes/archive/RadioSpliceModel.js", "t_8dccf256f6d5783e62bb")}${clip.text}`};}
 return{id:'radio_conclusion',instructions,conclusionId:data.correctConclusion,text:__dialogueText("scenes/archive/RadioSpliceModel.js", "t_f145bfc3442cad77e8b6")};
}
