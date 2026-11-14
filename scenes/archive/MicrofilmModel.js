import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizeMicrofilm(data,raw){
 const s={version:1,copyReceived:false,introLine:0,left:0,right:0,focus:0.2,differences:[],cityId:null,completed:false};if(raw?.version!==1)return s;
 s.copyReceived=raw.copyReceived===true;s.introLine=Number.isInteger(raw.introLine)?Math.max(0,Math.min(data.intro.length-1,raw.introLine)):0;
 for(const[key,frames]of[['left',data.leftFrames],['right',data.rightFrames]])if(Number.isInteger(raw[key]))s[key]=Math.max(0,Math.min(frames.length-1,raw[key]));
 s.focus=typeof raw.focus==='number'&&Number.isFinite(raw.focus)?Math.max(0,Math.min(1,raw.focus)):0.2;
 if(s.copyReceived)s.differences=[...new Set((Array.isArray(raw.differences)?raw.differences:[]).filter(k=>data.differenceFields.includes(k)))];
 if(data.destinations.some(d=>d.id===raw.cityId))s.cityId=raw.cityId;
 s.completed=s.copyReceived&&data.differenceFields.every(k=>s.differences.includes(k))&&s.cityId===data.correctCityId&&raw.completed===true;return s;
}
export function receiveMicrofilm(data,raw){const s=normalizeMicrofilm(data,raw);if(s.copyReceived)return s;if(s.introLine<data.intro.length-1)s.introLine++;else s.copyReceived=true;return s;}
export function microfilmAligned(data,s){return data.leftFrames[s.left]?.id===data.targetFrame&&data.rightFrames[s.right]?.id===data.targetFrame;}
export function microfilmFocused(data,s){return Math.abs(s.focus-data.focusTarget)<=data.focusTolerance+1e-9;}
export function markMicrofilmDifference(data,raw,field){
 const s=normalizeMicrofilm(data,raw);
 if(!s.copyReceived)return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_906a159627a686ac5be0")};
 if(!microfilmAligned(data,s))return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_28785b5452a638f7d5ce")};
 if(!microfilmFocused(data,s))return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_744a5ae8927449199d03")};
 if(!data.differenceFields.includes(field)||data.leftFrames[s.left].rows[field]===data.rightFrames[s.right].rows[field])return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_d99b33a9b52983929109")};
 if(!s.differences.includes(field))s.differences.push(field);return{ok:true,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_f47c4e352258b3045230")};
}
export function chooseMicrofilmCity(data,raw,id){const s=normalizeMicrofilm(data,raw);if(!s.copyReceived||!data.differenceFields.every(k=>s.differences.includes(k)))return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_88738fad2276a06d1f50")};if(id!==data.correctCityId)return{ok:false,state:s,message:__dialogueText("scenes/archive/MicrofilmModel.js", "t_dfef40b328b845813080")};s.cityId=id;s.completed=true;return{ok:true,state:s,message:data.success};}
export function microfilmEligible(data,count,hasFlag){return Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
