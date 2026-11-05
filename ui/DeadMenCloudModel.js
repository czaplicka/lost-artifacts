const CASE='dead_men_calling';
const STORE='playerCloudNotebookV1';
const array=v=>Array.isArray(v)?v:[];
const TITLES=new Set(['dm_edward','dm_margaret','dm_colin','dm_ward','dm_mercer','dm_leo','dm_archive','dm_folder','dm_accounts']);
export function deadMenNamingOptions(state,definition){
 if(definition?.id!==CASE)return [];
 const known=new Set(array(state.piKeywordSearch?.cases?.[CASE]?.known));
 return array(definition.keywords).filter(k=>known.has(k.id)&&TITLES.has(k.id)).map(k=>({id:k.id,label:k.label}));
}
function contextFor(state,cloud){
 const stored=state[STORE]?.cases?.[CASE]||{};
 const clouds=array(stored.clouds),links=array(stored.links);
 const nearby=links.filter(l=>l.from===cloud.id||l.to===cloud.id).map(l=>l.from===cloud.id?l.to:l.from);
 const context=[cloud,...clouds.filter(c=>nearby.includes(c.id))];
 return new Set(context.flatMap(c=>[c.titleKey,...array(c.words)]).filter(Boolean));
}
const SUBJECTS={
 dm_margaret_edward:['dm_edward','dm_margaret'],
 dm_margaret_calls:['dm_edward','dm_margaret','dm_archive'],
 margaret_initial:['dm_edward','dm_margaret','dm_archive'],
 dm_margaret_folder_early:['dm_edward','dm_margaret','dm_folder','dm_accounts'],
 margaret_access:['dm_edward','dm_margaret','dm_archive','dm_mercer','dm_leo','dm_colin'],
 margaret_folder:['dm_edward','dm_margaret','dm_folder','dm_accounts','dm_colin'],
 leo_transfer:['dm_edward','dm_margaret','dm_archive','dm_mercer','dm_leo','dm_colin'],
 colin_initial:['dm_colin','dm_ward','dm_folder','dm_accounts','dm_archive'],
 colin_confrontation:['dm_colin','dm_ward'],
 margaret_consent:['dm_margaret','dm_edward','dm_archive','dm_mercer','dm_leo'],
 leo_verification:['dm_edward','dm_archive','dm_mercer','dm_leo','dm_colin']
};
const LABELS={
 dm_margaret_edward:'Edward’s office and belongings',
 dm_margaret_calls:'The recent calls',
 margaret_initial:'Ask for the older recordings',
 dm_margaret_folder_early:'Edward’s blue folders',
 margaret_access:'Who handled the archive?',
 margaret_folder:'Ask to see the papers',
 leo_transfer:'Ask about the archive transfer',
 colin_confrontation:'Put the statement and receipt to Colin',
 margaret_consent:'Request permission for a comparison',
 leo_verification:'Ask for the comparison results'
};
export function deadMenCloudQuestions(state,definition,cloud,topics){
 if(definition?.id!==CASE||!cloud?.titleKey)return [];
 const known=new Set(array(state.piKeywordSearch?.cases?.[CASE]?.known));
 if(!deadMenNamingOptions(state,definition).some(o=>o.id===cloud.titleKey))return [];
 const context=contextFor(state,cloud),seen=new Set(),result=[];
 // Stage gates have already been applied by DeadMenPhoneTopics.prepare().
 for(const topic of array(topics)){
  const subjects=SUBJECTS[topic.group];
  if(!subjects||!subjects.includes(cloud.titleKey))continue;
  if(!array(topic.terms).length||!topic.terms.every(id=>known.has(id)&&context.has(id)))continue;
  const question=topic.lines?.[0]?.text||topic.id;
  const key=(topic.group||'')+'|'+question;
  if(seen.has(key))continue;seen.add(key);
  let label=LABELS[topic.group];
  if(topic.group==='colin_initial')label=topic.effect==='colinInterview'?'Ask about the archive copy':'Ask about the accounting papers';
  result.push({...topic,questionLabel:label||question});
 }
 return result;
}
