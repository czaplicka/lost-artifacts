export function missingRecoveryItem(data){
  const items=data.items.filter(item=>item.issued>item.accounted);
  if(items.length!==1)throw new Error('The recovery puzzle requires exactly one discrepancy.');return items[0].id;
}
export function createAlexRecovery(){return{version:1,phase:'comparison',selectedId:null,discrepancyFound:false,line:0,attempts:0};}
export function normalizeAlexRecovery(data,raw){
  const state=createAlexRecovery();if(raw?.version!==1)return state;
  state.attempts=Number.isInteger(raw.attempts)&&raw.attempts>=0?raw.attempts:0;
  const valid=raw.discrepancyFound===true&&raw.selectedId===missingRecoveryItem(data);
  if(!valid)return state;
  state.discrepancyFound=true;state.selectedId=raw.selectedId;state.phase='confession';
  state.line=Number.isInteger(raw.line)?Math.max(0,Math.min(data.confession.length-1,raw.line)):0;
  if(raw.phase==='complete'&&state.line===data.confession.length-1)state.phase='complete';return state;
}
export function selectRecoveryDiscrepancy(data,raw,id){
  const state=normalizeAlexRecovery(data,raw);
  if(state.phase!=='comparison'||!data.items.some(item=>item.id===id))return{ok:false,ignored:true,state};
  state.attempts++;
  if(id!==missingRecoveryItem(data))return{ok:false,state};
  state.phase='confession';state.selectedId=id;state.discrepancyFound=true;state.line=0;return{ok:true,state};
}
export function advanceAlexRecovery(data,raw){
  const state=normalizeAlexRecovery(data,raw);if(state.phase!=='confession')return state;
  if(state.line<data.confession.length-1)state.line++;else state.phase='complete';return state;
}

export function canStartAlexRecovery(data,completedMissions,hasFlag){return Number.isInteger(completedMissions)&&completedMissions>=data.minimumCompletedMissions&&data.requiredFlags.every(hasFlag);}
