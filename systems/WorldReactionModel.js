import {
  agencyOperationCandidates,isAgencyOperation,agencyOperationOfficeText,
  agencyOperationArticle,unsupersededWorldEvents
} from './AgencyOperationReactions.js';

const KEY='worldReactionsV1';
const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const clone=value=>JSON.parse(JSON.stringify(value));
const readable=(value,fallback)=>typeof value==='string'&&value.trim()&&!/[_/\\]|\.(?:webp|png|json)$/i.test(value)?value.trim():fallback;
export function readWorldReactions(state){
  const saved=state[KEY];
  if(saved==null)return{version:1,events:[],officeSeen:[]};
  if(saved.version!==1||!Array.isArray(saved.events)||!Array.isArray(saved.officeSeen))throw new Error('[WorldReactions] Unsupported or damaged history; it was not overwritten.');
  return saved;
}
function campaignEvents(state){return readWorldReactions(state).events.filter(event=>same(event.campaignId,state._createdAt));}
function newest(events){return [...events].reverse().sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0))[0]||null;}
function addEvent(state,event){
  const history=readWorldReactions(state);
  if(history.events.some(item=>item.id===event.id))return null;
  state[KEY]={...history,events:[...history.events,event]};return clone(event);
}
export function captureAgencyOutcome(state,now=Date.now()){
  if(state._createdAt==null||state.currentCaseId==null)return null;
  const court=state.courtState;
  const currentCourt=Boolean(court&&same(court.caseId,state.currentCaseId)&&same(court.campaignId,state._createdAt));
  let outcome=null;
  if(currentCourt&&court.phase==='verdict'&&court.resultCommitted===true&&['convicted','released'].includes(court.verdict)){
    outcome=court.verdict==='convicted'?'agency_convicted':'agency_released';
  }else if(state.caseFailed===true&&state.isGameActive===false&&state.caseResolved!==true&&['time_expired','trail_cold'].includes(state.gameOverReason)){
    outcome='agency_time_expired';
  }
  if(!outcome)return null;
  const mission=state.currentMission||{},cityId=String(state.crimeCityId||mission.city||'');
  return addEvent(state,{
    id:JSON.stringify(['agency_terminal',String(state._createdAt),String(state.currentCaseId)]),
    campaignId:state._createdAt,caseId:state.currentCaseId,kind:outcome,system:'agency',visibility:'public',createdAt:now,
    day:Math.max(1,Math.floor(Number(state.currentDay||state.day)||1)),
    cityId,cityName:readable(mission.cityName,cityId?cityId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'the city'),
    artifact:readable(mission.artifactName,readable(mission.artifact,'the stolen artefact')),
    defendantName:currentCourt?readable(court.facts?.defendantName,'the defendant'):null,
    reason:outcome==='agency_time_expired'?state.gameOverReason:null
  });
}
function piFinale(state,quest){
  if(quest.id==='pi_stolen_alibi'){
    const settlement=state.piBorrowedAlibiFinale?.settlement;
    if(settlement&&settlement.phase!=='completed')return null;
    return{endingId:settlement?.endingId??quest.resolution?.endingId??null,settlementId:settlement?.id??quest.resolution?.settlementId??null};
  }
  if(quest.id==='pi_two_glasses'){
    const resolution=state.reedResolution;
    if(resolution&&resolution.phase!=='completed')return null;
    return{endingId:resolution?.endingId??quest.resolution?.endingId??null,settlementId:resolution?.settlementId??quest.resolution?.settlementId??null};
  }
  if(quest.resolution?.phase&&quest.resolution.phase!=='completed')return null;
  return{endingId:quest.resolution?.endingId??null,settlementId:quest.resolution?.settlementId??null};
}
export function capturePIOutcomes(state,now=Date.now()){
  if(state._createdAt==null)return[];
  const raw=state.piQuests?.quests;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return[];
  const quests=Object.entries(raw).map(([id,quest])=>({id,...quest}))
    .filter(quest=>quest&&quest.status==='completed'&&typeof quest.id==='string'&&quest.id)
    .sort((a,b)=>(Date.parse(a.completedAt)||0)-(Date.parse(b.completedAt)||0));
  const added=[];
  for(const quest of quests){
    const finale=piFinale(state,quest);if(!finale)continue;
    const timestamp=Date.parse(quest.completedAt);
    const event=addEvent(state,{
      id:JSON.stringify(['pi_terminal',String(state._createdAt),quest.id]),
      campaignId:state._createdAt,caseId:quest.id,kind:'pi_case_completed',system:'pi',visibility:'private',
      createdAt:Number.isFinite(timestamp)?timestamp:now,caseTitle:readable(quest.title,'Private enquiry'),
      endingId:finale.endingId,settlementId:finale.settlementId,completedAt:typeof quest.completedAt==='string'?quest.completedAt:null
    });
    if(event)added.push(event);
  }
  return added;
}
export function captureAgencyOperations(state,now=Date.now(),context={}){
  return agencyOperationCandidates(state,now,context).map(event=>addEvent(state,event)).filter(Boolean);
}
export function captureWorldOutcomes(state,now=Date.now(),context={}){
  const events=captureAgencyOperations(state,now,context);
  const agency=captureAgencyOutcome(state,now);if(agency)events.push(agency);
  events.push(...capturePIOutcomes(state,now));return events;
}
export function latestWorldNewspaperEvent(state,cityId){
  const city=norm(cityId);
  return newest(unsupersededWorldEvents(campaignEvents(state)).filter(event=>event.visibility==='public'&&
    (city==='hq'||(city&&city===norm(event.cityId)))));
}
export function latestOfficeReaction(state,system='agency'){
  return newest(unsupersededWorldEvents(campaignEvents(state)).filter(event=>event.system===system));
}
export function officeReactionSeen(state,eventId){return readWorldReactions(state).officeSeen.includes(eventId);}
export function markOfficeReactionSeen(state,eventId){
  const history=readWorldReactions(state);
  if(!history.events.some(event=>event.id===eventId)||history.officeSeen.includes(eventId))return false;
  state[KEY]={...history,officeSeen:[...history.officeSeen,eventId]};return true;
}
export function piOutcomeText(event){
  if(event.caseId==='pi_stolen_alibi'){
    if(event.endingId==='discreet')return 'The findings were reported. Irrelevant personal details were left out of the client copy. The factual referral remains on file; it is not a finding of guilt.';
    if(event.endingId==='full')return 'The findings and the personal explanations were included in the client report. The factual referral remains on file; no arrest or conviction is implied.';
    if(event.endingId==='silence')return 'You accepted the club’s silence offer and sent an inconclusive report. The enquiry is closed, but its findings were withheld.';
  }
  if(event.caseId==='pi_two_glasses'){
    if(event.endingId==='truth')return 'The findings were included in your report to the client.';
    if(event.endingId==='withhold')return 'You chose to withhold findings from your report to the client. The case is closed; that does not turn the incomplete report into a full account.';
  }
  return 'The case has been marked completed. Its detailed outcome remains in the original case record.';
}
export function worldOfficeText(event){
  if(event.system==='pi')return 'PRIVATE OFFICE RECORD\n'+event.caseTitle+'\n'+piOutcomeText(event);
  if(isAgencyOperation(event))return agencyOperationOfficeText(event);
  const ref=`Case ${event.caseId} — ${event.cityName}`;
  if(event.kind==='agency_convicted')return `OFFICE BULLETIN\n${ref}\nThe court returned a conviction. Good work. The paperwork would also like some attention.`;
  if(event.kind==='agency_released')return `OFFICE BULLETIN\n${ref}\nThe defendant was released. File the court outcome accurately. Confidence is not a substitute for an established case.`;
  return `OFFICE BULLETIN\n${ref}\nThe investigation ran out of time. Record the unfinished leads before writing the explanation.`;
}
export function worldPIRecordMessages(state){
  return campaignEvents(state).filter(event=>event.system==='pi')
    .sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0)).map(event=>({
      id:`world_pi_record:${event.id}`,from:'My Office — Case Records',subject:`Case record: ${event.caseTitle}`,
      date:event.completedAt||'Case closed',threadId:`world_pi:${event.caseId}`,worldEventId:event.id,
      body:'PRIVATE OFFICE RECORD — NOT SENT TO THIRD PARTIES\n\n'+event.caseTitle+'\n\n'+piOutcomeText(event)+
        '\n\nThis is a filing notice generated by your office computer, not a new reply from the client. No report or confidential finding has been released to the press.\n\nThe file is closed. The filing cabinet remains open to suggestions.'
    }));
}
export function worldNewspaperArticle(event){
  if(event.visibility!=='public')throw new Error('[WorldReactions] A private outcome cannot be published automatically.');
  if(isAgencyOperation(event))return agencyOperationArticle(event);
  const ref=`The ${event.artifact} case in ${event.cityName}`;
  let headline,lead,body;
  if(event.kind==='agency_convicted'){
    headline='Court Returns Conviction in Artefact Case';lead=`${ref} has reached a guilty verdict.`;
    body=`The court has convicted ${event.defendantName}. The verdict follows the Mark Agency investigation into ${event.artifact} in ${event.cityName}. The agency's administration can now move the file from “pending” to another equally substantial folder.`;
  }else if(event.kind==='agency_released'){
    headline='Defendant Released After Artefact Hearing';lead=`${ref} ended in the defendant's release.`;
    body=`The court released ${event.defendantName} after the prosecution did not establish its case. The decision is not a conviction, and an earlier arrest must not be reported as one. Mark Agency has another outcome to document. Its filing cabinets have offered no public comment.`;
  }else{
    headline='Artefact Inquiry Ends Without a Resolution';lead=`${ref} remains unresolved.`;
    body=`The Mark Agency inquiry into ${event.artifact} in ${event.cityName} has ended without a confirmed resolution. No conviction is reported. The public is asked not to confuse an unfinished investigation with the artefact having returned itself.`;
  }
  return{id:`world:${event.id}`,slotId:'lead',headline,lead,body,worldEventId:event.id,worldCaseId:event.caseId,worldOutcome:event.kind};
}
