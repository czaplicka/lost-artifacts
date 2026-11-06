export function createSafeState(){return{version:1,clues:[],entered:[0,0,0],codeSolved:false,pins:0,codeAttempts:0,misses:0,slow:false,opened:false,searched:false};}
export function restoreSafeState(raw){
  const state=createSafeState();if(raw?.version!==1)return state;
  state.clues=[...new Set((Array.isArray(raw.clues)?raw.clues:[]).filter(id=>['folder','telephone','access'].includes(id)))];
  if(Array.isArray(raw.entered)&&raw.entered.length===3&&raw.entered.every(n=>Number.isInteger(n)&&n>=0&&n<=99))state.entered=[...raw.entered];
  state.codeSolved=raw.codeSolved===true;
  state.pins=state.codeSolved&&Number.isInteger(raw.pins)?Math.max(0,Math.min(3,raw.pins)):0;
  for(const key of ['codeAttempts','misses'])state[key]=Number.isInteger(raw[key])&&raw[key]>=0?raw[key]:0;
  state.slow=raw.slow===true;state.opened=state.codeSolved&&state.pins===3;state.searched=state.opened&&raw.searched===true;return state;
}
export function recordSafeClue(raw,id){const state=restoreSafeState(raw);if(['folder','telephone','access'].includes(id)&&!state.clues.includes(id))state.clues.push(id);return state;}
export function checkSafeCode(raw,combination){
  const state=restoreSafeState(raw);if(state.codeSolved)return{state,accepted:true,alreadySolved:true};
  state.codeAttempts++;
  const accepted=Array.isArray(combination)&&combination.length===3&&state.entered.every((n,i)=>n===combination[i]);
  if(accepted)state.codeSolved=true;return{state,accepted};
}
export function needlePosition(elapsedMs,periodMs){
  if(!Number.isFinite(elapsedMs)||!Number.isFinite(periodMs)||periodMs<=0)return 0;
  const phase=((elapsedMs%periodMs)+periodMs)%periodMs/periodMs;
  return phase<=0.5?phase*2:(1-phase)*2;
}
export function stopSafePin(raw,position,target,width){
  const state=restoreSafeState(raw);
  if(!state.codeSolved||state.opened)return{state,ignored:true};
  const accepted=Number.isFinite(position)&&Number.isFinite(target)&&Number.isFinite(width)&&width>0&&Math.abs(position-target)<=width/2;
  if(accepted){state.pins++;state.opened=state.pins===3;}else state.misses++;
  return{state,accepted,opened:state.opened};
}
export function searchSafe(raw){const state=restoreSafeState(raw);if(state.opened)state.searched=true;return state;}
