export const MARGE_TRUST_KEY='marge_hr_trust_v1';
const clone=v=>structuredClone(v);
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const CASES=['official','protected','named','extract'];
const STAGES=['intro_pending','awaiting_reply','response_pending','completed'];
function lines(value){return Array.isArray(value)&&value.length>0&&value.every(x=>record(x)&&typeof x.speaker==='string'&&typeof x.text==='string'&&x.text.trim());}
export function validateMargeTrustData(raw){
 if(raw?.version!==1||typeof raw.title!=='string'||!record(raw.cases)||Object.keys(raw.cases).length!==4)throw Error('Invalid Marge trust config.');
 for(const id of CASES){const c=raw.cases[id];
  if(!record(c)||!lines(c.intro)||typeof c.summary!=='string'||!['professional','trusted','formal_only'].includes(c.relationship)||typeof c.requiresReply!=='boolean')throw Error('Invalid Marge trust case.');
  const adverse=['named','extract'].includes(id);
  if(c.requiresReply!==adverse||(c.relationship==='formal_only')!==adverse)throw Error('Invalid Marge trust boundary.');
  if(adverse){if(!record(c.notice)||!['id','title','sender','recipient','text'].every(k=>typeof c.notice[k]==='string'&&c.notice[k].trim()))throw Error('Missing HR notice.');}
  else if(c.notice!==null)throw Error('Unexpected HR notice.');
 }
 if(!Array.isArray(raw.responses)||raw.responses.length!==3)throw Error('Invalid Marge reply count.');
 const ids=new Set();for(const r of raw.responses){if(!['apologize','justify','deflect'].includes(r.id)||ids.has(r.id)||typeof r.label!=='string'||typeof r.attitude!=='string'||!lines(r.lines))throw Error('Invalid Marge reply.');ids.add(r.id);}
 if(typeof raw.recap?.title!=='string'||!lines(raw.recap.lines)||!lines(raw.recap.denied))throw Error('Invalid Marge recap.');
 for(const key of ['saveFailed','later','cancelled','recorded','retry','choose'])if(typeof raw.messages?.[key]!=='string')throw Error('Missing Marge trust message.');
 return clone(raw);
}
export function deriveMargeTrustCase(source){
 if(source==null)return null;
 if(!record(source)||typeof source.choiceId!=='string'||!record(source.context))throw Error('Invalid Gordon source decision.');
 const {choiceId:id,context:c}=source;
 if(c.route===null&&id==='own_inquiry')return null;
 if(!['official_record','limited_confirmation','restricted_copy'].includes(c.route)||typeof c.sourceProtectionPromised!=='boolean'||typeof c.restrictedCopy!=='boolean')throw Error('Invalid Gordon source context.');
 if(id==='own_inquiry'){
  if(c.route==='official_record')return'official';
  if(!c.sourceProtectionPromised)throw Error('Missing confidential promise.');
  return'protected';
 }
 if(id==='official_reference'&&c.route==='official_record')return'official';
 if(id==='name_marge'&&['limited_confirmation','restricted_copy'].includes(c.route)&&c.sourceProtectionPromised)return'named';
 if(id==='show_extract'&&c.route==='restricted_copy'&&c.restrictedCopy&&c.document?.restricted===true)return'extract';
 throw Error('Inconsistent Gordon source decision.');
}
export function readMargeTrust(raw){
 if(raw==null)return null;
 if(!record(raw)||raw.version!==1||!CASES.includes(raw.caseId)||!STAGES.includes(raw.stage)||!record(raw.snapshot)||raw.snapshot.version!==1)throw Error('Invalid Marge trust save.');
 const config=validateMargeTrustData(raw.snapshot),c=config.cases[raw.caseId];
 if(raw.relationship!==c.relationship||raw.sourceSignature!==`${raw.sourceChoiceId}:${raw.sourceRoute}`)throw Error('Inconsistent Marge trust save.');
 const matchingCase=deriveMargeTrustCase(raw.sourceSnapshot);
 if(matchingCase!==raw.caseId||raw.sourceSnapshot.choiceId!==raw.sourceChoiceId||raw.sourceSnapshot.context.route!==raw.sourceRoute)throw Error('Invalid saved Marge trigger.');
 if(['awaiting_reply','response_pending'].includes(raw.stage)&&!c.requiresReply)throw Error('Unexpected Marge reply stage.');
 const response=config.responses.find(r=>r.id===raw.responseId);
 if(raw.responseId!==null&&!response)throw Error('Unknown saved Marge response.');
 if(['intro_pending','awaiting_reply'].includes(raw.stage)&&raw.responseId!==null)throw Error('Premature Marge response.');
 if(raw.stage==='response_pending'&&!response)throw Error('Missing Marge response.');
 if(raw.stage==='completed'&&c.requiresReply&&!response)throw Error('Unresolved Marge confrontation.');
 if(!c.requiresReply&&raw.responseId!==null)throw Error('Unexpected saved Marge response.');
 return clone(raw);
}
export function beginMargeTrust(config,raw,source,{interviewCompleted=false,helpCompleted=false}={}){
 const existing=readMargeTrust(raw);
 if(existing)return{ok:true,alreadyStarted:true,state:existing};
 if(!interviewCompleted||!helpCompleted)return{ok:false,reason:'not_ready'};
 const caseId=deriveMargeTrustCase(source);if(!caseId)return{ok:false,reason:'no_source_context'};
 const state={version:1,caseId,stage:'intro_pending',relationship:config.cases[caseId].relationship,sourceChoiceId:source.choiceId,sourceRoute:source.context.route,sourceSignature:`${source.choiceId}:${source.context.route}`,sourceSnapshot:clone(source),responseId:null,snapshot:clone(config)};
 return{ok:true,alreadyStarted:false,state:readMargeTrust(state)};
}
export function acknowledgeMargeTrustIntro(raw){
 const state=readMargeTrust(raw);if(!state)return{ok:false,reason:'not_started'};
 if(state.stage!=='intro_pending')return{ok:true,alreadyCompleted:true,state};
 state.stage=state.snapshot.cases[state.caseId].requiresReply?'awaiting_reply':'completed';return{ok:true,state};
}
export function chooseMargeTrustReply(raw,id){
 const state=readMargeTrust(raw);if(!state)return{ok:false,reason:'not_started'};
 if(state.responseId!==null)return state.responseId===id?{ok:true,alreadyCompleted:true,state}:{ok:false,reason:'already_chosen'};
 if(state.stage!=='awaiting_reply')return{ok:false,reason:'wrong_stage'};
 if(!state.snapshot.responses.some(r=>r.id===id))return{ok:false,reason:'unknown_reply'};
 state.responseId=id;state.stage='response_pending';return{ok:true,state};
}
export function acknowledgeMargeTrustResponse(raw){
 const state=readMargeTrust(raw);if(!state)return{ok:false,reason:'not_started'};
 if(state.stage==='completed')return{ok:true,alreadyCompleted:true,state};
 if(state.stage!=='response_pending')return{ok:false,reason:'wrong_stage'};
 state.stage='completed';return{ok:true,state};
}
export function margeTrustAccess(raw){
 const state=readMargeTrust(raw),relationship=state?.relationship??'professional';
 return{relationship,officialAccess:true,informalRecapAllowed:relationship!=='formal_only',attitude:state?.responseId?state.snapshot.responses.find(r=>r.id===state.responseId).attitude:null};
}
export function getMargeTrustPreviewSource(caseId){
 const definitions={official:['official_reference','official_record'],protected:['own_inquiry','limited_confirmation'],named:['name_marge','limited_confirmation'],extract:['show_extract','restricted_copy']};
 const d=definitions[caseId];if(!d)throw Error('Unknown Marge trust preview.');
 return{choiceId:d[0],context:{route:d[1],sourceProtectionPromised:d[1]!=='official_record',restrictedCopy:d[1]==='restricted_copy',document:d[1]==='restricted_copy'?{restricted:true}:null}};
}
