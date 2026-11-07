export function normalizePrimary(data,raw){
 const s={version:1,permission:false,doctorBriefed:false,folder:null,read:[],conclusion:null,completed:false};if(raw?.version!==1)return s;
 s.permission=raw.permission===true;s.doctorBriefed=s.permission&&raw.doctorBriefed===true;s.folder=s.doctorBriefed&&raw.folder===data.correctFolder?raw.folder:null;
 if(s.folder)s.read=[...new Set((Array.isArray(raw.read)?raw.read:[]).filter(id=>data.documents.some(d=>d.id===id)))];
 if(data.conclusions.some(c=>c.id===raw.conclusion))s.conclusion=raw.conclusion;
 s.completed=raw.completed===true&&s.folder===data.correctFolder&&data.documents.every(d=>s.read.includes(d.id))&&s.conclusion===data.correctConclusion;return s;
}
export function primaryAction(data,raw,action,id=null){
 const s=normalizePrimary(data,raw);if(s.completed)return{ok:false,state:s,message:'This inspection is already recorded.'};
 if(action==='permission'){s.permission=true;return{ok:true,state:s,message:data.permission};}
 if(!s.permission)return{ok:false,state:s,message:'Obtain John\'s limited permission first.'};
 if(action==='doctor'){s.doctorBriefed=true;return{ok:true,state:s,message:'Lecter: "The summary is not the folder. Select the pre-flight incident file, not his annual review."'};}
 if(!s.doctorBriefed)return{ok:false,state:s,message:'Discuss the request with Lecter before searching the cabinet.'};
 if(action==='folder'){const f=data.folders.find(f=>f.id===id);if(!f)return{ok:false,state:s,message:'No such folder.'};if(f.id!==data.correctFolder)return{ok:false,state:s,message:f.reply};s.folder=f.id;return{ok:true,state:s,message:f.reply};}
 if(s.folder!==data.correctFolder)return{ok:false,state:s,message:'Select the matching pre-flight folder.'};
 if(action==='read'){if(!data.documents.some(d=>d.id===id))return{ok:false,state:s,message:'No such document.'};if(!s.read.includes(id))s.read.push(id);return{ok:true,state:s,message:''};}
 if(action==='conclusion'){
  if(!data.documents.every(d=>s.read.includes(d.id)))return{ok:false,state:s,message:'Inspect both entries and the attachment register first.'};
  if(id!==data.correctConclusion)return{ok:false,state:s,message:'The pages establish dates and attachment references, not who caused the injuries.'};
  s.conclusion=id;s.completed=true;return{ok:true,state:s,message:data.success};
 }
 return{ok:false,state:s,message:'That action is unavailable.'};
}
