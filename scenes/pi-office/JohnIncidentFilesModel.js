import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizeIncidents(data,raw){
 const s={version:1,read:[],poison:null,gunshot:null,identity:null,completed:false};if(raw?.version!==1)return s;
 s.read=[...new Set((Array.isArray(raw.read)?raw.read:[]).filter(id=>data.documents.some(d=>d.id===id)))];
 for(const[key,choices]of[['poison',data.poisonLinks],['gunshot',data.gunshotLinks],['identity',data.identityChoices]])if(choices.some(c=>c.id===raw[key]))s[key]=raw[key];
 s.completed=raw.completed===true&&data.documents.every(d=>s.read.includes(d.id))&&Object.entries(data.correct).every(([k,v])=>s[k]===v);return s;
}
export function incidentAction(data,raw,action,id=null){
 const s=normalizeIncidents(data,raw);if(s.completed)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_a2e24f081375ceded0c0")};
 if(action==='read'){if(!data.documents.some(d=>d.id===id))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_ec78dcbfa93a7543e319")};if(!s.read.includes(id))s.read.push(id);return{ok:true,state:s,message:''};}
 const choices={poison:data.poisonLinks,gunshot:data.gunshotLinks,identity:data.identityChoices};
 if(choices[action]){if(!choices[action].some(c=>c.id===id))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_bd34b7841b05209e85e6")};s[action]=id;return{ok:true,state:s,message:''};}
 if(action==='check'){
  if(!data.documents.every(d=>s.read.includes(d.id)))return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_19a4cb56eff2f3d4397d")};
  if(s.poison!==data.correct.poison)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_cfe4f8060dbc02f4452c")};
  if(s.gunshot!==data.correct.gunshot)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_82b847ff3c3a64560bc6")};
  if(s.identity!==data.correct.identity)return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_cfc1001e89bcf0d9e553")};
  s.completed=true;return{ok:true,state:s,message:data.success};
 }
 return{ok:false,state:s,message:__dialogueText("scenes/pi-office/JohnIncidentFilesModel.js", "t_6fe9679f6dfe33fe7f39")};
}
