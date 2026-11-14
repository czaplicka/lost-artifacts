export function buildAlarmSolution({serial,firmware,sensorsTripped}){
  const odd=Number(String(serial).slice(-1))%2===1;
  const first=odd?'MEM':'TEST',second=odd?'TEST':'MEM';
  const dip={type:'dip',id:String(firmware).startsWith('v3')?1:2,state:true};
  const reset={type:'button',id:'RESET'};
  return[{type:'button',id:first},...(sensorsTripped>3?[reset,dip]:[dip,reset]),{type:'button',id:second},{type:'button',id:'ENTER'}];
}
export function createAlarmState({serial,firmware,sensorsTripped}){
  if(!/^\d{5}$/.test(serial)||!['v2.4','v3.1'].includes(firmware)||!Number.isInteger(sensorsTripped)||sensorsTripped<2||sensorsTripped>5)throw new Error('Invalid alarm puzzle parameters.');
  return{version:2,serial,firmware,sensorsTripped,progress:0,strikes:0,solved:false,
    dipStates:{1:false,2:false,3:false,4:false},removedScrews:[],coverOpen:false,rewardClaimed:false};
}
export function restoreAlarmState(raw){
  if(raw?.version!==2)return null;
  let state;try{state=createAlarmState(raw);}catch{return null;}
  const solution=buildAlarmSolution(state);
  state.strikes=Number.isInteger(raw.strikes)&&raw.strikes>=0?raw.strikes:0;
  state.removedScrews=[...new Set((Array.isArray(raw.removedScrews)?raw.removedScrews:[]).filter(id=>id===0||id===1))];
  state.coverOpen=state.removedScrews.length===2;
  state.progress=Number.isInteger(raw.progress)?Math.max(0,Math.min(solution.length,raw.progress)):0;
  for(const id of [1,2])state.dipStates[id]=raw.dipStates?.[id]===true;
  state.solved=raw.solved===true;state.rewardClaimed=raw.rewardClaimed===true;
  const dipIndex=solution.findIndex(action=>action.type==='dip'),dipId=solution[dipIndex].id;
  if(!state.solved&&state.progress>dipIndex&&!state.dipStates[dipId]){state.progress=0;state.dipStates={1:false,2:false,3:false,4:false};}
  if(state.solved){state.progress=solution.length;state.dipStates[dipId]=true;}
  else if(state.progress===solution.length)state.progress=0;
  return state;
}
export function removeAlarmScrew(raw,id){
  const state={...raw,removedScrews:[...raw.removedScrews]};
  if(![0,1].includes(id)||state.removedScrews.includes(id))return{state,changed:false};
  state.removedScrews.push(id);state.coverOpen=state.removedScrews.length===2;
  return{state,changed:true};
}
export function applyAlarmAction(raw,action){
  const state={...raw,dipStates:{...raw.dipStates},removedScrews:[...raw.removedScrews]};
  if(state.solved)return{state,accepted:false,ignored:true};
  if(action.type==='dip'&&(action.id===3||action.id===4))return{state,accepted:false,ignored:true};
  const solution=buildAlarmSolution(state),expected=solution[state.progress];
  const match=expected&&expected.type===action.type&&expected.id===action.id&&
    (action.type!=='dip'||expected.state===action.state);
  if(match){
    if(action.type==='dip')state.dipStates[action.id]=action.state;
    state.progress++;state.solved=state.progress===solution.length;
    return{state,accepted:true,won:state.solved};
  }
  state.strikes++;const reset=state.strikes%3===0;
  if(reset){state.progress=0;state.dipStates={1:false,2:false,3:false,4:false};}
  return{state,accepted:false,mistake:true,reset};
}
export function describeAlarmAction(action){
  if(!action)return'Operation complete.';
  return action.type==='dip'?`Switch DIP ${action.id} ON.`:`Press ${action.id}.`;
}
