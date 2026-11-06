export function normalizeConfrontation(data,raw={}){
  const ids=data.topics.map(topic=>topic.id),phases=['opening','topics','reply','closing','complete'];
  const state={version:1,phase:'opening',asked:[],topicId:null,line:0};
  if(raw?.version!==1)return state;
  state.asked=[...new Set((Array.isArray(raw.asked)?raw.asked:[]).filter(id=>ids.includes(id)))];
  state.phase=phases.includes(raw.phase)?raw.phase:'opening';
  if(state.phase==='opening'&&state.asked.length)state.phase='topics';
  if(state.phase==='reply'){
    if(ids.includes(raw.topicId)&&!state.asked.includes(raw.topicId))state.topicId=raw.topicId;else state.phase='topics';
  }
  if(['closing','complete'].includes(state.phase)&&state.asked.length!==ids.length)state.phase='topics';
  if(state.phase==='topics'&&state.asked.length===ids.length)state.phase='closing';
  const lines=confrontationLines(data,state);
  state.line=Number.isInteger(raw.line)?Math.max(0,Math.min(Math.max(0,lines.length-1),raw.line)):0;
  return state;
}
export function confrontationLines(data,state){
  if(state.phase==='opening')return data.opening;
  if(state.phase==='reply')return data.topics.find(topic=>topic.id===state.topicId)?.lines||[];
  if(state.phase==='closing')return data.closing;
  return[];
}
export function selectConfrontationTopic(data,raw,topicId){
  const state=normalizeConfrontation(data,raw);
  if(state.phase!=='topics'||state.asked.includes(topicId)||!data.topics.some(topic=>topic.id===topicId))return{ok:false,state};
  return{ok:true,state:{...state,phase:'reply',topicId,line:0}};
}
export function advanceConfrontation(data,raw){
  const state=normalizeConfrontation(data,raw),lines=confrontationLines(data,state);
  if(!lines.length)return{ok:false,state};
  if(state.line<lines.length-1)return{ok:true,state:{...state,line:state.line+1}};
  if(state.phase==='opening')return{ok:true,state:{...state,phase:'topics',line:0}};
  if(state.phase==='reply'){
    const asked=[...state.asked,state.topicId];
    return{ok:true,state:{...state,asked,topicId:null,line:0,phase:asked.length===data.topics.length?'closing':'topics'}};
  }
  return{ok:true,state:{...state,phase:'complete',line:0}};
}
