import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
import {agencyOperationCandidates,isAgencyOperation,agencyOperationOfficeText,agencyOperationArticle,unsupersededWorldEvents} from './AgencyOperationReactions.js';
import {POSTAL_WORLD_CASE_ID,postalWorldOutcome,postalWorldOutcomeText} from './PostalWorldOutcome.js';
import {DEAD_WORLD_CASES,deadCasesWorldOutcomes,deadCaseWorldText} from './DeadCasesWorldOutcomes.js';

const KEY='worldReactionsV1';
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clone=v=>JSON.parse(JSON.stringify(v));
const readable=(v,f)=>typeof v==='string'&&v.trim()&&!/[_/\\]|\.(?:webp|png|json)$/i.test(v)?v.trim():f;
export function readWorldReactions(state){
 const s=state[KEY];if(s==null)return{version:1,events:[],officeSeen:[]};
 if(s.version!==1||!Array.isArray(s.events)||!Array.isArray(s.officeSeen))throw new Error('[WorldReactions] Unsupported or damaged history; it was not overwritten.');
 return s;
}
function campaignEvents(state){return readWorldReactions(state).events.filter(e=>same(e.campaignId,state._createdAt));}
function newest(events){return [...events].reverse().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0))[0]||null;}
function addEvent(state,event){
 const h=readWorldReactions(state);if(h.events.some(e=>e.id===event.id))return null;
 state[KEY]={...h,events:[...h.events,event]};return clone(event);
}
export function captureAgencyOutcome(state,now=Date.now()){
 if(state._createdAt==null||state.currentCaseId==null)return null;
 const c=state.courtState,current=Boolean(c&&same(c.caseId,state.currentCaseId)&&same(c.campaignId,state._createdAt));
 let kind=null;
 if(current&&c.phase==='verdict'&&c.resultCommitted===true&&['convicted','released'].includes(c.verdict))kind=c.verdict==='convicted'?'agency_convicted':'agency_released';
 else if(state.caseFailed===true&&state.isGameActive===false&&state.caseResolved!==true&&['time_expired','trail_cold'].includes(state.gameOverReason))kind='agency_time_expired';
 if(!kind)return null;
 const m=state.currentMission||{},cityId=String(state.crimeCityId||m.city||'');
 return addEvent(state,{
  id:JSON.stringify(['agency_terminal',String(state._createdAt),String(state.currentCaseId)]),campaignId:state._createdAt,caseId:state.currentCaseId,
  kind,system:'agency',visibility:'public',createdAt:now,day:Math.max(1,Math.floor(Number(state.currentDay||state.day)||1)),
  cityId,cityName:readable(m.cityName,cityId?cityId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):__dialogueText("systems/WorldReactionModel.js", "t_0f53fb3533eb343bc155")),
  artifact:readable(m.artifactName,readable(m.artifact,__dialogueText("systems/WorldReactionModel.js", "t_46e1fbb41251b46bbc75"))),
  defendantName:current?readable(c.facts?.defendantName,__dialogueText("systems/WorldReactionModel.js", "t_ace1b3f02570ef175ca3")):null,
  reason:kind==='agency_time_expired'?state.gameOverReason:null
 });
}
function piFinale(state,q){
 if(q.id==='pi_stolen_alibi'){
  const s=state.piBorrowedAlibiFinale?.settlement;if(s&&s.phase!=='completed')return null;
  return{endingId:s?.endingId??q.resolution?.endingId??null,settlementId:s?.id??q.resolution?.settlementId??null};
 }
 if(q.id==='pi_two_glasses'){
  const s=state.reedResolution;if(s&&s.phase!=='completed')return null;
  return{endingId:s?.endingId??q.resolution?.endingId??null,settlementId:s?.settlementId??q.resolution?.settlementId??null};
 }
 if(q.resolution?.phase&&q.resolution.phase!=='completed')return null;
 return{endingId:q.resolution?.endingId??null,settlementId:q.resolution?.settlementId??null};
}
export function capturePIOutcomes(state,now=Date.now()){
 if(state._createdAt==null)return[];
 const added=[];
 const special=[postalWorldOutcome(state,now),...deadCasesWorldOutcomes(state,now)].filter(Boolean);
 for(const candidate of special){const event=addEvent(state,candidate);if(event)added.push(event);}
 const raw=state.piQuests?.quests;if(!raw||typeof raw!=='object'||Array.isArray(raw))return added;
 const quests=Object.entries(raw).map(([id,q])=>({id,...q})).filter(q=>q&&q.status==='completed'&&typeof q.id==='string'&&q.id&&q.id!==POSTAL_WORLD_CASE_ID&&!DEAD_WORLD_CASES.has(q.id))
  .sort((a,b)=>(Date.parse(a.completedAt)||0)-(Date.parse(b.completedAt)||0));
 for(const q of quests){
  const f=piFinale(state,q);if(!f)continue;const at=Date.parse(q.completedAt);
  const event=addEvent(state,{
   id:JSON.stringify(['pi_terminal',String(state._createdAt),q.id]),campaignId:state._createdAt,caseId:q.id,
   kind:'pi_case_completed',system:'pi',visibility:'private',createdAt:Number.isFinite(at)?at:now,
   caseTitle:readable(q.title,__dialogueText("systems/WorldReactionModel.js", "t_2feb023d03bc0c04bb80")),endingId:f.endingId,settlementId:f.settlementId,
   completedAt:typeof q.completedAt==='string'?q.completedAt:null
  });if(event)added.push(event);
 }
 return added;
}
export function captureAgencyOperations(state,now=Date.now(),context={}){return agencyOperationCandidates(state,now,context).map(e=>addEvent(state,e)).filter(Boolean);}
export function captureWorldOutcomes(state,now=Date.now(),context={}){
 const events=captureAgencyOperations(state,now,context),agency=captureAgencyOutcome(state,now);
 if(agency)events.push(agency);events.push(...capturePIOutcomes(state,now));return events;
}
export function latestWorldNewspaperEvent(state,cityId){
 const city=norm(cityId);
 return newest(unsupersededWorldEvents(campaignEvents(state)).filter(e=>e.visibility==='public'&&(city==='hq'||(city&&city===norm(e.cityId)))));
}
export function latestOfficeReaction(state,system='agency'){return newest(unsupersededWorldEvents(campaignEvents(state)).filter(e=>e.system===system));}
export function officeReactionSeen(state,id){return readWorldReactions(state).officeSeen.includes(id);}
export function markOfficeReactionSeen(state,id){
 const h=readWorldReactions(state);if(!h.events.some(e=>e.id===id)||h.officeSeen.includes(id))return false;
 state[KEY]={...h,officeSeen:[...h.officeSeen,id]};return true;
}
export function piOutcomeText(e){
 if(e.caseId===POSTAL_WORLD_CASE_ID)return postalWorldOutcomeText(e);
 if(DEAD_WORLD_CASES.has(e.caseId))return deadCaseWorldText(e);
 if(e.caseId==='pi_stolen_alibi'){
  if(e.endingId==='discreet')return __dialogueText("systems/WorldReactionModel.js", "t_1f7d3aea4e4ff503fd60");
  if(e.endingId==='full')return __dialogueText("systems/WorldReactionModel.js", "t_3fac32e9eefdae8219e2");
  if(e.endingId==='silence')return __dialogueText("systems/WorldReactionModel.js", "t_26c188daee92f0404cfa");
 }
 if(e.caseId==='pi_two_glasses'){
  if(e.endingId==='truth')return __dialogueText("systems/WorldReactionModel.js", "t_4047cb541d9d1b7a5f2b");
  if(e.endingId==='withhold')return __dialogueText("systems/WorldReactionModel.js", "t_bc077c87b71cc34fd042");
 }
 return __dialogueText("systems/WorldReactionModel.js", "t_ad9519c7a8e18f3b60f9");
}
export function worldOfficeText(e){
 if(e.system==='pi')return __dialogueText("systems/WorldReactionModel.js", "t_bbdef53def0517afd065")+e.caseTitle+'\n'+piOutcomeText(e);
 if(isAgencyOperation(e))return agencyOperationOfficeText(e);
 const ref=`${__dialogueText("systems/WorldReactionModel.js", "t_f6557a811387ac3aa63a")}${e.caseId}${__dialogueText("systems/WorldReactionModel.js", "t_3b2e8119b6fcc97df985")}${e.cityName}`;
 if(e.kind==='agency_convicted')return `${__dialogueText("systems/WorldReactionModel.js", "t_099548d60d5623e7610c")}${ref}${__dialogueText("systems/WorldReactionModel.js", "t_02fe4737359d1944968b")}`;
 if(e.kind==='agency_released')return `${__dialogueText("systems/WorldReactionModel.js", "t_099548d60d5623e7610c")}${ref}${__dialogueText("systems/WorldReactionModel.js", "t_006268015936dafac3ed")}`;
 return `${__dialogueText("systems/WorldReactionModel.js", "t_099548d60d5623e7610c")}${ref}${__dialogueText("systems/WorldReactionModel.js", "t_7642cbc6f4210050856e")}`;
}
export function worldPIRecordMessages(state){
 return campaignEvents(state).filter(e=>e.system==='pi').sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).map(e=>({
  id:`world_pi_record:${e.id}`,from:__dialogueText("systems/WorldReactionModel.js", "t_9a84da3780bbbfc73940"),subject:`${__dialogueText("systems/WorldReactionModel.js", "t_2797da3a0ebd0f225593")}${e.caseTitle}`,
  date:e.completedAt||__dialogueText("systems/WorldReactionModel.js", "t_aa56ad4b2d1623d94be8"),threadId:`world_pi:${e.caseId}`,worldEventId:e.id,
  body:__dialogueText("systems/WorldReactionModel.js", "t_8f49dc17ec40a1672915")+e.caseTitle+__dialogueText("systems/WorldReactionModel.js", "t_75a11da44c802486bc6f")+piOutcomeText(e)+
   __dialogueText("systems/WorldReactionModel.js", "t_9a72ab3f085e9d5681ad")
 }));
}
export function worldNewspaperArticle(e){
 if(e.visibility!=='public')throw new Error('[WorldReactions] A private outcome cannot be published automatically.');
 if(isAgencyOperation(e))return agencyOperationArticle(e);
 const ref=`${__dialogueText("systems/WorldReactionModel.js", "t_103c5169871d49be7a2e")}${e.artifact}${__dialogueText("systems/WorldReactionModel.js", "t_f42b9f039db44f945dae")}${e.cityName}`;let headline,lead,body;
 if(e.kind==='agency_convicted'){
  headline=__dialogueText("systems/WorldReactionModel.js", "t_14b9f721a60ddc5549bb");lead=`${ref}${__dialogueText("systems/WorldReactionModel.js", "t_38ba48a9a1a99e5f0796")}`;
  body=`${__dialogueText("systems/WorldReactionModel.js", "t_dd4a4c55d10e6689096f")}${e.defendantName}${__dialogueText("systems/WorldReactionModel.js", "t_510a580c0560a6aaaf1a")}${e.artifact}${__dialogueText("systems/WorldReactionModel.js", "t_2eb9d0d30d4ceaac52e6")}${e.cityName}${__dialogueText("systems/WorldReactionModel.js", "t_b7c8d1c84eba163691f3")}`;
 }else if(e.kind==='agency_released'){
  headline=__dialogueText("systems/WorldReactionModel.js", "t_a86c0bbcde3e8241395f");lead=`${ref}${__dialogueText("systems/WorldReactionModel.js", "t_1aadd4e2d420cc310c83")}`;
  body=`${__dialogueText("systems/WorldReactionModel.js", "t_c9a8ec0b420ea5674359")}${e.defendantName}${__dialogueText("systems/WorldReactionModel.js", "t_43e8ba01fc8add8094f5")}`;
 }else{
  headline=__dialogueText("systems/WorldReactionModel.js", "t_608df34c0b76c7f0e450");lead=`${ref}${__dialogueText("systems/WorldReactionModel.js", "t_3a2bb74b72a3eedeb8a8")}`;
  body=`${__dialogueText("systems/WorldReactionModel.js", "t_3b163d1f9ecd37f53ac0")}${e.artifact}${__dialogueText("systems/WorldReactionModel.js", "t_2eb9d0d30d4ceaac52e6")}${e.cityName}${__dialogueText("systems/WorldReactionModel.js", "t_dd067cc948273caa09c3")}`;
 }
 return{id:`world:${e.id}`,slotId:'lead',headline,lead,body,worldEventId:e.id,worldCaseId:e.caseId,worldOutcome:e.kind};
}
