import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizeConfrontation(data,raw){
 const s={version:1,started:false,active:null,topics:{},completed:false};const valid=raw?.version===1;
 s.started=valid&&raw.started===true;
 for(const t of data.topics){const r=valid?raw.topics?.[t.id]:null,evidence=data.evidence.some(e=>e.id===r?.evidence)?r.evidence:null,cursor=evidence===t.evidence&&Number.isInteger(r?.cursor)?Math.max(0,Math.min(t.lines.length,r.cursor)):0;s.topics[t.id]={evidence,cursor,heard:evidence===t.evidence&&cursor===t.lines.length};}
 if(s.started&&data.topics.some(t=>t.id===raw?.active)&&!s.topics[raw.active].heard)s.active=raw.active;
 s.completed=valid&&raw.completed===true&&s.started&&data.topics.every(t=>s.topics[t.id].heard);return s;
}
export function confrontationAction(data,raw,action,id=null){
 const s=normalizeConfrontation(data,raw);if(s.completed)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_5f30a981cddb2deb4b08")};
 if(action==='start'){s.started=true;return{ok:true,state:s,message:''};}if(!s.started)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_b9200b4a43167677a698")};
 if(action==='topic'){const t=data.topics.find(t=>t.id===id);if(!t)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_f8ba117028c333c94829")};if(s.topics[id].heard)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_892e91d09caf46a63b7c")};s.active=id;return{ok:true,state:s,message:''};}
 if(action==='menu'){s.active=null;return{ok:true,state:s,message:''};}
 if(action==='finish'){if(!data.topics.every(t=>s.topics[t.id].heard))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_5ec142c4f08965121eb6")};s.active=null;s.completed=true;return{ok:true,state:s,message:data.success};}
 const t=data.topics.find(t=>t.id===s.active);if(!t)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_48cec582e916112b4e1f")};const p=s.topics[t.id];
 if(action==='evidence'){if(id!==t.evidence)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_98d9c22f77651c548972")};p.evidence=id;return{ok:true,state:s,message:''};}
 if(action==='next'){if(p.evidence!==t.evidence)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_e1497a6bf3d054cf0ae7")};p.cursor=Math.min(t.lines.length,p.cursor+1);p.heard=p.cursor===t.lines.length;if(p.heard)s.active=null;return{ok:true,state:s,message:''};}
 return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnConfrontationModel.js", "t_6fe9679f6dfe33fe7f39")};
}
