import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
 dm_margaret_edward:__dialogueText("ui/DeadMenCloudModel.js", "t_eb44152e2c0adfdd38cd"),
 dm_margaret_calls:__dialogueText("ui/DeadMenCloudModel.js", "t_e2fcc4149c86ce95a850"),
 margaret_initial:__dialogueText("ui/DeadMenCloudModel.js", "t_522a5db44db171750e6c"),
 dm_margaret_folder_early:__dialogueText("ui/DeadMenCloudModel.js", "t_e084e472dc80fd570fb9"),
 margaret_access:__dialogueText("ui/DeadMenCloudModel.js", "t_a44ba1c7cefc4adb7cc3"),
 margaret_folder:__dialogueText("ui/DeadMenCloudModel.js", "t_7db90134714811192f08"),
 leo_transfer:__dialogueText("ui/DeadMenCloudModel.js", "t_a2bfe6372795985ed447"),
 colin_confrontation:__dialogueText("ui/DeadMenCloudModel.js", "t_b3f77c423f4fcf24b7bb"),
 margaret_consent:__dialogueText("ui/DeadMenCloudModel.js", "t_6e4b6f27668fb66fd770"),
 leo_verification:__dialogueText("ui/DeadMenCloudModel.js", "t_c035a3199fd1c9dbfebd")
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
  if(topic.group==='colin_initial')label=topic.effect==='colinInterview'?__dialogueText("ui/DeadMenCloudModel.js", "t_6c1fceb0afba142e25d1"):__dialogueText("ui/DeadMenCloudModel.js", "t_ff5129cf5b8525cb2766");
  result.push({...topic,questionLabel:label||question});
 }
 return result;
}
