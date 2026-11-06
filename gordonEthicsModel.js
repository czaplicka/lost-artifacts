const clone=v=>structuredClone(v);
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const GORDON_ETHICS_KEY='gordon_ethics_v1';
export function validateGordonEthics(raw){
 if(raw?.version!==1)throw Error('Invalid Gordon ethics version.');
 for(const group of ['source','privacy']){
  const data=raw[group];if(!data||typeof data.title!=='string'||typeof data.intro!=='string'||!Array.isArray(data.choices)||!data.choices.length)throw Error('Invalid Gordon ethics group.');
  const ids=new Set();for(const c of data.choices){
   if(typeof c.id!=='string'||ids.has(c.id)||typeof c.label!=='string'||typeof c.effect!=='string')throw Error('Invalid Gordon ethics choice.');ids.add(c.id);
   if(group==='source'&&(!['always','official','confidential','extract'].includes(c.requires)||!Array.isArray(c.reply)||c.reply.some(l=>typeof l!=='string')||typeof c.reflection!=='string'))throw Error('Invalid source choice.');
   if(group==='privacy'&&typeof c.result!=='string')throw Error('Invalid privacy choice.');
  }
 }
 if(raw.source.choices.length!==4||raw.privacy.choices.length!==3||typeof raw.privacy.letter!=='string')throw Error('Invalid Gordon choice count.');
 for(const key of ['sourceRecorded','privacyRecorded','locked','savedFailed','notNow','legacy'])if(typeof raw.messages?.[key]!=='string')throw Error('Missing Gordon message.');
 return clone(raw);
}
export function readGordonEthics(raw){
 if(raw==null)return{version:1,source:null,privacy:null};
 if(!record(raw)||raw.version!==1)throw Error('Invalid Gordon ethics save.');
 for(const k of ['source','privacy'])if(raw[k]!=null&&(!record(raw[k])||typeof raw[k].choiceId!=='string'||!record(raw[k].choice)||raw[k].choice.id!==raw[k].choiceId))throw Error('Invalid saved Gordon choice.');
 return clone({version:1,source:raw.source??null,privacy:raw.privacy??null});
}
export function sourceContext(raw){
 if(raw==null)return{route:null,sourceProtectionPromised:false,restrictedCopy:false,document:null};
 if(!record(raw)||raw.version!==1||raw.status!=='completed'||!['official_record','limited_confirmation','restricted_copy'].includes(raw.choiceId)||raw.choice?.id!==raw.choiceId||!record(raw.choice.context))throw Error('Invalid saved Marge source context.');
 const c=raw.choice.context;
 if(typeof c.sourceProtectionPromised!=='boolean'||typeof c.restrictedCopy!=='boolean')throw Error('Invalid Marge source promise.');
 if(raw.choiceId==='restricted_copy'&&(!c.restrictedCopy||raw.choice.document?.restricted!==true))throw Error('Missing restricted extract.');
 return{route:raw.choiceId,sourceProtectionPromised:c.sourceProtectionPromised,restrictedCopy:c.restrictedCopy,document:clone(raw.choice.document??null)};
}
export function availableGordonSourceChoices(config,context){
 return config.source.choices.filter(c=>c.requires==='always'||(c.requires==='official'&&context.route==='official_record')||(c.requires==='confidential'&&['limited_confirmation','restricted_copy'].includes(context.route))||(c.requires==='extract'&&context.restrictedCopy&&context.document?.restricted===true)).map(clone);
}
export function planGordonSource(config,raw,context,id){
 const state=readGordonEthics(raw);
 if(state.source)return state.source.choiceId===id?{ok:true,alreadyCompleted:true,state}:{ok:false,reason:'already_completed',state};
 const choice=availableGordonSourceChoices(config,context).find(c=>c.id===id);
 if(!choice)return{ok:false,reason:'unavailable_choice',state};
 state.source={choiceId:id,choice:clone(choice),context:clone(context),promiseBroken:id==='name_marge'&&context.sourceProtectionPromised,sourceExposureRisk:id==='show_extract',sourceProtected:['own_inquiry','official_reference'].includes(id)};
 return{ok:true,alreadyCompleted:false,state};
}
export function planGordonPrivacy(config,raw,id){
 const state=readGordonEthics(raw);
 if(state.privacy)return state.privacy.choiceId===id?{ok:true,alreadyCompleted:true,state}:{ok:false,reason:'already_completed',state};
 const choice=config.privacy.choices.find(c=>c.id===id);
 if(!choice)return{ok:false,reason:'unavailable_choice',state};
 state.privacy={choiceId:id,choice:clone(choice),letter:id==='leave_sealed'?null:config.privacy.letter,copied:id==='copy_notes',investigativeEvidence:false};
 return{ok:true,alreadyCompleted:false,state};
}
