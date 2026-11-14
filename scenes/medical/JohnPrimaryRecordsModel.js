import { dialogueText as __dialogueText } from "../../dialogues/DialogueText.js";
export function normalizePrimary(data,raw){
 const s={version:1,permission:false,doctorBriefed:false,folder:null,read:[],conclusion:null,completed:false};if(raw?.version!==1)return s;
 s.permission=raw.permission===true;s.doctorBriefed=s.permission&&raw.doctorBriefed===true;s.folder=s.doctorBriefed&&raw.folder===data.correctFolder?raw.folder:null;
 if(s.folder)s.read=[...new Set((Array.isArray(raw.read)?raw.read:[]).filter(id=>data.documents.some(d=>d.id===id)))];
 if(data.conclusions.some(c=>c.id===raw.conclusion))s.conclusion=raw.conclusion;
 s.completed=raw.completed===true&&s.folder===data.correctFolder&&data.documents.every(d=>s.read.includes(d.id))&&s.conclusion===data.correctConclusion;return s;
}
export function primaryAction(data,raw,action,id=null){
 const s=normalizePrimary(data,raw);if(s.completed)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_9f1ed6bf576654971a16")};
 if(action==='permission'){s.permission=true;return{ok:true,state:s,message:data.permission};}
 if(!s.permission)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_09c855fcd567d89a97c6")};
 if(action==='doctor'){s.doctorBriefed=true;return{ok:true,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_dda1c25bc0a5042684e9")};}
 if(!s.doctorBriefed)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_757e27da04b8ff195930")};
 if(action==='folder'){const f=data.folders.find(f=>f.id===id);if(!f)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_3c813fc645825734bdf1")};if(f.id!==data.correctFolder)return{ok:false,state:s,message:f.reply};s.folder=f.id;return{ok:true,state:s,message:f.reply};}
 if(s.folder!==data.correctFolder)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_801abe74bc3612181e0d")};
 if(action==='read'){if(!data.documents.some(d=>d.id===id))return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_5d9b78d5334388e582c5")};if(!s.read.includes(id))s.read.push(id);return{ok:true,state:s,message:''};}
 if(action==='conclusion'){
  if(!data.documents.every(d=>s.read.includes(d.id)))return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_40cb945965692026fced")};
  if(id!==data.correctConclusion)return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_24f19345dab7afd9d724")};
  s.conclusion=id;s.completed=true;return{ok:true,state:s,message:data.success};
 }
 return{ok:false,state:s,message:__dialogueText("scenes/medical/JohnPrimaryRecordsModel.js", "t_72d6cf6c48d0686fbc96")};
}
