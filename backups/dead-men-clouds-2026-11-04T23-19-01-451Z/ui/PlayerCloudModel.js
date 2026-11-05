export const CLOUD_STORE = 'playerCloudNotebookV1';
const arr=v=>Array.isArray(v)?v:[];
const clean=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]+$/.test(id)&&!['__proto__','prototype','constructor'].includes(id);
export function knownWords(state,definition){
 const known=new Set(arr(state.piKeywordSearch?.cases?.[definition.id]?.known));
 return arr(definition.keywords).filter(word=>known.has(word.id));
}
export function cloudCase(state,caseId){
 const raw=state[CLOUD_STORE]?.cases?.[caseId];
 return {sequence:Number.isSafeInteger(raw?.sequence)?raw.sequence:0,clouds:arr(raw?.clouds).map(c=>({...c,words:[...new Set(arr(c.words))]})),links:arr(raw?.links).map(l=>({...l}))};
}
function storeCase(state,caseId,next){
 if(!clean(caseId))return false;
 const previous=state[CLOUD_STORE]||{};
 state[CLOUD_STORE]={version:1,...previous,cases:{...(previous.cases||{}),[caseId]:next}};
 return true;
}
export function namingOptions(state,definition){
 const words=knownWords(state,definition);
 if(definition.id!=='miramar_demo')return words.map(w=>({id:w.id,label:w.label}));
 const entities=new Set(['claire','nora','miramar','mariner','coral','open_skies','conference']);
 return [{id:'daniel',label:'Daniel Reed'},...words.filter(w=>entities.has(w.id)).map(w=>({id:w.id,label:w.label}))];
}
export function createCloud(state,definition,wordIds=[]){
 const c=cloudCase(state,definition.id),known=new Set(knownWords(state,definition).map(w=>w.id));
 let sequence=c.sequence+1,id='cloud_'+sequence;
 while(c.clouds.some(item=>item.id===id))id='cloud_'+(++sequence);
 c.sequence=sequence;c.clouds.push({id,titleKey:null,words:[...new Set(wordIds)].filter(id=>known.has(id))});
 return storeCase(state,definition.id,c)?id:null;
}
export function nameCloud(state,definition,cloudId,titleKey){
 if(titleKey!==null&&!namingOptions(state,definition).some(o=>o.id===titleKey))return false;
 const c=cloudCase(state,definition.id),cloud=c.clouds.find(x=>x.id===cloudId);if(!cloud)return false;
 cloud.titleKey=titleKey;return storeCase(state,definition.id,c);
}
export function addCloudWords(state,definition,cloudId,ids){
 const c=cloudCase(state,definition.id),cloud=c.clouds.find(x=>x.id===cloudId);if(!cloud)return false;
 const known=new Set(knownWords(state,definition).map(w=>w.id));
 cloud.words=[...new Set([...cloud.words,...ids.filter(id=>known.has(id))])];return storeCase(state,definition.id,c);
}
export function removeCloudWords(state,caseId,cloudId,ids){
 const c=cloudCase(state,caseId),cloud=c.clouds.find(x=>x.id===cloudId);if(!cloud)return false;
 const remove=new Set(ids);cloud.words=cloud.words.filter(id=>!remove.has(id));return storeCase(state,caseId,c);
}
export function deleteCloud(state,caseId,cloudId){
 const c=cloudCase(state,caseId);if(!c.clouds.some(x=>x.id===cloudId))return false;
 c.clouds=c.clouds.filter(x=>x.id!==cloudId);c.links=c.links.filter(l=>l.from!==cloudId&&l.to!==cloudId);return storeCase(state,caseId,c);
}
export function linkClouds(state,caseId,from,to){
 const c=cloudCase(state,caseId);if(from===to||![from,to].every(id=>c.clouds.some(x=>x.id===id)))return false;
 if(!c.links.some(l=>[l.from,l.to].includes(from)&&[l.from,l.to].includes(to)))c.links.push({from,to});
 return storeCase(state,caseId,c);
}
export function unlinkClouds(state,caseId,from,to){
 const c=cloudCase(state,caseId);c.links=c.links.filter(l=>!([l.from,l.to].includes(from)&&[l.from,l.to].includes(to)));return storeCase(state,caseId,c);
}
export function unsortedWords(state,definition){
 const assigned=new Set(cloudCase(state,definition.id).clouds.flatMap(c=>c.words));
 return knownWords(state,definition).filter(w=>!assigned.has(w.id));
}
export function cloudTitle(state,definition,cloud){
 return namingOptions(state,definition).find(o=>o.id===cloud.titleKey)?.label||'Unnamed cloud';
}
export function reedPhoneQuestions(state,definition,cloud,contact,flags=[]){
 if(definition.id!=='miramar_demo'||!cloud?.titleKey)return [];
 const known=new Set(knownWords(state,definition).map(w=>w.id)),members=new Set(cloud.words);
 const org=cloud.titleKey==='open_skies';
 const subject=id=>cloud.titleKey===id||(org&&members.has(id));
 const specs=[
 ["reed_claire_delegate","Claire’s reason for attending","claire","conference"],
 ["reed_claire_message","Leave a message for Claire","claire"],
 ["reed_nora_private_number","Contacting Nora","nora"],
 ["reed_nora_handover","What happened after the photograph?","nora","checked_jacket"],
 ["reed_claire_table","Ask about Claire’s table","claire","two_glasses"],
 ["reed_daniel_enquiry","Daniel’s connection to the event","daniel"],
 ["reed_daniel_accommodation","Daniel’s hotel booking","daniel"],
 ["reed_delegate_status","Who received delegate passes?","open_skies","swallow_logo"],
 ["reed_event_photograph_timing","When were the reception photographs taken?","open_skies","conference"],
 ["reed_miramar_private_rooms","Event arrangements and private bookings","miramar","conference"],

 ['claire_phone_request','Contact Claire Sutton','claire'],
 ['claire_work_email','Ask for Claire’s work email','claire'],
 ['claire_profile','Claire’s role at the foundation','claire'],
 ['claire_jacket','Claire and the borrowed jacket','claire','checked_jacket'],
 ['nora_intro','Nora in the reception photograph','nora'],
 ['nora_profile','Nora’s role at the foundation','nora'],
 ['jacket_verification','Nora and the borrowed jacket','nora','checked_jacket'],
 ['organisation_general','The foundation’s work','open_skies'],
 ['conference_general','The New Horizons programme','open_skies','conference'],
 ['photo_general','Who arranged the photographs?','open_skies','conference'],
 ['badge_conference','Delegate badges','open_skies','swallow_logo'],
 ['hotel_conference','The reception venue','open_skies','miramar'],
 ['hotel_general','The event at Hotel Miramar','miramar'],
 ['mariner_general','Ask about The Mariner','mariner'],
 ['coral_general','Ask about Coral Crown Hotel','coral']
 ];
 return specs.filter(([, ,id,detail])=>subject(id)&&(!detail||members.has(detail)))
 .map(([id,label])=>{const topic=contact.topics.find(t=>t.id===id);return topic?{...topic,questionLabel:label}:null;})
 .filter(topic=>topic&&(topic.terms||[]).every(id=>known.has(id))&&(topic.requiresFlags||[]).every(flag=>flags.includes(flag)));
}

// REED_MORE_PHONE_DIALOGUES_V1
