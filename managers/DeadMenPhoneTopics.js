import { gameState } from '../GameData.js';
import { requestAutosave } from '../gameStatePersistence.js';
import { getSearchProgress } from '../ui/pi-computer/ComputerSearchCore.js';
import { fragmentDeadMenText, isDeadMenWebContactVisible } from './DeadMenWebIntegration.js';

const CASE='dead_men_calling',QUEST='pi_dead_men_calling',KEY='piDeadMenTopics';
const INSTALLED=Symbol.for('lostArtifacts.deadMenTopicPhone');
const URL='assets/data/web/missions/dead-men-calling/phone.json';
const EFFECTS={interviewCompleted:'piDeadMenCalling',accessInterviewCompleted:'piDeadMenCalling',technicianCompleted:'piDeadMenCalling',folderInterview:'piDeadMenCallingFollowup',colinInterview:'piDeadMenCallingFollowup',confronted:'piDeadMenCallingFinale',consent:'piDeadMenCallingFinale',verified:'piDeadMenCallingFinale'};
const sig=terms=>[...terms].sort().join('|');
const clone=value=>JSON.parse(JSON.stringify(value));
const active=()=>gameState.piQuests?.quests?.[QUEST]?.status==='active';
const all=(list,ids)=>ids.every(id=>Array.isArray(list)&&list.includes(id));
export function deadMenTopicFlags(){
 const a=gameState.piDeadMenCalling||{},b=gameState.piDeadMenCallingFollowup||{},c=gameState.piDeadMenCallingFinale||{};
 return {
  interviewCompleted:a.interviewCompleted===true,
  archiveCompared:all(a.archiveAnswers,['voice_fragments','background_track','supported_conclusion']),
  accessInterviewCompleted:a.accessInterviewCompleted===true,technicianCompleted:a.technicianCompleted===true,
  accessReviewed:all(a.accessAnswers,['delivered_copy','included_material','access_not_guilt']),
  folderInterview:b.folderInterview===true,colinInterview:b.colinInterview===true,
  folderReviewed:all(b.answers,['colin_denial','folder_interest','folder_limit']),
  confronted:c.confronted===true,consent:c.consent===true,verified:c.verified===true
 };
}
export function topicAllowed(topic,flags=deadMenTopicFlags()){
 return (topic.requires?.all||[]).every(flag=>flags[flag]===true)&&
  (topic.requires?.none||[]).every(flag=>flags[flag]!==true);
}
export function deadMenTopicTranscript(group){
 const state=gameState[KEY]||{},order=Array.isArray(state.completed)?state.completed:[];
 return order.map(id=>state.transcripts?.[id]).filter(entry=>entry?.group===group)
  .flatMap(entry=>entry.lines||[]).map(line=>`${line.speaker}: ${line.text}`).join('\n\n');
}
export function finishDeadMenTopic(topic,lines){
 if(!active()||!topicAllowed(topic))return false;
 const old=gameState[KEY]||{};
 gameState[KEY]={version:1,completed:[...new Set([...(old.completed||[]),topic.id])],
  transcripts:{...(old.transcripts||{}),[topic.id]:{group:topic.group,lines:clone(lines)}}};
 if(topic.effect){
  const key=EFFECTS[topic.effect];if(!key)throw Error('Unknown Dead Men effect');
  gameState[key]={...(gameState[key]||{}),[topic.effect]:true};
 }
 requestAutosave();return true;
}
export function validateDeadMenTopics(data,definition){
 if(data?.version!==1||data.caseId!==CASE||data.questId!==QUEST||!Array.isArray(data.contacts)||!Array.isArray(data.topics))throw Error('Invalid Dead Men phone data');
 const keys=new Set((definition?.keywords||[]).map(k=>k.id)),numbers=new Set(),ids=new Set();
 const flags=new Set(Object.keys(deadMenTopicFlags()));
 for(const c of data.contacts){
  if(!['619','620','621'].includes(c.number)||numbers.has(c.number)||!keys.has(c.requiresKeyword)||!Array.isArray(c.greeting)||!Array.isArray(c.fallback))throw Error('Invalid Dead Men contact');
  numbers.add(c.number);
 }
 for(const t of data.topics){
  if(typeof t.id!=='string'||ids.has(t.id)||!numbers.has(t.number)||!Array.isArray(t.terms)||!t.terms.length||t.terms.length>2||new Set(t.terms).size!==t.terms.length||!t.terms.every(k=>keys.has(k)))throw Error(`Invalid topic ${t.id}`);
  if(t.effect&&!EFFECTS[t.effect])throw Error(`Invalid effect ${t.id}`);
  if(!Array.isArray(t.lines)||!t.lines.length||t.lines.some(l=>typeof l.speaker!=='string'||typeof l.text!=='string'))throw Error(`Invalid lines ${t.id}`);
  for(const flag of [...(t.requires?.all||[]),...(t.requires?.none||[])])if(!flags.has(flag))throw Error(`Unknown gate ${flag}`);
  ids.add(t.id);
 }
 return data;
}
export function installDeadMenTopicPhone(phone){
 if(phone[INSTALLED])return;phone[INSTALLED]=true;
 const inv=phone.investigation;if(!inv)throw Error('[Dead Men topics] PhoneInvestigation required');
 let data=null,loading=null,controller=null;
 const definition=()=>inv.searchData?.cases?.find(c=>c.id===CASE);
 const ours=()=>inv.active?.caseId===CASE;
 const contact=number=>data?.contacts.find(c=>c.number===number);
 function decorate(lines){return lines.map(line=>({...line,fragments:fragmentDeadMenText(line.text,definition().keywords)}));}
 async function load(){
  if(data)return data;if(loading)return loading;
  controller=new AbortController();
  loading=(async()=>{
   await inv.load();if(!definition())throw Error('Dead Men search case is missing. Run build-web.mjs.');
   const response=await fetch(URL,{signal:controller.signal});if(!response.ok)throw Error(`HTTP ${response.status}`);
   data=validateDeadMenTopics(await response.json(),definition());return data;
  })().finally(()=>{loading=null;});return loading;
 }
 function currentTopics(number){
  return data.topics.filter(t=>t.number===number&&topicAllowed(t));
 }
 function prepare(c){
  const topics=currentTopics(c.number),signatures=new Set();
  for(const topic of topics){const key=sig(topic.terms);if(signatures.has(key))throw Error(`Ambiguous available topic: ${key}`);signatures.add(key);}
  return {...c,caseId:CASE,choicePrompt:'Choose a topic from your named clouds.',
   greeting:decorate(c.greeting),fallback:decorate(c.fallback),
   topics:topics.map(t=>({id:t.id,terms:t.terms,group:t.group,effect:t.effect,requiresFlags:[],grantFlags:[],grantKeywords:[],lines:decorate(t.lines)}))};
 }
 const start=phone.startCall.bind(phone);
 phone.startCall=()=>{
  if(!['619','620','621'].includes(phone.number)||!active())return start();
  if(!isDeadMenWebContactVisible({number:phone.number})){phone.finishCall('The number cannot be connected.');return;}
  const number=phone.number;inv.resetCall();phone.cancelActivity();
  const token=phone.run;phone.state='ringing';phone.status='Connecting...';phone.render();
  void load().then(()=>{
   if(phone.destroyed||!phone.isOpen||phone.run!==token||phone.number!==number||phone.state!=='ringing')return;
   if(!active()||!isDeadMenWebContactVisible({number})){phone.finishCall('The call is no longer available.');return;}
   phone.status='Ringing...';phone.startRing();phone.render();
   phone.later(3000,()=>{
    if(!active()||!isDeadMenWebContactVisible({number})||phone.number!==number||phone.state!=='ringing')return;
    phone.connect(contact(number));
   });
  }).catch(error=>{
   if(!phone.destroyed&&phone.isOpen&&phone.run===token){console.error('[Dead Men topics]',error);phone.finishCall('The conversation could not be loaded. Hang up and try again.');}
  });
 };
 const connect=phone.connect.bind(phone);
 phone.connect=c=>{
  if(!contact(c?.number)||!active())return connect(c);
  if(!isDeadMenWebContactVisible(c)){phone.finishCall('The number cannot be connected.');return;}
  inv.resetCall();inv.active=prepare(contact(c.number));inv.selected=[];inv.notePage=0;inv.pending=null;
  phone.contactName=c.name;inv.play(inv.active.greeting,'greeting');
 };
 const ask=inv.ask.bind(inv);
 inv.ask=()=>{
  if(!ours())return ask();
  if(!active()||!isDeadMenWebContactVisible(inv.active))return false;
  inv.active=prepare(contact(inv.active.number));return ask();
 };
 const next=phone.nextLine.bind(phone);
 phone.nextLine=()=>{
  let completed=null,lines=null;
  if(ours()&&inv.phase==='response'&&inv.pending&&phone.state==='connected'&&!phone.directoryOpen&&!phone.typingItem&&phone.lineIndex>=phone.lines.length-1){
   completed=data.topics.find(t=>t.id===inv.pending.id&&t.number===inv.active.number);
   if(completed)lines=clone(phone.lines);
  }
  const result=next();
  if(completed&&inv.phase==='choose'&&isDeadMenWebContactVisible(inv.active)&&finishDeadMenTopic(completed,lines)){
   inv.active=prepare(contact(inv.active.number));phone.render();
  }
  return result;
 };
 const destroy=inv.destroy.bind(inv);inv.destroy=()=>{controller?.abort();data=null;destroy();};
}

// DM_PLAYER_CLOUD_METADATA_V1
