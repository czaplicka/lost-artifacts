export function normalizeGordonInterview(data, raw={}) {
  const ids=new Set(data.topics.map(topic=>topic.id));
  const asked=[...new Set(Array.isArray(raw.asked)?raw.asked.filter(id=>ids.has(id)):[])];
  const pendingTopic=ids.has(raw.pendingTopic)&&!asked.includes(raw.pendingTopic)?raw.pendingTopic:null;
  return{version:1,asked,pendingTopic,dismissalPending:asked.length===ids.size,completed:raw.completed===true};
}
export function planGordonQuestion(data, raw, topicId) {
  const state=normalizeGordonInterview(data,raw);
  if(state.completed)return{ok:false,reason:'completed'};
  if(state.dismissalPending)return{ok:false,reason:'dismissal_pending'};
  if(state.pendingTopic)return{ok:false,reason:'finish_current_reply'};
  const topic=data.topics.find(topic=>topic.id===topicId);
  if(!topic)return{ok:false,reason:'unknown_topic'};
  if(state.asked.includes(topicId))return{ok:false,reason:'already_asked'};
  return{ok:true,state:{...state,pendingTopic:topicId},question:topic.question,reply:[...topic.reply]};
}
export function acknowledgeGordonReply(data, raw) {
  const state=normalizeGordonInterview(data,raw);
  if(state.completed)return{ok:false,reason:'completed'};
  if(!state.pendingTopic)return{ok:false,reason:'no_pending_reply'};
  const asked=[...state.asked,state.pendingTopic];
  return{ok:true,state:{...state,asked,pendingTopic:null,dismissalPending:asked.length===data.topics.length}};
}
