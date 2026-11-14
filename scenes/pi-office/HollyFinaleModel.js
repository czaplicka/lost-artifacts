import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizeFinale(data,raw){
 const s={version:1,reviewed:[],ready:false,line:0,candidate:null,outcome:null,completed:false};if(raw?.version!==1)return s;
 s.reviewed=[...new Set((Array.isArray(raw.reviewed)?raw.reviewed:[]).filter(id=>data.review.some(r=>r.id===id)))];
 s.ready=raw.ready===true&&data.review.every(r=>s.reviewed.includes(r.id));
 s.line=s.ready&&Number.isInteger(raw.line)?Math.max(0,Math.min(data.dialogue.length,raw.line)):0;
 const valid=id=>data.choices.some(c=>c.id===id);if(s.ready&&s.line===data.dialogue.length&&valid(raw.outcome)&&raw.completed===true){s.completed=true;s.outcome=raw.outcome;}else if(s.ready&&s.line===data.dialogue.length&&valid(raw.candidate))s.candidate=raw.candidate;
 return s;
}
export function finaleAction(data,raw,action,id=null){
 const s=normalizeFinale(data,raw);if(s.completed)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_97fee48641c4e013d314")};
 if(action==='read'){if(!data.review.some(r=>r.id===id))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_0d15c9fa1e2c809504a1")};if(!s.reviewed.includes(id))s.reviewed.push(id);return{ok:true,state:s,message:''};}
 if(action==='prepare'){if(!data.review.every(r=>s.reviewed.includes(r.id)))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_c258a674c192259408ae")};s.ready=true;return{ok:true,state:s,message:''};}
 if(!s.ready)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_35bff57eb7e319046f9a")};
 if(action==='next'){if(s.line>=data.dialogue.length)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_a72de062c573cc7e89ed")};s.line++;return{ok:true,state:s,message:''};}
 if(s.line!==data.dialogue.length)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_ab2d15ad223c8923fbce")};
 if(action==='choose'){if(!data.choices.some(c=>c.id===id))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_d522731d5dcd03e37133")};s.candidate=id;return{ok:true,state:s,message:''};}
 if(action==='cancel'){s.candidate=null;return{ok:true,state:s,message:''};}
 if(action==='confirm'){if(!s.candidate||id!==s.candidate)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_d20b0fac9afc8fb2fc44")};s.outcome=s.candidate;s.candidate=null;s.completed=true;return{ok:true,state:s,message:''};}
 return{ok:false,state:s,message:__dialogueText("scenes/pi-office/HollyFinaleModel.js", "t_6fe9679f6dfe33fe7f39")};
}
