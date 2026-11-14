import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getSearchProgress } from '../ui/pi-computer/ComputerSearchCore.js';
import { fragmentDeadMenText, isDeadMenWebContactVisible, ensureDeadMenNotebook } from './DeadMenWebIntegration.js';

const CASE='dead_men_calling',QUEST='pi_dead_men_calling',KEY='piDeadMenTopics';
const INSTALLED=Symbol.for('lostArtifacts.deadMenTopicPhone');
const URL='assets/data/web/missions/dead-men-calling/phone.json';
const GUIDANCE='piDeadMenDialogueGuidance';
const WISH='dead_men_client_wishes',PRIVATE='dead_men_private_continuation';
const EFFECTS={interviewCompleted:'piDeadMenCalling',accessInterviewCompleted:'piDeadMenCalling',technicianCompleted:'piDeadMenCalling',
  folderInterview:'piDeadMenCallingFollowup',colinInterview:'piDeadMenCallingFollowup',
  confronted:'piDeadMenCallingFinale',consent:'piDeadMenCallingFinale',verified:'piDeadMenCallingFinale',
  clientWishes:GUIDANCE,privateRequested:GUIDANCE};
const sig=terms=>[...terms].sort().join('|');
const clone=value=>JSON.parse(JSON.stringify(value));
const active=()=>gameState.piQuests?.quests?.[QUEST]?.status==='active';
const all=(list,ids)=>ids.every(id=>Array.isArray(list)&&list.includes(id));
export function deadMenTopicFlags(){
 const a=gameState.piDeadMenCalling||{},b=gameState.piDeadMenCallingFollowup||{},c=gameState.piDeadMenCallingFinale||{};
 const g=gameState[GUIDANCE]||{},read=gameState.piDeadMenPresentation?.read||[];
 return {
  interviewCompleted:a.interviewCompleted===true,
  archiveCompared:all(a.archiveAnswers,['voice_fragments','background_track','supported_conclusion']),
  accessInterviewCompleted:a.accessInterviewCompleted===true,technicianCompleted:a.technicianCompleted===true,
  accessReviewed:all(a.accessAnswers,['delivered_copy','included_material','access_not_guilt']),
  folderInterview:b.folderInterview===true,colinInterview:b.colinInterview===true,
  folderReviewed:all(b.answers,['colin_denial','folder_interest','folder_limit']),
  confronted:c.confronted===true,consent:c.consent===true,verified:c.verified===true,
  clientWishes:g.clientWishes===true||read.includes(WISH),
  privateRequested:g.privateRequested===true||read.includes(PRIVATE)
 };
}
export function topicAllowed(topic,flags=deadMenTopicFlags()){
 return (topic.requires?.all||[]).every(flag=>flags[flag]===true)
  && (topic.requires?.none||[]).every(flag=>flags[flag]!==true);
}
export function selectDeadMenTopics(data,number,flags=deadMenTopicFlags()){
 const selected=new Map();
 for(const topic of data.topics.filter(t=>t.number===number&&topicAllowed(t,flags))){
  const key=sig(topic.terms),old=selected.get(key),priority=topic.priority||0;
  if(!old||(old.priority||0)<priority)selected.set(key,topic);
  else if((old.priority||0)===priority)throw Error(`Ambiguous Dead Men topic: ${number}/${key}`);
 }
 return [...selected.values()];
}
export function deadMenTopicTranscript(group){
 const s=gameState[KEY]||{};
 return (s.completed||[]).map(id=>s.transcripts?.[id]).filter(entry=>entry?.group===group)
  .flatMap(entry=>entry.lines||[]).map(line=>`${line.speaker}: ${line.text}`).join('\n\n');
}
export function finishDeadMenTopic(topic,lines){
 if(!active()||!topicAllowed(topic))return false;
 const old=gameState[KEY]||{},previous=old.transcripts?.[topic.id];
 if(topic.effect&&!EFFECTS[topic.effect])throw Error('Unknown Dead Men effect');
 const unchanged=(old.completed||[]).includes(topic.id)&&JSON.stringify(previous?.lines)===JSON.stringify(lines)
  && (!topic.effect||gameState[EFFECTS[topic.effect]]?.[topic.effect]===true);
 if(unchanged)return true;
 gameState[KEY]={...old,version:1,completed:[...new Set([...(old.completed||[]),topic.id])],
  transcripts:{...(old.transcripts||{}),[topic.id]:{group:topic.group,number:topic.number,lines:clone(lines)}}};
 if(topic.effect){const key=EFFECTS[topic.effect];gameState[key]={...(gameState[key]||{}),[topic.effect]:true};}
 if(topic.effect==='clientWishes'){
  const presentation=gameState.piDeadMenPresentation||{};
  // The conversation replaces reading the synthetic wishes email for existing ending gates.
  gameState.piDeadMenPresentation={...presentation,read:[...new Set([...(presentation.read||[]),WISH])]};
 }
 requestAutosave();return true;
}
export function validateDeadMenTopics(data,definition){
 if(data?.version!==1||data.caseId!==CASE||data.questId!==QUEST||!Array.isArray(data.contacts)||!Array.isArray(data.topics))throw Error('Invalid Dead Men phone data');
 const keys=new Set((definition?.keywords||[]).map(k=>k.id)),numbers=new Set(),ids=new Set(),flags=new Set(Object.keys(deadMenTopicFlags()));
 for(const c of data.contacts){
  if(!['619','620','621'].includes(c.number)||numbers.has(c.number)||!keys.has(c.requiresKeyword)||!Array.isArray(c.greeting)||!Array.isArray(c.fallback))throw Error('Invalid Dead Men contact');
  numbers.add(c.number);
 }
 for(const t of data.topics){
  if(typeof t.id!=='string'||ids.has(t.id)||!numbers.has(t.number)||!Array.isArray(t.terms)||!t.terms.length||t.terms.length>2||new Set(t.terms).size!==t.terms.length||!t.terms.every(k=>keys.has(k)))throw Error(`Invalid topic ${t.id}`);
  if(t.effect&&!EFFECTS[t.effect])throw Error(`Invalid effect ${t.id}`);
  if(!Array.isArray(t.lines)||!t.lines.length||t.lines.some(l=>typeof l.speaker!=='string'||typeof l.text!=='string'||!l.text))throw Error(`Invalid lines ${t.id}`);
  if(t.priority!==undefined&&!Number.isSafeInteger(t.priority))throw Error(`Invalid priority ${t.id}`);
  for(const flag of [...(t.requires?.all||[]),...(t.requires?.none||[])])if(!flags.has(flag))throw Error(`Unknown gate ${flag}`);
  ids.add(t.id);
 }
 return data;
}
export function deadMenBlockedReply(number,terms,data,flags=deadMenTopicFlags()){
 const candidates=data.topics.filter(t=>t.number===number&&sig(t.terms)===sig(terms));
 if(!candidates.length)return null;
 const candidate=[...candidates].sort((a,b)=>
  (a.requires?.all||[]).filter(f=>!flags[f]).length-(b.requires?.all||[]).filter(f=>!flags[f]).length)[0];
 const missing=(candidate.requires?.all||[]).filter(f=>!flags[f]);
 const name=data.contacts.find(c=>c.number===number)?.name||'Contact';
 let text=null;
 if(missing.includes('accessInterviewCompleted'))text='Ask Margaret for permission to release the archive-transfer records. That is separate from permission for an original-audio comparison.';
 else if(missing.includes('consent'))text='For an original-file comparison I need Margaret’s written permission and her preserved recent voicemail files. Ask her about comparing the voicemail with the recording archive.';
 else if(missing.includes('folderInterview'))text='Ask Margaret to check the blue folder and supply copies of what she finds. We should not invent its contents.';
 else if(missing.includes('folderReviewed'))text='Compare the exact recorded denial with the delivery acknowledgement and the folder documents in CASE REVIEW before putting the contradiction to Colin.';
 else if(missing.includes('archiveCompared'))text='First compare the recent transcript sentences and background descriptions with the older sources. Ask Leo about the comparison method if you are unsure where to start.';
 else if(missing.includes('verified'))text='The original-file comparison is not complete. Finish the permission enquiry and ask Leo about the voicemail and recording archive.';
 else if(missing.includes('confronted'))text='Access alone is not an identified caller. Check the statement against the delivery record and ask the person to explain any supported discrepancy.';
 if(!text)return null;
 return [{speaker:name,text}];
}
export function installDeadMenTopicPhone(phone){
 if(phone[INSTALLED])return;phone[INSTALLED]=true;
 const inv=phone.investigation;if(!inv)throw Error('[Dead Men topics] PhoneInvestigation required');
 let data=null,loading=null,controller=null,dead=false,committing=false;
 const restorers=[];
 const wrap=(target,key,factory)=>{const original=target[key];if(typeof original!=='function')return;
  const replacement=factory(original.bind(target));target[key]=replacement;
  restorers.push(()=>{if(target[key]===replacement)target[key]=original;});};
 const definition=()=>ensureDeadMenNotebook(inv.searchData);
 const ours=()=>inv.active?.caseId===CASE;
 const contact=number=>data?.contacts.find(c=>c.number===number);
 const decorate=lines=>lines.map(line=>({...line,fragments:fragmentDeadMenText(line.text,definition().keywords)}));
 async function load(){
  if(data)return data;if(loading)return loading;controller=new AbortController();
  loading=(async()=>{
   await inv.load();if(dead)return null;if(!definition())throw Error('Dead Men search case is missing.');
   const response=await fetch(URL,{signal:controller.signal,cache:'no-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);
   const result=validateDeadMenTopics(await response.json(),definition());if(!dead)data=result;return data;
  })().finally(()=>{loading=null;});return loading;
 }
 function prepare(c){return {...c,caseId:CASE,choicePrompt:'Choose one or two collected clues. Ask for a method or a missing document; click highlighted leads in the reply.',
  greeting:decorate(c.greeting),fallback:decorate(c.fallback),topics:selectDeadMenTopics(data,c.number).map(t=>({
   id:t.id,terms:t.terms,group:t.group,effect:t.effect,requiresFlags:[],grantFlags:[],grantKeywords:[],lines:decorate(t.lines)}))};}
 function commitResponse(){
  const last=phone.lines?.[phone.lines.length-1],bubble=phone.logItems?.[phone.logItems.length-1];
  if(dead||committing||!ours()||inv.phase!=='response'||!inv.pending||phone.state!=='connected'||phone.directoryOpen
    ||!phone.isOpen||phone.destroyed||phone.typingItem||!last||phone.lineIndex!==phone.lines.length-1
    ||!bubble||bubble.typing||bubble.full!==last.text)return;
  const topic=data?.topics.find(t=>t.id===inv.pending.id&&t.number===inv.active.number);if(!topic)return;
  committing=true;
  try{if(finishDeadMenTopic(topic,clone(phone.lines))){inv.pending=null;inv.active=prepare(contact(inv.active.number));}}
  finally{committing=false;}
 }
 wrap(phone,'startCall',original=>()=>{
  if(!['619','620','621'].includes(phone.number)||!active())return original();
  if(!isDeadMenWebContactVisible({number:phone.number})){phone.finishCall('The number cannot be connected.');return;}
  const number=phone.number;inv.resetCall();phone.cancelActivity();const token=phone.run;
  phone.state='ringing';phone.status='Connecting...';phone.render();
  void load().then(()=>{
   if(dead||phone.destroyed||!phone.isOpen||phone.run!==token||phone.number!==number||phone.state!=='ringing')return;
   if(!active()||!isDeadMenWebContactVisible({number})){phone.finishCall('The call is no longer available.');return;}
   phone.status='Ringing...';phone.startRing();phone.render();
   phone.later(3000,()=>{if(!dead&&active()&&isDeadMenWebContactVisible({number})&&phone.number===number&&phone.state==='ringing')phone.connect(contact(number));});
  }).catch(error=>{if(!dead&&!phone.destroyed&&phone.isOpen&&phone.run===token){console.error('[Dead Men topics]',error);phone.finishCall('The conversation could not be loaded. Hang up and try again.');}});
 });
 wrap(phone,'connect',original=>c=>{
  if(!contact(c?.number)||!active())return original(c);
  if(!isDeadMenWebContactVisible(c)){phone.finishCall('The number cannot be connected.');return;}
  inv.resetCall();inv.active=prepare(contact(c.number));inv.selected=[];inv.notePage=0;inv.pending=null;
  phone.contactName=c.name;inv.play(inv.active.greeting,'greeting');
 });
 wrap(inv,'ask',original=>()=>{
  if(!ours())return original();
  if(!active()||!isDeadMenWebContactVisible(inv.active)||inv.phase!=='choose'||phone.directoryOpen||!inv.selected.length)return false;
  const known=getSearchProgress().cases[CASE]?.known||[];
  if(inv.selected.length>2||new Set(inv.selected).size!==inv.selected.length||!inv.selected.every(id=>known.includes(id)))return false;
  inv.active=prepare(contact(inv.active.number));
  const topic=inv.active.topics.find(t=>sig(t.terms)===sig(inv.selected));
  if(topic){inv.pending=topic;inv.play(topic.lines,'response');return true;}
  const blocked=deadMenBlockedReply(inv.active.number,inv.selected,data);
  const words=inv.selected.map(id=>definition().keywords.find(k=>k.id===id)?.label||id).join(' + ');
  inv.pending=null;
  inv.play(decorate([{speaker:'You',text:`I wanted to ask about ${words}.`},...(blocked||contact(inv.active.number).fallback)]),'response');return true;
 });
 wrap(inv,'replay',original=>()=>{
  if(!ours())return original();if(inv.phase!=='choose'||phone.directoryOpen)return;
  const old=gameState[KEY]||{};
  const last=[...(old.completed||[])].reverse().map(id=>({entry:old.transcripts?.[id],number:data.topics.find(t=>t.id===id)?.number}))
   .find(item=>item.entry?.lines?.length&&(item.entry.number||item.number)===inv.active.number);
  if(last){inv.pending=null;inv.play(last.entry.lines,'replay');}
 });
 wrap(phone,'render',original=>(...args)=>{const result=original(...args);commitResponse();return result;});
 wrap(phone,'nextLine',original=>(...args)=>{commitResponse();const result=original(...args);if(ours()&&inv.phase==='choose'&&contact(inv.active.number))inv.active=prepare(contact(inv.active.number));return result;});
 wrap(inv,'destroy',original=>()=>{if(dead)return;dead=true;controller?.abort();data=null;for(const restore of restorers.reverse())restore();delete phone[INSTALLED];original();});
}
// DM_PLAYER_CLOUD_METADATA_V1
