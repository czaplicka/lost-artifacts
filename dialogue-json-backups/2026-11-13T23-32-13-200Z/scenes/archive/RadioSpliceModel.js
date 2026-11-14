export function evaluateRadio(data,s){
 if(!Array.isArray(s.slots)||s.slots.length!==data.slotCount||s.slots.some(id=>!id))return{ok:false,reason:'incomplete',message:'Fill all six positions first.'};
 if(new Set(s.slots).size!==s.slots.length)return{ok:false,reason:'duplicate',message:'Use each fragment once.'};
 if(s.slots.some(id=>!data.clips.some(c=>c.id===id)))return{ok:false,reason:'unknown',message:'One fragment is not part of this transcript.'};
 const index=s.slots.findIndex((id,i)=>id!==data.correctOrder[i]);if(index!==-1)return{ok:false,reason:'order',slotIndex:index,message:`Check position ${index+1}. Match requests to the replies that acknowledge them.`};
 if(s.conclusion!==data.correctConclusion)return{ok:false,reason:'conclusion',message:data.conclusions.find(c=>c.id===s.conclusion)?.explanation||'Choose a conclusion supported by the transcript and report.'};
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
 const instructions='Read the six fragments and source summary for free. Place a request before its acknowledgement. Select two slots to swap; clear an unwanted placement. Choose a supported conclusion.';
 const index=data.correctOrder.findIndex((id,i)=>s.slots[i]!==id);
 if(index!==-1){const clip=data.clips.find(c=>c.id===data.correctOrder[index]);return{id:`radio_position_${index}`,instructions,clipId:clip.id,slotIndex:index,text:`Position ${index+1}: ${clip.label}. ${clip.text}`};}
 return{id:'radio_conclusion',instructions,conclusionId:data.correctConclusion,text:'Choose INSTRUCTIONS CHANGED. The transcript adds a route change and postponement; it does not authenticate the control-channel speaker.'};
}
