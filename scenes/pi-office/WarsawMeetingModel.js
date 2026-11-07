const PHASES=['briefing','arrival','contact','verification','meeting','complete'];
export function normalizeWarsaw(data,raw){
 const s={version:1,phase:'briefing',contactVerified:false,radioVerified:false,line:0,completed:false};if(raw?.version!==1)return s;
 s.contactVerified=raw.contactVerified===true;s.radioVerified=s.contactVerified&&raw.radioVerified===true;
 s.line=Number.isInteger(raw.line)&&s.radioVerified?Math.max(0,Math.min(data.johnLines.length-1,raw.line)):0;
 s.phase=PHASES.includes(raw.phase)?raw.phase:'briefing';
 if(['verification','meeting','complete'].includes(s.phase)&&!s.contactVerified)s.phase='contact';
 if(['meeting','complete'].includes(s.phase)&&!s.radioVerified)s.phase='verification';
 s.completed=raw.completed===true&&s.contactVerified&&s.radioVerified&&s.line===data.johnLines.length-1&&s.phase==='complete';if(s.phase==='complete'&&!s.completed)s.phase='meeting';return s;
}
export function advanceWarsaw(data,raw,action){
 const s=normalizeWarsaw(data,raw);if(s.completed)return{state:s,ok:false,message:'This meeting is already recorded.'};
 if(action==='next'){
  if(s.phase==='briefing')s.phase='arrival';else if(s.phase==='arrival')s.phase='contact';else if(s.phase==='meeting'){if(s.line<data.johnLines.length-1)s.line++;else{s.phase='complete';s.completed=true;}}else return{state:s,ok:false,message:'Choose an answer first.'};
  return{state:s,ok:true,message:''};
 }
 const choices=s.phase==='contact'?data.contactChoices:s.phase==='verification'?data.verificationChoices:[];const c=choices.find(c=>c.id===action);if(!c)return{state:s,ok:false,message:'That action is unavailable here.'};if(!c.correct)return{state:s,ok:false,message:c.reply};
 if(s.phase==='contact'){s.contactVerified=true;s.phase='verification';}else{s.radioVerified=true;s.phase='meeting';}return{state:s,ok:true,message:c.reply};
}
export function warsawEligible(data,hasFlag,lead){return data.requiredFlags.every(hasFlag)&&lead?.cityId==='warsaw'&&lead?.contactReference===data.contactReference;}
