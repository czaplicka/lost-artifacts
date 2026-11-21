export const LOCK_NOISE_LIMIT=3;
export function createOfficeLock(seed='table-for-three'){
  let hash=2166136261;for(const ch of String(seed)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619);}
  const targets=[];for(let i=0;i<3;i++){hash=(Math.imul(hash,1664525)+1013904223)>>>0;targets.push(1+hash%3);}
  return {version:1,revision:0,status:'picking',targets,seated:[false,false,false],noise:0};
}
export function validOfficeLock(s){
  return !!s&&s.version===1&&Number.isSafeInteger(s.revision)&&s.revision>=0&&['picking','open','caught'].includes(s.status)&&
    Array.isArray(s.targets)&&s.targets.length===3&&s.targets.every(v=>Number.isInteger(v)&&v>=1&&v<=3)&&
    Array.isArray(s.seated)&&s.seated.length===3&&s.seated.every(v=>typeof v==='boolean')&&
    Number.isInteger(s.noise)&&s.noise>=0&&s.noise<=LOCK_NOISE_LIMIT&&
    (s.status==='caught'?s.noise===LOCK_NOISE_LIMIT:s.noise<LOCK_NOISE_LIMIT)&&
    (s.status==='open'?s.seated.every(Boolean):s.status==='picking'?!s.seated.every(Boolean):true);
}
export function operateOfficeLock(input,action){
  if(!validOfficeLock(input))return {ok:false,reason:'The saved lock state is invalid. It was not reset.'};
  if(input.status!=='picking')return {ok:false,reason:input.status==='caught'?'Security is watching this corridor.':'The lock is already open.'};
  if(!action||!Number.isInteger(action.pin)||action.pin<0||action.pin>2)return {ok:false,reason:'Choose one of the three pins.'};
  if(input.seated[action.pin])return {ok:false,reason:'That pin is already set.'};
  if(!['PROBE','SET_PIN'].includes(action.type))return {ok:false,reason:'Unknown lock action.'};
  if(action.type==='SET_PIN'&&(!Number.isInteger(action.depth)||action.depth<1||action.depth>3))return {ok:false,reason:'Choose light, medium or deep pressure.'};
  const state=structuredClone(input);let message;
  if(action.type==='PROBE')message=['The pin binds near the top. Light pressure should be enough.','The pin binds halfway down. It needs medium pressure.','The pin binds deep in the cylinder. It needs deep pressure.'][state.targets[action.pin]-1];
  else if(action.depth===state.targets[action.pin]){state.seated[action.pin]=true;message='A quiet click. The pin holds.';if(state.seated.every(Boolean)){state.status='open';message='The final pin clicks. The office door is unlocked.';}}
  else{state.noise++;message='The tool slips against the lock. A metallic scrape echoes down the corridor.';if(state.noise>=LOCK_NOISE_LIMIT){state.status='caught';message='A torch beam crosses the corridor. Security has found you.';}}
  state.revision++;return {ok:true,state,message};
}
