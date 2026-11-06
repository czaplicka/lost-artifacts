export function createFollowupState(){return{version:1,offered:false,introLine:0,read:[],discussionLine:0,verified:false};}
export function allFollowupRead(data,state){return data.documents.every(doc=>state.read.includes(doc.id));}
export function normalizeFollowup(data,raw){
  const state=createFollowupState();if(raw?.version!==1)return state;
  state.offered=raw.offered===true;
  state.introLine=Number.isInteger(raw.introLine)?Math.max(0,Math.min(data.intro.length-1,raw.introLine)):0;
  if(state.offered)state.read=[...new Set((Array.isArray(raw.read)?raw.read:[]).filter(id=>data.documents.some(doc=>doc.id===id)))];
  if(allFollowupRead(data,state))state.discussionLine=Number.isInteger(raw.discussionLine)?Math.max(0,Math.min(data.discussion.length-1,raw.discussionLine)):0;
  state.verified=state.offered&&allFollowupRead(data,state)&&raw.verified===true&&state.discussionLine===data.discussion.length-1;return state;
}
export function advanceFollowupIntro(data,raw){
  const state=normalizeFollowup(data,raw);if(state.offered)return state;
  if(state.introLine<data.intro.length-1)state.introLine++;else state.offered=true;return state;
}
export function acknowledgeFollowupDocument(data,raw,id){
  const state=normalizeFollowup(data,raw);
  if(state.offered&&data.documents.some(doc=>doc.id===id)&&!state.read.includes(id))state.read.push(id);return state;
}
export function advanceFollowupDiscussion(data,raw){
  const state=normalizeFollowup(data,raw);if(!state.offered||!allFollowupRead(data,state)||state.verified)return state;
  if(state.discussionLine<data.discussion.length-1)state.discussionLine++;else state.verified=true;return state;
}
