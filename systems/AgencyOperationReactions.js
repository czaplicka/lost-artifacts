import { dialogueText as __dialogueText } from "../dialogues/DialogueText.js";
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
    cityId,cityName:readable(mission.cityName,cityId?cityId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):__dialogueText("systems/AgencyOperationReactions.js", "t_0f53fb3533eb343bc155")),
    artifact:readable(mission.artifactName,readable(mission.artifact,__dialogueText("systems/AgencyOperationReactions.js", "t_46e1fbb41251b46bbc75"))),
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
    events.push(candidate(state,'agency_empty_apartment',visit.suspectId,now,__dialogueText("systems/AgencyOperationReactions.js", "t_fd4a95bc5f21002aa922"),{
      visitCaseKey:visit.caseKey
    }));
  }
  const gameOver=context.gameOver;
  if(gameOver?.active===true&&gameOver.reasonCode==='failed_alibi_arrest'&&
    same(gameOver.caseId,state.currentCaseId)&&state.caseFailed===true&&state.isGameActive===false&&state.caseResolved!==true){
    events.push(candidate(state,'agency_wrong_arrest_attempt',null,now,__dialogueText("systems/AgencyOperationReactions.js", "t_03a89f21d86f8d3edba3")));
  }
  return events;
}
export function agencyOperationOfficeText(event){
  const ref=`${__dialogueText("systems/AgencyOperationReactions.js", "t_f6557a811387ac3aa63a")}${event.caseId}${__dialogueText("systems/AgencyOperationReactions.js", "t_3b2e8119b6fcc97df985")}${event.cityName}`;
  const lines={
    agency_suspect_arrested:__dialogueText("systems/AgencyOperationReactions.js", "t_e9e9b4d0238a308c6205"),
    agency_pursuit_escape:__dialogueText("systems/AgencyOperationReactions.js", "t_4d7617cd0bf5a607509b"),
    agency_arrest_missing_warrant:__dialogueText("systems/AgencyOperationReactions.js", "t_17888ff0d5d5778a71f7"),
    agency_arrest_warrant_mismatch:__dialogueText("systems/AgencyOperationReactions.js", "t_7b180fc26d5920ab9657"),
    agency_empty_apartment:__dialogueText("systems/AgencyOperationReactions.js", "t_da4b832ce9e01d557d42"),
    agency_wrong_arrest_attempt:__dialogueText("systems/AgencyOperationReactions.js", "t_8b9f06c826d056ea893d")
  };
  return `${__dialogueText("systems/AgencyOperationReactions.js", "t_099548d60d5623e7610c")}${ref}${__dialogueText("systems/AgencyOperationReactions.js", "t_01ba4719c80b6fe911b0")}${lines[event.kind]||__dialogueText("systems/AgencyOperationReactions.js", "t_4d242e53d23a50d60720")}`;
}
export function agencyOperationArticle(event){
  if(!PUBLIC_KINDS.has(event.kind)||event.visibility!=='public'){
    throw new Error('[WorldReactions] Internal operational information cannot be published automatically.');
  }
  const arrested=event.kind==='agency_suspect_arrested';
  return{
    id:`world:${event.id}`,slotId:'lead',worldEventId:event.id,worldCaseId:event.caseId,worldOutcome:event.kind,
    headline:arrested?__dialogueText("systems/AgencyOperationReactions.js", "t_f8621319ed3b18770405"):__dialogueText("systems/AgencyOperationReactions.js", "t_562793a3cacfb747964e"),
    lead:arrested?`${__dialogueText("systems/AgencyOperationReactions.js", "t_84b9288d1a97e7d0673a")}${event.artifact}${__dialogueText("systems/AgencyOperationReactions.js", "t_f42b9f039db44f945dae")}${event.cityName}${__dialogueText("systems/AgencyOperationReactions.js", "t_cdb4ee2aea69cc6a8333")}`:
      `${__dialogueText("systems/AgencyOperationReactions.js", "t_dc68413caae8127206ff")}${event.artifact}${__dialogueText("systems/AgencyOperationReactions.js", "t_b08d1f9a80ad2bb60914")}`,
    body:arrested?
      `${__dialogueText("systems/AgencyOperationReactions.js", "t_368cd15c1116e4fd646d")}${event.artifact}${__dialogueText("systems/AgencyOperationReactions.js", "t_2eb9d0d30d4ceaac52e6")}${event.cityName}${__dialogueText("systems/AgencyOperationReactions.js", "t_59c9ae91b4c4634b6bd0")}`:
      `${__dialogueText("systems/AgencyOperationReactions.js", "t_3950f815b8a1caac4a33")}${event.artifact}${__dialogueText("systems/AgencyOperationReactions.js", "t_e469437498ebc7d4847f")}${event.cityName}${__dialogueText("systems/AgencyOperationReactions.js", "t_15833518be74959ba7d4")}`
  };
}
