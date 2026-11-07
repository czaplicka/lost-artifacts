export function normalizeIncidents(data,raw){
 const s={version:1,read:[],poison:null,gunshot:null,identity:null,completed:false};if(raw?.version!==1)return s;
 s.read=[...new Set((Array.isArray(raw.read)?raw.read:[]).filter(id=>data.documents.some(d=>d.id===id)))];
 for(const[key,choices]of[['poison',data.poisonLinks],['gunshot',data.gunshotLinks],['identity',data.identityChoices]])if(choices.some(c=>c.id===raw[key]))s[key]=raw[key];
 s.completed=raw.completed===true&&data.documents.every(d=>s.read.includes(d.id))&&Object.entries(data.correct).every(([k,v])=>s[k]===v);return s;
}
export function incidentAction(data,raw,action,id=null){
 const s=normalizeIncidents(data,raw);if(s.completed)return{ok:false,state:s,message:'These findings are already recorded.'};
 if(action==='read'){if(!data.documents.some(d=>d.id===id))return{ok:false,state:s,message:'Unknown document.'};if(!s.read.includes(id))s.read.push(id);return{ok:true,state:s,message:''};}
 const choices={poison:data.poisonLinks,gunshot:data.gunshotLinks,identity:data.identityChoices};
 if(choices[action]){if(!choices[action].some(c=>c.id===id))return{ok:false,state:s,message:'Invalid selection.'};s[action]=id;return{ok:true,state:s,message:''};}
 if(action==='check'){
  if(!data.documents.every(d=>s.read.includes(d.id)))return{ok:false,state:s,message:'Read all seven pages, including the identity and recovery records.'};
  if(s.poison!==data.correct.poison)return{ok:false,state:s,message:'Match the retained drink to the vial in the poisoning file.'};
  if(s.gunshot!==data.correct.gunshot)return{ok:false,state:s,message:'Match the projectile to the recovered weapon in the shooting file.'};
  if(s.identity!==data.correct.identity)return{ok:false,state:s,message:'Use the verified identity cross-reference, not a shared first name.'};
  s.completed=true;return{ok:true,state:s,message:data.success};
 }
 return{ok:false,state:s,message:'Unknown action.'};
}
