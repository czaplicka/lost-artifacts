import { validChase } from './chaseLogic.js';

const same=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
const FAILURE_KINDS={
  chase_escape:'agency_pursuit_escape',
  missing_warrant:'agency_arrest_missing_warrant',
  warrant_mismatch:'agency_arrest_warrant_mismatch'
};
const PUBLIC_KINDS=new Set(['agency_suspect_arrested','agency_pursuit_escape']);
const ALL_KINDS=new Set([...PUBLIC_KINDS,...Object.values(FAILURE_KINDS),
  'agency_empty_apartment','agency_wrong_arrest_attempt']);
const readable=(value,fallback)=>typeof value==='string'&&value.trim()&&!/[_/\\]|\.(?:webp|png|json)$/i.test(value)?value.trim():fallback;

function candidate(state,kind,subjectId,now,source,extra={}){
  const mission=state.currentMission||{};
  const cityId=String(state.crimeCityId||mission.city||'');
  return{
    id:JSON.stringify(['agency_operation',String(state._createdAt),String(state.currentCaseId),kind,subjectId??null,extra.visitCaseKey??null]),
    campaignId:state._createdAt,caseId:state.currentCaseId,kind,system:'agency',
    visibility:PUBLIC_KINDS.has(kind)?'public':'agency',createdAt:now,
    day:Math.max(1,Math.floor(Number(state.currentDay||state.day)||1)),
    cityId,cityName:readable(mission.cityName,cityId?cityId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'the city'),
    artifact:readable(mission.artifactName,readable(mission.artifact,'the stolen artefact')),
    subjectId:subjectId??null,source,...extra
  };
}
export function isAgencyOperation(event){return ALL_KINDS.has(event?.kind);}
export function isAgencyTerminal(event){
  return ['agency_convicted','agency_released','agency_time_expired'].includes(event?.kind);
}
export function unsupersededWorldEvents(events){
  const terminalCases=new Set(events.filter(isAgencyTerminal).map(event=>JSON.stringify([String(event.campaignId),String(event.caseId)])));
  return events.filter(event=>!isAgencyOperation(event)||!terminalCases.has(JSON.stringify([String(event.campaignId),String(event.caseId)])));
}

export function agencyOperationCandidates(state,now=Date.now(),context={}){
  if(state._createdAt==null||state.currentCaseId==null)return[];
  const events=[];
  const chase=state.chaseState;
  if(chase&&validChase(chase,state.currentCaseId,state._createdAt)){
    const code=FAILURE_KINDS[chase.failureCode]?chase.failureCode:chase.phase==='escaped'?'chase_escape':null;
    if(code&&state.caseFailed===true&&state.isGameActive===false&&state.caseResolved!==true){
      events.push(candidate(state,FAILURE_KINDS[code],chase.suspectId,now,'chaseState',{
        failureCode:code,sourceUpdatedAt:chase.updatedAt??null
      }));
    }else if(!code&&['review','settled'].includes(chase.phase)&&
      chase.arrestOutcome?.code==='arrested'&&chase.arrestOutcome?.arrested===true&&chase.distance===0){
      events.push(candidate(state,'agency_suspect_arrested',chase.suspectId,now,'chaseState',{
        sourceUpdatedAt:chase.updatedAt??null
      }));
    }
  }
  const apartment=context.apartment;
  const visit=apartment?.visit;
  if(state.isGameActive===true&&state.caseFailed!==true&&state.caseResolved!==true&&apartment?.active===true&&visit?.completed===true&&visit.outcome==='suspect_escaped'&&
    apartment.caseKey!=null&&same(visit.caseKey,apartment.caseKey)&&
    apartment.suspectId!=null&&same(visit.suspectId,apartment.suspectId)&&
    (!apartment.missionId||!state.currentMission?.id||same(apartment.missionId,state.currentMission.id))){
    events.push(candidate(state,'agency_empty_apartment',visit.suspectId,now,'apartmentProgress.arrestVisit',{
      visitCaseKey:visit.caseKey
    }));
  }
  const gameOver=context.gameOver;
  if(gameOver?.active===true&&gameOver.reasonCode==='failed_alibi_arrest'&&
    same(gameOver.caseId,state.currentCaseId)&&state.caseFailed===true&&state.isGameActive===false&&state.caseResolved!==true){
    events.push(candidate(state,'agency_wrong_arrest_attempt',null,now,'GameOverScene.reasonCode'));
  }
  return events;
}
export function agencyOperationOfficeText(event){
  const ref=`Case ${event.caseId} — ${event.cityName}`;
  const lines={
    agency_suspect_arrested:'A suspect is in custody. Prepare the evidence for court. The handcuffs do not count as a verdict.',
    agency_pursuit_escape:'The suspect escaped during the pursuit. Record where the operation failed. The footwear complaint can go in a separate report.',
    agency_arrest_missing_warrant:'The arrest could not proceed without a warrant. Reaching the suspect was not the missing part of the paperwork.',
    agency_arrest_warrant_mismatch:'The warrant named a different person. File the mismatch accurately; do not amend the name after the event.',
    agency_empty_apartment:'The team reached the address, but the suspect had already left. The investigation continues. Search the apartment for the next lead.',
    agency_wrong_arrest_attempt:'The team followed the wrong suspect lead. No suspect was detained in that operation. Record the mistaken assessment and the failed operation.'
  };
  return `OFFICE BULLETIN\n${ref}\n${lines[event.kind]||'The operation has been recorded.'}`;
}
export function agencyOperationArticle(event){
  if(!PUBLIC_KINDS.has(event.kind)||event.visibility!=='public'){
    throw new Error('[WorldReactions] Internal operational information cannot be published automatically.');
  }
  const arrested=event.kind==='agency_suspect_arrested';
  return{
    id:`world:${event.id}`,slotId:'lead',worldEventId:event.id,worldCaseId:event.caseId,worldOutcome:event.kind,
    headline:arrested?'Suspect Detained in Artefact Investigation':'Suspect Escapes During Pursuit',
    lead:arrested?`A suspect has been detained in the ${event.artifact} case in ${event.cityName}.`:
      `A pursuit in the ${event.artifact} investigation ended without a detention.`,
    body:arrested?
      `Mark Agency has detained a suspect in its investigation concerning ${event.artifact} in ${event.cityName}. The case has not yet resulted in a conviction. Allegations remain subject to the court process. The agency has been reminded that an arrest photograph is not a substitute for a judgment.`:
      `The suspect escaped during a pursuit connected with the ${event.artifact} investigation in ${event.cityName}. The operation did not produce a detention. No conviction is reported. The agency's running shoes were unavailable for interview.`
  };
}
