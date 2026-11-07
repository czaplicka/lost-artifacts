export function normalizeFinale(data,raw){
 const s={version:1,reviewed:[],ready:false,line:0,candidate:null,outcome:null,completed:false};if(raw?.version!==1)return s;
 s.reviewed=[...new Set((Array.isArray(raw.reviewed)?raw.reviewed:[]).filter(id=>data.review.some(r=>r.id===id)))];
 s.ready=raw.ready===true&&data.review.every(r=>s.reviewed.includes(r.id));
 s.line=s.ready&&Number.isInteger(raw.line)?Math.max(0,Math.min(data.dialogue.length,raw.line)):0;
 const valid=id=>data.choices.some(c=>c.id===id);if(s.ready&&s.line===data.dialogue.length&&valid(raw.outcome)&&raw.completed===true){s.completed=true;s.outcome=raw.outcome;}else if(s.ready&&s.line===data.dialogue.length&&valid(raw.candidate))s.candidate=raw.candidate;
 return s;
}
export function finaleAction(data,raw,action,id=null){
 const s=normalizeFinale(data,raw);if(s.completed)return{ok:false,state:s,message:'This ending is already locked in this save.'};
 if(action==='read'){if(!data.review.some(r=>r.id===id))return{ok:false,state:s,message:'Unknown case-review page.'};if(!s.reviewed.includes(id))s.reviewed.push(id);return{ok:true,state:s,message:''};}
 if(action==='prepare'){if(!data.review.every(r=>s.reviewed.includes(r.id)))return{ok:false,state:s,message:'Read all three case-review pages first.'};s.ready=true;return{ok:true,state:s,message:''};}
 if(!s.ready)return{ok:false,state:s,message:'Complete the case review first.'};
 if(action==='next'){if(s.line>=data.dialogue.length)return{ok:false,state:s,message:'The conversation is already recorded.'};s.line++;return{ok:true,state:s,message:''};}
 if(s.line!==data.dialogue.length)return{ok:false,state:s,message:'Hear the conversation before making the decision.'};
 if(action==='choose'){if(!data.choices.some(c=>c.id===id))return{ok:false,state:s,message:'Invalid ending.'};s.candidate=id;return{ok:true,state:s,message:''};}
 if(action==='cancel'){s.candidate=null;return{ok:true,state:s,message:''};}
 if(action==='confirm'){if(!s.candidate||id!==s.candidate)return{ok:false,state:s,message:'Confirm the exact ending currently selected.'};s.outcome=s.candidate;s.candidate=null;s.completed=true;return{ok:true,state:s,message:''};}
 return{ok:false,state:s,message:'Unknown action.'};
}
