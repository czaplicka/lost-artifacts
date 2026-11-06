export const MARGE_DISCLOSURE_KEY='marge_hr_disclosure_v1';
const copy=value=>structuredClone(value);
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function validateMargeDisclosureData(raw){
  if(!isRecord(raw)||raw.version!==1||raw.id!=='marge_hr_disclosure'||!Array.isArray(raw.introLines)||!raw.introLines.length||!Array.isArray(raw.choices)||raw.choices.length!==3)throw Error('Invalid Marge disclosure data.');
  for(const field of ['title','choicePrompt','confirmLabel','cancelLabel'])if(typeof raw[field]!=='string'||!raw[field].trim())throw Error(`Missing ${field}.`);
  for(const line of raw.introLines)if(typeof line!=='string'||!line.trim())throw Error('Invalid introduction.');
  for(const field of ['choiceRequired','cancelled','unavailable','confirmed','reviewTitle'])if(typeof raw.messages?.[field]!=='string'||!raw.messages[field].trim())throw Error('Invalid disclosure messages.');
  if(raw.commonClue?.name!=='Gordon'||raw.commonClue?.role!=='agency_supervisor'||typeof raw.commonClue?.source!=='string')throw Error('Invalid Gordon clue.');
  const ids=new Set();
  for(const choice of raw.choices){
    if(!['official_record','limited_confirmation','restricted_copy'].includes(choice.id)||ids.has(choice.id))throw Error('Invalid disclosure choice.');
    ids.add(choice.id);
    for(const field of ['title','label','summary'])if(typeof choice[field]!=='string'||!choice[field].trim())throw Error(`Missing choice ${field}.`);
    if(!Array.isArray(choice.lines)||!choice.lines.length||choice.lines.some(line=>typeof line!=='string'||!line.trim()))throw Error('Invalid disclosure dialogue.');
    const c=choice.context;
    if(!isRecord(c)||typeof c.sourceMode!=='string'||typeof c.relationshipTag!=='string'||typeof c.sourceProtectionPromised!=='boolean'||typeof c.restrictedCopy!=='boolean')throw Error('Invalid disclosure context.');
    if(choice.document!==null){
      const d=choice.document;
      if(!isRecord(d)||!['id','title','text'].every(k=>typeof d[k]==='string'&&d[k].trim())||typeof d.restricted!=='boolean')throw Error('Invalid administrative document.');
    }
    if(c.restrictedCopy!==(choice.document?.restricted===true))throw Error('Inconsistent restricted document.');
    if(choice.id==='official_record'&&(c.sourceProtectionPromised||c.restrictedCopy))throw Error('Invalid official route.');
    if(choice.id!=='official_record'&&!c.sourceProtectionPromised)throw Error('Missing explicit source promise.');
  }
  return copy(raw);
}
export function readMargeDisclosure(raw){
  if(raw==null)return null;
  if(!isRecord(raw)||raw.version!==1||raw.status!=='completed'||!['official_record','limited_confirmation','restricted_copy'].includes(raw.choiceId)||!isRecord(raw.choice)||raw.choice.id!==raw.choiceId)throw Error('Invalid saved Marge disclosure.');
  const single=raw.choice;
  if(!Array.isArray(single.lines)||single.lines.some(line=>typeof line!=='string')||typeof single.summary!=='string'||!isRecord(single.context)||typeof single.context.sourceProtectionPromised!=='boolean'||typeof single.context.restrictedCopy!=='boolean')throw Error('Invalid saved Marge context.');
  return copy(raw);
}
export function prepareMargeDisclosure(config,state,raw,choiceId){
  const existing=readMargeDisclosure(raw);
  if(existing){
    return existing.choiceId===choiceId?{success:true,alreadyCompleted:true,record:existing}:{success:false,reason:'already_completed'};
  }
  if(state.helpCompleted)return{success:true,alreadyCompleted:true,legacy:true,record:null};
  if(!state.ready||!state.giftGiven)return{success:false,reason:'unavailable'};
  const choice=config.choices.find(item=>item.id===choiceId);
  if(!choice)return{success:false,reason:'choice_required'};
  return{success:true,alreadyCompleted:false,record:{version:1,status:'completed',choiceId:choice.id,choice:copy(choice),commonClue:copy(config.commonClue)}};
}
export function margeGordonContext(raw,{legacyCompleted=false}={}){
  const record=readMargeDisclosure(raw);
  if(!record)return{available:legacyCompleted,legacy:legacyCompleted,choiceId:null,sourceMode:legacyCompleted?'legacy_unspecified':null,sourceProtectionPromised:false,restrictedCopy:false,document:null};
  return{available:true,legacy:false,choiceId:record.choiceId,...copy(record.choice.context),document:copy(record.choice.document)};
}
