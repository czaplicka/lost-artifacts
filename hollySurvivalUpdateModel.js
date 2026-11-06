export function normalizeHollySurvival(data,raw){
  const state={version:1,lineIndex:-1,completed:false};if(raw?.version!==1)return state;
  state.lineIndex=Number.isInteger(raw.lineIndex)?Math.max(-1,Math.min(data.lines.length-1,raw.lineIndex)):-1;
  state.completed=raw.completed===true&&state.lineIndex===data.lines.length-1;return state;
}
export function advanceHollySurvival(data,raw,silenceRemaining=0){
  const state=normalizeHollySurvival(data,raw);
  if(state.completed)return{ok:false,reason:'complete',state};
  if(silenceRemaining>0)return{ok:false,reason:'silence',state};
  if(state.lineIndex<data.lines.length-1)state.lineIndex++;else state.completed=true;
  return{ok:true,state};
}
export function hollySurvivalEligible(data,count,hasFlag,confirmedStage){return confirmedStage&&Number.isInteger(count)&&count>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
