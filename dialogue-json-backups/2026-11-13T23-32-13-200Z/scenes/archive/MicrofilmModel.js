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
 if(!s.copyReceived)return{ok:false,state:s,message:'Collect Alex\'s retained copy first.'};
 if(!microfilmAligned(data,s))return{ok:false,state:s,message:'Match the contact-amendment record on both reels first.'};
 if(!microfilmFocused(data,s))return{ok:false,state:s,message:'Adjust focus, or use the free AUTO FOCUS control.'};
 if(!data.differenceFields.includes(field)||data.leftFrames[s.left].rows[field]===data.rightFrames[s.right].rows[field])return{ok:false,state:s,message:'That field does not establish a difference.'};
 if(!s.differences.includes(field))s.differences.push(field);return{ok:true,state:s,message:'Difference recorded.'};
}
export function chooseMicrofilmCity(data,raw,id){const s=normalizeMicrofilm(data,raw);if(!s.copyReceived||!data.differenceFields.every(k=>s.differences.includes(k)))return{ok:false,state:s,message:'Record all three differences before choosing a destination.'};if(id!==data.correctCityId)return{ok:false,state:s,message:'Use the city named in the retained contact amendment.'};s.cityId=id;s.completed=true;return{ok:true,state:s,message:data.success};}
export function microfilmEligible(data,count,hasFlag){return Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
