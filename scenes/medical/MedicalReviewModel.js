export function normalizeMedical(data,raw){
  const state={version:1,reflex:0,coordination:0,slow:false,line:0,completed:false};if(raw?.version!==1)return state;
  for(const key of ['reflex','coordination'])state[key]=Number.isInteger(raw[key])?Math.max(0,Math.min(data.rounds,raw[key])):0;
  state.slow=raw.slow===true;state.line=Number.isInteger(raw.line)?Math.max(0,Math.min(data.findings.length-1,raw.line)):0;
  state.completed=raw.completed===true&&medicalTestsDone(data,state)&&state.line===data.findings.length-1;return state;
}
export function medicalTestsDone(data,state){return state.reflex>=data.rounds&&state.coordination>=data.rounds;}
export function recordMedicalHit(data,raw,test){const state=normalizeMedical(data,raw);if(['reflex','coordination'].includes(test)&&!state.completed)state[test]=Math.min(data.rounds,state[test]+1);return state;}
export function reflexAccepted(elapsed,windowMs){return Number.isFinite(elapsed)&&elapsed>=0&&elapsed<=windowMs;}
export function medicalNeedle(elapsed,period){const p=((elapsed%period)+period)%period/period;return p<=0.5?p*2:(1-p)*2;}
export function advanceMedicalFindings(data,raw){const state=normalizeMedical(data,raw);if(!medicalTestsDone(data,state)||state.completed)return state;if(state.line<data.findings.length-1)state.line++;else state.completed=true;return state;}
export function medicalEligible(data,count,hasFlag){return Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
