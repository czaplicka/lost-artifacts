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
  cityId,cityName:readable(m.cityName,cityId?cityId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'the city'),
  artifact:readable(m.artifactName,readable(m.artifact,'the stolen artefact')),
  defendantName:current?readable(c.facts?.defendantName,'the defendant'):null,
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
   caseTitle:readable(q.title,'Private enquiry'),endingId:f.endingId,settlementId:f.settlementId,
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
  if(e.endingId==='discreet')return 'The findings were reported. Irrelevant personal details were left out of the client copy. The factual referral remains on file; it is not a finding of guilt.';
  if(e.endingId==='full')return 'The findings and the personal explanations were included in the client report. The factual referral remains on file; no arrest or conviction is implied.';
  if(e.endingId==='silence')return 'You accepted the club’s silence offer and sent an inconclusive report. The enquiry is closed, but its findings were withheld.';
 }
 if(e.caseId==='pi_two_glasses'){
  if(e.endingId==='truth')return 'The findings were included in your report to the client.';
  if(e.endingId==='withhold')return 'You chose to withhold findings from your report to the client. The case is closed; that does not turn the incomplete report into a full account.';
 }
 return 'The case has been marked completed. Its detailed outcome remains in the original case record.';
}
export function worldOfficeText(e){
 if(e.system==='pi')return 'PRIVATE OFFICE RECORD\n'+e.caseTitle+'\n'+piOutcomeText(e);
 if(isAgencyOperation(e))return agencyOperationOfficeText(e);
 const ref=`Case ${e.caseId} — ${e.cityName}`;
 if(e.kind==='agency_convicted')return `OFFICE BULLETIN\n${ref}\nThe court returned a conviction. Good work. The paperwork would also like some attention.`;
 if(e.kind==='agency_released')return `OFFICE BULLETIN\n${ref}\nThe defendant was released. File the court outcome accurately. Confidence is not a substitute for an established case.`;
 return `OFFICE BULLETIN\n${ref}\nThe investigation ran out of time. Record the unfinished leads before writing the explanation.`;
}
export function worldPIRecordMessages(state){
 return campaignEvents(state).filter(e=>e.system==='pi').sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).map(e=>({
  id:`world_pi_record:${e.id}`,from:'My Office — Case Records',subject:`Case record: ${e.caseTitle}`,
  date:e.completedAt||'Case closed',threadId:`world_pi:${e.caseId}`,worldEventId:e.id,
  body:'PRIVATE OFFICE RECORD — NOT SENT TO THIRD PARTIES\n\n'+e.caseTitle+'\n\n'+piOutcomeText(e)+
   '\n\nThis is a filing notice generated by your office computer, not a new reply from the client. No report or confidential finding has been released to the press.\n\nThe file is closed. The filing cabinet remains open to suggestions.'
 }));
}
export function worldNewspaperArticle(e){
 if(e.visibility!=='public')throw new Error('[WorldReactions] A private outcome cannot be published automatically.');
 if(isAgencyOperation(e))return agencyOperationArticle(e);
 const ref=`The ${e.artifact} case in ${e.cityName}`;let headline,lead,body;
 if(e.kind==='agency_convicted'){
  headline='Court Returns Conviction in Artefact Case';lead=`${ref} has reached a guilty verdict.`;
  body=`The court has convicted ${e.defendantName}. The verdict follows the Mark Agency investigation into ${e.artifact} in ${e.cityName}. The agency's administration can now move the file from “pending” to another equally substantial folder.`;
 }else if(e.kind==='agency_released'){
  headline='Defendant Released After Artefact Hearing';lead=`${ref} ended in the defendant's release.`;
  body=`The court released ${e.defendantName} after the prosecution did not establish its case. The decision is not a conviction, and an earlier arrest must not be reported as one. Mark Agency has another outcome to document. Its filing cabinets have offered no public comment.`;
 }else{
  headline='Artefact Inquiry Ends Without a Resolution';lead=`${ref} remains unresolved.`;
  body=`The Mark Agency inquiry into ${e.artifact} in ${e.cityName} has ended without a confirmed resolution. No conviction is reported. The public is asked not to confuse an unfinished investigation with the artefact having returned itself.`;
 }
 return{id:`world:${e.id}`,slotId:'lead',headline,lead,body,worldEventId:e.id,worldCaseId:e.caseId,worldOutcome:e.kind};
}
